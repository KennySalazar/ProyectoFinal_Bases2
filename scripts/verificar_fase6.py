#!/usr/bin/env python3
"""Prueba la API Neo4j real y compara las evaluaciones con MongoDB."""
import argparse,json,urllib.request,urllib.parse,urllib.error
p=argparse.ArgumentParser();p.add_argument('--url',default='http://localhost:8091/api/v1');p.add_argument('--aspirante',required=True);args=p.parse_args()
def api(path):
 try:
  with urllib.request.urlopen(args.url+path,timeout=90) as r:return json.load(r)
 except urllib.error.HTTPError as e:raise RuntimeError(f'HTTP {e.code}: {e.read().decode()}') from e
mongo=api('/cargas/resumen');neo=api('/neo4j/resumen')
assert not mongo['ocupado'],'Espere a que termine el proceso activo.'
assert mongo['pendientes_neo4j']==0,'Primero reintente la sincronizacion pendiente.'
assert neo['evaluaciones']==mongo['evaluaciones']>0,'Las bases tienen diferentes cantidades de evaluaciones.'
assert len(api('/neo4j/consultas'))==5
results={}
for i in range(1,6):
 page=0;rows=[]
 while True:
  params={'pagina':page,'tamano':100}
  if i==1:params['aspirante']=args.aspirante
  r=api(f'/neo4j/consultas/{i}?'+urllib.parse.urlencode(params));rows.extend(r['filas'])
  if len(rows)>=r['total']:break
  assert r['filas'],'Pagina vacia inesperada.'
  page+=1
 assert len(rows)==r['total']
 for row in rows:
  if 'porcentaje_aprobacion' in row:assert 0<=row['porcentaje_aprobacion']<=100
 results[i]=rows;print(f'Consulta Neo4j {i}: OK ({len(rows)} filas)')
assert results[1],'Correlativo no encontrado; use un identificador real de los CSV cargados.'
assert all(r['correlativo_aspirante']==args.aspirante for r in results[1])
assert sum(r['evaluaciones'] for r in results[2])==neo['evaluaciones']
assert sum(r['evaluaciones'] for r in results[3])==neo['evaluaciones']
q20=api('/consultas/20?tamano=100')['filas'];assert sum(r['aprobadas'] for r in results[2])==sum(r['aprobadas'] for r in q20)
q11=api('/consultas/11?'+urllib.parse.urlencode({'aspirante':args.aspirante,'tamano':100}));assert q11['total']==len(results[1])
graph=api('/neo4j/grafo?'+urllib.parse.urlencode({'aspirante':args.aspirante,'limite':5}))
assert 0<graph['evaluaciones_mostradas']<=5
ids=[n['id'] for n in graph['nodos']];assert len(ids)==len(set(ids))
edgeids=[r['id'] for r in graph['relaciones']];assert len(edgeids)==len(set(edgeids))
for edge in graph['relaciones']:assert edge['origen'] in ids and edge['destino'] in ids
for n in graph['nodos']:
 if n['tipo']=='Aspirante':assert n['propiedades']['correlativo_aspirante']==args.aspirante
approved=api('/neo4j/grafo?aprobacion=APROBADO&limite=5')
for n in approved['nodos']:
 if n['tipo']=='Evaluacion':assert n['propiedades']['aprobacion']=='APROBADO'
empty=api('/neo4j/grafo?anio=2099&limite=5');assert not empty['nodos'] and not empty['relaciones']
print(f'VERIFICACION COMPLETADA: {neo["evaluaciones"]} evaluaciones Neo4j; grafo, filtros y referencias correctos. No se modificaron datos.')
