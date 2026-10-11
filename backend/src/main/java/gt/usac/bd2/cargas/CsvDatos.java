package gt.usac.bd2.cargas;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.commons.csv.*;
import org.bson.Document;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.*;
import java.util.*;
public final class CsvDatos {
 public static final List<String> CAMPOS=List.of("fecha_asignacion","sexo","anio_nacimiento","materia","numero_de_fecha_de_evaluacion","anio_de_ingreso","aprobacion","carrera_objetivo","departamento_institucion_educativa","municipio_institucion_educativa","tipo_institucion_educativa","correlativo_aspirante");
 static final Map<String,String> ALIAS=Map.of("numero_de_fecha_de_evaluaci",CAMPOS.get(4),"departamento_institucion_ed",CAMPOS.get(8),"municipio_institucion_",CAMPOS.get(9));
 static final ObjectMapper JSON=new ObjectMapper();
 private CsvDatos(){}
 public static CSVParser abrir(InputStream input)throws IOException{
  var r=new PushbackReader(new InputStreamReader(input,StandardCharsets.UTF_8.newDecoder().onMalformedInput(java.nio.charset.CodingErrorAction.REPORT)),1);
  int c=r.read();if(c!=-1&&c!=0xfeff)r.unread(c);
  return CSVFormat.RFC4180.builder().setHeader().setSkipHeaderRecord(true).setDuplicateHeaderMode(DuplicateHeaderMode.DISALLOW).setIgnoreEmptyLines(false).get().parse(r);
 }
 public static Map<String,String> encabezados(List<String> headers){
  Map<String,String> m=new LinkedHashMap<>();
  for(String h:headers){String key=h.trim().toLowerCase(Locale.ROOT);key=ALIAS.getOrDefault(key,key);if(!CAMPOS.contains(key)||m.put(key,h)!=null)throw new IllegalArgumentException("Encabezado desconocido o repetido: "+h);}
  if(m.size()!=12)throw new IllegalArgumentException("Se requieren los 12 encabezados del dataset.");return m;
 }
 public static Document convertir(CSVRecord row,Map<String,String> headers,String carga){
  if(row.size()!=12)throw new IllegalArgumentException("La fila debe tener 12 columnas.");
  Document d=new Document(),original=new Document();List<String> raw=new ArrayList<>(),warnings=new ArrayList<>();
  for(String f:CAMPOS){String value=row.get(headers.get(f));raw.add(value);original.put(f,value);String v=value.trim().replaceAll("\\s+"," ");if(v.isEmpty())throw new IllegalArgumentException("Campo vacio: "+f);d.put(f,f.equals("correlativo_aspirante")?v:v.toUpperCase(Locale.ROOT));}
  LocalDate fecha;try{fecha=LocalDate.parse(d.getString("fecha_asignacion"));}catch(Exception e){throw new IllegalArgumentException("Fecha invalida; use YYYY-MM-DD.");}
  int year=numero(d,"anio_de_ingreso",1900,2100),op=numero(d,CAMPOS.get(4),1,5);
  if(fecha.getYear()>year||fecha.getYear()<year-1)throw new IllegalArgumentException("Fecha incompatible con anio de ingreso.");
  if(!Set.of("M","F","SIN REGISTRO").contains(d.getString("sexo")))throw new IllegalArgumentException("sexo debe ser M, F o SIN REGISTRO.");
  if(!Set.of("APROBADO","NO APROBADO").contains(d.getString("aprobacion")))throw new IllegalArgumentException("aprobacion invalida.");
  if(d.getString("sexo").equals("SIN REGISTRO"))warnings.add("SEXO_SIN_REGISTRO");
  Integer birth=null,age=null;
  if(d.getString("anio_nacimiento").equals("SIN REGISTRO"))warnings.add("ANIO_NACIMIENTO_SIN_REGISTRO");
  else{birth=numero(d,"anio_nacimiento",1800,2100);age=year-birth;if(age<0)throw new IllegalArgumentException("Nacimiento posterior al ingreso.");if(age<13||age>100)warnings.add("EDAD_FUERA_RANGO_ANALISIS");}
  if(year>=2022)warnings.add("FUENTE_CON_POSIBLES_TEXTOS_TRUNCADOS");
  d.put("fecha_asignacion",Date.from(fecha.atStartOfDay(ZoneOffset.UTC).toInstant()));d.put("anio_de_ingreso",year);d.put(CAMPOS.get(4),op);d.put("anio_nacimiento",birth);d.put("edad_aproximada",age);d.put("edad_valida_analisis",age!=null&&age>=13&&age<=100);
  d.put("evaluacion_id",sha(json(raw).getBytes(StandardCharsets.UTF_8)));d.put("originales",original);d.put("advertencias",warnings);d.put("carga_id",carga);d.put("fecha_carga",new Date());d.put("sincronizacion_neo4j","PENDIENTE");return d;
 }
 static int numero(Document d,String f,int min,int max){try{int n=Integer.parseInt(d.getString(f));if(n<min||n>max)throw new NumberFormatException();return n;}catch(NumberFormatException e){throw new IllegalArgumentException("Numero invalido: "+f);}}
 public static String json(Object o){try{return JSON.writeValueAsString(o);}catch(IOException e){throw new IllegalStateException(e);}}
 public static String sha(byte[] b){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(b));}catch(Exception e){throw new IllegalStateException(e);}}
}
