/**
 * Utilidades para manejo de leyendas del mapa
 * @module utils/legendUtils
 */

import leyendaAliasesGlobales from "../config/leyendaAliases.js";
import { appState } from "../store/appState.js";
import { createContextLogger } from "./logger.js";

const log = createContextLogger('LegendUtils');

/**
 * Actualiza la leyenda en la sidebar.
 * @param {string} tema - El tema actual.
 * @param {object} temasConfig - El objeto de configuración de temas.
 */
export function actualizarLeyenda(tema, temasConfig) {
  const sidebarLegendContainer = document.getElementById("sidebar-legend");

  if (!sidebarLegendContainer) {
    log.warn("Contenedor de leyenda no encontrado");
    return;
  }

  // Limpiar leyenda anterior
  sidebarLegendContainer.innerHTML = "";

  // Validar que existe el tema
  if (!temasConfig || !temasConfig[tema]) {
    log.warn(`No se encontró configuración para el tema: ${tema}`);
    sidebarLegendContainer.innerHTML =
      '<p class="text-muted small">No hay leyenda disponible para este tema.</p>';
    return;
  }

  const temaConfig = temasConfig[tema];

  // Verificar si existe configuración de leyenda manual
  if (temaConfig.leyenda && Object.keys(temaConfig.leyenda).length > 0) {
    log.debug(`Generando leyenda manual para tema: ${tema}`);
    generarLeyendaManual(tema, temasConfig, sidebarLegendContainer);
    return;
  }

  // Generar leyenda automática con alias (local y global)
  log.debug(`Generando leyenda automática para tema: ${tema}`);
  generarLeyendaAutomatica(tema, temasConfig, sidebarLegendContainer);
}

/**
 * Genera leyenda desde configuración manual
 * @param {string} tema - El tema actual
 * @param {object} temasConfig - Configuración de temas
 * @param {HTMLElement} container - Contenedor donde insertar la leyenda
 */
function generarLeyendaManual(tema, temasConfig, container) {
  const temaConfig = temasConfig[tema];

  Object.entries(temaConfig.leyenda).forEach(([capa, config]) => {
    if (!config || !config.titulo || !config.items) {
      log.warn(`Configuración de leyenda inválida para capa: ${capa}`);
      return;
    }

    const sidebarLeyendaHTML = document.createElement("div");
    sidebarLeyendaHTML.classList.add("legend-container", "mb-3");

    const tituloLeyenda = document.createElement("h6");
    tituloLeyenda.classList.add("fw-bold", "text-primary", "mb-2");
    tituloLeyenda.textContent = config.titulo;
    sidebarLeyendaHTML.appendChild(tituloLeyenda);

    config.items.forEach((item) => {
      if (!item || !item.color || !item.label) {
        log.warn("Item de leyenda inválido:", item);
        return;
      }

      const itemLeyenda = crearItemLeyenda(item.color, item.label, item.icon);
      sidebarLeyendaHTML.appendChild(itemLeyenda);
    });

    container.appendChild(sidebarLeyendaHTML);
  });

  log.debug(`Leyenda manual actualizada para tema: ${tema}`);
}

/**
 * Genera una leyenda automática basada en la configuración de estilos con alias
 * Prioridad: leyendaAlias local > leyendaAliasesGlobales > valor original
 * @param {string} tema - El tema actual
 * @param {object} temasConfig - Configuración de temas
 * @param {HTMLElement} container - Contenedor donde insertar la leyenda
 */
