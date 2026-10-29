# 위원 CLI 설치, 로그인, 함정

`council.py members` 가 `fix:` 로 낸 일을 실제로 할 때 읽는다. 설치와 로그인은 사용자가 계정으로 승인해야 하는 일이라, 에이전트는 명령과 URL 을 건네고 사용자가 브라우저에서 끝낸다. 끝나면 `council.py members --only <위원>` 으로 그 위원만 다시 잰다.

## 설치

```bash
npm i -g @openai/codex@latest                                  # codex
curl -fsSL https://antigravity.google/cli/install.sh | bash   # agy
curl -fsSL https://x.ai/cli/install.sh | bash                 # grok
curl -fsS https://cursor.com/install | bash                   # cursor-agent
npm i -g @google/gemini-cli                                   # gemini (아래 계정 조건을 먼저 본다)
```

`curl | bash` 는 받은 스크립트를 먼저 파일로 내려 읽고 돌리는 편이 낫다. 아래 `~/.local/bin/agent` 함정이 그 스크립트 안에 있다.

## 로그인

| 위원 | 화면 있는 기기 | 화면 없는 기기(서버, 원격 셸) |
|---|---|---|
| codex | `codex login` | `codex login --device-auth`. 코드 입력 URL 과 일회 코드가 나온다. ChatGPT 보안 설정에서 기기 코드 로그인이 꺼져 있으면 켜야 한다 |
| grok | `grok login` | `grok login --device-auth`. `accounts.x.ai/oauth2/device` 링크와 코드가 나온다 |
| cursor | `cursor-agent login` | `NO_OPEN_BROWSER=1 cursor-agent login`. 링크를 열어 승인하면 프로세스가 스스로 끝난다 |
| agy | `agy` 를 대화형으로 실행 | 같다. 로그인 방법 화면에서 Google OAuth 를 고르면 URL 이 나오고, 브라우저에서 받은 코드를 터미널에 붙여 넣는다 |
| gemini | `gemini` 를 대화형으로 실행 | `NO_BROWSER=true gemini`. URL 이 나오고 받은 코드를 붙여 넣는다 |

- 로그인 확인은 상태 명령(`codex login status` 등)이 아니라 `council.py members` 로 한다. 토큰이 만료돼도 상태 명령은 로그인됐다고 답한다.
- 화면 없는 기기에서 agy 의 URL 은 터미널 폭에서 줄이 꺾여 나온다. 줄바꿈과 앞 공백을 지워 한 줄로 이은 뒤 건넨다.
- gemini 는 코드 입력을 5분 정도만 기다리고 끝난다. 끝났으면 새로 띄워 새 URL 을 받는다. 옛 코드는 쓸 수 없다.
- 여러 기기가 같은 구독을 쓰면 기기마다 따로 로그인한다. 인증 파일(`auth.json` 등)을 복사하면 세션이 엉켜 한쪽이 로그아웃된다.

### agy 첫 실행 온보딩

로그인 뒤 색상 설정, 약관과 데이터 사용 화면이 이어진다. 약관 화면의 "대화 데이터 수집 동의" 항목이 기본으로 켜져 있을 수 있다. 회사 질문이 나갈 기기면 끄고 넘어간다. 폴더 신뢰 화면이 나오면 온보딩이 끝난 것이고, 그때 종료해도 된다.

## 위원별 함정

| 위원 | 증상 | 원인과 처리 |
|---|---|---|
| gemini | `auth_required` 가 계속 나온다 | 2026-06-18 부터 개인 등급 계정(무료, Google AI Pro, Ultra)으로는 Gemini CLI 요청을 받지 않는다(Google 의 Gemini Code Assist 개인 계정 지원 종료 공지). 조직의 Code Assist Standard 나 Enterprise 가 없으면 gemini 대신 agy 를 Gemini 자리로 쓴다 |
| agy | `empty`, 또는 `"command" permission` 이 담긴 빈 답 | plan 모드에서 모델이 명령 실행 도구를 쓰려다 거부되면 답 없이 끝난다. 스크립트가 한 번 다시 묻는다. 반복되면 agy 설정의 `permissions.allow` 에 읽기 전용 명령만 넣는다. 권한 생략 플래그는 읽기 전용 원칙을 깨므로 쓰지 않는다 |
| agy | 답이 Claude 처럼 읽힌다 | agy 는 Claude 모델도 고를 수 있다. 스크립트가 `agy models` 에서 Gemini 계열을 골라 `--model` 로 넘긴다 |
| grok | `outdated`, 메시지에 426 Upgrade Required | 서버가 옛 CLI 를 거부한다. `grok update` |
| cursor | `plan_limited`, `Model unavailable on Free` | 무료 플랜은 모델 지정이 막혀 `auto` 만 되고, `auto` 는 다른 회사 모델(Grok 등)로 돌아 다른 위원과 겹친다. Composer 를 쓰려면 유료 플랜이 필요하다. 유료가 아니면 cursor 는 빠지는 것이 맞다 |
| cursor | 출력 없이 "Pass --trust, --yolo, or -f" | 새 버전은 처음 보는 폴더에서 신뢰 확인을 묻는다. 스크립트는 `--trust` 를 넘긴다. 수동으로 시험할 때도 붙인다 |
| cursor | `cursor-agent update` 가 아무 말 없이 끝나고 버전이 그대로다 | 오래된 버전의 자체 업데이트가 동작하지 않는다. 설치 스크립트로 다시 깐다 |
| cursor, grok | `agent` 명령이 다른 CLI 를 띄운다 | 두 설치 스크립트가 모두 `~/.local/bin/agent` 링크를 자기 것으로 바꾼다. 나중에 깐 것이 이긴다. council 은 `grok`, `cursor-agent` 로 부르므로 영향이 없고, 사용자가 `agent` 를 다른 쪽으로 쓰고 있었으면 링크를 되돌린다 |
| codex | `auth_expired`, 401 과 재연결 반복 | 토큰 만료다. `codex login` |

## 위원 구성 판단

목표는 의장을 포함해 서로 다른 모델 계열이 셋 이상인 것이다. 의장이 Claude 면 codex(GPT), agy(Gemini), grok(Grok), cursor(Composer)가 각자 다른 자리를 채운다.

- 요금제는 자주 바뀐다. 사용자가 어느 플랜이 필요하냐고 물으면 각 회사의 공식 요금 문서를 확인하고 답한다. 결제는 사용자가 한다.
- 플랜을 확인할 때는 문서보다 실제 호출이 빠르다. 플랜 밖 모델을 지정하면 cursor 는 오류 메시지에 플랜 이름과 포함 모델을 적어 준다.
- 위원이 둘 이하로 줄면 그대로 돌리되 보고에 위원 수를 적는다(SKILL.md 핵심 원칙 5).
