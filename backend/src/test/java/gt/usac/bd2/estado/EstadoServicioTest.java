package gt.usac.bd2.estado;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;
import org.bson.Document;
import org.junit.jupiter.api.Test;
import org.neo4j.driver.*;
import org.springframework.data.mongodb.core.MongoTemplate;
class EstadoServicioTest {
    @Test void reportaAmbasBasesDisponibles() {
        var mongo = mock(MongoTemplate.class);
        var driver = mock(Driver.class);
        var session = mock(Session.class);
        when(mongo.executeCommand(any(Document.class))).thenReturn(new Document("ok", 1.0));
        when(driver.session(any(SessionConfig.class))).thenReturn(session);
        doReturn(true).when(session).executeRead(any(), any(TransactionConfig.class));
        var estado = new EstadoServicio(mongo, driver).comprobar();
        assertThat(estado.estado()).isEqualTo("DISPONIBLE");
        verify(session).close();
    }
    @Test void unaFallaMongoNoImpideComprobarNeo4j() {
        var mongo = mock(MongoTemplate.class);
        var driver = mock(Driver.class);
        var session = mock(Session.class);
        when(mongo.executeCommand(any(Document.class))).thenThrow(new RuntimeException());
        when(driver.session(any(SessionConfig.class))).thenReturn(session);
        doReturn(true).when(session).executeRead(any(), any(TransactionConfig.class));
        var estado = new EstadoServicio(mongo, driver).comprobar();
        assertThat(estado.estado()).isEqualTo("DEGRADADO");
        assertThat(estado.neo4j()).isEqualTo("DISPONIBLE");
    }
    @Test void reportaFallaNeo4jSinLanzarErrorAlCliente() {
        var mongo = mock(MongoTemplate.class);
        var driver = mock(Driver.class);
        when(mongo.executeCommand(any(Document.class))).thenReturn(new Document("ok", 1));
        when(driver.session(any(SessionConfig.class))).thenThrow(new RuntimeException());
        var estado = new EstadoServicio(mongo, driver).comprobar();
        assertThat(estado.mongodb()).isEqualTo("DISPONIBLE");
        assertThat(estado.neo4j()).isEqualTo("NO_DISPONIBLE");
    }
}
