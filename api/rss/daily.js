module.exports = (req, res) => {
  try {
    const { FEEDS } = require("./lib/rssFeeds");
    const { dateRangeKST, formatYMDKST } = require("./lib/timeKST");
    const { fetchRSS, fetchHTMLList, normalizeRSSItem } = require("./lib/fetchers");
    const { dedupe } = require("./lib/dedupe");
    const { summarizeKo20 } = require("./lib/summarizer");

    res.status(200).json({
      status: "파일 로드 성공",
      feeds: FEEDS ? FEEDS.length : 0,
      dateRange: dateRangeKST(),
      functions: {
        fetchRSS: typeof fetchRSS,
        dedupe: typeof dedupe,
        summarizeKo20: typeof summarizeKo20
      }
    });

  } catch (error) {
    res.status(500).json({
      status: "파일 로드 실패",
      error: error.message,
      stack: error.stack
    });
  }
};
