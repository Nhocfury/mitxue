"""Bộ chấm phát âm (bản tham chiếu Python): so câu đúng với 'đối thủ' cho từng âm tiết bằng CTC."""
import os, sys
LAB=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.abspath(os.path.join(LAB,'..','..'))+'/'; MODELS=ROOT+'content/.sources/models/'

import json, re, numpy as np, sys
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from ref import char_ids, logprobs
from pypinyin import pinyin, Style
REP=json.load(open(LAB+'/rivals.json',encoding='utf8'))
INITS=['zh','ch','sh','b','p','m','f','d','t','n','l','g','k','h','j','q','x','r','z','c','s','y','w']
def split(s):
    for i in INITS:
        if s.startswith(i): return i,s[len(i):]
    return '',s
SIM_I={'zh':['z','j'],'z':['zh','j'],'j':['zh','z','q'],'ch':['c','q'],'c':['ch','q'],'q':['ch','c','j'],'sh':['s','x'],'s':['sh','x'],'x':['sh','s'],
       'n':['l'],'l':['n','r'],'r':['l'],'f':['h'],'h':['f'],'b':['p'],'p':['b'],'d':['t'],'t':['d'],'g':['k'],'k':['g']}
SIM_F={'an':['ang'],'ang':['an'],'en':['eng'],'eng':['en'],'in':['ing'],'ing':['in'],'ian':['iang'],'iang':['ian'],'uan':['uang'],'uang':['uan'],
       'u':['v'],'v':['u'],'ue':['ie'],'ie':['ue'],'e':['o'],'o':['e'],'ou':['uo'],'uo':['ou'],'ei':['ai'],'ai':['ei']}
def ctc_ll(lp, seq):
    """log P(seq | audio) theo CTC (thuật toán forward), vector hóa theo trạng thái."""
    T=lp.shape[0]; L=2*len(seq)+1
    ext=np.zeros(L,dtype=np.int64); ext[1::2]=seq
    skip=np.zeros(L,dtype=bool)
    if L>2: skip[2:]=(ext[2:]!=0)&(ext[2:]!=ext[:-2])
    NEG=-1e30; a=np.full(L,NEG); a[0]=lp[0,0]
    if L>1: a[1]=lp[0,ext[1]]
    E=lp[:,ext]
    for t in range(1,T):
        s1=np.concatenate(([NEG],a[:-1])); s2=np.concatenate(([NEG,NEG],a[:-2])); s2=np.where(skip,s2,NEG)
        a=np.logaddexp(np.logaddexp(a,s1),s2)+E[t]
    return float(np.logaddexp(a[-1],a[-2])) if L>1 else float(a[-1])
def surface_tones(chars, pys):
    """Biến điệu: 3-3 → 2-3, 不 trước thanh 4 → 2, 一 trước 4 → 2, trước 1/2/3 → 4."""
    tones=[int(p[-1]) if p[-1].isdigit() else 5 for p in pys]; out=list(tones)
    for i in range(len(tones)-1):
        if tones[i]==3 and tones[i+1]==3: out[i]=2
        if chars[i]=='不' and tones[i+1]==4: out[i]=2
        if chars[i]=='一' and i+1<len(chars): out[i]=2 if tones[i+1]==4 else 4
    return out
def score(audio, text, extra_tokens=1):
    chars=[c for c in text if re.match(r'[一-鿿]',c)]
    pys=[p[0] for p in pinyin(''.join(chars),style=Style.TONE3,neutral_tone_with_five=True)]
    surf=surface_tones(chars,pys)
    lp=logprobs(audio)
    toks=[char_ids(c) for c in chars]
    def seq(rep): return [t for k,tk in enumerate(toks) for t in (rep.get(k,tk))]
    base=ctc_ll(lp,seq({}))
    res=[]
    for i,(c,p) in enumerate(zip(chars,pys)):
        syl=re.sub(r'\d','',p); tone=int(p[-1]); acc_t={tone,surf[i],5}
        cands=[]   # (loại, chữ, tokens)
        for t in (1,2,3,4):
            if t in acc_t: continue
            r=REP.get(f'{syl}{t}')
            if r and r!=c: cands.append(('tone',r,char_ids(r)))
        ini,fin=split(syl)
        for ni in SIM_I.get(ini,[]):
            r=REP.get(f'{ni}{fin}{tone}')
            if r and r!=c: cands.append(('sound',r,char_ids(r)))
        for nf in SIM_F.get(fin,[]):
            r=REP.get(f'{ini}{nf}{tone}')
            if r and r!=c: cands.append(('sound',r,char_ids(r)))
        cands.append(('missed','',[]))
        best=None
        for kind,r,tk in cands:
            ll=ctc_ll(lp,seq({i:tk}))
            if best is None or ll>best[0]: best=(ll,kind,r)
        # chấp nhận cả chữ đại diện cho thanh biến điệu (vd 你 đọc ní)
        acc=base
        if surf[i]!=tone:
            r=REP.get(f'{syl}{surf[i]}')
            if r: acc=max(acc,ctc_ll(lp,seq({i:char_ids(r)})))
        res.append(dict(ch=c,py=p,margin=float(acc-best[0]),rival=best[1],rch=best[2]))
    return res
if __name__=='__main__':
    from ref import load
    import time
    a=load(ROOT+'content/.sources/hsk30/Audio/cmn-学生.mp3') if False else None
