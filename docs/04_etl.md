# Diseno y validacion del ETL

## Flujo

CSV UTF-8 -> validacion por registro -> lotes de 200 upserts MongoDB ->
lotes de 200 MERGE Neo4j -> confirmacion SINCRONIZADO en MongoDB.
MongoDB es la fuente de datos. No hay transaccion distribuida entre motores.
La confirmacion ocurre despues del commit de Neo4j. Si falla MongoDB al
confirmar, se puede repetir el MERGE sin crear nodos o relaciones adicionales.
Esto presupone las restricciones de unicidad instaladas en fase 2 y una sola
instancia escritora de esta API.

Los documentos originales se conservan. No se sobrescribe un duplicado ni su
carga_id original; cargas registra todos los intentos de subida.

## Identidad

evaluacion_id: SHA-256 del JSON compacto UTF-8 de los doce valores originales,
sin trim y en el orden canonico de CsvDatos.CAMPOS. No contiene nombre de archivo.
El orden de columnas y los tres alias conocidos no alteran esta identidad.
Dos filas distintas que solo difieren en espacios siguen siendo distintas;
los campos normalizados pueden coincidir. Duplicado significa original exacto.
Municipio.clave es el JSON de [departamento normalizado, municipio normalizado].

## Validaciones

- Exactamente los 12 encabezados, sin desconocidos ni duplicados.
- Alias conocidos de 2022-2024 admitidos; orden de columnas libre; BOM admitido.
- CSV RFC4180, comas y comillas; se conservan registros multilinea.
- 12 columnas y campos no vacios.
- Fecha civil valida YYYY-MM-DD, almacenada como BSON Date a medianoche UTC.
- Ingreso entre 1900 y 2100; fecha en el anio de ingreso o el anterior.
- Oportunidad entre 1 y 5.
- Sexo M, F o SIN REGISTRO; este ultimo se conserva y genera advertencia.
- Aprobacion APROBADO o NO APROBADO.
- Nacimiento numerico entre 1800 y 2100, no posterior al ingreso; SIN REGISTRO
  se almacena como null y genera advertencia.
- Edad aproximada = ingreso - nacimiento. Solo 13..100 se usa en analisis de edad.
  Los otros registros se conservan con advertencia. Es una regla del proyecto,
  no una edad medida ni una regla de admision de USAC.
- Fuentes con ingreso >=2022 reciben advertencia de posibles textos truncados.
  No se inventan ampliaciones de carrera o municipio. No se cambia el ID aspirante.

Las reglas temporales y numericas estan ajustadas al dataset entregado y deben
revisarse si posteriormente se incorpora otra fuente.

## Estados y contadores

cargas.estado: EN_PROCESO, COMPLETADA, FALLIDA o INTERRUMPIDA.
COMPLETADA significa lectura y persistencia MongoDB terminadas; puede haber
rechazados o pendientes Neo4j. FALLIDA identifica problemas estructurales de
CSV, encabezados, codificacion o persistencia. Conserva el prefijo confirmado.
Una nueva carga marca INTERRUMPIDA cualquier EN_PROCESO de la ejecucion anterior.

leidos = insertados + duplicados + rechazados para resultados confirmados.
con_advertencias cuenta filas validas procesadas con alguna advertencia,
incluidas duplicadas; no es una cantidad adicional a leidos.
Un CSV estructuralmente roto puede impedir leer registros posteriores: no se
inventa su numero. numero_fila representa numero de registro + encabezado,
no linea fisica cuando hay saltos de linea dentro de comillas.

Si una escritura devuelve un resultado parcial conocido, se contabiliza ese
prefijo. Si hay perdida de conexion con resultado incierto, se marca
contadores_confirmados=false: los contadores son el ultimo punto confirmado,
no necesariamente todas las filas persistidas. Recargar recupera los datos
sin duplicarlos. El estado FALLIDA no implica rollback de todo el archivo.

sincronizacion_neo4j: PENDIENTE, ERROR o SINCRONIZADO por evaluacion.
Una falla del grafo no convierte una fila valida en rechazado CSV.
El reporte de sincronizacion es global; no representa solo el archivo actual.
Duracion ETL y total (incluido intento Neo4j) se registran por separado.

## API bajo /api/v1

| Metodo | Ruta | Uso |
|---|---|---|
| POST | /cargas | Multipart, campo archivo, un CSV |
| GET | /cargas | Ultimas 50 cargas |
| GET | /cargas/resumen | Totales globales y ocupado |
| GET | /cargas/{id} | Una carga |
| GET | /cargas/{id}/errores?pagina=0 | Errores en paginas de 100 |
| POST | /cargas/sincronizar | Reintentar todos los pendientes |

400: archivo vacio/extension invalida o pagina negativa; 404: carga inexistente;
409: otro proceso activo; 413: limites multipart. Errores a nivel archivo despues
de registrar la carga devuelven su reporte HTTP 200 con estado FALLIDA; revisar
siempre estado, no solo el codigo HTTP. Mensajes internos no exponen credenciales.

## Alcance de verificacion

Se compila y empaqueta backend y frontend. Pruebas unitarias de conversion y
orden de confirmacion del grafo, usando dobles para las bases. Verificacion de
los diez CSV reales mediante dataset.dir. En el entorno de preparacion Java 17
se usa -Djava.version=17; el proyecto entregado declara Java 21 y debe verificarse
con ./mvnw clean verify en la PC destino. Docker no esta disponible en el entorno
de preparacion: la prueba integrada real MongoDB/Neo4j queda en la guia.

Para volver a comprobar todos los CSV sin cargarlos:

```bash
./mvnw -Ddataset.dir=/ruta/a/ArchivosCSV test
```


