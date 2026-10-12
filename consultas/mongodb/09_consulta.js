// Evaluaciones por mes y materia: sector publico
// Ejecutar desde la raiz del repo con mongosh --file.
// Fuente oficial: backend/src/main/resources/consultas/mongodb.json
const base=db.getSiblingDB("admisiones_usac");
const pipeline=[
  {
    "$match": {
      "tipo_institucion_educativa": "PUBLICO"
    }
  },
  {
    "$set": {
      "mes": {
        "$dateToString": {
          "format": "%Y-%m",
          "date": "$fecha_asignacion",
          "timezone": "+00:00"
        }
      }
    }
  },
  {
    "$group": {
      "_id": {
        "mes": "$mes",
        "materia": "$materia"
      },
      "evaluaciones": {
        "$sum": 1
      }
    }
  },
  {
    "$project": {
      "_id": 0,
      "mes": "$_id.mes",
      "materia": "$_id.materia",
      "evaluaciones": 1
    }
  },
  {
    "$sort": {
      "mes": 1,
      "materia": 1
    }
  }
];
base.getCollection("evaluaciones").aggregate(pipeline,{allowDiskUse:true}).forEach(d=>printjson(d));
