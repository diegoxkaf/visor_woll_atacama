/**
 * Funciones para actualizar el sidebar (capas y capas base)
 * @module utils/sidebarUtils
 */

import {
  cargarCapaIndividual,
  mostrarCapa,
  ocultarCapa,
} from "./layerUtils.js";
import { appState } from "../store/appState.js";
import { changeBaseLayer } from "./mapUtils.js";
import { actualizarLeyenda } from "./legendUtils.js";
import {
  obtenerCapasParaCargaInicial,
  encontrarTemaParaCapa,
  obtenerTodasLasCapasDeDimension,
  obtenerNombrePersonalizado,
} from "./configUtils.js";
import { logger, createContextLogger } from "./logger.js";
import { buildSearchIndex } from "./searchControl.js";

const log = createContextLogger('SidebarUtils');

/**
 * Crea el header de un grupo de dimensión con su switch y botón de colapso
 * @param {string} temaKey - Clave del tema
 * @param {Object} temaConfig - Configuración del tema
 * @param {string} contenedorId - ID del contenedor
 * @returns {Object} Objeto con {header, switchInput, collapseButton, collapseId}
 */
function crearHeaderDimension(temaKey, temaConfig, contenedorId) {
  const header = document.createElement("div");
  header.classList.add(
    "dimension-group-header",
    "d-flex",
    "justify-content-between",
    "align-items-center",
    "mb-2"
  );

  // Switch de dimensión
  const switchContainer = document.createElement("div");
  switchContainer.classList.add(
    "form-check",
    "form-switch",
    "d-flex",
    "align-items-center",
    "w-100"
  );

  const dimensionName =
    temaConfig.nombre || temaKey.charAt(0).toUpperCase() + temaKey.slice(1);
  const switchInput = document.createElement("input");
  switchInput.type = "checkbox";
  switchInput.role = "switch";
  const switchId = `dimension-switch-${temaKey}-${contenedorId}`;
  switchInput.id = switchId;
  switchInput.classList.add("form-check-input", "dimension-switch");

  const isInitialTheme = temaKey === appState.activeTemaName;
  switchInput.checked = isInitialTheme;

  const switchLabel = document.createElement("label");
  switchLabel.classList.add(
    "form-check-label",
    "fw-600",
    "dimension-title",
    "ms-2",
    "text-truncate"
  );
  switchLabel.htmlFor = switchId;
  switchLabel.textContent = dimensionName;

  switchContainer.appendChild(switchInput);
  switchContainer.appendChild(switchLabel);
  header.appendChild(switchContainer);

  // Botón de colapso
  const collapseId = `collapse-${temaKey}-${contenedorId}`;
  const collapseButton = document.createElement("button");
  collapseButton.classList.add("btn-collapse-toggle", "ms-auto");
  collapseButton.setAttribute("type", "button");
  collapseButton.setAttribute("data-bs-toggle", "collapse");
  collapseButton.setAttribute("data-bs-target", `#${collapseId}`);
  collapseButton.setAttribute("aria-expanded", isInitialTheme ? "true" : "false");
  collapseButton.setAttribute("aria-controls", collapseId);
  collapseButton.innerHTML = `<i class="fas fa-chevron-${isInitialTheme ? "up" : "down"}"></i>`;

  header.appendChild(collapseButton);

  return { header, switchInput, collapseButton, collapseId };
}


/**
 * Construye los grupos por dimensión con subgrupos temáticos dentro de un contenedor.
 * @param {HTMLElement} contenedor - Contenedor del sidebar
 * @param {object} temasConfig - Configuración global de temas
 */
