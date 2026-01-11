// Maneja los temas o Dimensiones (sidebar izquierdo)

import { cargarCapasGeoJSON, limpiarMapa } from './layerUtils.js';

/**
 * Maneja el cambio de tema, limpiando capas anteriores y cargando las nuevas.
 * @param {string} nuevoTema - El nombre del nuevo tema.
 * @param {L.Map} map - La instancia del mapa de Leaflet.
 * @param {L.TileLayer} capaBaseActual - La capa base actual.
 * @param {Array} capasOrdenadas - Array de capas ordenadas.
 * @param {object} allTemasConfig - Configuración de todos los temas.
 */
export function manejarCambioTema(nuevoTema, map, capaBaseActual, capasOrdenadas, allTemasConfig) {


    // Verificar que el tema existe
    if (!allTemasConfig[nuevoTema]) {
        console.error(`Tema '${nuevoTema}' no encontrado en la configuración`);
        return;
    }

    try {
        // Limpiar capas anteriores del mapa
        limpiarMapa(capaBaseActual);

        // Cargar las capas del nuevo tema
        cargarCapasGeoJSON(nuevoTema, allTemasConfig);



        // Actualizar cualquier UI adicional relacionada con el tema
        actualizarUITema(nuevoTema, allTemasConfig);

    } catch (error) {
        console.error(`Error al cambiar tema a ${nuevoTema}:`, error);
    }
}

/**
 * Actualiza elementos de UI específicos del tema (como leyendas, etc.)
 * @param {string} tema - El tema activo
 * @param {object} allTemasConfig - Configuración de todos los temas
 */
function actualizarUITema(tema, allTemasConfig) {
    // Aquí puedes agregar lógica para actualizar leyendas, 
    // colores de UI, o cualquier otro elemento específico del tema

    const temaConfig = allTemasConfig[tema];

    // Ejemplo: actualizar título del tema si existe
    const tituloTema = document.getElementById('titulo-tema');
    if (tituloTema) {
        tituloTema.textContent = tema.charAt(0).toUpperCase() + tema.slice(1);
    }

    // Ejemplo: actualizar leyenda si existe
    if (temaConfig.leyenda) {
        actualizarLeyenda(temaConfig.leyenda);
    }


}

/**
 * Actualiza la leyenda del mapa según el tema activo
 * @param {object} leyendaConfig - Configuración de la leyenda
 */
function actualizarLeyenda(leyendaConfig) {
    const contenedorLeyenda = document.getElementById('leyenda-container');
    if (!contenedorLeyenda) {
        return;
    }

    // Limpiar leyenda anterior
    contenedorLeyenda.innerHTML = '';

    // Crear nueva leyenda
    Object.entries(leyendaConfig).forEach(([capa, config]) => {
        const leyendaDiv = document.createElement('div');
        leyendaDiv.classList.add('leyenda-item', 'mb-3');

        const titulo = document.createElement('h6');
        titulo.textContent = config.titulo;
        titulo.classList.add('leyenda-titulo');
        leyendaDiv.appendChild(titulo);

        const itemsContainer = document.createElement('div');
        itemsContainer.classList.add('leyenda-items');

        config.items.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('leyenda-item-row', 'd-flex', 'align-items-center', 'mb-1');

            const colorBox = document.createElement('div');
            colorBox.style.width = '20px';
            colorBox.style.height = '20px';
            colorBox.style.backgroundColor = item.color;
            colorBox.style.marginRight = '8px';
            colorBox.style.border = '1px solid #ccc';

            const label = document.createElement('span');
            label.textContent = item.label;
            label.style.fontSize = '12px';

            itemDiv.appendChild(colorBox);
            itemDiv.appendChild(label);
            itemsContainer.appendChild(itemDiv);
        });

        leyendaDiv.appendChild(itemsContainer);
        contenedorLeyenda.appendChild(leyendaDiv);
    });
}