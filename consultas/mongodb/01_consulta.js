// Aspirantes por tipo de institucion
// Ejecutar desde la raiz del repo con mongosh --file.
// Fuente oficial: backend/src/main/resources/consultas/mongodb.json
const base=db.getSiblingDB("admisiones_usac");
const pipeline=[
  {
    "$group": {
      "_id": {
        "tipo_institucion_educativa": "$tipo_institucion_educativa",
        "aspirante": "$correlativo_aspirante"
      }
    }
  },
  {
    "$group": {
      "_id": {
        "tipo_institucion_educativa": "$_id.tipo_institucion_educativa"
      },
      "aspirantes": {
        "$sum": 1
      }
    }
  },
  {
    "$project": {
      "_id": 0,
      "tipo_institucion_educativa": "$_id.tipo_institucion_educativa",
      "aspirantes": 1
    }
  },
  {
    "$sort": {
      "aspirantes": -1,
      "tipo_institucion_educativa": 1
    }
  }
];
base.getCollection("evaluaciones").aggregate(pipeline,{allowDiskUse:true}).forEach(d=>printjson(d));