function agruparCapasPorDimensionEn(contenedor, temasConfig) {
  if (!contenedor || !temasConfig) return;

  contenedor.innerHTML = "";
  const dimensionKeys = Object.keys(temasConfig);

  dimensionKeys.forEach((temaKey) => {
    const temaConfig = temasConfig[temaKey];
    if (!temaConfig || !temaConfig.capas || temaConfig.capas.length === 0)
      return;

    // --- GRUPO DE DIMENSIÓN ---
    const dimensionGroup = document.createElement("div");
    dimensionGroup.classList.add("dimension-group", "mb-3");
    dimensionGroup.setAttribute("data-dimension-key", temaKey);

    // --- HEADER DE DIMENSIÓN ---
    const header = document.createElement("div");
    header.classList.add(
      "dimension-group-header",
      "d-flex",
      "justify-content-between",
      "align-items-center",
      "mb-2"
    );

    // Switch de dimensión
    const switchContainer = document.createElement("div");
    switchContainer.classList.add(
      "form-check",
      "form-switch",
      "d-flex",
      "align-items-center",
      "w-100"
    );

    const dimensionName =
      temaConfig.nombre || temaKey.charAt(0).toUpperCase() + temaKey.slice(1);
    const switchInput = document.createElement("input");
    switchInput.type = "checkbox";
    switchInput.role = "switch";
    const switchId = `dimension-switch-${temaKey}-${contenedor.id}`;
    switchInput.id = switchId;
    switchInput.classList.add("form-check-input", "dimension-switch");

    const isInitialTheme = temaKey === appState.activeTemaName;
    switchInput.checked = isInitialTheme;

    const switchLabel = document.createElement("label");
    switchLabel.classList.add(
      "form-check-label",
      "fw-600",
      "dimension-title",
      "ms-2",
      "text-truncate"
    );
    switchLabel.htmlFor = switchId;
    switchLabel.textContent = dimensionName;

    switchContainer.appendChild(switchInput);
    switchContainer.appendChild(switchLabel);
    header.appendChild(switchContainer);

    // Botón de colapso de dimensión
    const collapseId = `collapse-${temaKey}-${contenedor.id}`;
    const collapseButton = document.createElement("button");
    collapseButton.classList.add("btn-collapse-toggle", "ms-auto");
    collapseButton.setAttribute("type", "button");
    collapseButton.setAttribute("data-bs-toggle", "collapse");
    collapseButton.setAttribute("data-bs-target", `#${collapseId}`);
    collapseButton.setAttribute(
      "aria-expanded",
      isInitialTheme ? "true" : "false"
    );
    collapseButton.setAttribute("aria-controls", collapseId);

    const iconClass = isInitialTheme ? "" : "collapsed-icon-rotated";
    collapseButton.innerHTML = `<i class="fas fa-chevron-down collapse-icon ${iconClass}"></i>`;
    header.appendChild(collapseButton);

    // --- CONTENEDOR DE CONTENIDO DE LA DIMENSIÓN ---
    const childrenContainer = document.createElement("ul");
    childrenContainer.id = collapseId;
    childrenContainer.classList.add(
      "collapse",
      "dimension-children",
      "list-unstyled",
      "mt-1",
      "ps-0"
    );

    if (isInitialTheme) {
      childrenContainer.classList.add("show", "dimension-active");
    }

    collapseButton.addEventListener("click", () => {
      const icon = collapseButton.querySelector(".collapse-icon");
      icon.classList.toggle("collapsed-icon-rotated");
    });

    // --- DETERMINAR QUÉ SE CARGA INICIALMENTE ---
    const cargaInicial = temaConfig.cargaInicial || {};
    const gruposIniciales = cargaInicial.grupos || [];
    const capasIniciales = cargaInicial.capas || [];

    // --- VERIFICAR SI EXISTEN GRUPOS ---
    if (temaConfig.grupos && Object.keys(temaConfig.grupos).length > 0) {
      // MODO CON GRUPOS
      Object.entries(temaConfig.grupos).forEach(([grupoKey, grupoConfig]) => {
        const grupoLi = document.createElement("li");
        grupoLi.classList.add("grupo-tematico", "mb-2");
        grupoLi.setAttribute("data-grupo-key", grupoKey);

        // Determinar si este grupo debe cargarse inicialmente
        const seCargaInicialmente =
          isInitialTheme && gruposIniciales.includes(grupoKey);

        // Header del grupo temático CON SWITCH
        const grupoHeader = document.createElement("div");
        grupoHeader.classList.add(
          "grupo-header",
          "d-flex",
          "align-items-center",
          "justify-content-between",
          "mb-1"
        );

        // === SWITCH DEL GRUPO ===
        const grupoSwitchContainer = document.createElement("div");
        grupoSwitchContainer.classList.add(
          "form-check",
          "form-switch",
          "d-flex",
          "align-items-center",
          "flex-grow-1"
        );

        const grupoSwitchId = `grupo-switch-${temaKey}-${grupoKey}-${contenedor.id}`;
        const grupoSwitch = document.createElement("input");
        grupoSwitch.type = "checkbox";
        grupoSwitch.role = "switch";
        grupoSwitch.id = grupoSwitchId;
        grupoSwitch.classList.add("form-check-input", "grupo-switch");
        grupoSwitch.checked = seCargaInicialmente; // Solo activo si está en cargaInicial
        grupoSwitch.setAttribute("data-tema", temaKey);
        grupoSwitch.setAttribute("data-grupo", grupoKey);

        const grupoSwitchLabel = document.createElement("label");
        grupoSwitchLabel.classList.add(
          "form-check-label",
          "grupo-nombre",
          "ms-2"
        );
        grupoSwitchLabel.htmlFor = grupoSwitchId;
        grupoSwitchLabel.textContent = grupoConfig.nombre;

        grupoSwitchContainer.appendChild(grupoSwitch);
        grupoSwitchContainer.appendChild(grupoSwitchLabel);
        grupoHeader.appendChild(grupoSwitchContainer);

        // Botón de colapso del grupo
        const grupoCollapseId = `collapse-grupo-${temaKey}-${grupoKey}-${contenedor.id}`;
        const grupoCollapseBtn = document.createElement("button");
        grupoCollapseBtn.classList.add("btn-collapse-toggle-grupo");
        grupoCollapseBtn.setAttribute("type", "button");
        grupoCollapseBtn.setAttribute("data-bs-toggle", "collapse");
        grupoCollapseBtn.setAttribute("data-bs-target", `#${grupoCollapseId}`);
        grupoCollapseBtn.setAttribute(
          "aria-expanded",
          seCargaInicialmente ? "true" : "false"
        );
        grupoCollapseBtn.innerHTML = `<i class="fas fa-chevron-down collapse-icon-grupo ${seCargaInicialmente ? "" : "collapsed-icon-rotated"
          }"></i>`;

        grupoCollapseBtn.addEventListener("click", () => {
          const icon = grupoCollapseBtn.querySelector(".collapse-icon-grupo");
          icon.classList.toggle("collapsed-icon-rotated");
        });

        grupoHeader.appendChild(grupoCollapseBtn);
        grupoLi.appendChild(grupoHeader);

        // Contenedor de capas del grupo
        const grupoCapasUl = document.createElement("ul");
        grupoCapasUl.id = grupoCollapseId;
        grupoCapasUl.classList.add(
          "collapse",
          "grupo-capas-list",
          "list-unstyled",
          "ps-3"
        );

        if (seCargaInicialmente) {
          grupoCapasUl.classList.add("show");
        }

        // Agregar capas del grupo - PASAR temasConfig como parámetro
        grupoConfig.capas.forEach((capaNombre) => {
          const capaLi = crearElementoCapa(
            capaNombre,
            temaKey,
            temaConfig,
            temasConfig,
            contenedor.id,
            seCargaInicialmente
          );
          grupoCapasUl.appendChild(capaLi);
        });

        grupoLi.appendChild(grupoCapasUl);
        childrenContainer.appendChild(grupoLi);

        // === LISTENER DEL SWITCH DEL GRUPO ===
        grupoSwitch.addEventListener("change", async (e) => {
          const grupoActivo = e.target.checked;

          // Obtener todos los checkboxes de las capas dentro de este grupo
          const capasCheckboxes = grupoCapasUl.querySelectorAll(
            'input[type="checkbox"]:not(.grupo-switch)'
          );

          if (grupoActivo) {
            // Mostrar indicador de carga
            grupoSwitchLabel.innerHTML = `${grupoConfig.nombre} <small class="text-muted">(Cargando...)</small>`;

            // Activar todas las capas del grupo
            for (const checkbox of capasCheckboxes) {
              const capaNombre = checkbox.value;

              // Si no está cargada, cargarla
              if (!appState.layers.loaded.has(capaNombre)) {
                await cargarCapaIndividual(capaNombre, temaKey, temasConfig);
                appState.layers.loaded.add(capaNombre);
              }

              // Mostrar la capa
              mostrarCapa(capaNombre);

              // Marcar el checkbox
              if (!checkbox.checked) {
                checkbox.checked = true;
              }
            }

            // Restaurar nombre del grupo
            grupoSwitchLabel.textContent = grupoConfig.nombre;
          } else {
            // Desactivar todas las capas del grupo
            capasCheckboxes.forEach((checkbox) => {
              const capaNombre = checkbox.value;
              ocultarCapa(capaNombre);

              // Desmarcar el checkbox
              if (checkbox.checked) {
                checkbox.checked = false;
              }
            });
          }

          // Actualizar leyenda
          actualizarLeyenda(temaKey, temasConfig);
        });

        // === SINCRONIZAR SWITCH DEL GRUPO CON CAPAS INDIVIDUALES ===
        grupoCapasUl.addEventListener("change", (e) => {
          if (
            e.target.classList.contains("form-check-input") &&
            !e.target.classList.contains("grupo-switch")
          ) {
            const capasCheckboxes = grupoCapasUl.querySelectorAll(
              'input[type="checkbox"]:not(.grupo-switch)'
            );
            const todasActivas = Array.from(capasCheckboxes).every(
              (cb) => cb.checked
            );
            const todasInactivas = Array.from(capasCheckboxes).every(
              (cb) => !cb.checked
            );

            if (todasActivas) {
              grupoSwitch.checked = true;
            } else if (todasInactivas) {
              grupoSwitch.checked = false;
            }
          }
        });
      });
    } else {
      // MODO SIN GRUPOS (comportamiento original con carga selectiva)
      temaConfig.capas.forEach((capaNombre) => {
        const seCargaInicialmente =
          isInitialTheme &&
          (capasIniciales.length === 0 || capasIniciales.includes(capaNombre));
        const capaLi = crearElementoCapa(
          capaNombre,
          temaKey,
          temaConfig,
          temasConfig,
          contenedor.id,
          seCargaInicialmente
        );
        childrenContainer.appendChild(capaLi);
      });
    }

    // --- LISTENER DEL SWITCH DE DIMENSIÓN ---
    switchInput.addEventListener("change", async (e) => {
      const isActive = e.target.checked;

      if (isActive) {
        // Desactivar dimensión previa
        if (
          appState.ui.activeDimension &&
          appState.ui.activeDimension !== temaKey
        ) {
          const prevSwitch = document.getElementById(
            `dimension-switch-${appState.ui.activeDimension}-${contenedor.id}`
          );
          if (prevSwitch) prevSwitch.checked = false;

          const prevChildrenContainer = document.getElementById(
            `collapse-${appState.ui.activeDimension}-${contenedor.id}`
          );
          if (prevChildrenContainer) {
            prevChildrenContainer.classList.remove("dimension-active", "show");
            prevChildrenContainer
              .querySelectorAll('input[type="checkbox"]')
              .forEach((cb) => {
                if (cb.checked) {
                  cb.checked = false;
                  cb.dispatchEvent(new Event("change"));
                }
              });
          }

          const prevCapas =
            temasConfig[appState.ui.activeDimension]?.capas || [];
          desactivarCapasDeDimension(
            appState.ui.activeDimension,
            prevCapas,
            temasConfig
          );
        }

        appState.ui.activeDimension = temaKey;

        // CARGAR SOLO LAS CAPAS/GRUPOS INICIALES
        const capasACargaInicial = obtenerCapasParaCargaInicial(temaConfig);

        if (capasACargaInicial.length > 0) {
          // Mostrar indicador de carga en el label
          const originalText = switchLabel.textContent;
          switchLabel.innerHTML = `${originalText} <small class="text-muted">(Cargando...)</small>`;

          await activarCapasDeDimension(
            temaKey,
            capasACargaInicial,
            temasConfig
          );

          // Restaurar texto original
          switchLabel.textContent = originalText;
        }

        childrenContainer.classList.add("dimension-active", "show");

        await new Promise((resolve) => setTimeout(resolve, 100));

        // Marcar los checkboxes de las capas que se cargaron
        capasACargaInicial.forEach((capaNombre) => {
          const checkbox = document.getElementById(`capa-${capaNombre}`);
          if (checkbox && !checkbox.checked) {
            checkbox.checked = true;

          }
        });

        // Activar switches de grupos que tienen capas cargadas
        if (temaConfig.grupos && gruposIniciales.length > 0) {
          gruposIniciales.forEach((grupoKey) => {
            const grupoSwitch = document.getElementById(
              `grupo-switch-${temaKey}-${grupoKey}-${contenedor.id}`
            );
            if (grupoSwitch && !grupoSwitch.checked) {
              grupoSwitch.checked = true;

            }
          });
        }

        // Actualizar leyenda DESPUÉS de marcar los checkboxes
        actualizarLeyenda(temaKey, temasConfig);
      } else {
        const capas = obtenerTodasLasCapasDeDimension(temaConfig);
        desactivarCapasDeDimension(temaKey, capas, temasConfig);

        if (appState.ui.activeDimension === temaKey) {
          appState.ui.activeDimension = null;
        }

        childrenContainer.classList.remove("dimension-active");

        const legendContainer = document.getElementById("sidebar-legend");
        if (legendContainer) {
          legendContainer.innerHTML =
            '<p class="text-muted small">No hay capas activas.</p>';
        }
      }

      // Sincronizar checkboxes según la carga inicial
      if (isActive) {
        const capasACargaInicial = obtenerCapasParaCargaInicial(temaConfig);
        childrenContainer
          .querySelectorAll(
            'input[type="checkbox"]:not(.dimension-switch):not(.grupo-switch)'
          )
          .forEach((cb) => {
            const debeEstarActivo = capasACargaInicial.includes(cb.value);
            if (cb.checked !== debeEstarActivo) {
              cb.checked = debeEstarActivo;
            }
          });

        // Sincronizar switches de grupos
        if (temaConfig.grupos) {
          Object.entries(temaConfig.grupos).forEach(([grupoKey, grupoConfig]) => {
            const grupoSwitch = document.getElementById(
              `grupo-switch-${temaKey}-${grupoKey}-${contenedor.id}`
            );
            if (grupoSwitch) {
              const todasLasCapasDelGrupo = grupoConfig.capas;
              const todasCargadas = todasLasCapasDelGrupo.every((capa) =>
                capasACargaInicial.includes(capa)
              );
              grupoSwitch.checked = todasCargadas;
            }
          });
        }
      } else {
        // Al desactivar, desmarcar todos (incluidos grupos)
        childrenContainer
          .querySelectorAll('input[type="checkbox"]')
          .forEach((cb) => {
            if (cb.checked) {
              cb.checked = false;
              if (!cb.classList.contains("dimension-switch")) {
                cb.dispatchEvent(new Event("change"));
              }
            }
          });
      }
    });

    dimensionGroup.appendChild(header);
    dimensionGroup.appendChild(childrenContainer);
    contenedor.appendChild(dimensionGroup);

    if (isInitialTheme) {
      appState.ui.activeDimension = temaKey;
    }
  });
}





