/**
 * Utilidades para manejo de capas del mapa.
 *
 * Arquitectura de renderers:
 *  - Polígonos y líneas pesadas → Leaflet.glify (WebGL)
 *    Condición: configCapa.type === 'polygon' | 'line' y USE_GLIFY_RENDERER = true
 *  - Puntos (todos los tipos) → L.geoJson (cluster, heatmap, íconos por atributo)
 *    Razón: glify no soporta íconos PNG/SVG, cluster ni etiquetas permanentes.
 *
 * El módulo glifyAdapter.js encapsula toda la lógica WebGL y expone
 * un adaptador con la misma interfaz que L.Layer para que el resto del
 * código no necesite conocer el renderer subyacente.
 *
 * @module utils/layerUtils
 */

import { getEstiloCapa, getPointStyle, addLabelsToLayer, } from "./styleUtils.js";
import { bindPopup } from "./popupUtils.js";
import { PATHS, MAP_CONFIG } from "../config/constants.js";
import { appState, addLayer, getLayer, markLayerAsLoaded, isLayerLoaded, removeLayer, updateLayerOrder, clearAllLayers, setLayerData, getLayerData, getDataFilter } from "../store/appState.js";
import { createContextLogger } from "./logger.js";
import { LayerLoadError, handleError } from "./errorHandler.js";
import { shouldUseGlify, createGlifyLayer } from "./glifyAdapter.js";
import { runWorkerTask } from "../workers/workerPool.js";

let sharedCanvasRenderer = null;

/**
 * Obtiene (o crea) el renderer Canvas compartido.
 * Se inicializa de forma lazy para garantizar que el mapa ya existe.
 * @returns {L.Canvas|undefined}
 */
function getCanvasRenderer() {
  if (!MAP_CONFIG.PREFER_CANVAS) return undefined;
  if (!sharedCanvasRenderer && appState.map) {
    sharedCanvasRenderer = L.canvas();
  }
  return sharedCanvasRenderer || undefined;
}

const log = createContextLogger('LayerUtils');

export function initializeLayerState(map) {
  appState.map = map;
}

export function cargarCapasGeoJSON(tema, temasConfig) {
  if (!temasConfig[tema] || !temasConfig[tema].capas) {
    console.warn(`Tema '${tema}' no tiene capas definidas.`);
    return;
  }
  const estiloTema = temasConfig[tema].estilo || {};
  temasConfig[tema].capas.forEach((capaNombre) => {
    try {
      const configCapa = estiloTema[capaNombre];
      cargarCapaIndividual(capaNombre, tema, temasConfig);
    } catch (err) {
      console.warn(`Error cargando capa '${capaNombre}':`, err);
    }
  });
}

