/**
 * Utilidades relacionadas con la manipulación del mapa
 * @module utils/mapUtils
 */

import { MAP_CONFIG } from "../config/constants.js";

/**
 * Inicializa el mapa de Leaflet
 * @param {string} idElemento - El ID del elemento HTML donde se renderizará el mapa
 * @param {number[]} coordenadas - Array con [latitud, longitud] iniciales
 * @param {number} zoom - El nivel de zoom inicial
 * @returns {L.Map} La instancia del mapa de Leaflet
 * 
 * @example
 * const map = initMap('map', [-27.4539, -70.0727], 7);
 */
export function initMap(idElemento, coordenadas, zoom) {
    // Detectar si estamos en desktop o mobile
    const isDesktop = window.innerWidth >= 769;

    // Configurar opciones del mapa
    const mapOptions = {
        zoomControl: false
    };

    const map = L.map(idElemento, mapOptions).setView(coordenadas, zoom);

    // Agregar control de zoom personalizado con posición ajustada para desktop
    if (isDesktop) {
        L.control.zoom({
            position: 'topleft'
        }).addTo(map);

        // Ajustar padding del mapa para desktop
        setTimeout(() => {
            const navbar = document.querySelector('.navbar.fixed-top');
            const navHeight = navbar ? navbar.getBoundingClientRect().height : 60;
            map.invalidateSize();
        }, 100);
    } else {
        // En mobile, agregar control normal
        L.control.zoom({
            position: 'topleft'
        }).addTo(map);
    }

    return map;
}

/**
 * Establece la capa base del mapa
 * @param {L.Map} map - La instancia del mapa de Leaflet
 * @param {L.TileLayer} capa - La capa de Leaflet a usar como capa base
 * @returns {L.TileLayer} La capa base establecida
 */
export function setBaseLayer(map, capa) {
    capa.addTo(map);
    return capa;
}

/**
 * Cambia la capa base del mapa
 * @param {L.Map} map - La instancia del mapa de Leaflet
 * @param {L.TileLayer} nuevaCapa - La nueva capa base
 * @param {L.TileLayer} capaActual - La capa base actual
 */
export function changeBaseLayer(map, nuevaCapa, capaActual) {
    map.removeLayer(capaActual);
    nuevaCapa.addTo(map);
}

/**
 * Transforma coordenadas de EPSG:3857 a EPSG:4326 si es necesario
 * Esto es crucial para GeoJSONs que vienen en 3857 y Leaflet espera 4326
 * @param {Object} data - Los datos GeoJSON
 * @returns {Object} Los datos GeoJSON transformados
 */
export function transformCoordinates(data) {
    const crs = data.crs && data.crs.properties && data.crs.properties.name;
    if (crs === 'urn:ogc:def:crs:EPSG::3857' || crs === 'EPSG:3857') {
        const transformedFeatures = data.features.map(feature => {
            if (feature.geometry.type === 'Point') {
                const latlng = L.Projection.SphericalMercator.unproject(L.point(feature.geometry.coordinates));
                feature.geometry.coordinates = [latlng.lng, latlng.lat];
            } else if (feature.geometry.type === 'LineString' || feature.geometry.type === 'MultiLineString') {
                feature.geometry.coordinates = feature.geometry.coordinates.map(coords => {
                    const latlng = L.Projection.SphericalMercator.unproject(L.point(coords));
                    return [latlng.lng, latlng.lat];
                });
            } else if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
                feature.geometry.coordinates = feature.geometry.coordinates.map(ring => {
                    return ring.map(coords => {
                        const latlng = L.Projection.SphericalMercator.unproject(L.point(coords));
                        return [latlng.lng, latlng.lat];
                    });
                });
            }
            return feature;
        });
        return {
            ...data,
            features: transformedFeatures,
            crs: { type: "name", properties: { name: "urn:ogc:def:crs:EPSG::4326" } }
        };
    }
    return data;
}

/**
 * Obtiene el centro del mapa en coordenadas EPSG:4326
 * @param {L.Map} map - La instancia del mapa de Leaflet
 * @returns {number[]} Array con [latitud, longitud] del centro del mapa
 */
export function obtenerCentroMapa(map) {
    const center = map.getCenter();
    return [center.lat, center.lng];
}

/**
 * Actualiza el centro del mapa
 * @param {L.Map} map - La instancia del mapa de Leaflet
 * @param {number[]} coordenadas - Array con [latitud, longitud] del nuevo centro
 * @param {number} zoom - El nivel de zoom para establecer después de cambiar el centro
 */
export function actualizarCentroMapa(map, coordenadas, zoom) {
    map.setView(coordenadas, zoom);
}