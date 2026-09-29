/**
 * Asistente IA del Visor — lógica de contexto territorial enriquecido
 *
 * Misma arquitectura que `js/utils/chatAssistant.js` del repositorio origen
 * (visor_woll_atacama):
 *
 *  1. Indexa todas las capas del visor (`getAllLayerConfigs`).
 *  2. Descarga los GeoJSON y calcula estadísticas ricas por capa
 *     (media, mediana, desviación estándar, distribuciones de valores).
 *  3. Detecta correlaciones entre capas y dimensiones.
 *  4. `sendMessage()` construye un system prompt con ese contexto y hace
 *     `POST /api/chat` (Vercel Function → Groq API).
 *
 * Adaptaciones respecto al origen:
 *  - La precarga corre EN SEGUNDO PLANO al cargar la página (no bloquea la
 *    UI ni espera a que el usuario abra el chat).
 *  - Solo se conservan las estadísticas en memoria; los GeoJSON crudos se
 *    descartan tras analizarse para no duplicar ~270 MB de datos.
 *  - La detección de dimensiones es genérica (todas las de `allTemasConfig`).
 *
 * @module utils/chatAssistant
 */

import allTemasConfig from "../config/allTemasConfig.js";
import { getLayerData } from "../store/appState.js";
import { fetchLayerData } from "./layerUtils.js";
import { getAllLayerConfigs } from "./metadataExtractor.js";
import { ConcurrentQueue } from "./concurrentQueue.js";
import { createContextLogger } from "./logger.js";

const log = createContextLogger("ChatIA");

/** Límite de caracteres del contexto enriquecido enviado al modelo */
const MAX_CONTEXT_CHARS = 20000;
/** Límite total del payload JSON enviado a /api/chat */
const MAX_PAYLOAD_BYTES = 4 * 1024 * 1024;
/** Número de GeoJSON en descarga/análisis simultáneos */
const PRELOAD_CONCURRENCY = 3;

/**
 * Palabras clave por dimensión para detectar consultas relacionales
 * ("¿cómo se relaciona el agua con la agricultura?").
 */
const DIMENSION_KEYWORDS = {
  agua: ["agua", "hidro", "hídric", "hidric", "rio", "río", "acuifero", "acuífero",
    "desalad", "embalse", "laguna", "glaciar", "humedal", "salar", "cuenc", "derechos de agua"],
  agricultura: ["agricul", "cultivo", "riego", "agro", "ganader", "frutic"],
  mineria: ["mineri", "mina", "litio", "mineral", "explotacion minera"],
  energia: ["energ", "solar", "eolic", "eléctric", "electric", "transmision", "subestacion", "fotovolt"],
  clima: ["clima", "temperatura", "precipitacion", "meteorolog", "sequia", "sequía"],
  riesgos: ["riesgo", "inundacion", "incendio", "desastre", "vulnerab"],
  suelo: ["suelo", "cobertura", "uso del suelo"],
  planificacion: ["planific", "ordenamiento", "territori", "catastro", "licencia", "amenaza"],
  otros: ["patrimonio", "poblacion", "social", "inversion", "infraestructura"],
};

// ── Estado del módulo ──────────────────────────────────────────

let layerConfigsCache = [];
let enrichedAnalytics = {};
let preloadPromise = null;
let preloadState = {
  status: "idle", // idle | running | done | error
  loaded: 0,
  total: 0,
  current: null,
};
const progressListeners = new Set();

// ── Estadísticas ───────────────────────────────────────────────

