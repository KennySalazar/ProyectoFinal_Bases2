package gt.usac.bd2.neo4j;
import org.junit.jupiter.api.*;
import org.neo4j.harness.Neo4j;
import org.neo4j.harness.Neo4jBuilders;
import org.neo4j.driver.*;
import org.bson.Document;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class Neo4jRealTest {
    Neo4j neo;Driver driver;ExploradorServicio service;
    @BeforeAll void preparar()throws Exception{
        neo=Neo4jBuilders.newInProcessBuilder().withDisabledServer().build();
        driver=GraphDatabase.driver(neo.boltURI(),AuthTokens.none());service=new ExploradorServicio(driver);
        List<Map<String,Object>> rows=new ArrayList<>();
        rows.add(row("a",2015,"CIVIL","PUBLICO","MATEMATICA",1,"NO APROBADO"));
        rows.add(row("a",2015,"CIVIL","PUBLICO","MATEMATICA",2,"APROBADO"));
        rows.add(row("a",2015,"CIVIL","PUBLICO","COMPUTACION",1,"APROBADO"));
        rows.add(row("a",2016,"CIVIL","PRIVADO","MATEMATICA",1,"APROBADO"));
        rows.add(row("b",2015,"ELECTRICA","PUBLICO","MATEMATICA",1,"NO APROBADO"));
        rows.add(row("b",2015,"ELECTRICA","PUBLICO","MATEMATICA",1,"NO APROBADO"));
        rows.add(row("c",2015,"ELECTRICA","PRIVADO","COMPUTACION",1,"APROBADO"));
        rows.add(row("d",2016,"NINGUNO","PUBLICO","MATEMATICA",3,"NO APROBADO"));
        for(int i=0;i<rows.size();i++)rows.get(i).put("id","e"+i);
        try(var s=driver.session()){s.executeWrite(tx->{tx.run("""
            UNWIND $rows AS r
            MERGE (a:Aspirante {correlativo_aspirante:r.a})
            CREATE (e:Evaluacion {evaluacion_id:r.id,anio_de_ingreso:r.year,
                numero_de_fecha_de_evaluacion:r.op,aprobacion:r.resultado,
                fecha_asignacion:date('2014-08-23')})
            MERGE (m:Materia {nombre:r.materia}) MERGE (c:Carrera {nombre:r.carrera})
            MERGE (t:TipoInstitucion {nombre:r.tipo})
            MERGE (u:Municipio {clave:'GUATEMALA-MIXCO',nombre:'MIXCO'})
            MERGE (d:Departamento {nombre:'GUATEMALA'})
            MERGE (a)-[:REALIZO]->(e) MERGE (e)-[:EVALUA]->(m)
            MERGE (e)-[:ASPIRA_A]->(c) MERGE (e)-[:PROVIENE_DE_TIPO]->(t)
            MERGE (e)-[:INSTITUCION_EN]->(u) MERGE (u)-[:PERTENECE_A]->(d)
            """,Map.of("rows",rows)).consume();return null;});}
    }
    Map<String,Object> row(String a,int y,String c,String t,String m,int op,String result){return new HashMap<>(Map.of("a",a,"year",y,"carrera",c,"tipo",t,"materia",m,"op",op,"resultado",result));}
    List<Document> rows(int id,Map<String,String> filters){return service.consultar(id,filters,0,100).getList("filas",Document.class);}
    @Test void cincoConsultasCorrenEnNeo4jReal(){
        assertThat(rows(1,Map.of("aspirante","a"))).hasSize(4);
        var q2=rows(2,Map.of());assertThat(q2).hasSize(5);
        var civil=q2.stream().filter(r->r.getString("materia").equals("MATEMATICA")&&r.getString("carrera").equals("CIVIL")).findFirst().orElseThrow();
        assertThat(((Number)civil.get("evaluaciones")).longValue()).isEqualTo(3);assertThat(((Number)civil.get("aspirantes")).longValue()).isEqualTo(1);
        assertThat(rows(3,Map.of())).hasSize(3);
        var pairs=rows(4,Map.of());assertThat(pairs).hasSize(1);assertThat(((Number)pairs.get(0).get("aspirantes")).longValue()).isEqualTo(1);
        var recovered=rows(5,Map.of());assertThat(recovered).hasSize(1);assertThat(((Number)recovered.get(0).get("aspirantes_recuperados")).longValue()).isEqualTo(1);
    }
    @Test void grafoRespetaFiltrosLimiteYReferencias(){
        Document graph=service.explorar(Map.of("aspirante","a","anio","2015","aprobacion","APROBADO"),1);
        assertThat(graph.getInteger("evaluaciones_mostradas")).isEqualTo(1);assertThat(graph.getBoolean("hay_mas")).isTrue();
        var nodes=graph.getList("nodos",Document.class);var edges=graph.getList("relaciones",Document.class);
        assertThat(nodes).hasSize(7);assertThat(edges).hasSize(6);var ids=nodes.stream().map(n->n.getString("id")).toList();
        for(var e:edges){assertThat(ids).contains(e.getString("origen"),e.getString("destino"));}
        assertThat(nodes.stream().filter(n->n.getString("tipo").equals("Evaluacion")).findFirst().orElseThrow().get("propiedades",Document.class).getString("aprobacion")).isEqualTo("APROBADO");
    }
    @Test void resultadoVacioNoFalla(){assertThat(service.explorar(Map.of("anio","2099"),10).getList("nodos",Document.class)).isEmpty();assertThat(rows(2,Map.of("anio","2099"))).isEmpty();}
    @Test void paginacionConsistente(){var r=service.consultar(1,Map.of("aspirante","a"),1,2);assertThat(((Number)r.get("total")).longValue()).isEqualTo(4);assertThat(r.getList("filas",Document.class)).hasSize(2);}
    @Test void resumenYIdsEstables(){assertThat(service.resumen().get("evaluaciones")).isEqualTo(8L);var a=service.explorar(Map.of("aspirante","a"),10);var b=service.explorar(Map.of("aspirante","a"),10);assertThat(a.get("nodos")).isEqualTo(b.get("nodos"));}
    @AfterAll void cerrar(){if(driver!=null)driver.close();if(neo!=null)neo.close();}
}
