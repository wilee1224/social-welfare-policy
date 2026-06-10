---
name: welfare-fact-checker
description: "사회복지 정책 정보의 팩트체크 전문 스킬. hallucination 탐지, 수치 검증, 출처 확인을 수행한다. 모든 정책 데이터는 발행 전 이 스킬로 검증해야 한다. '팩트체크', '내용 검증', '사실 확인', '출처 확인', 'hallucination 방지' 요청 시 사용."
---

# 사회복지 정책 팩트체크 스킬

이 스킬은 사회복지 정책 콘텐츠의 사실 정확성을 체계적으로 검증하는 방법을 정의한다.

## 검증 워크플로우

### Step 1: 핵심 수치 추출

분석 결과에서 검증이 필요한 항목을 우선순위별로 추출:
1. **최우선**: 금액, 비율, 인원수, 날짜 (수치가 틀리면 큰 피해)
2. **고우선**: 정책 명칭, 담당 부처, 시행일
3. **중우선**: 해외 사례 정책명, 출처 기관명
4. **저우선**: 배경 설명, 영향 분석

### Step 2: 검증 방법

각 항목 유형별 검증 방법:

| 항목 | 검증 방법 |
|------|---------|
| 금액/비율 변경 | WebSearch로 원 보도자료 확인 |
| 시행일 | 관보(gwanbo.go.kr) 또는 부처 공시 확인 |
| 수혜 인원 | 보도자료 원문에 명시된 경우만 인용 |
| 해외 정책명 | WebSearch로 공식 명칭 확인 |
| 신청 방법/서류 | 복지로 또는 해당 부처 공식 안내 확인 |

### Step 3: Hallucination 탐지 규칙

다음은 즉시 제거 또는 경고 처리:
- 존재하지 않는 법령 조문 인용
- 없는 URL을 있는 것처럼 작성
- 보도자료에 없는 수치를 추가
- 미래 예측을 확정된 사실처럼 표현
- 해외 사례에서 없는 효과 통계 인용

### Step 4: 검증 결과 분류

| 결과 코드 | 의미 | 처리 |
|---------|------|------|
| `confirmed` | 1차 출처에서 확인 | 그대로 사용 |
| `corrected` | 오류 발견, 수정 완료 | 수정안 제시 |
| `unverifiable` | 확인 불가 | "(미확인)" 태그 추가 |
| `removed` | 명백한 오류 또는 없는 정보 | 삭제 권고 |

## 출력 포맷

`_workspace/05_factcheck_report.json`:

```json
{
  "checked_at": "YYYY-MM-DD HH:MM",
  "summary": {
    "total_items": 3,
    "verified": 2,
    "partial": 1,
    "unverified": 0,
    "corrections_made": 2
  },
  "items": [
    {
      "temp_id": "TEMP-001",
      "overall_status": "verified",
      "checks": [
        {
          "field": "keyChanges[0]",
          "claim": "원래 내용",
          "result": "confirmed",
          "source": "보건복지부 보도자료 YYYY-MM-DD"
        }
      ],
      "verified_sources": ["출처 목록"],
      "hallucination_flags": [],
      "checker_notes": "메모"
    }
  ]
}
```

## 검증 불가 처리 원칙

팩트체커가 확인할 수 없는 내용은 삭제하지 않고 `(미확인)` 태그를 붙인다. 삭제 결정은 content-publisher가 내린다. 팩트체커의 역할은 진실/거짓 판단이지 콘텐츠 편집이 아니다.
