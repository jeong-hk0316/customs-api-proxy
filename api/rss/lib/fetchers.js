const { XMLParser } = require("fast-xml-parser");
const cheerio = require("cheerio");

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });

async function fetchRSS(url) {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/rss+xml,text/xml,*/*" } });
  if (!res.ok) throw new Error(`RSS fetch failed: ${res.status}`);
  const xml = await res.text();
  const data = parser.parse(xml);
  const items = data?.rss?.channel?.item || data?.channel?.item || [];
  return Array.isArray(items) ? items : [items];
}

async function fetchHTMLList(url) {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`HTML fetch failed: ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);
  const rows = [];
  // 공정위 공지: 테이블 기반
  $("table.board_list tbody tr").each((_, el) => {
    const a = $(el).find("a");
    const title = a.text().trim();
    const href = a.attr("href");
    if (!title || !href) return;
    const link = new URL(href, url).toString();
    const date = $(el).find("td").last().text().trim();
    rows.push({ title, link, pubDate: date });
  });
  return rows;
}

// ★ 환경부용 HTML 파서 (공지·공고 / 보도자료 목록)
async function fetchHTMLListME(url) {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`ME HTML fetch failed: ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);
  const rows = [];

  // 1) 테이블 형태 시도
  $("table tbody tr").each((_, el) => {
    const a = $(el).find("a[href*='read.do']");
    if (!a.length) return;
    const title = a.text().replace(/\s+/g, " ").trim();
    const href = a.attr("href");
    if (!title || !href) return;
    const link = new URL(href, url).toString();

    // 날짜 칸 후보: 보통 마지막/혹은 '등록일' 열
    let date = $(el).find("td").filter((i, td) => /(\d{4}[.\-\/]\d{1,2}[.\-\/]\d{1,2})/.test($(td).text())).last().text().trim();
    if (!date) date = $(el).find("td").last().text().trim();

    rows.push({ title, link, pubDate: date });
  });

  // 2) 리스트(ul/li) 형태 시도 (백업)
  if (rows.length === 0) {
    $("li a[href*='read.do']").each((_, el) => {
      const a = $(el);
      const title = a.text().replace(/\s+/g, " ").trim();
      const href = a.attr("href");
      if (!title || !href) return;
      const link = new URL(href, url).toString();

      // 인접 요소/부모 안에서 날짜 패턴 검색
      let date = a.closest("li").text().match(/(\d{4}[.\-\/]\d{1,2}[.\-\/]\d{1,2})/)?.[1] || "";
      rows.push({ title, link, pubDate: date.trim() });
    });
  }

  return rows;
}

function normalizeRSSItem(it, fallbackMinistry, fallbackType) {
  const title = it.title || it["dc:title"] || "";
  const link = it.link?.href || it.link || it.guid || "";
  const pubDate = it.pubDate || it["dc:date"] || it["atom:updated"] || it["updated"] || it["date"] || "";
  const desc = it.description || it["content:encoded"] || it.summary || "";
  return {
    title: String(title).trim(),
    link: String(link).trim(),
    pubDate: String(pubDate).trim(),
    ministry: fallbackMinistry,
    type: fallbackType,
    description: String(desc).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
  };
}

module.exports = { fetchRSS, fetchHTMLList, fetchHTMLListME, normalizeRSSItem };
