"""Sinh fixture cho test TypeScript (app/tests/unit/pronscore.test.ts): cùng đầu vào, Python ra gì thì TS phải ra y vậy."""
import os, sys, json, re
LAB=os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0,LAB)
from kws2 import make, recog, target, align
from ref import load
items=json.load(open(os.path.join(LAB,'ev','items.json')))
t=open(os.path.join(LAB,'..','..','app','public','data','data.js'),encoding='utf8').read(); D=json.loads(t[t.index('{'):t.rindex('}')+1])
SY={}
def walk(o):
    if isinstance(o,dict):
        if 'zh' in o and 'sy' in o: SY[o['zh']]=o['sy']
        for v in o.values(): walk(v)
    elif isinstance(o,list):
        for v in o: walk(v)
walk(D['lessons']); walk(D['stories'])
for w in D['words']:
    if 'sy' in w: SY[w['c']]=w['sy']
rec=make('greedy_search'); out=[]
for it in items:
    if it['text'] not in SY: continue
    sy=SY[it['text']]; toks=recog(rec,load(it['wav']))
    res=align(target(it['text'],sy),toks)
    chars=[c for c in it['text'] if re.match(r'[一-鿿]',c)]
    out.append(dict(chars=chars,sy=sy,heard=toks,expect=['skip' if r=='skip' else r for r in res],kind=it['kind'],pos=it.get('pos')))
json.dump(out,open(os.path.join(LAB,'..','..','app','tests','unit','fixtures','pron.json'),'w'),ensure_ascii=False)
print(len(out),'mẫu')
