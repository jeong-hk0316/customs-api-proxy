const { XMLParser } = require("fast-xml-parser");
const cheerio = require("cheerio");

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });

async function fetchRSS(url) {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
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
  // 공정위 공지 목록(사이트 구조 변동 시 선택자 조정)
  $("table.board_list tbody tr").each((_, el) => {
    const a = $(el).find("a");
    const title = a.text().trim();
    const href = a.attr("href");
    if (!title || !href) return;
    const link = new URL(href, url).toString();
    const date = $(el).find("td").last().text().trim(); // 마지막 열이 날짜인 경우
    rows.push({ title, link, pubDate: date });
  });
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

module.exports = { fetchRSS, fetchHTMLList, normalizeRSSItem };
