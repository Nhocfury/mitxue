"""Sinh bộ dữ liệu đánh giá: đúng (người thật + TTS) và sai (TTS đọc câu bị thay 1 chữ)."""
import os, sys
LAB=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.abspath(os.path.join(LAB,'..','..'))+'/'; MODELS=ROOT+'content/.sources/models/'

import sys, json, random, re, os, numpy as np, soundfile as sf
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0,ROOT+'content')
from pypinyin import pinyin, Style
from scorer import REP, SIM_I, SIM_F, split
import sherpa_onnx as so
random.seed(7)
M=MODELS+''
d=M+'matcha-icefall-zh-baker/'
tts=so.OfflineTts(so.OfflineTtsConfig(model=so.OfflineTtsModelConfig(matcha=so.OfflineTtsMatchaModelConfig(acoustic_model=d+'model-steps-3.onnx',vocoder=M+'vocos-22khz-univ.onnx',lexicon=d+'lexicon.txt',tokens=d+'tokens.txt',dict_dir=d+'dict'),num_threads=4),max_num_sentences=1))
t=open(ROOT+'app/public/data/data.js',encoding='utf8').read(); D=json.loads(t[t.index('{'):t.rindex('}')+1])
sents=[]
def walk(o):
    if isinstance(o,dict):
        if 'zh' in o and 'py' in o: sents.append(o['zh'])
        for v in o.values(): walk(v)
    elif isinstance(o,list):
        for v in o: walk(v)
walk(D['lessons'])
sents=[s for s in dict.fromkeys(sents) if 4<=len(re.findall(r'[一-鿿]',s))<=12 and not re.search(r'[A-Za-z0-9“”"]',s)]
random.shuffle(sents)
os.makedirs('ev',exist_ok=True)
items=[]
def synth(text,path):
    a=tts.generate(text,sid=0,speed=0.9); sf.write(path,a.samples,a.sample_rate)
# 1) câu đúng
for k,s in enumerate(sents[:120]):
    p=f'ev/ok_{k}.wav'; synth(s,p); items.append(dict(kind='ok',text=s,wav=p))
# 2) câu sai: thay 1 chữ bằng chữ khác thanh / khác âm
def alt(c,py,mode):
    syl=re.sub(r'\d','',py); tone=py[-1]
    if mode=='tone':
        opts=[REP.get(f'{syl}{t}') for t in '1234' if t!=tone]
    else:
        ini,fin=split(syl)
        opts=[REP.get(f'{n}{fin}{tone}') for n in SIM_I.get(ini,[])]+[REP.get(f'{ini}{n}{tone}') for n in SIM_F.get(fin,[])]
    opts=[o for o in opts if o and o!=c]
    return random.choice(opts) if opts else None
k=0
for s in sents[120:]:
    if k>=240: break
    chars=[(i,c) for i,c in enumerate(s) if re.match(r'[一-鿿]',c)]
    pys=[p[0] for p in pinyin(''.join(c for _,c in chars),style=Style.TONE3,neutral_tone_with_five=True)]
    mode='tone' if k%2==0 else 'sound'
    cand=[(j,i,c,p) for j,((i,c),p) in enumerate(zip(chars,pys)) if p[-1]!='5']
    random.shuffle(cand)
    for j,i,c,p in cand:
        r=alt(c,p,mode)
        if r:
            bad=s[:i]+r+s[i+1:]
            path=f'ev/bad_{k}.wav'; synth(bad,path)
            items.append(dict(kind=mode,text=s,said=bad,pos=j,wav=path)); k+=1; break
# 3) từ HSK người thật đọc
H=ROOT+'content/.sources/hsk30/Audio/'
ws=[w for w in D['audio'] if 1<=len(w)<=4 and re.fullmatch(r'[一-鿿]+',w)]
random.shuffle(ws)
for w in ws[:200]: items.append(dict(kind='okword',text=w,wav=H+f'cmn-{w}.mp3'))
json.dump(items,open('ev/items.json','w'),ensure_ascii=False,indent=0)
print({k:sum(1 for x in items if x['kind']==k) for k in ('ok','tone','sound','okword')})