export function estimateLayerSize(capaNombre) {
  // Capas pesadas (>10MB, geometrías complejas o muchos registros)
  const heavyLayers = [
    // Energía
    "energia_linea_transmision",
    "energia_potencial_fotovoltaico",
    "energia_potencial_eolico",        // polígonos por comuna
    "energia_potencial_geotermico",    // polígonos
    "energia_almacenamiento_combustibles",
    "energia_oleoducto",
    // Agricultura
    "agricultura_especies_fruticolas", // polígonos grandes
    "capacidad_uso_suelo",             // polígonos detallados
    "agua_red_hidrografica",           // red de drenaje completa (muchas líneas)
    "agua_derechos_agua",              // miles de puntos
    "agua_glaciares",                  // polígonos
    "agua_laguna_embalses_tranques",   // polígonos
    // Minería
    "mineria_distritos_mineros",       // polígonos
    "mineria_yacimientos",             // muchos puntos
    "mineria_relaves_mineros",         // puntos + atributos
    "mineria_instalaciones_mineras",   // muchas instalaciones
    // Turismo
    "turismo_snaspe",                  // polígonos de áreas protegidas
    "turismo_monumentos_nacionales",   // polígonos + puntos
    "turismo_zoit",                    // polígonos
    // Inversiones (proyectos SEIA)
    "inversion_agropecuario",
    "inversion_energia",
    "inversion_mineria",
    "inversion_inmobiliarios",
    "inversion_fabriles",
    "inversion_planificacion",
    // Empresas (muchos registros por comuna)
    "empresas_energias_renovables",
    "empresas_electromovilidad",
    "empresas_data_centers",
    "empresas_agroindustria_avanzada",
    "empresas_seguridad_alimentaria",
    "empresas_mineria_bajo_impacto",
    "empresas_economia_circular",
    "empresas_experiencias_turisticas",
    "empresas_inversion_inmobiliaria",
  ];

  // Capas medianas (2-10MB, geometrías moderadas)
  const mediumLayers = [
    // Agricultura
    "agricultura_variedad_fruticolas1",
    "agricultura_variedad_fruticolas2",
    "agricultura_plantas_embalaje",
    "agricultura_camaras_frio",
    "agricultura_agroindustrias",
    // Energía
    "energia_plantas_eolicas",
    "energia_plantas_solares",
    "energia_hidroelectricas",
    "energia_termoelectricas",
    "energia_bioenergia",
    "energia_subestaciones",
    "energia_potencial_hidrobombeo",
    "energia_potencial_hidroelectrico",
    // Minería
    "mineria_gran_mineria",
    // Turismo
    "turismo_infraestructura",
    "turismo_atractivos_turisticos",
    "turismo_rutas_patrimoniales",
    // Inversiones (restantes)
    "inversion_equipamiento",
    "inversion_hidraulica",
    "inversion_otros",
    "inversion_saneamiento",
    // Contexto (límites y toponimia son ligeros, pero se dejan en medio por si acaso)
    "limite_comunal_linea",
    "toponimia",
  ];

  if (heavyLayers.includes(capaNombre)) return 100;
  if (mediumLayers.includes(capaNombre)) return 50;
  // Cualquier otra capa no listada se considera ligera
  return 10;
}

export async function fetchLayerData(capaNombre, configCapa) {
  const existingData = getLayerData(capaNombre);
  if (existingData) {
    log.debug(`[LayerUtils] Datos ya en caché para ${capaNombre}, saltando fetch.`);
    return existingData;
  }

  let relativeUrl = configCapa.url.startsWith("http")
    ? configCapa.url
    : `${PATHS.GEOJSON_BASE}${configCapa.url}`;
  const url = new URL(relativeUrl, window.location.href).href;
  log.debug(`Solicitando datos para ${capaNombre} desde: ${url}`);

  try {
    const data = await runWorkerTask({ type: 'FETCH_AND_PROCESS', url });
    log.log(`✓ Capa ${capaNombre} procesada por Worker Pool.`);
    return data;
  } catch (err) {
    throw err;
  }
}

