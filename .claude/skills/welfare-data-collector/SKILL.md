---
name: welfare-data-collector
description: "국내 사회복지 정책 변경사항을 정부 공식 사이트에서 수집하는 스킬. 보건복지부, 고용노동부 등의 보도자료와 공고를 WebSearch/WebFetch로 탐색한다. '정책 수집', '사이트 크롤링', '오늘 변경된 복지정책', '정부 발표 확인' 등의 요청 시 사용."
---

# 사회복지 정책 데이터 수집 스킬

이 스킬은 국내 주요 정부 사이트에서 사회복지 정책 변경사항을 체계적으로 수집하는 방법을 정의한다.

## 수집 전략

### 1단계: 검색어 구성

다음 패턴으로 WebSearch를 수행한다:
- `site:mohw.go.kr 보도자료 복지 [오늘날짜]`
- `site:moel.go.kr 보도자료 고용보험 [오늘날짜]`
- `사회복지 정책 변경 [오늘날짜] site:go.kr`
- `복지 급여 인상 기준 변경 [연도]`

### 2단계: 결과 필터링

수집 대상 기준:
- 발표일이 수집 대상 날짜 범위 내인 것
- 정책 변경(인상, 완화, 강화, 신설, 폐지)이 포함된 것
- 단순 행사 안내, 채용 공고는 제외

### 3단계: 원문 추출

WebFetch로 해당 페이지에서:
- 제목, 발표일, 본문 내용 추출
- 수치(금액, 비율, 인원) 및 시행일 별도 마킹
- 첨부 파일(PDF) 링크 확인

## 주요 수집 URL 패턴

```
보건복지부: mohw.go.kr/react/al/sal0301vw.jsp?PAR_MENU_ID=04&MENU_ID=0403
고용노동부: moel.go.kr/news/enews/report/enewsView.do
국민건강보험: nhis.or.kr/announce/wbhaec07400m01.do
복지로: bokjiro.go.kr/ssis-tbu/twataa/welfareInfo/
```

## 출력 포맷

수집 데이터를 다음 구조로 `_workspace/01_crawler_raw.json`에 저장:

```json
{
  "collected_at": "YYYY-MM-DD HH:MM",
  "date_range": { "from": "YYYY-MM-DD", "to": "YYYY-MM-DD" },
  "sources": [
    {
      "site": "사이트명",
      "url": "실제 URL",
      "title": "원제목",
      "published_at": "YYYY-MM-DD",
      "raw_content": "원문 내용 (500자 이내 요약)",
      "category_hint": "카테고리 힌트",
      "has_numeric_changes": true
    }
  ],
  "collection_errors": [
    { "site": "사이트명", "error": "오류 사유" }
  ]
}
```

## 수집 품질 기준

- 공식 도메인(.go.kr, nhis.or.kr, nps.or.kr) 에서만 수집
- 발표일 확인 필수 (날짜 없는 항목 제외)
- 원문 URL 포함 필수
