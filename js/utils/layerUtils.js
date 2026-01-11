/**

 * Utilidades para manejo de capas del mapa
 * @module utils/layerUtils
 */

import {
  getEstiloCapa,
  getPointStyle,
  addLabelsToLayer,
} from "./styleUtils.js";
import { bindPopup } from "./popupUtils.js";
// transformCoordinates movido a Web Worker

import wmsConfig from "../config/wms_services.js";
import { PATHS, MAP_CONFIG } from "../config/constants.js";
import { appState, addLayer, getLayer, markLayerAsLoaded, isLayerLoaded, removeLayer, updateLayerOrder, clearAllLayers } from "../store/appState.js";
import { logger, createContextLogger } from "./logger.js";
import { LayerLoadError, NetworkError, handleError } from "./errorHandler.js";

// Renderer compartido para evitar múltiples elementos canvas apilados que bloquean eventos
let sharedCanvasRenderer = null;

const log = createContextLogger('LayerUtils');

export function initializeLayerState(map) {
  appState.map = map;
}

/**
 * Carga capas GeoJSON al mapa.
 * @param {string} tema - El tema de las capas a cargar.
 * @param {object} temasConfig - El objeto de configuración de temas.
 */
export function cargarCapasGeoJSON(tema, temasConfig) {
  if (!temasConfig[tema] || !temasConfig[tema].capas) {
    console.warn(`Tema '${tema}' no tiene capas definidas.`);
    return;
  }

  const estiloTema = temasConfig[tema].estilo || {};

  temasConfig[tema].capas.forEach((capaNombre) => {
    try {
      const configCapa = estiloTema[capaNombre];
      const esWMS =
        capaNombre.startsWith("wms_") ||
        (configCapa && configCapa.tipo === "wms");

      if (esWMS) {
        const servicioKey =
          configCapa?.servicio || capaNombre.replace("wms_", "");
        if (!wmsConfig.servicios[servicioKey]) {
          console.warn(`Servicio WMS '${servicioKey}' no encontrado`);
          return;
        }

        if (isLayerLoaded(capaNombre)) { // Use appState.isLayerLoaded
          mostrarCapa(capaNombre);
        } else {
          const wmsLayer = cargarCapaWMS(servicioKey);
          if (wmsLayer) {
            // layerState.capasPorNombre[capaNombre] = wmsLayer; // Managed by addLayer
            // if (!layerState.capasOrdenadas.includes(capaNombre)) { // Managed by addLayer
            //   layerState.capasOrdenadas.push(capaNombre);
            // }
            addLayer(capaNombre, wmsLayer); // Add layer to appState
            markLayerAsLoaded(capaNombre); // Mark as loaded
          }
        }
        return;
      }

      cargarCapaIndividual(capaNombre, tema, temasConfig);
    } catch (err) {
      console.warn(`Error cargando capa '${capaNombre}':`, err);
    }
  });
}

/**
 * Obtiene los datos GeoJSON de una capa sin cargarla al mapa.
 * @param {string} capaNombre 
 * @param {object} configCapa 
 * @returns {Promise<object>} Datos GeoJSON
 */
export async function fetchLayerData(capaNombre, configCapa) {
  // Determinar la URL del GeoJSON
  // Soporte para rutas absolutas o relativas
  let url = configCapa.url.startsWith("http")
    ? configCapa.url
    : `${PATHS.GEOJSON_BASE}${configCapa.url}`;

  // USAR UN WORKER para fetch y procesamiento pesado (coordenadas, etc.)
  const workerUrl = new URL(
    "../workers/layerProcessor.worker.js",
    import.meta.url
  );
  const worker = new Worker(workerUrl);

  // Prometificamos el worker para usar await
  return new Promise((resolve, reject) => {
    worker.onmessage = (e) => {
      const { type, data, error } = e.data;
      if (type === 'SUCCESS') {
        resolve(data);
      } else if (type === 'ERROR') {
        reject(new Error(error));
      }
      worker.terminate(); // Limpiar worker después de uso
    };

    worker.onerror = (err) => {
      reject(new Error(`Worker Error: ${err.message}`));
      worker.terminate();
    };

    worker.postMessage({ type: 'FETCH_AND_PROCESS', url });
  });
}

/**
 * Carga una capa GeoJSON individual al mapa.
 * CORREGIDO: Ahora es async y retorna una promesa para permitir await
 * @param {string} capaNombre - El nombre de la capa a cargar.
 * @param {string} temaKey - El tema de la capa.
 * @param {object} temasConfig - El objeto de configuración de temas.
 * @returns {Promise}
 */
