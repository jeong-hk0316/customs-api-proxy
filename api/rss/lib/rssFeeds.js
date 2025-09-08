// 부처별 RSS 및 HTML 소스 목록
const FEEDS = [
  // 농림축산식품부
  {
    ministry: '농림축산식품부',
    type: '공지·공고',
    format: 'rss',
    url: 'https://www.mafra.go.kr/bbs/home/791/rssList.do?row=50'
  },
  {
    ministry: '농림축산식품부',
    type: '보도자료',
    format: 'rss',
    url: 'https://www.mafra.go.kr/bbs/home/792/rssList.do?row=50'
  },
  
  // 환경부
  {
    ministry: '환경부',
    type: '공지·공고',
    format: 'rss',
    url: 'https://me.go.kr/home/web/board/rss.do?menuId=290&boardMasterId=39'
  },
  {
    ministry: '환경부',
    type: '보도·해명자료',
    format: 'rss',
    url: 'https://me.go.kr/home/web/board/rss.do?menuId=286&boardMasterId=1'
  },
  
  // 기획재정부
  {
    ministry: '기획재정부',
    type: '보도·참고자료',
    format: 'rss',
    url: 'https://www.moef.go.kr/com/detailRssTagService.do?bbsId=MOSFBBS_000000000028'
  },
  {
    ministry: '기획재정부',
    type: '공지',
    format: 'rss',
    url: 'https://www.moef.go.kr/com/detailRssTagService.do?bbsId=MOSFBBS_000000000030'
  },
  
  // 공정거래위원회
  {
    ministry: '공정거래위원회',
    type: '보도자료',
    format: 'rss',
    url: 'https://www.korea.kr/rss/dept_ftc.xml'
  },
  {
    ministry: '공정거래위원회',
    type: '공지/공고',
    format: 'html',
    url: 'https://www.ftc.go.kr/www/selectBbsNttList.do?bordCd=49&key=13'
  },
  
  // 식품의약품안전처
  {
    ministry: '식품의약품안전처',
    type: '보도자료',
    format: 'rss',
    url: 'http://www.mfds.go.kr/www/rss/brd.do?brdId=ntc0021'
  },
  
  // 국방부
  {
    ministry: '국방부',
    type: '보도자료',
    format: 'rss',
    url: 'https://www.korea.kr/rss/dept_mnd.xml'
  },
  
  // 중소벤처기업부
  {
    ministry: '중소벤처기업부',
    type: '공지사항',
    format: 'rss',
    url: 'https://mss.go.kr/rss/smba/board/81.do'
  },
  {
    ministry: '중소벤처기업부',
    type: '보도자료',
    format: 'rss',
    url: 'https://mss.go.kr/rss/smba/board/86.do'
  }
];

module.exports = { FEEDS };
