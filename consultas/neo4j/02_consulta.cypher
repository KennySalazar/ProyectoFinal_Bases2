// Rendimiento por materia y carrera
// Evaluaciones y aspirantes distintos conectados a cada materia y carrera; la tasa mide evaluaciones.
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
WITH m,c,count(DISTINCT a) AS aspirantes, count(DISTINCT e) AS evaluaciones,
count(DISTINCT CASE WHEN e.aprobacion='APROBADO' THEN e END) AS aprobadas
RETURN m.nombre AS materia,c.nombre AS carrera,aspirantes,evaluaciones,aprobadas,
evaluaciones-aprobadas AS no_aprobadas,round(100.0*aprobadas/evaluaciones,2) AS porcentaje_aprobacion
ORDER BY evaluaciones DESC, carrera, materia;
