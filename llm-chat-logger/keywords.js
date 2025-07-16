// 한국어 키워드 추출을 위한 데이터
const KOREAN_FILTERS = {
  // 완전히 제외할 단어들 (불용어)
  stopWords: [
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
  ],
  
  // Q&A당 기본 출현 빈도 (이 빈도를 초과해야 의미있는 키워드로 간주)
  baselineFrequency: {
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
  },
  
  // 제거할 조사 목록 (긴 것부터 정렬됨)
  particles: [
    // 복합조사
    '에서는', '에서도', '에게는', '에게도', '으로는', '으로도', '로는', '로도',
    '에는', '에도', '까지는', '까지도', '부터는', '부터도',
    // 격조사
    '이', '가', '을', '를', '의', '에', '에서', '에게', '한테', '께', '으로', '로',
    // 보조사
    '은', '는', '도', '만', '까지', '부터', '마저', '조차', '밖에', '뿐',
    // 접속조사
    '와', '과', '하고', '이랑', '랑',
    // 어미형 조사
    '라고', '이라고', '라는', '이라는', '라도', '이라도', '이나', '나', '든지',
    '이야', '야', '이고', '고', '이며', '며', '이자', '자'
  ],
  
  // 제거할 어미 패턴
  endings: {
    // 종결어미
    final: [
      '습니다', '합니다', '입니다', '됩니다', 'ㅂ니다',
      '습니까', '합니까', '입니까', '됩니까', 'ㅂ니까',
      '어요', '아요', '여요', '에요', '예요', '이에요',
      '어', '아', '여',
      '네요', '군요', '구나', '는구나',
      '죠', '지요'
    ],
    // 연결어미
    connective: [
      '어서', '아서', '여서', '고', '며', '면서',
      '으면', '면', '으니', '니', '니까',
      '지만', '는데', '은데', 'ㄴ데',
      '으려고', '려고', '으러', '러'
    ],
    // 관형사형 어미
    adnominal: ['은', '는', '을', 'ㄹ', '던'],
    // 명사형 어미
    nominal: ['음', 'ㅁ', '기']
  },
  
  // 메시지 분류 패턴
  messagePatterns: {
    correction: /(아니|그렇게 말고|수정|다시|틀렸|잘못)/,
    agreement: /(좋아|네|맞아|완료|확인|감사|OK|ok)/,
    suggestion: /(어때|어떨까|제안|~면 좋겠|아이디어)/,
    error: /(오류|에러|버그|안 돼|안돼|작동)/
  }
};

// 키워드 추출 헬퍼 함수
function cleanKoreanWord(word) {
  let cleaned = word;
  
  // 조사 제거 (긴 것부터)
  KOREAN_FILTERS.particles.forEach(particle => {
    const regex = new RegExp(particle + '$');
    cleaned = cleaned.replace(regex, '');
  });
  
  // 어미 제거
  Object.values(KOREAN_FILTERS.endings).flat().forEach(ending => {
    const regex = new RegExp(ending + '$');
    cleaned = cleaned.replace(regex, '');
  });
  
  return cleaned;
}

// 기본 빈도 조정
function adjustBaselineFrequency(keywords, totalQAPairs) {
  const adjusted = {};
  
  Object.entries(keywords).forEach(([word, count]) => {
    if (KOREAN_FILTERS.baselineFrequency[word]) {
      const baseline = KOREAN_FILTERS.baselineFrequency[word] * totalQAPairs;
      const adjustedCount = count - baseline;
      
      if (adjustedCount > 0) {
        adjusted[word] = adjustedCount;
      }
    } else {
      adjusted[word] = count;
    }
  });
  
  return adjusted;
}