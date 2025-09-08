// 부처·구분별 소스 정의 (RSS 우선, RSS 없으면 HTML)
module.exports.FEEDS = [
  // 농림축산식품부
  { ministry: "농림축산식품부", type: "공지·공고", url: "https://www.mafra.go.kr/bbs/home/791/rssList.do?row=50", format: "rss" },
  { ministry: "농림축산식품부", type: "보도자료", url: "https://www.mafra.go.kr/bbs/home/792/rssList.do?row=50", format: "rss" },

  // 환경부
  { ministry: "환경부", type: "공지·공고", url: "https://me.go.kr/home/web/board/rss.do?menuId=290&boardMasterId=39", format: "rss" },
  { ministry: "환경부", type: "보도·해명자료", url: "https://me.go.kr/home/web/board/rss.do?menuId=286&boardMasterId=1", format: "rss" },

  // 기획재정부
  { ministry: "기획재정부", type: "보도·참고자료", url: "https://www.moef.go.kr/com/detailRssTagService.do?bbsId=MOSFBBS_000000000028", format: "rss" },
  { ministry: "기획재정부", type: "공지", url: "https://www.moef.go.kr/com/detailRssTagService.do?bbsId=MOSFBBS_000000000030", format: "rss" },

  // 공정거래위원회
  { ministry: "공정거래위원회", type: "보도자료", url: "https://www.korea.kr/rss/dept_ftc.xml", format: "rss" },
  { ministry: "공정거래위원회", type: "공지/공고", url: "https://www.ftc.go.kr/www/selectBbsNttList.do?bordCd=49&key=13", format: "html" },

  // 식품의약품안전처
  { ministry: "식품의약품안전처", type: "보도자료", url: "http://www.mfds.go.kr/www/rss/brd.do?brdId=ntc0021", format: "rss" },

  // 국방부
  { ministry: "국방부", type: "보도자료", url: "https://www.korea.kr/rss/dept_mnd.xml", format: "rss" },

  // 중소벤처기업부
  { ministry: "중소벤처기업부", type: "공지사항", url: "https://mss.go.kr/rss/smba/board/81.do", format: "rss" },
  { ministry: "중소벤처기업부", type: "보도자료", url: "https://mss.go.kr/rss/smba/board/86.do", format: "rss" }
];
