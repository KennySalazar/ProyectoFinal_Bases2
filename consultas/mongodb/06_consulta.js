// Coleccion auxiliar resumen_carrera
// Ejecutar desde la raiz del repo con mongosh --file.
// Fuente oficial: backend/src/main/resources/consultas/mongodb.json
const base=db.getSiblingDB("admisiones_usac");
// Genera el resumen global antes de consultarlo. No modifica evaluaciones.
base.evaluaciones.aggregate([
  {
    "$group": {
      "_id": {
        "carrera": "$carrera_objetivo",
        "aspirante": "$correlativo_aspirante"
      },
      "evaluaciones": {
        "$sum": 1
      },
      "aprobadas": {
        "$sum": {
          "$cond": [
            {
              "$eq": [
                "$aprobacion",
                "APROBADO"
              ]
            },
            1,
            0
          ]
        }
      },
      "anios": {
        "$addToSet": "$anio_de_ingreso"
      }
    }
  },
  {
    "$group": {
      "_id": "$_id.carrera",
      "aspirantes": {
        "$sum": 1
      },
      "evaluaciones": {
        "$sum": "$evaluaciones"
      },
      "aprobadas": {
        "$sum": "$aprobadas"
      },
      "aspirantes_con_aprobacion": {
        "$sum": {
          "$cond": [
            {
              "$gt": [
                "$aprobadas",
                0
              ]
            },
            1,
            0
          ]
        }
      }
    }
  },
  {
    "$set": {
      "carrera_objetivo": "$_id",
      "no_aprobadas": {
        "$subtract": [
          "$evaluaciones",
          "$aprobadas"
        ]
      },
      "porcentaje_aprobacion": {
        "$round": [
          {
            "$multiply": [
              {
                "$divide": [
                  "$aprobadas",
                  "$evaluaciones"
                ]
              },
              100
            ]
          },
          2
        ]
      },
      "fecha_generacion": "$$NOW"
    }
  },
  {
    "$out": "resumen_carrera"
  }
],{allowDiskUse:true}).toArray();
const pipeline=[
  {
    "$project": {
      "_id": 0,
      "carrera_objetivo": 1,
      "aspirantes": 1,
      "evaluaciones": 1,
      "aprobadas": 1,
      "no_aprobadas": 1,
      "aspirantes_con_aprobacion": 1,
      "porcentaje_aprobacion": 1,
      "fecha_generacion": 1
    }
  },
  {
    "$sort": {
      "aspirantes": -1,
      "carrera_objetivo": 1
    }
  }
];
base.getCollection("resumen_carrera").aggregate(pipeline,{allowDiskUse:true}).forEach(d=>printjson(d));
