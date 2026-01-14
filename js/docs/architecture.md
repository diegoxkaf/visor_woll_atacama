# Arquitectura del Sistema - Visor Territorial

## 🏗️ Visión General

El Visor Territorial sigue un patrón de **Arquitectura Modular de Capas** desacopladas, optimizado para escalabilidad y mantenibilidad.

---

## 🧩 Capas de la Aplicación

### 1. Capa de Presentación (UI/UX)

**Responsabilidad:** Renderizado visual y manejo de interacciones del usuario

**Componentes:**
- **Motor de mapas:** Leaflet.js
- **Sidebars dinámicos:** Control de capas y resultados de búsqueda
- **Sistema de themes:** CSS variables para personalización

**Características:**
- Responsive Design (móvil-first)
- Progressive Enhancement
- Accesibilidad WAI-ARIA

**Archivos clave:**
```
/css/base.css
/css/components.css
/css/mobile.css
/index.html
```

---

### 2. Capa de Lógica de Negocio (Business Logic)

**Responsabilidad:** Orquestación de funcionalidades core

**Módulos:**

#### `layerUtils.js` - Motor de Gestión de Capas
- Ciclo de vida de capas (crear, mostrar, ocultar, destruir)
- Parseo de GeoJSON
- Integración con servicios WMS
- Filtrado espacial y por atributos

#### `searchControl.js` - Motor de Búsqueda
- Indexación en tiempo real
- Búsqueda semántica (fuzzy matching)
- Filtros espaciales por bounding box
- Ranking de resultados por relevancia

#### `themeUtils.js` - Gestor de Dimensiones
- Carga dinámica de configuraciones
- Gestión de estados visuales
- Sincronización UI ↔ Estado

#### `styleUtils.js` - Motor de Estilos
- Renderizado de puntos, líneas y polígonos
- Aplicación de paletas de colores
- Gestión de iconos personalizados

**Patrón de diseño:** Strategy Pattern para estilos, Factory Pattern para capas

---

### 3. Capa de Inteligencia Artificial

**Responsabilidad:** Procesamiento de lenguaje natural y análisis contextual

**Arquitectura:**

```
┌─────────────────┐
│   Frontend      │
│  (Chat UI)      │
└────────┬────────┘
         │ HTTP POST
         ▼
┌─────────────────┐
│ Vercel Function │
│  /api/chat.js   │
└────────┬────────┘
         │ API Call
         ▼
┌─────────────────┐
│   Groq API      │
│ (LLM Inference) │
└────────┬────────┘
         │ Response
         ▼
┌─────────────────┐
│ Context Parser  │
│ (Geo-awareness) │
└─────────────────┘
```

**Características:**
- Context-aware: Entiende topología territorial
- Indexación geográfica
- Respuestas con referencias espaciales
- Caché de consultas frecuentes

**Modelo:** Llama 3.1 (70B) vía Groq

---

### 4. Capa de Datos y Estado

**Responsabilidad:** Single Source of Truth y persistencia

#### Estado Global (`appState.js`)

```javascript
{
  mapa: leafletMapInstance,
  capasActivas: Map(),
  dimensionActual: String,
  filtrosAplicados: Object,
  resultadosBusqueda: Array,
  configuracionTemas: Object
}
```

**Patrón:** Observer Pattern para reactividad

#### Data Lake Local
- **Formato:** GeoJSON optimizado
- **Estructura:** Por dimensión temática
- **Tamaño promedio:** 50KB - 2MB por archivo
- **Compresión:** Minificación de propiedades

#### Web Workers

**Uso:**
- Parseo de GeoJSON grandes (>1MB)
- Cálculos geométricos complejos
- Filtrado de datasets masivos

```javascript
// Ejemplo de uso
const worker = new Worker('/js/workers/geoProcessor.js');
worker.postMessage({ geojson: data, filter: criteria });
worker.onmessage = (e) => renderResults(e.data);
```

---

## 🔄 Flujo de Datos

### Carga de una Capa

```
Usuario selecciona capa
    ↓
themeUtils.js valida configuración
    ↓
layerUtils.js fetch GeoJSON
    ↓
Web Worker procesa datos (si es necesario)
    ↓
styleUtils.js aplica estilos
    ↓
Leaflet renderiza en mapa
    ↓
appState.js actualiza estado
    ↓
sidebarUtils.js actualiza UI
```

### Búsqueda Semántica

