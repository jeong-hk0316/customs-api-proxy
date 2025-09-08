// 부처별 RSS 및 HTML 소스 목록
export const RSS_SOURCES = [
  // 농림축산식품부
  {
    department: '농림축산식품부',
    category: '공지·공고',
    type: 'rss',
    url: 'https://www.mafra.go.kr/bbs/home/791/rssList.do?row=50'
  },
  {
    department: '농림축산식품부',
    category: '보도자료',
    type: 'rss',
    url: 'https://www.mafra.go.kr/bbs/home/792/rssList.do?row=50'
  },
  
  // 환경부
  {
    department: '환경부',
    category: '공지·공고',
    type: 'rss',
    url: 'https://me.go.kr/home/web/board/rss.do?menuId=290&boardMasterId=39'
  },
  {
    department: '환경부',
    category: '보도·해명자료',
    type: 'rss',
    url: 'https://me.go.kr/home/web/board/rss.do?menuId=286&boardMasterId=1'
  },
  
  // 기획재정부
  {
    department: '기획재정부',
    category: '보도·참고자료',
    type: 'rss',
    url: 'https://www.moef.go.kr/com/detailRssTagService.do?bbsId=MOSFBBS_000000000028'
  },
  {
    department: '기획재정부',
    category: '공지',
    type: 'rss',
    url: 'https://www.moef.go.kr/com/detailRssTagService.do?bbsId=MOSFBBS_000000000030'
  },
  
  // 공정거래위원회
  {
    department: '공정거래위원회',
    category: '보도자료',
    type: 'rss',
    url: 'https://www.korea.kr/rss/dept_ftc.xml',
    fallbackUrl: 'https://www.ftc.go.kr/www/selectBbsNttList.do?bordCd=3&key=12',
    fallbackType: 'html'
  },
  {
    department: '공정거래위원회',
    category: '공지/공고',
    type: 'html',
    url: 'https://www.ftc.go.kr/www/selectBbsNttList.do?bordCd=49&key=13'
  },
  
  // 식품의약품안전처
  {
    department: '식품의약품안전처',
    category: '보도자료',
    type: 'rss',
    url: 'http://www.mfds.go.kr/www/rss/brd.do?brdId=ntc0021'
  },
  
  // 국방부
  {
    department: '국방부',
    category: '보도자료',
    type: 'rss',
    url: 'https://www.korea.kr/rss/dept_mnd.xml',
    fallbackUrl: 'https://www.mnd.go.kr/user/newsInUserRecord.action?handle=I_669&id=mnd_020500000000&siteId=mnd',
    fallbackType: 'html'
  },
  
  // 중소벤처기업부
  {
    department: '중소벤처기업부',
    category: '공지사항',
    type: 'rss',
    url: 'https://mss.go.kr/rss/smba/board/81.do'
  },
  {
    department: '중소벤처기업부',
    category: '보도자료',
    type: 'rss',
    url: 'https://mss.go.kr/rss/smba/board/86.do'
  }
];

export default RSS_SOURCES;
