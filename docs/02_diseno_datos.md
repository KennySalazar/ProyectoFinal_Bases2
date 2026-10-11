# Fase 2: infraestructura y diseno de datos

## Arquitectura

React se comunica con una API Spring Boot.
El backend consulta MongoDB y Neo4j.
El frontend no se conecta directamente a las bases.

MongoDB almacena las evaluaciones y resuelve las consultas analiticas.
Neo4j representa las relaciones para explorar los datos.

## Infraestructura

- MongoDB 7.0, puerto local 27018.
- Neo4j 5.26 Community, HTTP 7474 y Bolt 7687.
- Datos persistentes en volumenes Docker.
- Credenciales locales en .env, excluido de Git.
- Limite MongoDB: 768 MB.
- Limite Neo4j: 1536 MB.
- Heap Neo4j: 512 MB.
- Page cache Neo4j: 256 MB.

MongoDB 7.0 se selecciono despues de que MongoDB 8.0
rechazara el kernel del equipo durante el arranque.

## Modelo MongoDB

Base: admisiones_usac.

### evaluaciones

Un documento por evaluacion.

Campos del CSV:
- fecha_asignacion: fecha BSON, interpretada como fecha civil en UTC.
- sexo: texto.
- anio_nacimiento: entero o null.
- materia: texto.
- numero_de_fecha_de_evaluacion: entero positivo.
- anio_de_ingreso: entero.
- aprobacion: APROBADO o NO APROBADO.
- carrera_objetivo: texto.
- departamento_institucion_educativa: texto.
- municipio_institucion_educativa: texto.
- tipo_institucion_educativa: texto.
- correlativo_aspirante: identificador anonimo en texto.

Campos adicionales:
- evaluacion_id: SHA-256 de los 12 valores originales.
- edad_aproximada: anio_de_ingreso menos anio_nacimiento, o null.
- edad_valida_analisis: booleano.
- datos_originales: objeto con los valores originales.
- advertencias: lista de observaciones de calidad.
- carga_id: identificador de la primera carga que inserto el documento.
- sincronizacion_neo4j: PENDIENTE, SINCRONIZADO o ERROR.
- fecha_carga: fecha y hora de insercion.

### cargas

Un documento por archivo recibido en cada operacion de carga.

Incluye nombre de archivo, hash del archivo, fecha de inicio,
fecha de fin, duracion, estado, registros leidos, insertados,
duplicados y rechazados, ademas del progreso de sincronizacion.

Al finalizar el procesamiento:
leidos = insertados + duplicados + rechazados.

Los errores de sincronizacion no son rechazos del CSV.

### errores_carga

Incluye carga_id, numero_fila, datos originales y causa de rechazo.
numero_fila identifica el registro CSV; el encabezado es el numero 1.

### resumen_carrera

Coleccion auxiliar generada mediante agregaciones en la fase 5.
Su estructura se definira junto con la consulta requerida.

## Identidad y duplicados

El correlativo identifica al aspirante, no a la evaluacion.

Para evaluacion_id:
1. Unificar los nombres de encabezados.
2. Ordenar los 12 campos segun el listado anterior.
3. Serializar sus valores originales como un arreglo JSON de cadenas.
4. Usar UTF-8 y calcular SHA-256.

No incluir nombre de archivo, numero de fila ni fecha de carga.
No calcular el hash despues de corregir categorias.
Java y cualquier script deben usar la misma serializacion.

Una fila identica se registra como duplicada y no se inserta otra vez.
Registros diferentes del mismo aspirante se conservan.

## Modelo Neo4j

Nodos y propiedades unicas:
- Aspirante: correlativo_aspirante.
- Evaluacion: evaluacion_id.
- Materia: nombre.
- Carrera: nombre.
- TipoInstitucion: nombre.
- Municipio: clave.
- Departamento: nombre.

La clave de municipio se obtiene serializando como arreglo JSON
el departamento y el municipio normalizados.

Relaciones:
- Aspirante - REALIZO -> Evaluacion.
- Evaluacion - EVALUA -> Materia.
- Evaluacion - ASPIRA_A -> Carrera.
- Evaluacion - PROVIENE_DE_TIPO -> TipoInstitucion.
- Evaluacion - INSTITUCION_EN -> Municipio.
- Municipio - PERTENECE_A -> Departamento.

Fecha, anio, oportunidad, resultado y datos demograficos
del registro se conservan en Evaluacion.

La procedencia y carrera se vinculan con la evaluacion,
porque pueden cambiar entre registros del mismo aspirante.

No se crean colegios individuales: el CSV no identifica cada colegio.

El importador utilizara MERGE para nodos y relaciones.
Las restricciones de unicidad no evitan por si solas relaciones duplicadas.

## Reglas de transformacion

- Leer CSV UTF-8 y aceptar BOM.
- Interpretar columnas por encabezado, no por posicion.
- Reconocer los alias:
  numero_de_fecha_de_evaluaci -> numero_de_fecha_de_evaluacion.
  departamento_institucion_ed -> departamento_institucion_educativa.
  municipio_institucion_ -> municipio_institucion_educativa.
- Conservar datos originales.
- Normalizar espacios y mayusculas en categorias.
- No completar automaticamente textos truncados.
- Conservar NINGUNO, SIN DATOS y SIN REGISTRO como categorias
  cuando correspondan a campos textuales.
- Convertir SIN REGISTRO en nacimiento a null.
- Rechazar fechas invalidas, identificadores vacios, numeros
  obligatorios invalidos y resultados de aprobacion desconocidos.
- Un nacimiento ausente o invalido produce una advertencia;
  no elimina la evaluacion.
- Edad aproximada: anio de ingreso menos anio de nacimiento.
- Rango inicial para analisis de edad: 13 a 100, inclusive.
  Es una regla del proyecto, no un requisito del enunciado.
- Conservar registros fuera de ese rango con advertencia y
  edad_valida_analisis=false.
- No usar la fecha de asignacion como fecha comprobada del examen.
- Contar aspirantes distintos cuando se soliciten aspirantes.
- Contar evaluaciones cuando se soliciten evaluaciones.
- Aprobar una materia no demuestra admision a la carrera.
- El numero de oportunidad no demuestra cuantos intentos realizo
  un aspirante: se analizaran los registros disponibles.

## Sincronizacion

MongoDB conserva la informacion fuente procesada.
Neo4j mantiene su representacion en grafo.

No existe una transaccion unica entre ambas bases.

1. Insertar la evaluacion en MongoDB como PENDIENTE.
2. Crear o actualizar el grafo por lotes.
3. Marcar SINCRONIZADO despues de confirmar Neo4j.
4. Registrar ERROR si falla y permitir reintentos.
5. Una recarga tambien debe permitir recuperar documentos pendientes.

## Estado

Conexiones MongoDB y Neo4j comprobadas.
Scripts de indices y restricciones preparados.
Su ejecucion y verificacion deben comprobarse en el equipo local.
La persistencia con datos se probara durante la integracion.
