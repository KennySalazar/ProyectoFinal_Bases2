package gt.usac.bd2.cargas;
import org.bson.Document;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.data.mongodb.core.*;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.data.mongodb.core.query.*;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import com.mongodb.client.model.*;
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;
import java.io.*;
@Service
public class CargasServicio{
 private final MongoTemplate mongo;private final GrafoServicio grafo;private final AtomicBoolean ocupado=new AtomicBoolean();
 public CargasServicio(MongoTemplate mongo,GrafoServicio grafo){this.mongo=mongo;this.grafo=grafo;}
 private void entrar(){if(!ocupado.compareAndSet(false,true))throw new ResponseStatusException(HttpStatus.CONFLICT,"Ya hay una carga o sincronizacion en curso.");}
 public Document cargar(MultipartFile archivo)throws IOException{
  if(archivo.isEmpty()||archivo.getOriginalFilename()==null||!archivo.getOriginalFilename().toLowerCase(Locale.ROOT).endsWith(".csv"))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Seleccione un CSV no vacio.");
  entrar();try{
   mongo.indexOps("evaluaciones").ensureIndex(new Index("evaluacion_id",Sort.Direction.ASC).unique().named("uq_evaluacion_id"));
   mongo.updateMulti(Query.query(Criteria.where("estado").is("EN_PROCESO")),new Update().set("estado","INTERRUMPIDA").set("mensaje","Proceso anterior interrumpido. Recargue el archivo."),"cargas");
   String id=UUID.randomUUID().toString(),nombre=archivo.getOriginalFilename().replace('\\','/');nombre=nombre.substring(nombre.lastIndexOf('/')+1);long inicio=System.nanoTime();
   Document load=new Document("carga_id",id).append("archivo",nombre).append("sha256_archivo",CsvDatos.sha(archivo.getBytes())).append("fecha_inicio",new Date()).append("estado","EN_PROCESO").append("contadores_confirmados",true).append("leidos",0L).append("insertados",0L).append("duplicados",0L).append("rechazados",0L).append("con_advertencias",0L);
   mongo.insert(load,"cargas");List<Document> batch=new ArrayList<>();
   try(var parser=CsvDatos.abrir(archivo.getInputStream())){
    var headers=CsvDatos.encabezados(parser.getHeaderNames());
    for(var row:parser){
     try{Document d=CsvDatos.convertir(row,headers,id);batch.add(d);}
     catch(IllegalArgumentException e){mongo.insert(new Document("carga_id",id).append("numero_fila",row.getRecordNumber()+1).append("motivo",e.getMessage()).append("valores",row.toList()),"errores_carga");sum(load,"rechazados",1);}
     if(batch.size()>=200)flush(batch,load);if(row.getRecordNumber()%200==0)save(load);
    }
    flush(batch,load);load.put("estado","COMPLETADA");
   }catch(Exception e){
    // El archivo puede fallar tras un prefijo valido. No revertir filas confirmadas.
    if(!batch.isEmpty()){try{flush(batch,load);}catch(Exception ignored){batch.clear();}}
    load.put("estado","FALLIDA");load.put("mensaje",e instanceof IllegalArgumentException?e.getMessage():"Lectura o persistencia interrumpida. Revise el CSV y recargue; se conservan las filas confirmadas.");
   }
   load.put("fecha_fin",new Date());load.put("duracion_etl_ms",(System.nanoTime()-inicio)/1_000_000);save(load);
   if(load.getString("estado").equals("COMPLETADA")){try{load.put("resultado_sincronizacion",grafo.sincronizar());}catch(Exception e){load.put("resultado_sincronizacion",Map.of("estado","PENDIENTE","mensaje","Reintente al recuperar las bases."));}}
   load.put("duracion_total_ms",(System.nanoTime()-inicio)/1_000_000);save(load);return clean(load);
  }finally{ocupado.set(false);}
 }
 private void flush(List<Document> batch,Document load){if(batch.isEmpty())return;List<WriteModel<Document>> writes=new ArrayList<>();
  for(Document d:batch)writes.add(new UpdateOneModel<>(new Document("evaluacion_id",d.getString("evaluacion_id")),new Document("$setOnInsert",d),new UpdateOptions().upsert(true)));
  com.mongodb.bulk.BulkWriteResult result;
  try{result=mongo.getCollection("evaluaciones").bulkWrite(writes,new BulkWriteOptions().ordered(true));}
  catch(com.mongodb.MongoBulkWriteException e){
   var partial=e.getWriteResult();int processed=partial.getMatchedCount()+partial.getUpserts().size();
   sum(load,"insertados",partial.getUpserts().size());sum(load,"duplicados",partial.getMatchedCount());
   sum(load,"con_advertencias",batch.subList(0,Math.min(processed,batch.size())).stream().filter(d->!d.getList("advertencias",String.class).isEmpty()).count());
   load.put("contadores_confirmados",e.getWriteConcernError()==null);batch.clear();throw e;
  }catch(Exception e){load.put("contadores_confirmados",false);batch.clear();throw e;}sum(load,"insertados",result.getUpserts().size());sum(load,"duplicados",batch.size()-result.getUpserts().size());sum(load,"con_advertencias",batch.stream().filter(d->!d.getList("advertencias",String.class).isEmpty()).count());batch.clear();save(load);
 }
 private void sum(Document d,String k,long n){d.put(k,((Number)d.get(k)).longValue()+n);}
 private void save(Document d){d.put("leidos",((Number)d.get("insertados")).longValue()+((Number)d.get("duplicados")).longValue()+((Number)d.get("rechazados")).longValue());mongo.save(d,"cargas");}
 public Map<String,Object> sincronizar(){entrar();try{return grafo.sincronizar();}finally{ocupado.set(false);}}
 public List<Document> listar(){return mongo.find(new Query().with(Sort.by(Sort.Direction.DESC,"fecha_inicio")).limit(50),Document.class,"cargas").stream().map(this::clean).toList();}
 public Document obtener(String id){Document d=mongo.findOne(Query.query(Criteria.where("carga_id").is(id)),Document.class,"cargas");if(d==null)throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Carga no encontrada.");return clean(d);}
 public List<Document> errores(String id,int page){obtener(id);if(page<0)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Pagina invalida.");return mongo.find(Query.query(Criteria.where("carga_id").is(id)).with(Sort.by("numero_fila")).skip((long)page*100).limit(100),Document.class,"errores_carga").stream().map(this::clean).toList();}
 private Document clean(Document d){Document c=new Document(d);c.remove("_id");return c;}
 public Map<String,Object> resumen(){return Map.of("evaluaciones",mongo.count(new Query(),"evaluaciones"),"pendientes_neo4j",grafo.pendientes(),"cargas",mongo.count(new Query(),"cargas"),"ocupado",ocupado.get());}
}
