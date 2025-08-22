# 알려진 문제 & 버그 트래커

## 🔴 심각한 문제

### 1. ChatGPT 메시지 추출 실패
**상태**: ❌ 작동 안 함  
**버전**: v4.1.1  
**보고일**: 2025-08-22  

#### 문제 설명
- ChatGPT 대화가 제대로 추출되지 않음
- Q&A 쌍이 전혀 저장되지 않음
- 다양한 모델 사용(GPT-4, GPT-4o, GPT-3.5)과 관련이 있을 수 있음

#### 기술적 분석
**sites.js의 현재 선택자**:
```javascript
pattern: {
  type: 'data-testid',
  messageSelector: '[data-testid^="conversation-turn-"]',
  messageIndicator: '.sr-only',
  userText: '나의 말:',
  assistantText: 'ChatGPT의 말:'
}
```

**잠재적 문제**:
1. **모델별 DOM**: 다른 모델이 다른 DOM 구조를 생성할 수 있음
2. **언어 감지**: 한국어 텍스트 패턴('나의 말:', 'ChatGPT의 말:')이 영어 인터페이스에서 일치하지 않을 수 있음
3. **동적 구조**: ChatGPT가 자주 UI 구조를 업데이트함
4. **콘텐츠 중첩**: `div > div > div > div > div:first-child` 선택자가 너무 경직됨

#### 디버깅 단계
```javascript
// ChatGPT 페이지에서 실행할 콘솔 테스트:
// 1. 대화 턴 확인
document.querySelectorAll('[data-testid^="conversation-turn-"]').length

// 2. sr-only 인디케이터 확인
document.querySelectorAll('.sr-only').forEach(el => console.log(el.textContent))

// 3. 메시지의 실제 구조 확인
document.querySelector('[data-testid^="conversation-turn-"]')?.innerHTML

// 4. 다른 모델 인디케이터 확인
Array.from(document.querySelectorAll('[class*="model"]')).map(el => el.className)
```

#### 제안된 해결책
1. 현재 ChatGPT DOM에 맞게 **선택자 업데이트**
2. 다른 구조를 처리하기 위한 **모델 감지 추가**
3. 다양한 레이아웃을 위한 **폴백 패턴 구현**
4. **한국어와 영어 인터페이스 모두 지원**

---

### 2. 아티팩트 다운로드 작동 안 함
**상태**: ❌ 작동 안 함  
**버전**: v4.1.1  
**상세**: [CURRENT_WORK_KR.md](./CURRENT_WORK_KR.md) 참조

---

## 🟡 사소한 문제

### 3. Claude Q&A 파일 들여쓰기 문제
**상태**: 🔧 수정 필요  
**버전**: v4.1.1  
**보고일**: 2025-08-22  

#### 문제 설명
- Claude Q&A 파일에서 질문(Q)이 제대로 들여쓰기되지 않음
- 전체 대화 파일은 올바른 포맷팅을 가지고 있음
- 질문만 포함된 파일만 들여쓰기 문제가 있음

#### 현재 출력
```markdown
## Q1
들여쓰기 없는 사용자 질문
```

#### 예상 출력
```markdown
## Q1
	적절한 들여쓰기가 있는 사용자 질문
```

#### 수정 위치
**파일**: content.js  
**함수**: `generateQuestionsOnlyMarkdown()`  
**줄**: ~1090

```javascript
// 현재 코드 (줄 ~1095)
markdown += `## Q${qa.index}\n`;
markdown += `${qa.human}\n\n`;

// 수정 후:
markdown += `## Q${qa.index}\n`;
markdown += `\t${qa.human.replace(/\n/g, '\n\t')}\n\n`;
```

---

## 🟢 개선 요청

### 4. ChatGPT Canvas 지원
**상태**: 📝 계획됨  
**우선순위**: 중간  

### 5. Deep Research PDF 지원
**상태**: 📝 계획됨  
**우선순위**: 낮음  

### 6. Gemini 지원
**상태**: 📝 계획됨  
**우선순위**: 낮음  

---

## 테스트 체크리스트

### ChatGPT 문제:
- [ ] GPT-3.5 모델로 테스트
- [ ] GPT-4 모델로 테스트
- [ ] GPT-4o 모델로 테스트
- [ ] 커스텀 GPT로 테스트
- [ ] 한국어 인터페이스로 테스트
- [ ] 영어 인터페이스로 테스트
- [ ] 코드 블록으로 테스트
- [ ] 테이블로 테스트
- [ ] 이미지로 테스트
- [ ] Canvas로 테스트

### Claude 문제:
- [ ] 아티팩트로 테스트
- [ ] 사고 블록으로 테스트
- [ ] 인용으로 테스트
- [ ] 긴 대화로 테스트
- [ ] Q&A 파일 들여쓰기 테스트

---

## 버전 히스토리

### v4.1.1 (개발 중)
- ❌ 아티팩트 다운로드 기능 (작동 안 함)
- ❌ ChatGPT 추출 (고장)
- 🔧 Q&A 들여쓰기 문제

### v4.0.0
- ✅ 멀티 플랫폼 지원
- ✅ Claude 추출 작동
- ⚠️ ChatGPT 추출 불안정

### v3.1.11
- ✅ 탭 제목 우선순위
- ✅ 사고/답변 분리
- ✅ 안정적인 Claude 추출

---

## 빠른 수정

### 수정 1: Q&A 들여쓰기
```javascript
// generateQuestionsOnlyMarkdown() 함수에서
// ~1095줄 교체:
markdown += `\t${qa.human.replace(/\n/g, '\n\t')}\n\n`;
```

### 수정 2: ChatGPT 모델 감지
```javascript
// sites.js chatgpt 설정에 추가:
modelIndicators: {
  'gpt-3.5': '[data-model*="3.5"]',
  'gpt-4': '[data-model*="gpt-4"]',
  'gpt-4o': '[data-model*="4o"]'
}
```

### 수정 3: 언어 지원
```javascript
// sites.js 패턴 업데이트:
pattern: {
  userText: ['나의 말:', 'You said:', 'User:'],
  assistantText: ['ChatGPT의 말:', 'ChatGPT said:', 'Assistant:']
}
```

---

## 디버그 모드 명령어

상세 로깅을 위한 디버그 모드 활성화:
```javascript
// Cmd+Shift+D (Mac) 또는 Ctrl+Shift+D (Windows) 누르기
// 또는 콘솔에서:
DEBUG = true;
```

현재 사이트 감지 확인:
```javascript
currentSite
```

수동으로 추출 테스트:
```javascript
extractConversation()
```

---

## 문제 보고 연락처

버그 리포트나 기능 요청 시 다음을 제공해주세요:
1. 브라우저 버전
2. 확장 프로그램 버전
3. 플랫폼 (Claude/ChatGPT)
4. 사용된 모델 (ChatGPT의 경우)
5. 인터페이스 언어
6. 콘솔 에러 로그
7. 샘플 대화 구조 (가능한 경우)