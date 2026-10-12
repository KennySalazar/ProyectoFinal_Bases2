// Carreras mas demandadas por departamento
// Ejecutar desde la raiz del repo con mongosh --file.
// Fuente oficial: backend/src/main/resources/consultas/mongodb.json
const base=db.getSiblingDB("admisiones_usac");
const pipeline=[
  {
    "$match": {
      "carrera_objetivo": {
        "$nin": [
          "NINGUNO",
          "SIN REGISTRO"
        ]
      }
    }
  },
  {
    "$group": {
      "_id": {
        "departamento_institucion_educativa": "$departamento_institucion_educativa",
        "carrera_objetivo": "$carrera_objetivo",
        "aspirante": "$correlativo_aspirante"
      }
    }
  },
  {
    "$group": {
      "_id": {
        "departamento_institucion_educativa": "$_id.departamento_institucion_educativa",
        "carrera_objetivo": "$_id.carrera_objetivo"
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
      "carrera_objetivo": "$_id.carrera_objetivo",
      "aspirantes": 1
    }
  },
  {
    "$sort": {
      "aspirantes": -1,
      "departamento_institucion_educativa": 1,
      "carrera_objetivo": 1
    }
  },
  {
    "$sort": {
      "departamento_institucion_educativa": 1,
      "aspirantes": -1,
      "carrera_objetivo": 1
    }
  }
];
base.getCollection("evaluaciones").aggregate(pipeline,{allowDiskUse:true}).forEach(d=>printjson(d));
