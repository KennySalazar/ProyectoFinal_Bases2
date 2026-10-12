// Aspirantes aprobados por carrera y anio
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
        "carrera_objetivo": "$carrera_objetivo",
        "anio_de_ingreso": "$anio_de_ingreso",
        "aspirante": "$correlativo_aspirante"
      }
    }
  },
  {
    "$group": {
      "_id": {
        "carrera_objetivo": "$_id.carrera_objetivo",
        "anio_de_ingreso": "$_id.anio_de_ingreso"
      },
      "aspirantes_aprobados": {
        "$sum": 1
      }
    }
  },
  {
    "$project": {
      "_id": 0,
      "carrera_objetivo": "$_id.carrera_objetivo",
      "anio_de_ingreso": "$_id.anio_de_ingreso",
      "aspirantes_aprobados": 1
    }
  },
  {
    "$sort": {
      "aspirantes_aprobados": -1,
      "carrera_objetivo": 1,
      "anio_de_ingreso": 1
    }
  }
];
base.getCollection("evaluaciones").aggregate(pipeline,{allowDiskUse:true}).forEach(d=>printjson(d));
