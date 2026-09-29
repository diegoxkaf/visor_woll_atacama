# Plataforma Territorial "Water Oriented Living Lab Atacama

> Plataforma WebGIS territorial para la Región de Atacama, Chile, potenciada con Inteligencia Artificial.

![Version](https://img.shields.io/badge/version-2.0-blue.svg)
![License](https://img.shields.io/badge/license-Proprietary-red.svg)

---

## Qué es este proyecto?

La Plataforma Territorial "Water Oriented Living Lab Atacama" es una aplicación web interactiva para visualizar y analizar datos geoespaciales estratégicos de la Región de Atacama, Chile. Integra mapas WebGL de alto rendimiento con un asistente de IA context-aware que permite hacer consultas territoriales en lenguaje natural.

### Características principales

- **Visualización geoespacial** basada en Leaflet.js con renderizado WebGL (polígonos vía `Leaflet.glify`)
- **Asistente IA** con contexto territorial enriquecido (Groq + Vercel Functions)
- **6 dimensiones de análisis** (Agricultura, Agua, Energía, Minería, Planificación Territorial, Turismo y otras)
- **Búsqueda global semántica** con índice en memoria
- **Tema claro/oscuro** con tokens CSS intercambiables
- **Diseño responsive** para móviles y desktop con sidebars overlay
- **Web Workers** (`layerProcessor.worker.js`) para procesamiento GeoJSON fuera del hilo principal
- **Tabla de atributos** interactiva con filtros, búsqueda y export (GeoJSON / CSV)

---

## Demo

**Demo en vivo:** _(próximamente)_

---

## Requisitos Previos

- Navegador moderno (Chrome, Firefox, Safari, Edge) con soporte ES Modules
- Node.js >= 16.x (opcional — solo para `npm run lint`)
- Servidor HTTP estático (no abrir el `index.html` con `file://` por restricciones CORS)
- API Key de Groq (para la funcionalidad del chat IA)

---

## Inicio Rápido

### 1. Clona el repositorio

```bash
git clone https://github.com/atacama-andes-value/visor-ohiggins.git
cd visor-ohiggins
```

### 2. Configura las variables de entorno (opcional, solo para el chat IA)

Crea un archivo `.env` en la raíz del proyecto:

```bash
GROQ_API_KEY=tu_api_key_aqui
GROQ_MODEL=openai/gpt-oss-120b   # opcional, tiene valor por defecto
```

> El visor funciona **sin** la API Key: el sidebar de capas, el mapa y la leyenda operan de forma totalmente local con los GeoJSON incluidos.

### 3. Ejecuta localmente

Sin build step: cualquier servidor estático sirve el proyecto.

**Opción A — con Python:**
```bash
python3 -m http.server 8099
```

**Opción B — con Node:**
```bash
npx http-server -p 8099
```

**Opción C — con PHP:**
```bash
php -S localhost:8099
```

### 4. Abre en tu navegador

```
http://localhost:8099
```

---

## Tecnologías

### Frontend
- **Mapa:** Leaflet.js 1.9.4
- **Render WebGL de polígonos:** Leaflet.glify
- **Clustering de puntos:** Leaflet.markercluster 1.5.3
- **Heatmap WebGL:** webgl-heatmap (adaptado)
- **Geometría:** Turf.js 6.5.0 (solo `turf.bbox`)
- **Sanitización:** DOMPurify 3.0.3 (popups)
- **UI:** Vanilla JavaScript ES Modules, sin framework
- **Estilos:** CSS3 con custom properties (tema claro/oscuro)
- **Tipografías:** Montserrat + Open Sans (Google Fonts)
- **Iconos:** Material Symbols Outlined
- **Procesamiento off-main-thread:** Web Workers

### Backend / API
- **Serverless:** Vercel Functions (`api/chat.js`)
- **IA:** Groq API (`GROQ_MODEL`, default `openai/gpt-oss-120b`)
- **Runtime:** Node.js

### Datos
- **Formato:** GeoJSON estático en `/geojson/` (~69 archivos, on-demand)
- **Servicios externos:** WMS (Web Map Service) declarados en `js/config/wms_services.js`

---

## Estructura del Proyecto

```
visor-ohiggins/
├── index.html                  # SPA entry point
├── help.html                   # Manual de ayuda
├── api/
│   └── chat.js                 # Vercel Function → Groq
├── css/
│   ├── base.css                # Design tokens y reset
│   ├── components.css          # Componentes UI (sidebars, modales, tabla)
│   ├── desktop.css             # Layout ≥ 769px (grid 3 columnas)
│   └── mobile.css              # Adaptaciones ≤ 768px (sidebars overlay)
├── js/
│   ├── app.js                  # Bootstrap y orquestación
│   ├── script.js               # initSidebarUI + initMobileUI
│   ├── config/                 # Configuración por dimensión
│   │   ├── agua.js
│   │   ├── agricultura.js
│   │   ├── energia.js
│   │   ├── mineria.js
│   │   ├── planificacion.js
│   │   ├── otros.js
│   │   ├── suelo.js
│   │   ├── clima.js
│   │   ├── riesgos.js
│   │   ├── capasBase.js
│   │   ├── wms_services.js
│   │   ├── leyendaAliases.js
│   │   ├── temas_config.js
│   │   ├── allTemasConfig.js
│   │   └── constants.js
│   ├── store/
│   │   └── appState.js         # Single source of truth
│   ├── ui/                     # Handlers por feature
│   │   ├── chatUI.js
│   │   ├── help.js
│   │   ├── mapUI.js
│   │   ├── mobileUI.js
│   │   ├── searchUI.js
│   │   ├── sidebarUI.js
│   │   └── themeUI.js
│   ├── utils/                  # Motores lógicos
│   │   ├── layerUtils.js       # cargarCapaIndividual, dataParaRender
│   │   ├── glifyAdapter.js     # buildColorCallback con dataFilter
│   │   ├── attributeTableUtils.js
│   │   ├── chatAssistant.js    # Precarga de contexto + sendMessage
│   │   ├── concurrentQueue.js
│   │   ├── configUtils.js
│   │   ├── configValidator.js
│   │   ├── downloadUtils.js
│   │   ├── errorHandler.js
│   │   ├── helpers.js
│   │   ├── legendUtils.js
│   │   ├── logger.js
│   │   ├── mapUtils.js
│   │   ├── metadataExtractor.js
│   │   ├── popupUtils.js
│   │   └── styleUtils.js
│   ├── workers/
│   │   ├── layerProcessor.worker.js
│   │   └── workerPool.js
│   └── lib/
│       └── glify-browser.js
├── geojson/                    # 69 archivos GeoJSON (carga on-demand)
├── assets/                     # Iconos e imágenes
├── vercel.json                 # Rewrites + excludeFiles geojson/**
├── AGENTS.md                   # Guía técnica interna (peculiaridades)
└── package.json                # Solo para lint
```

---

## Arquitectura en una mirada

- **`appState`** (`js/store/appState.js`) es la única fuente de verdad: mapa activo, capas cargadas, filtros, UI state.
- **6 archivos de dimensión** en `js/config/` declaran cada capa (id, url, `tipo`, `renderer`, `popupCampos`, `alias`, etc).
- **Carga on-demand**: una capa se descarga solo cuando el usuario la activa, no al cargar la página.
- **`dataFilter` se aplica antes del renderer**: `cargarCapaIndividual()` crea `dataParaRender` filtrado para glify/heatmap/cluster/L.geoJson (todos los renderers reciben datos consistentes).
- **Web Worker** procesa GeoJSON pesado fuera del hilo principal.
- **Asistente IA**: precarga contexto territorial en memoria al inicio (sin UI de progreso) y responde vía `api/chat.js` (Groq).

> Para peculiaridades detalladas (alias, glify, dataFilter, etc.) consulta [`AGENTS.md`](./AGENTS.md).

---

## Configuración Básica

### Agregar una nueva capa GeoJSON

1. Coloca tu archivo `.geojson` en `/geojson/`.
2. Edita el archivo de dimensión correspondiente en `/js/config/` (por ejemplo `js/config/turismo.js`):

```javascript
nueva_capa: {
  url: "mi_capa.geojson",
  type: "point",              // "point" | "line" | "polygon" | "heatmap"
  renderer: "cluster",        // "glify" | "cluster" | "heatmap" | "L.geoJson"
  alias: ["alias_busqueda_1", "alias_busqueda_2"],  // para el buscador
  popupCampos: ["nombre", "descripcion"],
  // ...opciones avanzadas
}
```

3. Recarga el navegador (no hay build step).

> **Importante:** los `alias` deben normalizarse con `.toLowerCase().trim()` al hacer lookup (ver `AGENTS.md`).

---

## Despliegue en Vercel

### Despliegue automático

1. **Conecta el repositorio:**
 - Ve a [vercel.com](https://vercel.com)
 - Importa el repositorio desde GitHub

2. **Configura variables de entorno:**
   ```
   GROQ_API_KEY = tu_clave_aqui
   GROQ_MODEL   = openai/gpt-oss-120b   # opcional
   ```

3. **Despliega:**
 - Vercel detecta `api/*.js` como Serverless Functions
 - `vercel.json` ya configura los rewrites (`/api/X` `/api/X.js`) y excluye `geojson/**` del bundle
 - El despliegue se ejecuta en cada push a `main`

### Despliegue manual

```bash
npm install -g vercel
vercel --prod
```

---

## Contribuir

Este es un proyecto privado del equipo de Atacama Andes Value. Si eres parte del equipo:

1. Crea una rama desde `develop`
2. Realiza tus cambios
3. Abre un Pull Request hacia `develop`

### Convenciones de commits

```
feat: Nueva funcionalidad
fix: Corrección de bug
docs: Cambios en documentación
style: Cambios de formato (no afectan funcionalidad)
refactor: Refactorización de código
perf: Mejoras de rendimiento
test: Agregar o modificar tests
```

---

## Linting

```bash
npm run lint   # ESLint sobre js/ — objetivo: 0 errors
```

> No hay build step ni tests automatizados.

---

## Dimensiones Disponibles

| Dimensión | Archivo de config | Notas |
|---|---|---|
| Agricultura | `js/config/agricultura.js` | Capas productivas |
| Agua | `js/config/agua.js` | Hidrografía, APR, embalses |
| Energía | `js/config/energia.js` | Generación, transmisión |
| Minería | `js/config/mineria.js` | Yacimientos, faenas |
| Planificación | `js/config/planificacion.js` | PRC, límites urbanos |
| Otros | `js/config/otros.js` | Patrimonio, áreas protegidas |
| Suelo | `js/config/suelo.js` | Capacidad de uso |
| Clima | `js/config/clima.js` | Zonas climáticas |
| Riesgos | `js/config/riesgos.js` | Sismos, volcanes, remociones |
| Capas Base | `js/config/capasBase.js` | Cartografía base |

---

## Troubleshooting

### El mapa no carga

1. Verifica la consola del navegador (F12).
2. Asegúrate de estar usando un servidor HTTP (`http://...`), nunca `file://`.
3. Confirma que `/geojson/` esté accesible.

### El chat IA no responde

1. Verifica que `GROQ_API_KEY` esté configurada en Vercel.
2. Revisa los logs de la Function en Vercel Dashboard.
3. Comprueba límites de cuota de la API de Groq.
4. Si ves `501 Not Implemented` localmente: el endpoint `/api/chat` solo funciona desplegado en Vercel.

### Las capas no se filtran en el mapa

- Verifica que `cargarCapaIndividual()` aplique `dataFilter` al `dataParaRender` antes de invocar el renderer (ver `AGENTS.md`).

### Errores de CORS

Asegúrate de estar ejecutando un servidor HTTP, no abriendo el archivo directamente con `file://`.

---

## Licencia

**Propiedad de Andes Value Research** 
Todos los derechos reservados 2026

---

## Equipo

**Desarrollor:** Diego Velàsquez 
**Cliente:** Andes Value Research
**Contacto:** diegovelasquezf@gmail.com

---

## Changelog

### v2.0 (Septiembre 2026)
- Refactorización completa desde la base IFI Atacama original.
- Migración a Leaflet.glify para render WebGL de polígonos.
- Integración de Web Worker (`layerProcessor.worker.js`) para GeoJSON pesado.
- Asistente IA con contexto territorial precargado (Groq + Vercel Functions).
- Tabla de atributos interactiva con filtros, búsqueda y export.
- Tema claro/oscuro unificado mediante custom properties.
- Sidebars con comportamiento coherente (overlay en móvil, grid en escritorio).
- Buscador global semántico en memoria.

### v1.x (basado en [diegoxkaf/visor_woll_atacama](https://github.com/diegoxkaf/visor_woll_atacama))
- Versión inicial para la Región de Atacama.

---

**Versión:** 2.0 
**Última Revisión:** Septiembre 2026
