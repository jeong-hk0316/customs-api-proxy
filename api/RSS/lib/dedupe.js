// 텍스트 정규화 (중복 제거용)
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
    const urlObj = new URL(url);
    
    // 쿼리 파라미터 제거 (일부 불필요한 것들)
    const paramsToRemove = ['utm_source', 'utm_medium', 'utm_campaign', 'fbclid'];
    paramsToRemove.forEach(param => {
      urlObj.searchParams.delete(param);
    });
    
    return urlObj.href.toLowerCase();
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

// 두 아이템이 유사한지 확인 (제목 유사도 기반)
function isSimilarTitle(title1, title2, threshold = 0.8) {
  const norm1 = normalizeText(title1);
  const norm2 = normalizeText(title2);
  
  if (norm1 === norm2) return true;
  
  // 간단한 문자열 유사도 계산 (Jaccard Index)
  const set1 = new Set(norm1.split(''));
  const set2 = new Set(norm2.split(''));
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  const similarity = intersection.size / union.size;
  return similarity >= threshold;
}

// 중복 제거 메인 함수
export function removeDuplicates(items) {
  if (!Array.isArray(items)) return [];
  
  const seenKeys = new Set();
  const result = [];
  const titleGroups = [];
  
  // 1단계: 정확한 중복 제거 (제목 + URL 기반)
  for (const item of items) {
    const key = createDedupeKey(item);
    
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      result.push(item);
    }
  }
  
  // 2단계: 유사한 제목 중복 제거
  const finalResult = [];
  
  for (const item of result) {
    let isDuplicate = false;
    
    for (const group of titleGroups) {
      if (isSimilarTitle(item.title, group.representative.title)) {
        isDuplicate = true;
        
        // 더 상세한 정보를 가진 것을 선택
        if (item.description.length > group.representative.description.length) {
          // 기존 대표를 새 아이템으로 교체
          const oldIndex = finalResult.indexOf(group.representative);
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
        representative: item,
        items: [item]
      });
      finalResult.push(item);
    }
  }
  
  return finalResult;
}

// 같은 부처 내 중복 제거 (더 엄격한 기준)
export function removeDepartmentDuplicates(items) {
  const departmentGroups = {};
  
  // 부처별로 그룹화
  items.forEach(item => {
    const dept = item.department;
    if (!departmentGroups[dept]) {
      departmentGroups[dept] = [];
    }
    departmentGroups[dept].push(item);
  });
  
  // 각 부처별로 중복 제거
  const result = [];
  Object.values(departmentGroups).forEach(deptItems => {
    result.push(...removeDuplicates(deptItems));
  });
  
  return result;
}

// 우선순위 기반 중복 제거 (korea.kr vs 부처 홈페이지)
export function prioritizedDedupe(items) {
  const deduped = removeDuplicates(items);
  
  // korea.kr 소스를 우선으로 하는 추가 로직
  const priorityMap = new Map();
  
  deduped.forEach(item => {
    const key = normalizeText(item.title);
    
    if (!priorityMap.has(key)) {
      priorityMap.set(key, item);
    } else {
      const existing = priorityMap.get(key);
      
      // korea.kr 소스 우선
      if (item.link.includes('korea.kr') && !existing.link.includes('korea.kr')) {
        priorityMap.set(key, item);
      }
      // 보도자료가 공지보다 우선
      else if (item.category.includes('보도') && !existing.category.includes('보도')) {
        priorityMap.set(key, item);
      }
    }
  });
  
  return Array.from(priorityMap.values());
}

export default {
  removeDuplicates,
  removeDepartmentDuplicates,
  prioritizedDedupe
};
