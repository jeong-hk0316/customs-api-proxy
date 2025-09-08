const { XMLParser } = require("fast-xml-parser");
const cheerio = require("cheerio");

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });

async function robustFetch(url, { referer } = {}) {
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    "Cache-Control": "no-cache",
    ...(referer ? { "Referer": referer } : {})
  };
  const res = await fetch(url, { headers, redirect: "follow" });
  const text = await res.text();
  return { ok: res.ok, status: res.status, url: res.url, text };
}

async function fetchHTMLListME(url) {
  // 환경부는 me.go.kr / www.me.go.kr 둘 다 존재하므로 둘 다 시도
  const candidates = [url, url.replace("://me.", "://www.me.")];

  let html = null, finalUrl = null, lastStatus = null;

  for (const u of candidates) {
    const { ok, status, url: real, text } = await robustFetch(u, { referer: u });
    lastStatus = status;
    // 서버가 200이지만 바디는 오류 페이지일 수 있으니 바디도 검사
    const looks404 = /Page Not Found|요청하신 페이지를 찾을 수 없습니다/i.test(text);
    if (ok && !looks404) { html = text; finalUrl = real; break; }
  }

  if (!html) {
    throw new Error(`ME HTML fetch failed (status=${lastStatus}) or error page returned`);
  }

  const $ = cheerio.load(html);
  const rows = [];

  // 1) 테이블 형태
  $("table tbody tr").each((_, el) => {
    const a = $(el).find("a[href*='read.do']");
    if (!a.length) return;
    const title = a.text().replace(/\s+/g, " ").trim();
    const href = a.attr("href");
    if (!title || !href) return;
    const link = new URL(href, finalUrl).toString();

    let dateCell = "";
    $(el).find("td").each((__, td) => {
      const t = $(td).text().trim();
      if (/(\d{4}[.\-\/]\d{1,2}[.\-\/]\d{1,2})/.test(t)) dateCell = t;
    });
    if (!dateCell) dateCell = $(el).find("td").last().text().trim();

    rows.push({ title, link, pubDate: dateCell });
  });

  // 2) 리스트(ul/li) 백업
  if (rows.length === 0) {
    $("li a[href*='read.do']").each((_, el) => {
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

async function fetchRSS(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0 Safari/537.36",
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
