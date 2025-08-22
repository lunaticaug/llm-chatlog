# LLM Chat Logger - 함수 레퍼런스

## content.js 함수들

### 핵심 함수

#### `extractConversation()`
**목적**: 메인 추출 오케스트레이터  
**반환**: Q&A 쌍 배열  
**흐름**:
1. 플랫폼 선택자를 사용하여 대화 컨테이너 찾기
2. 추출 패턴 타입 결정
3. 적절한 추출 함수 호출
4. 구조화된 Q&A 배열 반환

**에러 코드**:
- 001: 컨테이너를 찾을 수 없음
- 002: 알 수 없는 패턴 타입
- 003: 추출 예외

---

#### `saveConversation()`
**목적**: 전체 저장 워크플로우 처리  
**반환**: void  
**비동기**: 예  
**흐름**:
1. extractConversation() 호출
2. 두 형식 모두에 대한 마크다운 생성
3. 다운로드 링크 생성
4. 다운로드 트리거
5. 아티팩트 다운로드 시도 (v4.1.1)
6. 성공 토스트 표시

**에러 코드**: 005 (저장 작업 오류)

---

### 추출 함수

#### `extractSequentialPairs(container)`
**목적**: Claude 스타일 순차 div 쌍 추출  
**매개변수**: 
- `container`: 메시지를 포함한 DOM 요소
**반환**: Q&A 쌍 배열  
**로직**:
```
각 div 쌍에 대해:
  - div[i] = 사람 메시지
  - div[i+1] = 어시스턴트 메시지
  - 편집 버튼이 없으면 건너뛰기 (시스템 메시지)
  - 사고 분리와 함께 콘텐츠 추출
```

---

#### `extractDataTestId(container)`
**목적**: ChatGPT 스타일 data-testid 메시지 추출  
**매개변수**:
- `container`: 메시지를 포함한 DOM 요소
**반환**: Q&A 쌍 배열  
**로직**:
```
각 [data-testid^="conversation-turn-"]에 대해:
  - .sr-only로 역할 확인
  - 중첩된 콘텐츠 div 추출
  - 특수 요소 처리 (테이블, 코드)
```

---

#### `extractAssistantContentTopDown(element)`
**목적**: 어시스턴트 메시지를 위한 2단계 추출  
**매개변수**:
- `element`: 어시스턴트 메시지 DOM 요소
**반환**: contents와 artifacts 배열을 가진 객체  
**단계**:
1. **수집**: DOM 수정 없이 노드 수집
2. **처리**: 노드를 구조화된 콘텐츠로 변환

**주요 기능**:
- 원래 순서 보존
- 중첩된 사고 블록 처리
- 아티팩트 감지
- 마크다운 포맷 유지

---

### 콘텐츠 처리 함수

#### `extractContent(element, role)`
**목적**: 텍스트 콘텐츠 추출 및 정리  
**매개변수**:
- `element`: 추출할 DOM 요소
- `role`: 'human' 또는 'assistant'
**반환**: 정리된 콘텐츠 문자열  
**작업**:
- UI 요소 제거 (버튼, 아바타)
- 의미 있는 텍스트 보존
- 코드 블록 특별 처리

---

#### `extractThinkingContent(container)`
**목적**: Claude 사고 블록 콘텐츠 추출  
**매개변수**:
- `container`: 사고 블록 DOM 요소
**반환**: 사고 콘텐츠 문자열  
**특별 처리**:
- 확장 또는 축소 상태 확인
- 축소된 경우 요약 추출
- 확장된 경우 전체 콘텐츠 가져오기

---

#### `extractArtifactInfo(element)`
**목적**: 아티팩트 메타데이터 추출 (v4.1.1)  
**매개변수**:
- `element`: 아티팩트 DOM 요소
**반환**: 아티팩트 객체 또는 null  
**구조**:
```javascript
{
  id: '고유_id',
  title: '아티팩트 이름',
  subtitle: '설명',
  element: DOM요소,
  clickableElement: DOM요소
}
```

---

### 유틸리티 함수

