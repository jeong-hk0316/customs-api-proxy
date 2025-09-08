// api/rss/daily.js (임시 테스트)
try {
  const { FEEDS } = require("./lib/rssFeeds");
  const { dateRangeKST } = require("./lib/timeKST");
  
  module.exports = (req, res) => {
    res.status(200).json({ 
      message: "파일 로드 성공!",
      feedsCount: FEEDS ? FEEDS.length : 0,
      dateTest: dateRangeKST()
    });
  };
} catch (error) {
  module.exports = (req, res) => {
    res.status(500).json({ 
      error: "파일 로드 실패",
      message: error.message 
    });
  };
}
