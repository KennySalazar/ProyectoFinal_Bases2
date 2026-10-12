// Recuperacion en oportunidades posteriores
// IDs con NO APROBADO seguido de APROBADO en una oportunidad mayor, para la misma materia, carrera y anio. Los filtros de procedencia se aplican a la evaluacion inicial.
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
WITH DISTINCT a,e,m,c WHERE e.aprobacion='NO APROBADO'
MATCH (a)-[:REALIZO]->(posterior:Evaluacion)-[:EVALUA]->(m)
MATCH (posterior)-[:ASPIRA_A]->(c)
WHERE posterior.aprobacion='APROBADO'
  AND posterior.anio_de_ingreso=e.anio_de_ingreso
  AND posterior.numero_de_fecha_de_evaluacion>e.numero_de_fecha_de_evaluacion
RETURN m.nombre AS materia,c.nombre AS carrera,
count(DISTINCT a) AS aspirantes_recuperados,
count(DISTINCT posterior) AS evaluaciones_posteriores_aprobadas
ORDER BY aspirantes_recuperados DESC,carrera,materia;
