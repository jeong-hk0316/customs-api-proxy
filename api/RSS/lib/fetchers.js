// RSS와 HTML 데이터 가져오기

// RSS XML 파싱 (cheerio 없이 기본 문자열 파싱)
async function fetchRSS(url) {
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
    const items = [];
    
    // 간단한 XML 파싱 (정규식 사용)
    const itemMatches = xmlText.match(/<item[^>]*>[\s\S]*?<\/item>/gi);
    
    if (itemMatches) {
      itemMatches.forEach(itemXml => {
        const title = extractXmlTag(itemXml, 'title');
        const link = extractXmlTag(itemXml, 'link');
        const description = extractXmlTag(itemXml, 'description');
        const pubDate = extractXmlTag(itemXml, 'pubDate');
        
        if (title && link) {
          items.push({
            title: cleanHtml(title),
            link: link.trim(),
            description: cleanHtml(description || ''),
            pubDate: pubDate || ''
          });
        }
      });
    }
    
    return items;
    
  } catch (error) {
    console.error(`RSS fetch error (${url}):`, error.message);
    return [];
  }
}

// HTML 리스트 스크래핑 (기본적인 구현)
async function fetchHTMLList(url) {
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
    const items = [];
    
    // 간단한 HTML 파싱 (사이트별로 다를 수 있음)
    // 일반적인 테이블 형태의 공지사항 파싱
    const tableRowMatches = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi);
    
    if (tableRowMatches) {
      tableRowMatches.slice(1, 21).forEach(rowHtml => { // 첫 번째는 헤더, 최대 20개
        const cells = rowHtml.match(/<td[^>]*>[\s\S]*?<\/td>/gi);
        if (cells && cells.length >= 2) {
          const titleCell = cells[1] || cells[0];
          const dateCell = cells[cells.length - 1]; // 마지막 칸이 보통 날짜
          
          const titleMatch = titleCell.match(/<a[^>]*href=["']([^"']*)["'][^>]*>([^<]*)<\/a>/i);
          if (titleMatch) {
            const link = titleMatch[1];
            const title = cleanHtml(titleMatch[2]);
            const dateText = cleanHtml(extractTextFromHtml(dateCell));
            
            items.push({
              title,
              link: link.startsWith('http') ? link : new URL(link, url).href,
              pubDate: dateText
            });
          }
        }
      });
    }
    
    return items;
    
  } catch (error) {
    console.error(`HTML fetch error (${url}):`, error.message);
    return [];
  }
}

// RSS 아이템 정규화
function normalizeRSSItem(item, ministry, type) {
  return {
    title: item.title || '',
    link: item.link || '',
    description: item.description || '',
    pubDate: item.pubDate || '',
    ministry,
    type
  };
}

// XML 태그에서 내용 추출
function extractXmlTag(xml, tagName) {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : '';
}

// HTML 태그 제거 및 정리
function cleanHtml(text) {
  if (!text) return '';
  
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1') // CDATA 제거
    .replace(/<[^>]*>/g, '') // HTML 태그 제거
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ') // 연속된 공백 제거
    .trim();
}

// HTML에서 텍스트만 추출
function extractTextFromHtml(html) {
  return html.replace(/<[^>]*>/g, '').trim();
}

module.exports = {
  fetchRSS,
  fetchHTMLList,
  normalizeRSSItem
};
