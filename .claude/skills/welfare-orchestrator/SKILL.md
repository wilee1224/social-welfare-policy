---
name: welfare-orchestrator
description: "사회복지 정책 모니터링 하네스 전체를 조율하는 오케스트레이터. '오늘 정책 수집해줘', '복지정책 업데이트', '정책 변경사항 확인', '사이트 업데이트', '다시 수집', '재실행', '정책 추가', '부분 업데이트', '이번 주 정책', '어제 변경사항', '팩트체크 다시 해줘' 등 사회복지 정책 관련 작업 요청 시 반드시 이 스킬을 사용."
---

# 사회복지 정책 모니터링 오케스트레이터

국내 사회복지 정책 변경사항을 수집·분석·검증·발행하는 전체 파이프라인을 조율한다.

## 실행 모드: 하이브리드

| Phase | 모드 | 이유 |
|-------|------|------|
| Phase 2 (데이터 수집) | 서브 에이전트 | 사이트별 병렬 수집, 팀 통신 불필요 |
| Phase 3 (분석·영향·해외사례) | 에이전트 팀 | 세 에이전트가 서로의 발견을 공유하며 품질 향상 |
| Phase 4 (팩트체크) | 서브 에이전트 | 독립적 검증, 다른 에이전트의 영향을 받으면 안 됨 |
| Phase 5 (발행) | 서브 에이전트 | 단독 파일 쓰기 작업 |

## 에이전트 구성

| 에이전트 | 파일 | 역할 | 스킬 | 출력 |
|---------|------|------|------|------|
| policy-crawler | agents/policy-crawler.md | 정부 사이트 크롤링 | welfare-data-collector | `01_crawler_raw.json` |
| policy-analyzer | agents/policy-analyzer.md | 정책 변경사항 구조화 | welfare-policy-analyzer | `02_analyzer_structured.json` |
| impact-analyzer | agents/impact-analyzer.md | 생활 영향 분석 | - | `03_impact_analysis.json` |
| international-comparator | agents/international-comparator.md | 해외 사례 검색 | - | `03_international_cases.json` |
| fact-checker | agents/fact-checker.md | 전체 팩트체크 | welfare-fact-checker | `05_factcheck_report.json` |
| content-publisher | agents/content-publisher.md | 웹사이트 발행 | welfare-web-publisher | `data/policies.json` |

## 워크플로우

### Phase 0: 컨텍스트 확인

1. `_workspace/` 디렉토리 존재 여부 확인
2. 실행 모드 결정:
   - `_workspace/` 미존재 → **초기 실행**, Phase 1로 진행
   - `_workspace/` 존재 + "팩트체크 다시 해줘" → **부분 재실행**: Phase 4부터 실행
   - `_workspace/` 존재 + "해외 사례 다시 찾아줘" → **부분 재실행**: international-comparator만 재호출 후 Phase 4
   - `_workspace/` 존재 + 새 날짜 또는 "다시 수집" → **새 실행**: 기존 `_workspace/`를 `_workspace_YYYYMMDD_HHMMSS/`로 이동 후 Phase 1

### Phase 1: 준비

1. 오늘 날짜 및 수집 대상 날짜 범위 결정
   - 기본: 오늘 날짜 (YYYY-MM-DD)
   - 사용자가 범위 지정 시 해당 범위 사용
2. `_workspace/` 생성 (새 실행 시 기존 백업 후 재생성)
3. `data/policies.json` 읽기 → 기존 ID 목록 추출 (중복 방지용)

### Phase 2: 병렬 데이터 수집
**실행 모드: 서브 에이전트**

단일 메시지에서 policy-crawler를 호출 (여러 사이트를 병렬로 수집):

