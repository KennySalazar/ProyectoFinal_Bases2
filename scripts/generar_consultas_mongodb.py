#!/usr/bin/env python3
"""Regenera copias legibles de la fuente usada por la API."""
from pathlib import Path
import json
root=Path(__file__).resolve().parent.parent
(root/'consultas/mongodb').mkdir(parents=True,exist_ok=True)
config=json.loads((root/'backend/src/main/resources/consultas/mongodb.json').read_text())
for q in config["consultas"]:
 script='// '+q['titulo']+'\n// Ejecutar desde la raiz del repo con mongosh --file.\n// Fuente oficial: backend/src/main/resources/consultas/mongodb.json\nconst base=db.getSiblingDB("admisiones_usac");\n'
 if q['id']==6:script+='// Genera el resumen global antes de consultarlo. No modifica evaluaciones.\nbase.evaluaciones.aggregate('+json.dumps(config['resumen_pipeline'],indent=2)+',{allowDiskUse:true}).toArray();\n'
 script+='const pipeline='+json.dumps(q['pipeline'],indent=2)+';\n'
 if q['id'] in (11,15):script+='const aspirante=process.env.ASPIRANTE;\nif(!aspirante)throw new Error("Defina ASPIRANTE con un correlativo real");\npipeline.unshift({$match:{correlativo_aspirante:aspirante}});\n'
 script+=f'base.getCollection("{q["coleccion"]}").aggregate(pipeline,{{allowDiskUse:true}}).forEach(d=>printjson(d));\n'
 (root/f'consultas/mongodb/{q["id"]:02}_consulta.js').write_text(script)
