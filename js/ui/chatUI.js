/**
 * chatUI.js — Panel de chat con el asistente IA
 *
 * Icono en la navbar + sidebar deslizante desde el derecho (mismo patrón
 * visual que el sidebar de Leyenda). Renderiza la conversación y envía las
 * consultas a `chatAssistant`. El contexto territorial se precarga solo,
 * en segundo plano, al cargar la página (ver `app.js`).
 *
 * Ubicación: /js/ui/chatUI.js
 * @module ui/chatUI
 */

import { startChatPreload, sendMessage } from "../utils/chatAssistant.js";
import { createContextLogger } from "../utils/logger.js";

const log = createContextLogger("ChatUI");

// ── Estado local del módulo ────────────────────────────────────
let chatSidebar = null;
let chatBtn = null;
let closeBtn = null;
let messagesEl = null;
let inputEl = null;
let sendBtn = null;

let isOpen = false;
let isSending = false;
let messageHistory = [];

const TRANSITION_MS = 300;

function isMobile() {
  return window.innerWidth < 769;
}

/**
 * El `.main-layout` es un contenedor con `overflow: hidden` que puede
 * desplazarse si el navegador hace scroll para enfocar un elemento fuera
 * de vista. Se fuerza el reset para que el panel nunca "corra" de sitio.
 */
function resetLayoutScroll() {
  const layout = document.querySelector(".main-layout");
  if (layout && (layout.scrollLeft !== 0 || layout.scrollTop !== 0)) {
    layout.scrollLeft = 0;
    layout.scrollTop = 0;
  }
}

// ── Render de mensajes ─────────────────────────────────────────

function scrollToBottom() {
  if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
}

/**
 * Agrega un mensaje a la conversación.
 * Se usa `textContent` (nunca `innerHTML`) para que la respuesta del modelo
 * no pueda inyectar HTML: la sanitización es estructural, no por regex.
 *
 * @param {string} text - Contenido del mensaje
 * @param {string} sender - "user" | "assistant" | "error"
 * @returns {HTMLElement} Elemento creado
 */
function addMessage(text, sender) {
  const msg = document.createElement("div");
  msg.className = `ai-message ${sender}`;
  msg.textContent = text;
  messagesEl.appendChild(msg);
  scrollToBottom();
  return msg;
}

function addTypingIndicator() {
  const typing = document.createElement("div");
  typing.className = "ai-message assistant typing";
  typing.setAttribute("aria-label", "El asistente está escribiendo");
  typing.innerHTML = '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>';
  messagesEl.appendChild(typing);
  scrollToBottom();
  return typing;
}

// ── Apertura / cierre del panel ────────────────────────────────

function openChat() {
  if (isOpen || !chatSidebar) return;
  isOpen = true;

  chatSidebar.classList.add("active");
  chatSidebar.setAttribute("aria-hidden", "false");
  chatSidebar.removeAttribute("inert");
  chatBtn?.setAttribute("aria-expanded", "true");
  chatBtn?.classList.add("icon-btn--active");

  // Red de seguridad: si el usuario abre el chat antes de que `app.js`
  // dispare la precarga, esta llamada la arranca (es idempotente).
  startChatPreload();

  setTimeout(() => {
    inputEl?.focus({ preventScroll: true });
    resetLayoutScroll();
  }, TRANSITION_MS);
  log.debug("Panel de chat abierto");
}

function closeChat() {
  if (!isOpen || !chatSidebar) return;
  isOpen = false;

  chatSidebar.classList.remove("active");
  chatSidebar.setAttribute("aria-hidden", "true");
  chatSidebar.setAttribute("inert", "");
  chatBtn?.setAttribute("aria-expanded", "false");
  chatBtn?.classList.remove("icon-btn--active");

  chatBtn?.focus({ preventScroll: true });
  resetLayoutScroll();
  log.debug("Panel de chat cerrado");
}

function toggleChat() {
  if (isOpen) closeChat();
  else openChat();
}

// ── Envío de consultas ─────────────────────────────────────────

async function handleSend() {
  const text = (inputEl?.value || "").trim();
  if (!text || isSending) return;

  isSending = true;
  if (sendBtn) sendBtn.disabled = true;
  if (inputEl) inputEl.value = "";

  addMessage(text, "user");
  messageHistory.push({ role: "user", content: text });

  const typing = addTypingIndicator();

  try {
    const response = await sendMessage(text, messageHistory.slice(0, -1));
    typing.remove();
    addMessage(response, "assistant");
    messageHistory.push({ role: "assistant", content: response });

    // Historial acotado para no inflar el payload
    if (messageHistory.length > 12) messageHistory = messageHistory.slice(-12);
  } catch (err) {
    typing.remove();
    addMessage(
      `⚠️ ${err?.message || "Lo siento, hubo un error al procesar tu solicitud."}`,
      "error"
    );
    log.error("Error al enviar consulta al asistente:", err);
  } finally {
    isSending = false;
    if (sendBtn) sendBtn.disabled = false;
    inputEl?.focus({ preventScroll: true });
    resetLayoutScroll();
  }
}

// ── Inicialización ─────────────────────────────────────────────

export function initChatUI() {
  chatSidebar = document.getElementById("chatSidebar");
  chatBtn = document.getElementById("chatSidebarBtn");
  closeBtn = document.getElementById("closeChatSidebarBtn");
  messagesEl = document.getElementById("ai-chat-messages");
  inputEl = document.getElementById("ai-chat-input");
  sendBtn = document.getElementById("ai-chat-send");

  if (!chatSidebar || !chatBtn || !messagesEl || !inputEl) {
    log.error("No se encontró la estructura del chat en el DOM.");
    return;
  }

  // El mensaje de bienvenida está partido en varias líneas en el HTML fuente;
  // con white-space: pre-wrap se verían saltos de línea raros → se normaliza.
  Array.from(messagesEl.children).forEach((el) => {
    el.textContent = el.textContent.replace(/\s+/g, " ").trim();
  });

  // Toggle desde el icono de la navbar
  chatBtn.addEventListener("click", toggleChat);
  closeBtn?.addEventListener("click", closeChat);

  // Enter para enviar
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  });
  sendBtn?.addEventListener("click", handleSend);
  document.getElementById("ai-chat-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    handleSend();
  });

  // ESC cierra el panel
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen) closeChat();
  });

  // Clic fuera del panel lo cierra en móvil (mismo patrón que los otros sidebars)
  document.addEventListener("click", (e) => {
    if (!isOpen || !isMobile()) return;
    const target = e.target;
    if (chatSidebar.contains(target) || chatBtn.contains(target)) return;
    closeChat();
  });

  // Abrir otro sidebar cierra el chat (evita paneles superpuestos)
  ["mobileLeftSidebarBtn", "mobileRightSidebarBtn"].forEach((id) => {
    document.getElementById(id)?.addEventListener("click", () => closeChat());
  });

  // La precarga de contexto no depende de la UI: la dispara `app.js`
  // al terminar la carga inicial del mapa (ver `startChatPreload`).

  log.log("UI de Chat IA inicializada");
}