```
Agent(
  subagent_type: "policy-crawler",
  model: "opus",
  run_in_background: true,
  prompt: "
    [수집 지시]
    - 수집 대상 날짜: {DATE_RANGE}
    - 기존 정책 ID (중복 방지): {EXISTING_IDS}
    - welfare-data-collector 스킬 참조: .claude/skills/welfare-data-collector/SKILL.md
    - 출력: _workspace/01_crawler_raw.json
    
    보건복지부, 고용노동부, 국민건강보험공단, 복지로 등
    주요 정부 사이트에서 해당 날짜 범위의 정책 변경 보도자료를 수집하라.
  "
)
```

수집 완료 대기 → `_workspace/01_crawler_raw.json` 확인

### Phase 3: 분석·영향·해외사례 (에이전트 팀)
**실행 모드: 에이전트 팀**

#### 팀 구성

```
TeamCreate(
  team_name: "welfare-analysis-team",
  members: [
    {
      name: "policy-analyzer",
      agent_type: "policy-analyzer",
      model: "opus",
      prompt: "
        당신은 policy-analyzer입니다.
        에이전트 정의를 읽으세요: .claude/agents/policy-analyzer.md
        
        작업:
        1. _workspace/01_crawler_raw.json 읽기
        2. 각 항목의 정책 변경사항 구조화
        3. _workspace/02_analyzer_structured.json 저장
        4. 완료 후 impact-analyzer와 international-comparator에게
           SendMessage로 '분석 완료, 작업 시작 가능' 알림
      "
    },
    {
      name: "impact-analyzer",
      agent_type: "impact-analyzer",
      model: "opus",
      prompt: "
        당신은 impact-analyzer입니다.
        에이전트 정의를 읽으세요: .claude/agents/impact-analyzer.md
        
        작업:
        1. policy-analyzer의 완료 알림 대기
        2. _workspace/02_analyzer_structured.json 읽기
        3. 각 정책의 생활 영향 분석 및 신청 방법 정리
        4. _workspace/03_impact_analysis.json 저장
        5. 완료 후 리더에게 알림
      "
    },
    {
      name: "international-comparator",
      agent_type: "international-comparator",
      model: "opus",
      prompt: "
        당신은 international-comparator입니다.
        에이전트 정의를 읽으세요: .claude/agents/international-comparator.md
        
        작업:
        1. policy-analyzer의 완료 알림 대기
        2. _workspace/02_analyzer_structured.json 읽기
        3. 각 정책의 해외 유사 사례 WebSearch로 검색
        4. _workspace/03_international_cases.json 저장
        5. 완료 후 리더에게 알림
      "
    }
  ]
)
```

#### 작업 등록

```
TaskCreate(tasks: [
  { title: "원문 분석 및 구조화", assignee: "policy-analyzer", description: "crawler 원문 → 구조화 JSON" },
  { title: "생활 영향 분석", assignee: "impact-analyzer", description: "신청 방법, 대상자, 영향 설명", depends_on: ["원문 분석 및 구조화"] },
  { title: "해외 사례 검색", assignee: "international-comparator", description: "유사 해외 정책 WebSearch", depends_on: ["원문 분석 및 구조화"] }
])
```

#### 팀 모니터링

- 모든 팀원 완료 대기 (TaskGet으로 상태 확인)
- 팀원 완료 후 3개 파일 병합: `_workspace/04_merged_draft.json`

#### 병합 로직

impact-analyzer + international-comparator 결과를 policy-analyzer 구조에 병합:
```json
{
  "merged_at": "YYYY-MM-DD HH:MM",
  "items": [
    {
      // policy-analyzer 구조 기반
      // + howToApply, lifeImpact (impact-analyzer에서)
      // + internationalCases (international-comparator에서)
    }
  ]
}
```

#### 팀 정리

```
TeamDelete("welfare-analysis-team")
```

### Phase 4: 팩트체크 (서브 에이전트, 독립)
**실행 모드: 서브 에이전트**