```
Usuario ingresa query
    ↓
searchControl.js indexa capas activas
    ↓
Fuzzy matching sobre propiedades
    ↓
Ranking por relevancia
    ↓
Filtro espacial (si aplica)
    ↓
Renderizado de resultados
    ↓
Zoom automático a selección
```

### Consulta a IA

```
Usuario envía pregunta
    ↓
POST /api/chat
    ↓
Contexto geográfico agregado
    ↓
Groq API procesa
    ↓
Response parseado
    ↓
UI actualizada con respuesta
```

---

## 🗂️ Gestión de Configuración

### Patrón de Configuración por Dimensión

Cada dimensión (agua, minería, etc.) tiene su propio archivo de configuración:

```javascript
// js/config/agua.js
export const aguaConfig = {
  grupos: {
    "Recursos Hídricos": {
      capas: {
        cuencas: { /* config */ },
        embalses: { /* config */ }
      }
    }
  }
};
```

### Consolidación Central

```javascript
// js/config/allTemasConfig.js
import { aguaConfig } from './agua.js';
import { mineriaConfig } from './mineria.js';

export const allTemasConfig = {
  agua: aguaConfig,
  mineria: mineriaConfig,
  // ...
};
```


## 🔒 Seguridad

### Frontend
- Sanitización de inputs en búsqueda
- Validación de GeoJSON antes de renderizar
- CSP (Content Security Policy) headers

### Backend (Vercel Functions)
- Rate limiting en `/api/chat`
- Validación de API keys
- CORS configurado restrictivamente

### Datos
- GeoJSON servido con HTTPS
- No se exponen datos sensibles en el cliente
- Logs sin PII (Personally Identifiable Information)

---

## ⚡ Optimización y Performance

### Estrategias Implementadas

1. **Lazy Loading:**
   - Configuraciones cargadas bajo demanda
   - Capas solo se fetchean cuando se activan

2. **Debouncing:**
   - Búsqueda con 300ms de delay
   - Zoom/Pan con throttling

3. **Caché:**
   - Service Worker para archivos estáticos (futuro)
   - Caché de respuestas de IA (5 min TTL)

4. **Compresión:**
   - GeoJSON minificados
   - Gzip en Vercel

5. **Web Workers:**
   - Procesamiento de datos fuera del main thread
   - No bloqueo de la UI

### Métricas Objetivo

| Métrica | Objetivo | Actual |
|---------|----------|--------|
| First Contentful Paint | < 1.5s | ~1.2s |
| Time to Interactive | < 3.0s | ~2.8s |
| Largest Contentful Paint | < 2.5s | ~2.1s |
| Cumulative Layout Shift | < 0.1 | ~0.05 |

---

## 🧪 Testing Strategy

### Niveles de Testing

1. **Unit Tests** (Pendiente)
   - Funciones utils/
   - Parsers de GeoJSON
   - Lógica de filtros

2. **Integration Tests** (Pendiente)
   - Flujo completo de carga de capas
   - Interacción con API de IA

3. **E2E Tests** (Pendiente)
   - Playwright/Cypress
   - User flows críticos

---

## 📊 Diagramas

### Arquitectura de Alto Nivel

```
┌─────────────────────────────────────────┐
│           NAVEGADOR                      │
│  ┌─────────────────────────────────┐   │
│  │     Capa Presentación           │   │
│  │  (HTML/CSS/Leaflet)             │   │
│  └──────────┬──────────────────────┘   │
│             │                           │
│  ┌──────────▼──────────────────────┐   │
│  │  Capa Lógica de Negocio         │   │
│  │  (Utils/Controllers)            │   │
│  └──────────┬──────────────────────┘   │
│             │                           │
│  ┌──────────▼──────────────────────┐   │
│  │   Capa de Estado                │   │
│  │   (appState.js)                 │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        ▼                 ▼
┌───────────────┐  ┌─────────────┐
│ Data Lake     │  │ Vercel API  │
│ (GeoJSON)     │  │ (IA)        │
└───────────────┘  └─────────────┘
```

---

## 🔮 Futuras Mejoras Arquitectónicas

1. **State Management Robusto:**
   - Migrar a Zustand o Redux para estado más complejo

2. **Module Federation:**
   - Permitir plugins de terceros

3. **GraphQL Layer:**
   - Queries más eficientes para datos geográficos

4. **Real-time Sync:**
   - WebSockets para colaboración en vivo

5. **Micro-frontends:**
   - Separar dimensiones en apps independientes

---

**Documento actualizado:** Enero 2026  
**Versión de arquitectura:** 3.0