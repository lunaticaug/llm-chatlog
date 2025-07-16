// 플랫폼별 DOM 구조 정보
const SITES = {
  claude: {
    name: 'Claude',
    domain: 'claude.ai',
    
    // 컨테이너 선택자 (우선순위대로)
    selectors: [
      { 
        type: 'xpath', 
        value: '/html/body/div[2]/div[2]/div/div[1]/div/div/div[1]',
        description: 'Claude 대화 컨테이너 기본 경로'
      },
      { 
        type: 'css', 
        value: '.flex-1.flex.flex-col.gap-3.px-4.max-w-3xl.mx-auto.w-full',
        description: 'Claude 대화 컨테이너 클래스'
      }
    ],
    
    // 메시지 패턴
    pattern: {
      type: 'sequential-pairs',  // div[0]=user, div[1]=claude 패턴
      userCheck: 'button',       // 사용자 메시지는 편집 버튼 포함
      increment: 2               // 2개씩 증가
    },
    
    // 특수 요소
    special: {
      thinking: {
        indicator: 'span.text-text-300',
        indicatorText: '생각하고 있음:',
        expanded: 'div',
        expandedText: '사고 과정',
        content: 'p.whitespace-normal'
      },
      artifacts: '[data-artifact]',
      citations: 'antml\\:cite'
    },
    
    // UI 텍스트 패턴 (제거할 항목)
    uiPatterns: [
      /^편집$/,
      /^Copy$/,
      /^Retry$/,
      /^재시도$/,
      /^\d+\s?(초|분|시간|일)$/
    ],
    
    // 콘텐츠 추출 설정
    extraction: {
      thinking: {
        enabled: true,
        containerSelector: '.transition-all.duration-400.rounded-lg.border-0\\.5',
        hiddenContentSelector: '.overflow-hidden[style*="height: 0"]',
        contentSelector: '.font-claude-response',
        summarySelector: '.text-text-300'  // "Analyzed..." 요약 텍스트
      },
      mergeThreshold: 100  // 100자 이하 answer는 thinking에 병합
    }
  }
};

// 현재 사이트 감지
function detectCurrentSite() {
  const hostname = window.location.hostname;
  
  for (const [key, site] of Object.entries(SITES)) {
    if (hostname.includes(site.domain)) {
      console.log(`[LLM Logger] ${site.name} 감지됨`);
      return { key, ...site };
    }
  }
  
  console.log('[LLM Logger] 지원하지 않는 사이트');
  return null;
}