/**
 * Crea un elemento <li> para una capa individual
 * @param {string} capaNombre - Nombre de la capa
 * @param {string} temaKey - Clave del tema
 * @param {object} temaConfig - Configuración del tema
 * @param {object} temasConfig - Configuración GLOBAL de todos los temas (AGREGADO)
 * @param {string} contenedorId - ID del contenedor
 * @param {boolean} isInitialTheme - Si es el tema inicial
 * @returns {HTMLElement} Elemento <li>
 */
function crearElementoCapa(
  capaNombre,
  temaKey,
  temaConfig,
  temasConfig,
  contenedorId,
  isInitialTheme
) {
  const listItem = document.createElement("li");
  listItem.setAttribute("data-capa-nombre", capaNombre);
  listItem.classList.add("py-1");

  const checkboxId = `${contenedorId === "sidebar-layers" ? "capa" : "capa-mobile"
    }-${capaNombre}`;

  // Obtener el nombre personalizado de la configuración o usar el nombre de la capa
  const displayCapaName =
    temaConfig.estilo?.[capaNombre]?.nombrePersonalizado || capaNombre;

  listItem.innerHTML = `
    <div class="form-check form-switch d-flex align-items-center">
      <input 
        class="form-check-input" 
        type="checkbox" 
        role="switch"
        value="${capaNombre}" 
        id="${checkboxId}" 
        ${isInitialTheme ? "checked" : ""}
        data-tema-padre="${temaKey}"
      >
      <label class="form-check-label ms-2" for="${checkboxId}">
        ${displayCapaName}
      </label>
    </div>
  `;

  const individualCheckbox = listItem.querySelector('input[type="checkbox"]');
  individualCheckbox.addEventListener("change", async (e) => {
    const isChecked = e.target.checked;

    if (isChecked) {
      if (!appState.layers.loaded.has(capaNombre)) {
        // Mostrar indicador de carga local
        const originalLabel = listItem.querySelector('.form-check-label').innerHTML;
        listItem.querySelector('.form-check-label').innerHTML = `${originalLabel} <small class="text-muted">(Cargando...)</small>`;

        try {
          await cargarCapaIndividual(capaNombre, temaKey, temasConfig);
          appState.layers.loaded.add(capaNombre);
        } catch (err) {
          e.target.checked = false;
        } finally {
          listItem.querySelector('.form-check-label').innerHTML = originalLabel;
        }
      } else {
        mostrarCapa(capaNombre);
      }
    } else {
      ocultarCapa(capaNombre);
    }
    actualizarLeyenda(temaKey, temasConfig);
  });

  return listItem;
}


