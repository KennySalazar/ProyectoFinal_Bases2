package gt.usac.bd2.cargas;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import org.apache.commons.csv.*;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
class CsvDatosTest{
 static final String ROW="2014-08-23,M,SIN REGISTRO,MATEMATICA,1,2015,NO APROBADO,INGENIERIA CIVIL,GUATEMALA,MIXCO,PUBLICO,abc";
 org.bson.Document parse(String row)throws Exception{try(var p=CsvDatos.abrir(new ByteArrayInputStream((String.join(",",CsvDatos.CAMPOS)+"\n"+row).getBytes(StandardCharsets.UTF_8)))){return CsvDatos.convertir(p.iterator().next(),CsvDatos.encabezados(p.getHeaderNames()),"c1");}}
 @Test void sinRegistroEsNuloConAdvertencia()throws Exception{var d=parse(ROW);assertThat(d.get("anio_nacimiento")).isNull();assertThat(d.getBoolean("edad_valida_analisis")).isFalse();assertThat(d.getList("advertencias",String.class)).contains("ANIO_NACIMIENTO_SIN_REGISTRO");}
 @Test void edadAnomalaSeConservaFueraDelAnalisis()throws Exception{var d=parse(ROW.replace("SIN REGISTRO","1899"));assertThat(d.getInteger("edad_aproximada")).isEqualTo(116);assertThat(d.getBoolean("edad_valida_analisis")).isFalse();}
 @Test void fechaImposibleSeRechaza(){assertThatThrownBy(()->parse(ROW.replace("2014-08-23","2014-02-30"))).isInstanceOf(IllegalArgumentException.class);}
 @Test void oportunidadInvalidaSeRechaza(){assertThatThrownBy(()->parse(ROW.replace(",1,2015",",0,2015"))).isInstanceOf(IllegalArgumentException.class);}
 @Test void mismoOriginalMismoHash()throws Exception{assertThat(parse(ROW).getString("evaluacion_id")).isEqualTo(parse(ROW).getString("evaluacion_id"));assertThat(parse(ROW+" ").getString("evaluacion_id")).isNotEqualTo(parse(ROW).getString("evaluacion_id"));}
 @Test void aliasYOrdenNoCambianHash()throws Exception{
  var headers=new ArrayList<>(CsvDatos.CAMPOS);var values=new ArrayList<>(List.of(ROW.split(",")));Collections.reverse(headers);Collections.reverse(values);
  headers.set(headers.indexOf("numero_de_fecha_de_evaluacion"),"numero_de_fecha_de_evaluaci");
  String text="\ufeff"+String.join(",",headers)+"\n"+String.join(",",values);
  try(var p=CsvDatos.abrir(new ByteArrayInputStream(text.getBytes(StandardCharsets.UTF_8)))){assertThat(CsvDatos.convertir(p.iterator().next(),CsvDatos.encabezados(p.getHeaderNames()),"c2").getString("evaluacion_id")).isEqualTo(parse(ROW).getString("evaluacion_id"));}
 }
 @Test void encabezadoExtraSeRechaza(){var h=new ArrayList<>(CsvDatos.CAMPOS);h.add("otro");assertThatThrownBy(()->CsvDatos.encabezados(h)).isInstanceOf(IllegalArgumentException.class);}
 @Test void columnasIncompletasSeRechazan(){assertThatThrownBy(()->parse(ROW.substring(0,ROW.lastIndexOf(',')))).isInstanceOf(IllegalArgumentException.class);}
 @Test void comasDentroDeComillasSeConservan()throws Exception{var d=parse(ROW.replace("INGENIERIA CIVIL","\"INGENIERIA, CIVIL\""));assertThat(d.getString("carrera_objetivo")).isEqualTo("INGENIERIA, CIVIL");}
 @Test void revisarDatasetCuandoSeProporciona()throws Exception{
  String path=System.getProperty("dataset.dir");if(path==null)return;
  long total=0,invalid=0;Set<String> ids=new HashSet<>();
  try(var files=Files.list(Path.of(path))){for(Path f:files.filter(x->x.toString().endsWith(".csv")).toList()){
   try(var parser=CsvDatos.abrir(Files.newInputStream(f))){var h=CsvDatos.encabezados(parser.getHeaderNames());for(var row:parser){total++;try{ids.add(CsvDatos.convertir(row,h,"test").getString("evaluacion_id"));}catch(IllegalArgumentException e){invalid++;System.out.println(f.getFileName()+":"+row.getRecordNumber()+" "+e.getMessage());}}}
  }}
  System.out.println("DATASET total="+total+" invalidos="+invalid+" unicos="+ids.size());assertThat(total).isEqualTo(208453);assertThat(invalid).isZero();assertThat(ids.size()).isEqualTo(207619);
 }
}
