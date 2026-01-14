/**
 * Extrae metadatos de capas GeoJSON para el chat IA
 * @module utils/metadataExtractor
 */

/**
 * Extrae metadatos estadísticos de un GeoJSON
 * @param {string} layerName - Nombre de la capa
 * @param {object} geojsonData - Datos GeoJSON
 * @returns {object} Metadatos extraídos
 */
export function extractLayerMetadata(layerName, geojsonData) {
    if (!geojsonData || !geojsonData.features || geojsonData.features.length === 0) {
        return {
            layerName,
            count: 0,
            geometryType: 'Unknown',
            properties: [],
            stats: {},
            error: 'No features found'
        };
    }

    const features = geojsonData.features;
    const sampleProperties = features[0].properties || {};
    const propertyKeys = Object.keys(sampleProperties);
    const geometryType = features[0].geometry?.type || 'Unknown';

    const stats = generateStats(features, propertyKeys);

    return {
        layerName,
        count: features.length,
        geometryType,
        properties: propertyKeys,
        stats,
        sampleFeatures: extractTopFeatures(features, 10)
    };
}

/**
 * Genera estadísticas de un conjunto de features
 * @param {Array} features - Array de features GeoJSON
 * @param {Array} propertyKeys - Claves de propiedades a analizar
 * @returns {object} Estadísticas por propiedad
 */
function generateStats(features, propertyKeys) {
    const stats = {};
    const maxSampleSize = 1000;
    const sample = features.slice(0, maxSampleSize);

    for (const key of propertyKeys) {
        const values = sample
            .map(f => f.properties[key])
            .filter(v => v !== null && v !== undefined && v !== '');

        if (values.length === 0) continue;

        const firstValue = values[0];

        if (typeof firstValue === 'number') {
            stats[key] = {
                type: 'numeric',
                min: Math.min(...values),
                max: Math.max(...values),
                avg: values.reduce((a, b) => a + b, 0) / values.length
            };
        } else if (typeof firstValue === 'string') {
            const uniqueValues = [...new Set(values)];
            const valueCounts = {};

            values.forEach(v => {
                valueCounts[v] = (valueCounts[v] || 0) + 1;
            });

            stats[key] = {
                type: 'categorical',
                uniqueCount: uniqueValues.length,
                topValues: Object.entries(valueCounts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 10)
                    .map(([value, count]) => ({ value, count }))
            };
        }
    }

    return stats;
}

/**
 * Extrae los features más relevantes de una capa
 * @param {Array} features - Array de features GeoJSON
 * @param {number} limit - Número máximo de features a extraer
 * @returns {Array} Features más relevantes
 */
function extractTopFeatures(features, limit = 10) {
    return features.slice(0, limit).map(f => ({
        properties: f.properties,
        geometryType: f.geometry?.type
    }));
}

/**
 * Convierte metadatos a formato de contexto para el chat IA
 * @param {object} allMetadata - Objeto con metadatos de todas las capas
 * @returns {string} Contexto formateado para el prompt
 */
export function formatMetadataForChat(allMetadata) {
    let context = '# DATOS DISPONIBLES DEL VISOR TERRITORIAL\n\n';

    const totalLayers = Object.keys(allMetadata).length;
    const totalFeatures = Object.values(allMetadata).reduce((sum, meta) => sum + meta.count, 0);

    context += `Total de capas: ${totalLayers}\n`;
    context += `Total de elementos: ${totalFeatures}\n\n`;

    for (const [layerName, metadata] of Object.entries(allMetadata)) {
        if (metadata.error || metadata.count === 0) continue;

        context += `## ${layerName}\n`;
        context += `- Tipo: ${metadata.geometryType}\n`;
        context += `- Cantidad: ${metadata.count} elementos\n`;

        if (metadata.properties && metadata.properties.length > 0) {
            context += `- Propiedades: ${metadata.properties.join(', ')}\n`;
        }

        if (metadata.stats && Object.keys(metadata.stats).length > 0) {
            context += '- Estadísticas:\n';

            for (const [prop, stat] of Object.entries(metadata.stats)) {
                if (stat.type === 'numeric') {
                    context += `  * ${prop}: min=${stat.min}, max=${stat.max}, promedio=${stat.avg.toFixed(2)}\n`;
                } else if (stat.type === 'categorical' && stat.topValues) {
                    const topValuesStr = stat.topValues
                        .slice(0, 5)
                        .map(v => `${v.value} (${v.count})`)
                        .join(', ');
                    context += `  * ${prop}: ${topValuesStr}\n`;
                }
            }
        }

        context += '\n';
    }

    return context;
}

/**
 * Obtiene todas las configuraciones de capas del proyecto
 * @param {object} temasConfig - Configuración de todos los temas (allTemasConfig)
 * @returns {Array} Array de configuraciones de capas
 */
export function getAllLayerConfigs(temasConfig) {
    const configs = [];

    if (!temasConfig) return configs;

    for (const [dimension, dimensionModule] of Object.entries(temasConfig)) {
        try {
            if (dimensionModule && dimensionModule.estilo) {
                for (const [layerName, layerConfig] of Object.entries(dimensionModule.estilo)) {
                    if (layerConfig.url) {
                        configs.push({
                            name: layerName,
                            dimension,
                            config: layerConfig
                        });
                    }
                }
            }
        } catch (err) {
            console.warn(`Error obteniendo configuración de dimensión ${dimension}:`, err);
        }
    }

    return configs;
}
