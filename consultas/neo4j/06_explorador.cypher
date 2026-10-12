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
  AND ($aprobacion='' OR e.aprobacion=$aprobacion)
WITH DISTINCT a,e,m,c,t,u,d
ORDER BY e.anio_de_ingreso,e.evaluacion_id
LIMIT $limite
RETURN a,e,m,c,t,u,d;
