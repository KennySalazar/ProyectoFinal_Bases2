package gt.usac.bd2.analitica;
import org.springframework.web.bind.annotation.*;
import org.bson.Document;
import java.util.*;
@RestController
@RequestMapping("/consultas")
public class ConsultasControlador{
 private final ConsultasServicio s;public ConsultasControlador(ConsultasServicio s){this.s=s;}
 @GetMapping public List<Document> catalogo(){return s.catalogo();}
 @GetMapping("/opciones")public Document opciones(){return s.opciones();}
 @PostMapping("/resumen-carrera")public Document generar(){return s.generar();}
 @GetMapping("/{id}")public Document consultar(@PathVariable int id,@RequestParam Map<String,String> params){
  Map<String,String> f=new HashMap<>(params);int pagina=numero(f.remove("pagina"),0),tamano=numero(f.remove("tamano"),25);return s.consultar(id,f,pagina,tamano);
 }
 private int numero(String s,int defecto){if(s==null)return defecto;try{return Integer.parseInt(s);}catch(NumberFormatException e){throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST,"Parametro numerico invalido.");}}
}
