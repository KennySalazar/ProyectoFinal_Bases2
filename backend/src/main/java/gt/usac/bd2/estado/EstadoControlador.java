package gt.usac.bd2.estado;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
@RestController
public class EstadoControlador {
    private final EstadoServicio servicio;
    public EstadoControlador(EstadoServicio servicio) { this.servicio = servicio; }
    @GetMapping("/estado")
    public ResponseEntity<EstadoRespuesta> estado() {
        var respuesta = servicio.comprobar();
        return ResponseEntity.status("DISPONIBLE".equals(respuesta.estado()) ? 200 : 503)
            .body(respuesta);
    }
}
