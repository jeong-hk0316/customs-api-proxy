const { FEEDS } = require("./lib/rssFeeds");
const { fetchRSS, fetchHTMLList, normalizeRSSItem } = require("./lib/fetchers");
const { dedupe } = require("./lib/dedupe");
const { summarizeKo20 } = require("./lib/summarizer");
const { dateRangeKST, formatYMDKST } = require("./lib/timeKST");

function parseDateFlexible(s) {
  if (!s) return null;
  const d1 = new Date(s);
  if (!isNaN(d1)) return d1;
  const m = String(s).match(/(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})/);
  if (m) return new Date(`${m[1]}-${m[2].padStart(2,"0")}-${m[3].padStart(2,"0")}T12:00:00+09:00`);
  return null;
}

module.exports = async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    const from = url.searchParams.get("from"); // YYYY-MM-DD
    const to   = url.searchParams.get("to");   // YYYY-MM-DD
    const { start, end } = dateRangeKST(from, to);
    
    const all = [];
    
    await Promise.all(FEEDS.map(async ({ ministry, type, url, format }) => {
      try {
        if (format === "rss") {
          const items = await fetchRSS(url);
          for (const it of items) {
            const n = normalizeRSSItem(it, ministry, type);
            const d = parseDateFlexible(n.pubDate);
            if (!d) continue;
            if (d >= start && d <= end) {
              all.push({
                dateYMD: formatYMDKST(d),
                type, ministry,
                title: n.title,
                link: n.link,
                description: n.description
              });
            }
          }
        } else if (format === "html") {
          const rows = await fetchHTMLList(url);
          for (const r of rows) {
            const d = parseDateFlexible(r.pubDate);
            if (!d) continue;
            if (d >= start && d <= end) {
              all.push({
                dateYMD: formatYMDKST(d),
                type, ministry,
                title: r.title,
                link: r.link,
                description: r.title
              });
            }
          }
        }
      } catch (e) {
        console.error(`[RSS] ${ministry}/${type} 실패: ${e.message}`);
      }
    }));
    
    const unique = dedupe(all.map(it => ({
      ...it,
      title: it.title.replace(/<[^>]+>/g, " ").trim()
    })));
    
    unique.sort((a, b) => (a.dateYMD < b.dateYMD ? 1 : (a.dateYMD > b.dateYMD ? -1 : 0)));
    
    const header = "| 기사 날짜 | 구분 | 부처 | 내용(간략하게) | 원문 |\n|---|---|---|---|---|";
    const rows = unique.map(it => {
      const summary = summarizeKo20(it.description || it.title);
      return `| ${it.dateYMD} | ${it.type} | ${it.ministry} | ${summary} | <a href="${it.link}">원문</a> |`;
    });
    
    const body = [header, ...rows].join("\n");
    
    res.setHeader("Content-Type", "text/markdown; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(body);
    
  } catch (err) {
    res.status(500).send(`수집 실패: ${err.message}`);
  }
};
