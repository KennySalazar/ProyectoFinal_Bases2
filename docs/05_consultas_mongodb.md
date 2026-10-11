# Consultas MongoDB y decisiones de analisis

Las veinte consultas corresponden al enunciado. Sus pipelines completos estan en
`backend/src/main/resources/consultas/mongodb.json`. La API y el script mongosh
leen esa misma fuente para evitar dos implementaciones diferentes.

## Criterios generales

- Evaluacion: documento distinto del ETL, identificado por evaluacion_id.
- Aspirante: correlativo anonimo distinto dentro del grupo analizado. Un ID puede
  pertenecer a varias carreras, tipos o ubicaciones; los grupos no son sumables
  como si fueran personas distintas entre si. No se fusionan IDs truncados.
- APROBADO se refiere a una evaluacion. Para consultas de aspirantes aprobados,
  se cuenta un ID con al menos una evaluacion aprobada en el grupo. No se
  interpreta como admision, ni como aprobar todas las materias.
- Ubicacion: departamento y municipio de la institucion educativa. No residencia.
- Edad: ingreso menos nacimiento. Para analisis se admiten solo edades 13..100.
  SIN REGISTRO y edades anormales quedan fuera del calculo de edad, conservando
  las filas para otros analisis. El promedio usa una observacion por ID, anio y
  grupo. Si un ID/anio/grupo tiene edades contradictorias, primero promedia esas
  observaciones, sin elegir arbitrariamente la primera fila.
- Intentos: oportunidades distintas registradas por aspirante, anio y materia.
  El numero de oportunidad no demuestra que existan todos los intentos previos.
- Demanda: IDs distintos por carrera; NINGUNO y SIN REGISTRO se excluyen de
  rankings de demanda y carreras reprobadas. Se conservan en otras distribuciones.
- SIN REGISTRO en sexo se presenta como categoria; no se asigna M ni F.
- Los textos truncados se presentan como categorias originales normalizadas.
  No hay una equivalencia segura para fusionar carreras o municipios incompletos.
- Tasas: porcentaje de evaluaciones aprobadas, con dos decimales. Los numeros
  de consultas no cambian entre frontend, API, script y documentacion.

## Catalogo

| Nro | Consulta | Interpretacion |
|---|---|---|
| 1 | Aspirantes por tipo de institucion | IDs distintos por tipo; un ID puede pertenecer a varios tipos. |
| 2 | Evaluaciones aprobadas por materia | Cuenta evaluaciones con resultado APROBADO. |
| 3 | Aspirantes aprobados por carrera y anio | IDs distintos con al menos una evaluacion aprobada; no significa admision completa. |
| 4 | Porcentaje de aprobacion por materia | Evaluaciones aprobadas / evaluaciones totales por materia. |
| 5 | Promedio de edad por carrera | Una observacion por aspirante, anio y carrera; edades validas de 13 a 100. |
| 6 | Coleccion auxiliar resumen_carrera | Resumen GLOBAL materializado. Use Generar resumen; luego filtre por carrera. No admite filtros de anio, materia, tipo o departamento. |
| 7 | Edad de aprobados por carrera y tipo | IDs con alguna evaluacion aprobada; una observacion por aspirante, anio, carrera y tipo con edad valida. |
| 8 | Aprobados por municipio y carrera | Aspirantes distintos con alguna aprobacion; municipio de la institucion, identificado junto al departamento. |
| 9 | Evaluaciones por mes y materia: sector publico | Mes de fecha_asignacion en UTC, separado por anio calendario; no es fecha efectiva del examen. |
| 10 | Top 5 carreras: aspirantes de 16 a 18 anios | IDs distintos por carrera con edad 16..18; excluye NINGUNO y SIN REGISTRO. |
| 11 | Historial de desempeno del aspirante | Ingrese un correlativo exacto. Muestra oportunidades registradas y resultados, sin inferir intentos ausentes. |
| 12 | Aspirantes por sexo y tipo de institucion | IDs distintos por combinacion; incluye SIN REGISTRO. |
| 13 | Tasa de aprobacion por edad | Tasa sobre evaluaciones con edad aproximada valida; no cuenta personas como evaluaciones. |
| 14 | Promedio de oportunidades registradas por materia | Cuenta oportunidades distintas por aspirante, anio y materia y promedia. No promedia el numero de oportunidad ni presupone intentos no observados. |
| 15 | Historial completo del aspirante | Ingrese un correlativo exacto. Incluye originales, advertencias y estado de sincronizacion. |
| 16 | Carreras con mas reprobados en primera oportunidad | IDs distintos con NO APROBADO en oportunidad 1 de alguna materia; no implica fracaso definitivo. Excluye carrera no definida. |
| 17 | Top 5 municipios con mas aspirantes | IDs distintos por departamento y municipio de la institucion; no es residencia. |
| 18 | Tasa de aprobacion por tipo de institucion | Tasa sobre evaluaciones, no sobre aspirantes unicos. |
| 19 | Carreras mas demandadas por departamento | Ranking por IDs distintos en cada departamento de institucion. Excluye carrera no definida; conserva todas las carreras para mostrar empates. |
| 20 | Evolucion de aprobacion por anio | Cantidad y porcentaje de evaluaciones aprobadas y no aprobadas por anio de ingreso. |

