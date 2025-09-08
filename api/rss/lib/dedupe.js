// 중복 제거 유틸리티

// 텍스트 정규화 (중복 검사용)
function normalizeText(text) {
  if (!text) return '';
  
  return text
    .replace(/\s+/g, ' ')           // 연속된 공백을 하나로
    .replace(/[^\w가-힣]/g, '')      // 특수문자 제거 (한글, 영문, 숫자만)
    .toLowerCase()                   // 소문자 변환
    .trim();
}

// URL 정규화
function normalizeUrl(url) {
  if (!url) return '';
  
  try {
    // 쿼리 파라미터 일부 제거
    let cleanUrl = url.toLowerCase().trim();
    
    // 불필요한 파라미터 제거
    const paramsToRemove = ['utm_source', 'utm_medium', 'utm_campaign', 'fbclid'];
    paramsToRemove.forEach(param => {
      const regex = new RegExp(`[&?]${param}=[^&]*`, 'gi');
      cleanUrl = cleanUrl.replace(regex, '');
    });
    
    return cleanUrl;
  } catch (error) {
    return url.toLowerCase();
  }
}

// 중복 키 생성
function createDedupeKey(item) {
  const normalizedTitle = normalizeText(item.title);
  const normalizedUrl = normalizeUrl(item.link);
  
  // 제목과 URL을 조합하여 고유 키 생성
  return `${normalizedTitle}|${normalizedUrl}`;
}

// 제목 유사도 검사 (간단한 버전)
function isSimilarTitle(title1, title2, threshold = 0.8) {
  const norm1 = normalizeText(title1);
  const norm2 = normalizeText(title2);
  
  if (norm1 === norm2) return true;
  if (norm1.length === 0 || norm2.length === 0) return false;
  
  // 간단한 포함 관계 검사
  const shorter = norm1.length < norm2.length ? norm1 : norm2;
  const longer = norm1.length < norm2.length ? norm2 : norm1;
  
  if (shorter.length < 10) return false; // 너무 짧은 제목은 유사도 검사 안함
  
  return longer.includes(shorter) || shorter.includes(longer);
}

// 메인 중복 제거 함수
function dedupe(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }
  
  const seen = new Set();
  const result = [];
  const titleGroups = [];
  
  // 1단계: 정확한 중복 제거 (제목 + URL 기반)
  for (const item of items) {
    const key = createDedupeKey(item);
    
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  
  // 2단계: 유사한 제목 중복 제거
  const finalResult = [];
  
  for (const item of result) {
    let isDuplicate = false;
    
    // 기존 그룹과 유사한지 확인
    for (let i = 0; i < titleGroups.length; i++) {
      const group = titleGroups[i];
      
      if (isSimilarTitle(item.title, group.representative.title)) {
        isDuplicate = true;
        
        // 더 상세한 설명을 가진 것을 선택
        const currentDesc = item.description || item.title;
        const groupDesc = group.representative.description || group.representative.title;
        
        if (currentDesc.length > groupDesc.length) {
          // 기존 대표를 새 아이템으로 교체
          const oldIndex = finalResult.findIndex(x => x === group.representative);
          if (oldIndex !== -1) {
            finalResult[oldIndex] = item;
          }
          group.representative = item;
        }
        break;
      }
    }
    
    if (!isDuplicate) {
      titleGroups.push({
        representative: item
      });
      finalResult.push(item);
    }
  }
  
  return finalResult;
}

// 부처별 우선순위 적용
function prioritizedDedupe(items) {
  if (!Array.isArray(items)) return [];
  
  const deduped = dedupe(items);
  
  // korea.kr 소스 우선순위 적용
  const priorityMap = new Map();
  
  deduped.forEach(item => {
    const titleKey = normalizeText(item.title);
    
    if (!priorityMap.has(titleKey)) {
      priorityMap.set(titleKey, item);
    } else {
      const existing = priorityMap.get(titleKey);
      
      // korea.kr 소스를 우선으로 선택
      if (item.link && item.link.includes('korea.kr') && 
          existing.link && !existing.link.includes('korea.kr')) {
        priorityMap.set(titleKey, item);
      }
      // 보도자료가 공지보다 우선
      else if (item.type && item.type.includes('보도') && 
               existing.type && !existing.type.includes('보도')) {
        priorityMap.set(titleKey, item);
      }
    }
  });
  
  return Array.from(priorityMap.values());
}

module.exports = {
  dedupe: prioritizedDedupe // 기본적으로 우선순위가 적용된 중복제거 사용
};
