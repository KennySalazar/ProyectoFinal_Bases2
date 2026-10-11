package gt.usac.bd2.estado;
import java.time.Instant;
public record EstadoRespuesta(String estado, String mongodb, String neo4j, Instant fecha) {}
