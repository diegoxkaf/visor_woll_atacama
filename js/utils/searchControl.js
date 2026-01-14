

import { appState, isLayerLoaded, getLayer } from "../store/appState.js";
import { logger } from "./logger.js";
import allTemasConfig from "../config/allTemasConfig.js";
import { fetchLayerData, cargarCapaIndividual } from "./layerUtils.js";
import { activarDimension } from "./sidebarUtils.js";

// CONFIGURACIÓN Y CONSTANTES

const CONFIG = {
    MAX_VISIBLE_RESULTS: 20,        // Máximo de resultados en lista
    MAX_MARKERS_ON_MAP: 50,         // Máximo de markers rojos en mapa
    DEBOUNCE_DELAY: 300,            // ms para debouncing
    CACHE_SIZE: 20,                 // Número de búsquedas en caché
    BACKGROUND_BATCH_SIZE: 2,       // Capas a indexar por lote
    BACKGROUND_DELAY: 200,          // ms entre lotes

    PRIORITY_LAYERS: [
        'hidrografia', 'derechos_agua_2025', 'cuencas_dga', 'glaciares',
        'yacimientos_mineros', 'relaves', 'distritos_mineros',
        'energia_linea_transmision', 'subestaciones',
        'agricultura_regiones', 'uso_suelo'
    ]
};

// ESTADO DEL MÓDULO

let searchIndex = [];
let indexedLayers = new Set();
let isIndexing = false;

const searchCache = new Map();

let searchDebounceTimer = null;

let searchFilters = {
    capaTipo: 'todos',
    soloVisibles: false
};

let resultsMarkersGroup = null;
let currentResults = [];
let currentResultIndex = 0;

// UTILIDADES DE CACHÉ

// Genera clave única para el caché de búsqueda

function getCacheKey(query, filters) {
    return `${query.toLowerCase()}_${filters.capaTipo}_${filters.soloVisibles}`;
}


// Obtiene resultado del caché si existe

function getCachedResults(query) {
    const key = getCacheKey(query, searchFilters);
    return searchCache.get(key);
}


// Guarda resultado en caché (LRU)

function setCachedResults(query, results) {
    const key = getCacheKey(query, searchFilters);
    if (searchCache.size >= CONFIG.CACHE_SIZE) {
        const firstKey = searchCache.keys().next().value;
        searchCache.delete(firstKey);
    }

    searchCache.set(key, results);
}

// Limpia el caché de búsqueda

export function clearSearchCache() {
    searchCache.clear();
    logger.debug('[SearchControl] Caché de búsqueda limpiado');
}

// GESTIÓN DE MARKERS

function initResultsMarkersGroup() {
    if (resultsMarkersGroup) {
        if (appState.map) appState.map.removeLayer(resultsMarkersGroup);
    }
    if (appState.map) {
        resultsMarkersGroup = L.featureGroup().addTo(appState.map);
    }
}

export function clearResultsMarkers() {
    if (resultsMarkersGroup) {
        resultsMarkersGroup.clearLayers();
    }
    currentResults = [];
    currentResultIndex = 0;
}

// UTILIDADES DE CONFIGURACIÓN

function getCapaConfig(capaName, temaName) {
    if (!capaName) return null;

    if (temaName && allTemasConfig[temaName]?.estilo?.[capaName]) {
        return allTemasConfig[temaName].estilo[capaName];
    }

    for (const key of Object.keys(allTemasConfig)) {
        if (allTemasConfig[key]?.estilo?.[capaName]) {
            return allTemasConfig[key].estilo[capaName];
        }
    }

    return null;
}

function getLayerTheme(capaName) {
    for (const [temaKey, temaConfig] of Object.entries(allTemasConfig)) {
        if (temaConfig.estilo && temaConfig.estilo[capaName]) {
            return temaKey;
        }
    }
    return null;
}

