import json, re, os, shutil, sys, unicodedata, ast
sys.path.insert(0, os.path.dirname(__file__))
from pypinyin import pinyin, Style
import opencc
from hsk1_words import UNIT_WORDS
from hsk1_lessons import UNITS, NAMES
from extra import EXTRA_WORDS, RADICALS
from hsk2_words import UNIT_WORDS2
from hsk2_lessons import UNITS2
from stories import STORIES

from pathlib import Path
ROOT = Path(__file__).resolve().parent
APP = str(ROOT.parent / "app" / "public")          # nơi ghi data/ và audio/
SRC = os.environ.get("MITXUE_SRC", str(ROOT / ".sources"))  # dữ liệu gốc, tải bằng fetch_sources.sh
H = f"{SRC}/hsk30/New HSK (2025)"
s2t = opencc.OpenCC('s2t')

# ---------- pinyin helpers ----------
MARK = {'a': 'āáǎà', 'e': 'ēéěè', 'i': 'īíǐì', 'o': 'ōóǒò', 'u': 'ūúǔù', 'ü': 'ǖǘǚǜ'}
def num2mark(syl):
    syl = syl.replace('u:', 'ü').replace('v', 'ü')
    m = re.match(r'([a-zü]+)([1-5])$', syl, re.I)
    if not m: return syl
    s, t = m[1], int(m[2])
    if t == 5: return s
    low = s.lower()
    if 'a' in low: i = low.index('a')
    elif 'e' in low: i = low.index('e')
    elif 'ou' in low: i = low.index('o')
    else:
        i = max(low.rfind(c) for c in 'iouü')
    c = s[i]; mk = MARK[c.lower()][t-1]
    return s[:i] + (mk.upper() if c.isupper() else mk) + s[i+1:]
def strip_tone(p):
    return ''.join(c for c in unicodedata.normalize('NFD', p) if unicodedata.category(c) != 'Mn').replace('ü','v')
def tone_of(syl):
    for c in unicodedata.normalize('NFD', syl):
        if c == '̄': return 1
        if c == '́': return 2
        if c == '̌': return 3
        if c == '̀': return 4
    return 5

# ---------- CEDICT ----------
ced = {}
for line in open(f'{SRC}/cedict/cedict_ts.u8', encoding='utf-8'):
    if line.startswith('#'): continue
    m = re.match(r'(\S+) (\S+) \[([^\]]+)\] /(.+)/', line)
    if m: ced.setdefault(m[2], []).append((m[3], m[4]))
def ced_best(w):
    ents = ced.get(w, [])
    if not ents: return None, None
    # bỏ mục họ / tên riêng nếu có lựa chọn khác
    good = [e for e in ents if not re.match(r'^(surname|variant of|old variant|see )', e[1]) and not e[0][0].isupper()] or ents
    e = good[0]
    py = ''.join(num2mark(s) for s in e[0].split())
    gl = '; '.join([g for g in e[1].split('/') if not g.startswith('CL:')][:3])
    return py, gl

# ---------- Hán Việt ----------
import csv
hv = {}
for r in list(csv.reader(open(f'{SRC}/hv/hanviet.csv', encoding='utf-8')))[1:]:
    try: rd = ast.literal_eval(r[1])
    except Exception: rd = []
    hv.setdefault(r[0], []).append((rd, r[2]))
def hanviet(ch, syl_num=None):
    cands = []
    for t in dict.fromkeys(list(s2t.convert(ch)) + [ch]):
        cands += hv.get(t, [])
    if not cands: return ''
    if syl_num:
        for rd, p in cands:
            if p == syl_num and rd: return rd[0]
        base = re.sub(r'\d', '', syl_num)
        for rd, p in cands:
            if re.sub(r'\d', '', p) == base and rd: return rd[0]
    for rd, p in cands:
        if p == '*' and rd: return rd[0]
    for rd, p in cands:
        if rd: return rd[0]
    return ''

# ---------- makemeahanzi ----------
mm = {}
for line in open(f'{SRC}/mmah/dictionary.txt', encoding='utf-8'):
    d = json.loads(line); mm[d['character']] = d
gfx = {}
for line in open(f'{SRC}/mmah/graphics.txt', encoding='utf-8'):
    d = json.loads(line); gfx[d['character']] = {'strokes': d['strokes'], 'medians': d['medians']}

# ---------- word lists ----------
order = json.load(open(f'{H}/hsk_all_words.json', encoding='utf-8'))
freq = {}
for k, lst in order.items():
    for i, w in enumerate(lst): freq.setdefault(w, i)
