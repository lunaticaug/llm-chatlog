(function() {
  console.log('🎯 LLM Chat Logger v3.1.3 - DOM 순서 보존 개선!');
  
  // ===== 전역 변수 =====
  let DEBUG = true;
  let currentSite = null;
  
  // OS 감지
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modifierKey = isMac ? 'metaKey' : 'ctrlKey';
  const modifierKeyName = isMac ? 'Cmd' : 'Ctrl';
  
  // ===== 콘텐츠 타입 정의 =====
  const CONTENT_TYPES = {
    THINKING: 'thinking',
    ANSWER: 'answer',
    SEARCH: 'search',     // 향후 확장
    TOOL: 'tool'          // 향후 확장
  };
  
  // ===== 유틸리티 함수 =====
  function log(...args) {
    if (DEBUG) console.log('[LLM Logger]', ...args);
  }
  
  function logError(code, message, details = {}) {
    console.error(`[LLM-ERROR-${code}]`, message, details);
  }
  
  // ===== DOM 유틸리티 =====
  function findContainer(selectors) {
    for (const selector of selectors) {
      let element = null;
      
      if (selector.type === 'xpath') {
        const result = document.evaluate(
          selector.value, 
          document, 
          null, 
          XPathResult.FIRST_ORDERED_NODE_TYPE, 
          null
        );
        element = result.singleNodeValue;
      } else if (selector.type === 'css') {
        element = document.querySelector(selector.value);
      }
      
      if (element) {
        log(`컨테이너 발견: ${selector.description}`);
        return element;
      }
    }
    
    return null;
  }
  
  function removeUIElements(element) {
    // 버튼 제거
    element.querySelectorAll('button').forEach(el => el.remove());
    
    // SVG 아이콘 제거
    element.querySelectorAll('svg').forEach(el => el.remove());
    
    // 사용자/AI 아바타 제거 (더 포괄적인 선택자)
    // 1. data-testid="user-message"의 부모 컨테이너에서 첫 번째 div 제거
    const userMessages = element.querySelectorAll('[data-testid="user-message"]');
    userMessages.forEach(msg => {
      const container = msg.closest('.flex.flex-row.gap-2');
      if (container) {
        const avatar = container.querySelector('.shrink-0');
        if (avatar) avatar.remove();
      }
    });
    
    // 2. 백업: 원형 아바타 직접 제거 (1-2글자 대문자 패턴)
    element.querySelectorAll('.rounded-full').forEach(el => {
      if (el.textContent.match(/^[A-Z]{1,2}$/) || el.textContent.match(/^🤖$/)) {
        // 부모의 shrink-0 컨테이너 전체 제거
        const shrinkContainer = el.closest('.shrink-0');
        if (shrinkContainer) {
          shrinkContainer.remove();
        } else {
          el.remove();
        }
      }
    });
    
    // 시간 표시 등 제거
    element.querySelectorAll('.text-text-300').forEach(el => {
      const text = el.textContent;
      if (text.match(/^\d+\s?(초|분|시간)$/)) {
        el.remove();
      }
    });
  }
  
  function isUIText(text) {
    return currentSite.uiPatterns.some(pattern => pattern.test(text));
  }
  
  // ===== 메인 추출 함수 =====
  function extractConversation() {
    log('=== 대화 추출 시작 ===');
    
    try {
      // 1. 컨테이너 찾기
      const container = findContainer(currentSite.selectors);
      if (!container) {
        logError('001', '대화 컨테이너를 찾을 수 없습니다');
        return [];
      }
      
      // 2. 패턴에 따라 메시지 추출
      let qaPairs = [];
      
      switch (currentSite.pattern.type) {
        case 'sequential-pairs':
          qaPairs = extractSequentialPairs(container);
          break;
        case 'turn-based':
          qaPairs = extractTurnBased(container);
          break;
        default:
          logError('002', `알 수 없는 패턴 타입: ${currentSite.pattern.type}`);
          return [];
      }
      
      log(`총 ${qaPairs.length}개의 Q&A 추출 완료`);
      return qaPairs;
      
    } catch (error) {
      logError('003', '추출 중 예외 발생', error);
      return [];
    }
  }
  
  // Claude 스타일: 연속된 div 쌍
  function extractSequentialPairs(container) {
    const childDivs = Array.from(container.children).filter(el => el.tagName === 'DIV');
    log(`총 ${childDivs.length}개의 div 발견`);
    
    const qaPairs = [];
    
    for (let i = 0; i < childDivs.length - 1; i += currentSite.pattern.increment) {
      const humanDiv = childDivs[i];
      const assistantDiv = childDivs[i + 1];
      
      // 시스템 메시지 체크
      if (!humanDiv.querySelector(currentSite.pattern.userCheck)) {
        log(`div[${i}]는 시스템 메시지, 건너뜀`);
        break;
      }
      
      // 새로운 추출 방식 사용
      const assistantData = extractAssistantContent(assistantDiv);
      
      const qa = {
        index: Math.floor(i / currentSite.pattern.increment) + 1,
        human: extractContent(humanDiv, 'human'),
        contents: assistantData.contents  // 순서 그대로 유지
      };
      
      qaPairs.push(qa);
      log(`Q${qa.index} 추출 완료`);
    }
    
    return qaPairs;
  }
  
  // GPT 스타일: 턴 기반 (향후 구현)
  function extractTurnBased(container) {
    log('Turn-based 추출은 아직 구현되지 않았습니다');
    return [];
  }
  
  // ===== 콘텐츠 추출 =====
  function extractContent(element, type) {
    if (!element) return '';
    
    // 복제해서 작업
    const clone = element.cloneNode(true);
    
    // UI 요소 제거
    removeUIElements(clone);
    
    // 코드 블록 보존
    const codeBlocks = preserveCodeBlocks(clone);
    
    // HTML을 마크다운으로 변환
    const markdown = convertToMarkdown(clone);
    
    // 코드 블록 복원
    const finalText = restoreCodeBlocks(markdown, codeBlocks);
    
    return finalText.trim();
  }
  
  // ===== 코드 블록 처리 =====
  function preserveCodeBlocks(element) {
    const blocks = [];
    
    // pre > code 블록
    element.querySelectorAll('pre').forEach((pre, idx) => {
      const code = pre.querySelector('code');
      const lang = code?.className?.match(/language-(\w+)/)?.[1] || '';
      const content = code?.textContent || pre.textContent;
      
      const placeholder = `__CODE_BLOCK_${idx}__`;
      blocks.push({
        placeholder,
        content: `\`\`\`${lang}\n${content}\n\`\`\``
      });
      
      pre.textContent = placeholder;
    });
    
    // 인라인 코드
    element.querySelectorAll('code:not(pre code)').forEach((code, idx) => {
      const placeholder = `__INLINE_${idx}__`;
      blocks.push({
        placeholder,
        content: `\`${code.textContent}\``
      });
      
      code.textContent = placeholder;
    });
    
    return blocks;
  }
  
  function restoreCodeBlocks(text, blocks) {
    blocks.forEach(({ placeholder, content }) => {
      text = text.replace(placeholder, content);
    });
    return text;
  }
  
  // ===== HTML → 마크다운 변환 =====
  function convertToMarkdown(element) {
    let markdown = '';
    
    function processNode(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        if (!isUIText(text.trim())) {
          markdown += text;
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = node.tagName.toLowerCase();
        
        switch(tag) {
          case 'p':
            processChildren(node);
            markdown += '\n\n';
            break;
          
          case 'br':
            markdown += '\n';
            break;
          
          case 'h1':
          case 'h2':
          case 'h3':
          case 'h4':
          case 'h5':
          case 'h6':
            const level = parseInt(tag[1]);
            markdown += '\n' + '#'.repeat(level) + ' ';
            processChildren(node);
            markdown += '\n\n';
            break;
          
          case 'ul':
          case 'ol':
            markdown += '\n';
            const items = node.querySelectorAll('li');
            items.forEach((li, idx) => {
              if (tag === 'ul') {
                markdown += '- ';
              } else {
                markdown += `${idx + 1}. `;
              }
              processChildren(li);
              markdown += '\n';
            });
            markdown += '\n';
            break;
          
          case 'blockquote':
            markdown += '\n> ';
            processChildren(node);
            markdown += '\n\n';
            break;
          
          case 'strong':
          case 'b':
            markdown += '**';
            processChildren(node);
            markdown += '**';
            break;
          
          case 'em':
          case 'i':
            markdown += '*';
            processChildren(node);
            markdown += '*';
            break;
          
          case 'div':
            processChildren(node);
            if (node.nextSibling) {
              markdown += '\n\n';
            }
            break;
          
          default:
            processChildren(node);
        }
      }
    }
    
    function processChildren(node) {
      Array.from(node.childNodes).forEach(child => {
        processNode(child);
      });
    }
    
    processNode(element);
    
    // 과도한 줄바꿈 정리
    markdown = markdown.replace(/\n{3,}/g, '\n\n');
    
    return markdown;
  }
  
  // ===== Assistant 콘텐츠 분리 추출 =====
  function extractAssistantContent(element) {
    if (!element) return { contents: [] };
    
    const extractConfig = currentSite.extraction;
    const contents = [];
    
    // 복제해서 작업
    const clone = element.cloneNode(true);
    
    // 1단계: DOM을 수정하지 않고 모든 노드 정보 수집
    const nodes = [];
    
    // DOM 순회하며 노드 수집 (수정 없이)
    const collectNodes = (node, depth = 0) => {
      // Thinking 블록 체크
      if (extractConfig?.thinking?.enabled && 
          node.matches && 
          node.matches(extractConfig.thinking.containerSelector)) {
        
        nodes.push({
          type: 'thinking',
          element: node,
          depth: depth
        });
        
        // Thinking 내부는 더 이상 순회하지 않음
        return;
      }
      
      // 텍스트 콘텐츠가 있는 요소 체크
      const hasTextContent = node.textContent && node.textContent.trim();
      const isContentElement = node.tagName === 'P' || node.tagName === 'DIV' || node.tagName === 'SPAN';
      
      if (hasTextContent && isContentElement && node.children.length === 0) {
        // 리프 노드로 텍스트가 있는 경우
        nodes.push({
          type: 'content',
          element: node,
          depth: depth
        });
      }
      
      // 자식 노드 재귀 순회
      if (node.children && node.children.length > 0) {
        Array.from(node.children).forEach(child => {
          collectNodes(child, depth + 1);
        });
      }
    };
    
    // 최상위부터 수집 시작
    Array.from(clone.children).forEach(child => {
      collectNodes(child, 0);
    });
    
    // 2단계: 수집된 노드들을 순서대로 처리
    const processedThinking = new Set(); // 처리된 Thinking 블록 추적
    
    nodes.forEach(nodeInfo => {
      if (nodeInfo.type === 'thinking') {
        // Thinking 콘텐츠 추출
        let contentElement = null;
        const node = nodeInfo.element;
        
        // 1. 숨겨진 상태 (접힌 상태)
        const hiddenContent = node.querySelector(extractConfig.thinking.hiddenContentSelector);
        if (hiddenContent) {
          contentElement = hiddenContent.querySelector(extractConfig.thinking.contentSelector);
        }
        
        // 2. 펼쳐진 상태
        if (!contentElement) {
          const expandedContent = node.querySelector('.overflow-hidden:not([style*="height: 0"])');
          if (expandedContent) {
            contentElement = expandedContent.querySelector(extractConfig.thinking.contentSelector);
          }
        }
        
        if (contentElement) {
          const thinkingContent = extractContent(contentElement, 'thinking');
          if (thinkingContent.trim()) {
            contents.push({
              type: CONTENT_TYPES.THINKING,
              content: thinkingContent
            });
            processedThinking.add(node);
          }
        }
      } else if (nodeInfo.type === 'content') {
        // Thinking의 자식이 아닌지 확인
        const isThinkingChild = Array.from(processedThinking).some(thinkingNode => 
          thinkingNode.contains(nodeInfo.element)
        );
        
        if (!isThinkingChild) {
          const content = nodeInfo.element.textContent.trim();
          if (content) {
            // 이미 추가된 Answer와 합칠 수 있는지 확인
            const lastContent = contents[contents.length - 1];
            if (lastContent && lastContent.type === CONTENT_TYPES.ANSWER) {
              // 같은 깊이의 연속된 content는 합치기
              lastContent.content += '\n\n' + content;
            } else {
              contents.push({
                type: CONTENT_TYPES.ANSWER,
                content: content
              });
            }
          }
        }
      }
    });
    
    return { contents };
  }
  
  
  // ===== 키워드 추출 =====
  function generateTitle(qaPairs) {
    const keywords = {};
    
    qaPairs.forEach(qa => {
      extractKeywords(qa.human, keywords, 2);  // 질문에 더 높은 가중치
      // 새로운 contents 구조에서 answer 추출
      if (qa.contents) {
        qa.contents.forEach(item => {
          if (item.type === CONTENT_TYPES.ANSWER) {
            extractKeywords(item.content, keywords, 1);
          }
        });
      }
    });
    
    function extractKeywords(text, keywordMap, weight) {
      // 코드 블록 제거
      let cleanText = text;
      cleanText = cleanText.replace(/```[\s\S]*?```/g, '');
      cleanText = cleanText.replace(/`[^`]+`/g, '');
      
      // 한글 단어만 추출
      const words = cleanText.match(/[가-힣]+/g) || [];
      
      words.forEach(word => {
        let cleanWord = cleanKoreanWord(word);
        
        // 2글자 이상이고 stopWords에 없는 단어만
        if (cleanWord.length > 1 && !KOREAN_FILTERS.stopWords.includes(cleanWord)) {
          keywordMap[cleanWord] = (keywordMap[cleanWord] || 0) + weight;
        }
      });
    }
    
    // 기본 빈도 조정
    const adjustedKeywords = adjustBaselineFrequency(keywords, qaPairs.length);
    
    // 빈도순 정렬
    const sortedKeywords = Object.entries(adjustedKeywords)
      .sort((a, b) => b[1] - a[1]);
    
    // 제목용 상위 3개
    const topKeywords = sortedKeywords.slice(0, 3).map(([word]) => word);
    
    // 요약용 상위 15개
    const summaryKeywords = sortedKeywords.slice(0, 15).map(([word]) => word);
    
    // 제목 생성
    let title = '';
    if (topKeywords.length > 0) {
      title = topKeywords.join('_');
    } else {
      const firstTopic = qaPairs[0]?.human.substring(0, 30).replace(/[^가-힣a-zA-Z0-9\s]/g, '').trim() || '';
      title = firstTopic || 'LLM_Chat';
    }
    
    // 주제 설명
    let subject = '';
    if (topKeywords.length > 0) {
      subject = `${topKeywords.join(', ')} 관련 대화`;
    } else {
      subject = qaPairs[0]?.human.substring(0, 50).replace(/[^가-힣a-zA-Z0-9\s]/g, '').trim() || 'LLM과의 대화';
    }
    
    return { 
      title, 
      subject, 
      topKeywords,
      summaryKeywords 
    };
  }
  
  // ===== 메시지 분류 =====
  function classifyMessage(text) {
    if (!text) return '';
    
    const length = text.length;
    
    // 긴 메시지 우선
    if (length > 500 || text.includes('```')) return '⭐';
    
    // 패턴 매칭
    const patterns = KOREAN_FILTERS.messagePatterns;
    if (patterns.correction.test(text)) return '⚠️';
    if (patterns.agreement.test(text) && length < 100) return '✅';
    if (patterns.suggestion.test(text)) return '💡';
    if (patterns.error.test(text)) return '🔧';
    if (length < 100) return '❓';
    
    return '';
  }
  
  // ===== 마크다운 생성 =====
  function generateMarkdown(qaPairs) {
    const date = new Date();
    const dateStr = date.toLocaleString('ko-KR');
    const version = 'v3.1.3';
    
    let markdown = `# ${currentSite.name} 대화 - ${dateStr}\n\n`;
    
    // 제목 정보
    const { title, subject, topKeywords, summaryKeywords } = generateTitle(qaPairs);
    
    markdown += `## 📊 대화 요약\n`;
    markdown += `- **총 대화**: ${qaPairs.length}세트\n`;
    markdown += `- **주제**: ${subject}\n`;
    if (summaryKeywords.length > 0) {
      markdown += `- **주요 키워드**:\n`;
      for (let i = 0; i < summaryKeywords.length; i += 3) {
        const lineKeywords = summaryKeywords.slice(i, i + 3).join(', ');
        markdown += `  - ${lineKeywords}\n`;
      }
    }
    markdown += `- **일시**: ${dateStr}\n`;
    markdown += `- **버전**: ${version}\n`;
    markdown += `- **플랫폼**: ${currentSite.name}\n\n`;
    markdown += `---\n\n`;
    
    // Q&A 쌍들
    qaPairs.forEach((qa) => {
      const emoji = classifyMessage(qa.human);
      
      markdown += `# Q${qa.index} ${emoji}\n\n`;
      
      // Human
      markdown += `## 👤 Human: ${emoji}\n\n`;
      const humanIndented = qa.human.split('\n').map(line => '\t' + line).join('\n');
      markdown += humanIndented + '\n\n';
      
      // Assistant
      markdown += `## 🤖 ${currentSite.name}:\n\n`;
      
      // 새로운 contents 배열 처리
      if (qa.contents && qa.contents.length > 0) {
        let lastWasThinking = false;
        
        qa.contents.forEach((item, idx) => {
          if (item.type === CONTENT_TYPES.THINKING) {
            markdown += `> ### 💭 Thinking:\n`;
            const thinkingLines = item.content.split('\n').map(line => '> ' + line).join('\n');
            markdown += thinkingLines + '\n\n';
            lastWasThinking = true;
            
          } else if (item.type === CONTENT_TYPES.ANSWER) {
            const threshold = currentSite.extraction?.mergeThreshold || 100;
            
            // 길이와 위치에 따라 포맷 결정
            if (item.content.length > threshold) {
              // 긴 Answer는 헤딩 포함
              markdown += `### 💬 Answer:\n\n`;
              const answerIndented = item.content.split('\n').map(line => '\t' + line).join('\n');
              markdown += answerIndented + '\n\n';
              lastWasThinking = false;
              
            } else if (lastWasThinking) {
              // 짧은 Answer가 Thinking 바로 뒤에 오면 인용 블록 안에
              markdown += `> ${item.content}\n\n`;
              
            } else {
              // 그 외 짧은 Answer는 일반 텍스트로
              markdown += `${item.content}\n\n`;
            }
          }
        });
      } else {
        markdown += `\t*(답변 없음)*\n`;
      }
      
      markdown += '\n---\n\n';
    });
    
    return { markdown, title };
  }
  
  // 질문만 마크다운
  function generateQuestionsOnlyMarkdown(qaPairs) {
    const date = new Date();
    const dateStr = date.toLocaleString('ko-KR');
    const version = 'v3.1.3';
    
    let markdown = `# ${currentSite.name} 질문 목록 - ${dateStr}\n\n`;
    markdown += `## 📋 요약\n`;
    markdown += `- **총 질문 수**: ${qaPairs.length}개\n`;
    markdown += `- **일시**: ${dateStr}\n`;
    markdown += `- **버전**: ${version}\n\n`;
    markdown += `---\n\n`;
    
    qaPairs.forEach((qa) => {
      markdown += `## Q${qa.index}.\n\n`;
      markdown += qa.human + '\n\n';
      markdown += `---\n\n`;
    });
    
    return markdown;
  }
  
  // ===== 저장 함수 =====
  function saveConversation() {
    log('=== 저장 시작 ===');
    
    try {
      const qaPairs = extractConversation();
      
      if (qaPairs.length === 0) {
        logError('004', 'Q&A를 추출할 수 없습니다');
        alert('대화를 추출할 수 없습니다. 콘솔을 확인하세요.');
        return;
      }
      
      // 마크다운 생성
      const { markdown: fullMarkdown, title } = generateMarkdown(qaPairs);
      const questionsMarkdown = generateQuestionsOnlyMarkdown(qaPairs);
      
      // 파일명 생성
      const date = new Date().toISOString().split('T')[0];
      const safeTitle = title.substring(0, 50).replace(/[^가-힣a-zA-Z0-9_]/g, '');
      
      // 파일 1: 전체 대화
      const fullBlob = new Blob([fullMarkdown], { type: 'text/markdown;charset=utf-8' });
      const fullUrl = URL.createObjectURL(fullBlob);
      const fullFilename = `${date}_${safeTitle}_full_v3.1.3.md`;
      
      const a1 = document.createElement('a');
      a1.href = fullUrl;
      a1.download = fullFilename;
      document.body.appendChild(a1);
      a1.click();
      document.body.removeChild(a1);
      
      // 파일 2: 질문만 (약간의 지연)
      setTimeout(() => {
        const questionsBlob = new Blob([questionsMarkdown], { type: 'text/markdown;charset=utf-8' });
        const questionsUrl = URL.createObjectURL(questionsBlob);
        const questionsFilename = `${date}_${safeTitle}_questions_v3.1.3.md`;
        
        const a2 = document.createElement('a');
        a2.href = questionsUrl;
        a2.download = questionsFilename;
        document.body.appendChild(a2);
        a2.click();
        document.body.removeChild(a2);
        
        URL.revokeObjectURL(questionsUrl);
      }, 100);
      
      URL.revokeObjectURL(fullUrl);
      
      showToast(`✅ ${qaPairs.length}개 Q&A 2개 파일로 저장 완료!`);
      
    } catch (error) {
      logError('005', '저장 중 오류', error);
      alert('저장 중 오류가 발생했습니다.');
    }
  }
  
  // ===== UI 함수 =====
  function showToast(message) {
    const existing = document.querySelector('.llm-logger-toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'llm-logger-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #4CAF50;
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 999999;
      font-size: 16px;
      font-family: -apple-system, sans-serif;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.remove(), 3000);
  }
  
  // ===== 초기화 =====
  function init() {
    // 사이트 감지
    currentSite = detectCurrentSite();
    
    if (!currentSite) {
      console.log('[LLM Logger] 이 사이트는 지원하지 않습니다.');
      return;
    }
    
    // 단축키 등록
    document.addEventListener('keydown', (e) => {
      // 저장: Cmd/Ctrl + S
      if (e[modifierKey] && e.key === 's') {
        e.preventDefault();
        saveConversation();
      }
      
      // 디버그 토글: Cmd/Ctrl + Shift + D
      if (e[modifierKey] && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        DEBUG = !DEBUG;
        showToast(`디버그 모드: ${DEBUG ? 'ON' : 'OFF'}`);
      }
    });
    
    // 초기화 메시지
    const platform = isMac ? 'Mac' : 'Windows';
    const saveShortcut = `${modifierKeyName}+S`;
    const debugShortcut = `${modifierKeyName}+Shift+D`;
    
    log(`준비 완료! ${platform} 환경, ${currentSite.name} 사이트`);
    log(`${saveShortcut}로 저장, ${debugShortcut}로 디버그 토글`);
    
    showToast(`LLM Logger 활성화! ${saveShortcut}로 저장`);
  }
  
  // 실행
  init();
})();