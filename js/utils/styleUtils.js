// Funciones para aplicar estilos a las capas.

/**
 * Obtiene el estilo de un punto para una característica GeoJSON.
 * @param {object} feature - La característica GeoJSON.
 * @param {object} configCapa - La configuración de estilo para la capa específica del tema.
 * @returns {object} Un objeto de estilo de Leaflet para puntos.
 */
export function getPointStyle(feature, configCapa) {
  if (!feature || !feature.geometry || !feature.geometry.type) {
    console.warn("Feature inválido o sin geometría en getPointStyle");
    return {};
  }

  if (
    feature.geometry.type !== "Point" &&
    feature.geometry.type !== "MultiPoint"
  ) {
    console.warn(
      "getPointStyle solo es aplicable a geometrías Point o MultiPoint"
    );
    return {};
  }

  const atributoValor = configCapa.atributo
    ? feature.properties[configCapa.atributo]
    : null;

  let iconUrl = configCapa.estiloAlternativo?.iconUrl;

  if (configCapa.iconos && atributoValor && configCapa.iconos[atributoValor]) {
    iconUrl = `./assets/icons/${configCapa.iconos[atributoValor]}`;
  } else {
    if (configCapa.estiloAlternativo && configCapa.estiloAlternativo.iconUrl) {
      iconUrl = `./assets/icons/${configCapa.estiloAlternativo.iconUrl}`;
    }
  }

  if (iconUrl) {
    return {
      icon: L.icon({
        iconUrl: iconUrl,
        iconSize: configCapa.estiloAlternativo?.iconSize || [25, 25],
        iconAnchor: configCapa.estiloAlternativo?.iconAnchor || [12, 25],
        popupAnchor: configCapa.estiloAlternativo?.popupAnchor || [0, -25],
      }),
    };
  } else {
    return {
      color: configCapa.estiloAlternativo?.color || "#333",
      fillColor: configCapa.estiloAlternativo?.fillColor || "#555",
      radius: configCapa.estiloAlternativo?.radius || 5,
      weight: configCapa.estiloAlternativo?.weight || 1,
      fillOpacity: configCapa.estiloAlternativo?.fillOpacity || 0.8,
    };
  }
}

/**
 * Obtiene el estilo para una característica GeoJSON (líneas y polígonos).
 * CORREGIDO: Ahora usa configCapa directamente en lugar de buscar en temaConfig
 * @param {object} feature - La característica GeoJSON.
 * @param {object} configCapa - La configuración de la capa específica.
 * @returns {object} Un objeto de estilo de Leaflet.
 */
export function getEstiloCapa(feature, configCapa) {
  if (!feature || !feature.geometry || !feature.geometry.type) {
    console.warn("Feature inválido o sin geometría en getEstiloCapa");
    return {};
  }

  if (!configCapa) {
    console.warn("Configuración de capa no encontrada.");
    return { color: "#333" };
  }

  const atributoValor = configCapa.atributo
    ? feature.properties[configCapa.atributo]
    : null;

  // Para líneas (LineString o MultiLineString)
  if (
    feature.geometry.type === "LineString" ||
    feature.geometry.type === "MultiLineString"
  ) {
    return {
      ...(configCapa.estiloBase || {}),
      color:
        configCapa.colores && atributoValor && configCapa.colores[atributoValor]
          ? configCapa.colores[atributoValor]
          : "#CCC",
    };
  }

  // Para polígonos (Polygon o MultiPolygon)
  if (
    feature.geometry.type === "Polygon" ||
    feature.geometry.type === "MultiPolygon"
  ) {
    const fillOpacity =
      configCapa.estiloBase && configCapa.estiloBase.fillOpacity !== undefined
        ? configCapa.estiloBase.fillOpacity
        : 0.7;

    return {
      ...(configCapa.estiloBase || {}),
      fillColor:
        configCapa.colores && atributoValor && configCapa.colores[atributoValor]
          ? configCapa.colores[atributoValor]
          : "#CCC",
      fillOpacity: fillOpacity,
      fill: fillOpacity > 0, // Si transparencia es 0, desactivar relleno para no bloquear clicks
      color: configCapa.estiloBase?.color || "#333",
      weight: configCapa.estiloBase?.weight || 1,
      opacity: configCapa.estiloBase?.opacity || 0.8,
      interactive: true,
    };
  }

  // Para puntos - se maneja con getPointStyle
  if (
    feature.geometry.type === "Point" ||
    feature.geometry.type === "MultiPoint"
  ) {
    return {};
  }

  return {};
}