function getCapaTipo(capaName) {
    if (!capaName) return 'otros';

    const tiposMap = {
        'hidrografia': 'agua', 'lagunas': 'agua', 'embalses': 'agua',
        'salares': 'agua', 'humedales': 'agua', 'glaciares': 'agua',
        'acuiferos': 'agua', 'apr': 'agua', 'desaladoras': 'agua',
        'aguas_servidas': 'agua', 'puntos_descargas': 'agua',
        'zonas_climaticas': 'clima',
        'energia': 'energia', 'subestaciones': 'energia',
        'minero': 'mineria', 'minera': 'mineria', 'yacimientos': 'mineria',
        'relaves': 'mineria', 'distritos_mineros': 'mineria',
        'puertos': 'mineria', 'ferroviaria': 'mineria',
        'plan_regulador': 'planificacion', 'prc_': 'planificacion',
        'borde_costero': 'planificacion', 'limites_urbanos': 'planificacion',
        'volcanes': 'riesgos', 'terremotos': 'riesgos', 'incendios': 'riesgos',
        'puntos_criticos': 'riesgos', 'remociones': 'riesgos',
        'geomorfologia': 'suelo',
        'areas_protegidas': 'conservacion', 'bienes_nacionales': 'conservacion',
        'ide': 'conservacion',
        'territorios_operacionales': 'territorio', 'cuencas': 'territorio',
        'limite_comunal': 'territorio', 'toponimia': 'territorio',
        'derechos_agua': 'gestion', 'decreto_escasez': 'gestion',
        'infraestructura': 'infraestructura'
    };

    const capaLower = capaName.toLowerCase();

    for (const [key, value] of Object.entries(tiposMap)) {
        if (capaLower.includes(key)) {
            return value;
        }
    }

    return 'otros';
}

// CONSTRUCCIÓN DE ÍNDICE

function buildSearchableFields(props, capaConfig) {
    const searchableFields = {};

    if (capaConfig?.alias) {
        for (const [key, aliasValue] of Object.entries(capaConfig.alias)) {
            const propValue = props[key];
            if (propValue != null && propValue !== '') {
                searchableFields[key] = String(propValue);
                searchableFields[`alias_${key}`] = aliasValue;
            }
        }
    }

    const camposComunes = [
        'NOMBRE', 'nombre', 'Name', 'name', 'NOM_COMUNA', 'nom_comuna',
        'TIPO', 'tipo', 'Type', 'type', 'TIPO_PLANTA',
        'COMUNA', 'comuna', 'REGION', 'region', 'NOM_REGION',
        'PROVINCIA', 'provincia', 'NOM_PROVIN',
        'CUENCA', 'cuenca', 'NOM_CUEN', 'nom_cuen',
        'SUBCUENCA', 'subcuenca', 'nom_subc',
        'ESTADO', 'estado', 'Estado'
    ];

    for (const campo of camposComunes) {
        const value = props[campo];
        if (value != null && value !== '') {
            searchableFields[campo] = String(value);
        }
    }

    return searchableFields;
}


// Construye el índice de búsqueda

export async function buildSearchIndex() {
    if (isIndexing) return;
    isIndexing = true;

    logger.log('[SearchControl] Iniciando construcción de índice optimizado');

    indexAllLayersMetadata();
    indexLoadedLayers();
    setTimeout(() => {
        indexPriorityLayersBackground();
    }, 2000);

    isIndexing = false;
}


// Indexa solo metadata de capas

function indexAllLayersMetadata() {
    for (const [temaKey, temaConfig] of Object.entries(allTemasConfig)) {
        if (!temaConfig.estilo) continue;

        for (const [capaName, config] of Object.entries(temaConfig.estilo)) {
            const nombrePersonalizado = config.nombrePersonalizado || capaName;
            const metadataId = `meta_${capaName}`;

            if (searchIndex.some(i => i.id === metadataId)) continue;

            searchIndex.push({
                id: metadataId,
                isMetadata: true,
                layer: null,
                capaName: capaName,
                capaConfig: config,
                nombreCapa: nombrePersonalizado,
                displayName: `📂 Capa: ${nombrePersonalizado}`,
                searchText: `${nombrePersonalizado} ${capaName}`
                    .toLowerCase()
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, ""),
                tipoCategoria: getCapaTipo(capaName),
                tema: temaKey,
                isVisible: false,
                searchableFields: {}
            });
        }
    }

    logger.log(`[SearchControl] Metadata indexada: ${searchIndex.length} capas`);
}


