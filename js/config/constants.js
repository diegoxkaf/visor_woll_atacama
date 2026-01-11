/**
 * Constantes de configuración de la aplicación
 * @module config/constants
 */

/**
 * Configuración del mapa
 */
export const MAP_CONFIG = {
    /** Coordenadas del centro inicial del mapa [lat, lng] */
    DEFAULT_CENTER: [-27.4539, -70.0727],

    /** Nivel de zoom inicial */
    DEFAULT_ZOOM: 7,

    /** ID del contenedor del mapa */
    CONTAINER_ID: "map",

    /** Zoom mínimo permitido */
    MIN_ZOOM: 1,

    /** Zoom máximo permitido */
    MAX_ZOOM: 18,

    /** Preferir renderer Canvas para mejor rendimiento (features vectoriales) */
    PREFER_CANVAS: true,
};

/**
 * Configuración responsive
 */
export const RESPONSIVE = {
    /** Breakpoint para mobile (px) */
    MOBILE_BREAKPOINT: 769,

    /** Breakpoint para tablets (px) */
    TABLET_BREAKPOINT: 1024,
};

/**
 * Configuración de popups
 */
export const POPUP_CONFIG = {
    /** Tamaño de fuente del título (px) */
    TITLE_FONT_SIZE: 12,

    /** Tamaño de fuente del contenido (px) */
    CONTENT_FONT_SIZE: 10,

    /** Tamaño de fuente de labels (px) */
    LABEL_FONT_SIZE: 10,

    /** Ancho mínimo del popup (px) */
    MIN_WIDTH: 180,

    /** Ancho máximo del popup (px) */
    MAX_WIDTH: 300,

    /** Altura máxima del popup (px) */
    MAX_HEIGHT: 300,
};

/**
 * Configuración de etiquetas en el mapa
 */
export const LABEL_CONFIG = {
    /** Tamaño de fuente por defecto (px) */
    DEFAULT_FONT_SIZE: 9,

    /** Familia de fuente por defecto */
    DEFAULT_FONT_FAMILY: "Arial, sans-serif",

    /** Peso de fuente por defecto */
    DEFAULT_FONT_WEIGHT: "normal",

    /** Color de contorno por defecto */
    DEFAULT_BUFFER_COLOR: "#ffffff",

    /** Ancho de contorno por defecto (px) */
    DEFAULT_BUFFER_WIDTH: 2,

    /** Offset X por defecto (px) */
    DEFAULT_OFFSET_X: 0,

    /** Offset Y por defecto (px) */
    DEFAULT_OFFSET_Y: 0,
};

/**
 * Configuración de timeouts y delays
 */
export const TIMING = {
    /** Delay para actualizar sidebar después de cargar tema (ms) */
    SIDEBAR_UPDATE_DELAY: 100,

    /** Timeout para peticiones de red (ms) */
    NETWORK_TIMEOUT: 30000,

    /** Delay para debounce en resize (ms) */
    RESIZE_DEBOUNCE: 120,
};

/**
 * Configuración de rutas
 */
export const PATHS = {
    /** Ruta base para archivos GeoJSON */
    // Ajustado para ser relativo a la ubicación del Worker (js/workers/)
    GEOJSON_BASE: "../../geojson/",

    /** Ruta base para iconos */
    ICONS_BASE: "./assets/icons/",

    /** Ruta base para imágenes */
    IMAGES_BASE: "./assets/img/",
};

/**
 * IDs de elementos del DOM
 */
export const DOM_IDS = {
    // Sidebars
    LEFT_SIDEBAR: "leftSidebar",
    RIGHT_SIDEBAR: "rightSidebar",

    // Contenedores de capas
    SIDEBAR_LAYERS: "sidebar-layers",
    SIDEBAR_LAYERS_MOBILE: "sidebar-layers-mobile",
    SIDEBAR_BASE_LAYERS: "sidebar-base-layers",
    SIDEBAR_BASE_LAYERS_MOBILE: "sidebar-base-layers-mobile",

    // Leyenda
    SIDEBAR_LEGEND: "sidebar-legend",

    // Botones
    TOGGLE_LEFT_SIDEBAR: "toggleLeftSidebarBtn",
    TOGGLE_RIGHT_SIDEBAR: "toggleRightSidebarBtn",
    CLOSE_LEFT_SIDEBAR: "closeLeftSidebarBtn",
    CLOSE_RIGHT_SIDEBAR: "closeRightSidebarBtn",
};

/**
 * Clases CSS
 */
export const CSS_CLASSES = {
    // Estados
    OPEN: "open",
    ACTIVE: "active",
    COLLAPSED: "collapsed",

    // Componentes
    DIMENSION_GROUP: "dimension-group",
    DIMENSION_ACTIVE: "dimension-active",
    LAYER_ITEM: "layer-item",

    // Utilidades
    D_NONE: "d-none",
    MB_3: "mb-3",
};

/**
 * Tema por defecto
 */
export const DEFAULT_THEME = "agua";

/**
 * Configuración de logging
 */
export const LOG_CONFIG = {
    /** Habilitar logs de debug */
    ENABLE_DEBUG: true,

    /** Habilitar logs en producción */
    ENABLE_PRODUCTION_LOGS: false,
};