export async function activarCapasDeDimension(
  temaKey,
  listaCapas,
  temasConfig
) {
  log.debug(
    `Activando dimensión: ${temaKey}. Cargando ${listaCapas.length} capas.`
  );

  // Cargar todas las capas secuencialmente, pero continuar si alguna falla
  for (const capaNombre of listaCapas) {
    try {
      if (!appState.layers.loaded.has(capaNombre)) {
        log.debug(
          `Cargando capa individual ${capaNombre} desde tema ${temaKey}`
        );
        await cargarCapaIndividual(capaNombre, temaKey, temasConfig);
        // Marcar como cargada
        appState.layers.loaded.add(capaNombre);
      } else {
        log.debug(`Capa ${capaNombre} ya cargada, mostrando...`);
        mostrarCapa(capaNombre);
      }
    } catch (error) {
      // Log del error pero continuar con las demás capas
      log.warn(`No se pudo cargar la capa ${capaNombre}, continuando con las demás...`);
    }
  }

  log.log(`Dimensión ${temaKey} activada. Capas mostradas.`);
}

export function desactivarCapasDeDimension(temaKey, listaCapas, temasConfig) {
  log.debug(
    `Desactivando dimensión: ${temaKey}. Ocultando ${listaCapas.length} capas.`
  );

  for (const capaNombre of listaCapas) {
    if (appState.layers.byName.has(capaNombre)) {
      ocultarCapa(capaNombre);
    }
  }

  log.log(
    `Dimensión ${temaKey} desactivada. Capas ocultadas y checkboxes desmarcados.`
  );
}

