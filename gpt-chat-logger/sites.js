// ChatGPT 전용 간소화된 설정
const SITES = {
  chatgpt: {
    name: 'ChatGPT',
    domain: 'chatgpt.com',
    
    // 컨테이너 선택자
    selectors: [
      { 
        type: 'css', 
        value: '[role="main"]',
        description: 'ChatGPT 메인 대화 영역'
      },
      { 
        type: 'css', 
        value: '.flex.h-full.w-full.flex-col',
        description: 'ChatGPT 대화 컨테이너 대체 선택자'
      }
    ],
    
    // 메시지 패턴
    pattern: {
      type: 'data-testid',
      messageSelector: '[data-testid^="conversation-turn-"]',
      messageIndicator: '.sr-only',  // h5 또는 h6 태그
      userText: '나의 말:',
      assistantText: 'ChatGPT의 말:'
    },
    
    // 특수 요소
    special: {
      thinking: {
        indicator: '[data-testid*="thinking"]',
        content: 'div'
      },
      codeBlock: 'pre code',
      table: 'table',
      copyButton: '[data-testid="copy-turn-action-button"]'
    },
    
    // UI 텍스트 패턴 (제거할 항목)
    uiPatterns: [
      /^Copy code$/,
      /^Copied!$/,
      /^Share$/,
      /^Edit$/,
      /^\d+\/\d+$/,
      /^ChatGPT$/
    ],
    
    // 콘텐츠 추출 설정
    extraction: {
      contentMarkers: {
        enabled: true,
        attributes: ['data-start', 'data-end']
      },
      codeBlock: {
        containerSelector: 'pre',
        codeSelector: 'code',
        wrapperSelector: '.contain-inline-size'
      }
    }
  }
};

// 현재 사이트 감지
function detectCurrentSite() {
  const hostname = window.location.hostname;
  
  for (const [key, site] of Object.entries(SITES)) {
    if (hostname.includes(site.domain)) {
      console.log(`[GPT Logger] ${site.name} 감지됨`);
      return { key, ...site };
    }
  }
  
  console.log('[GPT Logger] 지원하지 않는 사이트');
  return null;
}