function calculateMedian(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function calculateStdDev(arr) {
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length;
  return Math.sqrt(variance);
}

/**
 * Extrae estadísticas ricas de una capa (numéricas y categóricas).
 *
 * @param {string} layerName - Nombre visible de la capa
 * @param {Object} geojsonData - GeoJSON completo
 * @param {Object} [config] - Configuración de la capa (dimension, type, ...)
 * @returns {Object|null} Estadísticas o null si la capa está vacía
 */
export function extractRichStatistics(layerName, geojsonData, config = {}) {
  if (!geojsonData?.features || geojsonData.features.length === 0) return null;

  const features = geojsonData.features;
  const propertyKeys = Object.keys(features[0].properties || {});

  const stats = {
    name: layerName,
    id: config.name || layerName,
    dimension: config.dimension || "otros",
    type: config.type || null,
    count: features.length,
    attributes: {},
    distributions: {},
  };

  propertyKeys.forEach((key) => {
    const values = features.map((f) => f.properties?.[key]).filter((v) => v != null && v !== "");
    if (values.length === 0) return;

    const firstValue = values[0];
    const isNumeric = typeof firstValue === "number" || !isNaN(parseFloat(firstValue));

    if (isNumeric) {
      const numValues = values.map((v) => parseFloat(v)).filter((v) => !isNaN(v));
      if (numValues.length > 0) {
        stats.attributes[key] = {
          type: "numeric",
          count: numValues.length,
          min: Math.min(...numValues),
          max: Math.max(...numValues),
          mean: numValues.reduce((a, b) => a + b, 0) / numValues.length,
          median: calculateMedian(numValues),
          stdDev: calculateStdDev(numValues),
        };
      }
    } else {
      const uniqueVals = [...new Set(values)];
      const frequency = {};
      values.forEach((v) => {
        frequency[v] = (frequency[v] || 0) + 1;
      });

      stats.attributes[key] = {
        type: "categorical",
        count: values.length,
        unique: uniqueVals.length,
        topValues: Object.entries(frequency)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([value, count]) => ({
            value,
            count,
            percentage: ((count / values.length) * 100).toFixed(1),
          })),
      };

      if (uniqueVals.length < 50) stats.distributions[key] = frequency;
    }
  });

  return stats;
}

// ── Correlaciones entre capas ──────────────────────────────────

function findCrossLayerCorrelations(layer1Name, layer2Name) {
  const stats1 = enrichedAnalytics[layer1Name];
  const stats2 = enrichedAnalytics[layer2Name];
  if (!stats1 || !stats2) return null;

  const correlations = { commonAttributes: [], potentialJoins: [] };
  const attrs1 = Object.keys(stats1.attributes);
  const attrs2 = Object.keys(stats2.attributes);

  attrs1.forEach((attr1) => {
    attrs2.forEach((attr2) => {
      const key1 = attr1.toLowerCase().replace(/[_\s]/g, "");
      const key2 = attr2.toLowerCase().replace(/[_\s]/g, "");
      if (key1 === key2 || key1.includes(key2) || key2.includes(key1)) {
        correlations.commonAttributes.push({
          layer1: layer1Name,
          attr1,
          layer2: layer2Name,
          attr2,
          type1: stats1.attributes[attr1].type,
          type2: stats2.attributes[attr2].type,
        });
      }
    });
  });

  const joinFields = ["id", "codigo", "cod", "nombre", "name", "comuna", "region"];
  attrs1.forEach((attr1) => {
    const norm1 = attr1.toLowerCase();
    if (!joinFields.some((jf) => norm1.includes(jf))) return;
    attrs2.forEach((attr2) => {
      const norm2 = attr2.toLowerCase();
      if (joinFields.some((jf) => norm2.includes(jf))) {
        correlations.potentialJoins.push({ layer1: layer1Name, field1: attr1, layer2: layer2Name, field2: attr2 });
      }
    });
  });

  return correlations;
}

function calculateNumericOverlap(info1, info2) {
  const min = Math.max(info1.min, info2.min);
  const max = Math.min(info1.max, info2.max);
  if (min >= max) return 0;

  const overlapRange = max - min;
  const totalRange = Math.max(info1.max, info2.max) - Math.min(info1.min, info2.min);
  return (overlapRange / totalRange) * 100;
}

/**
 * Genera insights cruzando las distribuciones y rangos de dos dimensiones.
 */
function generateInsights(layers1, layers2) {
  const insights = [];

  layers1.forEach((layer1Name) => {
    const stats1 = enrichedAnalytics[layer1Name];
    if (!stats1) return;

    layers2.forEach((layer2Name) => {
      const stats2 = enrichedAnalytics[layer2Name];
      if (!stats2) return;

      Object.entries(stats1.distributions || {}).forEach(([attr1, dist1]) => {
        Object.entries(stats2.distributions || {}).forEach(([attr2, dist2]) => {
          const commonKeys = Object.keys(dist1).filter((k) => dist2[k]);
          if (commonKeys.length > 0) {
            insights.push({
              type: "distribution_overlap",
              description: `${layer1Name} y ${layer2Name} comparten ${commonKeys.length} valores en los atributos "${attr1}" y "${attr2}"`,
            });
          }
        });
      });

      Object.entries(stats1.attributes).forEach(([attr1, info1]) => {
        if (info1.type !== "numeric") return;
        Object.entries(stats2.attributes).forEach(([attr2, info2]) => {
          if (info2.type !== "numeric") return;
          const overlap = calculateNumericOverlap(info1, info2);
          if (overlap > 50) {
            insights.push({
              type: "numeric_correlation",
              description: `Los atributos "${attr1}" (${layer1Name}) y "${attr2}" (${layer2Name}) tienen rangos similares (${overlap.toFixed(1)}% de solapamiento)`,
            });
          }
        });
      });
    });
  });

  return insights;
}

