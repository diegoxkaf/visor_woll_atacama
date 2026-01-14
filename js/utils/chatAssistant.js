/**
 * Módulo para gestionar el asistente de chat IA con pre-carga de capas
 * @module utils/chatAssistant
 */

import { loadAllLayersForChat } from './layerUtils.js';
import { getAllLayerConfigs, extractLayerMetadata, formatMetadataForChat } from './metadataExtractor.js';
import { getLayerData } from '../store/appState.js';

let isChatInitialized = false;
let chatMetadataContext = '';

/**
 * Inicializa el asistente de chat pre-cargando todas las capas
 * @param {object} allTemasConfig - Configuración de todos los temas del proyecto
 */
export async function initializeChat(allTemasConfig) {
    if (isChatInitialized) return;

    const chatMessages = document.getElementById("ai-chat-messages");

    // Mostrar mensaje de carga
    const loadingMsg = document.createElement("div");
    loadingMsg.id = "chat-init-loading";
    loadingMsg.className = "ai-message assistant init-loading";
    loadingMsg.innerHTML = `
    <div class="d-flex align-items-center">
      <div class="spinner-border spinner-border-sm me-2" role="status"></div>
      <span>Preparando asistente IA (Cargando datos territoriales...)</span>
    </div>
    <div class="progress mt-2" style="height: 5px;">
      <div id="chat-init-progress" class="progress-bar" role="progressbar" style="width: 0%"></div>
    </div>
    <small id="chat-init-status" class="text-muted d-block mt-1">Iniciando descarga de capas...</small>
  `;
    chatMessages.appendChild(loadingMsg);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
        const layerConfigs = getAllLayerConfigs(allTemasConfig);
        const total = layerConfigs.length;

        // Cargar todas las capas GeoJSON en paralelo (sin mostrarlas en el mapa)
        await loadAllLayersForChat(layerConfigs, (loaded, total, currentLayer) => {
            const percent = Math.round((loaded / total) * 100);
            const progressBar = document.getElementById("chat-init-progress");
            const statusText = document.getElementById("chat-init-status");

            if (progressBar) progressBar.style.width = `${percent}%`;
            if (statusText) statusText.textContent = `Procesando: ${currentLayer} (${loaded}/${total})`;
        });

        // Generar metadatos de todas las capas cargadas
        const allMetadata = {};
        for (const config of layerConfigs) {
            const data = getLayerData(config.name);
            if (data) {
                allMetadata[config.name] = extractLayerMetadata(config.name, data);
            }
        }

        // Formatear contexto para el chat
        chatMetadataContext = formatMetadataForChat(allMetadata);

        // Finalizar carga
        chatMessages.removeChild(loadingMsg);

        const successMsg = document.createElement("div");
        successMsg.className = "ai-message assistant system";
        successMsg.innerHTML = `<em>¡Listo! He analizado ${total} capas territoriales. Ahora puedes hacerme preguntas sobre cualquier dato del visor.</em>`;
        chatMessages.appendChild(successMsg);

        isChatInitialized = true;
        console.log("Chat IA inicializado con contexto completo de capas.");
    } catch (err) {
        console.error("Error inicializando chat:", err);
        chatMessages.removeChild(loadingMsg);
        const errorMsg = document.createElement("div");
        errorMsg.className = "ai-message assistant system text-danger";
        errorMsg.textContent = "Hubo un error al preparar los datos para el asistente. El chat funcionará con información limitada.";
        chatMessages.appendChild(errorMsg);
    }
}

/**
 * Envía un mensaje al servidor de chat IA
 * @param {string} text - Consulta del usuario
 * @param {Array} history - Historial de mensajes previos
 */
export async function sendMessage(text, history = []) {
    try {
        const messages = [
            {
                role: 'system',
                content: `Eres un asistente experto para el Visor Territorial Water Oriented Living Lab (WoLL) de la Región de Atacama. 
        Tu objetivo es ayudar a los usuarios a entender los datos geoespaciales disponibles.
        
        A continuación se presentan los metadatos y estadísticas de TODAS las capas disponibles en el visor. 
        Utiliza esta información para responder preguntas complejas sobre conteos, promedios y distribución de datos.
        
        ${chatMetadataContext}`
            }
        ];

        // Agregar historial limitado
        const lastHistory = history.slice(-5);
        messages.push(...lastHistory);

        // Agregar mensaje actual
        messages.push({ role: 'user', content: text });

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages })
        });

        const data = await response.json();

        if (!response.ok) throw new Error(data.error || 'Error al conectar con la IA');

        return data.choices?.[0]?.message?.content || 'No recibí una respuesta clara.';
    } catch (err) {
        console.error("Error en sendMessage:", err);
        throw err;
    }
}
