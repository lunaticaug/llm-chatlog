(function() {
  console.log('🎯 Claude Chat Logger v2.11 - Mac/Windows 호환 + 2파일 동시저장!');
  
  // 전역 변수
  let DEBUG = true; // 디버그 모드
  
  // OS 감지
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modifierKey = isMac ? 'metaKey' : 'ctrlKey'; // Mac은 Cmd, Windows는 Ctrl
  const modifierKeyName = isMac ? 'Cmd' : 'Ctrl';
  
  // 로그 함수
  function log(...args) {
    if (DEBUG) console.log('[CCL]', ...args);
  }
  
  // 에러 로그
  function logError(code, message, details = {}) {
    console.error(`[CCL-ERROR-${code}]`, message, details);
  }
  
  // 메인 추출 함수
  function extractConversation() {
    log('=== 대화 추출 시작 ===');
    
    try {
      // 1. 전체 대화 컨테이너 찾기
      const container = findConversationContainer();
      if (!container) {
        logError('001', '대화 컨테이너를 찾을 수 없습니다');
        return [];
      }
      
      // 2. 직계 자식 div들 가져오기
      const childDivs = Array.from(container.children).filter(el => el.tagName === 'DIV');
      log(`총 ${childDivs.length}개의 div 발견`);
      
      // 3. Q&A 쌍으로 변환
      const qaPairs = [];
      for (let i = 0; i < childDivs.length - 1; i += 2) {
        const humanDiv = childDivs[i];
        const claudeDiv = childDivs[i + 1];
        
        // 시스템 메시지 체크 (편집 버튼 없음)
        if (!humanDiv.querySelector('button')) {
          log(`div[${i}]는 시스템 메시지, 건너뜀`);
          break;
        }
        
        const qa = {
          index: Math.floor(i / 2) + 1,
          human: extractContent(humanDiv, 'human'),
          claude: extractContent(claudeDiv, 'claude'),
          thinking: extractThinking(claudeDiv)
        };
        
        qaPairs.push(qa);
        log(`Q${qa.index} 추출 완료`);
      }
      
      return qaPairs;
      
    } catch (error) {
      logError('002', '추출 중 예외 발생', error);
      return [];
    }
  }
  
  // 대화 컨테이너 찾기
  function findConversationContainer() {
    // 방법 1: XPath
    const xpath = '/html/body/div[2]/div[2]/div/div[1]/div/div/div[1]';
    const xpathResult = document.evaluate(
      xpath, document, null, 
      XPathResult.FIRST_ORDERED_NODE_TYPE, null
    );
    if (xpathResult.singleNodeValue) {
      log('XPath로 컨테이너 발견');
      return xpathResult.singleNodeValue;
    }
    
    // 방법 2: 클래스명
    const byClass = document.querySelector('.flex-1.flex.flex-col.gap-3.px-4.max-w-3xl.mx-auto.w-full');
    if (byClass) {
      log('클래스명으로 컨테이너 발견');
      return byClass;
    }
    
    return null;
  }
  
  // 말풍선 노드 구조 분석
  function analyzeBubbleStructure(div, type) {
    const structure = {
      type: type,
      elements: [],
      raw: div
    };
    
    if (type === 'claude') {
      // Claude 특별 영역 확인
      structure.thinking = extractThinking(div);
      structure.citations = div.querySelectorAll('antml\\:cite').length > 0;
      structure.artifacts = div.querySelectorAll('[data-artifact]').length > 0;
    }
    
    // 직계 자식 요소들 분석
    const children = Array.from(div.children);
    children.forEach(child => {
      const tagName = child.tagName.toLowerCase();
      structure.elements.push({
        tag: tagName,
        className: child.className,
        textLength: child.textContent.length
      });
    });
    
    log(`${type} 말풍선 구조:`, structure);
    return structure;
  }
  
  // 콘텐츠 추출 (개선된 버전)
  function extractContent(div, type) {
    if (!div) return '';
    
    // 먼저 구조 분석
    const structure = analyzeBubbleStructure(div, type);
    
    // 복제해서 작업
    const clone = div.cloneNode(true);
    
    // UI 요소 제거
    removeUIElements(clone);
    
    // 코드 블록 보존
    const codeBlocks = preserveCodeBlocks(clone);
    
    // HTML을 마크다운으로 변환
    const markdown = convertToMarkdown(clone);
    
    // 코드 블록 복원
    const finalText = restoreCodeBlocks(markdown, codeBlocks);
    
    // 타입별 후처리
    if (type === 'human') {
      return finalText.replace(/^H\s+/, '').trim();
    }
    
    return finalText.trim();
  }
  
  // UI 요소 제거
  function removeUIElements(element) {
    // 버튼 제거
    element.querySelectorAll('button').forEach(el => el.remove());
    
    // SVG 아이콘 제거
    element.querySelectorAll('svg').forEach(el => el.remove());
    
    // 시간 표시 등 제거
    element.querySelectorAll('.text-text-300').forEach(el => {
      const text = el.textContent;
      if (text.match(/^\d+\s?(초|분|시간)$/)) {
        el.remove();
      }
    });
  }
  
  // UI 텍스트인지 확인
  function isUIText(text) {
    const uiPatterns = [
      /^편집$/,
      /^Copy$/,
      /^Retry$/,
      /^재시도$/,
      /^\d+\s?(초|분|시간|일)$/
    ];
    
    return uiPatterns.some(pattern => pattern.test(text));
  }
  
  // 코드 블록 보존
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
  
  // 코드 블록 복원
  function restoreCodeBlocks(text, blocks) {
    blocks.forEach(({ placeholder, content }) => {
      text = text.replace(placeholder, content);
    });
    return text;
  }
  
  // HTML을 마크다운으로 변환
  function convertToMarkdown(element) {
    let markdown = '';
    
    // 재귀적으로 처리
    function processNode(node, depth = 0) {
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
          
          case 'code':
            // 인라인 코드는 이미 처리됨 (preserveCodeBlocks)
            if (!node.parentElement || node.parentElement.tagName !== 'PRE') {
              processChildren(node);
            }
            break;
          
          case 'div':
            // div는 블록 요소로 처리
            processChildren(node);
            // 다음 요소가 블록이면 줄바꿈 추가
            if (node.nextSibling) {
              markdown += '\n\n';
            }
            break;
          
          default:
            // 기타 요소는 내용만 추출
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
  
  // Thinking 추출
  function extractThinking(claudeDiv) {
    if (!claudeDiv) return [];
    
    const thinkingTexts = [];
    
    // "생각하고 있음" 찾기
    const spans = claudeDiv.querySelectorAll('span');
    spans.forEach(span => {
      if (span.textContent.includes('생각하고 있음:')) {
        const thinkingTitle = span.textContent;
        log('Thinking 발견:', thinkingTitle);
        thinkingTexts.push(thinkingTitle);
      }
    });
    
    // "사고 과정" 내용 찾기
    const paragraphs = claudeDiv.querySelectorAll('p.whitespace-normal');
    paragraphs.forEach(p => {
      const text = p.textContent.trim();
      if (text && text.length > 20) {
        // 부모 요소에 "생각하고 있음" 또는 "사고 과정"이 있는지 확인
        let parent = p.parentElement;
        let isThinkingContent = false;
        
        while (parent && parent !== claudeDiv) {
          if (parent.textContent.includes('생각하고 있음') || 
              parent.textContent.includes('사고 과정')) {
            isThinkingContent = true;
            break;
          }
          parent = parent.parentElement;
        }
        
        if (isThinkingContent) {
          thinkingTexts.push(text);
        }
      }
    });
    
    return thinkingTexts;
  }
  
  // 메시지 분류
  function classifyMessage(text) {
    if (!text) return '';
    
    const length = text.length;
    
    // 긴 메시지 우선
    if (length > 500 || text.includes('```')) return '⭐';
    
    // 패턴 매칭
    if (text.match(/(아니|그렇게 말고|수정|다시|틀렸|잘못)/)) return '⚠️';
    if (text.match(/(좋아|네|맞아|완료|확인|감사|OK|ok)/) && length < 100) return '✅';
    if (text.match(/(어때|어떨까|제안|~면 좋겠|아이디어)/)) return '💡';
    if (text.match(/(오류|에러|버그|안 돼|안돼|작동)/)) return '🔧';
    if (length < 100) return '❓';
    
    return '';
  }
  
  // 주제/제목 생성 (v2.11 Mac/Windows 호환 + 2파일 저장)
  function generateTitle(qaPairs) {
    // 확장된 stopWords (완전 제외 단어)
    const stopWords = [
      // 기본 동사
      '있다', '없다', '하다', '되다', '이다', '보다', '같다', '알다', '모르다',
      // 대명사
      '그것', '저것', '이것', '그', '저', '이',
      // 의문사
      '어떻게', '무엇', '언제', '어디', '왜', '누가', '뭐',
      // 접속사/부사
      '그리고', '하지만', '그런데', '그래서', '따라서', '그러나', '그러면', '또한', '역시',
      // 의존명사
      '것', '때문', '경우', '정도', '만큼', '뿐',
      // 보조사
      '같은', '이런', '그런', '저런', '모든', '각각', '여러', '몇몇', '대부분', '일부',
      // 시간 부사
      '지금', '이제', '아직', '벌써', '이미', '나중', '먼저', '다시',
      // 일반 부사
      '매우', '너무', '정말', '진짜', '아주', '조금', '많이', '잘', '못'
    ];
    
    // 기본 빈도를 차감할 단어들과 Q&A당 기본 빈도
    const baselineFrequency = {
      '사용자': 3,      // Q&A당 평균 3회
      '클로드': 3,      // Q&A당 평균 3회
      '대화': 2,        // Q&A당 평균 2회
      '질문': 1.5,      // Q&A당 평균 1.5회
      '답변': 1.5,      // Q&A당 평균 1.5회
      '말씀': 1,        // Q&A당 평균 1회
      '내용': 2,        // Q&A당 평균 2회
      '부분': 1,        // Q&A당 평균 1회
      '설명': 1,        // Q&A당 평균 1회
      '방법': 1,        // Q&A당 평균 1회
      '문제': 1,        // Q&A당 평균 1회
      '해결': 1,        // Q&A당 평균 1회
      '도움': 0.5,      // Q&A당 평균 0.5회
      '이해': 0.5,      // Q&A당 평균 0.5회
      '확인': 1,        // Q&A당 평균 1회
      '관련': 1,        // Q&A당 평균 1회
      '대한': 1,        // Q&A당 평균 1회
      '위한': 0.5,      // Q&A당 평균 0.5회
      '통해': 0.5,      // Q&A당 평균 0.5회
      '함께': 0.5       // Q&A당 평균 0.5회
    };
    
    // 확장된 조사 목록
    const particles = [
      // 격조사
      '이', '가', '을', '를', '의', '에', '에서', '에게', '한테', '께', '으로', '로',
      // 보조사
      '은', '는', '도', '만', '까지', '부터', '마저', '조차', '밖에', '뿐',
      // 접속조사
      '와', '과', '하고', '이랑', '랑',
      // 복합조사
      '에서는', '에서도', '에게는', '에게도', '으로는', '으로도', '로는', '로도',
      '에는', '에도', '까지는', '까지도', '부터는', '부터도',
      // 어미형 조사
      '라고', '이라고', '라는', '이라는', '라도', '이라도', '이나', '나', '든지',
      '이야', '야', '이고', '고', '이며', '며', '이자', '자'
    ];
    
    const keywords = {};
    
    qaPairs.forEach(qa => {
      // Human 질문에서 키워드 추출 (더 가중치)
      extractKeywords(qa.human, keywords, 2);
      // Claude 답변에서도 키워드 추출
      if (qa.claude) extractKeywords(qa.claude, keywords, 1);
    });
    
    function extractKeywords(text, keywordMap, weight) {
      // 코드 블록 제거
      let cleanText = text;
      cleanText = cleanText.replace(/```[\s\S]*?```/g, '');
      cleanText = cleanText.replace(/`[^`]+`/g, '');
      
      // 한글 단어만 추출
      const words = cleanText.match(/[가-힣]+/g) || [];
      
      words.forEach(word => {
        let cleanWord = word;
        
        // 조사 제거 (긴 조사부터 제거)
        particles.sort((a, b) => b.length - a.length).forEach(particle => {
          const regex = new RegExp(particle + '$');
          cleanWord = cleanWord.replace(regex, '');
        });
        
        // 동사/형용사 어미 제거
        cleanWord = cleanWord
          // 종결어미
          .replace(/습니다$|합니다$|입니다$|됩니다$|ㅂ니다$/, '')
          .replace(/습니까$|합니까$|입니까$|됩니까$|ㅂ니까$/, '')
          .replace(/어요$|아요$|여요$|에요$|예요$|이에요$|예요$/, '')
          .replace(/어$|아$|여$/, '')
          .replace(/네요$|군요$|구나$|는구나$/, '')
          .replace(/죠$|지요$/, '')
          // 연결어미
          .replace(/어서$|아서$|여서$|고$|며$|면서$/, '')
          .replace(/으면$|면$|으니$|니$|니까$/, '')
          .replace(/지만$|는데$|은데$|ㄴ데$/, '')
          .replace(/으려고$|려고$|으러$|러$/, '')
          // 관형사형 어미
          .replace(/은$|는$|을$|ㄹ$|던$/, '')
          // 명사형 어미
          .replace(/음$|ㅁ$|기$/, '');
        
        // 2글자 이상이고 stopWords에 없는 단어만
        if (cleanWord.length > 1 && !stopWords.includes(cleanWord)) {
          keywordMap[cleanWord] = (keywordMap[cleanWord] || 0) + weight;
        }
      });
    }
    
    // 기본 빈도 차감 함수
    function applyBaselineAdjustment(keywords, totalQAPairs) {
      const adjusted = {};
      
      Object.entries(keywords).forEach(([word, count]) => {
        // 기본 빈도가 정의된 단어인 경우
        if (baselineFrequency[word]) {
          const baseline = baselineFrequency[word] * totalQAPairs;
          const adjustedCount = count - baseline;
          
          // 기본 빈도를 초과한 경우만 포함
          if (adjustedCount > 0) {
            adjusted[word] = adjustedCount;
            log(`${word}: ${count}회 - 기본빈도 ${baseline}회 = ${adjustedCount}회`);
          } else {
            log(`${word}: ${count}회 (기본빈도 ${baseline}회 이하로 제외)`);
          }
        } else {
          // 기본 빈도가 정의되지 않은 단어는 그대로 포함
          adjusted[word] = count;
        }
      });
      
      return adjusted;
    }
    
    // 기본 빈도 조정 적용
    const adjustedKeywords = applyBaselineAdjustment(keywords, qaPairs.length);
    
    // 조정된 키워드를 빈도순으로 정렬
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
      title = firstTopic || 'Claude_Chat';
    }
    
    // 주제 설명 생성
    let subject = '';
    if (topKeywords.length > 0) {
      subject = `${topKeywords.join(', ')} 관련 대화`;
    } else {
      subject = qaPairs[0]?.human.substring(0, 50).replace(/[^가-힣a-zA-Z0-9\s]/g, '').trim() || 'Claude와의 대화';
    }
    
    return { 
      title, 
      subject, 
      topKeywords,
      summaryKeywords 
    };
  }
  
  // 질문만 마크다운 생성 (새 함수)
  function generateQuestionsOnlyMarkdown(qaPairs) {
    const date = new Date();
    const dateStr = date.toLocaleString('ko-KR');
    const version = 'v2.11';
    
    let markdown = `# Claude 질문 목록 - ${dateStr}\n\n`;
    markdown += `## 📋 요약\n`;
    markdown += `- **총 질문 수**: ${qaPairs.length}개\n`;
    markdown += `- **일시**: ${dateStr}\n`;
    markdown += `- **버전**: ${version}\n\n`;
    markdown += `---\n\n`;
    
    // 질문들만 나열
    qaPairs.forEach((qa) => {
      markdown += `## Q${qa.index}.\n\n`;
      markdown += qa.human + '\n\n';
      markdown += `---\n\n`;
    });
    
    return markdown;
  }
  
  // 마크다운 생성
  function generateMarkdown(qaPairs) {
    const date = new Date();
    const dateStr = date.toLocaleString('ko-KR');
    const version = 'v2.11'; // 버전 업데이트
    
    let markdown = `# Claude 대화 - ${dateStr}\n\n`;
    
    // 개선된 제목 생성
    const { title, subject, topKeywords, summaryKeywords } = generateTitle(qaPairs);
    
    markdown += `## 📊 대화 요약\n`;
    markdown += `- **총 대화**: ${qaPairs.length}세트\n`;
    markdown += `- **주제**: ${subject}\n`;
    if (summaryKeywords.length > 0) {
      // 15개 키워드를 3개씩 5줄로 표시
      markdown += `- **주요 키워드**:\n`;
      for (let i = 0; i < summaryKeywords.length; i += 3) {
        const lineKeywords = summaryKeywords.slice(i, i + 3).join(', ');
        markdown += `  - ${lineKeywords}\n`;
      }
    }
    markdown += `- **일시**: ${dateStr}\n`;
    markdown += `- **버전**: ${version}\n`;
    markdown += `- **플랫폼**: ${isMac ? 'Mac' : 'Windows'}\n\n`;
    markdown += `---\n\n`;
    
    // Q&A 쌍들
    qaPairs.forEach((qa) => {
      const emoji = classifyMessage(qa.human);
      const qTitle = qa.human.substring(0, 40).replace(/\n/g, ' ').trim();
      
      markdown += `# Q${qa.index}. ${qTitle}... ${emoji}\n\n`;
      
      // Human
      markdown += `## 👤 Human: ${emoji}\n\n`;
      // 말풍선 내용은 탭으로 들여쓰기
      const humanIndented = qa.human.split('\n').map(line => '\t' + line).join('\n');
      markdown += humanIndented + '\n\n';
      
      // Claude
      markdown += `## 🤖 Claude:\n\n`;
      
      // Thinking
      if (qa.thinking && qa.thinking.length > 0) {
        markdown += `### 💭 Thinking:\n\n`;
        qa.thinking.forEach(thought => {
          // thinking은 인용문으로 처리
          const thinkingLines = thought.split('\n').map(line => '> ' + line).join('\n');
          markdown += thinkingLines + '\n\n';
        });
      }
      
      // Answer
      if (qa.claude) {
        markdown += `### 💬 Answer:\n\n`;
        // Claude 답변도 탭으로 들여쓰기
        const claudeIndented = qa.claude.split('\n').map(line => '\t' + line).join('\n');
        markdown += claudeIndented + '\n';
      } else {
        markdown += `\t*(답변 없음)*\n`;
      }
      
      markdown += '\n---\n\n';
    });
    
    return markdown;
  }
  
  // 저장 함수 (2개 파일 동시 저장)
  function saveConversation() {
    log('=== 저장 시작 ===');
    
    try {
      const qaPairs = extractConversation();
      
      if (qaPairs.length === 0) {
        logError('003', 'Q&A를 추출할 수 없습니다');
        alert('대화를 추출할 수 없습니다. 콘솔을 확인하세요.');
        return;
      }
      
      // 전체 대화 마크다운
      const fullMarkdown = generateMarkdown(qaPairs);
      
      // 질문만 마크다운
      const questionsMarkdown = generateQuestionsOnlyMarkdown(qaPairs);
      
      // 개선된 제목으로 파일명 생성
      const { title } = generateTitle(qaPairs);
      const date = new Date().toISOString().split('T')[0];
      const safeTitle = title.substring(0, 50).replace(/[^가-힣a-zA-Z0-9_]/g, '');
      
      // 파일 1: 전체 대화 저장
      const fullBlob = new Blob([fullMarkdown], { type: 'text/markdown;charset=utf-8' });
      const fullUrl = URL.createObjectURL(fullBlob);
      const fullFilename = `${date}_${safeTitle}_full_v2.11.md`;
      
      const a1 = document.createElement('a');
      a1.href = fullUrl;
      a1.download = fullFilename;
      document.body.appendChild(a1);
      a1.click();
      document.body.removeChild(a1);
      
      // 파일 2: 질문만 저장 (약간의 지연을 두고)
      setTimeout(() => {
        const questionsBlob = new Blob([questionsMarkdown], { type: 'text/markdown;charset=utf-8' });
        const questionsUrl = URL.createObjectURL(questionsBlob);
        const questionsFilename = `${date}_${safeTitle}_questions_v2.11.md`;
        
        const a2 = document.createElement('a');
        a2.href = questionsUrl;
        a2.download = questionsFilename;
        document.body.appendChild(a2);
        a2.click();
        document.body.removeChild(a2);
        
        URL.revokeObjectURL(questionsUrl);
      }, 100); // 100ms 지연
      
      URL.revokeObjectURL(fullUrl);
      
      showToast(`✅ ${qaPairs.length}개 Q&A 2개 파일로 저장 완료!`);
      
    } catch (error) {
      logError('004', '저장 중 오류', error);
      alert('저장 중 오류가 발생했습니다.');
    }
  }
  
  // 토스트 메시지
  function showToast(message) {
    const existing = document.querySelector('.claude-logger-toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'claude-logger-toast';
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
  
  // 단축키 등록 - Mac/Windows 호환
  document.addEventListener('keydown', (e) => {
    // 저장 단축키 (Mac: Cmd+S, Windows: Ctrl+S)
    if (e[modifierKey] && e.key === 's') {
      e.preventDefault();
      saveConversation();
    }
    
    // 디버그 토글 (Mac: Cmd+Shift+D, Windows: Ctrl+Shift+D)
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
  
  log(`준비 완료! ${platform} 환경 감지됨`);
  log(`${saveShortcut}로 저장 (전체 대화 + 질문만 2개 파일), ${debugShortcut}로 디버그 토글`);
  
  // 최초 실행 시 안내 메시지
  showToast(`Claude Chat Logger 활성화! ${saveShortcut}로 2개 파일 저장`);
})();