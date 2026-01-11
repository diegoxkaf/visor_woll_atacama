export const MAP_CONFIG = {
    DEFAULT_CENTER: [-27.4539, -70.0727],
    DEFAULT_ZOOM: 7,
    CONTAINER_ID: "map",
    MIN_ZOOM: 1,
    MAX_ZOOM: 18,
    PREFER_CANVAS: true,
};

export const RESPONSIVE = {
    MOBILE_BREAKPOINT: 769,
    TABLET_BREAKPOINT: 1024,
};

export const POPUP_CONFIG = {
    TITLE_FONT_SIZE: 12,
    CONTENT_FONT_SIZE: 10,
    LABEL_FONT_SIZE: 10,
    MIN_WIDTH: 180,
    MAX_WIDTH: 300,
    MAX_HEIGHT: 300,
};

export const LABEL_CONFIG = {
    DEFAULT_FONT_SIZE: 9,
    DEFAULT_FONT_FAMILY: "Arial, sans-serif",
    DEFAULT_FONT_WEIGHT: "normal",
    DEFAULT_BUFFER_COLOR: "#ffffff",
    DEFAULT_BUFFER_WIDTH: 2,
    DEFAULT_OFFSET_X: 0,
    DEFAULT_OFFSET_Y: 0,
};

export const TIMING = {
    SIDEBAR_UPDATE_DELAY: 100,
    NETWORK_TIMEOUT: 30000,
    RESIZE_DEBOUNCE: 120,
};

export const PATHS = {
    GEOJSON_BASE: "../../geojson/",
    ICONS_BASE: "./assets/icons/",
    IMAGES_BASE: "./assets/img/",
};

export const DOM_IDS = {
    LEFT_SIDEBAR: "leftSidebar",
    RIGHT_SIDEBAR: "rightSidebar",
    SIDEBAR_LAYERS: "sidebar-layers",
    SIDEBAR_LAYERS_MOBILE: "sidebar-layers-mobile",
    SIDEBAR_BASE_LAYERS: "sidebar-base-layers",
    SIDEBAR_BASE_LAYERS_MOBILE: "sidebar-base-layers-mobile",
    SIDEBAR_LEGEND: "sidebar-legend",
    TOGGLE_LEFT_SIDEBAR: "toggleLeftSidebarBtn",
    TOGGLE_RIGHT_SIDEBAR: "toggleRightSidebarBtn",
    CLOSE_LEFT_SIDEBAR: "closeLeftSidebarBtn",
    CLOSE_RIGHT_SIDEBAR: "closeRightSidebarBtn",
};

export const CSS_CLASSES = {
    OPEN: "open",
    ACTIVE: "active",
    COLLAPSED: "collapsed",
    DIMENSION_GROUP: "dimension-group",
    DIMENSION_ACTIVE: "dimension-active",
    LAYER_ITEM: "layer-item",
    D_NONE: "d-none",
    MB_3: "mb-3",
};

export const DEFAULT_THEME = "agua";

export const LOG_CONFIG = {
    ENABLE_DEBUG: true,
    ENABLE_PRODUCTION_LOGS: false,
};
