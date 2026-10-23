# 한다체 문장 끝(~다)을 합니다체(~습니다, ~입니다)로 바꾼다. 코드, pre, script, style, 태그 속성은 건드리지 않는다.
# 쓰는 법: python3 to-hapnida.py <파일...>            # 바꿀 쌍과 개수만 본다
#          python3 to-hapnida.py --write <파일...>    # 실제로 바꾼다
# 문장 끝 = 마침표 앞, 닫는 괄호 앞, 텍스트 칸의 마지막. "~마다", "~보다" 와 명사구 종결은 바꾸지 않는다.
# 받침 없는 어절의 ~다 는 "서버다 -> 서버입니다" 로 보고, 하/되/크/르/니/이/쁘/프/싸 로 끝나면 용언으로 본다.
# 바꾼 뒤에는 쌍 목록을 전부 눈으로 보고, 괄호 안 보충 설명에 남은 ~다 를 따로 찾는다.
import re, sys, collections
BASE=0xAC00
def dec(c):
    o=ord(c)-BASE
    if not (0<=o<11172): return None
    return o//588, (o%588)//28, o%28
def comp(l,v,t): return chr(BASE+l*588+v*28+t)
T_N,T_L,T_B,T_SS=4,8,17,20
VERBISH=set('하되크르니이쁘프싸')

def conv(w):
    """w 는 '다' 로 끝나는 어절. 바꾼 형태나 None."""
    if len(w)<2 or not w.endswith('다'): return None
    if w.endswith(('니다','마다','보다')): return None
    x=w[-2]; d=dec(x)
    if d is None: return None
    l,v,t=d
    stem=w[:-2]
    # ~는다
    if x=='는' and len(w)>=3 and dec(w[-3]) and dec(w[-3])[2]!=0:
        return w[:-2]+'습니다'
    if t==T_N:            # 간다, 한다, 돈다, 만든다
        return stem+comp(l,v,T_B)+'니다'
    if t==T_L:            # 길다, 만들다
        return stem+comp(l,v,T_B)+'니다'
    if t!=0:              # 있다, 했다, 같다, 않다
        return w[:-1]+'습니다'
    if x in VERBISH:      # 이다, 하다, 크다, 다르다, 아니다
        return stem+comp(l,v,T_B)+'니다'
    return w[:-1]+'입니다'  # 서버다 -> 서버입니다

END=re.compile(r'([가-힣A-Za-z0-9_)\]]*[가-힣]다)(?=\.(?:\s|$)|\)?\s*$|\)\s)')
SKIP=re.compile(r'(<script\b.*?</script>|<style\b.*?</style>|<code\b.*?</code>|<pre\b.*?</pre>|<[^>]+>)',re.S)

def process(text, log):
    def fix(m):
        w=m.group(1)
        # 어절 첫 글자부터 한글만 남은 부분으로 판정
        k=re.search(r'[가-힣]+다$',w)
        if not k: return w
        core=k.group(0); r=conv(core)
        if not r: return w
        log[core+' -> '+r]+=1
        return w[:k.start()]+r
    return END.sub(fix,text)

def run(path, write):
    s=open(path).read(); log=collections.Counter()
    parts=SKIP.split(s)
    for i in range(0,len(parts),2):
        parts[i]=process(parts[i],log)
    out=''.join(parts)
    if write: open(path,'w').write(out)
    return log

if __name__=='__main__':
    write='--write' in sys.argv
    for p in [a for a in sys.argv[1:] if not a.startswith('--')]:
        log=run(p,write)
        print('##',p,sum(log.values()))
        for k,n in log.most_common(): print(n,k)
