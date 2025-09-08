import * as cheerio from 'cheerio';
import { parseKoreanDate, isWithinTimeRange, formatDateToKST } from './time.js';

// RSS XML 파싱
export async function fetchRSS(url, department, category) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const xmlText = await response.text();
    const $ = cheerio.load(xmlText, { xmlMode: true });
    
    const items = [];
    
    $('item').each((i, elem) => {
      const $item = $(elem);
      
      const title = $item.find('title').text().trim();
      const link = $item.find('link').text().trim();
      const description = $item.find('description').text().trim();
      const pubDate = $item.find('pubDate').text().trim();
      
      // 날짜 파싱 및 필터링
      const parsedDate = parseKoreanDate(pubDate) || new Date(pubDate);
      
      if (isWithinTimeRange(parsedDate)) {
        items.push({
          date: formatDateToKST(parsedDate),
          category,
          department,
          title,
          description,
          link,
          source: 'rss'
        });
      }
    });
    
    return items;
    
  } catch (error) {
    console.error(`RSS fetch error (${url}):`, error.message);
    return [];
  }
}

// HTML 스크래핑 (RSS가 없는 경우)
export async function fetchHTML(url, department, category) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const items = [];
    
    // 각 사이트별 선택자 (사이트마다 다름)
    let selector = '';
    let titleSelector = '';
    let linkSelector = '';
    let dateSelector = '';
    
    if (url.includes('ftc.go.kr')) {
      // 공정거래위원회
      selector = 'table tbody tr';
      titleSelector = 'td:nth-child(2) a';
      linkSelector = 'td:nth-child(2) a';
      dateSelector = 'td:nth-child(3)';
    } else if (url.includes('mnd.go.kr')) {
      // 국방부
      selector = '.board_list tbody tr';
      titleSelector = '.subject a';
      linkSelector = '.subject a';
      dateSelector = '.date';
    }
    
    if (selector) {
      $(selector).each((i, elem) => {
        if (i >= 20) return false; // 최대 20개만
        
        const $row = $(elem);
        
        const titleElem = $row.find(titleSelector);
        const title = titleElem.text().trim();
        const relativeLink = titleElem.attr('href');
        
        if (!title || !relativeLink) return;
        
        // 상대 링크를 절대 링크로 변환
        const link = relativeLink.startsWith('http') 
          ? relativeLink 
          : new URL(relativeLink, url).href;
        
        const dateText = $row.find(dateSelector).text().trim();
        const parsedDate = parseKoreanDate(dateText);
        
        if (parsedDate && isWithinTimeRange(parsedDate)) {
          items.push({
            date: formatDateToKST(parsedDate),
            category,
            department,
            title,
            description: title, // HTML에서는 제목을 설명으로 사용
            link,
            source: 'html'
          });
        }
      });
    }
    
    return items;
    
  } catch (error) {
    console.error(`HTML fetch error (${url}):`, error.message);
    return [];
  }
}

// 모든 소스에서 데이터 가져오기
export async function fetchAllSources(sources) {
  const allPromises = sources.map(async (source) => {
    try {
      let items = [];
      
      if (source.type === 'rss') {
        items = await fetchRSS(source.url, source.department, source.category);
        
        // RSS 실패 시 fallback HTML 시도
        if (items.length === 0 && source.fallbackUrl && source.fallbackType === 'html') {
          items = await fetchHTML(source.fallbackUrl, source.department, source.category);
        }
      } else if (source.type === 'html') {
        items = await fetchHTML(source.url, source.department, source.category);
      }
      
      return items;
      
    } catch (error) {
      console.error(`Source fetch error:`, error);
      return [];
    }
  });
  
  const results = await Promise.all(allPromises);
  return results.flat();
}
