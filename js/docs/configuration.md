# Guía de Configuración de Capas

## 📖 Introducción

Esta guía detalla cómo agregar, modificar y gestionar capas geográficas en el Visor Territorial.

---

## 🎯 Conceptos Básicos

### Jerarquía de Organización

```
Dimensión (ej: "Agua")
  └── Grupo (ej: "Recursos Hídricos")
       └── Capa (ej: "Cuencas Hidrográficas")
            └── Features (elementos individuales del GeoJSON)
```

### Tipos de Capas Soportadas

| Tipo | Geometría | Uso Común |
|------|-----------|-----------|
| `point` | Puntos | Pozos, estaciones, plantas |
| `line` | Líneas | Ríos, caminos, ductos |
| `polygon` | Polígonos | Cuencas, regiones, áreas |

---

## 🛠️ Agregar una Nueva Capa

### Paso 1: Preparar el archivo GeoJSON

1. **Ubicación:** Coloca tu archivo en `/geojson/`
2. **Nombre:** Usa snake_case (ej: `pozos_agua.geojson`)
3. **Validación:** Verifica que sea GeoJSON válido en [geojson.io](https://geojson.io)

**Estructura mínima esperada:**

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "nombre": "Pozo 1",
        "estado": "Activo",
        "profundidad": 150
      },
      "geometry": {
        "type": "Point",
        "coordinates": [-70.5, -27.3]
      }
    }
  ]
}
```

### Paso 2: Configurar la capa

Edita el archivo de configuración correspondiente en `/js/config/`:

```javascript
// js/config/agua.js
export const aguaConfig = {
  grupos: {
    "Recursos Hídricos": {
      capas: {
        
        // NUEVA CAPA AQUÍ
        pozos_agua: {
          url: "pozos_agua.geojson",
          type: "point",
          nombrePersonalizado: "Pozos de Agua",
          popupCampos: ["nombre", "estado", "profundidad"]
        }
        
      }
    }
  }
};
```

### Paso 3: Verificar

1. Recarga la aplicación
2. Abre la dimensión correspondiente
3. Activa la capa desde el sidebar
4. Verifica que se visualice correctamente

---

## ⚙️ Opciones de Configuración

### Configuración Completa de una Capa

```javascript
nombre_capa: {
  // ===== OBLIGATORIO =====
  url: "archivo.geojson",           // Nombre del archivo en /geojson
  type: "point",                    // "point", "line" o "polygon"
  
  // ===== RECOMENDADO =====
  nombrePersonalizado: "Mi Capa",   // Nombre visible en UI
  popupCampos: ["campo1", "campo2"], // Campos a mostrar en popup
  
  // ===== OPCIONAL =====
  atributo: "CATEGORIA",            // Campo para colorear/categorizar
  
  // Solo para type: "point"
  iconos: {
    "Activo": "icono_activo.png",
    "Inactivo": "icono_inactivo.png"
  },
  
  // Solo para type: "line" o "polygon"
  colores: {
    "Categoria A": "#FF5733",
    "Categoria B": "#33FF57"
  },
  
  // Estilo base (se aplica a todos)
  estiloBase: {
    weight: 2,                      // Grosor de línea
    color: "#000000",               // Color de borde
    fillOpacity: 0.5,               // Opacidad de relleno (polygons)
    opacity: 1.0                    // Opacidad de línea
  },
  
  // Personalización de popups
  alias: {
    "campo_tecnico": "Nombre Legible",
    "otro_campo": "Descripción Clara"
  },
  
  // Etiquetas sobre el mapa
  etiquetas: {
    campo: "nombre",
    estilo: {
      color: "#ffffff",
      fontSize: "10px",
      fontWeight: "bold"
    }
  },
  
  // Configuración de clustering (solo points)
  cluster: true,                    // Agrupa puntos cercanos
  clusterMaxZoom: 12,               // Hasta qué zoom mantener clusters
  
  // Filtros iniciales
  filtroInicial: {
    campo: "estado",
    valor: "Activo"
  }
}
```

---

## 🎨 Estilos Visuales

### Puntos (Points)

#### Opción 1: Iconos personalizados

```javascript
pozos: {
  type: "point",
  iconos: {
    "Activo": "pozo_activo.png",    // Archivo en /assets/icons/
    "Inactivo": "pozo_inactivo.png"
  },
  atributo: "estado"                // Campo que determina el icono
}
```

#### Opción 2: Marcadores de Leaflet por defecto

```javascript
pozos: {
  type: "point",
  estiloBase: {
    radius: 8,                       // Tamaño del círculo
    fillColor: "#ff7800",
    color: "#000",
    weight: 1,
    opacity: 1,
    fillOpacity: 0.8
  }
}
```

### Líneas (Lines)

```javascript
rios: {
  type: "line",
  atributo: "caudal",
  colores: {
    "Alto": "#0066cc",
    "Medio": "#3399ff",
    "Bajo": "#99ccff"
  },
  estiloBase: {
    weight: 3,
    opacity: 0.7
  }
}
```

### Polígonos (Polygons)

```javascript
cuencas: {
  type: "polygon",
  atributo: "tipo",
  colores: {
    "Primaria": "#2ecc71",
    "Secundaria": "#27ae60",
    "Terciaria": "#229954"
  },
  estiloBase: {
    weight: 2,
    color: "#ffffff",
    fillOpacity: 0.6
  }
}
```

---

## 🏷️ Configuración de Popups

### Ejemplo Básico

```javascript
popupCampos: ["nombre", "estado", "capacidad"]
```

**Resultado:**
```
nombre: Pozo Los Andes
estado: Activo
capacidad: 500 m³/día
```

### Con Alias (Nombres Personalizados)

```javascript
popupCampos: ["nom_oficial", "est_actual", "cap_diaria"],
alias: {
  "nom_oficial": "Nombre del Pozo",
  "est_actual": "Estado Operativo",
  "cap_diaria": "Capacidad Diaria"
}
```

**Resultado:**
```
Nombre del Pozo: Pozo Los Andes
Estado Operativo: Activo
Capacidad Diaria: 500 m³/día
```

### Formato Avanzado con Función

```javascript
// En popupUtils.js puedes extender:
formatearValor(campo, valor) {
  if (campo === "capacidad") {
    return `${valor.toLocaleString()} m³/día`;
  }
  if (campo === "fecha") {
    return new Date(valor).toLocaleDateString();
  }
  return valor;
}
```

---

## 🔍 Etiquetas en el Mapa

Para mostrar texto directamente sobre las features:

```javascript
etiquetas: {
  campo: "nombre",                  // Campo a mostrar
  estilo: {
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: "bold",
    textShadow: "1px 1px 2px #000", // Sombra para legibilidad
    className: "etiqueta-custom"    // Clase CSS opcional
  },
  offset: [0, -10]                  // Desplazamiento [x, y] en pixels
}
```

---

## 🎯 Filtros y Categorización

### Por Atributo Simple

```javascript
atributo: "tipo",
colores: {
  "Tipo A": "#e74c3c",
  "Tipo B": "#3498db",
  "Tipo C": "#2ecc71"
}
```

### Por Rango Numérico

```javascript
atributo: "profundidad",
rangos: [
  { min: 0, max: 50, color: "#ffffb2" },
  { min: 50, max: 100, color: "#feb24c" },
  { min: 100, max: 200, color: "#f03b20" }
]
```

---

## 🗂️ Organización de Dimensiones

### Crear una Nueva Dimensión

1. **Crea el archivo de configuración:**

```javascript
// js/config/transporte.js
export const transporteConfig = {
  grupos: {
    "Red Vial": {
      capas: {
        carreteras: { /* config */ },
        puentes: { /* config */ }
      }
    },
    "Transporte Público": {
      capas: {
        paraderos: { /* config */ }
      }
    }
  }
};
```

2. **Impórtalo en `allTemasConfig.js`:**

```javascript
import { transporteConfig } from './transporte.js';