## Resumen materializado

La consulta 6 usa una coleccion auxiliar GLOBAL. El boton Generar resumen global
ejecuta el pipeline resumen_pipeline con $out. Agrupa primero ID/carrera, luego
carrera: cuenta aspirantes sin multiplicarlos por cantidad de evaluaciones.
Almacena evaluaciones, aprobadas, no aprobadas, aspirantes, aspirantes con alguna
aprobacion, porcentaje y fecha_generacion. _id es la carrera.
El resumen se reemplaza al terminar la agregacion; si falla la agregacion, MongoDB
conserva la coleccion previa. El ETL no actualiza este resumen automaticamente.
Debe regenerarse despues de nuevas cargas. Solo admite filtro de carrera.
Se bloquea su generacion mientras hay una carga o sincronizacion activa en esta
instancia mediante el mismo control exclusivo del ETL. No hay bloqueo distribuido.

## API

- GET /api/v1/consultas: catalogo de las 20 consultas.
- GET /api/v1/consultas/opciones: valores existentes para filtros.
- GET /api/v1/consultas/{id}: resultado paginado.
- POST /api/v1/consultas/resumen-carrera: materializa el resumen global.

Filtros exactos opcionales: anio, carrera, materia, tipo, departamento y aspirante.
Usar los selectores del frontend para tomar los valores normalizados existentes.
Historiales 11 y 15 requieren aspirante. No se aceptan consultas MongoDB, regex ni
operadores enviados por el cliente. El backend ejecuta pipelines predefinidos.
Los filtros se aplican antes de la agregacion: tasas y rankings pertenecen al
subconjunto filtrado, no al dataset completo. Q6 tiene filtros restringidos.

pagina comienza en cero; tamano entre 1 y 100, por defecto 25. Respuesta:
consulta, titulo, descripcion, filtros, pagina, tamano, total y filas. total es
numero de filas del resultado agrupado, no numero de evaluaciones. $facet
obtiene filas paginadas y conteo en una sola agregacion. Los historiales conservan
un orden estable por anio, fecha, oportunidad, materia e ID de evaluacion.
Las tasas/rankings muestran sus ordenes en mongodb.json. Los top 5 usan desempate
alfabetico estable; consulta 19 conserva todas las carreras por departamento
ordenadas por demanda para mostrar empates. Cada consulta tiene maxTime de 60 s
y allowDiskUse. Esto no elimina los limites propios de $facet.
Las lecturas durante una carga pueden observar datos parciales: completar cargas
antes de comparar resultados. El script de verificacion rechaza ocupado=true.

## Scripts mongosh

02_consultas.js lee las definiciones desde una ruta relativa a la raiz del repo.
No es un archivo para pegar directamente en la consola sin la fuente JSON.
Una forma de usarlo sin copiar credenciales al historial:
```bash
cd ~/Documentos/ProyectoFinal_Bases2
docker compose cp scripts/mongodb/02_consultas.js mongodb:/tmp/02_consultas.js
docker compose cp backend/src/main/resources/consultas/mongodb.json mongodb:/tmp/mongodb.json
docker compose exec -e CONSULTA=4 mongodb sh -c 'mkdir -p /tmp/bd2/backend/src/main/resources/consultas; cp /tmp/mongodb.json /tmp/bd2/backend/src/main/resources/consultas/mongodb.json; cd /tmp/bd2; mongosh --quiet --username "$MONGO_INITDB_ROOT_USERNAME" --password "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --file /tmp/02_consultas.js'
```
CONSULTA=6 y GENERAR_RESUMEN=1 regenera la coleccion. Para historial agregar
ASPIRANTE mediante docker compose exec -e ASPIRANTE=correlativo. ANIO es opcional.
El script no implementa el control exclusivo de la API; usarlo con ETL detenido.

## Verificacion y limites de la preparacion

Backend compilado y empaquetado; 22 pruebas unitarias, incluyendo filtros, limites,
catalogo, historiales y preservacion del ETL. Java 17 en preparacion con override;
el proyecto entregado exige Java 21 y se valida con ./mvnw clean verify en destino.
Los 20 pipelines se comprobaron con una fixture independiente en Mingo 6.7.2,
incluyendo IDs repetidos, oportunidad repetida, dos anios y datos faltantes.
Mingo NO sustituye la prueba en MongoDB real. El servidor MongoDB local no pudo
iniciar en el entorno de preparacion, por una restriccion del sistema.
La prueba real con MongoDB 7.0 de la PC destino se automatiza con
scripts/verificar_fase5.py y se revisa desde la interfaz.
Frontend: build de produccion y revision de pantallas con datos de prueba.
El ZIP no agrega datos ficticios ni archivos de prueba a la base del usuario.

Fuentes de referencia:
- https://www.mongodb.com/docs/manual/reference/operator/aggregation/out/
- https://www.mongodb.com/docs/manual/reference/operator/aggregation/facet/
