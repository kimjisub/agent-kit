# korean-ai-tells

`humanize-korean` 플러그인(im-not-ai, MIT, epoko77-ai)의 분류 체계를 professionalify의 문장 층 축으로 가져온 것이다. 원본 플러그인은 3콜 파이프라인(진단, 윤문, finalize)과 정량 스크립트를 갖지만, 여기서는 규칙집만 쓴다.

- `quick-rules.md`: 정의 1줄 + 처방 1줄로 압축한 룰북. 진단과 수정에 먼저 읽는 파일이다.
- `ai-tell-taxonomy.md`: 전체 분류 체계 v2.0 (A~J 10범주, 예문과 실측 근거 포함). quick-rules에 없는 패턴이나 판단이 갈릴 때 연다.
- `rewriting-playbook.md`: 카테고리별 치환 레시피와 대원칙(의미 불변, 서법 보존, 빼기 전용, 변경률 가드).

가져온 시점은 2026-09-18, 원본 버전은 taxonomy v2.0 / playbook v2.7 처방 반영본이다. 원본이 갱신되면 이 폴더를 다시 복사한다.
