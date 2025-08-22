# 현재 작업 - 아티팩트 다운로드 기능 (v4.1.1)

## 개요
v4.1.1 개발은 자동 아티팩트 다운로드 기능 추가에 중점을 두고 있습니다. 사용자가 Claude 아티팩트(코드 파일, 문서)가 포함된 대화를 저장할 때, 확장 프로그램이 이러한 아티팩트의 다운로드를 자동으로 트리거해야 합니다.

## 현재 상태: ❌ 작동 안 함

### 작동하는 것
- ✅ DOM에서 아티팩트 감지
- ✅ 아티팩트 메타데이터 추출 (제목, 부제)
- ✅ 로그에 아티팩트 개수 표시
- ✅ 마크다운에 인디케이터 표시 (`📎 [Artifact: 파일명]`)

### 작동하지 않는 것
- ❌ 아티팩트 모달 열기
- ❌ 열린 후 메뉴 버튼 찾기
- ❌ 다운로드 동작 트리거
- ❌ 실제 파일 다운로드

---

  1. ChatGPT에서 질문쌍 저장이 안 됨 - 모델을 다양하게 사용하는 것이 영향 있을 수 있음
  2. Artifacts 등 다른 요소도 검토 필요
  3. Claude의 Q&A 파일에서 질문(Q) 하위항목이 들여쓰기가 안 되는 문제


## 기술적 과제

### 문제점
Claude의 아티팩트 UI는 동적 요소를 가진 복잡한 React 기반 구조를 사용합니다. 다운로드 기능은 다음이 필요합니다:
1. 아티팩트를 클릭하여 열기
2. 3점 메뉴 버튼 찾기
3. 메뉴 버튼 클릭
4. "다운로드" 옵션 찾아서 클릭

### 현재 구현 (작동 안 함)

```javascript
// content.js 1120-1250줄
async function downloadArtifacts(artifacts) {
  for (let artifact of artifacts) {
    // 1단계: 아티팩트 클릭 - 작동함
    artifact.clickableElement.click();
    await sleep(1500);
    
    // 2단계: 메뉴 버튼 찾기 - 실패
    let menuButton = null;
    const menuSelectors = [
      'button[aria-label*="menu"]',
      'button.absolute.right-2.top-2',
      // ... 더 많은 선택자
    ];
    
    // 어떤 선택자로도 버튼을 찾을 수 없음
    // 버튼이 shadow DOM이나 iframe 안에 있을 수 있음
    
    // 3단계 & 4단계: 도달하지 못함
  }
}
```

### DOM 구조 문제

아티팩트가 열릴 때 예상되는 구조:
```html
<div class="artifact-modal">
  <div class="header">
    <button class="copy-button">복사</button>
    <button aria-haspopup="menu">⋮</button> <!-- 이것을 찾을 수 없음 -->
  </div>
  <iframe title="Claude 콘텐츠">
    <!-- 아티팩트 콘텐츠 -->
  </iframe>
</div>
```

메뉴 버튼이 시각적으로는 보이지만 프로그래밍적으로 선택할 수 없습니다.

## 조사 노트 (2025-07-29 로그에서)

### 콘솔 테스트 결과
```javascript
// 아티팩트가 열려있을 때 작동:
document.querySelector('button span.whitespace-nowrap')
// 반환: <span>복사</span>

// null 반환:
document.querySelector('button[aria-haspopup="menu"]')
document.querySelector('button.absolute.right-2.top-2')
```

### 가설
1. **Shadow DOM**: 메뉴 버튼이 shadow DOM에 있을 수 있음
2. **Iframe 격리**: 버튼이 iframe 내부에 있을 수 있음
3. **동적 렌더링**: 버튼이 지연 후 추가될 수 있음
4. **React 포털**: 버튼이 일반 DOM 트리 외부에 렌더링됨
5. **이벤트 위임**: 클릭 핸들러가 부모 요소에 있을 수 있음

## 시도해볼 대안 접근법

### 옵션 1: 직접 API 가로채기
```javascript
// fetch/XHR 요청 가로채기
// 아티팩트 다운로드 엔드포인트 찾기
// 직접 다운로드 트리거
```

### 옵션 2: 키보드 시뮬레이션
```javascript
// 아티팩트 열린 후:
// Tab 키 시뮬레이션으로 메뉴 포커스
// Enter로 메뉴 열기
// 화살표 키로 다운로드 선택
```

### 옵션 3: 브라우저 확장 API
```javascript
// chrome.debugger API 사용
// React 컴포넌트 트리 검사
// 다운로드 메서드 찾아서 트리거
```

### 옵션 4: 복사 콘텐츠 접근법
```javascript
// 복사 버튼 클릭 (작동함)
// 클립보드 콘텐츠 가져오기
// 클립보드에서 파일 생성
// 수동으로 다운로드 트리거
```

## v4.1.1에서 수정된 파일

