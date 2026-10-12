package gt.usac.bd2.neo4j;
import org.springframework.web.bind.annotation.*;
import org.bson.Document;
import java.util.*;
@RestController
@RequestMapping("/neo4j")
public class ExploradorControlador {
    private final ExploradorServicio s;
    public ExploradorControlador(ExploradorServicio s){this.s=s;}
    @GetMapping("/consultas")public List<Document> catalogo(){return s.catalogo();}
    @GetMapping("/opciones")public Document opciones(){return s.opciones();}
    @GetMapping("/resumen")public Map<String,Object> resumen(){return s.resumen();}
    @GetMapping("/consultas/{id}")public Document consultar(@PathVariable int id,@RequestParam Map<String,String> params){
        var f=new HashMap<>(params);int page=numero(f.remove("pagina"),0),size=numero(f.remove("tamano"),25);return s.consultar(id,f,page,size);
    }
    @GetMapping("/grafo")public Document grafo(@RequestParam Map<String,String> params){
        var f=new HashMap<>(params);int limit=numero(f.remove("limite"),10);return s.explorar(f,limit);
    }
    private int numero(String text,int defaultValue){if(text==null)return defaultValue;try{return Integer.parseInt(text);}catch(NumberFormatException e){throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST,"Parametro numerico invalido.");}}
}
