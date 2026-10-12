// Promedio de edad por carrera
// Ejecutar desde la raiz del repo con mongosh --file.
// Fuente oficial: backend/src/main/resources/consultas/mongodb.json
const base=db.getSiblingDB("admisiones_usac");
const pipeline=[
  {
    "$match": {
      "edad_valida_analisis": true
    }
  },
  {
    "$group": {
      "_id": {
        "carrera_objetivo": "$carrera_objetivo",
        "aspirante": "$correlativo_aspirante",
        "anio": "$anio_de_ingreso"
      },
      "edad": {
        "$avg": "$edad_aproximada"
      }
    }
  },
  {
    "$group": {
      "_id": {
        "carrera_objetivo": "$_id.carrera_objetivo"
      },
      "aspirantes_anio_con_edad": {
        "$sum": 1
      },
      "edad_promedio": {
        "$avg": "$edad"
      }
    }
  },
  {
    "$project": {
      "_id": 0,
      "carrera_objetivo": "$_id.carrera_objetivo",
      "aspirantes_anio_con_edad": 1,
      "edad_promedio": {
        "$round": [
          "$edad_promedio",
          2
        ]
      }
    }
  },
  {
    "$sort": {
      "carrera_objetivo": 1
    }
  }
];
base.getCollection("evaluaciones").aggregate(pipeline,{allowDiskUse:true}).forEach(d=>printjson(d));
