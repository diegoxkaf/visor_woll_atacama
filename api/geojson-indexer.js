import fs from 'fs';
import path from 'path';

// Caché global para metadatos (persiste durante la vida de la función)
let metadataCache = null;

/**
 * Indexa todos los archivos GeoJSON y extrae metadatos
 */
export async function indexGeoJSON() {
    // Si ya está en caché, retornar inmediatamente
    if (metadataCache) {
        return metadataCache;
    }

    const geojsonDir = path.join(process.cwd(), 'geojson');
    const metadata = {};

    try {
        const files = fs.readdirSync(geojsonDir).filter(f => f.endsWith('.geojson'));

        for (const file of files) {
            const layerName = file.replace('.geojson', '');
            const filePath = path.join(geojsonDir, file);

            try {
                const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

                if (!data.features || data.features.length === 0) {
                    continue;
                }

                // Extraer propiedades del primer feature como muestra
                const sampleProperties = data.features[0].properties || {};
                const propertyKeys = Object.keys(sampleProperties);

                // Generar estadísticas básicas
                const stats = generateStats(data.features, propertyKeys);

                metadata[layerName] = {
                    count: data.features.length,
                    properties: propertyKeys,
                    stats: stats,
                    geometryType: data.features[0].geometry?.type || 'Unknown'
                };
            } catch (err) {
                console.error(`Error procesando ${file}:`, err.message);
            }
        }

        metadataCache = metadata;
        return metadata;
    } catch (error) {
        console.error('Error indexando GeoJSON:', error);
        return {};
    }
}

/**
 * Genera estadísticas de un conjunto de features
 */
function generateStats(features, propertyKeys) {
    const stats = {};
    const maxSampleSize = 1000; // Limitar muestreo para archivos grandes
    const sample = features.slice(0, maxSampleSize);

    for (const key of propertyKeys) {
        const values = sample
            .map(f => f.properties[key])
            .filter(v => v !== null && v !== undefined && v !== '');

        if (values.length === 0) continue;

        // Detectar tipo de dato
        const firstValue = values[0];

        if (typeof firstValue === 'number') {
            // Estadísticas numéricas
            stats[key] = {
                type: 'numeric',
                min: Math.min(...values),
                max: Math.max(...values),
                avg: values.reduce((a, b) => a + b, 0) / values.length
            };
        } else if (typeof firstValue === 'string') {
            // Valores únicos para strings (máximo 20)
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
 * Carga un GeoJSON completo (usar solo cuando sea necesario)
 */
export function loadGeoJSON(layerName) {
    const filePath = path.join(process.cwd(), 'geojson', `${layerName}.geojson`);

    try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        return data.features || [];
    } catch (error) {
        console.error(`Error cargando ${layerName}:`, error.message);
        return [];
    }
}

/**
 * Filtra features por propiedades
 */
export function filterFeatures(features, filters) {
    return features.filter(feature => {
        for (const [key, value] of Object.entries(filters)) {
            const propValue = feature.properties[key];

            if (typeof value === 'string') {
                if (!propValue || !propValue.toLowerCase().includes(value.toLowerCase())) {
                    return false;
                }
            } else if (typeof value === 'number') {
                if (propValue !== value) {
                    return false;
                }
            }
        }
        return true;
    });
}
