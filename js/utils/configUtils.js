/**
 * Utilidades para manejo de configuración de temas y capas
 * @module utils/configUtils
 */

/**
 * Obtiene las capas que deben cargarse inicialmente según la configuración del tema.
 * Soporta: grupos, capas individuales, o ambos combinados.
 * 
 * @param {Object} temaConfig - Configuración del tema
 * @param {Object} [temaConfig.cargaInicial] - Configuración de carga inicial
 * @param {string[]} [temaConfig.cargaInicial.grupos] - Grupos a cargar inicialmente
 * @param {string[]} [temaConfig.cargaInicial.capas] - Capas individuales a cargar
 * @param {Object} [temaConfig.grupos] - Definición de grupos del tema
 * @param {string[]} [temaConfig.capas] - Lista de todas las capas del tema
 * @returns {string[]} Array con nombres de capas a cargar inicialmente
 * 
 * @example
 * const config = {
 *   grupos: {
 *     catastro: { capas: ['capa1', 'capa2'] }
 *   },
 *   cargaInicial: {
 *     grupos: ['catastro'],
 *     capas: ['limite_comunal']
 *   }
 * };
 * const capas = obtenerCapasParaCargaInicial(config);
 * // Returns: ['capa1', 'capa2', 'limite_comunal']
 */
export function obtenerCapasParaCargaInicial(temaConfig) {
    const cargaInicial = temaConfig.cargaInicial || {};
    const capasFinales = new Set();

    // 1. PROCESAR GRUPOS
    if (
        cargaInicial.grupos &&
        cargaInicial.grupos.length > 0 &&
        temaConfig.grupos
    ) {
        cargaInicial.grupos.forEach((grupoKey) => {
            if (temaConfig.grupos[grupoKey]) {
                const capasDelGrupo = temaConfig.grupos[grupoKey].capas || [];
                capasDelGrupo.forEach((capa) => capasFinales.add(capa));
            }
        });
    }

    // 2. PROCESAR CAPAS INDIVIDUALES
    if (cargaInicial.capas && cargaInicial.capas.length > 0) {
        cargaInicial.capas.forEach((capa) => capasFinales.add(capa));
    }

    // 3. SI NO HAY CONFIGURACIÓN, CARGAR TODAS
    if (capasFinales.size === 0) {
        if (temaConfig.grupos && Object.keys(temaConfig.grupos).length > 0) {
            Object.values(temaConfig.grupos).forEach((grupo) => {
                (grupo.capas || []).forEach((capa) => capasFinales.add(capa));
            });
        } else {
            (temaConfig.capas || []).forEach((capa) => capasFinales.add(capa));
        }
    }

    return Array.from(capasFinales).filter((capa) => capa);
}

/**
 * Obtiene todas las capas de una dimensión (incluyendo las agrupadas)
 * 
 * @param {Object} temaConfig - Configuración del tema
 * @param {Object} [temaConfig.grupos] - Grupos del tema
 * @param {string[]} [temaConfig.capas] - Capas del tema
 * @returns {string[]} Array con nombres de todas las capas
 */
export function obtenerTodasLasCapasDeDimension(temaConfig) {
    if (temaConfig.grupos && Object.keys(temaConfig.grupos).length > 0) {
        const capas = [];
        Object.values(temaConfig.grupos).forEach((grupo) => {
            capas.push(...grupo.capas);
        });
        return capas;
    }
    return temaConfig.capas || [];
}

/**
 * Encuentra el tema al que pertenece una capa
 * 
 * @param {string} capaNombre - Nombre de la capa
 * @param {Object} temasConfig - Configuración global de temas
 * @returns {string} Clave del tema o "otros" si no se encuentra
 */
export function encontrarTemaParaCapa(capaNombre, temasConfig) {
    if (!temasConfig || typeof temasConfig !== "object") return "otros";

    for (const temaKey of Object.keys(temasConfig)) {
        const tema = temasConfig[temaKey];
        if (tema && Array.isArray(tema.capas) && tema.capas.includes(capaNombre)) {
            return temaKey;
        }
    }
    return "otros";
}

/**
 * Obtiene el nombre personalizado de una capa
 * 
 * @param {string} capaNombre - Nombre de la capa
 * @param {string} temaActivo - Tema activo
 * @param {Object} temasConfig - Configuración de temas
 * @returns {string} Nombre personalizado o nombre original
 */
export function obtenerNombrePersonalizado(capaNombre, temaActivo, temasConfig) {
    if (temasConfig[temaActivo]?.estilo?.[capaNombre]?.nombrePersonalizado) {
        return temasConfig[temaActivo].estilo[capaNombre].nombrePersonalizado;
    }

    for (const tema in temasConfig) {
        if (temasConfig[tema]?.estilo?.[capaNombre]?.nombrePersonalizado) {
            return temasConfig[tema].estilo[capaNombre].nombrePersonalizado;
        }
    }

    return capaNombre;
}
