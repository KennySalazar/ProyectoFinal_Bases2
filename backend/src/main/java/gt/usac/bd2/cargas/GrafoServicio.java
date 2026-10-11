package gt.usac.bd2.cargas;
import org.bson.Document;
import org.neo4j.driver.Driver;
import org.neo4j.driver.SessionConfig;
import org.neo4j.driver.TransactionConfig;
import org.springframework.stereotype.Service;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.*;
import java.util.*;
import java.time.*;
@Service
public class GrafoServicio{
 private final MongoTemplate mongo;private final Driver driver;
 public GrafoServicio(MongoTemplate mongo,Driver driver){this.mongo=mongo;this.driver=driver;}
 static final String CYPHER="""
 UNWIND $filas AS r
 MERGE (a:Aspirante {correlativo_aspirante:r.correlativo_aspirante})
 MERGE (e:Evaluacion {evaluacion_id:r.evaluacion_id})
 SET e.anio_de_ingreso=r.anio_de_ingreso, e.aprobacion=r.aprobacion,
 e.sexo=r.sexo, e.anio_nacimiento=r.anio_nacimiento,
 e.numero_de_fecha_de_evaluacion=r.numero_de_fecha_de_evaluacion,
 e.fecha_asignacion=date(r.fecha_asignacion),e.edad_aproximada=r.edad_aproximada,
 e.edad_valida_analisis=r.edad_valida_analisis
 MERGE (m:Materia {nombre:r.materia})
 MERGE (c:Carrera {nombre:r.carrera_objetivo})
 MERGE (t:TipoInstitucion {nombre:r.tipo_institucion_educativa})
 MERGE (u:Municipio {clave:r.municipio_clave}) SET u.nombre=r.municipio_institucion_educativa
 MERGE (d:Departamento {nombre:r.departamento_institucion_educativa})
 MERGE (a)-[:REALIZO]->(e)
 MERGE (e)-[:EVALUA]->(m)
 MERGE (e)-[:ASPIRA_A]->(c)
 MERGE (e)-[:PROVIENE_DE_TIPO]->(t)
 MERGE (e)-[:INSTITUCION_EN]->(u)
 MERGE (u)-[:PERTENECE_A]->(d)
 """;
 public long pendientes(){return mongo.count(Query.query(Criteria.where("sincronizacion_neo4j").ne("SINCRONIZADO")),"evaluaciones");}
 public Map<String,Object> sincronizar(){long count=0;
  while(true){var docs=mongo.find(Query.query(Criteria.where("sincronizacion_neo4j").ne("SINCRONIZADO")).limit(200),Document.class,"evaluaciones");
   if(docs.isEmpty())return Map.of("estado","COMPLETADA","sincronizados",count,"pendientes",0);
   var ids=docs.stream().map(d->d.getString("evaluacion_id")).toList();List<Map<String,Object>> rows=new ArrayList<>();
   for(Document d:docs){Map<String,Object> r=new HashMap<>();for(String f:CsvDatos.CAMPOS)r.put(f,d.get(f));
    r.put("fecha_asignacion",d.getDate("fecha_asignacion").toInstant().atZone(ZoneOffset.UTC).toLocalDate().toString());r.put("evaluacion_id",d.getString("evaluacion_id"));
    r.put("municipio_clave",CsvDatos.json(List.of(d.getString(CsvDatos.CAMPOS.get(8)),d.getString(CsvDatos.CAMPOS.get(9)))));
    r.put("edad_aproximada",d.get("edad_aproximada"));r.put("edad_valida_analisis",d.get("edad_valida_analisis"));rows.add(r);}
   try(var session=driver.session(SessionConfig.forDatabase("neo4j"))){session.executeWrite(tx->{tx.run(CYPHER,Map.of("filas",rows)).consume();return null;},TransactionConfig.builder().withTimeout(Duration.ofSeconds(30)).build());}
   catch(Exception e){mongo.updateMulti(Query.query(Criteria.where("evaluacion_id").in(ids)),new Update().set("sincronizacion_neo4j","ERROR"),"evaluaciones");return Map.of("estado","PENDIENTE","sincronizados",count,"pendientes",pendientes(),"mensaje","Los datos estan en MongoDB. Recupere Neo4j y reintente.");}
   // Confirmar solo despues del commit de Neo4j. MERGE permite repetir el lote.
   mongo.updateMulti(Query.query(Criteria.where("evaluacion_id").in(ids)),new Update().set("sincronizacion_neo4j","SINCRONIZADO"),"evaluaciones");count+=docs.size();
  }
 }
}
