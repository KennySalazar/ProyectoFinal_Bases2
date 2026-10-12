// Tasa de aprobacion por tipo de institucion
// Ejecutar desde la raiz del repo con mongosh --file.
// Fuente oficial: backend/src/main/resources/consultas/mongodb.json
const base=db.getSiblingDB("admisiones_usac");
const pipeline=[
  {
    "$group": {
      "_id": {
        "tipo_institucion_educativa": "$tipo_institucion_educativa"
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
      }
    }
  },
  {
    "$project": {
      "_id": 0,
      "tipo_institucion_educativa": "$_id.tipo_institucion_educativa",
      "evaluaciones": 1,
      "aprobadas": 1,
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
      }
    }
  },
  {
    "$sort": {
      "tipo_institucion_educativa": 1
    }
  }
];
base.getCollection("evaluaciones").aggregate(pipeline,{allowDiskUse:true}).forEach(d=>printjson(d));