function createHeatmapLayer(data, configCapa, capaNombre) {
  const points = [];
  const intensityField = configCapa.heatmapIntensity || null;
  const hiddenSet = appState.layers.hiddenAttributes.get(capaNombre) || new Set();
  const atributoFiltro = configCapa.atributo;
  const SAMPLES_PER_LINE = 30;

  data.features.forEach(feature => {
    if (!feature?.geometry?.type) return;
    if (atributoFiltro && hiddenSet.has(feature.properties[atributoFiltro])) return;

    const geomType = feature.geometry.type;
    let intensity = 1.0;
    if (intensityField && feature.properties[intensityField] !== undefined) {
      const val = parseFloat(feature.properties[intensityField]);
      if (!isNaN(val)) intensity = val;
    }

    if (geomType === 'Point') {
      const coords = feature.geometry.coordinates;
      points.push({ lat: coords[1], lng: coords[0], intensity });
    } else if (geomType === 'LineString') {
      const coords = feature.geometry.coordinates;
      if (coords.length >= 2) {
        let totalLen = 0;
        const segs = [];
        for (let i = 0; i < coords.length - 1; i++) {
          segs.push(Math.sqrt(
            Math.pow(coords[i+1][0] - coords[i][0], 2) +
            Math.pow(coords[i+1][1] - coords[i][1], 2)
          ));
          totalLen += segs[segs.length - 1];
        }
        for (let i = 0; i < coords.length - 1; i++) {
          const steps = Math.max(1, Math.round((segs[i] / totalLen) * SAMPLES_PER_LINE));
          for (let s = 0; s < steps; s++) {
            const t = steps > 1 ? s / steps : 0;
            points.push({
              lat: coords[i][1] + (coords[i+1][1] - coords[i][1]) * t,
              lng: coords[i][0] + (coords[i+1][0] - coords[i][0]) * t,
              intensity: 1.0
            });
          }
        }
      }
    } else if (geomType === 'MultiLineString') {
      feature.geometry.coordinates.forEach(lineCoords => {
        if (lineCoords.length >= 2) {
          let totalLen = 0;
          const segs = [];
          for (let i = 0; i < lineCoords.length - 1; i++) {
            segs.push(Math.sqrt(
              Math.pow(lineCoords[i+1][0] - lineCoords[i][0], 2) +
              Math.pow(lineCoords[i+1][1] - lineCoords[i][1], 2)
            ));
            totalLen += segs[segs.length - 1];
          }
          for (let i = 0; i < lineCoords.length - 1; i++) {
            const steps = Math.max(1, Math.round((segs[i] / totalLen) * SAMPLES_PER_LINE));
            for (let s = 0; s < steps; s++) {
              const t = steps > 1 ? s / steps : 0;
              points.push({
                lat: lineCoords[i][1] + (lineCoords[i+1][1] - lineCoords[i][1]) * t,
                lng: lineCoords[i][0] + (lineCoords[i+1][0] - lineCoords[i][0]) * t,
                intensity: 1.0
              });
            }
          }
        }
      });
    }
  });

  const heatmapOptions = {
    radius: configCapa.heatmapRadius || 20,
    opacity: configCapa.heatmapOpacity !== undefined ? configCapa.heatmapOpacity : 0.8,
    gradient: configCapa.heatmapGradient || { 0.0: 'blue', 0.5: 'lime', 1.0: 'red' }
  };
  const heatmapLayer = new L.WebGLHeatMap(heatmapOptions);
  heatmapLayer.setData(points);
  heatmapLayer._configCapa = configCapa;
  heatmapLayer._isHeatmap = true;
  return heatmapLayer;
}

export async function toggleHeatmapMode(capaNombre, temaKey, temasConfig) {
  const isHeatmap = appState.layers.heatmapMode.get(capaNombre);
  const newMode = !isHeatmap;
  if (newMode) {
    appState.layers.clusterMode.set(capaNombre, false);  // desactivar cluster
  }
  appState.layers.heatmapMode.set(capaNombre, newMode);
  if (isLayerLoaded(capaNombre)) {
    const currentIndex = appState.layers.ordered.indexOf(capaNombre);
    ocultarCapa(capaNombre);
    removeLayer(capaNombre);
    appState.layers.loaded.delete(capaNombre);
    const nameLabel = document.querySelector(`.layer-item-container[data-capa-nombre="${capaNombre}"] .layer-item-name`);
    let originalText = "";
    if (nameLabel) { originalText = nameLabel.innerHTML; nameLabel.innerHTML = `${originalText} <span class="loading-indicator">...</span>`; }
    try {
      await cargarCapaIndividual(capaNombre, temaKey, temasConfig);
      if (currentIndex > -1) {
        updateLayerOrder(capaNombre, currentIndex);
        actualizarOrdenCapas();
      }
      // Aplicar opacidad guardada después de recargar
      applySavedOpacity(capaNombre);
    } finally {
      if (nameLabel) nameLabel.innerHTML = originalText;
    }
  }
}

