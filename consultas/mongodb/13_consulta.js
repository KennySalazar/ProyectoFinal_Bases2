// Tasa de aprobacion por edad
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
        "edad_aproximada": "$edad_aproximada"
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
      "edad_aproximada": "$_id.edad_aproximada",
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
      "edad_aproximada": 1
    }
  }
];
base.getCollection("evaluaciones").aggregate(pipeline,{allowDiskUse:true}).forEach(d=>printjson(d));
