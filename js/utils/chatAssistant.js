/**
 * Sistema de análisis profundo con procesamiento en cliente
 * Analiza atributos reales y genera insights estadísticos
 */

import { loadAllLayersForChat } from './layerUtils.js';
import { getAllLayerConfigs } from './metadataExtractor.js';
import { getLayerData } from '../store/appState.js';

let isChatInitialized = false;
let layerDataCache = {}; // Cache de todos los GeoJSON
let enrichedAnalytics = {}; // Análisis pre-computado

/**
 * Extrae estadísticas ricas de una capa
 */
function extractRichStatistics(layerName, geojsonData) {
    if (!geojsonData?.features || geojsonData.features.length === 0) {
        return null;
    }

    const features = geojsonData.features;
    const properties = features[0].properties || {};
    const propertyKeys = Object.keys(properties);

    const stats = {
        name: layerName,
        count: features.length,
        attributes: {},
        uniqueValues: {},
        distributions: {},
        correlations: []
    };

    // Analizar cada atributo
    propertyKeys.forEach(key => {
        const values = features.map(f => f.properties?.[key]).filter(v => v != null);

        if (values.length === 0) return;

        const firstValue = values[0];
        const isNumeric = typeof firstValue === 'number' || !isNaN(parseFloat(firstValue));

        if (isNumeric) {
            const numValues = values.map(v => parseFloat(v)).filter(v => !isNaN(v));
            if (numValues.length > 0) {
                stats.attributes[key] = {
                    type: 'numeric',
                    count: numValues.length,
                    min: Math.min(...numValues),
                    max: Math.max(...numValues),
                    mean: numValues.reduce((a, b) => a + b, 0) / numValues.length,
                    median: calculateMedian(numValues),
                    stdDev: calculateStdDev(numValues)
                };
            }
        } else {
            const uniqueVals = [...new Set(values)];
            const frequency = {};
            values.forEach(v => {
                frequency[v] = (frequency[v] || 0) + 1;
            });

            stats.attributes[key] = {
                type: 'categorical',
                count: values.length,
                unique: uniqueVals.length,
                topValues: Object.entries(frequency)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([val, count]) => ({ value: val, count, percentage: (count / values.length * 100).toFixed(1) }))
            };
            if (uniqueVals.length < 50) {
                stats.distributions[key] = frequency;
            }
        }
    });

    return stats;
}

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
 * Encuentra correlaciones entre capas basadas en atributos comunes
 */
function findCrossLayerCorrelations(layer1Name, layer2Name) {
    const data1 = layerDataCache[layer1Name];
    const data2 = layerDataCache[layer2Name];

    if (!data1 || !data2) return null;

    const stats1 = enrichedAnalytics[layer1Name];
    const stats2 = enrichedAnalytics[layer2Name];

    if (!stats1 || !stats2) return null;

    const correlations = {
        commonAttributes: [],
        spatialOverlap: null,
        potentialJoins: []
    };

    // Buscar atributos comunes
    const attrs1 = Object.keys(stats1.attributes);
    const attrs2 = Object.keys(stats2.attributes);

    attrs1.forEach(attr1 => {
        attrs2.forEach(attr2 => {
            const key1 = attr1.toLowerCase().replace(/[_\s]/g, '');
            const key2 = attr2.toLowerCase().replace(/[_\s]/g, '');

            // Atributos con nombres similares
            if (key1 === key2 || key1.includes(key2) || key2.includes(key1)) {
                correlations.commonAttributes.push({
                    layer1: layer1Name,
                    attr1: attr1,
                    layer2: layer2Name,
                    attr2: attr2,
                    type1: stats1.attributes[attr1].type,
                    type2: stats2.attributes[attr2].type
                });
            }
        });
    });

    // Buscar joins potenciales (IDs, códigos, nombres)
    const joinFields = ['id', 'codigo', 'cod', 'nombre', 'name', 'comuna', 'region'];

    attrs1.forEach(attr1 => {
        const norm1 = attr1.toLowerCase();
        if (joinFields.some(jf => norm1.includes(jf))) {
            attrs2.forEach(attr2 => {
                const norm2 = attr2.toLowerCase();
                if (joinFields.some(jf => norm2.includes(jf))) {
                    correlations.potentialJoins.push({
                        layer1: layer1Name,
                        field1: attr1,
                        layer2: layer2Name,
                        field2: attr2
                    });
                }
            });
        }
    });

    return correlations;
}

