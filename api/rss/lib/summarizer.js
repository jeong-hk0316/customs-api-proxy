// 개선된 한국어 요약 생성기

// 불용어 목록 (확장)
const STOP_WORDS = new Set([
  // 조사, 어미만 포함
  '에', '의', '를', '을', '이', '가', '은', '는', '로', '으로', '에서', '와', '과', '도', 
  '만', '부터', '까지', '보다', '처럼', '같이', '위해', '통해', '대해', '관해',
  '있다', '없다', '하다', '되다', '이다', '아니다', 
  '그', '이', '저', '그런', '이런', '저런',
  '때문', '위해서', '때문에', '관련', '관해서', '대해서', '통해서',
  '및', '등', '또', '또한', '그리고', '하지만', '그러나', '따라서', '그래서'
]);

// 핵심 키워드 패턴 (더 정교한 추출)
const IMPORTANT_PATTERNS = [
  /(\w+법|법률|법안)/g,           // 법률 관련
  /(\w+정책|정책\w+)/g,          // 정책 관련  
  /(\w+지원|지원\w+)/g,          // 지원 관련
  /(\w+개발|개발\w+)/g,          // 개발 관련
  /(\w+산업|산업\w+)/g,          // 산업 관련
  /(\w+기술|기술\w+)/g,          // 기술 관련
  /(\w+환경|환경\w+)/g,          // 환경 관련
];

// 정부 핵심 액션 키워드 (더 체계적)
const ACTION_KEYWORDS = {
  '발표': ['발표', '공개', '공표', '공고'],
  '시행': ['시행', '실시', '추진', '개시', '도입', '시작'],
  '개정': ['개정', '수정', '변경', '개편', '개선', '보완'],
  '선정': ['선정', '지정', '선별', '채택', '결정', '확정'],
  '지원': ['지원', '지원책', '보조', '지원금', '지원사업', '지원방안'],
  '모집': ['모집', '공모', '신청', '접수', '모집공고', '참여'],
  '점검': ['점검', '조사', '검토', '감사', '단속', '확인'],
  '협약': ['협약', '협력', '업무협약', 'MOU', '체결', '합의'],
  '개최': ['개최', '행사', '포럼', '회의', '세미나', '설명회'],
  '승인': ['승인', '허가', '인가', '통과', '의결'],
  '강화': ['강화', '확대', '증대', '향상', '개선']
};

// 의미 있는 단어 추출 (개선된 버전)
function extractMeaningfulWords(text, maxWords = 3) {
  if (!text) return [];
  
  // 특수문자와 HTML 태그 제거
  const cleanText = text
    .replace(/<[^>]*>/g, '')
    .replace(/[^\w가-힣\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // 중요 패턴 먼저 추출
  const importantWords = [];
  IMPORTANT_PATTERNS.forEach(pattern => {
    const matches = cleanText.match(pattern);
    if (matches) {
      importantWords.push(...matches.map(m => m.trim()));
    }
  });
  
  // 괄호 안의 중요 정보 추출
  const bracketMatches = cleanText.match(/[「『\[【\(][^」』\]】\)]*[」』\]】\)]/g);
  const bracketWords = bracketMatches 
    ? bracketMatches.map(m => m.replace(/[「『\[【\(」』\]】\)]/g, '').trim())
        .filter(word => word.length >= 2 && word.length <= 20)
    : [];
  
  // 일반 단어 추출 (길이 기준 강화)
  const words = cleanText.split(/\s+/)
    .filter(word => word.length >= 2 && word.length <= 15)  // 너무 짧거나 긴 단어 제외
    .filter(word => !STOP_WORDS.has(word))
    .filter(word => !/^\d+$/.test(word))                    // 숫자만 있는 단어 제외
    .filter(word => !/^[a-zA-Z]+$/.test(word))              // 영어만 있는 단어 제외
    .filter(word => !word.includes('http'));                // URL 조각 제외
  
  // 단어 빈도 계산
  const wordCount = {};
  words.forEach(word => {
    wordCount[word] = (wordCount[word] || 0) + 1;
  });
  
  // 빈도순 정렬
  const sortedWords = Object.entries(wordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxWords)
    .map(([word]) => word);
  
  // 우선순위: 중요패턴 → 괄호내용 → 빈도순
  const result = [...new Set([
    ...importantWords.slice(0, 2),
    ...bracketWords.slice(0, 1), 
    ...sortedWords
  ])];
  
  return result.slice(0, maxWords);
}

