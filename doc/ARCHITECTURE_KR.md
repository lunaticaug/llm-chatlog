# LLM Chat Logger - 아키텍처 문서

## 파일 구조 상세

### 1. content.js (메인 로직)
모든 추출 및 처리 로직을 포함하는 핵심 파일입니다.

#### 구조 개요
```javascript
// 버전 정보 (2-8줄)
const VERSION = 'v4.1.1';
const VERSION_DESC = 'Claude + ChatGPT 통합 지원 + Artifact 자동 다운로드';

// 전역 변수 (10-28줄)
- DEBUG 플래그
- currentSite 참조
- OS 감지
- 콘텐츠 타입 정의

// 주요 섹션:
1. 유틸리티 함수 (30-108줄)
2. 추출 함수 (110-489줄)
3. 콘텐츠 처리 (490-650줄)
4. 마크다운 생성 (650-1120줄)
5. 아티팩트 처리 (1120-1250줄)
6. 파일 저장 (1250-1350줄)
7. 이벤트 핸들러 (1350-1400줄)
```

#### 주요 데이터 구조

**Q&A 쌍 객체**:
```javascript
{
  index: 1,                    // 질문 번호
  human: "사용자 질문",         // 사용자 입력
  contents: [                  // 어시스턴트 응답 부분들
    {
      type: 'thinking',        // 콘텐츠 타입
      content: '...'           // 실제 콘텐츠
    },
    {
      type: 'answer',
      content: '...'
    }
  ],
  artifacts: [                 // 첨부된 아티팩트 (v4.1.1)
    {
      id: 'artifact_123',
      title: 'Code.py',
      subtitle: 'Python 코드',
      element: DOMElement
    }
  ]
}
```

**콘텐츠 타입**:
```javascript
CONTENT_TYPES = {
  THINKING: 'thinking',   // Claude 사고 블록
  ANSWER: 'answer',       // 메인 응답
  ARTIFACT: 'artifact',   // 코드/문서 아티팩트
  CANVAS: 'canvas',       // ChatGPT 캔버스 (계획)
  RESEARCH: 'research',   // 딥 리서치 (계획)
  SEARCH: 'search',       // 웹 검색 결과
  TOOL: 'tool'           // 도구 사용
}
```

### 2. sites.js (플랫폼 설정)

#### 설정 구조
```javascript
SITES = {
  claude: {
    name: 'Claude',
    domain: 'claude.ai',
    
    // DOM 선택자 (우선순위 순서)
    selectors: [
      { type: 'xpath', value: '...', description: '...' },
      { type: 'css', value: '...', description: '...' }
    ],
    
    // 메시지 추출 패턴
    pattern: {
      type: 'sequential-pairs',  // 추출 방법
      userCheck: 'button',       // 사용자 메시지 식별자
      increment: 2               // 건너뛰기 패턴
    },
    
    // 특수 요소 처리
    special: {
      thinking: { /* 설정 */ },
      artifacts: { /* 설정 */ },
      citations: '선택자'
    },
    
    // 제거할 UI 텍스트 패턴
    uiPatterns: [ /* 정규식 패턴 */ ],
    
    // 콘텐츠 추출 설정
    extraction: { /* 상세 설정 */ }
  },
  
  chatgpt: { /* 유사한 구조 */ }
}
```

#### 플랫폼 감지
- `window.location.hostname` 기반 자동 감지
- 사이트 설정 객체 반환
- 지원하지 않는 사이트는 null 반환

### 3. keywords.js (언어 처리)

#### 한국어 처리
```javascript
KOREAN_FILTERS = {
  // 제외할 불용어
  stopWords: ['있다', '없다', ...],
  
  // 기준 빈도 임계값
  baselineFrequency: {
    '사용자': 3,  // Q&A당 예상 3회
    '클로드': 3,
    // ...
  },
  
  // 제거할 한국어 조사
  particles: ['에서는', '에서도', ...],
  
  // 동사/형용사 어미
  verbEndings: ['하고', '하는', ...]
}
```

## 추출 흐름 상세

### 1단계: 플랫폼 감지
```
1. detectCurrentSite()가 호스트명 확인
2. 플랫폼별 설정 로드
3. 전역 currentSite 참조 설정
```

