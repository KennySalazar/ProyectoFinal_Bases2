// Evolucion de aprobacion por anio
// Ejecutar desde la raiz del repo con mongosh --file.
// Fuente oficial: backend/src/main/resources/consultas/mongodb.json
const base=db.getSiblingDB("admisiones_usac");
const pipeline=[
  {
    "$group": {
      "_id": {
        "anio_de_ingreso": "$anio_de_ingreso"
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
      "anio_de_ingreso": "$_id.anio_de_ingreso",
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
      "anio_de_ingreso": 1
    }
  },
  {
    "$set": {
      "porcentaje_no_aprobacion": {
        "$round": [
          {
            "$subtract": [
              100,
              "$porcentaje_aprobacion"
            ]
          },
          2
        ]
      }
    }
  }
];
base.getCollection("evaluaciones").aggregate(pipeline,{allowDiskUse:true}).forEach(d=>printjson(d));