// ── Reportes en texto para el prompt ───────────────────────────

function generateLayerReport(layerName) {
  const stats = enrichedAnalytics[layerName];
  if (!stats) return `No hay información disponible para ${layerName}`;

  let report = `\n### 📊 ANÁLISIS DETALLADO: ${stats.name}\n\n`;
  report += `**Total de elementos:** ${stats.count}\n`;
  report += `**Geometría:** ${stats.type || "N/D"}  |  **Dimensión:** ${stats.dimension}\n\n`;
  report += `**Atributos analizados:**\n`;

  Object.entries(stats.attributes).forEach(([attr, info]) => {
    report += `\n**${attr}** (${info.type}):\n`;
    if (info.type === "numeric") {
      report += `  - Rango: ${info.min.toFixed(2)} - ${info.max.toFixed(2)}\n`;
      report += `  - Promedio: ${info.mean.toFixed(2)}\n`;
      report += `  - Mediana: ${info.median.toFixed(2)}\n`;
      report += `  - Desv. Estándar: ${info.stdDev.toFixed(2)}\n`;
    } else {
      report += `  - Valores únicos: ${info.unique}\n`;
      report += `  - Top valores:\n`;
      info.topValues.forEach((tv) => {
        report += `    • ${tv.value}: ${tv.count} (${tv.percentage}%)\n`;
      });
    }
  });

  return report;
}

function generateRelationshipReport(dim1, dim2, layers1, layers2) {
  let report = `\n### 🔗 ANÁLISIS DE RELACIÓN: ${dim1.toUpperCase()} ↔ ${dim2.toUpperCase()}\n\n`;
  report += `**Capas de ${dim1}:** ${layers1.slice(0, 12).join(", ")}\n`;
  report += `**Capas de ${dim2}:** ${layers2.slice(0, 12).join(", ")}\n\n`;

  // Comparación atributo a atributo
  layers1.forEach((layer1) => {
    layers2.forEach((layer2) => {
      const correlation = findCrossLayerCorrelations(layer1, layer2);
      if (!correlation) return;

      if (correlation.commonAttributes.length > 0) {
        report += `🔹 ${layer1} ↔ ${layer2}:\n`;
        correlation.commonAttributes.slice(0, 8).forEach((ca) => {
          report += `  • "${ca.attr1}" (${ca.type1}) relacionado con "${ca.attr2}" (${ca.type2})\n`;
        });
      }
      correlation.potentialJoins.slice(0, 4).forEach((join) => {
        report += `  • Posible join: ${join.layer1}.${join.field1} ↔ ${join.layer2}.${join.field2}\n`;
      });
    });
  });

  const insights = generateInsights(layers1, layers2);
  if (insights.length > 0) {
    report += `\n**Insights descubiertos:**\n`;
    insights.slice(0, 10).forEach((insight, idx) => {
      report += `${idx + 1}. ${insight.description}\n`;
    });
  }

  return report;
}

// ── Precarga en segundo plano ──────────────────────────────────

function emitProgress() {
  const snapshot = { ...preloadState };
  progressListeners.forEach((listener) => {
    try {
      listener(snapshot);
    } catch (err) {
      log.error("[ChatIA] Error en listener de progreso:", err);
    }
  });
}

/**
 * Estado actual de la precarga de contexto.
 * @returns {{status: string, loaded: number, total: number, current: string|null}}
 */
export function getChatPreloadState() {
  return { ...preloadState };
}

/**
 * Suscribe un callback al progreso de la precarga. Se invoca de inmediato
 * con el estado actual y luego en cada actualización.
 *
 * @param {Function} listener - Callback `({status, loaded, total, current}) => void`
 * @returns {Function} Función para cancelar la suscripción
 */
export function subscribeChatPreload(listener) {
  progressListeners.add(listener);
  try {
    listener({ ...preloadState });
  } catch (err) {
    log.error("[ChatIA] Error en listener de progreso:", err);
  }
  return () => progressListeners.delete(listener);
}

