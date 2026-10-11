package gt.usac.bd2.analitica;
import org.junit.jupiter.api.Test;
import gt.usac.bd2.cargas.CargasServicio;
import org.springframework.data.mongodb.core.MongoTemplate;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.*;
class ConsultasServicioTest{
 ConsultasServicio servicio()throws Exception{return new ConsultasServicio(mock(MongoTemplate.class),mock(CargasServicio.class));}
 @Test void catalogoTieneLas20Consultas()throws Exception{assertThat(servicio().catalogo()).extracting(d->d.getInteger("id")).containsExactlyElementsOf(java.util.stream.IntStream.rangeClosed(1,20).boxed().toList());}
 @Test void historialRequiereIdentificador()throws Exception{var s=servicio();for(int id:List.of(11,15))assertThatThrownBy(()->s.pipeline(id,Map.of())).hasMessageContaining("correlativo");}
 @Test void identificadorSeFiltraLiteralmente()throws Exception{var p=servicio().pipeline(11,Map.of("aspirante",".*"));assertThat(p.get(0).get("$match",org.bson.Document.class).getString("correlativo_aspirante")).isEqualTo(".*");}
 @Test void resumenNoAdmiteFiltrosIncompatibles()throws Exception{assertThatThrownBy(()->servicio().pipeline(6,Map.of("anio","2015"))).hasMessageContaining("global");assertThat(servicio().pipeline(6,Map.of("carrera","INGENIERIA CIVIL"))).hasSize(3);}
 @Test void anioInvalidoYFiltroDesconocidoSeRechazan()throws Exception{assertThatThrownBy(()->servicio().pipeline(1,Map.of("anio","abc"))).hasMessageContaining("Anio invalido");assertThatThrownBy(()->servicio().pipeline(1,Map.of("campo","x"))).hasMessageContaining("desconocido");}
 @Test void paginacionLimitaTamano()throws Exception{var s=servicio();assertThatThrownBy(()->s.consultar(1,Map.of(),-1,25)).hasMessageContaining("fuera de rango");assertThatThrownBy(()->s.consultar(1,Map.of(),0,101)).hasMessageContaining("fuera de rango");}
 @Test void consultasGetNoEscribenColecciones()throws Exception{var s=servicio();for(int id=1;id<=20;id++){var p=s.pipeline(id,(id==11||id==15)?Map.of("aspirante","a"):Map.of());assertThat(p).noneMatch(d->d.containsKey("$out")||d.containsKey("$merge"));}}
}
