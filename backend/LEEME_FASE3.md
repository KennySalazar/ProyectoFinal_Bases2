# Backend fase 3

Java 21, Spring Boot 3.5.16 y Maven Wrapper 3.9.11.
Se fija Spring Boot 3.5 para mantener la configuracion y dependencias de esta entrega reproducibles.

## Instalacion

Extraer backend/ dentro de ProyectoFinal_Bases2/.
No reemplazar compose.yaml, .env ni los scripts de fase 2.
El directorio backend anterior solo contenia una carpeta vacia.

Desde la raiz del repositorio:

```bash
chmod +x backend/mvnw backend/ejecutar.sh
docker compose up -d
cd backend
./mvnw clean verify
./ejecutar.sh
```

Maven Wrapper descarga Maven y dependencias en la primera ejecucion.
No requiere instalar Maven globalmente. Requiere Java 21, curl o wget e Internet.
El script ejecutar.sh carga el .env de la raiz: Spring no lo lee automaticamente.
Solo usar un .env propio y confiable: source lo interpreta como instrucciones shell.
Las contrasenas hexadecimales generadas en fase 2 son validas para la URI MongoDB.
Si se cambian por caracteres reservados, deben codificarse para la URI.

## Verificacion en otra terminal

```bash
curl -i http://localhost:8091/api/v1/estado
```

Con ambas bases disponibles: HTTP 200 y estado DISPONIBLE.
Con una base inaccesible: HTTP 503 y estado DEGRADADO.
La respuesta indica el estado de cada motor sin revelar credenciales.
El endpoint ejecuta ping en MongoDB y RETURN 1 en Neo4j.

Para verificar recuperacion:

```bash
docker compose stop neo4j
curl -i http://localhost:8091/api/v1/estado
docker compose start neo4j
```

Esperar que Neo4j este healthy antes de volver a consultar.
Detener el backend con Ctrl+C.

## Organizacion

- estado/: controlador, servicio y DTO del estado de bases.
- config/: CORS restringido al origen de React.
- comun/: manejo centralizado de errores HTTP.
- application.yml: conexiones, timeouts y limites de archivos.
- src/test/: pruebas de disponibilidad y fallas independientes.

Puerto 8091 para evitar conflicto con otros proyectos en 8090.
CORS permite http://localhost:5173 y puede cambiarse con FRONTEND_ORIGIN.
Los errores MVC habituales se manejan mediante ResponseEntityExceptionHandler.
No se usa JPA, PostgreSQL, login ni entidades relacionales.
El usuario MongoDB es el administrador local de fase 2; para despliegue
se debera usar una cuenta de aplicacion con permisos limitados.

## Alcance

Esta entrega prepara la API y las conexiones. No implementa carga CSV,
consultas analiticas ni frontend: corresponden a fases posteriores.
No crea ni elimina indices o restricciones existentes.

## Git despues de comprobar

```bash
git add backend
git commit -m "feat: crear backend base y comprobar conexiones NoSQL"
git push
```

## Cierre de fase 3

- Compilacion y pruebas locales correctas.
- API inicia usando Java 21 y el .env del repositorio.
- /estado devuelve HTTP 200 con ambas bases disponibles.
- Una base detenida produce HTTP 503; al iniciarla se recupera.

## Validacion realizada al preparar esta entrega

Compilacion, empaquetado y 3 pruebas unitarias correctas.
El entorno de preparacion dispone de Java 17, por lo que se verifico
con -Djava.version=17. El pom entregado conserva Java 21.
La compilacion definitiva con Java 21 y la conexion a los contenedores
del estudiante quedan pendientes de comprobar en Ubuntu.
No se incluyen binarios target ni credenciales en el ZIP.