### content.js
- `CONTENT_TYPES.ARTIFACT` 추가 (23줄)
- `extractAssistantContentTopDown()` 수정하여 아티팩트 감지 (491-560줄)
- `extractArtifactInfo()` 함수 추가 (615-650줄)
- `downloadArtifacts()` 함수 추가 (1120-1250줄)
- `saveConversation()` 수정하여 downloadArtifacts 호출 (1314줄)

### sites.js
- artifacts 설정 확장 (37-44줄):
  ```javascript
  artifacts: {
    enabled: true,
    containerSelector: '.artifact-block-cell',
    titleSelector: '.leading-tight.text-sm',
    subtitleSelector: '.text-sm.text-text-300',
    iframeSelector: 'iframe[title="Claude 콘텐츠"]',
    indicatorFormat: '📎 [Artifact: {title}]'
  }
  ```

### manifest.json
- 버전을 4.1.1로 업데이트
- 설명에 "Artifact 자동 다운로드" 추가

## 개발자를 위한 다음 단계

### 즉시 우선순위
1. **DOM 선택 디버그**
   - 아티팩트 열린 상태에서 Chrome DevTools 사용
   - 메뉴 버튼 선택 후 콘솔에서 `$0` 시도
   - 계산된 스타일과 이벤트 리스너 확인
   - React DevTools 단서 찾기

2. **대체 선택자 테스트**
   ```javascript
   // 콘솔에서 시도:
   document.querySelector('[role="button"]:not(.copy-button)')
   document.querySelectorAll('button')[1] // 복사가 [0]이면
   document.querySelector('.header button:last-child')
   ```

3. **이벤트 시스템 조사**
   - 클릭이 다르게 디스패치되어야 하는지 확인
   - bubbles: true로 MouseEvent 시도
   - 네이티브 클릭 vs 합성 클릭 테스트

### 대체 계획
직접 다운로드가 작동하지 않는 경우:
1. 토스트에 수동 지침 추가
2. 마크다운에서 아티팩트 강조
3. 아티팩트 요약 파일 생성
4. 클립보드 접근법 고려

## 테스트 지침

### 설정
1. `llm-chat-logger` 폴더에서 확장 프로그램 로드
2. Claude.ai로 이동
3. 아티팩트가 있는 대화 열기

### 테스트 단계
1. Cmd/Ctrl+S를 눌러 저장
2. 콘솔에서 아티팩트 감지 로그 확인
3. 아티팩트 클릭 시도 관찰
4. 프로세스가 실패하는 지점 기록
5. 마크다운에 아티팩트 인디케이터가 있는지 확인

### 예상 로그
```
[LLM Logger] Assistant div 내 artifact 수: 1
[LLM Logger] Artifact 발견: filename.py (Python code)
[LLM Logger] 1개 artifacts 다운로드 시작
[LLM Logger] 1. Artifact 열기 클릭 완료
[LLM Logger] 메뉴 버튼을 찾을 수 없음  // 현재 실패 지점
```

## 리소스

### 관련 파일
- `/Users/user/GitHub/_archived/llm-chatlog/_log/2025-07-29-artifact자동저장기능-추가중.txt`
- `/Users/user/GitHub/_archived/llm-chatlog/_sessions/2025-01-21_nextsession_v4.1.1_artifact_download.md`

### 유사 프로젝트
Claude 아티팩트를 프로그래밍적으로 다운로드하는 데 성공한 프로젝트를 찾지 못함.

### Claude UI 업데이트
Claude는 자주 UI를 업데이트합니다. 마지막으로 알려진 작동 선택자:
- 컨테이너: `.artifact-block-cell` (여전히 작동)
- 제목: `.leading-tight.text-sm` (여전히 작동)
- 모달: 알 수 없음 (성공적으로 선택한 적 없음)

## 코드 리뷰를 위한 질문

1. **DOM 접근**: 동적으로 렌더링된 React 컴포넌트에 접근하는 더 나은 방법이 있나요?
2. **이벤트 시뮬레이션**: 네이티브 이벤트 vs 합성 이벤트를 사용해야 하나요?
3. **타이밍**: React 렌더링을 위한 sleep 지연이 충분한가요?
4. **아키텍처**: 아티팩트 다운로드가 별도의 콘텐츠 스크립트여야 하나요?
5. **권한**: 추가 Chrome 권한이 필요한가요?

## 위험 평가

### 현재 영향
- 데이터 손실 없음 (아티팩트는 여전히 수동으로 접근 가능)
- 주요 기능 (대화 저장) 여전히 작동
- 사용자 불편 (수동 다운로드 필요)

### 잠재적 문제
- 반복된 클릭이 속도 제한을 트리거할 수 있음
- 실패한 시도가 UI를 깨뜨릴 수 있음
- 정리되지 않은 참조로 인한 메모리 누수

### 완화
- try-catch 블록 추가
- 재시도 제한 구현
- 이벤트 리스너 정리
- 기능을 위한 사용자 토글 추가