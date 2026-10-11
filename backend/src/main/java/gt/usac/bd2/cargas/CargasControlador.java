package gt.usac.bd2.cargas;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.bson.Document;
import java.util.*;
import java.io.IOException;
@RestController
@RequestMapping("/cargas")
public class CargasControlador{
 private final CargasServicio s;public CargasControlador(CargasServicio s){this.s=s;}
 @PostMapping(consumes="multipart/form-data")public Document cargar(@RequestParam("archivo")MultipartFile archivo)throws IOException{return s.cargar(archivo);}
 @GetMapping public List<Document> listar(){return s.listar();}
 @GetMapping("/resumen")public Map<String,Object> resumen(){return s.resumen();}
 @PostMapping("/sincronizar")public Map<String,Object> sincronizar(){return s.sincronizar();}
 @GetMapping("/{id}")public Document obtener(@PathVariable String id){return s.obtener(id);}
 @GetMapping("/{id}/errores")public List<Document> errores(@PathVariable String id,@RequestParam(defaultValue="0")int pagina){return s.errores(id,pagina);}
}
