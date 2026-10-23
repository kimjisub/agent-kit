# 축 16. 기술 문서: 사례

**로드 시점: 개선 중 처방의 실제 모양이 필요할 때.** 규칙은 `improve.md`가 정본이고 여기는 사례만.

## 우리 사례

### infra/README.md (한 회사의 공용 인프라, 2026-07-25)

how-to(접속)와 reference(클러스터 구성)와 explanation(제품이 클러스터를 나눠 쓰지 않는다)이 한 파일에 있지만 절로 갈려 있다. 잘한 점은 "접속" 절이 전제(사내 VPN)를 첫 명령 앞에 두고, 실패 모습("VPN이 끊긴 상태에서도 `Connection refused`가 뜨고 `:80`은 열려 있는 것처럼 응답한다")을 적은 것이다. 2026-09-17 실측에서 정확히 그 증상이 났고 문서 덕에 원인을 VPN 정책으로 좁혔다.

부족한 점은 인증서 만료일이 본문 중간에 있고 갱신일이 머리에 없는 것. "2026-07-25 기준"이 접속 절 안에 숨어 있다.

2026-09-18 측정: 종류별 절이 how-to 1(접속), reference 1(클러스터 구성), explanation 1(핵심) 로 갈려 있고 tutorial은 없다(인프라 README라 정상). 3인칭과 미래형 0, 전제 절 있음(사내 VPN), 플레이스홀더 `{end}` 1건 설명 없음, 코드 블록 8개 중 결과 주석 있는 것 3. 처방은 갱신일을 머리로, `{end}` 첫 등장에 설명, 나머지 5개 블록에 기대 결과 한 줄.

### iot-os/plan/ (설계 문서)

explanation의 좋은 예. plan/08은 "왜 이 프레임이 필요한가"(관측된 문제) -> 프레이밍(Sparkplug B, Home Assistant 삼탭) -> 핵심 개념 -> 결정 순서다. 절차와 명령이 없다. 문서 머리에 "상태: 승인된 계획 (2026-07-06)"과 관계 문서 목록이 있다.

### CLI 도움말 초안 (방향성 문서 10.2절 `iothub`)

```
iothub query busan/tank-1/*/temp --from -24h --agg 1m:mean    # 시계열
```

reference 형식(명령, 인자, 예시)이지만 옵션 표(이름, 기본값, 설명)가 없다. 실제 `--help`로 만들 때는 옵션 표를 붙인다.

### 스킬 문서 (이 스킬)

`skill-authoring`의 골격을 따르고 축마다 README(explanation) / measure(reference + how-to) / improve(how-to) / examples(explanation)로 종류가 갈려 있다. measure.md의 grep 블록은 how-to이고 신호 표는 reference다. 한 파일에 둘이 있지만 절로 갈려 있어 허용 범위다.

## 모범 원본

- Diátaxis 사이트(diataxis.fr)의 "Start here". 네 종류를 다섯 분에.
- Django 문서. Diátaxis가 나온 곳. tutorial, how-to, reference, topics(explanation)가 상단 메뉴로 갈려 있다.
- Stripe API 문서. reference의 표준(항목 구조 일관, 예시 언어별, 응답 예시).
- Google developer documentation style guide "Highlights". 2인칭, 현재형, 능동태, 접근성.

## 반례

- README 첫 절이 아키텍처 다이어그램 + 설계 철학 세 문단. 돌려 보고 싶은 사람은 세 화면을 내려야 첫 명령을 만난다.
- 설치 가이드 3단계에서 "여기서 A 방식과 B 방식 중 선택합니다". 처음 하는 사람은 멈춘다.
- 명령 예시의 `YOUR_TOKEN`이 설명 없이. 어디서 받는지 모른다.
- "파일이 자동으로 생성될 것입니다." 3인칭 수동 미래.