#### `log(...args)`
**목적**: 디버그 로깅  
**조건**: DEBUG=true일 때만 로그  
**형식**: `[LLM Logger] {메시지}`

---

#### `logError(code, message, details)`
**목적**: 에러 로깅  
**항상 활성**: 예  
**형식**: `[LLM-ERROR-{코드}] {메시지} {상세}`

---

#### `findContainer(selectors)`
**목적**: 여러 전략을 사용하여 대화 컨테이너 찾기  
**매개변수**:
- `selectors`: 선택자 객체 배열
**반환**: DOM 요소 또는 null  
**전략**:
1. XPath 선택자 먼저 시도
2. CSS 선택자로 폴백
3. 첫 번째 매치 반환

---

#### `removeUIElements(element)`
**목적**: 추출된 콘텐츠에서 UI 요소 정리  
**매개변수**:
- `element`: 정리할 DOM 요소
**제거 항목**:
- 버튼
- SVG 아이콘
- 아바타 (이니셜이 있는 둥근 요소)
- 시간 표시기
- 복사/편집 버튼

---

#### `isUIText(text)`
**목적**: 텍스트가 UI 요소인지 확인  
**매개변수**:
- `text`: 확인할 문자열
**반환**: Boolean  
**사용**: 플랫폼별 uiPatterns 배열

---

### 마크다운 생성 함수

#### `generateMarkdown(qaPairs)`
**목적**: 전체 대화 마크다운 생성  
**매개변수**:
- `qaPairs`: Q&A 객체 배열
**반환**: markdown과 title을 가진 객체  
**형식**: 메타데이터, 사고 블록, 답변을 포함한 전체 대화

---

#### `generateQuestionsOnlyMarkdown(qaPairs)`
**목적**: 질문만 포함된 마크다운 생성  
**매개변수**:
- `qaPairs`: Q&A 객체 배열
**반환**: 마크다운 문자열  
**형식**: 답변 없는 간단한 질문 목록

---

#### `convertToMarkdownFull(html)`
**목적**: HTML을 마크다운으로 변환  
**매개변수**:
- `html`: HTML 문자열
**반환**: 마크다운 문자열  
**처리 항목**:
- 헤더 (h1-h6)
- 링크
- 굵게/기울임
- 목록 (순서/비순서)
- 코드 블록
- 테이블 (ChatGPT)
- 줄 바꿈

---

#### `convertListToMarkdown(listElement, indent)`
**목적**: HTML 목록을 마크다운으로 변환  
**매개변수**:
- `listElement`: UL 또는 OL 요소
- `indent`: 현재 들여쓰기 수준
**반환**: 마크다운 문자열  
**기능**:
- 중첩 목록 처리
- 번호 매기기 보존
- 들여쓰기 유지

---

#### `convertTableToMarkdown(table)`
**목적**: HTML 테이블을 마크다운으로 변환 (ChatGPT)  
**매개변수**:
- `table`: 테이블 요소
**반환**: 마크다운 테이블 문자열  
**형식**:
```markdown
| 헤더 1 | 헤더 2 |
|--------|--------|
| 셀 1   | 셀 2   |
```

---

### 제목 생성 함수

#### `generateTitle(qaPairs)`
**목적**: 파일명에 안전한 제목 생성  
**매개변수**:
- `qaPairs`: Q&A 객체 배열
**반환**: title과 keywords를 가진 객체  
**우선순위**:
1. 브라우저 탭 제목 사용
2. 콘텐츠에서 키워드 추출
3. "conversation"으로 폴백

---

#### `extractKeywords(text, maxKeywords)`
**목적**: 텍스트에서 의미 있는 키워드 추출  
**매개변수**:
- `text`: 소스 텍스트
- `maxKeywords`: 추출할 최대 개수
**반환**: 키워드 배열  
**프로세스**:
1. 텍스트 정리 및 토큰화
2. 불용어 제거
3. 조사 제거 (한국어)
4. 빈도 계산
5. 임계값으로 필터링
6. 상위 키워드 반환

---

#### `cleanKoreanWord(word)`
**목적**: 키워드 추출을 위한 한국어 단어 정리  
**매개변수**:
- `word`: 한국어 단어
**반환**: 정리된 단어  
**작업**:
- 조사 제거
- 동사 어미 정규화
- 어간 보존