/**
 * Sincroniza el estado (checked/unchecked) de los checkboxes individuales de una capa.
 * @param {string} capaNombre - Nombre de la capa.
 * @param {boolean} checkedState - true para marcar, false para desmarcar.
 */
function syncIndividualCheckboxes(capaNombre, checkedState) {
  const mainCheckbox = document.getElementById(`capa-${capaNombre}`);
  if (mainCheckbox) {
    if (mainCheckbox.checked !== checkedState) {
      mainCheckbox.checked = checkedState;
    }
  }

  const mobileCheckbox = document.getElementById(`capa-mobile-${capaNombre}`);
  if (mobileCheckbox) {
    if (mobileCheckbox.checked !== checkedState) {
      mobileCheckbox.checked = checkedState;
    }
  }
}

/**
 * Obtiene todas las capas únicas de todos los temas
 * @param {object} temasConfig - El objeto de configuración de temas
 * @returns {Array} Array con todas las capas únicas
 */
function obtenerTodasLasCapas(temasConfig) {
  const todasLasCapas = new Set();

  Object.values(temasConfig).forEach((tema) => {
    if (tema.capas && Array.isArray(tema.capas)) {
      tema.capas.forEach((capa) => todasLasCapas.add(capa));
    }
  });

  return Array.from(todasLasCapas).sort();
}