// Indexa capas ya cargadas en el mapa

function indexLoadedLayers() {
    if (!appState.map) return;

    let featuresIndexed = 0;

    appState.map.eachLayer((layer) => {
        if (layer.feature && layer.feature.properties) {
            const capaName = layer.options?.layerName || layer.options?.capaName;
            if (!capaName) return;

            addToIndex(layer.feature, capaName, layer);
            featuresIndexed++;
        }
    });

    logger.log(`[SearchControl] Features indexados de capas cargadas: ${featuresIndexed}`);
}

// Indexa capas prioritarias en background

async function indexPriorityLayersBackground() {
    logger.log('[SearchControl] Iniciando indexación prioritaria en background');

    const capasAIndexar = [];

    for (const [temaKey, temaConfig] of Object.entries(allTemasConfig)) {
        if (!temaConfig.estilo) continue;

        for (const [capaName, config] of Object.entries(temaConfig.estilo)) {
            if (
                CONFIG.PRIORITY_LAYERS.includes(capaName) &&
                !isLayerLoaded(capaName) &&
                !capaName.startsWith('wms_') &&
                !indexedLayers.has(capaName)
            ) {
                capasAIndexar.push({ capaName, temaKey, config });
            }
        }
    }

    logger.log(`[SearchControl] ${capasAIndexar.length} capas prioritarias para indexar`);

    for (let i = 0; i < capasAIndexar.length; i += CONFIG.BACKGROUND_BATCH_SIZE) {
        const lote = capasAIndexar.slice(i, i + CONFIG.BACKGROUND_BATCH_SIZE);

        await Promise.all(lote.map(async (item) => {
            try {
                if (isLayerLoaded(item.capaName) || indexedLayers.has(item.capaName)) {
                    return;
                }

                const data = await fetchLayerData(item.capaName, item.config);

                if (data?.features) {
                    data.features.forEach(feature => {
                        addToIndex(feature, item.capaName, null, item.temaKey);
                    });
                    indexedLayers.add(item.capaName);
                }
            } catch (err) {
            }
        }));

        await new Promise(r => setTimeout(r, CONFIG.BACKGROUND_DELAY));
    }

    logger.log(`[SearchControl] Indexación prioritaria completada. Total: ${searchIndex.length}`);
}

// Agrega un feature al índice

function addToIndex(feature, capaName, layerInstance = null, temaKey = null) {
    const props = feature.properties;
    if (!props) return;

    const temaActual = temaKey || getLayerTheme(capaName);
    const capaConfig = getCapaConfig(capaName, temaActual);
    const nombreCapa = capaConfig?.nombrePersonalizado || capaName;
    const capaTipo = getCapaTipo(capaName);
    const searchableFields = buildSearchableFields(props, capaConfig);

    searchableFields['_nombreCapa'] = nombreCapa;

    const searchText = Object.values(searchableFields)
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    if (!searchText.trim()) return;
    let center = null;
    let bounds = null;

    if (layerInstance?.getBounds) {
        bounds = layerInstance.getBounds();
        center = bounds.getCenter();
    } else if (feature.geometry) {
        try {
            const tempLayer = L.geoJson(feature);
            bounds = tempLayer.getBounds();
            center = bounds.getCenter();
        } catch (e) { /* ignore */ }
    }
    let displayName = nombreCapa;
    const nombreFields = ['NOMBRE', 'nombre', 'Name', 'name', 'NOM_COMUNA', 'Nombre', 'sector', 'Sector'];

    for (const field of nombreFields) {
        if (props[field]) {
            displayName = `${props[field]} <small>(${nombreCapa})</small>`;
            break;
        }
    }

    searchIndex.push({
        layer: layerInstance,
        feature: feature,
        properties: props,
        searchText: searchText,
        searchableFields: searchableFields,
        displayName: displayName,
        nombreCapa: nombreCapa,
        capaName: capaName,
        tema: temaActual,
        tipoCategoria: capaTipo,
        center: center,
        bounds: bounds,
        isVisible: !!layerInstance,
        capaConfig: capaConfig
    });
}

