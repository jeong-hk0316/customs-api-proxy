// /api/rss/daily.js
const { FEEDS } = require("./lib/rssFeeds");
const { fetchRSS, fetchHTMLList, normalizeRSSItem } = require("./lib/fetchers");
const { dedupe } = require("./lib/dedupe");
const { summarizeKo20 } = require("./lib/summarizer");
const { dateRangeKST, formatYMDKST, coerceItemDate } = require("./lib/timeKST");

module.exports = async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    const from = url.searchParams.get("from"); // YYYY-MM-DD
    const to   = url.searchParams.get("to");   // YYYY-MM-DD
    const { start, end } = dateRangeKST(from, to);

    const all = [];
    await Promise.all(
      FEEDS.map(async ({ ministry, type, url, format }) => {
        try {
          if (format === "rss") {
            const items = await fetchRSS(url);
            for (const it of items) {
              const n = normalizeRSSItem(it, ministry, type);
              // 환경부 대응: pubDate 없으면 title/description에서 날짜 추출 → 오늘 fallback
              const d = coerceItemDate(
                { pubDate: n.pubDate, title: n.title, description: n.description },
                { fallbackToToday: true }
              );
              if (!d) continue;
              if (d >= start && d <= end) {
                all.push({
                  dateYMD: formatYMDKST(d),
                  type,
                  ministry,
                  title: n.title,
                  link: n.link,
                  description: n.description
                });
              }
            }
          } else if (format === "html") {
            const rows = await fetchHTMLList(url);
            for (const r of rows) {
              // HTML 목록은 pubDate 문자열이 표준이 아닐 수 있으므로 동일 로직 사용
              const d = coerceItemDate(
                { pubDate: r.pubDate, title: r.title, description: null },
                { fallbackToToday: false } // HTML 목록은 날짜 칸을 신뢰하는 편 → 없으면 제외
              );
              if (!d) continue;
              if (d >= start && d <= end) {
                all.push({
                  dateYMD: formatYMDKST(d),
                  type,
                  ministry,
                  title: r.title,
                  link: r.link,
                  description: r.title // HTML은 본문 없음 → 제목을 요약에 사용
                });
              }
            }
          }
        } catch (e) {
          console.error(`[RSS] ${ministry}/${type} 실패: ${e.message}`);
        }
      })
    );

    // 중복 제거 (korea.kr vs 부처 원문 등)
    const unique = dedupe(
      all.map((it) => ({
        ...it,
        title: it.title.replace(/<[^>]+>/g, " ").trim()
      }))
    );

    // 최신순(날짜 내림차순)
    unique.sort((a, b) => (a.dateYMD < b.dateYMD ? 1 : a.dateYMD > b.dateYMD ? -1 : 0));

    // 마크다운 표 출력
    const header = "| 기사 날짜 | 구분 | 부처 | 내용(간략하게) | 원문 |\n|---|---|---|---|---|";
    const rows = unique.map((it) => {
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
