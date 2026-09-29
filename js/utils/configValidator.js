import { logger } from "./logger.js";

/**
 * Validador de esquemas de configuración global.
 * Verifica la consistencia entre los grupos iniciales, grupos definidos, capas y estilos.
 * @param {Object} allTemasConfig - Configuración global de todos los temas.
 */
export function validarConfiguracionGlobal(allTemasConfig) {
    logger.log("Iniciando validación estática de configuración...");
    
    let erroresEncontrados = 0;

    for (const [temaNombre, configTema] of Object.entries(allTemasConfig)) {
        // Validar que cada grupo en cargaInicial exista en grupos
        if (configTema.cargaInicial && Array.isArray(configTema.cargaInicial.grupos)) {
            configTema.cargaInicial.grupos.forEach(grupoInicial => {
                if (!configTema.grupos || !(grupoInicial in configTema.grupos)) {
                    logger.error(`[Validación Config] Tema "${temaNombre}": El grupo de carga inicial "${grupoInicial}" no está definido en la lista de grupos del tema.`);
                    erroresEncontrados++;
                }
            });
        }

        // Validar que cada capa tenga un estilo asociado
        const capasPorValidar = [];

        // Capas listadas directamente en configTema.capas
        if (Array.isArray(configTema.capas)) {
            capasPorValidar.push(...configTema.capas);
        }

        // Capas dentro de cada grupo
        if (configTema.grupos && typeof configTema.grupos === 'object') {
            Object.values(configTema.grupos).forEach(grupo => {
                if (Array.isArray(grupo.capas)) {
                    capasPorValidar.push(...grupo.capas);
                }
            });
        }

        capasPorValidar.forEach(capaNombre => {
            if (!configTema.estilo || !configTema.estilo[capaNombre]) {
                logger.error(`[Validación Config] Tema "${temaNombre}": La capa "${capaNombre}" no tiene una entrada de estilo definida.`);
                erroresEncontrados++;
            }
        });
    }

    if (erroresEncontrados > 0) {
        logger.warn(`Validación de configuración completada con ${erroresEncontrados} errores críticos. Revisa los logs para solucionarlos.`);
    } else {
        logger.log("Validación de configuración completada: Todo en orden.");
    }
}
