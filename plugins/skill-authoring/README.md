# skill-authoring

A method for building and refining agent skills (SKILL.md and its folders): put the purpose first, keep each rule under the step that uses it, split files only for a named reason and route to them with a READ list, choose the instruction shape that fits the failure, and check with machines. Ships three scripts: a link and anchor checker, a sentence snapshot that shows what a refactor deleted, and a commit helper that commits only your paths on a shared index.

Skill docs are in Korean.

```
/plugin install skill-authoring --marketplace kimjisub/agent-kit
```

Installed as a plugin it runs as `/skill-authoring:skill-authoring`. Other agents can take the skill folder alone: `npx skills add kimjisub/agent-kit --skill skill-authoring`.

---

스킬(SKILL.md 와 그 폴더)을 새로 만들거나 다듬는 방법론입니다. 목적을 맨 앞에 두고, 규칙은 그것을 쓰는 스텝 밑에 두고, 파일은 이유가 있을 때만 가르고 READ 목록으로 잇고, 지시 형식은 실패 유형에 맞추고, 검사는 기계가 하게 합니다. 기존 스킬은 축별 진단표로 먼저 재고 고칩니다.

스크립트 셋이 들어 있습니다.

| 스크립트 | 하는 일 |
|---|---|
| `scripts/check-links.py` | 상대 링크와 앵커, 고아 문서, 문장형 헤딩, 경고 마커를 전수 검사합니다 |
| `scripts/snapshot-sentences.py` | 고치기 전 문장을 저장해 두고, 고친 뒤 사라진 문장만 원래 위치와 함께 보입니다. 절을 옮긴 것은 통과합니다 |
| `scripts/commit-mine.sh` | 여러 에이전트가 한 저장소의 인덱스를 함께 쓸 때 내 경로만 임시 인덱스로 커밋합니다 |

## 쓰려면

| 필요한 것 | 쓰는 곳 |
|---|---|
| Python 3 | 링크 검사, 문장 스냅샷 |
| git, bash | `commit-mine.sh` |

## 라이선스

MIT.
