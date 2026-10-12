// Carreras con mas reprobados en primera oportunidad
// Ejecutar desde la raiz del repo con mongosh --file.
// Fuente oficial: backend/src/main/resources/consultas/mongodb.json
const base=db.getSiblingDB("admisiones_usac");
const pipeline=[
  {
    "$match": {
      "aprobacion": "NO APROBADO",
      "numero_de_fecha_de_evaluacion": 1,
      "carrera_objetivo": {
        "$nin": [
          "NINGUNO",
          "SIN REGISTRO"
        ]
      }
    }
  },
  {
    "$group": {
      "_id": {
        "carrera_objetivo": "$carrera_objetivo",
        "aspirante": "$correlativo_aspirante"
      }
    }
  },
  {
    "$group": {
      "_id": {
        "carrera_objetivo": "$_id.carrera_objetivo"
      },
      "aspirantes_no_aprobados": {
        "$sum": 1
      }
    }
  },
  {
    "$project": {
      "_id": 0,
      "carrera_objetivo": "$_id.carrera_objetivo",
      "aspirantes_no_aprobados": 1
    }
  },
  {
    "$sort": {
      "aspirantes_no_aprobados": -1,
      "carrera_objetivo": 1
    }
  }
];
base.getCollection("evaluaciones").aggregate(pipeline,{allowDiskUse:true}).forEach(d=>printjson(d));
