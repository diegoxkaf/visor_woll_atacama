# Visor Territorial Atacama Andes Value - Documentación Técnica Superior

## 🚀 Descripción General

El **Visor Territorial Atacama Andes Value** es una plataforma SIG (Sistema de Información Geográfica) diseñada para la gestión y visualización de datos estratégicos en la Región de Atacama. La plataforma integra visualización geoespacial con una capa de inteligencia artificial para democratizar el acceso al análisis de datos territoriales.

---

## 🏗️ Arquitectura del Sistema

La aplicación sigue un patrón de **Arquitectura Modular de Capas** desacopladas.

### 🧩 Capas de la Aplicación

1.  **Capa de Presentación (UI/UX):**
    *   Interfaz basada en **Leaflet.js** y **Vanilla CSS/JS**.
    *   Dashboard dual con Sidebars dinámicos para control de capas y resultados de búsqueda.
    *   Adaptabilidad total (Responsive Design) para dispositivos móviles y estaciones de trabajo.

2.  **Capa de Lógica de Negocio (Utils):**
    *   `layerUtils.js`: Motor de gestión de ciclos de vida de capas (GeoJSON/WMS).
    *   `searchControl.js`: Motor de búsqueda semántica y espacial con indexación local.
    *   `themeUtils.js`: Gestor de dimensiones temáticas y estados visuales.

3.  **Capa de Inteligencia Artificial (AI Agent):**
    *   **Backend**: Funciones Serverless en Vercel (`api/chat.js`).
    *   **LLM**: Integración con modelos de lenguaje masivos vía **Groq**.
    *   **Context Aware**: Sistema de indexación geográfica que permite a la IA entender la topología del territorio.

4.  **Capa de Datos y Estado:**
    *   **Single Source of Truth**: Gestión de estado centralizada en `appState.js`.
    *   **Data Lake Local**: Repositorio de GeoJSONs optimizados.
    *   **Web Workers**: Procesamiento de datos pesados fuera del hilo principal.

---

## 📂 Guía de Archivos y Directorios

### 📄 JavaScript (`/js`)

#### `js/config/` (Configuración Dinámica)
*   **`allTemasConfig.js`**: Centraliza todas las dimensiones. Es el punto de unión.
*   **`agua.js`, `mineria.js`, etc.**: Archivos específicos por dimensión. Contienen la definición de capas, grupos y estilos.
*   **`capasBase.js`**: Configuración de los mapas base (OpenStreetMap, Satélite, etc.).
*   **`constants.js`**: Valores globales como coordenadas iniciales, niveles de zoom y selectores DOM.
*   **`leyendaAliases.js`**: Diccionario para traducir nombres técnicos a nombres legibles en la leyenda.

#### `js/utils/` (Motores Lógicos)
*   **`layerUtils.js`**: Carga, visualización y filtrado de capas GeoJSON y WMS.
*   **`sidebarUtils.js`**: Gestión de la interfaz de usuario de los paneles laterales.
*   **`searchControl.js`**: Motor de búsqueda interna que indexa las propiedades de las capas.
*   **`styleUtils.js`**: Define cómo se ven los puntos, líneas y polígonos.
*   **`popupUtils.js`**: Gestiona el formato y contenido de las burbujas de información.
*   **`errorHandler.js`**: Captura errores para evitar que la aplicación se detenga.
*   **`logger.js`**: Registra eventos en la consola para depuración profesional.

### 🎨 Estilos (`/css`)
*   **`base.css`**: Define la paleta de colores corporativa (vía variables CSS), tipografía y el layout estructural.
*   **`components.css`**: Estilos específicos para botones, formularios, paneles laterales y popups.
*   **`mobile.css`**: Ajustes específicos para que la experiencia sea fluida en teléfonos y tablets.

### 🖼️ Activos (`/assets`)
*   **`/icons`**: Aloja los archivos `.png` o `.svg` usados para los marcadores en el mapa.
*   **`/img`**: Logotipos y recursos visuales de la interfaz.

---

## ⚙️ Manual de Configuración de Capas

Para agregar o modificar una capa, debe editar el archivo correspondiente en `js/config/`.

### Estructura de una Capa:
```javascript
nombre_capa: {
  url: "archivo.geojson",          // Nombre del archivo en la carpeta /geojson
  type: "point",                  // point, line o polygon
  atributo: "NOMBRE_REGION",       // Atributo base para el filtrado/colores
  nombrePersonalizado: "Mi Capa",  // Título que verá el usuario
  iconos: {                       // Solo para puntos
    "ValorAtributo": "icono.png"
  },
  colores: {                      // Solo para polígonos/líneas
    "ValorAtributo": "#HEXCODE"
  },
  estiloBase: {                   // Propiedades visuales fijas
    weight: 2,
    color: "#000",
    fillOpacity: 0.5
  },
  popupCampos: ["NOMBRE", "ESTADO"], // Campos a mostrar en el popup
  alias: {                        // Traducción de los campos del popup
    "NOMBRE": "Nombre de la Unidad",
    "ESTADO": "Situación Actual"
  },
  etiquetas: {                    // Configuración de texto sobre el mapa
    campo: "NOMBRE",
    estilo: { color: "#fff", fontSize: "10px" }
  }
}
```

---

## 🛠️ Guía de Desarrollo

### Gestión del Estado
Nunca modifique el DOM directamente para estados globales. Use `appState.js`:
```javascript
import { appState } from './store/appState.js';
```

### Agregar nuevas dimensiones
1. Cree un nuevo archivo `.js` en `js/config/`.
2. Impórtelo en `allTemasConfig.js`.
3. Agréguelo al objeto `allTemasConfig`.

---

## 🚢 Despliegue (Vercel)

El proyecto está optimizado para **Vercel**:
1. Conecte su cuenta de GitHub.
2. Configure la variable de entorno `GROQ_API_KEY`.
3. El despliegue se realizará automáticamente.

---

## 📜 Licencia y Propiedad
Proyecto desarrollado para **Atacama Andes Value**.

**Versión**: 3.0 
**Última Revisión**: Enero 2026
