"""B1 thí nghiệm: mô hình ASR nhỏ có nhận ra sai thanh điệu / sai âm không?"""
import os, sys
LAB=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.abspath(os.path.join(LAB,'..','..'))+'/'; MODELS=ROOT+'content/.sources/models/'

import sherpa_onnx as so, numpy as np, subprocess, time, json, sys
M=MODELS+''
S=ROOT+'app/public/audio/s/'
def load(p):
    r=subprocess.run(['ffmpeg','-v','error','-i',p,'-ac','1','-ar','16000','-f','f32le','-'],capture_output=True)
    return np.frombuffer(r.stdout,dtype=np.float32)
def concat(syls, gap=0.06):
    z=np.zeros(int(16000*gap),dtype=np.float32); out=[np.zeros(8000,np.float32)]
    for s in syls: out+= [load(S+s+'.mp3'), z]
    out.append(np.zeros(8000,np.float32)); return np.concatenate(out)