export async function cargarCapaIndividual(
  capaNombre,
  temaKey,
  temasConfig,
  isInitialLoad = false
) {
  try {
    const configCapa = temasConfig[temaKey].estilo[capaNombre];
    if (!configCapa) {
      throw new Error(
        `Configuración de estilo no encontrada para la capa: ${capaNombre}`
      );
    }

    log.debug(
      `[LayerUtils] Iniciando carga de capa: ${capaNombre} (tema: ${temaKey})`
    );
    appState.layers.loading.add(capaNombre);

    // Verificar si la capa ya está cargada
    if (isLayerLoaded(capaNombre)) {
      log.debug(`Capa ${capaNombre} ya cargada, mostrando...`);
      mostrarCapa(capaNombre);
      return;
    }

    const data = await fetchLayerData(capaNombre, configCapa);

    // data = transformCoordinates(data); // Ya procesado en el worker

    // Inicializar renderer compartido si es necesario y preferimos canvas
    if (MAP_CONFIG.PREFER_CANVAS && !sharedCanvasRenderer) {
      sharedCanvasRenderer = L.canvas({ padding: 0.5 });
    }

    const options = {
      // Usar el renderer compartido para que todas las capas vivan en el mismo elemento <canvas>
      // Esto permite que Leaflet gestione los eventos correctamente entre features
      renderer: MAP_CONFIG.PREFER_CANVAS ? sharedCanvasRenderer : undefined,
      onEachFeature: function (feature, layer) {
        // En Canvas, los eventos deben adjuntarse a la capa individual
        // bindPopup maneja internamente la lógica para adjuntar el popup correctamente
        bindPopup(feature, layer, configCapa);

        // Propiedades auxiliares
        layer.feature = feature; // Asegurar referencia circular útil
        layer.options.layerName = capaNombre;

        if (configCapa.etiquetas && configCapa.etiquetas.campo) {
          addLabelsToLayer(layer, feature, configCapa.etiquetas);
        }
      },
    };

    if (configCapa.type === "point") {
      options.pointToLayer = function (feature, latlng) {
        const marker = L.marker(latlng, getPointStyle(feature, configCapa));
        if (configCapa.etiquetas && configCapa.etiquetas.campo) {
          addLabelsToLayer(marker, feature, configCapa.etiquetas);
        }
        return marker;
      };
    } else {
      options.style = (feature) => getEstiloCapa(feature, configCapa);
    }

    const geojsonLayer = L.geoJson(data, options);

    geojsonLayer.addTo(appState.map);
    addLayer(capaNombre, geojsonLayer);
    markLayerAsLoaded(capaNombre);

    log.log(`Capa ${capaNombre} cargada exitosamente`);
  } catch (error) {
    const layerError = new LayerLoadError(capaNombre, error);
    handleError(layerError, 'LayerUtils.cargarCapaIndividual', false); // No mostrar al usuario
    throw layerError; // Re-lanzar para que el caller pueda manejarlo
  }
}

/**
 * Mueve una capa a una nueva posición en el orden de apilamiento.
 * @param {string} capaNombre - El nombre de la capa a mover.
 * @param {number} nuevaPosicion - La nueva posición de la capa (índice).
 */
export function moverCapa(capaNombre, nuevaPosicion) {
  const capa = getLayer(capaNombre);
  if (!capa) {
    log.warn(`Capa '${capaNombre}' no encontrada para mover.`);
    return;
  }

  if (appState.map.hasLayer(capa)) {
    appState.map.removeLayer(capa);
  }

  updateLayerOrder(capaNombre, nuevaPosicion);
  capa.addTo(appState.map);
  actualizarOrdenCapas();
}

export function mostrarCapa(capaNombre) {
  const layer = getLayer(capaNombre);
  if (layer && appState.map) {
    if (!appState.map.hasLayer(layer)) {
      layer.addTo(appState.map);
      log.debug(`Capa ${capaNombre} mostrada`);
    }
  } else {
    log.warn(`No se puede mostrar la capa ${capaNombre}: capa no encontrada`);
  }
}

export function ocultarCapa(capaNombre) {
  const capa = getLayer(capaNombre);
  if (!capa) return;

  if (appState.map.hasLayer(capa)) {
    appState.map.removeLayer(capa);
  }
}

