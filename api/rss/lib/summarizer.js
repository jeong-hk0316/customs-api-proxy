// 한국어 100자 요약 생성기

// 불용어 목록 (축소 - 조사/어미만)
const STOP_WORDS = new Set([
  '에', '의', '를', '을', '이', '가', '은', '는', '로', '으로', '에서', '와', '과', '도', 
  '만', '부터', '까지', '보다', '처럼', '같이', '위해', '통해', '대해', '관해',
  '있다', '없다', '하다', '되다', '이다', '아니다', 
  '그', '이', '저', '그런', '이런', '저런',
  '때문', '위해서', '때문에', '관련', '관해서', '대해서', '통해서',
  '및', '등', '또', '또한', '그리고', '하지만', '그러나', '따라서', '그래서'
]);

// 정부 액션 키워드
const ACTION_KEYWORDS = {
  '발표': ['발표', '공개', '공표', '공고'],
  '시행': ['시행', '실시', '추진', '개시', '도입'],
  '개정': ['개정', '수정', '변경', '개편', '개선'],
  '선정': ['선정', '지정', '선별', '채택', '결정'],
  '지원': ['지원', '지원책', '보조', '지원금', '지원사업'],
  '모집': ['모집', '공모', '신청', '접수', '모집공고'],
  '점검': ['점검', '조사', '검토', '감사', '단속'],
  '협약': ['협약', '협력', '업무협약', 'MOU', '체결'],
  '개최': ['개최', '행사', '포럼', '회의', '세미나'],
  '승인': ['승인', '허가', '인가', '통과', '의결'],
  '강화': ['강화', '확대', '증대', '향상'],
  '기부': ['기부', '후원', '지원', '기금']
});

// 핵심 키워드 추출
function extractKeywords(text, maxWords = 10) {
  if (!text) return [];
  
  const cleanText = text
    .replace(/<[^>]*>/g, '')
    .replace(/[^\w가-힣\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // 괄호 안의 중요 정보 우선 추출
  const bracketMatches = cleanText.match(/[「『\[【\(][^」』\]】\)]*[」』\]】\)]/g);
  const bracketKeywords = bracketMatches 
    ? bracketMatches.map(m => m.replace(/[「『\[【\(」』\]】\)]/g, '').trim())
        .filter(word => word.length >= 2 && word.length <= 20)
    : [];
  
  // 일반 단어 추출
  const words = cleanText.split(/\s+/)
    .filter(word => word.length >= 2 && word.length <= 20)
    .filter(word => !STOP_WORDS.has(word))
    .filter(word => !/^\d+$/.test(word))
    .filter(word => !/^[a-zA-Z]+$/.test(word));
  
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
  
  // 괄호 키워드 + 일반 키워드 조합
  const allKeywords = [...bracketKeywords, ...sortedWords];
  return [...new Set(allKeywords)].slice(0, maxWords);
}

// 액션 키워드 찾기
function findActionKeyword(text) {
  for (const [action, variants] of Object.entries(ACTION_KEYWORDS)) {
    if (variants.some(variant => text.includes(variant))) {
      return action;
    }
  }
  return null;
}

// 스마트한 텍스트 자르기
function smartTruncate(text, maxLength) {
  if (!text || text.length <= maxLength) return text;
  
  let truncated = text.substring(0, maxLength);
  const lastSpaceIndex = truncated.lastIndexOf(' ');
  
  // 단어 중간에서 잘린 경우 이전 공백까지만
  if (lastSpaceIndex > maxLength * 0.8) {
    truncated = truncated.substring(0, lastSpaceIndex);
  }
  
  return truncated.length < text.length && truncated.length > 10 ? truncated + '...' : truncated;
}

// 100자 내외 한국어 요약 생성
function summarizeKo20(text, maxLength = 80) {
  if (!text) return '정보 확인';
  
  const fullText = text.trim();
  
  // 100자 이내면 그대로 반환
  if (fullText.length <= maxLength) return fullText;
  
  // 1. 액션 키워드 찾기
  const actionKeyword = findActionKeyword(fullText);
  
  // 2. 핵심 키워드 추출
  const keywords = extractKeywords(fullText, 10);
  
  let summary = '';
  
  // 3. 요약 전략 (100자 최대한 활용)
  if (keywords.length >= 8 && actionKeyword) {
    // 키워드 8개 + 액션
    const mainKeywords = keywords.slice(0, 8).join(' ');
    const combined = `${mainKeywords} ${actionKeyword}`;
    summary = combined.length <= maxLength ? combined : keywords.slice(0, 7).join(' ') + ` ${actionKeyword}`;
  } else if (keywords.length >= 8) {
    // 키워드 8개
    summary = keywords.slice(0, 8).join(' ');
  } else if (keywords.length >= 6 && actionKeyword) {
    // 키워드 6개 + 액션
    summary = `${keywords.slice(0, 6).join(' ')} ${actionKeyword}`;
  } else if (keywords.length >= 6) {
    // 키워드 6개
    summary = keywords.slice(0, 6).join(' ');
  } else if (keywords.length >= 4 && actionKeyword) {
    // 키워드 4개 + 액션
    summary = `${keywords.slice(0, 4).join(' ')} ${actionKeyword}`;
  } else if (keywords.length >= 4) {
    // 키워드 4개
    summary = keywords.slice(0, 4).join(' ');
  } else if (keywords.length >= 3 && actionKeyword) {
    // 키워드 3개 + 액션
    summary = `${keywords.slice(0, 3).join(' ')} ${actionKeyword}`;
  } else if (keywords.length >= 3) {
    // 키워드 3개
    summary = keywords.slice(0, 3).join(' ');
  } else if (keywords.length >= 2 && actionKeyword) {
    // 키워드 2개 + 액션
    summary = `${keywords.slice(0, 2).join(' ')} ${actionKeyword}`;
  } else if (keywords.length >= 2) {
    // 키워드 2개
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
    // 원문에서 스마트 자르기
    summary = smartTruncate(fullText.replace(/<[^>]*>/g, ''), maxLength);
  }
  
  // 4. 최종 길이 조정
  if (summary.length > maxLength) {
    summary = smartTruncate(summary, maxLength);
  }
  
  return summary || '정보 확인';
}

module.exports = {
  summarizeKo20
};
