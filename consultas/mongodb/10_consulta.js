// Top 5 carreras: aspirantes de 16 a 18 anios
// Ejecutar desde la raiz del repo con mongosh --file.
// Fuente oficial: backend/src/main/resources/consultas/mongodb.json
const base=db.getSiblingDB("admisiones_usac");
const pipeline=[
  {
    "$match": {
      "edad_valida_analisis": true,
      "edad_aproximada": {
        "$gte": 16,
        "$lte": 18
      },
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
      "aspirantes": {
        "$sum": 1
      }
    }
  },
  {
    "$project": {
      "_id": 0,
      "carrera_objetivo": "$_id.carrera_objetivo",
      "aspirantes": 1
    }
  },
  {
    "$sort": {
      "aspirantes": -1,
      "carrera_objetivo": 1
    }
  },
  {
    "$limit": 5
  }
];
base.getCollection("evaluaciones").aggregate(pipeline,{allowDiskUse:true}).forEach(d=>printjson(d));