// BÚSQUEDA

function parseQuery(query) {
    const operators = {
        tipo: null, capa: null, comuna: null,
        region: null, provincia: null, cuenca: null
    };

    const operatorRegex = /(\w+):"([^"]+)"|(\w+):(\S+)/g;
    let match;
    let processedQuery = query.toLowerCase();

    while ((match = operatorRegex.exec(query)) !== null) {
        const key = (match[1] || match[3]).toLowerCase();
        let value = (match[2] || match[4]).toLowerCase();

        if (value.startsWith('"')) value = value.slice(1);
        if (value.endsWith('"')) value = value.slice(0, -1);

        if (operators.hasOwnProperty(key)) {
            operators[key] = value;
        }

        processedQuery = processedQuery.replace(match[0], '').trim();
    }

    operators.textoCompleto = processedQuery
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();

    return operators;
}


// Búsqueda global

export function search(query) {
    if (!query || query.length < 2) return [];

    const cached = getCachedResults(query);
    if (cached) {
        logger.debug('[SearchControl] Resultado desde caché');
        return cached;
    }

    const ops = parseQuery(query);
    let results = searchIndex;

    if (searchFilters.capaTipo !== 'todos') {
        results = results.filter(item => item.tipoCategoria === searchFilters.capaTipo);
    }

    if (searchFilters.soloVisibles) {
        results = results.filter(item => isLayerLoaded(item.capaName));
    }

    if (ops.capa) {
        const capaQuery = ops.capa.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        results = results.filter(item => {
            const nombrePersonalizado = item.nombreCapa.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const nombreInterno = item.capaName.toLowerCase();
            return nombrePersonalizado.includes(capaQuery) || nombreInterno.includes(capaQuery);
        });
    }

    const commonFields = ['tipo', 'comuna', 'region', 'provincia', 'cuenca'];
    for (const field of commonFields) {
        if (ops[field]) {
            results = results.filter(item => {
                const val = (item.searchableFields[field.toUpperCase()] || item.searchableFields[field] || '')
                    .toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                return val.includes(ops[field]);
            });
        }
    }

    if (ops.textoCompleto) {
        results = results.filter(item => item.searchText.includes(ops.textoCompleto));
    }

    results.sort((a, b) => {
        if (a.isMetadata && !b.isMetadata) return -1;
        if (!a.isMetadata && b.isMetadata) return 1;

        if (isLayerLoaded(a.capaName) && !isLayerLoaded(b.capaName)) return -1;
        if (!isLayerLoaded(a.capaName) && isLayerLoaded(b.capaName)) return 1;

        return 0;
    });

    const limitedResults = results.slice(0, 50);

    setCachedResults(query, limitedResults);

    return limitedResults;
}

// NAVEGACIÓN Y VISUALIZACIÓN

export async function zoomToResult(result, map, showPopup = true) {
    if (!result || !map) return;
    if (result.isMetadata) {
        await activarCapaYDimension(result.capaName, result.tema);
        return;
    }

    let layerInstance = result.layer;

    if (!isLayerLoaded(result.capaName)) {
        logger.log(`[SearchControl] Activando capa: ${result.capaName}`);
        await activarCapaYDimension(result.capaName, result.tema);
        layerInstance = getLayer(result.capaName);
    }
    if (result.bounds) {
        map.fitBounds(result.bounds, { maxZoom: 16, padding: [50, 50] });
    } else if (result.center) {
        map.setView(result.center, 16);
    }

    if (showPopup && layerInstance) {
        if (layerInstance.eachLayer) {
            let found = null;
            layerInstance.eachLayer(l => {
                if (!found && l.feature?.properties) {
                    const propsA = l.feature.properties;
                    const propsB = result.properties;

                    if (propsA.OBJECTID === propsB.OBJECTID ||
                        propsA.id === propsB.id ||
                        propsA.NOMBRE === propsB.NOMBRE) {
                        found = l;
                    }
                }
            });

            if (found && found.openPopup) {
                found.openPopup();
            }
        } else if (layerInstance.openPopup) {
            layerInstance.openPopup();
        }
    }
}