export async function toggleClusterMode(capaNombre, temaKey, temasConfig) {
  const isCluster = appState.layers.clusterMode.get(capaNombre);
  const newMode = !isCluster;
  if (newMode) {
    appState.layers.heatmapMode.set(capaNombre, false);  // desactivar heatmap
  }
  appState.layers.clusterMode.set(capaNombre, newMode);
  if (isLayerLoaded(capaNombre)) {
    const currentIndex = appState.layers.ordered.indexOf(capaNombre);
    ocultarCapa(capaNombre);
    removeLayer(capaNombre);
    appState.layers.loaded.delete(capaNombre);
    const nameLabel = document.querySelector(`.layer-item-container[data-capa-nombre="${capaNombre}"] .layer-item-name`);
    let originalText = "";
    if (nameLabel) { originalText = nameLabel.innerHTML; nameLabel.innerHTML = `${originalText} <span class="loading-indicator">...</span>`; }
    try {
      await cargarCapaIndividual(capaNombre, temaKey, temasConfig);
      if (currentIndex > -1) {
        updateLayerOrder(capaNombre, currentIndex);
        actualizarOrdenCapas();
      }
      applySavedOpacity(capaNombre);
    } finally {
      if (nameLabel) nameLabel.innerHTML = originalText;
    }
  }
}

