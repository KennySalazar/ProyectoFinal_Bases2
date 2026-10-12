// Historial completo del aspirante
// Ejecutar desde la raiz del repo con mongosh --file.
// Fuente oficial: backend/src/main/resources/consultas/mongodb.json
const base=db.getSiblingDB("admisiones_usac");
const pipeline=[
  {
    "$sort": {
      "anio_de_ingreso": 1,
      "fecha_asignacion": 1,
      "numero_de_fecha_de_evaluacion": 1,
      "materia": 1,
      "evaluacion_id": 1
    }
  },
  {
    "$project": {
      "_id": 0
    }
  }
];
const aspirante=process.env.ASPIRANTE;
if(!aspirante)throw new Error("Defina ASPIRANTE con un correlativo real");
pipeline.unshift({$match:{correlativo_aspirante:aspirante}});
base.getCollection("evaluaciones").aggregate(pipeline,{allowDiskUse:true}).forEach(d=>printjson(d));