/**
 * Realiza análisis cruzado entre dos dimensiones
 */
function performCrossAnalysis(dimension1Layers, dimension2Layers) {
    const analysis = {
        summary: '',
        attributeComparisons: [],
        spatialRelationships: [],
        keyInsights: []
    };

    // Análisis atributo por atributo
    dimension1Layers.forEach(layer1 => {
        dimension2Layers.forEach(layer2 => {
            const correlation = findCrossLayerCorrelations(layer1, layer2);
            if (correlation && (correlation.commonAttributes.length > 0 || correlation.potentialJoins.length > 0)) {
                analysis.attributeComparisons.push({
                    layers: [layer1, layer2],
                    correlation
                });
            }
        });
    });

    // Generar insights basados en los datos
    const insights = generateInsights(dimension1Layers, dimension2Layers);
    analysis.keyInsights = insights;

    return analysis;
}

/**
 * Genera insights inteligentes basados en análisis de datos
 */
function generateInsights(layers1, layers2) {
    const insights = [];

    // Analizar distribuciones
    layers1.forEach(layer1Name => {
        const stats1 = enrichedAnalytics[layer1Name];
        if (!stats1) return;

        layers2.forEach(layer2Name => {
            const stats2 = enrichedAnalytics[layer2Name];
            if (!stats2) return;

            // Buscar patrones en atributos categóricos
            Object.entries(stats1.distributions || {}).forEach(([attr1, dist1]) => {
                Object.entries(stats2.distributions || {}).forEach(([attr2, dist2]) => {
                    // Comparar distribuciones
                    const commonKeys = Object.keys(dist1).filter(k => dist2[k]);
                    if (commonKeys.length > 0) {
                        insights.push({
                            type: 'distribution_overlap',
                            description: `${layer1Name} y ${layer2Name} comparten ${commonKeys.length} valores en los atributos "${attr1}" y "${attr2}"`,
                            details: {
                                commonValues: commonKeys,
                                layer1Count: commonKeys.reduce((sum, k) => sum + dist1[k], 0),
                                layer2Count: commonKeys.reduce((sum, k) => sum + dist2[k], 0)
                            }
                        });
                    }
                });
            });

            // Analizar rangos numéricos
            Object.entries(stats1.attributes).forEach(([attr1, info1]) => {
                if (info1.type !== 'numeric') return;

                Object.entries(stats2.attributes).forEach(([attr2, info2]) => {
                    if (info2.type !== 'numeric') return;

                    // Comparar rangos
                    const overlap = calculateNumericOverlap(info1, info2);
                    if (overlap > 50) {
                        insights.push({
                            type: 'numeric_correlation',
                            description: `Los atributos "${attr1}" (${layer1Name}) y "${attr2}" (${layer2Name}) tienen rangos similares`,
                            details: {
                                layer1: { min: info1.min, max: info1.max, mean: info1.mean },
                                layer2: { min: info2.min, max: info2.max, mean: info2.mean },
                                overlap: `${overlap.toFixed(1)}%`
                            }
                        });
                    }
                });
            });
        });
    });

    return insights;
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
 * Genera reporte detallado de una capa
 */
function generateLayerReport(layerName) {
    const stats = enrichedAnalytics[layerName];
    if (!stats) return `No hay información disponible para ${layerName}`;

    let report = `\n### 📊 ANÁLISIS DETALLADO: ${layerName}\n\n`;
    report += `**Total de elementos:** ${stats.count}\n\n`;

    report += `**Atributos analizados:**\n`;

    Object.entries(stats.attributes).forEach(([attr, info]) => {
        report += `\n**${attr}** (${info.type}):\n`;

        if (info.type === 'numeric') {
            report += `  - Rango: ${info.min.toFixed(2)} - ${info.max.toFixed(2)}\n`;
            report += `  - Promedio: ${info.mean.toFixed(2)}\n`;
            report += `  - Mediana: ${info.median.toFixed(2)}\n`;
            report += `  - Desv. Estándar: ${info.stdDev.toFixed(2)}\n`;
        } else {
            report += `  - Valores únicos: ${info.unique}\n`;
            report += `  - Top valores:\n`;
            info.topValues.forEach(tv => {
                report += `    • ${tv.value}: ${tv.count} (${tv.percentage}%)\n`;
            });
        }
    });

    return report;
}

/**
 * Genera reporte de relación entre dimensiones
 */
function generateRelationshipReport(dim1, dim2, layers1, layers2) {
    let report = `\n### 🔗 ANÁLISIS DE RELACIÓN: ${dim1.toUpperCase()} ↔ ${dim2.toUpperCase()}\n\n`;

    // Realizar análisis cruzado
    const crossAnalysis = performCrossAnalysis(layers1, layers2);

    // Resumen de capas
    report += `**Capas de ${dim1}:** ${layers1.join(', ')}\n`;
    report += `**Capas de ${dim2}:** ${layers2.join(', ')}\n\n`;

    // Atributos relacionados
    if (crossAnalysis.attributeComparisons.length > 0) {
        report += `**Atributos relacionados encontrados:**\n`;
        crossAnalysis.attributeComparisons.forEach(comp => {
            if (comp.correlation.commonAttributes.length > 0) {
                report += `\n🔹 ${comp.layers[0]} ↔ ${comp.layers[1]}:\n`;
                comp.correlation.commonAttributes.forEach(ca => {
                    report += `  • "${ca.attr1}" (${ca.type1}) relacionado con "${ca.attr2}" (${ca.type2})\n`;
                });
            }
        });
        report += '\n';
    }

    // Posibles joins
    const allJoins = crossAnalysis.attributeComparisons
        .flatMap(c => c.correlation.potentialJoins);

    if (allJoins.length > 0) {
        report += `**Campos para vincular capas:**\n`;
        allJoins.forEach(join => {
            report += `  • ${join.layer1}.${join.field1} ↔ ${join.layer2}.${join.field2}\n`;
        });
        report += '\n';
    }

    // Insights clave
    if (crossAnalysis.keyInsights.length > 0) {
        report += `**Insights descubiertos:**\n`;
        crossAnalysis.keyInsights.slice(0, 10).forEach((insight, idx) => {
            report += `\n${idx + 1}. ${insight.description}\n`;
            if (insight.details) {
                Object.entries(insight.details).forEach(([key, value]) => {
                    if (typeof value === 'object' && !Array.isArray(value)) {
                        report += `   ${key}:\n`;
                        Object.entries(value).forEach(([k, v]) => {
                            report += `     - ${k}: ${typeof v === 'number' ? v.toFixed(2) : v}\n`;
                        });
                    } else if (Array.isArray(value)) {
                        report += `   ${key}: ${value.slice(0, 5).join(', ')}${value.length > 5 ? '...' : ''}\n`;
                    } else {
                        report += `   ${key}: ${value}\n`;
                    }
                });
            }
        });
    }

    return report;
}

/**
 * Inicialización del sistema
 */
export async function initializeChat(allTemasConfig) {
    if (isChatInitialized) return;

    const chatMessages = document.getElementById("ai-chat-messages");
    const loadingMsg = document.createElement("div");
    loadingMsg.id = "chat-init-loading";
    loadingMsg.className = "ai-message assistant init-loading";
    loadingMsg.innerHTML = `
    <div class="d-flex align-items-center">
      <div class="spinner-border spinner-border-sm me-2"></div>
      <span>Analizando datos territoriales...</span>
    </div>
    <div class="progress mt-2" style="height: 5px;">
      <div id="chat-init-progress" class="progress-bar"></div>
    </div>
    <small id="chat-init-status" class="text-muted d-block mt-1">Procesando...</small>
  `;
    chatMessages.appendChild(loadingMsg);

    try {
        const layerConfigs = getAllLayerConfigs(allTemasConfig);

        // Cargar todas las capas
        await loadAllLayersForChat(layerConfigs, (loaded, total, current) => {
            const pct = Math.round((loaded / total) * 100);
            document.getElementById("chat-init-progress").style.width = `${pct}%`;
            document.getElementById("chat-init-status").textContent = `Analizando ${current}... (${loaded}/${total})`;
        });

        // Cachear datos y extraer estadísticas ricas
        document.getElementById("chat-init-status").textContent = "Generando análisis estadístico...";

        for (const config of layerConfigs) {
            const data = getLayerData(config.name);
            if (data) {
                layerDataCache[config.name] = data;
                enrichedAnalytics[config.name] = extractRichStatistics(config.name, data);
            }
        }

        chatMessages.removeChild(loadingMsg);

        const totalFeatures = Object.values(enrichedAnalytics)
            .reduce((sum, stats) => sum + (stats?.count || 0), 0);

        const successMsg = document.createElement("div");
        successMsg.className = "ai-message assistant system";
        successMsg.innerHTML = `<em>✅ Sistema de análisis inicializado: ${layerConfigs.length} capas, ${totalFeatures.toLocaleString()} elementos, análisis estadístico completo disponible.</em>`;
        chatMessages.appendChild(successMsg);

        isChatInitialized = true;
        console.log("✅ Análisis rico completado:", enrichedAnalytics);
    } catch (err) {
        console.error("❌ Error:", err);
        chatMessages.removeChild(loadingMsg);
    }
}

/**
 * Envío de mensaje con contexto rico
 */
export async function sendMessage(text, history = []) {
    try {
        const lowerText = text.toLowerCase();

        // Detectar tipo de consulta
        let enrichedContext = '';

        // ¿Pregunta sobre capa específica?
        const mentionedLayers = Object.keys(enrichedAnalytics).filter(layer =>
            lowerText.includes(layer.toLowerCase()) ||
            lowerText.includes(layer.toLowerCase().replace(/_/g, ' '))
        );

        if (mentionedLayers.length > 0) {
            enrichedContext += '\n### DATOS DETALLADOS DE CAPAS MENCIONADAS:\n';
            mentionedLayers.forEach(layer => {
                enrichedContext += generateLayerReport(layer);
            });
        }

        // ¿Pregunta sobre relación entre dimensiones?
        const dimensions = {
            agua: Object.keys(enrichedAnalytics).filter(l =>
                l.toLowerCase().includes('agua') || l.toLowerCase().includes('hidro') || l.toLowerCase().includes('rio')),
            agricultura: Object.keys(enrichedAnalytics).filter(l =>
                l.toLowerCase().includes('agricul') || l.toLowerCase().includes('cultivo') || l.toLowerCase().includes('riego'))
        };

        if ((lowerText.includes('agua') && lowerText.includes('agricul')) ||
            (lowerText.includes('relacion') || lowerText.includes('relaciona'))) {
            if (dimensions.agua.length > 0 && dimensions.agricultura.length > 0) {
                enrichedContext += generateRelationshipReport('agua', 'agricultura',
                    dimensions.agua, dimensions.agricultura);
            }
        }

        // Limitar tamaño (máximo 20KB)
        if (enrichedContext.length > 20000) {
            enrichedContext = enrichedContext.substring(0, 20000) + '\n\n[Análisis truncado por límite de tamaño]';
        }

        const messages = [
            {
                role: 'system',
                content: `Eres un analista experto en datos geoespaciales del Visor WoLL - Región de Atacama.

Tienes acceso a análisis estadístico COMPLETO de todas las capas, incluyendo:
- Estadísticas descriptivas de todos los atributos
- Distribuciones de valores categóricos
- Correlaciones entre capas
- Relaciones espaciales

${enrichedContext}

Responde basándote en estos datos reales. Sé específico, cita estadísticas concretas y genera insights valiosos.`
            }
        ];

        messages.push(...history.slice(-3));
        messages.push({ role: 'user', content: text });

        const payload = JSON.stringify({ messages });
        const sizeMB = (payload.length / 1024 / 1024).toFixed(2);
        console.log(`📤 Payload: ${sizeMB} MB`);

        if (payload.length > 4 * 1024 * 1024) {
            throw new Error('Consulta demasiado compleja. Sé más específico.');
        }

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload
        });

        if (!response.ok) {
            throw new Error(`Error ${response.status}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || 'Sin respuesta.';

    } catch (err) {
        console.error("❌ Error:", err);
        throw err;
    }
}

// Exportar acceso directo a análisis
export function getLayerAnalytics(layerName) {
    return enrichedAnalytics[layerName];
}

export function getAllAnalytics() {
    return enrichedAnalytics;
}