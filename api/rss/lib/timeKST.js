// KST 시간 처리 유틸리티

// 기본값: 어제부터 오늘까지 (KST)
function dateRangeKST(from, to) {
  const now = new Date();
  const kstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
  
  let start, end;
  
  if (from) {
    // YYYY-MM-DD 형식
    start = new Date(`${from}T00:00:00+09:00`);
  } else {
    // 어제 00:00 KST
    const yesterday = new Date(kstNow);
    yesterday.setDate(yesterday.getDate() - 1);
    start = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0);
  }
  
  if (to) {
    // YYYY-MM-DD 형식
    end = new Date(`${to}T23:59:59+09:00`);
  } else {
    // 오늘 23:59 KST
    end = new Date(kstNow.getFullYear(), kstNow.getMonth(), kstNow.getDate(), 23, 59, 59);
  }
  
  return { start, end };
}

// 날짜를 YYYY-MM-DD 형식으로 포맷 (KST)
function formatYMDKST(date) {
  if (!date) return '';
  
  const kstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));
  const year = kstDate.getFullYear();
  const month = String(kstDate.getMonth() + 1).padStart(2, '0');
  const day = String(kstDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

// 한국어 날짜 파싱 (다양한 형식 지원)
function parseKoreanDate(dateStr) {
  if (!dateStr) return null;
  
  try {
    // 기본 Date 파싱 시도
    const basicDate = new Date(dateStr);
    if (!isNaN(basicDate.getTime())) {
      return basicDate;
    }
    
    // YYYY-MM-DD, YYYY.MM.DD, YYYY/MM/DD 형식
    const standardMatch = dateStr.match(/(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})/);
    if (standardMatch) {
      const [, year, month, day] = standardMatch;
      return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T12:00:00+09:00`);
    }
    
    // MM-DD 형식 (현재 년도로 가정)
    const shortMatch = dateStr.match(/(\d{1,2})[.\-\/](\d{1,2})/);
    if (shortMatch) {
      const [, month, day] = shortMatch;
      const currentYear = new Date().getFullYear();
      return new Date(`${currentYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T12:00:00+09:00`);
    }
    
    // "N월 N일" 형식
    const koreanMatch = dateStr.match(/(\d{1,2})월\s*(\d{1,2})일/);
    if (koreanMatch) {
      const [, month, day] = koreanMatch;
      const currentYear = new Date().getFullYear();
      return new Date(`${currentYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T12:00:00+09:00`);
    }
    
    return null;
  } catch (error) {
    console.error('Date parsing error:', error);
    return null;
  }
}

module.exports = {
  dateRangeKST,
  formatYMDKST,
  parseKoreanDate
};
