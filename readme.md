# Visor Territorial Water Oriented Living Lab - Documentación Técnica

## 📋 Tabla de Contenidos

1. [Introducción](#introducción)
2. [Arquitectura del Proyecto](#arquitectura-del-proyecto)
3. [Instalación](#instalación)
4. [Configuración](#configuración)
5. [API de Funciones](#api-de-funciones)
6. [Guía de Desarrollo](#guía-de-desarrollo)

---

## Introducción

El **Visor Territorial Water Oriented Living Lab (WoLL)** es una aplicación web interactiva para visualizar información geoespacial de la Región de Atacama en múltiples dimensiones temáticas.

### Características Principales

- ✅ Visualización de capas GeoJSON y servicios WMS
- ✅ Sistema de dimensiones temáticas con grupos de capas
- ✅ Leyendas automáticas y manuales
- ✅ Popups personalizados con información de features
- ✅ Diseño responsive (desktop y mobile)
- ✅ **Estado centralizado** con `appState`
- ✅ **Sistema de logging estructurado**
- ✅ **Manejo robusto de errores**
- ✅ **Arquitectura modular refactorizada**

### Tecnologías

- **Leaflet 1.9.4** - Librería de mapas
- **Bootstrap 5.3.0** - Framework CSS
- **JavaScript ES6 Modules** - Arquitectura modular
- **GeoJSON** - Formato de datos geoespaciales
- **WMS** - Web Map Services

---

## Arquitectura del Proyecto

### Estructura de Carpetas

```
project/
├── index.html                    # Página principal
├── readme.md                     # Esta documentación
│
├── assets/
│   ├── icons/                    # Iconos para marcadores
│   └── img/                      # Imágenes del proyecto
│
├── css/
│   ├── base.css                  # Variables y estilos base
│   ├── components.css            # Componentes reutilizables
│   └── mobile.css                # Estilos responsive
│
├── js/
│   ├── app.js                    # Punto de entrada principal
│   │
│   ├── config/                   # 📁 Configuración
│   │   ├── allTemasConfig.js     # Configuración global de dimensiones
│   │   ├── capasBase.js          # Capas base del mapa
│   │   ├── constants.js          # 🆕 Constantes centralizadas
│   │   ├── leyendaAliases.js     # Alias globales para leyenda
│   │   ├── wms_services.js       # Servicios WMS
│   │   └── [dimensiones]/        # Configuración por dimensión
│   │       ├── agua.js
│   │       ├── agricultura.js
│   │       ├── energia.js
│   │       └── mineria.js
│   │
│   ├── store/                    # 📁 Estado Global
│   │   └── appState.js           # 🆕 Estado centralizado (Single Source of Truth)
│   │
│   └── utils/                    # 📁 Utilidades
│       ├── configUtils.js        # 🆕 Utilidades de configuración
│       ├── errorHandler.js       # 🆕 Manejo centralizado de errores
│       ├── logger.js             # 🆕 Sistema de logging estructurado
│       ├── layerUtils.js         # ✅ Gestión de capas (refactorizado)
│       ├── legendUtils.js        # ✅ Generación de leyendas (refactorizado)
│       ├── mapUtils.js           # ✅ Funciones del mapa (refactorizado)
│       ├── sidebarUtils.js       # ✅ Gestión de sidebars (refactorizado)
│       ├── styleUtils.js         # Estilos de features
│       └── popupUtils.js         # Gestión de popups
│
└── data/
    └── geojson/                  # Archivos GeoJSON
```

### Arquitectura Refactorizada

#### 🎯 Principios de Diseño

1. **Single Source of Truth**: Todo el estado en `appState.js`
2. **Separación de Responsabilidades**: Cada módulo tiene una función clara
3. **Manejo Robusto de Errores**: Sistema centralizado con clases de error personalizadas
4. **Logging Estructurado**: Sistema de logs con niveles y contextos
5. **Sin Duplicación**: Código DRY (Don't Repeat Yourself)

#### 📊 Flujo de Datos

```
┌─────────────┐
│   Usuario   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│           UI (Sidebar/Navbar)               │
└──────┬──────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│         sidebarUtils.js                     │
│  - Construcción de UI                       │
│  - Event listeners                          │
└──────┬──────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│         layerUtils.js                       │
│  - Carga de capas GeoJSON/WMS              │
│  - Gestión de visibilidad                  │
└──────┬──────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│         appState.js                         │
│  - Estado centralizado del mapa            │
│  - Gestión de capas cargadas               │
└──────┬──────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│         Leaflet Map                         │
│  - Renderizado visual                      │
└─────────────────────────────────────────────┘
       │
       ├──► styleUtils.js → Estilos
       ├──► legendUtils.js → Leyenda
       └──► popupUtils.js → Popups
```

---

## Instalación

### Requisitos

- Servidor web local (Live Server, http-server, etc.)
- Navegador moderno con soporte ES6 Modules

### Pasos

1. **Clonar o descargar el proyecto**

2. **Iniciar servidor local**
   ```bash
   # Opción 1: Live Server (VS Code)
   # Click derecho en index.html → "Open with Live Server"
   
   # Opción 2: http-server (Node.js)
   npx http-server -p 3000
   
   # Opción 3: Python
   python -m http.server 3000
   ```

3. **Abrir en navegador**
   ```
   http://localhost:3000
   ```

---

## Configuración

### 1. Configurar Dimensiones Temáticas

Editar `/js/config/allTemasConfig.js`:

```javascript
export default {
  agua: {
    nombre: "Agua",
    capas: ["hidrografia", "lagunas", "glaciares"],
    cargaInicial: ["hidrografia"],
    grupos: {
      superficial: {
        nombre: "Agua Superficial",
        capas: ["hidrografia", "lagunas"]
      }
    },
    estilo: {
      hidrografia: {
        type: "line",
        nombrePersonalizado: "Hidrografía",
        color: "#0066cc",
        weight: 2
      }
    }
  }
};
```

### 2. Configurar Capas Base

Editar `/js/config/capasBase.js`:

```javascript
export default {
  osm: {
    nombre: "OpenStreetMap",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    activo: true
  }
};
```

### 3. Configurar Constantes

Editar `/js/config/constants.js`:

```javascript
export const MAP_CONFIG = {
  DEFAULT_CENTER: [-27.4539, -70.0727],
  DEFAULT_ZOOM: 7,
  MAX_ZOOM: 19
};
```

---

## API de Funciones

### 📦 appState.js - Estado Centralizado

```javascript
import { appState, initializeMap, addLayer, getLayer } from './store/appState.js';

// Inicializar mapa
initializeMap(mapInstance);

// Agregar capa
addLayer('hidrografia', geojsonLayer);

// Obtener capa
const layer = getLayer('hidrografia');

// Verificar si está cargada
if (appState.layers.loaded.has('hidrografia')) {
  // ...
}
```

**Funciones disponibles:**
- `initializeMap(map)` - Inicializa el mapa
- `setCurrentBaseLayer(layer)` - Establece capa base
- `setActiveTema(temaName)` - Establece tema activo
- `addLayer(name, layer)` - Agrega capa al estado
- `getLayer(name)` - Obtiene capa por nombre
- `removeLayer(name)` - Elimina capa del estado
- `markLayerAsLoaded(name)` - Marca capa como cargada
- `isLayerLoaded(name)` - Verifica si capa está cargada
- `clearAllLayers()` - Limpia todas las capas
- `setActiveDimension(dimension)` - Establece dimensión activa
- `getActiveDimension()` - Obtiene dimensión activa

### 📝 logger.js - Sistema de Logging

```javascript
import { logger, createContextLogger } from './utils/logger.js';

// Logger global
logger.info('Aplicación iniciada');
logger.warn('Advertencia');
logger.error('Error crítico');
logger.debug('Información de debug');

// Logger con contexto
const log = createContextLogger('MiModulo');
log.info('Mensaje desde MiModulo');
```

**Niveles de log:**
- `DEBUG` - Información detallada para debugging
- `INFO` - Información general
- `WARN` - Advertencias
- `ERROR` - Errores críticos

### ⚠️ errorHandler.js - Manejo de Errores

```javascript
import { 
  handleError, 
  LayerLoadError, 
  NetworkError,
  withErrorHandling 
} from './utils/errorHandler.js';

// Lanzar error personalizado
throw new LayerLoadError('hidrografia', new Error('404'));

// Manejar error
try {
  // código
} catch (error) {
  handleError(error, 'MiModulo.miFuncion', true); // true = mostrar al usuario
}

// Wrapper para funciones asíncronas
const miFuncionSegura = withErrorHandling(async () => {
  // código que puede fallar
}, 'MiModulo.miFuncion');
```

### 🗺️ layerUtils.js - Gestión de Capas

```javascript
import { 
  cargarCapaIndividual,
  mostrarCapa,
  ocultarCapa,
  limpiarMapa 
} from './utils/layerUtils.js';

// Cargar capa GeoJSON
await cargarCapaIndividual('hidrografia', 'agua', temasConfig);

// Mostrar/ocultar capa
mostrarCapa('hidrografia');
ocultarCapa('hidrografia');

// Limpiar todas las capas
limpiarMapa();
```

### 🎨 styleUtils.js - Estilos

```javascript
import { getEstiloCapa, getPointStyle, getPopupContent } from './utils/styleUtils.js';

// Obtener estilo de capa
const style = getEstiloCapa(feature, capaConfig);

// Obtener estilo de punto
const pointStyle = getPointStyle(feature, capaConfig);

// Generar contenido de popup
const popupHTML = getPopupContent(feature, capaConfig);
```

### 📊 legendUtils.js - Leyendas

```javascript
import { actualizarLeyenda } from './utils/legendUtils.js';

// Actualizar leyenda
actualizarLeyenda('agua', temasConfig);
```

### 🔧 configUtils.js - Utilidades de Configuración

```javascript
import { 
  obtenerCapasParaCargaInicial,
  encontrarTemaParaCapa,
  obtenerTodasLasCapasDeDimension 
} from './utils/configUtils.js';

// Obtener capas de carga inicial
const capasIniciales = obtenerCapasParaCargaInicial('agua', temasConfig);

// Encontrar tema de una capa
const tema = encontrarTemaParaCapa('hidrografia', temasConfig);

// Obtener todas las capas de una dimensión
const todasLasCapas = obtenerTodasLasCapasDeDimension(temaConfig);
```

---

## Guía de Desarrollo

### Agregar Nueva Dimensión

1. **Crear archivo de configuración** en `/js/config/[nombre].js`
2. **Importar en** `allTemasConfig.js`
3. **Agregar archivos GeoJSON** en `/data/geojson/`

### Agregar Nueva Capa

1. **Editar configuración de dimensión**
   ```javascript
   capas: ["nueva_capa"],
   estilo: {
     nueva_capa: {
       type: "polygon",
       nombrePersonalizado: "Mi Nueva Capa",
       fillColor: "#ff0000"
     }
   }
   ```

2. **Agregar archivo GeoJSON** en `/data/geojson/nueva_capa.geojson`

### Debugging

```javascript
// Habilitar logs de debug
// En logger.js, cambiar:
const DEBUG = true;

// Acceder al estado global desde consola
window.appState

// Ver capas cargadas
window.appState.layers.byName

// Ver capas loaded
window.appState.layers.loaded
```

### Mejores Prácticas

1. **Siempre usar `appState`** para gestionar estado
2. **Usar `logger`** en lugar de `console.log`
3. **Manejar errores** con `errorHandler`
4. **Documentar funciones** con JSDoc
5. **Usar constantes** de `constants.js`

---

## Troubleshooting

### Error: "Cannot read property 'byName' of undefined"

**Solución**: Asegúrate de que `appState` esté inicializado antes de usarlo.

### Las capas no se cargan

**Solución**: 
1. Verifica que los archivos GeoJSON existan en `/data/geojson/`
2. Revisa la consola para errores de red (404)
3. Verifica que la configuración en `allTemasConfig.js` sea correcta

### Los logs no aparecen

**Solución**: Cambia `DEBUG = true` en `logger.js`

---

## Contribución

Para contribuir al proyecto:

1. Mantén la arquitectura modular
2. Usa el sistema de logging
3. Documenta con JSDoc
4. Maneja errores apropiadamente
5. Sigue los principios DRY

---

## Licencia

Proyecto desarrollado para Water Oriented Living Lab - Región de Atacama

---

**Última actualización**: Diciembre 2025
**Versión**: 2.0 (Refactorizada)
