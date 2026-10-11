// Ejecutar con mongosh --file. Datos procesados en admisiones_usac.
// Las definiciones son compartidas con la API para evitar divergencia.
const fs = require("fs");
const base = db.getSiblingDB("admisiones_usac");
const definiciones = JSON.parse(
  fs.readFileSync("backend/src/main/resources/consultas/mongodb.json", "utf8"),
);
const numero = Number(process.env.CONSULTA || "1");
const q = definiciones.consultas.find((c) => c.id === numero);
if (!q) throw new Error("CONSULTA debe estar entre 1 y 20");
if (numero === 6 && process.env.GENERAR_RESUMEN === "1") {
  base.evaluaciones
    .aggregate(definiciones.resumen_pipeline, { allowDiskUse: true })
    .toArray();
}
const pipeline = [];
const filtro = {};
if (process.env.ANIO) filtro.anio_de_ingreso = Number(process.env.ANIO);
if (process.env.ASPIRANTE) filtro.correlativo_aspirante = process.env.ASPIRANTE;
if ((numero === 11 || numero === 15) && !process.env.ASPIRANTE)
  throw new Error("Se requiere ASPIRANTE");
if (numero === 6 && process.env.ANIO)
  throw new Error("Resumen global no admite ANIO");
if (Object.keys(filtro).length) pipeline.push({ $match: filtro });
pipeline.push(...q.pipeline);
print(q.titulo);
base
  .getCollection(q.coleccion)
  .aggregate(pipeline, { allowDiskUse: true })
  .forEach((d) => printjson(d));