---

### 이벤트 핸들러

#### `handleKeyPress(event)`
**목적**: 키보드 단축키 처리  
**트리거**:
- Cmd+S (Mac) / Ctrl+S (Windows): 대화 저장
- Cmd+Shift+D / Ctrl+Shift+D: 디버그 모드 토글
**방지**: 기본 저장 대화상자

---

### 토스트 알림

#### `showToast(message, duration)`
**목적**: 임시 알림 표시  
**매개변수**:
- `message`: 표시할 텍스트
- `duration`: 표시 시간(ms) (기본: 3000)
**스타일**: 고정 위치, 다크 테마, 페이드 애니메이션

---

### 아티팩트 함수 (v4.1.1 - 개발 중)

#### `downloadArtifacts(artifacts)` ⚠️ 작동 안 함
**목적**: 아티팩트 다운로드 트리거  
**매개변수**:
- `artifacts`: 아티팩트 객체 배열
**문제점**:
- 올바른 메뉴 버튼 선택자를 찾을 수 없음
- 클릭 시뮬레이션이 작동하지 않음
- 다운로드 링크에 접근할 수 없음

---

#### `sleep(ms)`
**목적**: 비동기 지연 헬퍼  
**매개변수**:
- `ms`: 대기할 밀리초
**반환**: Promise  
**사용법**: `await sleep(1000)`

---

## sites.js 함수

#### `detectCurrentSite()`
**목적**: 현재 LLM 플랫폼 감지  
**반환**: 사이트 설정 객체 또는 null  
**감지**: `window.location.hostname` 기반  
**지원**: claude.ai, chatgpt.com

---

## keywords.js 데이터 구조

### `KOREAN_FILTERS`
**목적**: 한국어 처리 설정  
**구조**:
```javascript
{
  stopWords: [],           // 제외할 단어
  baselineFrequency: {},   // 예상 빈도
  particles: [],           // 한국어 조사
  verbEndings: []         // 동사/형용사 어미
}
```

---

## 함수 호출 계층구조

```
사용자가 Cmd/Ctrl+S 누름
  └─> handleKeyPress()
      └─> saveConversation()
          ├─> extractConversation()
          │   ├─> detectCurrentSite()
          │   ├─> findContainer()
          │   └─> extractSequentialPairs() 또는 extractDataTestId()
          │       ├─> extractAssistantContentTopDown()
          │       │   ├─> extractThinkingContent()
          │       │   └─> extractArtifactInfo()
          │       └─> extractContent()
          ├─> generateMarkdown()
          │   ├─> generateTitle()
          │   │   └─> extractKeywords()
          │   └─> convertToMarkdownFull()
          ├─> generateQuestionsOnlyMarkdown()
          ├─> downloadArtifacts() [아티팩트가 있는 경우]
          └─> showToast()
```

## 성능 특성

### 시간 복잡도
- 컨테이너 찾기: O(1) - 직접 선택자
- 메시지 추출: O(n) - 선형 스캔
- 콘텐츠 처리: O(n*m) - n개 메시지, m개 노드
- 마크다운 생성: O(n) - 선형
- 키워드 추출: O(n log n) - 정렬

### 공간 복잡도
- 메모리 사용: O(n) - 대화 크기에 비례
- 영구 저장소 없음
- 임시 DOM 복제는 사용 후 정리

## 일반적인 문제와 해결방법

### 문제: 컨테이너를 찾을 수 없음
**원인**: DOM 구조 변경  
**해결**: sites.js의 선택자 업데이트

### 문제: 사고 블록이 분리되지 않음
**원인**: 클래스 이름 변경  
**해결**: extraction.thinking 선택자 업데이트

### 문제: 아티팩트가 다운로드되지 않음
**상태**: v4.1.1의 알려진 버그  
**임시방안**: UI에서 수동 다운로드

### 문제: 한국어 키워드 품질 저하
**원인**: 불충분한 필터링  
**해결**: keywords.js의 stopWords에 추가