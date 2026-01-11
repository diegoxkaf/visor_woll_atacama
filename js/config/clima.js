const climaConfig = {
  capas: ["zonas_climaticas", "limite_comunal_linea", "toponimia"],
  cargaInicial: {
    grupos: ["clima"],
    capas: ["limite_comunal_linea"],
  },
  grupos: {
    clima: {
      nombre: "Clima",
      capas: ["zonas_climaticas"],
    },
    contexto: {
      nombre: "Territorio",
      capas: ["limite_comunal_linea", "toponimia"],
    },
  },
  estilo: {
    zonas_climaticas: {
      url: "zonas_climaticas.geojson",
      type: "line",
      nombrePersonalizado: "Zonas Climaticas (Koppen-Geiger)",
      atributo: "KOPPEN_FIN",
      colores: {
        BSk: "#dda853",
        "BSk (s)": "#985b00",
        "BSk (s) (i)": "#ffb13b",
        "BSk (w)": "#be8125",
        BWh: "#d84c2a",
        "BWh (s)": "#af0508",
        BWk: "#ff5558",
        "Bwk (s)": "#ffd1d2",
        EF: "#2973b2",
        "EF (s)": "#6fbeff",
        "EF (w)": "#6fbeff",
        ET: "#a0cf59",
        "ET (s)": "#7cff01",
        "ET (w)": "#4c8b11",
      },
      popupCampos: [
        "DENOMINACI",
        "KOPPEN_FIN",
        "PP_MM",
        "TMED",
        "ALT_MIN",
        "ALT_MAX",
        "Descripcion",
        "Origen Data",
      ],
      alias: {
        DENOMINACI: "Clima",
        KOPPEN_FIN: "Codigo",
        PP_MM: "Precipitacion Promedio en mm",
        TMED: "Temperatura Promedio en ºC",
        ALT_MIN: "Altura Minima msnm",
        ALT_MAX: "Altura Maxima msnm",
        Descripcion: "Descripcion",
        "Origen Data": "Origen Data",
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

export default climaConfig;
