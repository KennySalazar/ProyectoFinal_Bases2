// Conexiones entre procedencia y carrera
// Recorre departamento, municipio, evaluacion y carrera. Cuenta IDs distintos por procedencia institucional.
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
RETURN d.nombre AS departamento,u.nombre AS municipio,c.nombre AS carrera,
count(DISTINCT a) AS aspirantes,count(DISTINCT e) AS evaluaciones
ORDER BY departamento, aspirantes DESC, municipio, carrera;
