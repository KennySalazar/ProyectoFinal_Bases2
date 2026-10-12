// Materias compartidas por aspirantes
// Pares de materias registradas para el mismo aspirante y anio. No demuestra que haya aprobado ambas. No admite filtro de materia.
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
WITH a,e.anio_de_ingreso AS anio,collect(DISTINCT m.nombre) AS materias
UNWIND materias AS materia_a
UNWIND materias AS materia_b
WITH a,anio,materia_a,materia_b WHERE materia_a<materia_b
RETURN materia_a,materia_b,count(DISTINCT a) AS aspirantes,
count(*) AS coincidencias_aspirante_anio
ORDER BY aspirantes DESC,materia_a,materia_b;