async function activarCapaYDimension(capaName, temaName) {
    if (appState.activeTemaName !== temaName) {
        activarDimension(temaName);

        let waitTema = 0;
        while (appState.activeTemaName !== temaName && waitTema < 20) {
            await new Promise(r => setTimeout(r, 100));
            waitTema++;
        }
    }

    if (!isLayerLoaded(capaName)) {
        let checkbox = null;
        let waitCheckbox = 0;

        while (!checkbox && waitCheckbox < 20) {
            checkbox = document.getElementById(`capa-${capaName}`);
            if (!checkbox) await new Promise(r => setTimeout(r, 100));
            waitCheckbox++;
        }

        if (checkbox && !checkbox.checked) {
            checkbox.checked = true;
            checkbox.dispatchEvent(new Event('change'));
        } else if (!isLayerLoaded(capaName)) {
            await cargarCapaIndividual(capaName, temaName, allTemasConfig);
        }

        let intentos = 0;
        while (!isLayerLoaded(capaName) && intentos < 20) {
            await new Promise(r => setTimeout(r, 200));
            intentos++;
        }
    }
}


// Muestra resultados en mapa

export function showAllResultsOnMap(results) {
    initResultsMarkersGroup();
    currentResults = results;
    currentResultIndex = 0;

    if (!results || results.length === 0) return;

    const bounds = L.latLngBounds();
    let hasBounds = false;

    const limitedResults = results.slice(0, CONFIG.MAX_MARKERS_ON_MAP);

    limitedResults.forEach((item) => {
        if (!item.center) return;

        const marker = L.circleMarker(item.center, {
            radius: 8,
            fillColor: '#FF4444',
            color: '#FFFFFF',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
        });

        const popupContent = `
            <div class="search-popup-result">
                <strong>${item.displayName}</strong><br>
                <small>${item.nombreCapa}</small><br>
                ${!isLayerLoaded(item.capaName) ?
                '<span class="badge badge-warning">Capa Inactiva</span>' : ''}
            </div>
        `;

        marker.bindPopup(popupContent);
        marker.on('click', () => {
            zoomToResult(item, appState.map, true);
        });

        resultsMarkersGroup.addLayer(marker);
        bounds.extend(item.center);
        hasBounds = true;
    });

    if (hasBounds) {
        appState.map.fitBounds(bounds, {
            padding: [50, 50],
            maxZoom: 13
        });
    }

    if (results.length > CONFIG.MAX_MARKERS_ON_MAP) {
        logger.log(`[SearchControl] Mostrando ${CONFIG.MAX_MARKERS_ON_MAP} de ${results.length} resultados`);
    }
}

export function navigateResults(direction) {
    if (currentResults.length === 0) return;

    if (direction === 'next') {
        currentResultIndex = (currentResultIndex + 1) % currentResults.length;
    } else {
        currentResultIndex = currentResultIndex === 0 ?
            currentResults.length - 1 : currentResultIndex - 1;
    }

    const result = currentResults[currentResultIndex];
    zoomToResult(result, appState.map, true);
}

// UI - CONTROL DE BÚSQUEDA

