// Trayectoria del aspirante
// Recorre aspirante, evaluaciones, materias, carreras y procedencia. Requiere correlativo exacto.
MATCH (a:Aspirante)-[:REALIZO]->(e:Evaluacion)-[:EVALUA]->(m:Materia)
MATCH (e)-[:ASPIRA_A]->(c:Carrera)
MATCH (e)-[:PROVIENE_DE_TIPO]->(t:TipoInstitucion)
MATCH (e)-[:INSTITUCION_EN]->(u:Municipio)-[:PERTENECE_A]->(d:Departamento)
WHERE ($anio IS NULL OR e.anio_de_ingreso=$anio)
  AND ($carrera='' OR c.nombre=$carrera)
  AND ($materia='' OR m.nombre=$materia)
  AND ($tipo='' OR t.nombre=$tipo)
  AND ($departamento='' OR d.nombre=$departamento)
  AND ($aspirante='' OR a.correlativo_aspirante=$aspirante)
RETURN DISTINCT a.correlativo_aspirante AS correlativo_aspirante,
e.evaluacion_id AS evaluacion_id, e.anio_de_ingreso AS anio_de_ingreso,
toString(e.fecha_asignacion) AS fecha_asignacion,
e.numero_de_fecha_de_evaluacion AS oportunidad, e.aprobacion AS aprobacion,
m.nombre AS materia, c.nombre AS carrera,
t.nombre AS tipo_institucion, u.nombre AS municipio, d.nombre AS departamento
ORDER BY anio_de_ingreso, fecha_asignacion, oportunidad, materia, evaluacion_id;
