const base = db.getSiblingDB("admisiones_usac");

const colecciones = [
  "evaluaciones",
  "cargas",
  "errores_carga",
  "resumen_carrera"
];

for (const nombre of colecciones) {
  if (!base.getCollectionNames().includes(nombre)) {
    base.createCollection(nombre);
  }
}

base.evaluaciones.createIndex(
  { evaluacion_id: 1 },
  { unique: true, name: "uq_evaluacion_id" }
);

base.evaluaciones.createIndex(
  {
    correlativo_aspirante: 1,
    anio_de_ingreso: 1,
    materia: 1,
    numero_de_fecha_de_evaluacion: 1
  },
  { name: "idx_historial_aspirante" }
);

base.evaluaciones.createIndex(
  { anio_de_ingreso: 1, carrera_objetivo: 1 },
  { name: "idx_anio_carrera" }
);

base.evaluaciones.createIndex(
  { sincronizacion_neo4j: 1 },
  { name: "idx_sincronizacion_neo4j" }
);

base.cargas.createIndex(
  { fecha_inicio: -1 },
  { name: "idx_cargas_fecha" }
);

base.errores_carga.createIndex(
  { carga_id: 1, numero_fila: 1 },
  { name: "idx_errores_carga_fila" }
);

print("Base inicializada: " + base.getName());

for (const nombre of colecciones) {
  print("Coleccion: " + nombre);
  printjson(base.getCollection(nombre).getIndexes());
}
