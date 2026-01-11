/**
 * Analiza la consulta del usuario e identifica qué capas GeoJSON necesita
 */

// Mapeo de palabras clave a archivos GeoJSON
const LAYER_KEYWORDS = {
    // Agua
    'agua': ['derechos_agua_2025', 'apr_rural', 'cuencas_dga', 'red_canales', 'plantas_desaladoras_puntos', 'desaladoras_acueductos'],
    'derecho': ['derechos_agua_2025'],
    'caudal': ['derechos_agua_2025'],
    'consumo': ['derechos_agua_2025'],
    'riego': ['derechos_agua_2025', 'red_canales'],
    'canal': ['red_canales'],
    'cuenca': ['cuencas_dga'],
    'desaladora': ['plantas_desaladoras_puntos', 'desaladoras_acueductos'],

    // Minería
    'mineria': ['sonami_mapa_minero', 'yacimientos', 'relaves_mineros_sernageomin', 'distritos_mineros'],
    'mina': ['sonami_mapa_minero', 'yacimientos'],
    'cobre': ['sonami_mapa_minero', 'yacimientos'],
    'oro': ['sonami_mapa_minero', 'yacimientos'],
    'hierro': ['sonami_mapa_minero'],
    'relave': ['relaves_mineros_sernageomin'],
    'yacimiento': ['yacimientos'],

    // Agricultura
    'agricultura': ['catastro_especies_frutales', 'catastro_variedades_frutales', 'capacidad_uso_suelo'],
    'frutal': ['catastro_especies_frutales', 'catastro_variedades_frutales'],
    'cultivo': ['catastro_especies_frutales'],
    'olivo': ['catastro_especies_frutales'],
    'uva': ['catastro_especies_frutales'],
    'suelo': ['capacidad_uso_suelo'],

    // Energía
    'energia': ['energia_plantas_solares', 'energia_plantas_eolicas', 'energia_termoelectricas', 'energia_hidroelectricas'],
    'solar': ['energia_plantas_solares', 'energia_potencial_fotovoltaico'],
    'eolica': ['energia_plantas_eolicas', 'energia_potencial_eolico'],
    'termoelectrica': ['energia_termoelectricas'],

    // Geografía
    'comuna': ['limite_comunal_linea'],
    'urbano': ['limites_urbanos'],
    'glaciar': ['glaciares'],
    'volcan': ['volcanes_activos'],
    'humedal': ['humedales'],
    'salar': ['salares'],

    // Infraestructura
    'puerto': ['puertos'],
    'ferrocarril': ['red_ferroviaria'],
    'planta': ['plantas_aguas_servidas', 'plantas_embalaje'],

    // Clima y riesgos
    'escasez': ['decrero_escasez_2021', 'decrero_escasez_2022', 'decrero_escasez_2023'],
    'incendio': ['incendios_forestales'],
    'terremoto': ['grandes_terremotos'],
    'clima': ['zonas_climaticas']
};

// Palabras que indican relaciones entre capas
const RELATION_KEYWORDS = ['relacion', 'comparar', 'entre', 'versus', 'vs', 'diferencia', 'distribucion'];

// Palabras que indican agregaciones
const AGGREGATION_KEYWORDS = ['total', 'suma', 'promedio', 'cuantos', 'cuantas', 'cantidad'];

/**
 * Analiza la consulta y retorna información sobre qué capas usar
 */
export function analyzeQuery(query) {
    const normalizedQuery = query.toLowerCase();
    const words = normalizedQuery.split(/\s+/);

    // Identificar capas relevantes
    const relevantLayers = new Set();

    for (const word of words) {
        if (LAYER_KEYWORDS[word]) {
            LAYER_KEYWORDS[word].forEach(layer => relevantLayers.add(layer));
        }
    }

    // Detectar tipo de consulta
    const isRelation = RELATION_KEYWORDS.some(kw => normalizedQuery.includes(kw));
    const isAggregation = AGGREGATION_KEYWORDS.some(kw => normalizedQuery.includes(kw));
    const isCount = /cuantos|cuantas|cantidad|numero/.test(normalizedQuery);

    // Detectar filtros geográficos
    const filters = extractFilters(normalizedQuery);

    return {
        layers: Array.from(relevantLayers),
        queryType: isRelation ? 'relation' : isCount ? 'count' : isAggregation ? 'aggregation' : 'general',
        filters: filters,
        originalQuery: query
    };
}

/**
 * Extrae filtros de la consulta (ej: comuna, región)
 */
function extractFilters(query) {
    const filters = {};

    // Detectar comunas
    const comunas = ['copiapo', 'caldera', 'tierra amarilla', 'chañaral', 'diego de almagro',
        'vallenar', 'freirina', 'huasco', 'alto del carmen'];

    for (const comuna of comunas) {
        if (query.includes(comuna)) {
            filters.comuna = comuna.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        }
    }

    // Detectar años
    const yearMatch = query.match(/\b(20\d{2})\b/);
    if (yearMatch) {
        filters.year = yearMatch[1];
    }

    return filters;
}

/**
 * Genera sugerencias si no se encontraron capas
 */
export function generateSuggestions(metadata) {
    const suggestions = [
        "Puedes preguntar sobre:",
        "- Derechos de agua y su distribución",
        "- Proyectos mineros en la región",
        "- Cultivos frutales y agricultura",
        "- Energías renovables (solar, eólica)",
        "- Escasez hídrica por comuna",
        "- Relación entre minería y consumo de agua"
    ];

    return suggestions.join('\n');
}