/**
 * Descarga y analiza todas las capas del visor en segundo plano.
 * Idempotente: llamadas repetidas devuelven la misma promesa.
 *
 * Se invoca automáticamente desde `app.js` al cargar la página, así el
 * usuario encuentra el contexto listo en cuanto abre el chat.
 *
 * @param {Object} [options]
 * @param {number} [options.delay] - Espera opcional antes de arrancar (ms)
 * @returns {Promise<Object>} Mapa de estadísticas por capa
 */
export function startChatPreload(options = {}) {
  if (preloadPromise) return preloadPromise;

  const delay = options.delay ?? 0;

  preloadPromise = new Promise((resolve) => {
    setTimeout(async () => {
      try {
        layerConfigsCache = getAllLayerConfigs(allTemasConfig);
        preloadState = { status: "running", loaded: 0, total: layerConfigsCache.length, current: null };
        emitProgress();
        log.debug(`[ChatIA] Precarga iniciada: ${layerConfigsCache.length} capas`);

        const queue = new ConcurrentQueue(PRELOAD_CONCURRENCY);

        await Promise.all(
          layerConfigsCache.map((config) =>
            queue.add(async () => {
              preloadState.current = config.nombrePersonalizado;
              emitProgress();

              try {
                // Si la capa ya está en memoria (visible en el mapa) se reutiliza
                const data = getLayerData(config.name) || (await fetchLayerData(config.name, { url: config.url }));

                if (data?.features?.length) {
                  const stats = extractRichStatistics(config.nombrePersonalizado, data, config);
                  if (stats) enrichedAnalytics[config.name] = stats;
                }
              } catch (err) {
                // Una capa que no carga no detiene el resto del análisis
                log.warn(`[ChatIA] No se pudo analizar ${config.name}:`, err?.message || err);
              } finally {
                preloadState.loaded += 1;
                preloadState.current = null;
                emitProgress();
              }
            })
          )
        );

        preloadState.status = "done";
        preloadState.current = null;
        emitProgress();

        const totalFeatures = Object.values(enrichedAnalytics).reduce((sum, s) => sum + (s?.count || 0), 0);
        log.debug(
          `[ChatIA] ✅ Contexto listo: ${Object.keys(enrichedAnalytics).length} capas, ` +
          `${totalFeatures.toLocaleString()} elementos analizados`
        );
        resolve(enrichedAnalytics);
      } catch (err) {
        preloadState.status = "error";
        preloadState.current = null;
        emitProgress();
        log.error("[ChatIA] Error en la precarga de contexto:", err);
        resolve(enrichedAnalytics);
      }
    }, delay);
  });

  return preloadPromise;
}

// ── Envío de consultas ─────────────────────────────────────────

function buildEnrichedContext(lowerText, layerConfigs) {
  let enrichedContext = "";

  // 1. Capas mencionadas por id, nombre visible o token distintivo
  //    ("embalses" → "Lagunas, Tranques y Embalses")
  const mentionedLayers = Object.keys(enrichedAnalytics).filter((layerId) => {
    const config = layerConfigs.find((c) => c.name === layerId);
    const visibleName = (config?.nombrePersonalizado || layerId).toLowerCase();
    const variants = [layerId.toLowerCase(), layerId.toLowerCase().replace(/_/g, " "), visibleName];
    if (variants.some((v) => v && lowerText.includes(v))) return true;

    const tokens = `${layerId} ${config?.nombrePersonalizado || ""}`
      .toLowerCase()
      .split(/[^a-záéíóúñ0-9]+/i)
      .filter((t) => t.length >= 6);
    return tokens.some((t) => lowerText.includes(t));
  });

  if (mentionedLayers.length > 0) {
    enrichedContext += "\n### DATOS DETALLADOS DE CAPAS MENCIONADAS:\n";
    mentionedLayers.forEach((layer) => {
      enrichedContext += generateLayerReport(layer);
    });
  }

  // 2. Consultas relacionales entre dimensiones ("agua y agricultura", "relación...")
  const dimensionsDetectadas = Object.entries(DIMENSION_KEYWORDS)
    .filter(([key]) => layerConfigs.some((c) => c.dimension === key))
    .filter(([, keywords]) => keywords.some((kw) => lowerText.includes(kw)))
    .map(([key]) => key);

  const isRelational =
    dimensionsDetectadas.length >= 2 ||
    (dimensionsDetectadas.length === 1 && (lowerText.includes("relacion") || lowerText.includes("relaciona")));

  if (isRelational) {
    const [dim1, dim2] = dimensionsDetectadas;
    if (dim1 && dim2 && dim1 !== dim2) {
      const layers1 = Object.keys(enrichedAnalytics).filter((l) => enrichedAnalytics[l].dimension === dim1);
      const layers2 = Object.keys(enrichedAnalytics).filter((l) => enrichedAnalytics[l].dimension === dim2);
      if (layers1.length > 0 && layers2.length > 0) {
        enrichedContext += generateRelationshipReport(dim1, dim2, layers1, layers2);
      }
    }
  }

  // 3. Resumen global si todavía no hay contexto específico
  if (!enrichedContext) {
    enrichedContext += "\n### INVENTARIO DE CAPAS DISPONIBLES:\n";
    layerConfigs.forEach((c) => {
      const stats = enrichedAnalytics[c.name];
      enrichedContext += `- ${c.nombrePersonalizado} (${c.dimension}/${c.type}): ${stats ? `${stats.count} elementos` : "pendiente de análisis"}\n`;
    });
  }

  // Límite de tamaño del contexto
  if (enrichedContext.length > MAX_CONTEXT_CHARS) {
    enrichedContext = enrichedContext.substring(0, MAX_CONTEXT_CHARS) + "\n\n[Análisis truncado por límite de tamaño]";
  }

  return enrichedContext;
}

