---
name: welfare-web-publisher
description: "검증된 사회복지 정책 데이터를 data/policies.json에 발행하는 스킬. 팩트체크 결과를 반영하고, JSON 스키마를 준수하며, 중복을 제거한다. '웹사이트 업데이트', '정책 발행', 'policies.json 갱신' 요청 시 사용."
---

# 웹사이트 콘텐츠 발행 스킬

이 스킬은 검증된 정책 데이터를 웹사이트에 발행하는 절차를 정의한다.

## 발행 절차

### Step 1: 팩트체크 결과 병합

`_workspace/04_merged_draft.json`과 `_workspace/05_factcheck_report.json`을 병합:
- `result: "corrected"` 항목은 correction 내용으로 교체
- `result: "removed"` 항목은 해당 필드 제거 또는 "(확인 필요)" 처리
- `overall_status`를 factCheck.status로 반영

### Step 2: ID 할당

기존 `data/policies.json` 읽기 → 해당 연도 최대 순번 확인 → +1 부여
```
예: 기존 "2026-0003" → 신규 "2026-0004"
```

### Step 3: JSON 유효성 검증

발행 전 확인:
- JSON 파싱 오류 없음
- 모든 필수 필드 존재 (id, date, title, category, summary, factCheck)
- tags 배열이 비어있지 않음
- internationalCases source 필드 존재

### Step 4: policies.json 업데이트

```json
{
  "lastUpdated": "오늘 날짜",
  "changes": [
    // 신규 항목을 배열 앞에 추가 (최신순 유지)
    // 기존 항목 유지
  ]
}
```

### Step 5: 발행 이력 기록

`_workspace/publish_log.json` 업데이트:
```json
{
  "runs": [
    {
      "published_at": "YYYY-MM-DD HH:MM",
      "published_count": 3,
      "skipped_count": 0,
      "skipped_reasons": [],
      "new_ids": ["2026-0004", "2026-0005"]
    }
  ]
}
```

## 발행 제외 기준

| 상황 | 처리 |
|------|------|
| factCheck.status = unverified | 발행 제외, 로그에 기록 |
| 필수 필드 누락 | 발행 제외, 오케스트레이터에 보고 |
| 기존 ID와 중복 | 기존 항목 업데이트 (id 유지) |
| JSON 파싱 불가 | 발행 중단, 오류 보고 |

## 백업 원칙

`data/policies.json` 수정 전:
```
data/policies.backup.json 으로 백업 생성
```
오류 발생 시 백업으로 복원.
