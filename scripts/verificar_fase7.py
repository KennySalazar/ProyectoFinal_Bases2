#!/usr/bin/env python3
"""Prueba el buscador y sus enlaces de datos sin modificar las bases."""
import argparse,json,urllib.request,urllib.parse
p=argparse.ArgumentParser();p.add_argument('--url',default='http://localhost:8091/api/v1');p.add_argument('--aspirante',required=True);a=p.parse_args()
def api(path):
 with urllib.request.urlopen(a.url+path,timeout=90) as r:return json.load(r)
q=urllib.parse.urlencode({'aspirante':a.aspirante,'tamano':100})
r=api('/busqueda?'+q);h=api('/consultas/15?'+q)
assert r['total']==h['total']>0,'El correlativo debe existir y los totales deben coincidir.'
assert all(x['correlativo_aspirante']==a.aspirante for x in r['filas'])
d=api('/busqueda/evaluaciones/'+r['filas'][0]['evaluacion_id'])
assert d['correlativo_aspirante']==a.aspirante and 'originales' in d and 'advertencias' in d
print('Correlativo, historial y detalle: OK')
for f in ('carrera_objetivo','materia','tipo_institucion_educativa','departamento_institucion_educativa','municipio_institucion_educativa'):
 key={'carrera_objetivo':'carrera','tipo_institucion_educativa':'tipo','departamento_institucion_educativa':'departamento','municipio_institucion_educativa':'municipio'}.get(f,f)
 page=api('/busqueda?'+urllib.parse.urlencode({key:d[f],'tamano':25}))
 assert all(x[f]==d[f] for x in page['filas']) and page['total']>0
print('Filtros exactos por carrera, materia, tipo, departamento y municipio: OK')
text=api('/busqueda?'+urllib.parse.urlencode({'texto':a.aspirante[:8],'tamano':100}))
assert any(x['correlativo_aspirante']==a.aspirante for x in text['filas'])
empty=api('/busqueda?texto=__SIN_COINCIDENCIAS_BD2_123456789__');assert empty['total']==0 and not empty['filas']
page=api('/busqueda?tamano=1&pagina=0');page2=api('/busqueda?tamano=1&pagina=1')
assert len(page['filas'])==1 and page['total']==page2['total']
if page['total']>1:assert page['filas'][0]['evaluacion_id']!=page2['filas'][0]['evaluacion_id']
options=api('/busqueda/opciones');assert d['municipio_institucion_educativa'] in options['municipios']
print('Texto parcial, vacio, paginacion y opciones: OK')
print(f'VERIFICACION COMPLETADA: buscador conectado; {r["total"]} evaluaciones del aspirante. No se modificaron datos.')