export function limpiarCapasDeDimension(capasArray) {
  if (!Array.isArray(capasArray)) return;

  capasArray.forEach((capaNombre) => {
    const capa = getLayer(capaNombre);
    if (capa && appState.map.hasLayer(capa)) {
      appState.map.removeLayer(capa);
      // Actualizar estado en checkboxes
      const mainChk = document.getElementById(`capa-${capaNombre}`);
      const mobileChk = document.getElementById(`capa-mobile-${capaNombre}`);
      if (mainChk) mainChk.checked = false;
      if (mobileChk) mobileChk.checked = false;
    }
  });
}

/**
 * Actualiza el orden de las capas en el mapa según el orden del array `capasOrdenadas`.
 */
export function actualizarOrdenCapas() {
  appState.layers.ordered.forEach((nombreCapa) => {
    const capa = getLayer(nombreCapa);
    if (capa) {
      capa.bringToFront();
    }
  });
}

/**
 * Limpia todas las capas del mapa excepto la capa base.
 * @param {L.TileLayer} capaBaseActual - La capa base actual.
 */
export function limpiarMapa(capaBaseActual) {
  log.debug("Limpiando todas las capas del mapa...");

  if (!appState.map) {
    log.warn("No hay mapa inicializado para limpiar");
    return;
  }

  appState.map.eachLayer((layer) => {
    if (layer !== capaBaseActual) {
      appState.map.removeLayer(layer);
    }
  });

  // Limpiar estado
  clearAllLayers();

  log.log("Mapa limpiado exitosamente");
}

/**
 * Carga una capa WMS al mapa y la integra al sistema de capas.
 * @param {string} servicioKey - Clave del servicio en wmsConfig.servicios.
 * @param {object} [opcionesExtra] - Opciones adicionales para L.tileLayer.wms.
 * @returns {L.TileLayer.WMS|null}
 */
export function cargarCapaWMS(servicioKey, opcionesExtra = {}) {
  const config = wmsConfig.servicios[servicioKey];
  if (!config) {
    console.warn(
      `Servicio WMS '${servicioKey}' no encontrado en la configuración`
    );
    return null;
  }
  const map = appState.map;
  if (!map) {
    console.warn("cargarCapaWMS: mapa no inicializado.");
    return null;
  }

  // Crear capa WMS
  const wmsLayer = L.tileLayer.wms(config.url, {
    layers: config.layers,
    styles: config.styles || "",
    format: config.format || "image/png",
    transparent: config.transparent !== false,
    version: config.version || "1.3.0",
    attribution: config.attribution || "",
    opacity: config.opacity || 1.0,
    ...opcionesExtra,
  });

  // Modificar esta parte para mantener coherencia con el nombre wms_
  const nombreCapa = `wms_${servicioKey}`;
  wmsLayer.options.layerName = nombreCapa; // Usar el nombre con prefijo
  wmsLayer.options.isWMS = true;
  wmsLayer._wmsConfig = config;

  // Agregar al mapa y al estado con el nombre correcto
  wmsLayer.addTo(map);
  addLayer(nombreCapa, wmsLayer);
  markLayerAsLoaded(nombreCapa);

  // Activar GetFeatureInfo para esta capa
  enableWMSGetFeatureInfo(servicioKey, wmsLayer, config);


  return wmsLayer;
}