function generarLeyendaAutomatica(tema, temasConfig, container) {
  const temaConfig = temasConfig[tema];

  if (!temaConfig.estilo) {
    container.innerHTML =
      '<p class="text-muted small">No hay información de leyenda disponible.</p>';
    return;
  }

  log.debug(`Generando leyenda automática para tema: ${tema}`);

  // Obtener solo las capas que están visibles en el mapa
  const capasVisibles = obtenerCapasVisibles(tema);
  log.debug('Capas visibles detectadas:', capasVisibles);

  if (capasVisibles.length === 0) {
    container.innerHTML =
      '<p class="text-muted small">No hay capas activas. Activa capas para ver su leyenda.</p>';
    return;
  }

  let tieneLeyendas = false;

  Object.entries(temaConfig.estilo).forEach(([capaNombre, capaConfig]) => {
    // Solo mostrar leyenda para capas visibles
    if (!capasVisibles.includes(capaNombre)) {
      return;
    }

    const legendContainer = document.createElement("div");
    legendContainer.classList.add("legend-container", "mb-3");

    // Título de la capa
    const titulo = document.createElement("h6");
    titulo.classList.add("fw-bold", "text-primary", "mb-2", "legend-title");
    titulo.textContent = capaConfig.nombrePersonalizado || capaNombre;
    legendContainer.appendChild(titulo);

    // Obtener alias de leyenda local si existe
    const leyendaAliasLocal = capaConfig.leyendaAlias || {};

    let itemsAgregados = 0;

    // Generar items de leyenda basados en colores definidos
    if (capaConfig.colores) {
      Object.entries(capaConfig.colores).forEach(([valor, color]) => {
        // Sistema de prioridad: local > global > original
        const labelTexto = obtenerLabelConAlias(
          valor,
          leyendaAliasLocal,
          leyendaAliasesGlobales
        );
        const itemLeyenda = crearItemLeyenda(color, labelTexto);
        legendContainer.appendChild(itemLeyenda);
        itemsAgregados++;
      });
    }
    // Generar items basados en iconos
    else if (capaConfig.iconos) {
      Object.entries(capaConfig.iconos).forEach(([valor, iconFile]) => {
        // Sistema de prioridad: local > global > original
        const labelTexto = obtenerLabelConAlias(
          valor,
          leyendaAliasLocal,
          leyendaAliasesGlobales
        );
        const itemLeyenda = crearItemLeyenda(null, labelTexto, iconFile);
        legendContainer.appendChild(itemLeyenda);
        itemsAgregados++;
      });
    }
    // Estilo alternativo genérico
    else if (capaConfig.estiloAlternativo) {
      const color =
        capaConfig.estiloAlternativo.fillColor ||
        capaConfig.estiloAlternativo.color ||
        "#555";
      const labelTexto = capaConfig.leyendaTexto || "Elementos de la capa";
      const itemLeyenda = crearItemLeyenda(color, labelTexto);
      legendContainer.appendChild(itemLeyenda);
      itemsAgregados++;
    }

    // Solo agregar si tiene contenido (más que solo el título)
    if (itemsAgregados > 0) {
      container.appendChild(legendContainer);
      tieneLeyendas = true;
    }
  });

  if (!tieneLeyendas) {
    container.innerHTML =
      '<p class="text-muted small">Las capas activas no tienen leyenda configurada.</p>';
  }
}

/**
 * Obtiene el label con sistema de prioridad de alias
 * @param {string} valorOriginal - Valor original del atributo
 * @param {object} aliasLocal - Alias locales de la capa
 * @param {object} aliasGlobal - Alias globales
 * @returns {string} Label final a mostrar
 */
function obtenerLabelConAlias(
  valorOriginal,
  aliasLocal = {},
  aliasGlobal = {}
) {
  if (aliasLocal[valorOriginal]) {
    return aliasLocal[valorOriginal];
  }

  if (aliasGlobal[valorOriginal]) {
    return aliasGlobal[valorOriginal];
  }

  return valorOriginal;
}

/**
 * Crea un item de leyenda (color o icono + texto)
 * @param {string|null} color - Color hexadecimal
 * @param {string} label - Texto del label
 * @param {string|null} iconFile - Nombre del archivo de icono (opcional)
 * @returns {HTMLElement} Elemento div del item de leyenda
 */
