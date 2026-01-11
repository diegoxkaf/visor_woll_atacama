# Visor Territorial Atacama Andes Value - Documentación Técnica Superior

## 🚀 Descripción General

El **Visor Territorial Atacama Andes Value** es una plataforma SIG (Sistema de Información Geográfica) de última generación diseñada para la gestión y visualización de datos estratégicos en la Región de Atacama. La plataforma integra visualización geoespacial avanzada con una capa de inteligencia artificial para democratizar el acceso al análisis de datos territoriales.

---

## 🏗️ Arquitectura del Sistema

La aplicación sigue un patrón de **Arquitectura Modular de Capas** desacopladas, lo que garantiza escalabilidad, mantenibilidad y alto rendimiento.

### 🧩 Capas de la Aplicación

1.  **Capa de Presentación (UI/UX):**
    *   Interfaz basada en **Leaflet.js** y **Vanilla CSS/JS** para máxima velocidad.
    *   Dashboard dual con Sidebars dinámicos para control de capas y resultados de búsqueda.
    *   Adaptabilidad total (Responsive Design) para dispositivos móviles y estaciones de trabajo.

2.  **Capa de Lógica de Negocio (Utils):**
    *   `layerUtils.js`: Motor de gestión de ciclos de vida de capas (GeoJSON/WMS).
    *   `searchControl.js`: Motor de búsqueda semántica y espacial con indexación local.
    *   `themeUtils.js`: Gestor de dimensiones temáticas y estados visuales.

3.  **Capa de Inteligencia Artificial (AI Agent):**
    *   **Backend**: Funciones Serverless en Vercel (`api/chat.js`).
    *   **LLM**: Integración con modelos de lenguaje masivos vía **Groq**.
    *   **Context Aware**: Sistema de indexación geográfica (`geojson-indexer.js`) que permite a la IA entender la topología del territorio.

4.  **Capa de Datos y Estado:**
    *   **Single Source of Truth**: Gestión de estado centralizada en `appState.js`.
    *   **Data Lake Local**: Repositorio de GeoJSONs optimizados en la raíz del proyecto.
    *   **Web Workers**: Procesamiento de datos pesados fuera del hilo principal de la interfaz para evitar bloqueos.

---

## 📂 Estructura de Directorios

```text
Visor_Atacama/
├── api/                      # 🤖 Backend AI (Serverless Functions)
│   ├── chat.js               # Endpoint principal de la IA
│   ├── context-builder.js    # Construcción de contexto territorial para el LLM
│   ├── geojson-indexer.js    # Transformación de GeoJSON a índices de búsqueda IA
│   └── query-analyzer.js     # Análisis de intención de búsqueda
├── assets/                   # 🎨 Recursos estáticos (iconos, imágenes)
├── css/                      # 💅 Estilos (Base, Componentes, Mobile)
├── geojson/                  # 🗺️ Repositorio de datos espaciales (69+ capas)
├── js/                       # 🧠 Lógica del Cliente
│   ├── config/               # Capa de configuración inmutable (por dimensión)
│   ├── store/                # appState.js (Soterrado de estado global)
│   ├── utils/                # Utilidades modulares (Buscador, Sidebars, Capas)
│   └── workers/              # Procesamiento paralelo (Web Workers)
├── index.html                # Punto de entrada y estructura DOM
├── vercel.json               # Configuración de despliegue y ruteo
└── readme.md                 # Esta documentación
```

---

## 🌟 Funcionalidades Clave

### 1. Asistente IA Territorial
Integración de un chatbot inteligente que responde consultas sobre el mapa. La IA no solo "habla", sino que comprende las capas cargadas y puede guiar al usuario a través de la geografía regional basándose en datos reales.

### 2. Motor de Búsqueda de Alto Rendimiento
Buscador global que indexa atributos de todas las capas cargadas. Permite navegación instantánea ("FlyTo") y filtrado dinámico de información compleja.

### 3. Sistema de Dimensiones Flexibles
Arquitectura basada en "Temas" que permite alternar entre sectores (Agua, Energía, Minería, Planificación, etc.) con un solo clic, cargando grupos de capas preconfigurados y leyendas específicas.

---

## 🛠️ Guía de Desarrollo para Seniors

### Gestión del Estado
Nunca modifique el DOM directamente para estados globales. Use `appState.js`:
```javascript
import { appState } from './store/appState.js';
// El estado es reactivo a la carga de capas y cambios de dimensión
```

### Agregar nuevas capas
Para mantener la integridad, siga el flujo de configuración:
1. Agregue el `.geojson` a la carpeta `/geojson`.
2. Configure el estilo y leyendas en el archivo correspondiente dentro de `js/config/`.
3. El sistema cargará y registrará automáticamente la capa en el buscador global.

### Logging y Errores
La plataforma incluye un sistema de auditoría interna:
*   Use `logger.js` para eventos de ciclo de vida.
*   Encapsule lógica crítica en `errorHandler.js` para evitar caídas del sistema en producción.

---

## 🚢 Despliegue (Vercel)

El proyecto está optimizado para **Vercel**:
1. Conecte su cuenta de GitHub.
2. Configure la variable de entorno `GROQ_API_KEY`.
3. El despliegue se realizará automáticamente al detectar un `push` a la rama `main`.

---

## 📜 Licencia y Propiedad
Proyecto desarrollado para **Atacama Andes Value**.
Documentación y arquitectura optimizada para escalabilidad 2025-2026.

**Versión**: 3.0 (Versión Pro - Limpia)
**Última Revisión**: Enero 2026
