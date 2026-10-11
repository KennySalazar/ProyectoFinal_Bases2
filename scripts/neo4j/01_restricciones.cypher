CREATE CONSTRAINT uq_aspirante_correlativo IF NOT EXISTS
FOR (a:Aspirante)
REQUIRE a.correlativo_aspirante IS UNIQUE;

CREATE CONSTRAINT uq_evaluacion_id IF NOT EXISTS
FOR (e:Evaluacion)
REQUIRE e.evaluacion_id IS UNIQUE;

CREATE CONSTRAINT uq_materia_nombre IF NOT EXISTS
FOR (m:Materia)
REQUIRE m.nombre IS UNIQUE;

CREATE CONSTRAINT uq_carrera_nombre IF NOT EXISTS
FOR (c:Carrera)
REQUIRE c.nombre IS UNIQUE;

CREATE CONSTRAINT uq_tipo_institucion_nombre IF NOT EXISTS
FOR (t:TipoInstitucion)
REQUIRE t.nombre IS UNIQUE;

CREATE CONSTRAINT uq_municipio_clave IF NOT EXISTS
FOR (m:Municipio)
REQUIRE m.clave IS UNIQUE;

CREATE CONSTRAINT uq_departamento_nombre IF NOT EXISTS
FOR (d:Departamento)
REQUIRE d.nombre IS UNIQUE;

SHOW CONSTRAINTS
YIELD name, type, labelsOrTypes, properties
RETURN name, type, labelsOrTypes, properties
ORDER BY name;
