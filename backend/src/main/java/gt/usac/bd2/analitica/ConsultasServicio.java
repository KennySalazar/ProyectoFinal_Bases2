package gt.usac.bd2.analitica;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.bson.Document;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import gt.usac.bd2.cargas.CargasServicio;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.io.IOException;
@Service
public class ConsultasServicio{
 private final MongoTemplate mongo;private final CargasServicio cargas;private final List<Document> catalogo;private final List<Document> resumen;
 public ConsultasServicio(MongoTemplate mongo,CargasServicio cargas)throws IOException{
  this.mongo=mongo;this.cargas=cargas;
  try(var in=new ClassPathResource("consultas/mongodb.json").getInputStream()){
   Document root=Document.parse(new String(in.readAllBytes(),java.nio.charset.StandardCharsets.UTF_8));
   catalogo=root.getList("consultas",Document.class);resumen=root.getList("resumen_pipeline",Document.class);
  }
 }
 public List<Document> catalogo(){return catalogo.stream().map(d->new Document("id",d.getInteger("id")).append("titulo",d.getString("titulo")).append("descripcion",d.getString("descripcion"))).toList();}
 public List<Document> pipeline(int id,Map<String,String> filtros){
  Document q=definicion(id);Document filter=new Document();
  for(var e:filtros.entrySet()){
   String key=e.getKey(),value=e.getValue();if(value==null||value.isBlank())continue;
   switch(key){case "anio":try{int year=Integer.parseInt(value);if(year<1900||year>2100)throw new NumberFormatException();filter.put("anio_de_ingreso",year);}catch(NumberFormatException ex){throw bad("Anio invalido.");}break;
    case "carrera":filter.put("carrera_objetivo",value);break;
    case "materia":filter.put("materia",value);break;
    case "tipo":filter.put("tipo_institucion_educativa",value);break;
    case "departamento":filter.put("departamento_institucion_educativa",value);break;
    case "aspirante":filter.put("correlativo_aspirante",value);break;
    default:throw bad("Filtro desconocido: "+key);
   }
  }
  if((id==11||id==15)&&!filter.containsKey("correlativo_aspirante"))throw bad("Ingrese el correlativo del aspirante para consultar su historial.");
  if(id==6&&filter.keySet().stream().anyMatch(k->!k.equals("carrera_objetivo")))throw bad("El resumen es global; solo admite filtro de carrera.");
  List<Document> stages=new ArrayList<>();if(!filter.isEmpty())stages.add(new Document("$match",filter));
  stages.addAll(q.getList("pipeline",Document.class));return stages;
 }
 public Document consultar(int id,Map<String,String> filtros,int pagina,int tamano){
  if(pagina<0||pagina>100000||tamano<1||tamano>100)throw bad("Pagina o tamano fuera de rango.");
  Document q=definicion(id);List<Document> stages=pipeline(id,filtros);
  stages.add(new Document("$facet",new Document("filas",List.of(new Document("$skip",(long)pagina*tamano),new Document("$limit",tamano))).append("conteo",List.of(new Document("$count","total")))));
  Document out=aggregate(q.getString("coleccion"),stages).first();
  List<Document> rows=out==null?List.of():out.getList("filas",Document.class);List<Document> counts=out==null?List.of():out.getList("conteo",Document.class);
  long total=counts.isEmpty()?0:((Number)counts.get(0).get("total")).longValue();
  return new Document("consulta",id).append("titulo",q.getString("titulo")).append("descripcion",q.getString("descripcion")).append("filtros",filtros).append("pagina",pagina).append("tamano",tamano).append("total",total).append("filas",rows);
 }
 private com.mongodb.client.AggregateIterable<Document> aggregate(String collection,List<Document> stages){return mongo.getCollection(collection).aggregate(stages).allowDiskUse(true).maxTime(60,TimeUnit.SECONDS);}
 public Document generar(){return cargas.exclusivo(()->{aggregate("evaluaciones",resumen).toCollection();return new Document("estado","COMPLETADA").append("carreras",mongo.getCollection("resumen_carrera").countDocuments()).append("mensaje","Resumen global actualizado. Vuelva a generarlo despues de nuevas cargas.");});}
 public Document opciones(){Document d=new Document();Map<String,String> fields=Map.of("anios","anio_de_ingreso","carreras","carrera_objetivo","materias","materia","tipos","tipo_institucion_educativa","departamentos","departamento_institucion_educativa");
  for(var e:fields.entrySet()){List<Document> values=aggregate("evaluaciones",List.of(new Document("$group",new Document("_id","$"+e.getValue())),new Document("$sort",new Document("_id",1)))).into(new ArrayList<>());d.put(e.getKey(),values.stream().map(v->v.get("_id")).filter(Objects::nonNull).toList());}return d;
 }
 private Document definicion(int id){return catalogo.stream().filter(d->d.getInteger("id")==id).findFirst().orElseThrow(()->bad("Consulta debe estar entre 1 y 20."));}
 private ResponseStatusException bad(String s){return new ResponseStatusException(HttpStatus.BAD_REQUEST,s);}
}
