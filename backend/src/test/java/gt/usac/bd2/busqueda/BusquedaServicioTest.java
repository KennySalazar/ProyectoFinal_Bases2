package gt.usac.bd2.busqueda;
import org.junit.jupiter.api.Test;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.bson.Document;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.*;
class BusquedaServicioTest {
    BusquedaServicio s(){return new BusquedaServicio(mock(MongoTemplate.class));}
    @Test void filtrosExactosYTipeados(){var f=s().filtro(Map.of("anio","2015","aspirante","abc","municipio","MIXCO"));assertThat(f.getInteger("anio_de_ingreso")).isEqualTo(2015);assertThat(f.getString("correlativo_aspirante")).isEqualTo("abc");assertThat(f.getString("municipio_institucion_educativa")).isEqualTo("MIXCO");}
    @Test void textoEscapaOperadoresRegex(){var f=s().filtro(Map.of("texto",".*"));assertThat(f.getList("$or",Document.class)).allMatch(d->d.values().stream().anyMatch(v->v instanceof Document&&((Document)v).getString("$regex").equals("\\Q.*\\E")));}
    @Test void campoDesconocidoSeRechaza(){assertThatThrownBy(()->s().filtro(Map.of("$where","x"))).hasMessageContaining("desconocido");}
    @Test void anioYResultadoInvalidosSeRechazan(){assertThatThrownBy(()->s().filtro(Map.of("anio","abc"))).hasMessageContaining("Anio invalido");assertThatThrownBy(()->s().filtro(Map.of("aprobacion","X"))).hasMessageContaining("Resultado invalido");}
    @Test void tamanosFueraDeRangoNoConsultan(){assertThatThrownBy(()->s().buscar(Map.of(),0,101)).hasMessageContaining("fuera de rango");}
    @Test void idInvalidoNoConsulta(){assertThatThrownBy(()->s().detalle("../archivo")).hasMessageContaining("ID de evaluacion invalido");}
}
