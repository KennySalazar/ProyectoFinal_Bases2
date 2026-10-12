# Modelo y consultas Neo4j

Se utiliza el grafo instalado en fase 2 y poblado por el ETL de fase 4.
No se agregan relaciones artificiales entre aspirantes. Materias compartidas
significa que los IDs tienen evaluaciones en esas materias, no una amistad ni
una conexion directa entre personas.

## Modelo

Aspirante -REALIZO-> Evaluacion -EVALUA-> Materia.
Evaluacion -ASPIRA_A-> Carrera; -PROVIENE_DE_TIPO-> TipoInstitucion;
-INSTITUCION_EN-> Municipio -PERTENECE_A-> Departamento.

Aprobacion, sexo, nacimiento y edad permanecen en Evaluacion, porque pueden
variar o faltar entre registros de un mismo ID. Lugar es el de la institucion,
no la residencia. No existe nombre o ID de colegio individual en la fuente.
APROBADO no implica que se haya completado la admision.

## Cinco consultas

| Nro | Consulta | Criterio |
|---|---|---|
| 1 | Trayectoria del aspirante | Recorre aspirante, evaluaciones, materias, carreras y procedencia. Requiere correlativo exacto. |
| 2 | Rendimiento por materia y carrera | Evaluaciones y aspirantes distintos conectados a cada materia y carrera; la tasa mide evaluaciones. |
| 3 | Conexiones entre procedencia y carrera | Recorre departamento, municipio, evaluacion y carrera. Cuenta IDs distintos por procedencia institucional. |
| 4 | Materias compartidas por aspirantes | Pares de materias registradas para el mismo aspirante y anio. No demuestra que haya aprobado ambas. No admite filtro de materia. |
| 5 | Recuperacion en oportunidades posteriores | IDs con NO APROBADO seguido de APROBADO en una oportunidad mayor, para la misma materia, carrera y anio. Los filtros de procedencia se aplican a la evaluacion inicial. |

En consultas 2 y 3, count(DISTINCT e) evita multiplicar evaluaciones por
recorridos. count(DISTINCT a) cuenta aspirantes dentro del grupo, no filas CSV.
Consulta 4 agrupa materias distintas por aspirante/anio, genera pares ordenados
alfabeticamente y evita el par inverso o pares de una materia consigo misma.
Consulta 5 exige una oportunidad mayor en el mismo anio, materia y carrera;
no infiere intentos ausentes. Varias evaluaciones iniciales o posteriores no
multiplican la cantidad de aspirantes recuperados. Filtrar por procedencia en
esta consulta restringe la evaluacion inicial, no la posterior.

Las definiciones de ejecucion estan en backend/src/main/resources/consultas/neo4j.json.
Los archivos consultas/neo4j/01..05 son copias legibles para cypher-shell o Neo4j
Browser. Ambos se entregan con el mismo contenido; si se cambia una consulta,
actualizar la definicion y su copia. El catalogo de la API muestra el Cypher.

## Parametros y ejecucion manual

Todas las consultas usan anio (null o entero) y carrera, materia, tipo,
departamento, aspirante (cadenas vacias para no filtrar). Ejemplo en Neo4j Browser:

```cypher
:param anio => null;
:param carrera => '';
:param materia => '';
:param tipo => '';
:param departamento => '';
:param aspirante => '949d241ac10256edf11339a303c72a50';
```

Pegar luego la consulta 1. Para las otras, aspirante puede ser ''. Para el
archivo 06_explorador se agregan aprobacion ('' o resultado) y limite (entero).
La API pide limite+1 internamente para detectar hay_mas y recorta el adicional.
No depende de APOC ni plugins del servidor. Todas las consultas son de lectura.

## API bajo /api/v1/neo4j

- GET /consultas: cinco definiciones y Cypher.
- GET /consultas/{id}: filtros y paginacion, por defecto 25, maximo 100.
- GET /opciones: opciones tomadas de Neo4j, sin depender de MongoDB.
- GET /resumen: totales de nodos Aspirante, Evaluacion y relaciones.
- GET /grafo: muestra de evaluaciones y vecinos, limite 1..30.

Filtros exactos: anio, carrera, materia, tipo, departamento y aspirante.
Solo /grafo admite aprobacion. No se acepta Cypher libre desde el navegador.
Todos los valores del usuario se envian como parametros del driver.
La consulta 1 requiere aspirante; consulta 4 rechaza materia. Anio 1900..2100.

La tabla pagina sobre todas las filas coincidentes, con conteo y lectura en
una transaccion executeRead. Tiempo maximo 60 segundos para consulta y 30 para
grafo. Los filtros y el orden determinista permiten reproducir resultados.
La indisponibilidad de Neo4j se presenta como HTTP 503 con mensaje controlado.

## Visualizacion

Cytoscape.js representa nodos y relaciones recuperados de Neo4j. Cada fila del
recorrido confirma las seis relaciones del modelo; la API genera sus extremos
y tipos a partir de ese recorrido y deduplica por identidad de negocio.
No exporta los ID internos de almacenamiento como identidad permanente.
El ID visual es SHA-256 del JSON de [tipo de nodo, clave unica]. La clave es
correlativo, evaluacion_id, clave de municipio o nombre segun la etiqueta.
El ID de relacion visual es SHA-256 de [origen, tipo, destino]. Esto agrupa
relaciones equivalentes del modelo en una sola arista visual.

El limite aplica a evaluaciones, no al numero total de nodos: cada evaluacion
incluye sus vecinos. No se interpretan los nodos mostrados como un total
estadistico ni se eliminan datos para limitar el grafo. Las propiedades
completas se consultan seleccionando el nodo; etiquetas largas se acortan
solo para dibujarlo. Ajustar vista, zoom, mover nodos y organizar por niveles
operan sobre el navegador y no modifican Neo4j.

Los totales superiores de la app siguen siendo los de MongoDB; el explorador
muestra tambien sus propios totales Neo4j. Si hay pendientes, completar la
sincronizacion antes de comparar ambos motores. Neo4j usa nodos de IDs y no
un conteo sumado de aspirantes por carrera.

## Pruebas

Pruebas unitarias de filtros, parametros literales, limites y catalogo.
Perfil opcional de integracion con Neo4j 5.26.0 temporal y ocho registros:

```bash
./mvnw -Pneo4j-integration test
```

No conecta con tus contenedores ni modifica admisiones_usac. Descarga
neo4j-harness y puede usar mas memoria que las pruebas unitarias normales.
Para la laptop basta ./mvnw clean verify y scripts/verificar_fase6.py contra
los contenedores reales. La preparacion compila con Java 17 mediante override;
el proyecto entregado declara Java 21 para tu entorno.

Referencias:
- https://neo4j.com/docs/cypher-manual/5/functions/scalar/
- https://neo4j.com/docs/java-manual/current/transactions/
- https://js.cytoscape.org/

Verificacion de preparacion: 34 pruebas aprobadas (29 unitarias y 5 de integracion
con Neo4j real temporal). Frontend compilado y revisado a 1440 y 390 px con
respuestas simuladas para la prueba visual. Falta la verificacion con los
CSV reales de tus contenedores mediante scripts/verificar_fase6.py.