function crearItemLeyenda(color, label, iconFile = null) {
  const itemLeyenda = document.createElement("div");
  itemLeyenda.classList.add(
    "legend-item",
    "d-flex",
    "align-items-center",
    "mb-1"
  );

  if (iconFile) {
    // Crear elemento de icono
    const iconBox = document.createElement("div");
    iconBox.classList.add("legend-icon", "me-2");
    iconBox.style.width = "18px";
    iconBox.style.height = "18px";
    iconBox.style.flexShrink = "0";

    const icon = document.createElement("img");
    icon.src = `./assets/icons/${iconFile}`;
    icon.style.width = "100%";
    icon.style.height = "100%";
    icon.style.objectFit = "contain";
    icon.alt = label;

    // Manejo de error de carga de imagen
    icon.onerror = function () {
      log.warn(`No se pudo cargar el icono: ${iconFile}`);
      iconBox.innerHTML = "";
      iconBox.style.backgroundColor = "#ccc";
      iconBox.style.border = "1px solid #999";
      iconBox.style.borderRadius = "2px";
    };

    iconBox.appendChild(icon);
    itemLeyenda.appendChild(iconBox);
  } else if (color) {
    // Crear elemento de color
    const colorBox = document.createElement("div");
    colorBox.classList.add("legend-color", "me-2");
    colorBox.style.backgroundColor = color;
    colorBox.style.width = "18px";
    colorBox.style.height = "18px";
    colorBox.style.border = "1px solid #ccc";
    colorBox.style.borderRadius = "2px";
    colorBox.style.flexShrink = "0";
    itemLeyenda.appendChild(colorBox);
  }

  const labelElement = document.createElement("span");
  labelElement.classList.add("small", "legend-label");
  labelElement.textContent = label;
  itemLeyenda.appendChild(labelElement);

  return itemLeyenda;
}

/**
 * Obtiene las capas que están visibles actualmente en el mapa
 * Usa múltiples estrategias para detectar capas visibles
 * @param {string} tema - El tema actual
 * @returns {Array<string>} Array con nombres de capas visibles
 */
function obtenerCapasVisibles(tema) {
  const capasVisibles = new Set(); // Usar Set para evitar duplicados

  log.debug(`[obtenerCapasVisibles] Buscando capas para tema: ${tema}`);

  // Buscar en el DOM por data-tema-padre
  const checkboxesPorTema = document.querySelectorAll(
    `input[type="checkbox"][data-tema-padre="${tema}"]`
  );

  log.debug(
    `[obtenerCapasVisibles] Checkboxes encontrados con data-tema-padre="${tema}":`,
    checkboxesPorTema.length
  );

  checkboxesPorTema.forEach((checkbox) => {
    log.debug(`[obtenerCapasVisibles] Checkbox encontrado:`, {
      id: checkbox.id,
      value: checkbox.value,
      checked: checkbox.checked,
      classes: checkbox.className,
    });

    if (
      checkbox.checked &&
      !checkbox.classList.contains("dimension-switch") &&
      !checkbox.classList.contains("grupo-switch")
    ) {
      capasVisibles.add(checkbox.value);
    }
  });

  // Si no encontró ninguno, buscar en la dimensión activa
  if (capasVisibles.size === 0) {
    log.debug(
      `[obtenerCapasVisibles] No se encontraron capas con ESTRATEGIA 1, usando ESTRATEGIA 2`
    );

    // Buscar todos los checkboxes marcados dentro de la dimensión activa
    const dimensionContainer = document.querySelector(
      `[data-dimension-key="${tema}"]`
    );

    if (dimensionContainer) {
      const checkboxesEnDimension = dimensionContainer.querySelectorAll(
        'input[type="checkbox"]:checked:not(.dimension-switch):not(.grupo-switch)'
      );

      log.debug(
        `[obtenerCapasVisibles] Checkboxes marcados en dimensión:`,
        checkboxesEnDimension.length
      );

      checkboxesEnDimension.forEach((checkbox) => {
        if (checkbox.value) {
          log.debug(
            `[obtenerCapasVisibles] Agregando capa desde dimensión:`,
            checkbox.value
          );
          capasVisibles.add(checkbox.value);
        }
      });
    } else {
      log.warn(
        `[obtenerCapasVisibles] No se encontró contenedor para dimensión: ${tema}`
      );
    }
  }

  // Como último recurso, verificar en appState global
  if (capasVisibles.size === 0 && typeof window !== "undefined") {
    log.debug(
      `[obtenerCapasVisibles] No se encontraron capas con ESTRATEGIA 2, usando ESTRATEGIA 3`
    );

    // Verificar si existe window.appState
    if (
      window.appState &&
      window.appState.layers &&
      window.appState.layers.byName &&
      window.appState.map
    ) {
      window.appState.layers.byName.forEach((capa, capaNombre) => {
        if (window.appState.map.hasLayer(capa)) {
          log.debug(
            `[obtenerCapasVisibles] Capa visible en mapa (appState):`,
            capaNombre
          );
          capasVisibles.add(capaNombre);
        }
      });
    }
  }

  const resultado = Array.from(capasVisibles);
  log.debug(`[obtenerCapasVisibles] RESULTADO FINAL:`, resultado);
  return resultado;
}