export function enableWMSGetFeatureInfo(servicioKey, wmsLayer, config = {}) {
  const map = appState.map;
  if (!map || !wmsLayer) return;

  const handler = async (e) => {
    try {
      const infoFormat = config.info_format || "application/json";
      let url = null;

      // Preferir método provisto por la capa si existe
      if (typeof wmsLayer.getFeatureInfoUrl === "function") {
        url = wmsLayer.getFeatureInfoUrl(e.latlng, {
          info_format: infoFormat,
          query_layers: wmsLayer.wmsParams?.layers || config.layers,
          feature_count: 10,
        });
      } else {
        // Construir GetFeatureInfo manualmente (soporta WMS 1.1.1 y 1.3.0)
        const version = config.version || "1.3.0";
        const layers = config.layers;
        const query_layers = config.layers;
        const bounds = map.getBounds();
        const size = map.getSize();
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();

        // Determinar CRS/SRS
        const crsCode =
          (map.options.crs && map.options.crs.code) || "EPSG:3857";

        // Construir bbox en las unidades del CRS (proyectando si es necesario)
        let bboxValue;
        // Si el CRS es geográfico EPSG:4326 y WMS 1.3.0 requiere axis order lat,lon
        if (
          version.startsWith("1.3") &&
          crsCode.toUpperCase() === "EPSG:4326"
        ) {
          // axis order lat,min,lon,min,lat,max,lon,max -> yMin,xMin,yMax,xMax (lat,lon)
          bboxValue = `${sw.lat},${sw.lng},${ne.lat},${ne.lng}`;
        } else if (
          crsCode.toUpperCase() === "EPSG:3857" ||
          crsCode.toUpperCase() === "EPSG:102100" ||
          crsCode.toUpperCase() === "EPSG:900913"
        ) {
          // proyectar a metros usando el CRS del mapa
          const swP = map.options.crs.project(L.latLng(sw.lat, sw.lng));
          const neP = map.options.crs.project(L.latLng(ne.lat, ne.lng));
          bboxValue = `${swP.x},${swP.y},${neP.x},${neP.y}`;
        } else {
          // fallback: usar lon/lat (la mayoría de servidores aceptan esto para SRS en 1.1.1)
          bboxValue = `${sw.lng},${sw.lat},${ne.lng},${ne.lat}`;
        }

        const point = map.latLngToContainerPoint(e.latlng, map.getZoom());
        const params = {
          service: "WMS",
          request: "GetFeatureInfo",
          version,
          layers,
          query_layers,
          info_format: infoFormat,
          feature_count: 10,
          bbox: bboxValue,
          width: size.x,
          height: size.y,
        };

        // Para WMS 1.3.0 usar CRS en lugar de SRS
        if (version.startsWith("1.3")) {
          params.crs = crsCode;
          params.i = Math.floor(point.x);
          params.j = Math.floor(point.y);
        } else {
          params.srs = crsCode;
          params.x = Math.floor(point.x);
          params.y = Math.floor(point.y);
        }

        url = `${config.url}?${new URLSearchParams(params).toString()}`;
      }

      if (!url) return;

      // Mostrar URL para depuración
      console.debug("GetFeatureInfo URL:", url);

      const proxyBase = wmsConfig.proxyServer || config.proxyServer;
      const fetchUrl = proxyBase
        ? `${proxyBase}?url=${encodeURIComponent(url)}`
        : url;

      // Mostrar URL final (proxy o directo)
      console.debug("Fetch URL (GetFeatureInfo):", fetchUrl);

      const resp = await fetch(fetchUrl);
      // Si el servidor no permite CORS y NO hay proxy activo, fetch fallará aquí con NetworkError.
      const contentType = (
        resp.headers.get("content-type") || ""
      ).toLowerCase();
      const resultText = await resp.text();

      let popupContent = "No se encontraron objetos.";

      if (contentType.includes("json") || infoFormat.includes("json")) {
        try {
          const result = JSON.parse(resultText);
          if (result && result.features && result.features.length > 0) {
            popupContent = formatPropertiesForPopup(
              result.features[0].properties || {},
              config
            );
          } else {
            popupContent = "Sin atributos en la respuesta JSON.";
          }
        } catch (err) {
          popupContent = escapeHtml(resultText);
        }
      } else if (contentType.includes("html")) {
        const props = parseHTMLAttributes(resultText);
        popupContent = props
          ? formatPropertiesForPopup(props, config)
          : resultText;
      } else if (
        contentType.includes("xml") ||
        resultText.trim().startsWith("<")
      ) {
        const props = parseXMLAttributes(resultText);
        popupContent =
          props && Object.keys(props).length > 0
            ? formatPropertiesForPopup(props, config)
            : `<pre style="max-width:600px;white-space:pre-wrap;word-break:break-word">${escapeHtml(
              resultText
            )}</pre>`;
      } else {
        popupContent = resultText || popupContent;
      }

      L.popup({ maxWidth: 600 })
        .setLatLng(e.latlng)
        .setContent(popupContent)
        .openOn(map);
    } catch (err) {
      console.error("Error en GetFeatureInfo:", err);
      // Si es NetworkError por CORS, sugerir usar proxy
      if (err && err.message && err.message.includes("NetworkError")) {
        console.warn(
          "GetFeatureInfo falló por CORS. Usa un proxy (wmsConfig.proxyServer) o habilita CORS en el servidor WMS."
        );
      }
    }
  };

  wmsLayer.options._wmsClickHandler = handler;
  map.on("click", handler);
}

export function disableWMSGetFeatureInfo(wmsLayer) {
  const map = appState.map;
  if (!map || !wmsLayer || !wmsLayer.options) return;
  const handler = wmsLayer.options._wmsClickHandler;
  if (handler) {
    map.off("click", handler);
    delete wmsLayer.options._wmsClickHandler;
  }
}

