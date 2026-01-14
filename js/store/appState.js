/**
 * Estado global centralizado de la aplicación
 * Single Source of Truth para todo el estado
 * @module store/appState
 */


export const appState = {
    /** @type {L.Map|null} Instancia del mapa de Leaflet */
    map: null,

    /** @type {L.TileLayer|null} Capa base actual */
    currentBaseLayer: null,

    /** @type {string} Tema/dimensión actualmente activa */
    activeTemaName: "agua",

    /** Gestión de capas */
    layers: {
        /** @type {Map<string, L.Layer>} Capas por nombre */
        byName: new Map(),

        /** @type {Map<string, object>} Datos GeoJSON originales */
        geojsonData: new Map(),

        /** @type {Array<string>} Orden de apilamiento de capas */
        ordered: [],

        /** @type {Set<string>} Capas ya cargadas */
        loaded: new Set(),

        /** @type {Set<string>} Capas siendo cargadas actualmente */
        loading: new Set(),
    },

    /** Estado de la UI */
    ui: {
        /** @type {string|null} Dimensión actualmente activa en el sidebar */
        activeDimension: null,

        /** @type {Map<string, Promise>} Operaciones pendientes */
        pendingOperations: new Map(),
    },
};

/**
 * Inicializa el estado del mapa
 * @param {L.Map} map - Instancia del mapa de Leaflet
 */
export function initializeMap(map) {
    appState.map = map;
}

/**
 * Establece la capa base actual
 * @param {L.TileLayer} baseLayer - Capa base
 */
export function setCurrentBaseLayer(baseLayer) {
    appState.currentBaseLayer = baseLayer;
}

/**
 * Establece el tema activo
 * @param {string} temaName - Nombre del tema
 */
export function setActiveTema(temaName) {
    appState.activeTemaName = temaName;
}

/**
 * Agrega una capa al estado
 * @param {string} name - Nombre de la capa
 * @param {L.Layer} layer - Capa de Leaflet
 */
export function addLayer(name, layer) {
    appState.layers.byName.set(name, layer);
    if (!appState.layers.ordered.includes(name)) {
        appState.layers.ordered.push(name);
    }
}

/**
 * Obtiene una capa por nombre
 * @param {string} name - Nombre de la capa
 * @returns {L.Layer|undefined} Capa de Leaflet
 */
export function getLayer(name) {
    return appState.layers.byName.get(name);
}

/**
 * Elimina una capa del estado
 * @param {string} name - Nombre de la capa
 */
export function removeLayer(name) {
    appState.layers.byName.delete(name);
    const index = appState.layers.ordered.indexOf(name);
    if (index > -1) {
        appState.layers.ordered.splice(index, 1);
    }
}

/**
 * Marca una capa como cargada
 * @param {string} name - Nombre de la capa
 */
export function markLayerAsLoaded(name) {
    appState.layers.loaded.add(name);
}

/**
 * Verifica si una capa está cargada
 * @param {string} name - Nombre de la capa
 * @returns {boolean} True si la capa está cargada
 */
export function isLayerLoaded(name) {
    return appState.layers.loaded.has(name);
}

/**
 * Limpia todas las capas del estado
 */
export function clearAllLayers() {
    appState.layers.byName.clear();
    appState.layers.ordered = [];
    appState.layers.loaded.clear();
}

/**
 * Establece la dimensión activa en la UI
 * @param {string|null} dimension - Nombre de la dimensión
 */
export function setActiveDimension(dimension) {
    appState.ui.activeDimension = dimension;
}


// Obtiene la dimensión activa
// @returns {string|null} Nombre de la dimensión activa

export function getActiveDimension() {
    return appState.ui.activeDimension;
}


// Actualiza el orden de una capa
// @param {string} name - Nombre de la capa
// @param {number} newPosition - Nueva posición

export function updateLayerOrder(name, newPosition) {
    const currentIndex = appState.layers.ordered.indexOf(name);
    if (currentIndex > -1) {
        appState.layers.ordered.splice(currentIndex, 1);
    }
    appState.layers.ordered.splice(newPosition, 0, name);
}

/**
 * Almacena los datos GeoJSON de una capa
 * @param {string} name - Nombre de la capa
 * @param {object} data - Datos GeoJSON
 */
export function setLayerData(name, data) {
    appState.layers.geojsonData.set(name, data);
}

/**
 * Obtiene los datos GeoJSON de una capa
 * @param {string} name - Nombre de la capa
 * @returns {object|undefined} Datos GeoJSON
 */
export function getLayerData(name) {
    return appState.layers.geojsonData.get(name);
}

if (typeof window !== "undefined") {
    window.appState = appState;
}
