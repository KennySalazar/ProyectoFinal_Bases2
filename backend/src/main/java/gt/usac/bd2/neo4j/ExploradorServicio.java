package gt.usac.bd2.neo4j;

import gt.usac.bd2.cargas.CsvDatos;
import org.bson.Document;
import org.neo4j.driver.Driver;
import org.neo4j.driver.SessionConfig;
import org.neo4j.driver.TransactionConfig;
import org.neo4j.driver.types.Node;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
import java.time.Duration;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

@Service
public class ExploradorServicio {
    private final Driver driver;
    private final List<Document> catalogo;
    private final String grafo;
    public ExploradorServicio(Driver driver) throws IOException {
        this.driver=driver;
        try(var in=new ClassPathResource("consultas/neo4j.json").getInputStream()){
            var config=Document.parse(new String(in.readAllBytes(),StandardCharsets.UTF_8));
            catalogo=config.getList("consultas",Document.class);grafo=config.getString("grafo");
        }
    }
    public List<Document> catalogo(){return catalogo.stream().map(d->new Document("id",d.getInteger("id"))
        .append("titulo",d.getString("titulo")).append("descripcion",d.getString("descripcion"))
        .append("cypher",d.getString("cypher"))).toList();}
    public Map<String,Object> parametros(Map<String,String> filtros,boolean paraGrafo){
        Map<String,Object> params=new HashMap<>();params.put("anio",null);
        for(String key:List.of("carrera","materia","tipo","departamento","aspirante","aprobacion"))params.put(key,"");
        for(var e:filtros.entrySet()){
            String key=e.getKey(),value=e.getValue()==null?"":e.getValue().trim();
            if(!params.containsKey(key)||(!paraGrafo&&key.equals("aprobacion")))throw bad("Filtro desconocido: "+key);
            if(value.length()>250)throw bad("Filtro demasiado largo.");
            if(key.equals("anio")){
                if(value.isEmpty())continue;
                try{int year=Integer.parseInt(value);if(year<1900||year>2100)throw new NumberFormatException();params.put(key,year);}
                catch(NumberFormatException ex){throw bad("Anio invalido.");}
            }else params.put(key,value);
        }
        if(!Set.of("","APROBADO","NO APROBADO").contains((String)params.get("aprobacion")))throw bad("Aprobacion invalida.");
        return params;
    }
    public Document consultar(int id,Map<String,String> filtros,int pagina,int tamano){
        Document q=definicion(id);Map<String,Object> params=parametros(filtros,false);
        if(id==1&&params.get("aspirante").equals(""))throw bad("Ingrese el correlativo exacto del aspirante.");
        if(id==4&&!params.get("materia").equals(""))throw bad("La consulta de pares no admite filtro de materia.");
        if(pagina<0||pagina>100000||tamano<1||tamano>100)throw bad("Pagina o tamano fuera de rango.");
        params.put("salto",(long)pagina*tamano);params.put("tamano",tamano);
        try(var session=driver.session(SessionConfig.forDatabase("neo4j"))){
            return session.executeRead(tx->{
                long total=tx.run("CALL {\n"+q.getString("cypher")+"\n} RETURN count(*) AS total",params).single().get("total").asLong();
                var rows=tx.run(q.getString("cypher")+"\nSKIP $salto LIMIT $tamano",params).list(r->new Document(r.asMap()));
                return new Document("consulta",id).append("titulo",q.getString("titulo")).append("descripcion",q.getString("descripcion"))
                    .append("filtros",filtros).append("pagina",pagina).append("tamano",tamano).append("total",total).append("filas",rows);
            },TransactionConfig.builder().withTimeout(Duration.ofSeconds(60)).build());
        }
    }
    public Document explorar(Map<String,String> filtros,int limite){
        if(limite<1||limite>30)throw bad("El limite debe estar entre 1 y 30 evaluaciones.");
        Map<String,Object> params=parametros(filtros,true);params.put("limite",limite+1);
        try(var session=driver.session(SessionConfig.forDatabase("neo4j"))){
            return session.executeRead(tx->{
                var rows=tx.run(grafo,params).list(r->{Map<String,Node> m=new HashMap<>();for(String k:List.of("a","e","m","c","t","u","d"))m.put(k,r.get(k).asNode());return m;});
                Map<String,Map<String,Object>> nodes=new LinkedHashMap<>(),edges=new LinkedHashMap<>();
                int shown=Math.min(limite,rows.size());
                for(var row:rows.subList(0,shown)){
                    Map<String,String> ids=new HashMap<>();
                    for(var v:row.entrySet()){
                        Node n=v.getValue();String type=n.labels().iterator().next();Map<String,Object> properties=n.asMap();
                        String key=String.valueOf(properties.get(type.equals("Aspirante")?"correlativo_aspirante":type.equals("Evaluacion")?"evaluacion_id":type.equals("Municipio")?"clave":"nombre"));
                        String nid=CsvDatos.sha(CsvDatos.json(List.of(type,key)).getBytes(StandardCharsets.UTF_8));ids.put(v.getKey(),nid);
                        String text=type.equals("Aspirante")?"Aspirante "+key.substring(0,Math.min(8,key.length())):
                            type.equals("Evaluacion")?properties.get("aprobacion")+" / "+properties.get("anio_de_ingreso"):String.valueOf(properties.get("nombre"));
                        nodes.putIfAbsent(nid,new Document(Map.of("id",nid,"tipo",type,"nombre",text,"propiedades",new Document(properties))));
                    }
                    edge(edges,ids,"a","e","REALIZO");edge(edges,ids,"e","m","EVALUA");edge(edges,ids,"e","c","ASPIRA_A");
                    edge(edges,ids,"e","t","PROVIENE_DE_TIPO");edge(edges,ids,"e","u","INSTITUCION_EN");edge(edges,ids,"u","d","PERTENECE_A");
                }
                return new Document("nodos",new ArrayList<>(nodes.values())).append("relaciones",new ArrayList<>(edges.values()))
                    .append("evaluaciones_mostradas",shown).append("limite",limite).append("hay_mas",rows.size()>limite).append("filtros",filtros);
            },TransactionConfig.builder().withTimeout(Duration.ofSeconds(30)).build());
        }
    }
    private void edge(Map<String,Map<String,Object>> edges,Map<String,String> ids,String from,String to,String type){
        String source=ids.get(from),target=ids.get(to);String id=CsvDatos.sha(CsvDatos.json(List.of(source,type,target)).getBytes(StandardCharsets.UTF_8));
        edges.putIfAbsent(id,new Document(Map.of("id",id,"origen",source,"destino",target,"tipo",type)));
    }
    public Document opciones(){
        try(var session=driver.session(SessionConfig.forDatabase("neo4j"))){return session.executeRead(tx->{
            Document out=new Document();
            out.put("anios",tx.run("MATCH (e:Evaluacion) RETURN DISTINCT e.anio_de_ingreso AS valor ORDER BY valor").list(r->r.get("valor").asObject()));
            Map<String,String> labels=Map.of("carreras","Carrera","materias","Materia","tipos","TipoInstitucion","departamentos","Departamento");
            for(var entry:labels.entrySet())out.put(entry.getKey(),tx.run("MATCH (n:"+entry.getValue()+") RETURN n.nombre AS valor ORDER BY valor").list(r->r.get("valor").asString()));
            return out;
        },TransactionConfig.builder().withTimeout(Duration.ofSeconds(30)).build());}
    }
    public Map<String,Object> resumen(){
        try(var session=driver.session(SessionConfig.forDatabase("neo4j"))){return session.executeRead(tx->{
            long evaluations=tx.run("MATCH (e:Evaluacion) RETURN count(e) AS total").single().get("total").asLong();
            long applicants=tx.run("MATCH (a:Aspirante) RETURN count(a) AS total").single().get("total").asLong();
            long edges=tx.run("MATCH ()-[r]->() RETURN count(r) AS total").single().get("total").asLong();
            return Map.<String,Object>of("evaluaciones",evaluations,"aspirantes",applicants,"relaciones",edges);
        },TransactionConfig.builder().withTimeout(Duration.ofSeconds(30)).build());}
    }
    private Document definicion(int id){return catalogo.stream().filter(d->d.getInteger("id")==id).findFirst().orElseThrow(()->bad("Consulta Neo4j debe estar entre 1 y 5."));}
    private ResponseStatusException bad(String message){return new ResponseStatusException(HttpStatus.BAD_REQUEST,message);}
}