/**
 * Genera el contenido HTML para un popup de Leaflet.
 * ACTUALIZADO: Incluye configuración global de estilos para título y contenido
 * @param {object} feature - La característica GeoJSON.
 * @param {object} configCapa - La configuración de estilo para la capa específica del tema.
 * @returns {string} El contenido HTML del popup.
 */
export function getPopupContent(feature, configCapa) {
  if (
    !feature ||
    !feature.properties ||
    !configCapa ||
    !configCapa.popupCampos
  ) {
    console.warn("Feature o configuración de capa inválida para el popup.");
    return '<div class="custom-popup">Información no disponible.</div>';
  }

  let content = '<div class="custom-popup">';

  // Añadir título si existe nombrePersonalizado
  if (configCapa.nombrePersonalizado) {
    content += `<h3 class="popup-title">${configCapa.nombrePersonalizado}</h3>`;
  }

  // Usar el alias para los nombres de los campos en el popup
  const alias = configCapa.alias || {};

  // Obtener claves reales del feature para búsqueda insensible a mayúsculas
  const featureKeys = Object.keys(feature.properties);

  configCapa.popupCampos.forEach((campo) => {
    let valor = feature.properties[campo];

    // Si no encuentra el valor exacto, intentar búsqueda insensible a mayúsculas
    if (valor === undefined) {
      const keyMatch = featureKeys.find(k => k.toLowerCase() === campo.toLowerCase());
      if (keyMatch) {
        valor = feature.properties[keyMatch];
      }
    }

    const nombreVisible = alias[campo] || campo;

    if (valor !== undefined && valor !== null && valor !== "") {
      // Convertir URLs en el texto a enlaces clicables
      const valorConEnlaces = convertirURLsAEnlaces(String(valor));
      content += `<p><strong>${nombreVisible}:</strong> ${valorConEnlaces}</p>`;
    }
  });

  content += "</div>";
  return content;
}

/**
 * Convierte URLs en texto a enlaces clicables.
 * @param {string} text - El texto que puede contener URLs.
 * @returns {string} El texto con URLs convertidas a enlaces HTML.
 */
function convertirURLsAEnlaces(text) {
  if (typeof text !== "string") {
    return text;
  }

  // Expresión regular para detectar URLs
  const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/gi;

  return text.replace(urlRegex, function (url) {
    const cleanUrl = url.replace(/[.,;:!?]$/, "");
    const punctuation = url.slice(cleanUrl.length);

    return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer">${cleanUrl}</a>${punctuation}`;
  });
}

/**
 * Configuración global para estilos de popup
 * Permite personalizar los tamaños de fuente globalmente
 */
export const POPUP_CONFIG = {
  // Tamaños de fuente (en px)
  titleFontSize: 12,
  contentFontSize: 10,
  labelFontSize: 10,

  // Tamaños para móvil
  mobile: {
    titleFontSize: 12,
    contentFontSize: 10,
    labelFontSize: 10,
  },

  // Tamaños para pantallas muy pequeñas
  small: {
    titleFontSize: 11,
    contentFontSize: 9,
    labelFontSize: 9,
  },
};

/**
 * Aplica estilos dinámicos al popup basado en la configuración
 * Esta función puede ser llamada para actualizar estilos globalmente
 */