/**
 * Envía un mensaje al asistente con contexto territorial enriquecido.
 *
 * @param {string} text - Consulta del usuario
 * @param {Array<{role: string, content: string}>} [history] - Historial reciente
 * @returns {Promise<string>} Respuesta del modelo
 */
export async function sendMessage(text, history = []) {
  try {
    const lowerText = text.toLowerCase();

    if (layerConfigsCache.length === 0) {
      layerConfigsCache = getAllLayerConfigs(allTemasConfig);
    }

    const enrichedContext = buildEnrichedContext(lowerText, layerConfigsCache);

    const messages = [
      {
        role: "system",
        content: `Eres el asistente experto del Visor Territorial WoLL — Región de Atacama (Chile).

Tu trabajo es ayudar a los usuarios a interpretar el territorio a partir de las capas del visor:
agua, agricultura, minería, energía, clima, riesgos, suelo, planificación y otros.

Tienes acceso a análisis estadístico COMPLETO de las capas, incluyendo:
- Estadísticas descriptivas de todos los atributos (mín, máximo, promedio, mediana, desviación estándar)
- Distribuciones de valores categóricos
- Correlaciones y relaciones entre capas y dimensiones

${enrichedContext}

Responde basándote en estos datos reales. Sé específico, cita estadísticas concretas y genera insights valiosos.
Responde en español, en un tono claro y conciso.`,
      },
    ];

    messages.push(...history.slice(-3));
    messages.push({ role: "user", content: text });

    const payload = JSON.stringify({ messages });
    log.debug(`📤 Payload chat: ${(payload.length / 1024 / 1024).toFixed(2)} MB`);

    if (payload.length > MAX_PAYLOAD_BYTES) {
      throw new Error("Consulta demasiado compleja. Reformúla siendo más específico.");
    }

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    });

    if (!response.ok) {
      let detail = "";
      try {
        const errBody = await response.json();
        detail = errBody?.error?.message || errBody?.error || "";
      } catch {
        detail = "";
      }
      if ([404, 501, 502, 503].includes(response.status)) {
        throw new Error(
          "El servicio de IA no está disponible en este entorno. " +
          "Despliega el visor en Vercel con la variable GROQ_API_KEY configurada."
        );
      }
      throw new Error(detail ? `Error ${response.status}: ${detail}` : `Error ${response.status} al consultar la IA.`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "Sin respuesta.";
  } catch (err) {
    log.error("[ChatIA] Error en sendMessage:", err);
    throw err;
  }
}

/**
 * Estadísticas pre-computadas de una capa.
 * @param {string} layerName - Identificador de la capa
 */
export function getLayerAnalytics(layerName) {
  return enrichedAnalytics[layerName];
}

/**
 * Todas las estadísticas pre-computadas.
 * @returns {Object} Mapa `idCapa -> estadísticas`
 */
export function getAllAnalytics() {
  return enrichedAnalytics;
}
