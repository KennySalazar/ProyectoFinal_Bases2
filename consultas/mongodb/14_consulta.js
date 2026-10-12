// Promedio de oportunidades registradas por materia
// Ejecutar desde la raiz del repo con mongosh --file.
// Fuente oficial: backend/src/main/resources/consultas/mongodb.json
const base=db.getSiblingDB("admisiones_usac");
const pipeline=[
  {
    "$group": {
      "_id": {
        "aspirante": "$correlativo_aspirante",
        "anio": "$anio_de_ingreso",
        "materia": "$materia",
        "oportunidad": "$numero_de_fecha_de_evaluacion"
      }
    }
  },
  {
    "$group": {
      "_id": {
        "aspirante": "$_id.aspirante",
        "anio": "$_id.anio",
        "materia": "$_id.materia"
      },
      "intentos": {
        "$sum": 1
      }
    }
  },
  {
    "$group": {
      "_id": "$_id.materia",
      "aspirantes_anio": {
        "$sum": 1
      },
      "promedio_intentos": {
        "$avg": "$intentos"
      }
    }
  },
  {
    "$project": {
      "_id": 0,
      "materia": "$_id",
      "aspirantes_anio": 1,
      "promedio_intentos": {
        "$round": [
          "$promedio_intentos",
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