export function actualizarCapasSidebar(activeTemaName, temasConfig) {
  if (!temasConfig) {
    log.error(
      "temasConfig es undefined en actualizarCapasSidebar. No se puede construir el sidebar."
    );
    return;
  }

  const sidebarLayers = document.getElementById("sidebar-layers");
  const sidebarLayersMobile = document.getElementById("sidebar-layers-mobile");

  if (sidebarLayers) {
    agruparCapasPorDimensionEn(sidebarLayers, temasConfig);
  } else {
    log.warn(
      "Contenedor de capas desktop ('sidebar-layers') no encontrado."
    );
  }

  if (sidebarLayersMobile) {
    agruparCapasPorDimensionEn(sidebarLayersMobile, temasConfig);
  } else {
    log.warn(
      "Contenedor de capas mobile ('sidebar-layers-mobile') no encontrado."
    );
  }

  log.debug("Sidebar de capas actualizada con todas las capas disponibles");
}

/**
 * Muestra las capas base como radios en el sidebar.
 * @param {string} contenedorId - ID del contenedor (ej: 'sidebar-bases' o 'sidebar-bases-mobile').
 * @param {object} capasBaseConfig - Objeto de configuración de capas base.
 */
export function actualizarCapasBase(contenedorId, capasBaseConfig) {
  const contenedor = document.getElementById(contenedorId);
  if (!contenedor) {
    log.warn(`Contenedor de capas base '${contenedorId}' no encontrado.`);
    return;
  }
  const capaKeys = Object.keys(capasBaseConfig);
  const radioGroupName =
    contenedorId === "sidebar-base-layers" ? "baseLayer" : "baseLayerMobile";

  capaKeys.forEach((capaKey) => {
    const config = capasBaseConfig[capaKey];
    const radioId = `${contenedorId}-radio-${capaKey}`;

    const div = document.createElement("div");
    div.classList.add("form-check", "py-1", "px-3");

    const input = document.createElement("input");
    input.classList.add("form-check-input", "base-layer-radio");
    input.type = "radio";
    input.name = radioGroupName;
    input.id = radioId;
    input.value = capaKey;

    if (capaKey === "openStreetMap") {
      input.checked = true;
    }

    const label = document.createElement("label");
    label.classList.add("form-check-label", "ms-2");
    label.htmlFor = radioId;
    label.textContent = config.nombre;

    input.addEventListener("change", () => {
      if (input.checked) {
        const nuevaCapa = L.tileLayer(config.url, {
          attribution: config.nombre,
          maxZoom: 19,
        });

        if (map && currentBaseLayer) {
          changeBaseLayer(map, nuevaCapa, currentBaseLayer);
        } else {
          console.error("Mapa o capa base actual no están definidos.");
        }
      }
    });

    div.appendChild(input);
    div.appendChild(label);
    contenedor.appendChild(div);
  });
}

