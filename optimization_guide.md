# Guía de Optimización de Capas Geográficas

## ¿Por qué optimizar?
Las capas regionales suelen tener millones de vértices que no son visibles a simple vista pero ralentizan la descarga y el mapa. Reducir el tamaño un 50-80% mejora drásticamente la experiencia del usuario sin afectar la calidad visual.

## Opción 1: Mapshaper (Recomendada)
Herramienta gratuita y privada (el procesamiento se hace en tu navegador).

1. Ingresa a **[mapshaper.org](https://mapshaper.org/)**.
2. Arrastra tus archivos `.geojson` o `.zip`.
3. Haz clic en **Simplify** (Simplificar) en el menú superior.
4. Marca **"prevent shape removal"** (evitar eliminar formas pequeñas).
5. Usa el control deslizante para reducir los vértices.
   - **Recomendación**: Reduce hasta un 5-10% (verás que la forma apenas cambia pero el peso baja mucho).
6. Haz clic en **Export** y selecciona **GeoJSON**.

## Opción 2: Reducir Precisión de Coordenadas
Las coordenadas con 15 decimales son innecesarias (precisión de nanómetros). 6 decimales son suficientes (precisión de centímetros).

1. En Mapshaper, abre la consola (botón superior derecho "Console").
2. Escribe el comando: `-o precision=0.000001`.
3. Exporta el archivo nuevamente.
   - ¡Esto reduce el peso del archivo un ~30% instantáneamente!

## Resultado Esperado
- Capas que pesaban **15MB** pueden bajar a **2-3MB**.
- La carga inicial será **5 veces más rápida**.
- El mapa se moverá mucho más fluido, incluso en celulares.
