const { XMLParser } = require("fast-xml-parser");
const cheerio = require("cheerio");

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });

// 공통: 강한 헤더 + 리다이렉트 추적
async function robustFetch(url, { referer } = {}) {
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    ...(referer ? { "Referer": referer } : {})
  };
  const res = await fetch(url, { headers, redirect: "follow" });
  const text = await res.text();
  return { ok: res.ok, status: res.status, url: res.url, text };
}

// ───────────────── RSS
async function fetchRSS(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Accept": "application/rss+xml,application/xml;q=0.9,*/*;q=0.8"
    },
    redirect: "follow"
  });
  if (!res.ok) throw new Error(`RSS fetch failed: ${res.status}`);
  const xml = await res.text();
  const data = parser.parse(xml);
  const items = data?.rss?.channel?.item || data?.channel?.item || [];
  return Array.isArray(items) ? items : [items];
}

// ───────────────── 공정위(공지) 기본 HTML 파서
async function fetchHTMLList(url) {
  const { ok, status, text, url: real } = await robustFetch(url, { referer: url });
  if (!ok) throw new Error(`HTML fetch failed: ${status}`);
  const $ = cheerio.load(text);
  const rows = [];
  $("table.board_list tbody tr").each((_, el) => {
    const a = $(el).find("a");
    const title = a.text().trim();
    const href = a.attr("href");
    if (!title || !href) return;
    const link = new URL(href, real).toString();
    const date = $(el).find("td").last().text().trim();
    rows.push({ title, link, pubDate: date });
  });
  return rows;
}

// ───────────────── 환경부 전용 HTML 파서 (me ↔ www 시도 + 본문 오류 감지)
async function fetchHTMLListME(url) {
  const candidates = [url, url.replace("://me.", "://www.me.")];
  let html = null, finalUrl = null, lastStatus = null;

  for (const u of candidates) {
    const { ok, status, url: real, text } = await robustFetch(u, { referer: u });
    lastStatus = status;
    const looks404 = /Page Not Found|요청하신 페이지를 찾을 수 없습니다/i.test(text);
    if (ok && !looks404) { html = text; finalUrl = real; break; }
  }
  if (!html) throw new Error(`ME HTML fetch failed (status=${lastStatus}) or error page returned`);

  const $ = cheerio.load(html);
  const rows = [];

  // 테이블 형태 우선
  $("table tbody tr").each((_, el) => {
    let a = $(el).find("a[href*='read.do']");
    if (!a.length) a = $(el).find("a[href]");
    const title = a.text().replace(/\s+/g, " ").trim();
    const href = a.attr("href");
    if (!title || !href) return;
    const link = new URL(href, finalUrl).toString();

    let date = "";
    $(el).find("td").each((__, td) => {
      const t = $(td).text().trim();
      if (/(\d{4}[.\-\/]\d{1,2}[.\-\/]\d{1,2})/.test(t)) date = t;
    });
    if (!date) date = $(el).find("td").last().text().trim();

    rows.push({ title, link, pubDate: date });
  });

  // 리스트(ul/li) 백업
  if (rows.length === 0) {
    $("li a[href*='read.do'], li a[href]").each((_, el) => {
      const a = $(el);
      const title = a.text().replace(/\s+/g, " ").trim();
      const href = a.attr("href");
      if (!title || !href) return;
      const link = new URL(href, finalUrl).toString();
      const date = a.closest("li").text().match(/(\d{4}[.\-\/]\d{1,2}[.\-\/]\d{1,2})/)?.[1] || "";
      rows.push({ title, link, pubDate: date.trim() });
    });
  }

  return rows;
}

// ───────────────── 동반성장위원회 전용 HTML 파서
async function fetchHTMLListKCCP(url) {
  const { ok, status, text, url: real } = await robustFetch(url, { referer: url });
  if (!ok) throw new Error(`KCCP HTML fetch failed: ${status}`);

  const $ = cheerio.load(text);
  const rows = [];

  // 1) 테이블 기반
  $("table tbody tr").each((_, el) => {
    let a = $(el).find("a[href*='View'], a[href*='view'], a[href*='nv_newsView'], a[href*='nv_noticeView']");
    if (!a.length) a = $(el).find("a[href]");
    const title = a.text().replace(/\s+/g, " ").trim();
    const href = a.attr("href");
    if (!title || !href) return;
    const link = new URL(href, real).toString();

    let date = "";
    $(el).find("td").each((__, td) => {
      const t = $(td).text().trim();
      if (/(\d{4}[.\-\/]\d{1,2}[.\-\/]\d{1,2})/.test(t)) date = t;
    });
    if (!date) date = $(el).find("td").last().text().trim();

    rows.push({ title, link, pubDate: date });
  });

  // 2) 리스트(ul/li) 백업
  if (rows.length === 0) {
    $("li a[href]").each((_, el) => {
      const a = $(el);
      const title = a.text().replace(/\s+/g, " ").trim();
      const href = a.attr("href");
      if (!title || !href) return;
      const link = new URL(href, real).toString();
      const date = a.closest("li").text().match(/(\d{4}[.\-\/]\d{1,2}[.\-\/]\d{1,2})/)?.[1] || "";
      rows.push({ title, link, pubDate: date.trim() });
    });
  }

  return rows;
}

// ───────────────── 공통: RSS 아이템 정규화
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

module.exports = {
  fetchRSS,
  fetchHTMLList,
  fetchHTMLListME,
  fetchHTMLListKCCP,
  normalizeRSSItem,
  robustFetch
};