// Parser HTML -> { key: value }
function parseHTMLAttributes(htmlString) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, "text/html");

    // Tabla <table>
    const table = doc.querySelector("table");
    if (table) {
      const props = {};
      table.querySelectorAll("tr").forEach((tr) => {
        const cells = tr.querySelectorAll("td, th");
        if (cells.length >= 2) {
          const key = cells[0].textContent.trim();
          const val = cells[1].textContent.trim();
          if (key) props[key] = val;
        }
      });
      if (Object.keys(props).length) return props;
    }

    // <dl>
    const dl = doc.querySelector("dl");
    if (dl) {
      const props = {};
      dl.querySelectorAll("dt").forEach((dt) => {
        const dd = dt.nextElementSibling;
        if (dd && dd.tagName.toLowerCase() === "dd") {
          props[dt.textContent.trim()] = dd.textContent.trim();
        }
      });
      if (Object.keys(props).length) return props;
    }

    // <pre> con pares
    const pre = doc.querySelector("pre");
    if (pre) {
      const lines = pre.textContent.split("\n");
      const props = {};
      lines.forEach((ln) => {
        const sep = ln.includes(":") ? ":" : ln.includes("=") ? "=" : null;
        if (sep) {
          const parts = ln.split(sep);
          const key = parts.shift().trim();
          const val = parts.join(sep).trim();
          if (key) props[key] = val;
        }
      });
      if (Object.keys(props).length) return props;
    }

    return null;
  } catch (err) {
    console.warn("parseHTMLAttributes error:", err);
    return null;
  }
}

// Parser XML/GML -> { key: value }
function parseXMLAttributes(xmlString) {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "application/xml");
    const allElems = xmlDoc.getElementsByTagName("*");

    for (let i = 0; i < allElems.length; i++) {
      const el = allElems[i];
      const name = el.localName
        ? el.localName.toLowerCase()
        : el.nodeName.toLowerCase();
      if (name.includes("featuremember") || name.includes("feature")) {
        const candidate = el.querySelector("*") || el;
        const propParent = candidate.childElementCount ? candidate : el;
        const props = {};
        for (let j = 0; j < propParent.children.length; j++) {
          const child = propParent.children[j];
          const key = child.localName || child.nodeName;
          const kl = String(key).toLowerCase();
          if (
            kl.includes("geom") ||
            kl.includes("boundedby") ||
            kl.includes("poslist") ||
            kl.includes("the_geom")
          )
            continue;
          props[key] = child.textContent.trim();
        }
        if (Object.keys(props).length) return props;
      }
    }

    // Fallback: primer elemento con varios hijos
    for (let i = 0; i < allElems.length; i++) {
      const el = allElems[i];
      if (el.childElementCount > 1) {
        const props = {};
        for (let j = 0; j < el.children.length; j++) {
          const child = el.children[j];
          const key = child.localName || child.nodeName;
          const kl = String(key).toLowerCase();
          if (
            kl.includes("gml") ||
            kl.includes("geom") ||
            kl.includes("boundedby")
          )
            continue;
          props[key] = child.textContent.trim();
        }
        if (Object.keys(props).length) return props;
      }
    }

    return {};
  } catch (err) {
    console.warn("parseXMLAttributes error:", err);
    return {};
  }
}

// Formatea propiedades para mostrar en popup (respeta popupCampos y alias)
function formatPropertiesForPopup(props = {}, config = {}) {
  const alias = config.alias || {};
  const orden = Array.isArray(config.popupCampos) ? config.popupCampos : null;
  let fields = orden
    ? orden.filter((f) => props.hasOwnProperty(f))
    : Object.keys(props);

  if (!fields || fields.length === 0) fields = Object.keys(props);
  if (fields.length === 0) return "Sin atributos.";

  const lines = fields.map((k) => {
    const label = alias[k] || k;
    const value = props[k] === null || props[k] === undefined ? "" : props[k];
    return `<b>${escapeHtml(label)}:</b> ${escapeHtml(String(value))}`;
  });

  return `<div class="wms-feature-popup">${lines.join("<br>")}</div>`;
}

// Escapa HTML básico
function escapeHtml(str) {
  return String(str).replace(/[&<>"'`=\/]/g, function (s) {
    return (
      {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
        "/": "&#x2F;",
        "`": "&#x60;",
        "=": "&#x3D;",
      }[s] || s
    );
  });
}
