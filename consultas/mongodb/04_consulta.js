// Porcentaje de aprobacion por materia
// Ejecutar desde la raiz del repo con mongosh --file.
// Fuente oficial: backend/src/main/resources/consultas/mongodb.json
const base=db.getSiblingDB("admisiones_usac");
const pipeline=[
  {
    "$group": {
      "_id": {
        "materia": "$materia"
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
      "materia": "$_id.materia",
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
      "materia": 1
    }
  }
];
base.getCollection("evaluaciones").aggregate(pipeline,{allowDiskUse:true}).forEach(d=>printjson(d));
