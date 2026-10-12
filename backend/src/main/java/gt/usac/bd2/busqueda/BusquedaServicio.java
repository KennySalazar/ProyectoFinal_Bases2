package gt.usac.bd2.busqueda;
import org.bson.Document;
import org.springframework.stereotype.Service;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
import java.util.regex.Pattern;
import java.util.concurrent.TimeUnit;
@Service
public class BusquedaServicio {
    private final MongoTemplate mongo;
    private static final Map<String,String> CAMPOS=Map.of("carrera","carrera_objetivo","materia","materia","tipo","tipo_institucion_educativa","departamento","departamento_institucion_educativa","municipio","municipio_institucion_educativa","aspirante","correlativo_aspirante","aprobacion","aprobacion");
    public BusquedaServicio(MongoTemplate mongo){this.mongo=mongo;}
    public Document filtro(Map<String,String> filtros){
        Document filter=new Document();
        for(var e:filtros.entrySet()){
            String key=e.getKey(),value=e.getValue()==null?"":e.getValue().trim();
            if(!CAMPOS.containsKey(key)&&!Set.of("anio","texto").contains(key))throw bad("Filtro desconocido: "+key);
            if(value.length()>250)throw bad("Filtro demasiado largo.");if(value.isEmpty())continue;
            if(key.equals("anio")){try{int year=Integer.parseInt(value);if(year<1900||year>2100)throw new NumberFormatException();filter.put("anio_de_ingreso",year);}catch(NumberFormatException ex){throw bad("Anio invalido.");}}
            else if(key.equals("texto")){
                var terms=new ArrayList<Document>();
                for(String field:List.of("correlativo_aspirante","carrera_objetivo","materia","departamento_institucion_educativa","municipio_institucion_educativa","tipo_institucion_educativa"))terms.add(new Document(field,new Document("$regex",Pattern.quote(value)).append("$options","i")));
                filter.put("$or",terms);
            }else{if(key.equals("aprobacion")&&!Set.of("APROBADO","NO APROBADO").contains(value))throw bad("Resultado invalido.");filter.put(CAMPOS.get(key),value);}
        }
        return filter;
    }
    public Document buscar(Map<String,String> filtros,int pagina,int tamano){
        if(pagina<0||pagina>100000||tamano<1||tamano>100)throw bad("Pagina o tamano fuera de rango.");
        Document fields=new Document("_id",0);
        for(String key:List.of("evaluacion_id","correlativo_aspirante","anio_de_ingreso","materia","aprobacion","carrera_objetivo","numero_de_fecha_de_evaluacion","fecha_asignacion","tipo_institucion_educativa","departamento_institucion_educativa","municipio_institucion_educativa"))fields.put(key,1);
        var stages=List.of(new Document("$match",filtro(filtros)),new Document("$sort",new Document("anio_de_ingreso",-1).append("correlativo_aspirante",1).append("fecha_asignacion",1).append("numero_de_fecha_de_evaluacion",1).append("evaluacion_id",1)),new Document("$project",fields),new Document("$facet",new Document("filas",List.of(new Document("$skip",(long)pagina*tamano),new Document("$limit",tamano))).append("conteo",List.of(new Document("$count","total")))));
        Document out=mongo.getCollection("evaluaciones").aggregate(stages).allowDiskUse(true).maxTime(60,TimeUnit.SECONDS).first();
        var count=out==null?List.<Document>of():out.getList("conteo",Document.class);long total=count.isEmpty()?0:((Number)count.get(0).get("total")).longValue();
        return new Document("filas",out==null?List.of():out.getList("filas",Document.class)).append("total",total).append("pagina",pagina).append("tamano",tamano).append("filtros",filtros);
    }
    public Document detalle(String id){
        if(id==null||!id.matches("[a-f0-9]{64}"))throw bad("ID de evaluacion invalido.");
        Document d=mongo.getCollection("evaluaciones").find(new Document("evaluacion_id",id)).maxTime(15,TimeUnit.SECONDS).first();
        if(d==null)throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Evaluacion no encontrada.");d.remove("_id");return d;
    }
    public Document opciones(){
        var values=mongo.getCollection("evaluaciones").distinct("municipio_institucion_educativa",String.class).maxTime(30,TimeUnit.SECONDS).into(new ArrayList<>());
        values.sort(String::compareTo);return new Document("municipios",values);
    }
    private ResponseStatusException bad(String s){return new ResponseStatusException(HttpStatus.BAD_REQUEST,s);}
}
