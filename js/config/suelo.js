const sueloConfig = {
  capas: ["unidades_geomorfologicas", "limite_comunal_linea", "toponimia"],
  cargaInicial: {
    grupos: ["geomorfologia"],
    capas: ["limite_comunal_linea"],
  },
  grupos: {
    geomorfologia: {
      nombre: "Geomorfologia",
      capas: ["unidades_geomorfologicas"],
    },
    contexto: {
      nombre: "Territorio",
      capas: ["limite_comunal_linea", "toponimia"],
    },
  },
  estilo: {
    unidades_geomorfologicas: {
      url: "unidades_geomorfologicas.geojson",
      type: "line",
      nombrePersonalizado: "Unidades Geomorfologicas",
      atributo: "Codigo",
      colores: {
        2: "#333644",
        3: "#9437e0ff",
        9: "#6472b1ff",
        11: "#051c85ff",
        20: "#798105ff",
        21: "#f7535cff",
        27: "#b66905ff",
        30: "#976f00ff",
        31: "#ffd900ff",
        33: "#860000ff",
        34: "#02a89aff",
        36: "#9fffdfff",
      },
      popupCampos: ["UNIDAD", "Descripcion", "Origen Data"],
      alias: {
        UNIDAD: "Nombre de la Unidad",
        Descripcion: "Descripcion",
        "Origen Data": "Origen de la Informacion",
      },
      estiloBase: {
        color: "#2d3436",
        weight: 2,
        fillOpacity: 0.4,
      },
    },
    limite_comunal_linea: {
      url: "limite_comunal_linea.geojson",
      type: "line",
      nombrePersonalizado: "Limite Comunal",
      atributo: "REGION",
      colores: {
        3: "#333644",
      },
      popupCampos: ["NOM_COMUNA", "NOM_PROVIN", "NOM_REGION"],
      alias: {
        NOM_COMUNA: "Comuna",
        NOM_PROVIN: "Provincia",
        NOM_REGION: "Region",
      },
      estiloBase: {
        color: "#2d3436",
        weight: 2,
        fillOpacity: 0,
      },
    },
    toponimia: {
      url: "toponimia.geojson",
      type: "point",
      atributo: "Tipo",
      nombrePersonalizado: "Toponimia",
      iconos: {
        Asentamiento: "localidad.png",
      },
      estiloAlternativo: {
        color: "#FF6B6B",
        fillColor: "#FF6B6B",
        radius: 4,
        weight: 1,
        fillOpacity: 0.8,
      },
      popupCampos: ["Nombre"],
      alias: {
        Nombre: "Nombre",
      },
      etiquetas: {
        campo: "Nombre",
        estilo: {
          color: "#000000",
          fontSize: "9px",
          fontFamily: "Arial, sans-serif",
          bufferColor: "#88304E",
          bufferWidth: 0.3,
          offsetY: -20,
        },
      },
    },
  },
  leyenda: {},
};

export default sueloConfig;