/**
 * Sincroniza el estado de los checkboxes con el estado real de las capas en el mapa
 * @param {string} temaActivo - El tema actualmente activo
 * @param {object} temasConfig - Configuración de temas
 */
export function sincronizarEstadoCapas(temaActivo, temasConfig) {


  const todasLasCapas = obtenerTodasLasCapas(temasConfig);
  const capasDelTemaActivo = temasConfig[temaActivo]?.capas || [];

  todasLasCapas.forEach((capaNombre) => {
    const perteneceAlTemaActivo = capasDelTemaActivo.includes(capaNombre);
    const layer = appState.layers.byName.get(capaNombre);
    const estaVisible = layer && appState.map && appState.map.hasLayer(layer);

    const debeEstarMarcado = perteneceAlTemaActivo || estaVisible;

    const mainCheckbox = document.getElementById(`capa-${capaNombre}`);
    if (mainCheckbox) {
      mainCheckbox.checked = debeEstarMarcado;
    }

    const mobileCheckbox = document.getElementById(`capa-mobile-${capaNombre}`);
    if (mobileCheckbox) {
      mobileCheckbox.checked = debeEstarMarcado;
    }

    const mainLabel = document.querySelector(`label[for="capa-${capaNombre}"]`);
    const mobileLabel = document.querySelector(
      `label[for="capa-mobile-${capaNombre}"]`
    );

    [mainLabel, mobileLabel].forEach((label) => {
      if (label) {
        // Todas las capas tienen el mismo estilo, sin importar si son del tema activo
        label.classList.remove("text-muted");
        label.classList.remove("fw-bold");
        label.style.color = "";
        label.style.fontStyle = "normal";
        label.style.fontWeight = "";
      }
    });
  });


}

window.rebuildDimensionGroups = function () {
  const sidebarLayers = document.getElementById("sidebar-layers");
  const sidebarLayersMobile = document.getElementById("sidebar-layers-mobile");
  if (sidebarLayers) agruparCapasPorDimensionEn(sidebarLayers);
  if (sidebarLayersMobile) agruparCapasPorDimensionEn(sidebarLayersMobile);
};

/**
 * Activa una dimensión programáticamente
 * @param {string} temaKey - Clave del tema (ej: 'energia', 'agua')
 */
export function activarDimension(temaKey) {
  if (appState.ui.activeDimension === temaKey) return;

  // Intentar activar en desktop
  const switchDesktop = document.getElementById(`dimension-switch-${temaKey}-sidebar-layers`);
  if (switchDesktop) {
    if (!switchDesktop.checked) {
      switchDesktop.click();
    }
    return;
  }

  // Intentar activar en mobile
  const switchMobile = document.getElementById(`dimension-switch-${temaKey}-sidebar-layers-mobile`);
  if (switchMobile) {
    if (!switchMobile.checked) {
      switchMobile.click();
    }
  }
}
