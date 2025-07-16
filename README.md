# llm-chatlog
> chrome extension chatlog downloader and issue tracker
> 
> 대화로그 다운로드 - tasktracker로 압축해서 다음 대화에 넣으면 됩니다.

## 프로젝트 구조

```
llm-chatlog/
├── claude-chat-logger/     # v2.11 (현재 안정 버전)
│   ├── manifest.json
│   └── content.js
├── llm-chat-logger/        # v3.0 (개발 버전)
│   ├── manifest.json
│   ├── content.js          # 메인 로직
│   ├── sites.js            # 플랫폼별 DOM 구조
│   └── keywords.js         # 한국어 처리
└── _sample/                # 출력 예시

```

## Components

1. **downloader** - 대화 내용 추출 및 저장
2. **task-tracker** - 저장된 로그 압축 및 재사용


## downloader

### 지원 플랫폼

- **claude** ✅ v2.11 [사용예시👀](_sample/2025-07-03_게시물_채팅로그_저장_v2.09.md)
- **gpt** 🚧 v3.0에서 지원 예정


### 특징

- 쿼리별 이모지 태그 자동분류
- 키워드 추출하여 파일명 자동명명  
- 저장된 파일 상단에 대화 관련 키워드, Q&A쌍 갯수 포함
- v2.11: Mac/Windows 호환, 2개 파일 동시 저장 (전체 대화 + 질문만)
- v3.0: 멀티 플랫폼 지원 구조 (개발중)


#### 아래와 같이 저장됩니다.

thinking에 사용자가 입력한 내용을 요약정리한 내용이 주로 포함되길래 저장하는것이 좋은것 같아서 
답변 뿐만 아니라 추론과정까지 저장되도록 했습니다.

```markdown
# Q1. 이 게시물은 테스트용입니다!... ❓

## 👤 Human: ❓
    이 게시물은 테스트용입니다!

## 🤖 Claude:

### 💭 Thinking:

> 생각하고 있음: {추론 내용}

### 💬 Answer:
    안녕하세요! 테스트 게시물을 확인했습니다. 
```



### 사용방법

#### v2.11 (안정 버전)
- 크롬 개발자모드 on
- 압축해제된 확장프로그램 로드 클릭
- `claude-chat-logger` 폴더 선택
- Claude 대화 페이지에서 F12 개발자모드 콘솔 열기
- `Ctrl+S` (Windows) 또는 `Cmd+S` (Mac)로 저장

#### v3.0 (개발 버전)
- 위와 동일하나 `llm-chat-logger` 폴더 선택
- Claude 및 ChatGPT 지원 예정


## task-tracker

### 개요

저장된 대화로그에서 재사용할 질문-답변쌍만 남기고 완료된 항목은 요약처리

    제작: claude, 
    사용환경: gems 이용 추천 
    (클로드는 비용문제로 gemini에서도 원활하게 구동가능하도록 수정중)

