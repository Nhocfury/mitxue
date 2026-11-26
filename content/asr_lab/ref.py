"""Bản tham chiếu Python cho bộ chấm phát âm: fbank → ONNX CTC → log_probs. Dùng để đối chiếu bản JS."""
import os, sys
LAB=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.abspath(os.path.join(LAB,'..','..'))+'/'; MODELS=ROOT+'content/.sources/models/'

import sys, subprocess, numpy as np, onnxruntime as ort, kaldi_native_fbank as knf, sentencepiece as spm
sys.path.insert(0,os.path.join(LAB,'vendor')); from byte_utils import byte_encode, smart_byte_decode
D=MODELS+'sherpa-onnx-zipformer-ctc-small-zh-int8-2025-07-16/'
so=ort.SessionOptions(); so.log_severity_level=3
sess=ort.InferenceSession(D+'model.int8.onnx', so)
sp=spm.SentencePieceProcessor(); sp.load(D+'bbpe.model')
id2tok=[l.split()[0] for l in open(D+'tokens.txt',encoding='utf8')]
def load(p):
    r=subprocess.run(['ffmpeg','-v','error','-i',p,'-ac','1','-ar','16000','-f','f32le','-'],capture_output=True)
    return np.frombuffer(r.stdout,dtype=np.float32)
def fbank(a):
    o=knf.FbankOptions(); o.frame_opts.dither=0; o.frame_opts.snip_edges=False; o.frame_opts.samp_freq=16000
    o.mel_opts.num_bins=80; o.mel_opts.high_freq=-400; o.mel_opts.low_freq=20
    f=knf.OnlineFbank(o); f.accept_waveform(16000, a.tolist()); f.input_finished()
    return np.array([f.get_frame(i) for i in range(f.num_frames_ready)],dtype=np.float32)
def logprobs(a):
    a=np.concatenate([np.zeros(4800,np.float32),a,np.zeros(4800,np.float32)])   # đệm 0,3 s im lặng hai đầu
    x=fbank(a)[None]; lp,ln=sess.run(None,{'x':x,'x_lens':np.array([x.shape[1]],dtype=np.int64)})
    return lp[0,:ln[0]]
def char_ids(ch): return sp.encode(byte_encode(ch))
def greedy(lp):
    ids=lp.argmax(-1); out=[]; prev=-1
    for i in ids:
        if i!=prev and i!=0: out.append(int(i))
        prev=i
    return smart_byte_decode(''.join(id2tok[i] for i in out).replace('▁',' ')).replace(' ','')
if __name__=='__main__':
    a=load(D+'test_wavs/0.wav'); lp=logprobs(a); print(lp.shape, greedy(lp))
    for ch in '我是学生你好妈马': print(ch, char_ids(ch), [id2tok[i] for i in char_ids(ch)])
