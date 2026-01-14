# Guía de Desarrollo - Visor Territorial

Esta guía está dirigida a desarrolladores que contribuirán al proyecto.

---

## 🚀 Setup Inicial

### Prerequisitos

- **Git** >= 2.30
- **Node.js** >= 16.x (solo para servidor de desarrollo)
- **Editor de código** (recomendado: VS Code)
- **Navegador moderno** con DevTools

### Clonar el Repositorio

```bash
# Clona el proyecto
git clone https://github.com/atacama-andes-value/visor-territorial.git
cd visor-territorial

# Crea tu rama de trabajo
git checkout -b feature/tu-nombre-feature
```

### Configuración del Entorno

1. **Copia el archivo de ejemplo de variables de entorno:**

```bash
cp .env.example .env
```

2. **Configura tus credenciales en `.env`:**

```bash
# API Keys
GROQ_API_KEY=tu_clave_aqui

# Configuración de desarrollo (opcional)
DEV_MODE=true
LOG_LEVEL=debug
```

3. **Instala extensiones recomendadas para VS Code:**

Crea `.vscode/extensions.json`:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "usernamehw.errorlens",
    "streetsidesoftware.code-spell-checker"
  ]
}
```

---

## 💻 Entorno de Desarrollo

### Servidor Local

Elige una opción según tus preferencias:

**Opción 1 - npx (sin instalación):**
```bash
npx http-server -p 8080 -c-1
```

**Opción 2 - Python:**
```bash
python -m http.server 8080
```

**Opción 3 - PHP:**
```bash
php -S localhost:8080
```

**Opción 4 - Live Server (VS Code):**
1. Instala la extensión "Live Server"
2. Click derecho en `index.html` → "Open with Live Server"

### Hot Reload (Recomendado)

Para desarrollo activo con recarga automática:

```bash
npm install -g browser-sync
browser-sync start --server --files "css/*.css, js/**/*.js, *.html"
```

---

## 📁 Estructura del Proyecto

```
visor-territorial/
│
├── api/                       # Serverless functions (Vercel)
│   └── chat.js               # Endpoint de IA
│
├── assets/                    # Recursos estáticos
│   ├── icons/                # Iconos de marcadores
│   └── img/                  # Imágenes UI
│
├── css/                       # Estilos
│   ├── base.css              # Variables CSS, reset, layout
│   ├── components.css        # Componentes UI específicos
│   └── mobile.css            # Media queries responsive
│
├── geojson/                   # Datos geográficos
│   ├── agua/                 # Por dimensión
│   ├── mineria/
│   └── ...
│
├── js/                        # JavaScript modular
│   ├── config/               # Configuraciones
│   │   ├── allTemasConfig.js # Punto de entrada de configs
│   │   ├── agua.js           # Config de dimensión Agua
│   │   ├── mineria.js        # Config de dimensión Minería
│   │   ├── capasBase.js      # Mapas base
│   │   └── constants.js      # Constantes globales
│   │
│   ├── store/                # Gestión de estado
│   │   └── appState.js       # Single source of truth
│   │
│   ├── utils/                # Utilidades y lógica
│   │   ├── layerUtils.js     # Gestión de capas
│   │   ├── searchControl.js  # Motor de búsqueda
│   │   ├── sidebarUtils.js   # Control de sidebars
│   │   ├── styleUtils.js     # Estilos de features
│   │   ├── popupUtils.js     # Popups y tooltips
│   │   ├── errorHandler.js   # Manejo de errores
│   │   └── logger.js         # Sistema de logging
│   │
│   ├── workers/              # Web Workers (opcional)
│   │   └── geoProcessor.js   # Procesamiento de GeoJSON
│   │
│   └── main.js               # Punto de entrada principal
│
├── docs/                      # Documentación
│   ├── images/               # Screenshots y diagramas
│   ├── ARCHITECTURE.md
│   ├── CONFIGURATION.md
│   └── API.md
│
├── .env.example              # Plantilla de variables de entorno
├── .gitignore                # Archivos ignorados por Git
├── index.html                # HTML principal
├── README.md                 # Documentación principal
└── vercel.json               # Configuración de Vercel
```

---

## 🎨 Convenciones de Código

### JavaScript

**Estilo:**
- ES6+ (usa `const`/`let`, arrow functions, template literals)
- Módulos ES6 (`import`/`export`)
- Nombres descriptivos y en español para variables de dominio

**Ejemplo:**
```javascript
// ✅ CORRECTO
const cuencasHidrograficas = await cargarCapa('cuencas.geojson');
const estacionActiva = buscarEstacion(id);

// ❌ INCORRECTO
var data = load('cuencas.geojson');
const x = find(id);
```

**Estructura de funciones:**
```javascript
/**
 * Carga y procesa un archivo GeoJSON
 * @param {string} url - Ruta del archivo
 * @param {Object} options - Opciones de configuración
 * @returns {Promise<Object>} GeoJSON procesado
 */