```
Agent(
  subagent_type: "fact-checker",
  model: "opus",
  prompt: "
    당신은 fact-checker입니다.
    에이전트 정의를 읽으세요: .claude/agents/fact-checker.md
    스킬을 읽으세요: .claude/skills/welfare-fact-checker/SKILL.md
    
    작업:
    - 입력: _workspace/04_merged_draft.json
    - 출력: _workspace/05_factcheck_report.json
    - 모든 수치, 날짜, 정책명, 해외 사례를 WebSearch로 독립 검증
    - hallucination 탐지 체크리스트 전항목 확인
  "
)
```

팩트체크 완료 대기 → 결과 확인

### Phase 5: 발행 (서브 에이전트)
**실행 모드: 서브 에이전트**

```
Agent(
  subagent_type: "content-publisher",
  model: "opus",
  prompt: "
    당신은 content-publisher입니다.
    에이전트 정의를 읽으세요: .claude/agents/content-publisher.md
    스킬을 읽으세요: .claude/skills/welfare-web-publisher/SKILL.md
    
    작업:
    - 입력: _workspace/04_merged_draft.json + _workspace/05_factcheck_report.json
    - data/policies.json 백업 후 업데이트
    - unverified 항목은 발행 제외
    - 발행 완료 후 요약 보고
  "
)
```

### Phase 6: 마무리

1. 발행 결과 요약 수집
2. `_workspace/` 디렉토리 보존
3. 사용자에게 최종 보고:
   - 새로 발행된 정책 수
   - 팩트체크 통과/보류 현황
   - 웹사이트 업데이트 완료 여부

## 데이터 흐름

```
[크롤러] ──────────────────────────────────────────────→ 01_crawler_raw.json
                                                              ↓
[policy-analyzer] ←─────────────────────────────────── 01_crawler_raw.json
         ↓ SendMessage (완료)
[impact-analyzer] ──────────────────────────────────→ 03_impact_analysis.json
[international-comparator] ─────────────────────────→ 03_international_cases.json
         ↓ (병합)
[오케스트레이터] ───────────────────────────────────→ 04_merged_draft.json
         ↓
[fact-checker] (독립 실행) ──────────────────────────→ 05_factcheck_report.json
         ↓
[content-publisher] ─────────────────────────────────→ data/policies.json
```

## 에러 핸들링

| 상황 | 전략 |
|------|------|
| 크롤러 수집 0건 | 사용자에게 알림 → 검색어 조정 후 재시도 제안 |
| 팀원 1명 실패 | SendMessage로 상태 확인 → 재시작. 재실패 시 해당 영역 "미완료"로 표시 후 계속 |
| 팩트체크 전체 unverified | 발행 중단, 사용자에게 원인 보고 |
| JSON 파싱 오류 | 백업에서 복원, 오류 내용 보고 |
| 크롤러 타임아웃 | 수집된 항목만으로 분석 진행, 미수집 사이트 명시 |

## 테스트 시나리오

### 정상 흐름
1. 사용자: "오늘 변경된 복지정책 수집해줘"
2. Phase 0: `_workspace/` 없음 → 초기 실행
3. Phase 1: 오늘 날짜(YYYY-MM-DD), 기존 ID 추출
4. Phase 2: 크롤러가 3개 정부 사이트에서 2건 수집
5. Phase 3: 팀 구성 → 구조화 → 영향분석·해외사례 병렬 처리
6. Phase 4: 팩트체커가 2건 모두 verified 판정
7. Phase 5: 발행, policies.json 2건 추가
8. 결과: "2건 발행 완료, 팩트체크 모두 통과"

### 에러 흐름
1. Phase 2에서 international-comparator가 중단
2. 리더가 유휴 알림 수신
3. SendMessage로 상태 확인 → 재시작
4. 재시작 후 해외 사례 1개국만 발견
5. "해외 사례 불완전" 표시 후 팩트체크 계속
6. 최종 보고에 "일본 사례만 확인됨" 명시
