/**
 * Construye el contexto para enviar a Groq basándose en los metadatos
 */

/**
 * Construye un contexto rico para la IA
 */
export function buildContext(analysis, metadata) {
    const { layers, queryType, filters } = analysis;

    if (layers.length === 0) {
        return {
            context: "No se identificaron capas específicas en la consulta. Datos disponibles en el visor territorial de la Región de Atacama.",
            hasData: false
        };
    }

    let contextParts = [];
    contextParts.push("=== DATOS DEL VISOR TERRITORIAL WOLL - REGIÓN DE ATACAMA ===\n");

    // Agregar información de cada capa relevante
    for (const layerName of layers) {
        const layerData = metadata[layerName];

        if (!layerData) continue;

        const layerContext = buildLayerContext(layerName, layerData, filters);
        if (layerContext) {
            contextParts.push(layerContext);
        }
    }

    // Si es una consulta de relación, agregar análisis cruzado
    if (queryType === 'relation' && layers.length >= 2) {
        contextParts.push(buildRelationContext(layers, metadata));
    }

    const fullContext = contextParts.join('\n\n');

    return {
        context: fullContext,
        hasData: layers.length > 0,
        layerCount: layers.length
    };
}

/**
 * Construye el contexto para una capa específica
 */
function buildLayerContext(layerName, layerData, filters) {
    const friendlyName = formatLayerName(layerName);
    let context = `## ${friendlyName}\n`;
    context += `- Total de registros: ${layerData.count}\n`;
    context += `- Tipo de geometría: ${layerData.geometryType}\n`;

    // Agregar estadísticas relevantes
    if (layerData.stats) {
        context += buildStatsContext(layerData.stats, filters);
    }

    return context;
}

/**
 * Construye contexto de estadísticas
 */
function buildStatsContext(stats, filters) {
    let statsText = '';

    // Priorizar propiedades importantes
    const priorityProps = ['Uso del Agua', 'Comuna', 'Mineral', 'Estado', 'especie', 'Nombre', 'Compañia'];

    for (const prop of priorityProps) {
        if (stats[prop] && stats[prop].type === 'categorical') {
            statsText += `\n### ${prop}:\n`;

            const topValues = stats[prop].topValues || [];
            for (const { value, count } of topValues.slice(0, 5)) {
                const percentage = ((count / stats[prop].uniqueCount) * 100).toFixed(1);
                statsText += `  - ${value}: ${count} (${percentage}%)\n`;
            }
        } else if (stats[prop] && stats[prop].type === 'numeric') {
            statsText += `\n### ${prop}:\n`;
            statsText += `  - Mínimo: ${stats[prop].min}\n`;
            statsText += `  - Máximo: ${stats[prop].max}\n`;
            statsText += `  - Promedio: ${stats[prop].avg.toFixed(2)}\n`;
        }
    }

    return statsText;
}

/**
 * Construye contexto para relaciones entre capas
 */
function buildRelationContext(layers, metadata) {
    let relationText = '\n## ANÁLISIS DE RELACIÓN\n';

    // Ejemplo: relación agua-minería
    if (layers.includes('derechos_agua_2025') && layers.includes('sonami_mapa_minero')) {
        const aguaData = metadata['derechos_agua_2025'];
        const mineriaData = metadata['sonami_mapa_minero'];

        if (aguaData && mineriaData) {
            relationText += `\nSe identificaron ${aguaData.count} derechos de agua y ${mineriaData.count} proyectos mineros en la región.\n`;

            // Buscar uso minero en derechos de agua
            const usoStats = aguaData.stats['Uso del Agua'];
            if (usoStats) {
                const usoMineria = usoStats.topValues?.find(v => v.value.toLowerCase().includes('miner'));
                if (usoMineria) {
                    relationText += `De los derechos de agua, ${usoMineria.count} están asociados a uso minero.\n`;
                }
            }
        }
    }

    return relationText;
}

/**
 * Formatea el nombre de la capa para hacerlo más legible
 */
function formatLayerName(layerName) {
    const nameMap = {
        'derechos_agua_2025': 'Derechos de Agua (2025)',
        'sonami_mapa_minero': 'Mapa Minero (SONAMI)',
        'catastro_especies_frutales': 'Catastro de Especies Frutales',
        'catastro_variedades_frutales': 'Catastro de Variedades Frutales',
        'energia_plantas_solares': 'Plantas de Energía Solar',
        'energia_plantas_eolicas': 'Plantas de Energía Eólica',
        'glaciares': 'Glaciares',
        'relaves_mineros_sernageomin': 'Relaves Mineros (SERNAGEOMIN)',
        'cuencas_dga': 'Cuencas Hidrográficas (DGA)',
        'decrero_escasez_2023': 'Decreto de Escasez Hídrica 2023'
    };

    return nameMap[layerName] || layerName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Limita el contexto a un número máximo de tokens (aproximado)
 */
export function limitContextTokens(context, maxTokens = 2000) {
    // Aproximación: 1 token ≈ 4 caracteres
    const maxChars = maxTokens * 4;

    if (context.length <= maxChars) {
        return context;
    }

    return context.substring(0, maxChars) + '\n\n[Contexto truncado por límite de tokens]';
}