export async function cargarGeoJSON(url, options = {}) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    logger.error('Error cargando GeoJSON:', error);
    throw error;
  }
}
```

### CSS

**Organización:**
```css
/* Usa variables CSS para colores y medidas */
:root {
  --color-primary: #2c3e50;
  --spacing-base: 1rem;
  --transition-speed: 0.3s;
}

/* BEM para nomenclatura de clases */
.sidebar__header { }
.sidebar__header--active { }
.sidebar__item { }
```

**Mobile-first:**
```css
/* Estilo base (móvil) */
.container {
  padding: 1rem;
}

/* Desktop */
@media (min-width: 768px) {
  .container {
    padding: 2rem;
  }
}
```

### HTML

- Semántico (`<header>`, `<nav>`, `<main>`, `<section>`)
- Atributos ARIA para accesibilidad
- IDs para funcionalidad, clases para estilos

```html
<!-- ✅ CORRECTO -->
<button 
  id="toggle-layer-agua"
  class="btn btn--primary"
  aria-label="Activar capa de agua">
  Agua
</button>

<!-- ❌ EVITAR -->
<div onclick="toggleLayer()">Agua</div>
```

---

## 🔀 Flujo de Trabajo Git

### Branches

```
main          → Producción (protegida)
  └── develop → Desarrollo activo (base para features)
       ├── feature/nombre-feature
       ├── fix/nombre-bug
       └── refactor/nombre-refactor
```

### Commits Semánticos

Usa [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Formato
<type>(<scope>): <description>

# Tipos
feat:     Nueva funcionalidad
fix:      Corrección de bug
docs:     Cambios en documentación
style:    Formato (no afecta código)
refactor: Refactorización
perf:     Mejora de performance
test:     Agregar/modificar tests
chore:    Mantenimiento (deps, config)
```

**Ejemplos:**
```bash
git commit -m "feat(capas): agregar soporte para capas WMS"
git commit -m "fix(search): corregir búsqueda con tildes"
git commit -m "docs(readme): actualizar guía de instalación"
git commit -m "refactor(utils): simplificar layerUtils.js"
git commit -m "perf(geojson): optimizar carga de archivos grandes"
```

### Workflow Completo

```bash
# 1. Actualiza develop
git checkout develop
git pull origin develop

# 2. Crea tu branch
git checkout -b feature/nueva-dimension-transporte

# 3. Desarrolla y commitea frecuentemente
git add .
git commit -m "feat(config): agregar configuración de transporte"

# 4. Push a tu branch
git push origin feature/nueva-dimension-transporte

# 5. Abre Pull Request en GitHub hacia 'develop'
# 6. Espera code review
# 7. Merge después de aprobación
```

---

## 🧪 Testing y Validación

### Validación Manual

Antes de hacer commit, verifica:

- [ ] El mapa carga correctamente
- [ ] No hay errores en la consola
- [ ] Las capas nuevas/modificadas se visualizan bien
- [ ] El responsive funciona (móvil, tablet, desktop)
- [ ] Los popups muestran información correcta
- [ ] La búsqueda encuentra las features

### Validación de GeoJSON

```bash
# Instala geojsonhint
npm install -g @mapbox/geojsonhint

# Valida un archivo
geojsonhint geojson/agua/cuencas.geojson
```

### Lighthouse (Performance)

1. Abre Chrome DevTools (F12)
2. Pestaña "Lighthouse"
3. Selecciona "Performance", "Accessibility", "Best Practices"
4. Click en "Analyze page load"
5. Objetivo: Score > 90 en todas las categorías

---

## 🐛 Debugging

### Console Logging

El proyecto usa un sistema de logging centralizado:

```javascript
import logger from './utils/logger.js';

logger.info('Información general', { data });
logger.warn('Advertencia', { problema });
logger.error('Error crítico', { error });
logger.debug('Debug detallado', { detalles }); // Solo en dev
```

### Breakpoints

**En código:**
```javascript
debugger; // Pausa ejecución aquí
```

**En DevTools:**
1. Abre Sources (F12)
2. Encuentra tu archivo
3. Click en el número de línea

### Network Analysis

Para problemas de carga:
1. F12 → Network
2. Filtra por "XHR" o "Fetch"
3. Verifica status codes y tiempos de respuesta

### Common Issues

**"Map container not found"**
- Verifica que el div `#map` exista en el HTML
- Asegúrate de que el script se ejecute después del DOM

**"Failed to fetch GeoJSON"**
- Verifica la ruta en `url`
- Chequea permisos del archivo
- Revisa CORS si es un servidor externo

**"Layer not displaying"**
- Abre la consola y busca errores
- Verifica que `type` coincida con la geometría
- Chequea que haya `iconos` o `estiloBase` definido

---

## 📦 Agregar Nuevas Features

### Checklist para Nueva Dimensión

1. **Crear archivo de configuración:**
   ```bash
   touch js/config/nueva_dimension.js
   ```

