// KST 시간 처리 유틸리티

export function getKSTDate() {
  const now = new Date();
  const kst = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
  return kst;
}

export function getYesterday() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const kst = new Date(yesterday.getTime() + (9 * 60 * 60 * 1000));
  return kst;
}

export function formatDateToKST(date) {
  if (!date) return null;
  
  let targetDate;
  if (typeof date === 'string') {
    targetDate = new Date(date);
  } else {
    targetDate = date;
  }
  
  // KST로 변환
  const kstDate = new Date(targetDate.getTime() + (9 * 60 * 60 * 1000));
  
  const year = kstDate.getFullYear();
  const month = String(kstDate.getMonth() + 1).padStart(2, '0');
  const day = String(kstDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

export function isWithinTimeRange(itemDate) {
  if (!itemDate) return false;
  
  const today = getKSTDate();
  const yesterday = getYesterday();
  
  // 어제 00:00부터 오늘 23:59까지
  const startTime = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0);
  const endTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
  
  let targetDate;
  if (typeof itemDate === 'string') {
    targetDate = new Date(itemDate);
  } else {
    targetDate = itemDate;
  }
  
  const kstTargetDate = new Date(targetDate.getTime() + (9 * 60 * 60 * 1000));
  
  return kstTargetDate >= startTime && kstTargetDate <= endTime;
}

export function parseKoreanDate(dateStr) {
  if (!dateStr) return null;
  
  try {
    // 다양한 한국어 날짜 형식 처리
    // 예: "2024-01-01", "2024.01.01", "01-01", "1월 1일" 등
    
    // YYYY-MM-DD 또는 YYYY.MM.DD 형식
    const standardMatch = dateStr.match(/(\d{4})[-.](\d{1,2})[-.](\d{1,2})/);
    if (standardMatch) {
      const [, year, month, day] = standardMatch;
      return new Date(year, month - 1, day);
    }
    
    // MM-DD 형식 (올해로 가정)
    const shortMatch = dateStr.match(/(\d{1,2})[-.](\d{1,2})/);
    if (shortMatch) {
      const [, month, day] = shortMatch;
      const currentYear = new Date().getFullYear();
      return new Date(currentYear, month - 1, day);
    }
    
    // "N월 N일" 형식
    const koreanMatch = dateStr.match(/(\d{1,2})월\s*(\d{1,2})일/);
    if (koreanMatch) {
      const [, month, day] = koreanMatch;
      const currentYear = new Date().getFullYear();
      return new Date(currentYear, month - 1, day);
    }
    
    // 기본적으로 Date 생성자 시도
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? null : parsed;
    
  } catch (error) {
    console.error('Date parsing error:', error);
    return null;
  }
}
