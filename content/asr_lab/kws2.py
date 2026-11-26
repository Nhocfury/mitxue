"""Chấm bằng mô hình pinyin (KWS 3.3M): nhận dạng tự do (có thể gợi ý câu mục tiêu) → căn với pinyin đích."""
import os, sys
LAB=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.abspath(os.path.join(LAB,'..','..'))+'/'; MODELS=ROOT+'content/.sources/models/'

import json, re, sys, numpy as np, sherpa_onnx as so
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from pypinyin import pinyin, Style
from pypinyin.contrib.tone_convert import to_initials, to_finals_tone, to_tone
D=MODELS+'sherpa-onnx-kws-zipformer-wenetspeech-3.3M-2024-01-01/'
def make(method='greedy_search', hw=0.0, paths=4, blank=0.0):
    kw=dict(tokens=D+'tokens.txt',encoder=D+'encoder-epoch-12-avg-2-chunk-16-left-64.int8.onnx',decoder=D+'decoder-epoch-12-avg-2-chunk-16-left-64.int8.onnx',joiner=D+'joiner-epoch-12-avg-2-chunk-16-left-64.int8.onnx',num_threads=2,decoding_method=method,max_active_paths=paths,blank_penalty=blank)
    if hw: kw.update(hotwords_score=hw)
    return so.OnlineRecognizer.from_transducer(**kw)
TB=str.maketrans('āáǎàōóǒòēéěèīíǐìūúǔùǖǘǚǜ','aaaaooooeeeeiiiiuuuuüüüü')
def base(f): return f.translate(TB)
def tone_of(f):
    for k,s in enumerate(['āōēīūǖ','áóéíúǘ','ǎǒěǐǔǚ','àòèìùǜ']):
        if any(ch in f for ch in s): return k+1
    return 5
def with_tone(f,t):
    b=base(f)
    if t==5: return b
    return to_finals_tone(to_tone(('y' if b.startswith('i') or b.startswith('ü') else 'w' if b.startswith('u') else '')+b+str(t)) if False else b, strict=False) if False else _set_tone(b,t)
def _set_tone(b,t):
    marks={'a':'āáǎà','o':'ōóǒò','e':'ēéěè','i':'īíǐì','u':'ūúǔù','ü':'ǖǘǚǜ'}
    # vị trí đánh dấu: a/e/o ưu tiên, 'iu' → u, 'ui' → i
    if 'a' in b: v='a'
    elif 'e' in b: v='e'
    elif 'ou' in b: v='o'
    elif 'iu' in b: v='u'
    elif 'ui' in b: v='i'
    elif 'o' in b: v='o'
    else: v=[c for c in b if c in marks][-1]
    k=b.rindex(v) if v in 'iuü' else b.index(v)
    return b[:k]+marks[v][t-1]+b[k+1:]
def target(text):
    chars=[c for c in text if re.match(r'[一-鿿]',c)]
    p=[x[0] for x in pinyin(''.join(chars),style=Style.TONE)]
    out=[]
    for k,(s,c) in enumerate(zip(p,chars)):
        if c=='儿' and k>0 and chars[k-1] not in '女儿婴': out.append(None); continue   # 儿化: không chấm riêng
        i=to_initials(s,strict=False); f=to_finals_tone(s,strict=False)
        out.append(dict(c=c,i=i,f=f,t=tone_of(f)))
    # biến điệu: thêm thanh được chấp nhận
    syl=[o for o in out if o]
    for k,o in enumerate(syl):
        acc={o['t']}
        nxt=syl[k+1] if k+1<len(syl) else None
        if nxt:
            if o['t']==3 and nxt['t']==3: acc.add(2)
            if o['c']=='不' and nxt['t']==4: acc.add(2)
            if o['c']=='一': acc |= {2,4}
        if o['t']==5: acc={1,2,3,4,5}
        if o['c'] in '个们子么的了吗呢吧着过得地': acc={1,2,3,4,5}       # hay đọc nhẹ
        o['acc']={_set_tone(base(o['f']),t) if t!=5 else base(o['f']) for t in acc}
    return out
def hot(tgt):
    return ' '.join(x for o in tgt if o for x in ([o['i']] if o['i'] else [])+[o['f']])
def recog(rec,a,hw=None):
    a=np.concatenate([np.zeros(4800,np.float32),a,np.zeros(16000,np.float32)])
    s=rec.create_stream(hw) if hw else rec.create_stream(); s.accept_waveform(16000,a); s.input_finished()
    while rec.is_ready(s): rec.decode_stream(s)
    return rec.get_result_all(s).tokens
def align(tgt, toks):
    seq=[]; own=[]; accs=[]
    for k,o in enumerate(tgt):
        if not o: continue
        if o['i']: seq.append(o['i']); own.append(k); accs.append({o['i']})
        seq.append(o['f']); own.append(k); accs.append(o['acc'])
    n,m=len(seq),len(toks)
    def cost(j,b):
        if b in accs[j]: return 0
        if base(seq[j])==base(b): return 0.6
        return 1
    Dm=np.zeros((n+1,m+1)); Dm[:,0]=np.arange(n+1); Dm[0,:]=np.arange(m+1)
    for x in range(1,n+1):
        for y in range(1,m+1):
            Dm[x,y]=min(Dm[x-1,y]+1,Dm[x,y-1]+1,Dm[x-1,y-1]+cost(x-1,toks[y-1]))
    x,y=n,m; got=[None]*n
    while x>0 and y>0:
        if Dm[x,y]==Dm[x-1,y-1]+cost(x-1,toks[y-1]): got[x-1]=toks[y-1]; x-=1; y-=1
        elif Dm[x,y]==Dm[x-1,y]+1: x-=1
        else: y-=1
    res=[]
    for k,o in enumerate(tgt):
        if not o: res.append('skip'); continue
        js=[j for j in range(n) if own[j]==k]
        if all(got[j] is None for j in js): res.append('missed'); continue
        bad_seg=any(got[j] is None or base(got[j])!=base(seq[j]) for j in js)
        bad_tone=any(got[j] is not None and got[j] not in accs[j] for j in js)
        res.append('sound' if bad_seg else 'tone' if bad_tone else 'ok')
    return res