export async function cargarCapaIndividual(capaNombre, temaKey, temasConfig, isInitialLoad = false) {
  if (appState.layers.pendingLoads.has(capaNombre)) {
    return appState.layers.pendingLoads.get(capaNombre);
  }

  const loadPromise = (async () => {
    try {
    const temaConf = temasConfig[temaKey];
    if (!temaConf) throw new Error(`Tema '${temaKey}' no encontrado en la configuración.`);
    const configCapa = temaConf.estilo?.[capaNombre];
    if (!configCapa) throw new Error(`Configuración de estilo no encontrada para la capa: ${capaNombre} en tema: ${temaKey}`);
    log.debug(`[LayerUtils] Iniciando carga de capa: ${capaNombre} (tema: ${temaKey})`);
    appState.layers.loading.add(capaNombre);
    if (isLayerLoaded(capaNombre)) { mostrarCapa(capaNombre); return; }
    const data = await fetchLayerData(capaNombre, configCapa);
    setLayerData(capaNombre, data);

    const dataFilter = getDataFilter(capaNombre);
    const dataParaRender = (dataFilter && dataFilter.size > 0)
      ? {
          type: 'FeatureCollection',
          features: data.features.filter(feature => {
            for (const [attr, allowedValues] of dataFilter.entries()) {
              const featureVal = feature.properties?.[attr];
              if (featureVal === undefined || featureVal === null) return false;
              if (!allowedValues.has(String(featureVal))) return false;
            }
            return true;
          })
        }
      : data;

    // ── Rama WebGL: polígonos y líneas con Leaflet.glify ──────────────────
    if (shouldUseGlify(configCapa)) {
      const glifyLayer = createGlifyLayer(appState.map, dataParaRender, configCapa, capaNombre);
      if (glifyLayer) {
        glifyLayer.addTo(appState.map);
        addLayer(capaNombre, glifyLayer);
        markLayerAsLoaded(capaNombre);
        applySavedOpacity(capaNombre);
        log.log(`Capa ${capaNombre} cargada con WebGL (glify)`);
        return;
      }
      // Si createGlifyLayer retorna null (tipo no soportado), cae al renderer estándar
      log.warn(`glifyAdapter retornó null para '${capaNombre}'. Usando L.geoJson como fallback.`);
    }

    // ── Rama estándar: puntos, cluster, heatmap y fallback ───────────────
    let isHeatmap = appState.layers.heatmapMode.get(capaNombre);
    let isCluster = appState.layers.clusterMode.get(capaNombre);
    if (isHeatmap === undefined && configCapa.heatmap === true) { isHeatmap = true; appState.layers.heatmapMode.set(capaNombre, true); }
    if (isCluster === undefined && configCapa.type === "point" && configCapa.cluster === true) { isCluster = true; appState.layers.clusterMode.set(capaNombre, true); }

    let finalLayer;
    if (isHeatmap && (configCapa.type === "point" || configCapa.type === "line")) {
      finalLayer = createHeatmapLayer(dataParaRender, configCapa, capaNombre);
    } else if (isCluster && configCapa.type === "point" && typeof L.markerClusterGroup === 'function') {
      const options = {
        renderer: getCanvasRenderer(),
        filter: function (feature) {
          if (configCapa.atributo && appState.layers.hiddenAttributes.has(capaNombre)) {
            const hiddenSet = appState.layers.hiddenAttributes.get(capaNombre);
            if (hiddenSet && hiddenSet.has(feature.properties[configCapa.atributo])) return false;
          }
          return true;
        },
        onEachFeature: function (feature, layer) {
          bindPopup(feature, layer, configCapa);
          layer.feature = feature;
          layer.options.layerName = capaNombre;
          if (configCapa.etiquetas && configCapa.etiquetas.campo) addLabelsToLayer(layer, feature, configCapa.etiquetas);
        },
        pointToLayer: function (feature, latlng) {
          return L.marker(latlng, getPointStyle(feature, configCapa));
        }
      };
      const geojsonLayer = L.geoJson(dataParaRender, options);
      const clusterGroup = L.markerClusterGroup({ disableClusteringAtZoom: 16, maxClusterRadius: 70 });
      clusterGroup.addLayer(geojsonLayer);
      clusterGroup._geoJsonOptions = options;
      clusterGroup._isCluster = true;
      finalLayer = clusterGroup;
    } else {
      // ── L.geoJson: líneas, polígonos sin glify y puntos sin cluster ──────
      // Las líneas siempre llegan aquí (GLIFY_TYPES no incluye 'line').
      // Los polígonos llegan aquí solo si glify retornó null (ctx agotado).
      const isPoint = configCapa.type === "point";
      if (configCapa.type === 'line' || configCapa.type === 'polygon') {
        log.debug(`[LayerUtils] ${capaNombre} (${configCapa.type}) → renderizando con L.geoJson SVG`);
      }
      const options = {
        renderer: isPoint ? getCanvasRenderer() : undefined,
        filter: function (feature) {
          if (configCapa.atributo && appState.layers.hiddenAttributes.has(capaNombre)) {
            const hiddenSet = appState.layers.hiddenAttributes.get(capaNombre);
            if (hiddenSet && hiddenSet.has(feature.properties[configCapa.atributo])) return false;
          }
          return true;
        },
        onEachFeature: function (feature, layer) {
          bindPopup(feature, layer, configCapa);
          layer.feature = feature;
          layer.options.layerName = capaNombre;
          if (configCapa.etiquetas && configCapa.etiquetas.campo) addLabelsToLayer(layer, feature, configCapa.etiquetas);
        }
      };
      if (configCapa.type === "point") {
        options.pointToLayer = function (feature, latlng) {
          const marker = L.marker(latlng, getPointStyle(feature, configCapa));
          if (configCapa.etiquetas && configCapa.etiquetas.campo) addLabelsToLayer(marker, feature, configCapa.etiquetas);
          return marker;
        };
      } else {
        options.style = (feature) => getEstiloCapa(feature, configCapa);
      }
      finalLayer = L.geoJson(dataParaRender, options);
    }
    finalLayer.addTo(appState.map);
    addLayer(capaNombre, finalLayer);
    markLayerAsLoaded(capaNombre);
    applySavedOpacity(capaNombre);
    log.log(`Capa ${capaNombre} cargada exitosamente`);
  } catch (error) {
    const layerError = new LayerLoadError(capaNombre, error);
    handleError(layerError, 'LayerUtils.cargarCapaIndividual', false);
    throw layerError;
  } finally {
    appState.layers.loading.delete(capaNombre);
    appState.layers.pendingLoads.delete(capaNombre);
  }
  })();

  appState.layers.pendingLoads.set(capaNombre, loadPromise);
  return loadPromise;
}