def clean(w): return re.sub(r'\d|（.*?）|\(.*?\)', '', w)
audio_set = set(f[4:-4] for f in os.listdir(f'{H}/Audio'))
handw = set()
for f in os.listdir(f'{H}/HSK Handwritten'):
    if f.endswith('.txt'):
        for l in open(f'{H}/HSK Handwritten/{f}', encoding='utf-8'):
            if l.strip(): handw.add(l.strip())

words = {}   # key -> entry
def add_word(w, py, vi, en, level, unit):
    key = f"{level}:{w}"
    c = clean(w)
    syls = [s for s in re.split(r"[\s']", py) if s]
    words[key] = {"w": w, "c": c, "py": py, "vi": vi, "en": en, "lv": level, "u": unit,
                  "a": c in audio_set}

# HSK1 từ bài đã soạn
for u, txt in UNIT_WORDS.items():
    for l in txt.strip().split('\n'):
        w, py, vi = l.split('|')
        _, en = ced_best(clean(w))
        add_word(w, py, vi, en or '', 1, u)

for u, txt in UNIT_WORDS2.items():
    for l in txt.strip().split('\n'):
        w, py, vi = l.split('|')
        _, en = ced_best(clean(w))
        add_word(w, py, vi, en or '', 2, u)
# HSK 3-5 theo tần suất, chia bài 20 từ
LEVEL_UNITS = {1: 15, 2: len(UNIT_WORDS2)}
for L in range(3, 6):
    ws = [l.strip() for l in open(f'{H}/HSK Words/HSK_Level_{L}_words.txt', encoding='utf-8') if l.strip()]
    ws.sort(key=lambda w: freq.get(clean(w), 99999))
    per = 20
    for i, w in enumerate(ws):
        c = clean(w)
        py, en = ced_best(c)
        if not py:
            py = ''.join(x[0] for x in pinyin(c, style=Style.TONE))
        add_word(w, py, '', en or '', L, i // per + 1)
    LEVEL_UNITS[L] = (len(ws) + per - 1) // per

# ---------- sentences: segmentation + pinyin ----------
seg_vocab = {}
for k, e in sorted(words.items(), key=lambda x: x[1]['lv']):
    if e['lv'] <= 2: seg_vocab.setdefault(e['c'], e['py'])
for n, p in NAMES.items(): seg_vocab[n] = p
for w, (p, _) in EXTRA_WORDS.items(): seg_vocab[w] = p
seg_vocab.update({'星期一':'xīngqīyī','星期二':'xīngqī\'èr','星期三':'xīngqīsān','星期四':'xīngqīsì','星期五':'xīngqīwǔ','星期六':'xīngqīliù','第一':'dì-yī','第二':'dì-èr','第三':'dì-sān','一点儿': 'yìdiǎnr', '有点儿': 'yǒudiǎnr', '有一点儿': 'yǒu yìdiǎnr', '没有': 'méiyǒu', '同学们': 'tóngxuémen', '没': 'méi', '周六': 'zhōuliù', '周末': 'zhōumò', '周一': 'zhōuyī', '第二十': 'dì-èrshí', '看看': 'kànkan', '问问': 'wènwen', '试试': 'shìshi', '慢慢': 'mànmàn', '有时': 'yǒushí', '有时候': 'yǒushíhou', '外国人': 'wàiguórén', '地铁站': 'dìtiězhàn'})
PUNCT = '，。？！、：；“”"…（）'
def segment(s):
    out = []; i = 0
    while i < len(s):
        ch = s[i]
        if re.match(r'[A-Za-z0-9]', ch):
            j = i
            while j < len(s) and re.match(r'[A-Za-z0-9]', s[j]): j += 1
            out.append(s[i:j]); i = j; continue
        if ch in PUNCT or not re.match(r'[一-鿿]', ch):
            out.append(ch); i += 1; continue
        for L in range(6, 0, -1):
            p = s[i:i+L]
            if p in seg_vocab or L == 1:
                out.append(p); i += L; break
    return out
def word_py(tok):
    if tok in seg_vocab: return seg_vocab[tok]
    return ''.join(x[0] for x in pinyin(tok, style=Style.TONE))
def sent_py(toks):
    res = []
    for i, t in enumerate(toks):
        if t in PUNCT or not re.match(r'[一-鿿]', t):
            res.append(t); continue
        p = word_py(t)
        nxt = next((x for x in toks[i+1:] if re.match(r'[一-鿿]', x)), None)
        prev = toks[i-1] if i > 0 else ''
        if t == '一' and nxt in ('百', '千') and not re.match(r'[一二三四五六七八九十]', prev):
            res.append('yì'); continue
        if t in ('一',) and nxt and not re.match(r'[一二三四五六七八九十第百千零]', prev) and prev not in ('第',) and nxt not in ('一','二','三','四','五','六','七','八','九','十','百','千','零'):
            tn = tone_of(word_py(nxt).split()[0][:3] if word_py(nxt) else '')
            first = pinyin(nxt[0], style=Style.TONE)[0][0] if nxt not in seg_vocab else seg_vocab[nxt]
            tn = tone_of(re.split(r'[^a-zA-Zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]', first)[0])
            p = 'yí' if tn == 4 else 'yì'
        if t == '过' and prev in ('去','来','吃','喝','考','买','看','听','学','做','住','用','见','说','到','玩','坐','写','读','试','找','问','踢','打','游','跑'): p = 'guo'
        if t == '只' and re.match(r'[一二两三四五六七八九十几这那哪]', prev or ''): p = 'zhī'
        if t == '不' and nxt:
            first = seg_vocab.get(nxt) or pinyin(nxt[0], style=Style.TONE)[0][0]
            if tone_of(first[:4]) == 4: p = 'bú'
        res.append(p)
    # ghép
    s = ''
    for i, (t, p) in enumerate(zip(toks, res)):
        if t in PUNCT:
            s += {'，': ', ', '。': '. ', '？': '? ', '！': '! ', '、': ', ', '：': ': ', '“': ' “', '”': '” ', '…': '… '}.get(t, t)
        else:
            if s and not s.endswith(' ') and not s.endswith('“'): s += ' '
            s += p
    s = re.sub(r' +', ' ', s).replace(': “', ': “').replace(' ”', '”').strip()
    s = re.sub(r'“([a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ])', lambda m: '“' + m[1].upper(), s)
    s = re.sub(r'([.?!] )([a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ])', lambda m: m[1] + m[2].upper(), s)
    s = re.sub(r'(^|[ "])((?:(?:yī|yì|yí|èr|liǎng|sān|sì|wǔ|liù|qī|bā|jiǔ|shí|bǎi|qiān|líng)(?![a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ\']) ?){2,})', lambda m: m[1] + numjoin(m[2]) + (' ' if m[2].endswith(' ') else ''), s)
    return s[:1].upper() + s[1:]

def numjoin(g):
    parts = g.split()
    if 'líng' in parts and not any(x in ('shí','bǎi','qiān') for x in parts): return ' '.join(parts)
    out = ''
    for x in parts:
        if x == 'líng': out += ' líng '; continue
        if out and not out.endswith(' ') and x[0] in 'aeoāáǎàēéěèōóǒò': out += "'"
        out += x
    return re.sub(' +', ' ', out).strip()
def proc_sent(zh_marked, vi):
    keys = re.findall(r'\[(.+?)\]', zh_marked)
    zh = zh_marked.replace('[', '').replace(']', '')
    toks = segment(zh)
    return {"zh": zh, "vi": vi, "py": sent_py(toks), "t": toks, "k": keys}

lessons = []
for lv_, u, U in [(1, i + 1, x) for i, x in enumerate(UNITS)] + [(2, i + 1, x) for i, x in enumerate(UNITS2)]:
    L = {"lv": lv_, "u": u, "title": U["title"], "topic": U["topic"], "goals": U["goals"], "tip": U["tip"],
         "dialogue": [dict(proc_sent(z, v), sp=sp) for sp, z, v in U["dialogue"]],
         "grammar": [{"title": g["title"], "formula": g["formula"], "explain": g["explain"], "note": g["note"],
                      "ex": [proc_sent(z, v) for z, v in g["examples"]]} for g in U["grammar"]]}
    lessons.append(L)

stories = []
for i, st in enumerate(STORIES):
    stories.append({"id": i, "lv": st["lv"], "after": st["after"], "title": st["title"],
                    "lines": [proc_sent(z, v) for z, v in st["lines"]],
                    "qs": [{"q": q, "o": o, "a": a} for q, o, a in st["qs"]]})

# ---------- kiểm tra từ ngoài phạm vi ----------
lv_of = {}
for k, e in words.items(): lv_of[e['c']] = min(lv_of.get(e['c'], 9), e['lv'])
OK_EXTRA = set(NAMES) | set(EXTRA_WORDS) | {'周六','周末','周一','第二十','看看','问问','试试','慢慢','有时','有时候','外国人','地铁站','没','一点儿','有点儿','没有'}
def out_of_scope(sents, maxlv):
    bad = set()
    for s_ in sents:
        for t in s_['t']:
            if re.match(r'[一-鿿]', t) and t not in OK_EXTRA and lv_of.get(t, 9) > maxlv: bad.add(t)
    return bad
for L in lessons:
    b = out_of_scope(L['dialogue'] + [x for g in L['grammar'] for x in g['ex']], L['lv'])
    if b: print('OOS lesson', L['lv'], L['u'], ''.join(sorted(b)))
for st in stories:
    b = out_of_scope(st['lines'], st['lv'])
    if b: print('OOS story', st['title'], ''.join(sorted(b)))

# ---------- characters ----------
chars = {}
def add_char(ch, syl=None, level=None):
    if not re.match(r'[一-鿿]', ch): return
    if ch in chars:
        if level and (chars[ch]['lv'] is None or level < chars[ch]['lv']): chars[ch]['lv'] = level
        return
    d = mm.get(ch, {})
    rad = d.get('radical', '')
    num = None
    if syl:
        base = strip_tone(syl).lower(); num = base + str(tone_of(syl))
    if not num:
        p = pinyin(ch, style=Style.TONE3, neutral_tone_with_five=True)[0][0]; num = p.replace('ü','u:')
    ety = d.get('etymology') or {}
    chars[ch] = {"hv": hanviet(ch, num.replace('v','u:') if num else None), "rad": rad, "radvi": RADICALS.get(rad, ''),
                 "dec": d.get('decomposition', ''), "en": d.get('definition', ''), "ety": ety.get('hint', ''),
                 "lv": level, "hw": ch in handw, "st": len(gfx.get(ch, {}).get('strokes', []))}
def syllables(py):
    return re.findall(r"[A-Za-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüÜ]+?(?:ng|n|r)?(?=[^aeiouüāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]|$)", py)

for k, e in words.items():
    py = e['py'].replace(' ', '').replace("'", '')
    from pypinyin.contrib.tone_convert import to_tone3
    syl_list = [x[0] for x in pinyin(e['c'], style=Style.TONE3, neutral_tone_with_five=True)]
    for idx, ch in enumerate(e['c']):
        add_char(ch, None, e['lv'])
# Hán Việt theo đúng âm đọc của từ (HSK1 dùng pinyin tự soạn)
for k, e in words.items():
    e['hv'] = ' '.join(chars[c]['hv'] for c in e['c'] if c in chars and chars[c]['hv'])
for L in lessons:
    for s in [d for d in L['dialogue']] + [x for g in L['grammar'] for x in g['ex']]:
        for ch in s['zh']: add_char(ch)

# ---------- extra words (cho tra từ trong bài) ----------
extra = {w: {"py": p, "vi": v} for w, (p, v) in EXTRA_WORDS.items()}
for n, p in NAMES.items(): extra[n] = {"py": p, "vi": "(tên riêng)"}
extra["越南"]["vi"] = "Việt Nam"; extra["北京"]["vi"] = "Bắc Kinh"; extra["胡志明市"]["vi"] = "TP. Hồ Chí Minh"

# ---------- strokes ----------
strokes = {ch: gfx[ch] for ch in chars if ch in gfx}

# ---------- audio ----------
import hashlib
shutil.rmtree(f'{APP}/audio/w', ignore_errors=True)
os.makedirs(f'{APP}/audio/w', exist_ok=True)
amap = {}
for k, e in words.items():
    if e['a'] and e['c'] not in amap:
        src = f"{H}/Audio/cmn-{e['c']}.mp3"
        fn = "w" + hashlib.md5(e['c'].encode('utf8')).hexdigest()[:10] + ".mp3"
        shutil.copyfile(src, f"{APP}/audio/w/{fn}")
        amap[e['c']] = fn

# ---------- level meta / roadmap ----------
gram_titles = {}
for L in range(1, 6):
    t = open(f'{H}/HSK Grammar/HSK {L}.txt', encoding='utf-8').read()
    gram_titles[L] = len(re.findall(r'^\s+- ', t, re.M))
hanzi_counts = {L: sum(1 for l in open(f'{H}/HSK Hanzi/HSK_Level_{L}_hanzi.txt', encoding='utf-8') if l.strip()) for L in range(1, 6)}

data = {"words": list(words.values()), "lessons": lessons, "chars": chars, "extra": extra, "audio": amap, "stories": stories,
        "levelUnits": LEVEL_UNITS, "gramCount": gram_titles, "hanziCount": hanzi_counts}
os.makedirs(f'{APP}/data', exist_ok=True)
with open(f'{APP}/data/data.js', 'w', encoding='utf-8') as f:
    f.write('window.DATA=' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';')
with open(f'{APP}/data/strokes.js', 'w', encoding='utf-8') as f:
    f.write('window.STROKES=' + json.dumps(strokes, ensure_ascii=False, separators=(',', ':')) + ';')
print('words', len(words), 'chars', len(chars), 'strokes', len(strokes), 'audio', len(amap), 'units', LEVEL_UNITS)
print('hanzi', hanzi_counts, 'grammar items', gram_titles)
print('no hv', [c for c, v in chars.items() if not v['hv']][:40])
