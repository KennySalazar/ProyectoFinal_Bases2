package gt.usac.bd2.cargas;
import org.junit.jupiter.api.Test;
import org.bson.Document;
import org.neo4j.driver.Driver;
import org.neo4j.driver.Session;
import org.neo4j.driver.SessionConfig;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.assertj.core.api.Assertions.*;
class GrafoServicioTest {
 Document fila(){Document d=new Document("evaluacion_id","id");for(String f:CsvDatos.CAMPOS)d.put(f,"X");d.put("fecha_asignacion",new Date());d.put("anio_de_ingreso",2015);return d;}
 @Test void caidaDeNeo4jDejaPendientes(){
  MongoTemplate m=mock(MongoTemplate.class);Driver driver=mock(Driver.class);
  when(m.find(any(Query.class),eq(Document.class),eq("evaluaciones"))).thenReturn(List.of(fila()));
  when(driver.session(any(SessionConfig.class))).thenThrow(new RuntimeException("Caida"));
  when(m.count(any(Query.class),eq("evaluaciones"))).thenReturn(1L);
  var result=new GrafoServicio(m,driver).sincronizar();
  assertThat(result.get("estado")).isEqualTo("PENDIENTE");assertThat(result.get("sincronizados")).isEqualTo(0L);
  var captor=org.mockito.ArgumentCaptor.forClass(Update.class);verify(m).updateMulti(any(Query.class),captor.capture(),eq("evaluaciones"));
  assertThat(captor.getValue().getUpdateObject().get("$set",Document.class).getString("sincronizacion_neo4j")).isEqualTo("ERROR");
 }
 @Test void confirmaMongoDespuesDeNeo4j(){
  MongoTemplate m=mock(MongoTemplate.class);Driver driver=mock(Driver.class);Session session=mock(Session.class);
  when(m.find(any(Query.class),eq(Document.class),eq("evaluaciones"))).thenReturn(List.of(fila()),List.of());when(driver.session(any(SessionConfig.class))).thenReturn(session);
  var result=new GrafoServicio(m,driver).sincronizar();assertThat(result.get("sincronizados")).isEqualTo(1L);
  var order=inOrder(session,m);order.verify(session).executeWrite(any(),any());order.verify(m).updateMulti(any(Query.class),any(Update.class),eq("evaluaciones"));
 }
}
