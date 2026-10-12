// Top 5 municipios con mas aspirantes
// Ejecutar desde la raiz del repo con mongosh --file.
// Fuente oficial: backend/src/main/resources/consultas/mongodb.json
const base=db.getSiblingDB("admisiones_usac");
const pipeline=[
  {
    "$group": {
      "_id": {
        "departamento_institucion_educativa": "$departamento_institucion_educativa",
        "municipio_institucion_educativa": "$municipio_institucion_educativa",
        "aspirante": "$correlativo_aspirante"
      }
    }
  },
  {
    "$group": {
      "_id": {
        "departamento_institucion_educativa": "$_id.departamento_institucion_educativa",
        "municipio_institucion_educativa": "$_id.municipio_institucion_educativa"
      },
      "aspirantes": {
        "$sum": 1
      }
    }
  },
  {
    "$project": {
      "_id": 0,
      "departamento_institucion_educativa": "$_id.departamento_institucion_educativa",
      "municipio_institucion_educativa": "$_id.municipio_institucion_educativa",
      "aspirantes": 1
    }
  },
  {
    "$sort": {
      "aspirantes": -1,
      "departamento_institucion_educativa": 1,
      "municipio_institucion_educativa": 1
    }
  },
  {
    "$limit": 5
  }
];
base.getCollection("evaluaciones").aggregate(pipeline,{allowDiskUse:true}).forEach(d=>printjson(d));
