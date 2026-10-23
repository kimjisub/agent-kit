# 절이 다른 문단, 목록 항목, 표 행 가운데 같은 내용을 4글자 조각 겹침으로 찾는다.
# 쓰는 법: python3 section-overlap.py <문서.html> [<문서2.html> ...]
# 출력: 겹침 비율 | 절 A <-> 절 B 와 두 원문. 0.55 이상이고 조각 25개 이상 겹친 쌍만 낸다.
# 색인 표(자주 여는 주소), 용어 안내, 런북 절차와 본문의 겹침은 의도한 것일 수 있어 한 쌍씩 읽고 판정한다.
import re, html, itertools, sys
def units(fn, tag):
    s=open(fn).read()
    s=re.sub(r'<script.*?</script>|<style.*?</style>|<nav.*?</nav>','',s,flags=re.S)
    out=[]; sec=''
    for m in re.finditer(r'<h([23])[^>]*>(.*?)</h\1>|<(p|li|tr|figcaption)[^>]*>(.*?)</\3>',s,flags=re.S):
        if m.group(1):
            sec=tag+' '+re.sub(r'<[^>]+>','',m.group(2)).strip(); continue
        t=html.unescape(re.sub(r'<[^>]+>',' ',m.group(4))); t=re.sub(r'\s+',' ',t).strip()
        if len(t)>=40: out.append((sec,t))
    return out
U=[]
for k,fn in enumerate(sys.argv[1:]):
    U+=units(fn, chr(65+k))
def sh(t,n=4):
    t=re.sub(r'[^\w가-힣]','',t); return {t[i:i+n] for i in range(len(t)-n+1)}
S=[sh(t) for _,t in U]
pairs=[]
for i,j in itertools.combinations(range(len(U)),2):
    if U[i][0]==U[j][0]: continue
    a,b=S[i],S[j]
    if not a or not b: continue
    inter=len(a&b); c=inter/min(len(a),len(b))
    if c>=0.55 and inter>=25: pairs.append((c,i,j))
pairs.sort(reverse=True)
for c,i,j in pairs:
    print(f'{c:.2f} | {U[i][0]} <-> {U[j][0]}')
    print('   A:',U[i][1][:150]); print('   B:',U[j][1][:150])
print(len(pairs),'pairs')