export function applyGlobalPopupStyles() {
  let styleElement = document.getElementById("dynamic-popup-styles");
  if (!styleElement) {
    styleElement = document.createElement("style");
    styleElement.id = "dynamic-popup-styles";
    document.head.appendChild(styleElement);
  }

  const config = POPUP_CONFIG;

  styleElement.textContent = `
        .custom-popup {
            font-size: ${config.contentFontSize}px !important;
        }
        .custom-popup .popup-title {
            font-size: ${config.titleFontSize}px !important;
        }
        .custom-popup p {
            font-size: ${config.contentFontSize}px !important;
        }
        .custom-popup p strong {
            font-size: ${config.labelFontSize}px !important;
        }
        .custom-popup a {
            font-size: ${config.contentFontSize}px !important;
        }
        
        @media (max-width: 768px) {
            .custom-popup {
                font-size: ${config.mobile.contentFontSize}px !important;
            }
            .custom-popup .popup-title {
                font-size: ${config.mobile.titleFontSize}px !important;
            }
            .custom-popup p {
                font-size: ${config.mobile.contentFontSize}px !important;
            }
            .custom-popup p strong {
                font-size: ${config.mobile.labelFontSize}px !important;
            }
            .custom-popup a {
                font-size: ${config.mobile.contentFontSize}px !important;
            }
        }
        
        @media (max-width: 480px) {
            .custom-popup {
                font-size: ${config.small.contentFontSize}px !important;
            }
            .custom-popup .popup-title {
                font-size: ${config.small.titleFontSize}px !important;
            }
            .custom-popup p {
                font-size: ${config.small.contentFontSize}px !important;
            }
            .custom-popup p strong {
                font-size: ${config.small.labelFontSize}px !important;
            }
            .custom-popup a {
                font-size: ${config.small.contentFontSize}px !important;
            }
        }
    `;
}

/**
 * Añade etiquetas a una característica individual usando L.Tooltip.
 *
 * @param {L.Layer} layer - La capa de Leaflet (marker, polygon, etc.).
 * @param {object} feature - La característica GeoJSON.
 * @param {object} configEtiquetas - La configuración de etiquetas.
 *
 * @example
 * // Configuración simple
 * {
 *   campo: 'NOMBRE',
 *   permanent: true
 * }
 *
 * @example
 * // Configuración avanzada con estilos
 * {
 *   campo: 'NOMBRE',
 *   permanent: true,
 *   estilo: {
 *     color: '#003366',
 *     fontSize: '12px',
 *     fontFamily: 'Arial, sans-serif',
 *     fontWeight: 'bold',
 *     bufferColor: '#ffffff',
 *     bufferWidth: 2,
 *     offsetX: 0,
 *     offsetY: -10
 *   }
 * }
 */
