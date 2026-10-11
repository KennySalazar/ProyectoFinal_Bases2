package gt.usac.bd2.estado;
import java.time.Instant;
import java.time.Duration;
import org.bson.Document;
import org.neo4j.driver.Driver;
import org.neo4j.driver.SessionConfig;
import org.neo4j.driver.TransactionConfig;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
@Service
public class EstadoServicio {
    private static final Logger log = LoggerFactory.getLogger(EstadoServicio.class);
    private final MongoTemplate mongo;
    private final Driver neo4j;
    public EstadoServicio(MongoTemplate mongo, Driver neo4j) {
        this.mongo = mongo; this.neo4j = neo4j;
    }
    public EstadoRespuesta comprobar() {
        boolean mongoOk = false;
        boolean neoOk = false;
        try {
            Document resultado = mongo.executeCommand(new Document("ping", 1));
            mongoOk = ((Number) resultado.get("ok")).doubleValue() == 1;
        } catch (Exception ex) {
            log.warn("MongoDB no disponible: {}", ex.getClass().getSimpleName());
        }
        try (var session = neo4j.session(SessionConfig.forDatabase("neo4j"))) {
            var config = TransactionConfig.builder().withTimeout(Duration.ofSeconds(3)).build();
            neoOk = session.executeRead(tx -> tx.run("RETURN 1 AS conexion")
                .single().get("conexion").asInt() == 1, config);
        } catch (Exception ex) {
            log.warn("Neo4j no disponible: {}", ex.getClass().getSimpleName());
        }
        return new EstadoRespuesta(mongoOk && neoOk ? "DISPONIBLE" : "DEGRADADO",
            mongoOk ? "DISPONIBLE" : "NO_DISPONIBLE",
            neoOk ? "DISPONIBLE" : "NO_DISPONIBLE", Instant.now());
    }
}
