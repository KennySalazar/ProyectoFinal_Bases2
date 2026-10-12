package gt.usac.bd2.busqueda;
import org.bson.Document;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
@RestController
@RequestMapping("/busqueda")
public class BusquedaControlador {
    private final BusquedaServicio s;
    public BusquedaControlador(BusquedaServicio s){this.s=s;}
    @GetMapping public Document buscar(@RequestParam Map<String,String> params){var f=new HashMap<>(params);int page=numero(f.remove("pagina"),0),size=numero(f.remove("tamano"),25);return s.buscar(f,page,size);}
    @GetMapping("/opciones")public Document opciones(){return s.opciones();}
    @GetMapping("/evaluaciones/{id}")public Document detalle(@PathVariable String id){return s.detalle(id);}
    private int numero(String text,int defaultValue){if(text==null)return defaultValue;try{return Integer.parseInt(text);}catch(NumberFormatException e){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Parametro numerico invalido.");}}
}