export function createSearchControl() {
    initResultsMarkersGroup();

    L.Control.Search = L.Control.extend({
        options: {
            position: 'topright'
        },

        onAdd: function (map) {
            const container = L.DomUtil.create('div', 'leaflet-control-search');
            container.innerHTML = `
                <!-- Botón Toggle (visible cuando el buscador está cerrado) -->
                <button class="search-toggle-btn" id="searchToggleBtn" title="Abrir buscador">
                    <i class="fas fa-search"></i>
                </button>
                
                <!-- Contenedor del buscador (oculto por defecto) -->
                <div class="search-container" id="searchContainer" style="display: none;">
                    <div class="search-header">
                        <button class="search-toggle-btn-header" id="searchToggleBtnHeader" title="Buscador">
                            <i class="fas fa-search"></i>
                        </button>
                        <span class="search-header-title">Buscador</span>
                        <button class="search-close-btn" id="searchCloseBtn" title="Cerrar buscador">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="search-filters">
                        <select class="search-filter-select" id="searchFilterTipo">
                            <option value="todos">Todas las capas</option>
                            <option value="agua">💧 Recursos Hídricos</option>
                            <option value="clima">☀️ Clima</option>
                            <option value="energia">⚡ Energía</option>
                            <option value="mineria">⛏️ Minería</option>
                            <option value="planificacion">🗺️ Planificación</option>
                            <option value="riesgos">⚠️ Riesgos</option>
                            <option value="suelo">🏔️ Suelo</option>
                            <option value="conservacion">🌳 Conservación</option>
                            <option value="infraestructura">🏭 Infraestructura</option>
                            <option value="territorio">🗺️ Territorio</option>
                            <option value="gestion">📋 Gestión</option>
                        </select>
                    </div>
                    
                    <div class="search-input-wrapper">
                        <i class="fas fa-search search-icon"></i>
                        <input 
                            type="text" 
                            class="search-input" 
                            placeholder='Buscar en todo el visor...'
                            autocomplete="off"
                        />
                        <button class="search-clear" style="display: none;">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="search-help" style="display: none;">
                        <small>
                            💡 <strong>Tips:</strong> 
                            Búsqueda global habilitada.
                            <br>capa:"Volcanes" | comuna:Vallenar
                        </small>
                    </div>
                    
                    <div class="search-results" style="display: none;"></div>
                    
                    <div class="search-navigation" style="display: none;">
                        <div class="search-nav-info">
                            <span id="searchNavCounter">0 de 0</span>
                        </div>
                        <div class="search-nav-buttons">
                            <button id="searchNavPrev" class="search-nav-btn" title="Anterior">
                                <i class="fas fa-chevron-left"></i>
                            </button>
                            <button id="searchNavNext" class="search-nav-btn" title="Siguiente">
                                <i class="fas fa-chevron-right"></i>
                            </button>
                            <button id="searchClearMarkers" class="search-nav-btn search-nav-clear" title="Limpiar resultados">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;

            L.DomEvent.disableClickPropagation(container);
            L.DomEvent.disableScrollPropagation(container);

            const toggleBtn = container.querySelector('#searchToggleBtn');
            const toggleBtnHeader = container.querySelector('#searchToggleBtnHeader');
            const closeBtn = container.querySelector('#searchCloseBtn');
            const searchContainer = container.querySelector('#searchContainer');
            const input = container.querySelector('.search-input');
            const clearBtn = container.querySelector('.search-clear');
            const resultsContainer = container.querySelector('.search-results');
            const helpContainer = container.querySelector('.search-help');
            const navContainer = container.querySelector('.search-navigation');
            const filterSelect = container.querySelector('#searchFilterTipo');
            const navCounter = container.querySelector('#searchNavCounter');

            toggleBtn.addEventListener('click', () => {
                searchContainer.style.display = 'block';
                toggleBtn.style.display = 'none';
                input.focus();
            });

            closeBtn.addEventListener('click', () => {
                searchContainer.style.display = 'none';
                toggleBtn.style.display = 'flex';
                input.value = '';
                clearBtn.style.display = 'none';
                resultsContainer.style.display = 'none';
                navContainer.style.display = 'none';
                helpContainer.style.display = 'none';
                clearResultsMarkers();
            });

            input.addEventListener('input', (e) => {
                const query = e.target.value;

                if (query.length > 0) {
                    clearBtn.style.display = 'block';

                    if (query.length >= 2) {
                        clearTimeout(searchDebounceTimer);

                        searchDebounceTimer = setTimeout(() => {
                            const results = search(query);
                            renderResults(results, resultsContainer, navContainer, navCounter);
                        }, CONFIG.DEBOUNCE_DELAY);

                        helpContainer.style.display = 'none';
                    } else {
                        resultsContainer.style.display = 'none';
                        helpContainer.style.display = 'block';
                    }
                } else {
                    clearBtn.style.display = 'none';
                    resultsContainer.style.display = 'none';
                    helpContainer.style.display = 'none';
                    clearResultsMarkers();
                }
            });

            input.addEventListener('focus', () => {
                if (input.value.length < 2) {
                    helpContainer.style.display = 'block';
                } else if (input.value.length >= 2) {
                    if (resultsContainer.style.display === 'none') {
                        const results = search(input.value);
                        renderResults(results, resultsContainer, navContainer, navCounter);
                    }
                }
            });

            document.addEventListener('click', (e) => {
                if (!container.contains(e.target)) {
                    resultsContainer.style.display = 'none';
                    helpContainer.style.display = 'none';
                }
            });

            clearBtn.addEventListener('click', () => {
                input.value = '';
                clearBtn.style.display = 'none';
                resultsContainer.style.display = 'none';
                navContainer.style.display = 'none';
                clearResultsMarkers();
                clearSearchCache();
                input.focus();
            });

            filterSelect.addEventListener('change', (e) => {
                searchFilters.capaTipo = e.target.value;
                clearSearchCache();

                if (input.value.length >= 2) {
                    const results = search(input.value);
                    renderResults(results, resultsContainer, navContainer, navCounter);
                }
            });

            container.querySelector('#searchNavPrev').addEventListener('click', () =>
                navigateResults('prev')
            );

            container.querySelector('#searchNavNext').addEventListener('click', () =>
                navigateResults('next')
            );

            container.querySelector('#searchClearMarkers').addEventListener('click', () => {
                clearResultsMarkers();
                navContainer.style.display = 'none';
            });

            return container;
        }
    });

    appState.searchControl = new L.Control.Search().addTo(appState.map);
}

// RENDERIZADO DE RESULTADOS

function renderResults(results, container, navContainer, navCounter) {
    container.innerHTML = '';

    if (results.length === 0) {
        container.style.display = 'block';
        container.innerHTML = '<div class="search-no-results">No se encontraron resultados</div>';
        navContainer.style.display = 'none';
        return;
    }

    container.style.display = 'block';

    if (results.length > 0) {
        navContainer.style.display = 'flex';

        const totalShown = Math.min(results.length, CONFIG.MAX_VISIBLE_RESULTS);
        navCounter.textContent = `${totalShown} de ${results.length} resultados`;

        showAllResultsOnMap(results);
    }

    const limitedResults = results.slice(0, CONFIG.MAX_VISIBLE_RESULTS);

    const fragment = document.createDocumentFragment();

    limitedResults.forEach(result => {
        const div = document.createElement('div');
        div.className = 'search-result-item';

        const icon = result.isMetadata ? '📂' : '📍';

        const statusHtml = !isLayerLoaded(result.capaName) && !result.isMetadata
            ? '<span style="font-size:0.8em; color:#f0ad4e; float:right;" title="Capa inactiva">⚡</span>'
            : '';

        div.innerHTML = `
            <div class="search-result-title">${icon} ${result.displayName} ${statusHtml}</div>
            <div class="search-result-subtitle">${result.nombreCapa} • ${result.tema || 'General'}</div>
        `;

        div.addEventListener('click', () => {
            zoomToResult(result, appState.map, true);
        });

        fragment.appendChild(div);
    });

    container.appendChild(fragment);


    if (results.length > CONFIG.MAX_VISIBLE_RESULTS) {
        const moreDiv = document.createElement('div');
        moreDiv.className = 'search-more-results';
        moreDiv.innerHTML = `
            <small style="color: #666; padding: 8px; display: block; text-align: center;">
                Mostrando primeros ${CONFIG.MAX_VISIBLE_RESULTS} resultados. 
                Refina tu búsqueda para ver más.
            </small>
        `;
        container.appendChild(moreDiv);
    }
}