// 액션 키워드 찾기 (개선)
function findBestAction(text) {
  const actionScores = {};
  
  Object.entries(ACTION_KEYWORDS).forEach(([action, variants]) => {
    variants.forEach(variant => {
      if (text.includes(variant)) {
        actionScores[action] = (actionScores[action] || 0) + 1;
      }
    });
  });
  
  // 가장 많이 매칭된 액션 반환
  const bestAction = Object.entries(actionScores)
    .sort((a, b) => b[1] - a[1])[0];
    
  return bestAction ? bestAction[0] : null;
}

// 스마트한 텍스트 자르기 (단어 경계 고려)
function smartTruncate(text, maxLength) {
  if (!text || text.length <= maxLength) return text;
  
  // 우선 maxLength까지 자르기
  let truncated = text.substring(0, maxLength);
  
  // 마지막이 공백이나 완전한 단어로 끝나는지 확인
  const lastSpaceIndex = truncated.lastIndexOf(' ');
  const originalLastChar = text[maxLength - 1];
  const nextChar = text[maxLength];
  
  // 단어 중간에서 잘린 경우 이전 공백까지만
  if (nextChar && nextChar !== ' ' && lastSpaceIndex > maxLength * 0.7) {
    truncated = truncated.substring(0, lastSpaceIndex);
  }
  
  // 의미있는 길이가 남아있으면 ... 추가
  if (truncated.length < text.length && truncated.length > 5) {
    truncated += '...';
  }
  
  return truncated;
}

// 20자 내외 한국어 요약 생성 (대폭 개선)
function summarizeKo20(text, maxLength = 20) {
  if (!text) return '정보 확인';
  
  const fullText = text.trim();
  if (fullText.length <= maxLength) return fullText;
  
  // 1. 액션 키워드 찾기
  const actionKeyword = findBestAction(fullText);
  
  // 2. 의미있는 키워드 추출
  const keywords = extractMeaningfulWords(fullText, 3);
  
  let summary = '';
  
  // 3. 요약 전략 (20자 최대한 활용)
  if (keywords.length >= 3 && actionKeyword) {
    // 최적: 키워드 3개 + 액션
    const mainKeywords = keywords.slice(0, 3).join(' ');
    const combined = `${mainKeywords} ${actionKeyword}`;
    if (combined.length <= maxLength) {
      summary = combined;
    } else {
      summary = keywords.slice(0, 2).join(' ') + ` ${actionKeyword}`;
    }
  } else if (keywords.length >= 3) {
    // 키워드 3개 조합
    summary = keywords.slice(0, 3).join(' ');
  } else if (keywords.length >= 2 && actionKeyword) {
    // 키워드 2개 + 액션
    summary = `${keywords.slice(0, 2).join(' ')} ${actionKeyword}`;
  } else if (keywords.length >= 2) {
    // 키워드 2개 조합
    summary = keywords.slice(0, 2).join(' ');
  } else if (keywords.length >= 1 && actionKeyword) {
    // 키워드 1개 + 액션
    summary = `${keywords[0]} ${actionKeyword}`;
  } else if (keywords.length >= 1) {
    // 키워드 1개만
    summary = keywords[0];
  } else if (actionKeyword) {
    // 액션만
    summary = actionKeyword;
  } else {
    // 마지막 수단: 원문에서 스마트 자르기
    summary = smartTruncate(fullText.replace(/<[^>]*>/g, ''), maxLength);
  }
  
  // 4. 최종 길이 조정
  if (summary.length > maxLength) {
    summary = smartTruncate(summary, maxLength);
  }
  
  return summary || '정보 확인';
}

// 여러 아이템 일괄 요약
function createSummaries(items) {
  return items.map(item => ({
    ...item,
    summary: summarizeKo20(item.description || item.title)
  }));
}

module.exports = {
  summarizeKo20,
  createSummaries,
  extractMeaningfulWords
};
