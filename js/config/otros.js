const otrosConfig = {
  capas: [
    "wms_ide_minagri",
    "wms_ide_ciren_agroindustrias",
    "bienes_nacionales_protegidos",
    "sistema_areas_protegidas",
    "limite_comunal_linea",
    "toponimia",
  ],
  cargaInicial: {
    grupos: ["conservacion"],
    capas: ["limite_comunal_linea"],
  },
  grupos: {
    conservacion: {
      nombre: "Areas de Proteccion y Conservacion",
      capas: ["bienes_nacionales_protegidos", "sistema_areas_protegidas"],
    },
    contexto: {
      nombre: "Territorio",
      capas: ["limite_comunal_linea", "toponimia"],
    },
  },
  estilo: {
    wms_ide_minagri: {
      tipo: "wms",
      servicio: "ide_minagri",
      nombrePersonalizado: "Destinos Turísticos (IDE Chile)",
      popupCampos: ["NOMBRE", "TIPO", "REGION"],
      alias: { NOMBRE: "Nombre", TIPO: "Tipo", REGION: "Región" },
      opacity: 0.8,
    },
    wms_ide_ciren_agroindustrias: {
      tipo: "wms",
      servicio: "ide_ciren_agroindustrias",
    },
    bienes_nacionales_protegidos: {
      url: "bienes_nacionales_protegidos.geojson",
      type: "polygon",
      atributo: "REGION",
      nombrePersonalizado: "Bienes Nacionales Protegidos",
      colores: {
        Atacama: "#057a57ff",
      },
      popupCampos: [
        "BNP",
        "COMUNA",
        "SUPERFICIE",
        "DECRETO",
        "ACT_ADM",
        "ADMINISTRA",
        "Descripcion",
        "Origen Dato",
      ],
      alias: {
        BNP: "Nombre del Bien Nacional",
        COMUNA: "Comuna",
        SUPERFICIE: "Superficie en Ha",
        DECRETO: "Decreto",
        ACT_ADM: "Acto Administrativo",
        ADMINISTRA: "Administrador del Bien",
        Descripcion: "Descripcion",
        "Origen Dato": "Origen de la Informacion",
      },

      estiloBase: {
        color: "#4B5945",
        weight: 1,

        fillOpacity: 0.8,
      },
    },
    sistema_areas_protegidas: {
      url: "sistema_areas_protegidas.geojson",
      type: "polygon",
      atributo: "TERRITORIO",
      nombrePersonalizado: "Sistema Nacional de Areas Protegidas",
      colores: {
        Continente: "#216dfaff",
      },
      popupCampos: [
        "NOMBRE_UNI",
        "CATEGORIA",
        "REGION",
        "CONDICION",
        "DECRETO_VI",
        "TIPO_DE_PR",
        "TERRITORIO",
        "Descripcion",
        "Origen Dato",
      ],
      alias: {
        NOMBRE_UNI: "Nombre del SNAP",
        CATEGORIA: "Categoria",
        REGION: "Region",
        CONDICION: "Condicion",
        DECRETO_VI: "Decreto",
        TIPO_DE_PR: "Administrador",
        TERRITORIO: "Territorio",
        Descripcion: "Descripcion",
        "Origen Dato": "Origen de la Informacion",
      },

      estiloBase: {
        color: "#4B5945",
        weight: 1,

        fillOpacity: 0.8,
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
        // Edicion de Iconos
        Asentamiento: "localidad.png",
      },
      estiloAlternativo: {
        // Icono alternativo en caso que no encuentre el icono
        color: "#FF6B6B", del punto
        fillColor: "#FF6B6B", // Color de relleno del punto
        radius: 4, // Radio del punto
        weight: 1, del punto
        fillOpacity: 0.8, del punto
      },
      popupCampos: ["Nombre"],
      alias: {
        Nombre: "Nombre",
      },
      etiquetas: {
        campo: "Nombre",
        estilo: {
          color: "#000000", // Color del texto
          fontSize: "9px", // Tamaño de la fuente
          fontFamily: "Arial, sans-serif", // Familia de la fuente
          bufferColor: "#88304E", // Color del contorno
          bufferWidth: 0.3, // Ancho del contorno
          offsetY: -20, // Añadida propiedad para el offset vertical
        },
      },
    },
  },
  leyenda: {},
};

export default otrosConfig;
