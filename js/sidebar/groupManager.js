import { DOM_PREFIXES } from "../config/constants.js";
import { appState } from "../store/appState.js";
import { changeBaseLayer } from "../utils/mapUtils.js";
import { createContextLogger } from "../utils/logger.js";

const log = createContextLogger('GroupManager');

function obtenerTodasLasCapas(temasConfig) {
  const todasLasCapas = new Set();

  Object.values(temasConfig).forEach((tema) => {
    if (tema.capas && Array.isArray(tema.capas)) {
      tema.capas.forEach((capa) => todasLasCapas.add(capa));
    }
  });

  return Array.from(todasLasCapas).sort();
}

export function actualizarCapasBase(contenedorId, capasBaseConfig) {
  const contenedor = document.getElementById(contenedorId);
  if (!contenedor) {
    log.warn(`Contenedor de capas base '${contenedorId}' no encontrado.`);
    return;
  }
  contenedor.innerHTML = "";
  const capaKeys = Object.keys(capasBaseConfig);
  const radioGroupName =
    contenedorId === "sidebar-base-layers" ? "baseLayer" : "baseLayerMobile";

  capaKeys.forEach((capaKey) => {
    const config = capasBaseConfig[capaKey];
    const radioId = `${contenedorId}-radio-${capaKey}`;

    const isChecked = capaKey === "openStreetMap";
    const div = document.createElement("li");
    div.classList.add("layer-item-container");
    if (isChecked) div.classList.add("layer-active");

    div.innerHTML = `
      <div class="layer-item">
        <input 
          class="base-layer-radio sr-only" 
          type="radio" 
          name="${radioGroupName}" 
          id="${radioId}" 
          value="${capaKey}"
          ${isChecked ? "checked" : ""}
        >
        <label class="layer-vis-btn" for="${radioId}" title="Activar capa base">
          <span class="material-symbols-outlined vis-icon-on">visibility</span>
          <span class="material-symbols-outlined vis-icon-off">visibility_off</span>
        </label>
        <div class="layer-item-content">
          <div class="layer-item-header">
            <label class="layer-item-name" for="${radioId}">${config.nombre}</label>
          </div>
          <div class="layer-opacity-control">
            <input 
              type="range" 
              class="layer-opacity-slider base-opacity-slider" 
              data-capa="${capaKey}"
              min="0" 
              max="100" 
              value="100"
              step="1"
            >
          </div>
        </div>
        <div class="layer-options-container">
          <button class="layer-menu-btn" title="Opciones" type="button">
            <span class="material-symbols-outlined">more_vert</span>
          </button>
          <div class="layer-options-menu">
            <button class="layer-option-item" type="button" data-action="zoom-capa" data-capa="${capaKey}">
              <span class="material-symbols-outlined">zoom_in_map</span>
              Zoom a la Capa
            </button>
            <button class="layer-option-item" type="button" data-action="ver-tabla" data-capa="${capaKey}">
              <span class="material-symbols-outlined">table_chart</span>
              Ver tabla de Atributos
            </button>
            <button class="layer-option-item" type="button" data-action="descargar-capa" data-capa="${capaKey}">
              <span class="material-symbols-outlined">download</span>
              Descargar Capa
            </button>
          </div>
        </div>
      </div>
    `;

    const input = div.querySelector('input[type="radio"]');
    input.addEventListener("change", () => {
      contenedor.querySelectorAll('.layer-item-container').forEach(el => el.classList.remove('layer-active'));
      if (input.checked) {
        div.classList.add("layer-active");
        const nuevaCapa = L.tileLayer(config.url, {
          attribution: config.nombre,
          maxZoom: 19,
        });

        if (appState.map && appState.currentBaseLayer) {
          changeBaseLayer(appState.map, nuevaCapa, appState.currentBaseLayer);
          appState.currentBaseLayer = nuevaCapa;
        } else {
          log.error('Mapa o capa base actual no están definidos en appState.');
        }
      }
    });

    const opacitySlider = div.querySelector('.layer-opacity-slider');
    opacitySlider.addEventListener('input', (e) => {
      if (input.checked && appState.currentBaseLayer) {
        const opacity = e.target.value / 100;
        appState.currentBaseLayer.setOpacity(opacity);
      }
    });

    const menuBtn = div.querySelector('.layer-menu-btn');
    const menuOptions = div.querySelector('.layer-options-menu');
    if (menuBtn && menuOptions) {
      menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.layer-options-menu.show').forEach(menu => {
          if (menu !== menuOptions) menu.classList.remove('show');
        });
        document.querySelectorAll('.menu-open-context').forEach(el => {
          if (el !== div) el.classList.remove('menu-open-context');
        });
        menuOptions.classList.toggle('show');
        div.classList.toggle('menu-open-context', menuOptions.classList.contains('show'));
      });

      const btnZoom = menuOptions.querySelector('[data-action="zoom-capa"]');
      if (btnZoom) {
        btnZoom.addEventListener('click', (e) => {
          e.stopPropagation();
          menuOptions.classList.remove('show');
          div.classList.remove('menu-open-context');
          alert("Las capas base (mapas de fondo) cubren el mundo entero.");
        });
      }

      const btnVerTabla = menuOptions.querySelector('[data-action="ver-tabla"]');
      if (btnVerTabla) {
        btnVerTabla.addEventListener('click', (e) => {
          e.stopPropagation();
          menuOptions.classList.remove('show');
          div.classList.remove('menu-open-context');
          alert("Las capas base (mapas de fondo) no tienen tabla de atributos.");
        });
      }

      const btnDescargar = menuOptions.querySelector('[data-action="descargar-capa"]');
      if (btnDescargar) {
        btnDescargar.addEventListener('click', (e) => {
          e.stopPropagation();
          menuOptions.classList.remove('show');
          div.classList.remove('menu-open-context');
          alert("Las capas base (mapas de fondo) no se pueden descargar.");
        });
      }
    }

    contenedor.appendChild(div);
  });
}

export function sincronizarEstadoCapas(temaActivo, temasConfig) {
  const todasLasCapas = obtenerTodasLasCapas(temasConfig);
  const capasDelTemaActivo = temasConfig[temaActivo]?.capas || [];

  todasLasCapas.forEach((capaNombre) => {
    const perteneceAlTemaActivo = capasDelTemaActivo.includes(capaNombre);
    const layer = appState.layers.byName.get(capaNombre);
    const estaVisible = layer && appState.map && appState.map.hasLayer(layer);

    const debeEstarMarcado = perteneceAlTemaActivo || estaVisible;

    const mainCheckbox = document.getElementById(`${DOM_PREFIXES.LAYER_CHECKBOX}${capaNombre}`);
    if (mainCheckbox) {
      mainCheckbox.checked = debeEstarMarcado;
    }

    const mobileCheckbox = document.getElementById(`${DOM_PREFIXES.LAYER_CHECKBOX_MOBILE}${capaNombre}`);
    if (mobileCheckbox) {
      mobileCheckbox.checked = debeEstarMarcado;
    }

    const mainLabel = document.querySelector(`label[for="capa-${capaNombre}"]`);
    const mobileLabel = document.querySelector(
      `label[for="capa-mobile-${capaNombre}"]`
    );

    [mainLabel, mobileLabel].forEach((label) => {
      if (label) {
        label.classList.remove("text-muted");
        label.classList.remove("fw-bold");
        label.style.color = "";
        label.style.fontStyle = "normal";
        label.style.fontWeight = "";
      }
    });
  });
}