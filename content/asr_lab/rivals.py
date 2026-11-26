"""Bảng 'đối thủ': với mỗi âm tiết + thanh (vd xue2) chọn 1 chữ thông dụng đại diện.
Độ thông dụng: chữ HSK (cấp càng thấp càng thông dụng) + số từ CEDICT chứa chữ đó."""
import os, sys
LAB=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.abspath(os.path.join(LAB,'..','..'))+'/'; MODELS=ROOT+'content/.sources/models/'

import re, json, collections, sys
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__))); from ref import char_ids
from pypinyin.contrib.tone_convert import to_tone3
CE=ROOT+'content/.sources/cedict/cedict_ts.u8'
t=open(ROOT+'app/public/data/data.js',encoding='utf8').read(); D=json.loads(t[t.index('{'):t.rindex('}')+1])
hsk={c:(v.get('lv') or 9) for c,v in D['chars'].items()}
cnt=collections.Counter(); readings=collections.defaultdict(collections.Counter)
for line in open(CE,encoding='utf8'):
    if line.startswith('#'): continue
    m=re.match(r'(\S+) (\S+) \[([^\]]+)\]',line)
    if not m: continue
    simp,py=m[2],m[3].lower().replace('u:','v').split()
    for ch in simp: cnt[ch]+=1
    if len(simp)==len(py):
        for ch,p in zip(simp,py):
            if re.fullmatch(r'[a-z]+[1-5]',p): readings[ch][p]+=1
def score(ch): return (20-2*hsk[ch] if ch in hsk else 0) + min(cnt[ch],400)/40
best={}
for ch,rs in readings.items():
    if not re.match(r'[一-鿿]',ch) or len(char_ids(ch))!=1: continue
    tot=sum(rs.values())
    if not tot: continue
    p,n=max(((p,n) for p,n in rs.items() if not p.endswith('5')), key=lambda x:x[1])
    if n/tot < 0.8: continue          # chữ đa âm: không dùng làm đại diện
    sc=score(ch)
    if p not in best or sc>best[p][1]: best[p]=(ch,sc)
table={p:c for p,(c,s) in best.items()}
json.dump(table,open(LAB+'/rivals.json','w'),ensure_ascii=False)
print(len(table), [ (p,table.get(p)) for p in ['xue1','xue2','xue3','xue4','ma1','ma2','ma3','ma4','shi1','shi4','ni2','ni3','hao3','hao4','sheng1','shen1','xie2','zhong1','zhong4','guo2','guo3']])
