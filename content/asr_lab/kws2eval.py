import os, sys
LAB=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.abspath(os.path.join(LAB,'..','..'))+'/'; MODELS=ROOT+'content/.sources/models/'
import json, sys, time
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from kws2 import *; from ref import load
items=json.load(open('ev/items.json'))
audio={it['wav']:load(it['wav']) for it in items}
def run(name, rec, use_hw):
    out=[]; t0=time.time()
    for it in items:
        tgt=target(it['text']); toks=recog(rec,audio[it['wav']], hot(tgt) if use_hw else None)
        out.append(dict(it,toks=toks,res=align(tgt,toks)))
    def rate(kinds,skip):
        n=f=0
        for x in out:
            if x['kind'] in kinds:
                for k,r in enumerate(x['res']):
                    if r=='skip' or (skip and k==x['pos']): continue
                    n+=1; f+= r!='ok'
        return f/n*100
    def det(kind):
        n=d=c=0
        for x in out:
            if x['kind']==kind:
                # vị trí pos tính trên chữ Hán; res cũng theo chữ Hán
                r=x['res'][x['pos']]; n+=1
                if r not in ('ok','skip'): d+=1; c+= r==kind
        return d/n*100, c/max(d,1)*100
    t=det('tone'); s=det('sound')
    print(f"{name:28s} | nhầm TTS {rate(('ok',),0):4.1f}% · người {rate(('okword',),0):4.1f}% · âm khác {rate(('tone','sound'),1):4.1f}% | bắt thanh {t[0]:4.1f}% ({t[1]:.0f}%) · âm {s[0]:4.1f}% ({s[1]:.0f}%) | {(time.time()-t0)/len(items)*1000:.0f} ms/câu")
    return out
run('greedy + luật mới', make('greedy_search'), False)
run('beam 4', make('modified_beam_search'), False)
for hw in (0.5,1.0,1.5,2.0,3.0):
    o=run(f'beam 4 + gợi ý {hw}', make('modified_beam_search',hw=hw), True)
    json.dump(o,open(f'ev/kws_hw{hw}.json','w'),ensure_ascii=False)
