import os, sys
LAB=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.abspath(os.path.join(LAB,'..','..'))+'/'; MODELS=ROOT+'content/.sources/models/'
import sys, json, pathlib, time
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from ref import load
from playwright.sync_api import sync_playwright
url=pathlib.Path(LAB,'..','..','.cache','poc','index.html').resolve().as_uri()   # trang thử: build bằng poc/entry.js (xem README)
items=json.load(open(LAB+'/ev/items.json'))
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e))); pg.on('console',lambda m: errs.append('console:'+m.text) if m.type=='error' else None)
    t=time.time(); pg.goto(url); ok=pg.evaluate('window.ready'); print('ready',ok,'tổng',round(time.time()-t,2),'s'); print(errs[:5])
    if ok and 'err' not in ok:
        for it in items[:3]+[x for x in items if x['kind']=='tone'][:3]:
            a=load(it['wav']).tolist()
            r=pg.evaluate('s=>window.recognize(s)', a)
            print(it['kind'], it.get('said',it['text']), ''.join(r['tokens']), r['ms'],'ms')
        print(pg.evaluate("performance.memory ? Math.round(performance.memory.usedJSHeapSize/1e6)+' MB JS heap' : ''"))
    b.close()