export function addLabelsToLayer(layer, feature, configEtiquetas) {
  // ===== VALIDACIONES =====
  if (!configEtiquetas || !configEtiquetas.campo) {
    return;
  }

  if (!feature || !feature.properties) {
    console.warn("addLabelsToLayer: Feature o properties inválidos");
    return;
  }

  const labelText = feature.properties[configEtiquetas.campo];

  if (labelText === undefined || labelText === null || labelText === "") {
    return;
  }

  // ===== CONFIGURACIÓN DE ESTILOS =====
  const estilo = configEtiquetas.estilo || {};
  const {
    color = "#000000",
    fontSize = "9px",
    fontFamily = "Arial, sans-serif",
    fontWeight = "normal",
    bufferColor = "#ffffff",
    bufferWidth = 2,
    offsetX = 0,
    offsetY = 0,
  } = estilo;

  // ===== DETERMINAR POSICIÓN SEGÚN TIPO DE GEOMETRÍA =====
  let labelPosition = null;
  const geomType = feature.geometry?.type;

  try {
    if (geomType === "Polygon" || geomType === "MultiPolygon") {
      // Para polígonos, usar el centro geométrico
      if (layer.getCenter) {
        labelPosition = layer.getCenter();
      } else if (layer.getBounds) {
        labelPosition = layer.getBounds().getCenter();
      }
    } else if (geomType === "LineString" || geomType === "MultiLineString") {
      // Para líneas, usar el centro del bounding box
      if (layer.getBounds) {
        labelPosition = layer.getBounds().getCenter();
      }
    } else if (geomType === "Point" || geomType === "MultiPoint") {
      // Para puntos, usar la posición del punto
      if (layer.getLatLng) {
        labelPosition = layer.getLatLng();
      }
    } else {
      console.warn(
        "addLabelsToLayer: Tipo de geometría no soportado:",
        geomType
      );
      return;
    }
  } catch (error) {
    console.warn("addLabelsToLayer: Error al determinar posición:", error);
    return;
  }

  if (!labelPosition) {
    console.warn(
      "addLabelsToLayer: No se pudo determinar la posición de la etiqueta"
    );
    return;
  }

  // ===== CONFIGURAR OPCIONES DEL TOOLTIP =====
  const tooltipOptions = {
    permanent: configEtiquetas.permanent !== false, // true por defecto
    direction: "center", // Centrar la etiqueta sobre la geometría
    className: "custom-map-label", // Clase CSS personalizada
    offset: L.point(offsetX, offsetY),
    opacity: 1,
  };

  // ===== CREAR CONTENIDO DEL TOOLTIP =====
  let content = "";

  // Si hay buffer (contorno), crear estructura HTML con estilos inline
  if (bufferWidth > 0) {
    content = `<span class="label-with-stroke" style="
            color: ${color};
            font-size: ${fontSize};
            font-family: ${fontFamily};
            font-weight: ${fontWeight};
            -webkit-text-stroke: ${bufferWidth}px ${bufferColor};
            paint-order: stroke fill;
            text-shadow: 
                ${bufferWidth}px ${bufferWidth}px 0 ${bufferColor},
                -${bufferWidth}px -${bufferWidth}px 0 ${bufferColor},
                ${bufferWidth}px -${bufferWidth}px 0 ${bufferColor},
                -${bufferWidth}px ${bufferWidth}px 0 ${bufferColor},
                0 ${bufferWidth}px 0 ${bufferColor},
                0 -${bufferWidth}px 0 ${bufferColor},
                ${bufferWidth}px 0 0 ${bufferColor},
                -${bufferWidth}px 0 0 ${bufferColor};
            white-space: nowrap;
            display: inline-block;
        ">${labelText}</span>`;
  } else {
    // Sin buffer, crear span simple
    content = `<span style="
            color: ${color};
            font-size: ${fontSize};
            font-family: ${fontFamily};
            font-weight: ${fontWeight};
            white-space: nowrap;
            display: inline-block;
        ">${labelText}</span>`;
  }

  // ===== CREAR Y VINCULAR EL TOOLTIP =====
  const tooltip = L.tooltip(tooltipOptions);
  tooltip.setContent(content);
  layer.bindTooltip(tooltip);

  // Si es permanente, abrirlo inmediatamente
  if (tooltipOptions.permanent) {
    layer.openTooltip();
  }

  // ===== APLICAR ESTILOS ADICIONALES AL AGREGAR AL MAPA =====
  layer.on("add", function () {
    const tooltipElement = layer.getTooltip()?._container;

    if (tooltipElement) {
      // Asegurar que el tooltip sea visible y no interfiera con clicks
      tooltipElement.style.zIndex = "1000";
      tooltipElement.style.pointerEvents = "none";

      // Asegurar que no tenga fondo ni borde del tooltip por defecto
      tooltipElement.style.background = "transparent";
      tooltipElement.style.border = "none";
      tooltipElement.style.boxShadow = "none";
      tooltipElement.style.padding = "0";
    }
  });
}
