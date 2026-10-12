// Aprobados por municipio y carrera
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
      "_id": {
        "departamento_institucion_educativa": "$departamento_institucion_educativa",
        "municipio_institucion_educativa": "$municipio_institucion_educativa",
        "carrera_objetivo": "$carrera_objetivo",
        "aspirante": "$correlativo_aspirante"
      }
    }
  },
  {
    "$group": {
      "_id": {
        "departamento_institucion_educativa": "$_id.departamento_institucion_educativa",
        "municipio_institucion_educativa": "$_id.municipio_institucion_educativa",
        "carrera_objetivo": "$_id.carrera_objetivo"
      },
      "aspirantes_aprobados": {
        "$sum": 1
      }
    }
  },
  {
    "$project": {
      "_id": 0,
      "departamento_institucion_educativa": "$_id.departamento_institucion_educativa",
      "municipio_institucion_educativa": "$_id.municipio_institucion_educativa",
      "carrera_objetivo": "$_id.carrera_objetivo",
      "aspirantes_aprobados": 1
    }
  },
  {
    "$sort": {
      "aspirantes_aprobados": -1,
      "departamento_institucion_educativa": 1,
      "municipio_institucion_educativa": 1,
      "carrera_objetivo": 1
    }
  }
];
base.getCollection("evaluaciones").aggregate(pipeline,{allowDiskUse:true}).forEach(d=>printjson(d));
