// 불용어 목록 (제거할 단어들)
const STOP_WORDS = new Set([
  '에', '의', '를', '을', '이', '가', '은', '는', '로', '으로', '에서', '와', '과', '도', 
  '만', '부터', '까지', '보다', '처럼', '같이', '위해', '통해', '대해', '관해',
  '있다', '없다', '하다', '되다', '이다', '아니다', '그', '이', '저', '그런', '이런', '저런',
  '때문', '위해서', '때문에', '관련', '관해서', '대해서', '통해서',
  '및', '등', '또', '또한', '그리고', '하지만', '그러나', '따라서', '그래서'
]);

// 핵심 키워드 추출
function extractKeywords(text, limit = 3) {
  if (!text) return [];
  
  // 텍스트 전처리
  const cleanText = text
    .replace(/<[^>]*>/g, '')        // HTML 태그 제거
    .replace(/[^\w가-힣\s]/g, ' ')   // 특수문자를 공백으로
    .replace(/\s+/g, ' ')           // 연속된 공백 제거
    .trim();
  
  // 단어 분리
  const words = cleanText.split(/\s+/)
    .filter(word => word.length >= 2)  // 2글자 이상
    .filter(word => !STOP_WORDS.has(word))  // 불용어 제거
    .filter(word => !/^\d+$/.test(word));   // 숫자만 있는 단어 제거
  
  // 단어 빈도 계산
  const wordCount = {};
  words.forEach(word => {
    wordCount[word] = (wordCount[word] || 0) + 1;
  });
  
  // 빈도순으로 정렬하여 상위 키워드 반환
  const sortedWords = Object.entries(wordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
  
  return sortedWords;
}

// 제목에서 핵심 정보 추출
function extractTitleKeywords(title) {
  if (!title) return [];
  
  // 괄호 안의 중요 정보 우선 추출
  const bracketMatches = title.match(/[「『\[【\(][^」』\]】\)]*[」』\]】\)]/g);
  const bracketKeywords = bracketMatches 
    ? bracketMatches.map(m => m.replace(/[「『\[【\(」』\]】\)]/g, '').trim())
    : [];
  
  // 핵심 키워드 추출
  const generalKeywords = extractKeywords(title, 2);
  
  // 합치고 중복 제거
  const allKeywords = [...bracketKeywords, ...generalKeywords];
  return [...new Set(allKeywords)].slice(0, 3);
}

// 정부/부처 관련 핵심 동작 키워드 매핑
const ACTION_KEYWORDS = {
  '발표': ['발표', '공개', '공표'],
  '시행': ['시행', '실시', '추진', '개시'],
  '개정': ['개정', '수정', '변경', '개편'],
  '선정': ['선정', '지정', '선별', '채택'],
  '지원': ['지원', '지원책', '보조', '지원금'],
  '규제': ['규제', '제재', '처벌', '단속'],
  '점검': ['점검', '조사', '검토', '감사'],
  '협력': ['협력', '협약', '업무협약', 'MOU'],
  '개최': ['개최', '개최', '행사', '포럼'],
  '모집': ['모집', '공모', '신청', '접수']
};

// 액션 키워드 찾기
function findActionKeyword(text) {
  const lowerText = text.toLowerCase();
  
  for (const [action, variants] of Object.entries(ACTION_KEYWORDS)) {
    if (variants.some(variant => text.includes(variant))) {
      return action;
    }
  }
  return null;
}

// 1줄 한국어 요약 생성 (20자 내외)
export function createSummary(title, description = '', maxLength = 20) {
  const fullText = `${title} ${description}`.trim();
  
  // 1. 액션 키워드 찾기
  const actionKeyword = findActionKeyword(fullText);
  
  // 2. 제목에서 핵심 키워드 추출
  const keywords = extractTitleKeywords(title);
  
  // 3. 요약문 구성
  let summary = '';
  
  if (actionKeyword && keywords.length > 0) {
    // "키워드 + 액션" 형태
    const mainKeyword = keywords[0];
    summary = `${mainKeyword} ${actionKeyword}`;
  } else if (keywords.length >= 2) {
    // "키워드1 + 키워드2" 형태  
    summary = keywords.slice(0, 2).join(' ');
  } else if (keywords.length === 1) {
    // 키워드가 하나만 있는 경우
    summary = keywords[0];
  } else {
    // 키워드를 찾지 못한 경우, 제목의 첫 부분 사용
    const cleanTitle = title.replace(/<[^>]*>/g, '').trim();
    const words = cleanTitle.split(/\s+/).slice(0, 3);
    summary = words.join(' ');
  }
  
  // 4. 길이 조정
  if (summary.length > maxLength) {
    // 단어 단위로 자르기
    const words = summary.split(' ');
    let trimmed = '';
    for (const word of words) {
      if (trimmed.length + word.length + 1 <= maxLength) {
        trimmed += (trimmed ? ' ' : '') + word;
      } else {
        break;
      }
    }
    summary = trimmed || summary.substring(0, maxLength - 3) + '...';
  }
  
  return summary || '정보 확인';
}

// 여러 아이템 일괄 요약
export function createSummaries(items) {
  return items.map(item => ({
    ...item,
    summary: createSummary(item.title, item.description)
  }));
}

// 카테고리별 요약 최적화
export function createCategorizedSummary(title, description, category) {
  let summary = createSummary(title, description);
  
  // 카테고리에 따른 접두사 추가 (필요시)
  if (category.includes('공지') && !summary.includes('공지')) {
    // 공지사항의 경우 특별한 처리 없음 (이미 키워드에서 파악됨)
  }
  
  return summary;
}

export default {
  createSummary,
  createSummaries,
  createCategorizedSummary,
  extractKeywords
};
