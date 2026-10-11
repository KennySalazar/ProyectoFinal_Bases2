#!/usr/bin/env python3
"""Verifica las 20 consultas contra la API real sin modificar evaluaciones."""
import argparse,json,urllib.request,urllib.parse,urllib.error
p=argparse.ArgumentParser();p.add_argument('--url',default='http://localhost:8091/api/v1');p.add_argument('--aspirante',required=True);p.add_argument('--generar-resumen',action='store_true');args=p.parse_args()
def api(path,method='GET'):
 try:
  with urllib.request.urlopen(urllib.request.Request(args.url+path,method=method),timeout=90) as r:return json.load(r)
 except urllib.error.HTTPError as e:
  raise RuntimeError(f'HTTP {e.code}: {e.read().decode()}') from e
summary=api('/cargas/resumen')
assert not summary['ocupado'],'Espere a que termine la carga o sincronizacion.'
assert summary['evaluaciones']>0,'Primero cargue un CSV.'
assert len(api('/consultas'))==20
if args.generar_resumen:print(api('/consultas/resumen-carrera','POST'))
results={}
for i in range(1,21):
 extra={'aspirante':args.aspirante} if i in (11,15) else {}
 page=0;rows=[]
 while True:
  q=urllib.parse.urlencode({**extra,'pagina':page,'tamano':100});r=api(f'/consultas/{i}?{q}')
  assert r['consulta']==i and isinstance(r['filas'],list)
  rows.extend(r['filas'])
  if len(rows)>=r['total']:break
  assert r['filas'],'Pagina vacia antes de completar el total.'
  page+=1
 assert len(rows)==r['total']
 for row in rows:
  for k,v in row.items():
   if k.startswith('porcentaje_'):assert v is None or 0<=v<=100,(i,k,v)
  if {'evaluaciones','aprobadas','no_aprobadas'}<=row.keys():assert row['evaluaciones']==row['aprobadas']+row['no_aprobadas']
 results[i]=rows;print(f'Consulta {i:02}: OK ({len(rows)} filas)')
assert results[11] and results[15],'Correlativo no encontrado; use un ID real de los CSV cargados.'
assert len(results[11])==len(results[15])
assert all(r['correlativo_aspirante']==args.aspirante for r in results[15])
total=summary['evaluaciones'];approved=sum(r['aprobadas'] for r in results[20])
assert sum(r['evaluaciones'] for r in results[20])==total
assert sum(r['evaluaciones'] for r in results[4])==total
assert sum(r['evaluaciones'] for r in results[18])==total
assert sum(r['aprobadas'] for r in results[2])==approved
assert sum(r['evaluaciones'] for r in results[6])==total,'Resumen vacio o desactualizado. Use --generar-resumen.'
assert sum(r['aprobadas'] for r in results[6])==approved
print(f'VERIFICACION COMPLETADA: {total} evaluaciones; {approved} aprobadas. No hubo inserciones de evaluaciones.')
