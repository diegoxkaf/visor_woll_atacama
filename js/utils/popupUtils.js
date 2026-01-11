// Funciones para generar y mostrar popups.

import { getPopupContent } from './styleUtils.js';

/**
 * Genera y vincula popups a las capas.
 * @param {object} feature - La característica GeoJSON.
 * @param {L.Layer} layer - La capa de Leaflet.
 * @param {object} configCapa - La configuración de la capa específica.
 */
export function bindPopup(feature, layer, configCapa) {
    if (configCapa && configCapa.popupCampos && configCapa.popupCampos.length > 0) {
        const content = getPopupContent(feature, configCapa);
        layer.bindPopup(content);
    }
}