export function mostrarCapa(capaNombre) {
  const layer = getLayer(capaNombre);
  if (!layer || !appState.map) {
    log.warn(`No se puede mostrar la capa ${capaNombre}: capa no encontrada`);
    return;
  }
  // Capas glify: usan addTo() del adaptador
  if (layer._isGlify) {
    layer.addTo(appState.map);
    log.debug(`Capa glify ${capaNombre} mostrada`);
    return;
  }
  // Capas L.geoJson estándar
  if (!appState.map.hasLayer(layer)) {
    layer.addTo(appState.map);
    log.debug(`Capa ${capaNombre} mostrada`);
  }
}

export function ocultarCapa(capaNombre) {
  const capa = getLayer(capaNombre);
  if (!capa) return;
  // Capas glify: usan removeFrom() del adaptador
  if (capa._isGlify) {
    capa.removeFrom(appState.map);
    return;
  }
  // Capas L.geoJson estándar
  if (appState.map.hasLayer(capa)) {
    appState.map.removeLayer(capa);
  }
}

export function updateLayerFilter(capaNombre) {
  const layer = getLayer(capaNombre);
  const data = getLayerData(capaNombre);
  if (!layer) return;

  const dataFilter = getDataFilter(capaNombre);
  const hasDataFilter = dataFilter && dataFilter.size > 0;

  const filteredFeatures = hasDataFilter
    ? data.features.filter(feature => {
        for (const [attr, allowedValues] of dataFilter.entries()) {
          const featureVal = feature.properties?.[attr];
          if (featureVal === undefined || featureVal === null) return false;
          if (!allowedValues.has(String(featureVal))) return false;
        }
        return true;
      })
    : null;

  const dataToUse = filteredFeatures
    ? { type: 'FeatureCollection', features: filteredFeatures }
    : data;

  if (layer._isGlify) {
    layer.triggerFilterUpdate();
    return;
  }

  if (layer._isHeatmap) {
    if (!dataToUse) return;
    const configCapa = layer._configCapa;
    if (!configCapa) return;

    const hiddenSet = appState.layers.hiddenAttributes.get(capaNombre);
    const hasHidden = hiddenSet && hiddenSet.size > 0;
    const atributo = configCapa.atributo;

    const filteredFeatures = dataToUse.features.filter(feature => {
      if (hasHidden && atributo) {
        const val = feature.properties?.[atributo];
        if (val !== undefined && hiddenSet.has(val)) return false;
      }
      return true;
    });

    const filteredData = { type: 'FeatureCollection', features: filteredFeatures };

    if (appState.map.hasLayer(layer)) {
      appState.map.removeLayer(layer);
    }

    const newHeatmap = createHeatmapLayer(filteredData, configCapa, capaNombre);
    appState.map.addLayer(newHeatmap);
    appState.layers.byName.set(capaNombre, newHeatmap);

    applySavedOpacity(capaNombre);
    return;
  }

  if (dataToUse) {
    if (layer._isCluster) {
      layer.clearLayers();
      const geojsonLayer = L.geoJson(dataToUse, layer._geoJsonOptions);
      layer.addLayer(geojsonLayer);
    } else {
      layer.clearLayers();
      layer.addData(dataToUse);
    }
    applySavedOpacity(capaNombre);
  }
}

export function moverCapa(capaNombre, nuevaPosicion) {
  const capa = getLayer(capaNombre);
  if (!capa) {
    log.warn(`Capa '${capaNombre}' no encontrada para mover.`);
    return;
  }
  // Capas glify: el adaptador gestiona addTo/removeFrom
  if (capa._isGlify) {
    capa.removeFrom(appState.map);
    updateLayerOrder(capaNombre, nuevaPosicion);
    capa.addTo(appState.map);
  } else {
    if (appState.map.hasLayer(capa)) appState.map.removeLayer(capa);
    updateLayerOrder(capaNombre, nuevaPosicion);
    capa.addTo(appState.map);
  }
  actualizarOrdenCapas();
}

