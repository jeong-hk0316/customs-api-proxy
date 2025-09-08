// 한국어 요약 생성기

// 불용어 목록
const STOP_WORDS = new Set([
  '에', '의', '를', '을', '이', '가', '은', '는', '로', '으로', '에서', '와', '과', '도', 
  '만', '부터', '까지', '보다', '처럼', '같이', '위해', '통해', '대해', '관해',
  '있다', '없다', '하다', '되다', '이다', '아니다', '그', '이', '저', '그런', '이런', '저런',
  '때문', '위해서', '때문에', '관련', '관해서', '대해서', '통해서',
  '및', '등', '또', '또한', '그리고', '하지만', '그러나', '따라서', '그래서', '공지',
  '알림', '안내', '실시', '추진', '시행', '개최', '발표', '선정', '지정', '운영'
]);

// 핵심 키워드 추출
function extractKeywords(text, maxWords = 3) {
  if (!text) return [];
  
  // 텍스트 전처리
  const cleanText = text
    .replace(/<[^>]*>/g, '')          // HTML 태그 제거
    .replace(/[^\w가-힣\s]/g, ' ')     // 특수문자를 공백으로
    .replace(/\s+/g, ' ')             // 연속된 공백 제거
    .trim();
  
  // 괄호 안의 내용 우선 추출
  const bracketMatches = cleanText.match(/[「『\[【\(][^」』\]】\)]*[」』\]】\)]/g);
  const bracketKeywords = bracketMatches 
    ? bracketMatches.map(m => m.replace(/[「『\[【\(」』\]】\)]/g, '').trim())
        .filter(word => word.length >= 2 && word.length <= 15)
    : [];
  
  // 일반 단어 추출
  const words = cleanText.split(/\s+/)
    .filter(word => word.length >= 2 && word.length <= 10)  // 2~10글자
    .filter(word => !STOP_WORDS.has(word))                  // 불용어 제거
    .filter(word => !/^\d+$/.test(word))                    // 숫자만 있는 단어 제거
    .filter(word => !/^[a-zA-Z]+$/.test(word));             // 영어만 있는 단어 제거
  
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

// 정부 액션 키워드 매핑
const ACTION_KEYWORDS = {
  '발표': ['발표', '공개', '공표', '발표'],
  '시행': ['시행', '실시', '추진', '개시', '진행'],
  '개정': ['개정', '수정', '변경', '개편', '개선'],
  '선정': ['선정', '지정', '선별', '채택', '결정'],
  '지원': ['지원', '지원책', '보조', '지원금', '지원사업'],
  '모집': ['모집', '공모', '신청', '접수', '모집공고'],
  '점검': ['점검', '조사', '검토', '감사', '단속'],
  '협약': ['협약', '협력', '업무협약', 'MOU', '체결'],
  '개최': ['개최', '행사', '포럼', '회의', '세미나']
};

// 액션 키워드 찾기
function findActionKeyword(text) {
  for (const [action, variants] of Object.entries(ACTION_KEYWORDS)) {
    if (variants.some(variant => text.includes(variant))) {
      return action;
    }
  }
  return null;
}

// 20자 내외 한국어 요약 생성
function summarizeKo20(text, maxLength = 20) {
  if (!text) return '정보 확인';
  
  const fullText = text.trim();
  
  // 1. 액션 키워드 찾기
  const actionKeyword = findActionKeyword(fullText);
  
  // 2. 핵심 키워드 추출
  const keywords = extractKeywords(fullText, 2);
  
  let summary = '';
  
  // 3. 요약문 구성 전략
  if (keywords.length >= 2) {
    // 키워드 2개 조합
    summary = keywords.slice(0, 2).join(' ');
    
    // 액션이 있으면 추가
    if (actionKeyword && summary.length + actionKeyword.length + 1 <= maxLength) {
      summary += ` ${actionKeyword}`;
    }
  } else if (keywords.length === 1) {
    summary = keywords[0];
    
    // 액션 키워드 추가
    if (actionKeyword && summary.length + actionKeyword.length + 1 <= maxLength) {
      summary += ` ${actionKeyword}`;
    }
  } else if (actionKeyword) {
    // 키워드가 없으면 액션만
    summary = actionKeyword;
  } else {
    // 마지막 수단: 원문에서 직접 추출
    const cleanText = fullText.replace(/<[^>]*>/g, '').trim();
    const sentences = cleanText.split(/[.!?。]/).filter(s => s.trim());
    
    if (sentences.length > 0) {
      const firstSentence = sentences[0].trim();
      const words = firstSentence.split(/\s+/).slice(0, 3);
      summary = words.join(' ');
    } else {
      summary = cleanText.substring(0, 15);
    }
  }
  
  // 4. 길이 조정
  if (summary.length > maxLength) {
    // 단어 단위로 자르기
    const words = summary.split(' ');
    let trimmed = '';
    
    for (const word of words) {
      const nextLength = trimmed.length + (trimmed ? 1 : 0) + word.length;
      if (nextLength <= maxLength - 3) {
        trimmed += (trimmed ? ' ' : '') + word;
      } else {
        break;
      }
    }
    
    summary = trimmed ? `${trimmed}...` : summary.substring(0, maxLength - 3) + '...';
  }
  
  return summary || '정보 확인';
}

// 카테고리별 요약 최적화
function summarizeByCategory(text, category, maxLength = 20) {
  let summary = summarizeKo20(text, maxLength);
  
  // 카테고리별 특별 처리
  if (category && category.includes('공지') && !summary.includes('공지')) {
    // 공지사항은 이미 키워드에서 처리됨
  }
  
  return summary;
}

module.exports = {
  summarizeKo20,
  summarizeByCategory,
  extractKeywords
};
