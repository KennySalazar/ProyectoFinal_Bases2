// Evaluaciones aprobadas por materia
// Ejecutar desde la raiz del repo con mongosh --file.
// Fuente oficial: backend/src/main/resources/consultas/mongodb.json
const base=db.getSiblingDB("admisiones_usac");
const pipeline=[
  {
    "$match": {
      "aprobacion": "APROBADO"
    }
  },
  {
    "$group": {
      "_id": "$materia",
      "aprobadas": {
        "$sum": 1
      }
    }
  },
  {
    "$project": {
      "_id": 0,
      "materia": "$_id",
      "aprobadas": 1
    }
  },
  {
    "$sort": {
      "aprobadas": -1,
      "materia": 1
    }
  }
];
base.getCollection("evaluaciones").aggregate(pipeline,{allowDiskUse:true}).forEach(d=>printjson(d));