2. **Definir estructura:**
   ```javascript
   export const nuevaDimensionConfig = {
     grupos: {
       "Grupo 1": {
         capas: { /* ... */ }
       }
     }
   };
   ```

3. **Importar en `allTemasConfig.js`:**
   ```javascript
   import { nuevaDimensionConfig } from './nueva_dimension.js';
   
   export const allTemasConfig = {
     // ...
     nueva_dimension: nuevaDimensionConfig
   };
   ```

4. **Agregar GeoJSONs en `/geojson/nueva_dimension/`**

5. **Probar localmente**

6. **Documentar en `CONFIGURATION.md`**

### Checklist para Nueva Utilidad

1. **Crear archivo en `/js/utils/`:**
   ```bash
   touch js/utils/miUtils.js
   ```

2. **Estructura modular:**
   ```javascript
   // miUtils.js
   export function miFuncion(params) {
     // implementación
   }
   
   export default {
     miFuncion,
     otraFuncion
   };
   ```

3. **Importar donde se necesite:**
   ```javascript
   import { miFuncion } from './utils/miUtils.js';
   ```

4. **Agregar tests (cuando estén implementados)**

---

## 🚀 Deploy

### Pre-Deploy Checklist

- [ ] Todos los tests pasan
- [ ] No hay `console.log` olvidados
- [ ] Variables de entorno configuradas
- [ ] `.gitignore` actualizado
- [ ] README actualizado si es necesario
- [ ] CHANGELOG.md actualizado

### Deploy a Vercel (Producción)

**Desde GitHub (recomendado):**
1. Push a `main`
2. Vercel detecta automáticamente
3. Build y deploy automático
4. Verifica en el dashboard de Vercel

**Desde CLI:**
```bash
npm install -g vercel
vercel --prod
```

### Deploy a Staging

```bash
# Deploy branch develop a preview
git push origin develop
# Vercel crea automáticamente una preview URL
```

---

## 🔐 Seguridad

### Variables de Entorno

**NUNCA commitees:**
- ❌ `.env`
- ❌ API keys
- ❌ Contraseñas
- ❌ Tokens

**SIEMPRE usa:**
- ✅ `.env.example` (plantilla sin valores reales)
- ✅ Variables de entorno en Vercel
- ✅ `.gitignore` actualizado

### Sanitización de Inputs

```javascript
// Siempre valida/sanitiza inputs de usuario
function buscar(query) {
  // Limpia caracteres especiales
  const queryLimpia = query
    .trim()
    .replace(/[<>]/g, '');
  
  // Procesa...
}
```

---

## 📚 Recursos

### Documentación Oficial

- [Leaflet.js](https://leafletjs.com/reference.html)
- [GeoJSON Spec](https://geojson.org/)
- [MDN Web Docs](https://developer.mozilla.org/)
- [Vercel Docs](https://vercel.com/docs)

### Herramientas Útiles

- [geojson.io](https://geojson.io) - Editor visual de GeoJSON
- [geojsonlint](https://geojsonlint.com/) - Validador
- [ColorBrewer](https://colorbrewer2.org/) - Paletas de colores
- [QGIS](https://qgis.org/) - Software GIS profesional

### Comunidad

- Stack Overflow: Tag `[leaflet]` `[geojson]`
- GitHub Issues del proyecto
- Documentación interna en `/docs`

---

## 🤝 Code Review

### Antes de Solicitar Review

1. ✅ Auto-review tu código
2. ✅ Ejecuta el proyecto localmente
3. ✅ Verifica que no rompas nada existente
4. ✅ Escribe descripción clara del PR
5. ✅ Referencia issues relacionados

### Template de Pull Request

```markdown
## Descripción
Breve descripción de los cambios

## Tipo de cambio
- [ ] Nueva feature
- [ ] Bug fix
- [ ] Refactorización
- [ ] Documentación

## Checklist
- [ ] El código sigue las convenciones del proyecto
- [ ] He probado los cambios localmente
- [ ] He actualizado la documentación si es necesario
- [ ] No hay errores en consola

## Screenshots (si aplica)
[Adjuntar capturas]

## Testing
¿Cómo se puede probar?
```

---

## 📞 Contacto y Soporte

**Líder Técnico:** [Nombre]  
**Email:** [email]  
**Slack:** #visor-territorial (si aplica)

---

## 📝 Notas Finales

### Performance Tips

- ⚡ Evita manipular el DOM en loops
- ⚡ Usa `requestAnimationFrame` para animaciones
- ⚡ Lazy load capas pesadas
- ⚡ Debounce/throttle eventos frecuentes (scroll, resize)

### Accesibilidad

- Siempre incluye `alt` en imágenes
- Usa atributos ARIA apropiados
- Navegación por teclado funcional
- Contraste de colores adecuado (WCAG AA)

---

**Última actualización:** Enero 2026  
**Versión:** 3.0

¡Happy coding! 🚀