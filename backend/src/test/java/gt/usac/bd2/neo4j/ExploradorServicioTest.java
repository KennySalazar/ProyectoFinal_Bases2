package gt.usac.bd2.neo4j;
import org.junit.jupiter.api.Test;
import org.neo4j.driver.Driver;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.*;
class ExploradorServicioTest {
    ExploradorServicio servicio() throws Exception{return new ExploradorServicio(mock(Driver.class));}
    @Test void catalogoTieneCincoConsultas()throws Exception{assertThat(servicio().catalogo()).extracting(d->d.getInteger("id")).containsExactly(1,2,3,4,5);}
    @Test void filtrosSonParametrosLiterales()throws Exception{var p=servicio().parametros(Map.of("aspirante","' OR true //","anio","2015"),true);assertThat(p.get("aspirante")).isEqualTo("' OR true //");assertThat(p.get("anio")).isEqualTo(2015);}
    @Test void filtrosInvalidosSeRechazan()throws Exception{var s=servicio();assertThatThrownBy(()->s.parametros(Map.of("anio","abc"),true)).hasMessageContaining("Anio invalido");assertThatThrownBy(()->s.parametros(Map.of("aprobacion","X"),true)).hasMessageContaining("Aprobacion invalida");assertThatThrownBy(()->s.parametros(Map.of("cypher","MATCH"),true)).hasMessageContaining("desconocido");}
    @Test void historialRequiereCorrelativo()throws Exception{assertThatThrownBy(()->servicio().consultar(1,Map.of(),0,25)).hasMessageContaining("correlativo");}
    @Test void consultaDeParesNoAceptaMateria()throws Exception{assertThatThrownBy(()->servicio().consultar(4,Map.of("materia","MATEMATICA"),0,25)).hasMessageContaining("pares");}
    @Test void grafoTieneLimiteEstricto()throws Exception{assertThatThrownBy(()->servicio().explorar(Map.of(),31)).hasMessageContaining("1 y 30");assertThatThrownBy(()->servicio().explorar(Map.of(),0)).hasMessageContaining("1 y 30");}
    @Test void paginacionAcotada()throws Exception{assertThatThrownBy(()->servicio().consultar(2,Map.of(),0,101)).hasMessageContaining("fuera de rango");}
}