export const allTemasConfig = {
  agua: aguaConfig,
  mineria: mineriaConfig,
  transporte: transporteConfig,  // ← NUEVA DIMENSIÓN
  // ...
};
```

3. **Agrega el botón en la UI** (si es necesario)

---

## 🚨 Validación y Debugging

### Checklist Pre-Deploy

- [ ] GeoJSON validado en [geojsonlint.com](https://geojsonlint.com/)
- [ ] Nombres de archivos coinciden (case-sensitive)
- [ ] Campos en `popupCampos` existen en el GeoJSON
- [ ] Iconos referenciados existen en `/assets/icons/`
- [ ] No hay typos en `type` (point/line/polygon)
- [ ] Coordenadas están en formato [lng, lat] (no al revés)

### Errores Comunes

#### ❌ "Cannot read property 'features' of undefined"

**Causa:** El archivo GeoJSON no se encontró o tiene errores de sintaxis

**Solución:**
1. Verifica la ruta en `url`
2. Valida el JSON en [jsonlint.com](https://jsonlint.com/)
3. Revisa la consola del navegador

#### ❌ "Layer not displaying"

**Causa:** Configuración incorrecta de `type` o `estiloBase`

**Solución:**
1. Verifica que `type` coincida con la geometría del GeoJSON
2. Para puntos, asegúrate de tener `iconos` O `estiloBase` con `radius`

#### ❌ "Popup shows 'undefined'"

**Causa:** Los campos en `popupCampos` no existen en las propiedades del GeoJSON

**Solución:**
1. Abre tu GeoJSON y verifica los nombres exactos de las propiedades
2. Respeta mayúsculas/minúsculas

---

## 📚 Ejemplos Completos

### Ejemplo 1: Capa de Puntos con Iconos

```javascript
estaciones_monitoreo: {
  url: "estaciones_monitoreo.geojson",
  type: "point",
  nombrePersonalizado: "Estaciones de Monitoreo",
  atributo: "tipo",
  iconos: {
    "Calidad Agua": "estacion_agua.png",
    "Meteorológica": "estacion_meteo.png",
    "Sísmica": "estacion_sismica.png"
  },
  popupCampos: ["nombre", "tipo", "fecha_instalacion", "estado"],
  alias: {
    "nombre": "Nombre de la Estación",
    "tipo": "Tipo de Monitoreo",
    "fecha_instalacion": "Fecha de Instalación",
    "estado": "Estado Operativo"
  },
  cluster: true,
  clusterMaxZoom: 10
}
```

### Ejemplo 2: Capa de Polígonos con Rangos

```javascript
zonas_riesgo: {
  url: "zonas_riesgo_aluvional.geojson",
  type: "polygon",
  nombrePersonalizado: "Zonas de Riesgo Aluvional",
  atributo: "nivel_riesgo",
  colores: {
    "Alto": "#d32f2f",
    "Medio": "#ffa726",
    "Bajo": "#fdd835"
  },
  estiloBase: {
    weight: 2,
    color: "#ffffff",
    fillOpacity: 0.5
  },
  popupCampos: ["comuna", "nivel_riesgo", "poblacion_afectada"],
  alias: {
    "comuna": "Comuna",
    "nivel_riesgo": "Nivel de Riesgo",
    "poblacion_afectada": "Población en Riesgo"
  },
  etiquetas: {
    campo: "nivel_riesgo",
    estilo: {
      color: "#000",
      fontSize: "14px",
      fontWeight: "bold"
    }
  }
}
```

### Ejemplo 3: Capa de Líneas

```javascript
red_electrica: {
  url: "lineas_transmision.geojson",
  type: "line",
  nombrePersonalizado: "Red de Transmisión Eléctrica",
  atributo: "voltaje_kv",
  colores: {
    "500": "#8e44ad",
    "220": "#e74c3c",
    "110": "#f39c12",
    "66": "#3498db"
  },
  estiloBase: {
    weight: 3,
    opacity: 0.8
  },
  popupCampos: ["nombre_linea", "voltaje_kv", "longitud_km", "propietario"],
  alias: {
    "nombre_linea": "Línea",
    "voltaje_kv": "Voltaje (kV)",
    "longitud_km": "Longitud (km)",
    "propietario": "Operador"
  }
}
```

---

## 🔧 Configuración Avanzada

### Web Map Services (WMS)

Para capas servidas vía WMS:

```javascript
capa_wms: {
  type: "wms",
  url: "https://servidor.com/wms",
  layers: "nombre_capa",
  format: "image/png",
  transparent: true,
  nombrePersonalizado: "Capa WMS Externa"
}
```

### Clustering Personalizado

```javascript
cluster: true,
clusterMaxZoom: 12,
clusterOptions: {
  maxClusterRadius: 80,
  spiderfyOnMaxZoom: true,
  showCoverageOnHover: false,
  iconCreateFunction: (cluster) => {
    const count = cluster.getChildCount();
    return L.divIcon({
      html: `<div>${count}</div>`,
      className: 'marker-cluster-custom',
      iconSize: L.point(40, 40)
    });
  }
}
```

---

## 📖 Referencias

- [Especificación GeoJSON](https://geojson.org/)
- [Leaflet Documentation](https://leafletjs.com/reference.html)
- [ColorBrewer (paletas)](https://colorbrewer2.org/)
- [QGIS (preparación de datos)](https://qgis.org/)

---

**Última actualización:** Enero 2026  
**Versión:** 3.0