export function actualizarOrdenCapas() {
  appState.layers.ordered.forEach((nombreCapa) => {
    const capa = getLayer(nombreCapa);
    if (capa && typeof capa.bringToFront === 'function') {
      capa.bringToFront();
    }
  });
}

export function limpiarCapasDeDimension(capasArray) {
  if (!Array.isArray(capasArray)) return;
  capasArray.forEach((capaNombre) => {
    const capa = getLayer(capaNombre);
    if (!capa) return;
    // Capas glify: removeFrom() del adaptador
    if (capa._isGlify) {
      capa.removeFrom(appState.map);
    } else if (appState.map.hasLayer(capa)) {
      appState.map.removeLayer(capa);
    }
    const mainChk = document.getElementById(`capa-${capaNombre}`);
    const mobileChk = document.getElementById(`capa-mobile-${capaNombre}`);
    if (mainChk) mainChk.checked = false;
    if (mobileChk) mobileChk.checked = false;
  });
}

export function limpiarMapa(capaBaseActual) {
  log.debug("Limpiando todas las capas del mapa...");
  if (!appState.map) {
    log.warn("No hay mapa inicializado para limpiar");
    return;
  }

  // Eliminar capas glify (no son L.Layer, eachLayer no las detecta)
  appState.layers.byName.forEach((capa) => {
    if (capa._isGlify) {
      try { capa.removeFrom(appState.map); } catch (_) { /* silent */ }
    }
  });

  // Eliminar capas L.geoJson estándar
  appState.map.eachLayer((layer) => {
    if (layer !== capaBaseActual) {
      appState.map.removeLayer(layer);
    }
  });

  clearAllLayers();
  sharedCanvasRenderer = null;
  log.log("Mapa limpiado exitosamente");
}

export function applySavedOpacity(capaNombre) {
  try {
    const savedOpacities = JSON.parse(localStorage.getItem('layer-opacities') || '{}');
    const savedOpacity = savedOpacities[capaNombre];
    if (savedOpacity !== undefined && savedOpacity < 100) {
      setLayerOpacity(capaNombre, savedOpacity / 100);
    }
  } catch (e) {
    log.warn(`Error aplicando opacidad guardada para ${capaNombre}:`, e);
  }
}

export function setLayerOpacity(capaNombre, opacity) {
  const layer = getLayer(capaNombre);
  if (!layer) return;

  // Capas glify: delegar al adaptador
  if (layer._isGlify) {
    layer.setOpacity(opacity);
    return;
  }

  // Capas L.geoJson: lógica estándar por tipo
  if (layer.setOptions && typeof layer.setOptions === 'function') {
    layer.setOptions({ opacity: opacity });
  }
  else if (layer._isCluster === true) {
    layer.eachLayer(subLayer => {
      if (subLayer.eachLayer) {
        subLayer.eachLayer(marker => {
          if (marker.setOpacity) marker.setOpacity(opacity);
          else if (marker.setStyle) marker.setStyle({ fillOpacity: opacity, opacity: opacity });
        });
      } else if (subLayer.setOpacity) subLayer.setOpacity(opacity);
      else if (subLayer.setStyle) subLayer.setStyle({ fillOpacity: opacity, opacity: opacity });
    });
  }
  else if (layer.setStyle) {
    layer.setStyle({ fillOpacity: opacity, opacity: opacity });
    layer.eachLayer(subLayer => {
      if (subLayer.setOpacity) subLayer.setOpacity(opacity);
      else if (subLayer.setStyle) subLayer.setStyle({ fillOpacity: opacity, opacity: opacity });
    });
  } else if (layer.setOpacity) {
    layer.setOpacity(opacity);
  }
}