### 2단계: 컨테이너 위치
```
1. XPath 선택자 먼저 시도 (더 빠르고 정확)
2. CSS 선택자로 폴백
3. 첫 번째 매칭 컨테이너 반환
```

### 3단계: 메시지 추출

#### Claude 패턴 (sequential-pairs)
```
1. 모든 직접 자식 DIV 가져오기
2. 쌍으로 처리 (div[0]=사용자, div[1]=어시스턴트)
3. 시스템 메시지 건너뛰기 (편집 버튼 없음)
4. 사고 블록 별도 추출
5. 답변 콘텐츠 처리
6. 아티팩트 감지
```

#### ChatGPT 패턴 (data-testid)
```
1. 모든 [data-testid^="conversation-turn-"] 찾기
2. .sr-only로 역할 식별 확인
3. 중첩된 div 콘텐츠 추출
4. 테이블과 코드 블록 처리
5. 포맷팅 처리
```

### 4단계: 콘텐츠 처리

#### 2단계 처리 (v3.1.9 접근법)
```
1단계: DOM 수정 없이 노드 수집
- DOM 트리 순회
- 노드 타입 식별
- 원래 순서 보존
- 참조 저장

2단계: 수집된 노드 처리
- 변환 적용
- 마크다운으로 변환
- 특수 요소 처리
- 구조 유지
```

#### 사고 블록 처리
```
1. 클래스로 감지: .transition-all.duration-400
2. 확장 또는 축소 상태 확인
3. 요약 텍스트 추출
4. 가능한 경우 전체 콘텐츠 추출
5. 들여쓰기로 포맷
```

### 5단계: 마크다운 생성

#### 전체 대화 형식
```markdown
# {제목}

## 메타데이터
- 날짜: {날짜}
- Q&A 수: {개수}
- 버전: {버전}

## Q1: {질문}

### 💭 사고
{사고 내용}

### 💬 답변
{답변 내용}

## Q2: ...
```

#### 질문만 형식
```markdown
# {제목}의 질문들

## Q1
{질문}

## Q2
{질문}
```

## 에러 처리

### 에러 코드
- **001**: 컨테이너를 찾을 수 없음
- **002**: 알 수 없는 패턴 타입
- **003**: 추출 예외
- **004**: Q&A 쌍이 추출되지 않음
- **005**: 저장 작업 오류

### 복구 전략
1. 다중 선택자 폴백
2. 우아한 성능 저하 (부분 추출)
3. 토스트를 통한 사용자 알림
4. 디버깅을 위한 콘솔 로깅

## 성능 최적화

### DOM 작업
- 노드 복제로 리플로우 최소화
- DOM 쿼리 일괄 처리
- 가능한 경우 XPath 사용 (더 빠름)
- 선택자 결과 캐싱

### 메모리 관리
- 한 번에 하나의 Q&A 처리
- 사용 후 참조 정리
- 전체 DOM 트리 저장 방지
- 가능한 경우 텍스트 콘텐츠 사용

### 문자열 작업
- 가능한 경우 정규식보다 네이티브 메서드 사용
- 정규식 패턴 한 번만 컴파일
- 반복된 문자열 연결 방지
- 포맷팅에 템플릿 리터럴 사용

## 확장 프로그램 라이프사이클

### 초기화
```
1. manifest를 통한 스크립트 주입
2. 플랫폼 감지
3. 이벤트 리스너 등록
4. 디버그 모드 확인
```

### 사용자 상호작용
```
1. 키보드 단축키 (Cmd/Ctrl+S)
2. 대화 추출
3. 마크다운 생성
4. 다운로드 링크 생성
5. 다운로드를 위한 자동 클릭
6. 성공 토스트 표시
```

### 정리
```
1. 객체 URL 해제
2. 임시 요소 제거
3. 참조 정리
4. 상태 리셋
```

## 사용된 Chrome 확장 프로그램 API

### Manifest V3 기능
- `content_scripts`: 자동 주입
- `permissions`: downloads, storage
- `host_permissions`: 플랫폼 접근

### 런타임 API
- `document.evaluate()`: XPath 쿼리
- `document.querySelector()`: CSS 선택
- `Blob`: 파일 생성
- `URL.createObjectURL()`: 다운로드 링크
- `chrome.downloads`: 파일 저장 (간접)