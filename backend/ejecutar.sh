#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if [[ ! -f ../.env ]]; then
  echo "Falta .env en la raiz del repositorio." >&2
  exit 1
fi
set -a
source ../.env
set +a
: "${MONGO_ROOT_USERNAME:?Falta usuario MongoDB}"
: "${MONGO_ROOT_PASSWORD:?Falta password MongoDB}"
: "${NEO4J_PASSWORD:?Falta password Neo4j}"
export MAVEN_OPTS="${MAVEN_OPTS:--Xmx384m}"
exec ./mvnw spring-boot:run -Dspring-boot.run.jvmArguments="-Xms128m -Xmx512m"
