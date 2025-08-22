(function() {
  // ===== 버전 정보 =====
  const VERSION = 'v4.1.1';
  const VERSION_DESC = 'Claude + ChatGPT 통합 지원 + Artifact 자동 다운로드 (개선)';
  const MADEBY = '🧠 hmcls';

  console.log(`🎯 LLM Chat Logger ${VERSION} - ${VERSION_DESC}!`);
  console.log(`제작: ${MADEBY}`);

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
    ARTIFACT: 'artifact',
    CANVAS: 'canvas',
    RESEARCH: 'research',
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
        case 'data-testid':
          qaPairs = extractDataTestId(container);
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
      
      // 아바타 제거는 각 추출 함수 내부에서 처리
      
      // 디버깅을 위한 추가 로그
      log(`Assistant div ${i + 1} 처리 시작`);
      log(`Assistant div className: ${assistantDiv.className}`);
      log(`Assistant div 내 artifact 수: ${assistantDiv.querySelectorAll('.artifact-block-cell').length}`);
      
      // 새로운 top-down 추출 방식 사용
      const assistantData = extractAssistantContentTopDown(assistantDiv);
      
      const qa = {
        index: Math.floor(i / currentSite.pattern.increment) + 1,
        human: extractContent(humanDiv, 'human'),
        contents: assistantData.contents,
        artifacts: assistantData.artifacts  // artifacts 추가
      };
      
      qaPairs.push(qa);
      log(`Q${qa.index} 추출 완료 (${assistantData.artifacts.length}개 artifacts)`);
    }
    
    return qaPairs;
  }
  
  // GPT 스타일: 턴 기반 (향후 구현)
  function extractTurnBased(container) {
    log('Turn-based 추출은 아직 구현되지 않았습니다');
    return [];
  }
  
  // ChatGPT 스타일: data-testid 기반
  function extractDataTestId(container) {
    log('=== ChatGPT data-testid 추출 시작 ===');
    
    // 모든 메시지 찾기
    const messages = container.querySelectorAll(currentSite.pattern.messageSelector);
    log(`총 ${messages.length}개의 메시지 발견`);
    
    const qaPairs = [];
    let currentPair = null;
    let pairIndex = 1;
    
    messages.forEach((message, index) => {
      const testId = message.getAttribute('data-testid') || '';
      log(`메시지 ${index}: data-testid="${testId}"`);
      
      // .sr-only 태그로 메시지 타입 확인 (h5 또는 h6)
      const srOnly = message.querySelector(currentSite.pattern.messageIndicator);
      const messageType = srOnly ? srOnly.textContent.trim() : '';
      log(`메시지 타입: "${messageType}"`);
      
      // 사용자 메시지인지 확인
      if (messageType === currentSite.pattern.userText) {
        // 이전 쌍이 있으면 저장
        if (currentPair && currentPair.contents.length > 0) {
          qaPairs.push(currentPair);
        }
        
        // 새로운 Q&A 쌍 시작
        currentPair = {
          index: pairIndex++,
          human: extractContent(message, 'human'),
          contents: []
        };
        log(`사용자 메시지 ${currentPair.index} 발견`);
      }
      // 어시스턴트 메시지인지 확인
      else if (messageType === currentSite.pattern.assistantText && currentPair) {
        // ChatGPT 스타일 콘텐츠 추출
        const assistantData = extractChatGPTContent(message);
        currentPair.contents = assistantData.contents;
        log(`어시스턴트 응답 추가 (${assistantData.contents.length}개 콘텐츠)`);
      }
    });
    
    // 마지막 쌍 저장
    if (currentPair && currentPair.contents.length > 0) {
      qaPairs.push(currentPair);
    }
    
    log(`총 ${qaPairs.length}개의 Q&A 쌍 추출 완료`);
    return qaPairs;
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
  
  // ===== 말풍선 레벨에서 아바타 제거 =====
  function removeAvatarFromBubble(bubbleElement) {
    if (!bubbleElement) return;
    
    // 아바타 컨테이너 제거 (Level 1)
    const avatarContainers = bubbleElement.querySelectorAll('.shrink-0');
    avatarContainers.forEach(container => {
      // 원형 아바타 포함 확인
      const hasAvatar = container.querySelector('.rounded-full');
      if (hasAvatar) {
        container.remove();
      }
    });
  }
  
  // ===== ChatGPT 콘텐츠 추출 =====
  function extractChatGPTContent(element) {
    if (!element) return { contents: [] };
    
    const contents = [];
    
    // ChatGPT 구조: div/div/div/div/div[1] 내부에 div[1], div[2], div[3]
    const mainContent = element.querySelector('div > div > div > div > div:first-child');
    if (!mainContent) {
      log('ChatGPT 메인 콘텐츠 영역을 찾을 수 없음');
      return { contents: [] };
    }
    
    // 각 하위 div를 순서대로 처리
    const contentDivs = Array.from(mainContent.children);
    log(`총 ${contentDivs.length}개의 콘텐츠 div 발견`);
    
    contentDivs.forEach((div, index) => {
      log(`=== div[${index + 1}] 처리 시작 ===`);
      
      // 복제해서 작업
      const clone = div.cloneNode(true);
      
      // UI 요소 제거
      removeUIElements(clone);
      
      // 버튼 영역 제거
      clone.querySelectorAll('[data-testid$="-action-button"]').forEach(el => el.remove());
      
      // 내용을 마크다운으로 변환
      const content = convertToMarkdownFull(clone).trim();
      
      if (!content) {
        log(`div[${index + 1}] 내용 없음, 건너뛰기`);
        return;
      }
      
      // 내용 분류
      if (index === 0 && content.length < 10) {
        // 짧은 첫 번째 div는 보통 장식용
        log(`div[1] 장식용 요소로 판단, 건너뛰기`);
        return;
      }
      
      // Thinking 패턴 확인
      if (content.includes('동안 생각함') || content.includes('Reasoned for') || 
          content.includes('thinking') || content.includes('추론')) {
        log(`div[${index + 1}] Thinking으로 분류`);
        contents.push({
          type: CONTENT_TYPES.THINKING,
          content: content
        });
      }
      // 나머지는 Answer
      else {
        log(`div[${index + 1}] Answer로 분류`);
        contents.push({
          type: CONTENT_TYPES.ANSWER,
          content: content
        });
      }
    });
    
    log(`총 ${contents.length}개의 콘텐츠 추출 완료`);
    return { contents };
  }
  
  // ===== v3.1.3 방식 + 마크다운 보존 =====
  function extractAssistantContentTopDown(element) {
    if (!element) return { contents: [], artifacts: [] };
    
    const extractConfig = currentSite.extraction;
    const contents = [];
    const artifacts = [];  // 새로운 배열 추가!
    
    // Phase 1: DOM을 수정하지 않고 노드 수집
    const nodes = [];
    
    // 먼저 artifact들을 찾아서 수집
    if (currentSite.special.artifacts?.enabled) {
      log(`Artifact 수집 시작. Element: ${element.tagName}, className: ${element.className}`);
      const artifactElements = element.querySelectorAll(currentSite.special.artifacts.containerSelector);
      log(`Assistant 메시지 내에서 ${artifactElements.length}개 artifacts 발견`);
      
      artifactElements.forEach((artifactEl, idx) => {
        log(`Artifact ${idx + 1} 처리 중...`);
        const artifactInfo = extractArtifactInfo(artifactEl);
        if (artifactInfo) {
          artifacts.push(artifactInfo);
          // 본문에 표시할 인디케이터 정보도 저장
          const indicator = currentSite.special.artifacts.indicatorFormat
            .replace('{title}', artifactInfo.title);
          contents.push({
            type: CONTENT_TYPES.ARTIFACT,
            content: indicator
          });
          log(`Artifact ${idx + 1} 추가됨: ${artifactInfo.title}`);
        } else {
          log(`Artifact ${idx + 1} 정보 추출 실패`);
        }
      });
    }
    
    function collectNodes(node, depth = 0) {
      // Thinking 블록 확인
      if (node.matches && node.matches(extractConfig.thinking.containerSelector)) {
        nodes.push({
          type: 'thinking',
          element: node,
          depth: depth
        });
        log(`Thinking 블록 수집 (depth: ${depth})`);
        // Thinking 내부는 재귀하지 않음
        return;
      }
      
      // 실제 콘텐츠가 있는 요소 확인 (div 내의 grid 구조)
      if (node.classList && node.classList.contains('grid-cols-1') && 
          node.classList.contains('grid') && 
          node.querySelector('p, h1, h2, h3, h4, h5, h6, ul, ol, blockquote')) {
        nodes.push({
          type: 'content',
          element: node,
          depth: depth
        });
        log(`콘텐츠 블록 수집 (depth: ${depth})`);
        return;
      }
      
      // 자식 노드 재귀 탐색
      for (const child of node.children) {
        collectNodes(child, depth + 1);
      }
    }
    
    // DOM 수집
    collectNodes(element);
    log(`총 ${nodes.length}개 노드 수집됨, ${artifacts.length}개 artifacts 발견`);
    
    // Phase 2: 수집된 노드를 순서대로 처리
    const processedThinking = new Set();
    
    nodes.forEach((node, index) => {
      log(`노드[${index}] 처리: ${node.type} (depth: ${node.depth})`);
      
      if (node.type === 'thinking') {
        // Thinking 내용 추출
        const clone = node.element.cloneNode(true);
        removeUIElements(clone);
        const content = extractThinkingContent(clone, extractConfig);
        
        if (content) {
          contents.push({
            type: CONTENT_TYPES.THINKING,
            content: content
          });
          processedThinking.add(node.element);
        }
      } else if (node.type === 'content') {
        // 이미 처리된 Thinking 블록 내부인지 확인
        let isInsideThinking = false;
        for (const thinking of processedThinking) {
          if (thinking.contains(node.element)) {
            isInsideThinking = true;
            break;
          }
        }
        
        if (!isInsideThinking) {
          // 일반 콘텐츠 처리 - 마크다운 보존
          const clone = node.element.cloneNode(true);
          removeUIElements(clone);
          const content = convertToMarkdownFull(clone);
          
          if (content.trim()) {
            // 이미 Answer가 있으면 합치기
            const lastContent = contents[contents.length - 1];
            if (lastContent && lastContent.type === CONTENT_TYPES.ANSWER) {
              lastContent.content += '\n\n' + content.trim();
            } else {
              contents.push({
                type: CONTENT_TYPES.ANSWER,
                content: content.trim()
              });
            }
          }
        }
      }
    });
    
    return { contents, artifacts };
  }
  
  // ===== Artifact 정보 추출 =====
  function extractArtifactInfo(element) {
    const artifactConfig = currentSite.special.artifacts;
    if (!artifactConfig || !artifactConfig.enabled) return null;
    
    try {
      // 제목 추출
      const titleElement = element.querySelector(artifactConfig.titleSelector);
      const title = titleElement ? titleElement.textContent.trim() : 'Untitled Artifact';
      
      // 서브타이틀 추출
      const subtitleElement = element.querySelector(artifactConfig.subtitleSelector);
      const subtitle = subtitleElement ? subtitleElement.textContent.trim() : '';
      
      // 고유 ID 생성
      const id = `artifact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      log(`Artifact 발견: ${title} (${subtitle})`);
      
      // 클릭 가능한 버튼 찾기 (artifact-block-cell의 부모)
      let clickableElement = element.parentElement;
      while (clickableElement && clickableElement.tagName !== 'BUTTON') {
        clickableElement = clickableElement.parentElement;
      }
      
      return {
        id,
        title,
        subtitle,
        element: element,  // artifact-block-cell 자체
        clickableElement: clickableElement || element.parentElement  // 클릭할 요소
      };
    } catch (error) {
      log('Artifact 정보 추출 실패:', error);
      return null;
    }
  }
  
  // ===== Element 타입 식별 =====
  function identifyElementType(element, config) {
    // Thinking 패턴 체크 - 더 유연하게
    if (config?.thinking?.enabled) {
      // 1. 직접 매치
      if (element.matches && element.matches(config.thinking.containerSelector)) {
        log('Thinking 블록 발견 (직접 매치)');
        return 'thinking';
      }
      
      // 2. 자식 요소 확인
      if (element.querySelector(config.thinking.containerSelector)) {
        log('Thinking 블록 발견 (자식 요소)');
        return 'thinking';
      }
      
      // 3. 텍스트 패턴으로 확인
      const text = element.textContent || '';
      if (text.includes('생각하고 있음') || text.includes('사고 과정')) {
        log('Thinking 블록 발견 (텍스트 패턴)');
        return 'thinking';
      }
    }
    
    // 텍스트 콘텐츠가 있으면 content
    if (element.textContent && element.textContent.trim()) {
      return 'content';
    }
    
    return 'unknown';
  }
  
  // ===== Thinking 콘텐츠 추출 (단순화) =====
  function extractThinkingContent(element, config) {
    // 직접 텍스트 찾기 또는 깊이 2-3단계까지만
    let contentElement = element.querySelector(config.thinking.contentSelector);
    
    if (!contentElement) {
      // 대체 선택자들 시도
      contentElement = element.querySelector('.font-claude-response') ||
                      element.querySelector('.overflow-hidden p') ||
                      element.querySelector('p');
    }
    
    if (contentElement) {
      return extractContent(contentElement, 'thinking');
    }
    
    // 못 찾으면 전체 텍스트
    return element.textContent.trim();
  }
  
  
  // ===== 확장된 HTML → 마크다운 변환 (모든 태그 지원) =====
  function convertToMarkdownFull(element) {
    // 먼저 코드 블록을 보존
    const codeBlocks = preserveCodeBlocks(element);
    
    let markdown = '';
    
    function processNode(node, listContext = null) {
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
            const items = node.querySelectorAll(':scope > li');
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
          
          case 'li':
            // 리스트 컨텍스트가 없을 때만 (중첩 방지)
            if (!listContext) {
              markdown += '- ';
              processChildren(node);
              markdown += '\n';
            }
            break;
          
          case 'blockquote':
            const lines = [];
            const tempMd = markdown;
            markdown = '';
            processChildren(node);
            const quotedText = markdown;
            markdown = tempMd;
            
            quotedText.split('\n').forEach(line => {
              if (line.trim()) {
                markdown += '> ' + line + '\n';
              }
            });
            markdown += '\n';
            break;
          
          case 'pre':
            // pre 태그는 preserveCodeBlocks에서 처리됨
            processChildren(node);
            break;
          
          case 'code':
            // 인라인 코드는 preserveCodeBlocks에서 처리됨
            if (!node.parentElement || node.parentElement.tagName !== 'PRE') {
              processChildren(node);
            }
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
          
          case 'a':
            markdown += '[';
            processChildren(node);
            markdown += `](${node.href || '#'})`;
            break;
          
          case 'img':
            const alt = node.alt || 'image';
            const src = node.src || '#';
            markdown += `![${alt}](${src})`;
            break;
          
          case 'hr':
            markdown += '\n---\n\n';
            break;
          
          case 'table':
            // 테이블을 마크다운으로 변환
            markdown += '\n' + convertTableToMarkdown(node) + '\n\n';
            break;
          
          case 'div':
          case 'span':
          case 'section':
          case 'article':
            processChildren(node);
            if (tag === 'div' && node.nextSibling) {
              markdown += '\n\n';
            }
            break;
          
          default:
            processChildren(node);
        }
      }
    }
    
    function processChildren(node, listContext = null) {
      Array.from(node.childNodes).forEach(child => {
        processNode(child, listContext);
      });
    }
    
    processNode(element);
    
    // 과도한 줄바꿈 정리
    markdown = markdown.replace(/\n{3,}/g, '\n\n');
    
    // 코드 블록 복원
    markdown = restoreCodeBlocks(markdown, codeBlocks);
    
    return markdown;
  }
  
  // 테이블을 마크다운으로 변환
  function convertTableToMarkdown(table) {
    const rows = Array.from(table.querySelectorAll('tr'));
    if (rows.length === 0) return '';
    
    let markdown = '';
    const headers = Array.from(rows[0].querySelectorAll('th, td')).map(cell => cell.textContent.trim());
    
    if (headers.length > 0) {
      markdown += '| ' + headers.join(' | ') + ' |\n';
      markdown += '| ' + headers.map(() => '---').join(' | ') + ' |\n';
      
      for (let i = 1; i < rows.length; i++) {
        const cells = Array.from(rows[i].querySelectorAll('td')).map(cell => cell.textContent.trim());
        if (cells.length > 0) {
          markdown += '| ' + cells.join(' | ') + ' |\n';
        }
      }
    }
    
    return markdown.trim();
  }
  
  // ===== 키워드 추출 =====
  function generateTitle(qaPairs) {
    // 1. 먼저 브라우저 탭 제목 확인
    let tabTitle = '';
    try {
      tabTitle = document.title
        .replace(/[\\/:"*?<>|]/g, '') // 파일명 금지 문자 제거
        .replace(/^(Claude|ChatGPT|Gemini)\s*[-–—]\s*/i, '') // LLM 이름 prefix 제거
        .trim();
      
      // 탭 제목이 충분히 의미있는지 확인 (5글자 이상)
      if (tabTitle && tabTitle.length > 5) {
        log(`탭 제목 사용: "${tabTitle}"`);
      } else {
        tabTitle = ''; // 너무 짧으면 사용하지 않음
      }
    } catch (e) {
      log('탭 제목 가져오기 실패:', e);
    }
    
    // 2. 키워드 추출 (폴백용)
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
    
    // 3. 최종 제목 결정 (탭 제목 우선)
    let title = '';
    if (tabTitle) {
      // 탭 제목이 있으면 우선 사용
      title = tabTitle;
      // 키워드가 있으면 보조 정보로 추가 (선택사항)
      // if (topKeywords.length > 0) {
      //   title = `${tabTitle}_${topKeywords[0]}`;
      // }
    } else if (topKeywords.length > 0) {
      // 탭 제목이 없으면 키워드 사용
      title = topKeywords.join('_');
    } else {
      // 둘 다 없으면 첫 질문 일부 사용
      const firstTopic = qaPairs[0]?.human.substring(0, 30).replace(/[^가-힣a-zA-Z0-9\s]/g, '').trim() || '';
      title = firstTopic || 'LLM_Chat';
    }
    
    // 4. 주제 설명 (요약용)
    let subject = '';
    if (tabTitle) {
      subject = tabTitle;
      if (topKeywords.length > 0) {
        subject += ` (${topKeywords.join(', ')})`;
      }
    } else if (topKeywords.length > 0) {
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
    const version = VERSION;
    
    let markdown = `# ${currentSite.name} 대화 - ${dateStr}\n\n`;
    
    // 제목 정보
    const { title, subject, topKeywords, summaryKeywords } = generateTitle(qaPairs);
    
    markdown += `## 📊 대화 요약\n`;
    markdown += `- **URL**: ${window.location.href}\n`;
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
            // Thinking 헤더와 들여쓰기
            markdown += `### 💭 Thinking:\n\n`;
            const thinkingIndented = item.content.split('\n').map(line => '\t' + line).join('\n');
            markdown += thinkingIndented + '\n\n';
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
              // 짧은 Answer가 Thinking 바로 뒤에 와도 일반 텍스트로
              markdown += `${item.content}\n\n`;
              
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
    const version = VERSION;
    
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
  
  // ===== Artifact 다운로드 트리거 =====
  async function downloadArtifacts(artifacts) {
    if (!artifacts || artifacts.length === 0) return;
    
    log(`${artifacts.length}개 artifacts 다운로드 시작`);
    
    // 중복 제거 - 같은 제목은 최신 버전만
    const uniqueArtifacts = {};
    artifacts.forEach(artifact => {
      if (!uniqueArtifacts[artifact.title] || 
          artifacts.indexOf(artifact) > artifacts.indexOf(uniqueArtifacts[artifact.title])) {
        uniqueArtifacts[artifact.title] = artifact;
      }
    });
    
    const artifactsToDownload = Object.values(uniqueArtifacts);
    log(`중복 제거 후 ${artifactsToDownload.length}개 artifacts 다운로드 예정`);
    
    for (let i = 0; i < artifactsToDownload.length; i++) {
      const artifact = artifactsToDownload[i];
      
      try {
        log(`\n=== Artifact ${i + 1}/${artifactsToDownload.length}: ${artifact.title} ===`);
        
        // 1. artifact 클릭하여 열기
        if (artifact.clickableElement) {
          artifact.clickableElement.click();
          log(`1. Artifact 열기 클릭 완료`);
        } else {
          log(`클릭 요소를 찾을 수 없음, 건너뜀`);
          continue;
        }
        
        // 열릴 때까지 대기
        await sleep(1500);
        
        // 2. 3점 메뉴 버튼 찾기 (다양한 시도)
        let menuButton = null;
        const menuSelectors = [
          'button[aria-label*="menu"]',
          'button[aria-label*="Menu"]',
          'button[aria-label*="메뉴"]',
          'button.absolute.right-2.top-2', // 위치 기반
          'button[class*="absolute"][class*="right"]',
          '[role="button"][aria-label*="options"]'
        ];
        
        for (const selector of menuSelectors) {
          menuButton = document.querySelector(selector);
          if (menuButton) {
            log(`2. 메뉴 버튼 찾음: ${selector}`);
            break;
          }
        }
        
        if (!menuButton) {
          // iframe 내부에서도 시도
          const iframe = document.querySelector('iframe[title="Claude 콘텐츠"]');
          if (iframe && iframe.contentDocument) {
            for (const selector of menuSelectors) {
              menuButton = iframe.contentDocument.querySelector(selector);
              if (menuButton) {
                log(`2. 메뉴 버튼 찾음 (iframe 내부): ${selector}`);
                break;
              }
            }
          }
        }
        
        if (menuButton) {
          menuButton.click();
          log(`3. 메뉴 버튼 클릭 완료`);
          await sleep(500);
          
          // 3. 다운로드 옵션 찾기
          let downloadLink = null;
          const downloadSelectors = [
            'a[href*="download"]',
            'a:contains("다운로드")',
            'a:contains("Download")',
            '[role="menuitem"]:contains("다운로드")',
            '[role="menuitem"]:contains("Download")'
          ];
          
          for (const selector of downloadSelectors) {
            try {
              // jQuery 스타일 :contains 대신 텍스트 검색
              if (selector.includes(':contains')) {
                const searchText = selector.match(/:contains\("(.+?)"\)/)[1];
                const links = document.querySelectorAll('a, [role="menuitem"]');
                downloadLink = Array.from(links).find(link => 
                  link.textContent.includes(searchText)
                );
              } else {
                downloadLink = document.querySelector(selector);
              }
              
              if (downloadLink) {
                log(`4. 다운로드 링크 찾음: ${selector}`);
                break;
              }
            } catch (e) {
              // 계속 시도
            }
          }
          
          if (downloadLink) {
            downloadLink.click();
            log(`5. 다운로드 시작됨`);
          } else {
            log(`다운로드 옵션을 찾을 수 없음`);
          }
          
        } else {
          log(`메뉴 버튼을 찾을 수 없음`);
        }
        
        // 다음 artifact 처리 전 대기
        await sleep(2000);
        
      } catch (error) {
        log(`Artifact 다운로드 중 오류:`, error);
      }
    }
    
    log(`\n=== 모든 Artifact 다운로드 완료 ===`);
  }
  
  // Sleep 헬퍼 함수
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // ===== 저장 함수 =====
  async function saveConversation() {
    log('=== 저장 시작 ===');
    
    try {
      const qaPairs = extractConversation();
      
      if (qaPairs.length === 0) {
        logError('004', 'Q&A를 추출할 수 없습니다');
        alert('대화를 추출할 수 없습니다. 콘솔을 확인하세요.');
        return;
      }
      
      // 모든 artifacts 수집
      const allArtifacts = [];
      qaPairs.forEach(qa => {
        if (qa.artifacts && qa.artifacts.length > 0) {
          allArtifacts.push(...qa.artifacts);
        }
      });
      
      log(`총 ${allArtifacts.length}개 artifacts 발견`);
      
      // 마크다운 생성
      const { markdown: fullMarkdown, title } = generateMarkdown(qaPairs);
      const questionsMarkdown = generateQuestionsOnlyMarkdown(qaPairs);
      
      // 파일명 생성
      const date = new Date().toISOString().split('T')[0];
      const safeTitle = title.substring(0, 50).replace(/[^가-힣a-zA-Z0-9_]/g, '');
      
      // 파일 1: 전체 대화
      const fullBlob = new Blob([fullMarkdown], { type: 'text/markdown;charset=utf-8' });
      const fullUrl = URL.createObjectURL(fullBlob);
      const fullFilename = `${date}_${safeTitle}_full_${VERSION}.md`;
      
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
        const questionsFilename = `${date}_${safeTitle}_questions_${VERSION}.md`;
        
        const a2 = document.createElement('a');
        a2.href = questionsUrl;
        a2.download = questionsFilename;
        document.body.appendChild(a2);
        a2.click();
        document.body.removeChild(a2);
        
        URL.revokeObjectURL(questionsUrl);
      }, 100);
      
      URL.revokeObjectURL(fullUrl);
      
      // Artifacts 다운로드 (대화 파일 저장 후)
      if (allArtifacts.length > 0) {
        await sleep(200);
        await downloadArtifacts(allArtifacts);
      }
      
      const artifactMsg = allArtifacts.length > 0 ? ` + ${allArtifacts.length}개 artifacts` : '';
      showToast(`✅ ${qaPairs.length}개 Q&A 2개 파일로 저장 완료${artifactMsg}!`);
      
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