const axios = require('axios');
const xml2js = require('xml2js');

module.exports = async (req, res) => {
  const parser = new xml2js.Parser({ 
    explicitArray: false,
    ignoreAttrs: true 
  });
  
  try {
    const { hsSgn } = req.query;
    
    if (!hsSgn) {
      return res.status(400).json({
        error: 'HS코드(hsSgn)는 필수입니다'
      });
    }
    
    const url = 'https://unipass.customs.go.kr:38010/ext/rest/trrtQry/retrieveTrrt';
    const response = await axios.get(url, {
      params: {
        crkyCn: 'h230s205h078z119t090z040x0',
        hsSgn: hsSgn
      },
      timeout: 10000
    });
    
    // XML 파싱
    const data = await parser.parseStringPromise(response.data);
    
    // 디버깅용 - 전체 구조 확인
    console.log('파싱된 데이터:', JSON.stringify(data, null, 2));
    
    const result = {
      hsCode: hsSgn,
      tariffs: [],
      basicRate: null,
      rawData: data  // 원본 데이터도 포함
    };
    
    // 여러 경로 시도
    const possiblePaths = [
      data.TrrtQryRtnVo?.TrrtQryRsltVo,
      data.response?.body?.items?.item,
      data.items?.item,
      data
    ];
    
    for (const path of possiblePaths) {
      if (path) {
        const tariffList = Array.isArray(path) ? path : [path];
        
        tariffList.forEach(item => {
          // 다양한 필드명 확인
          const rate = item.trrt || item.trrtRate || item.rate;
          const type = item.trrtTpNm || item.trrtTpcdNm || item.typeName;
          const code = item.trrtTpcd || item.trrtTpCode || item.code;
          
          if (rate) {
            const tariffInfo = {
              type: type || '기타',
              rate: rate,
              code: code || '',
              startDate: item.aplyStrtDt || item.aplyBgnDt || '',
              endDate: item.aplyEndDt || ''
            };
            
            result.tariffs.push(tariffInfo);
            
            if (code === 'A' || type?.includes('기본')) {
              result.basicRate = rate;
            }
          }
        });
        
        if (result.tariffs.length > 0) break;
      }
    }
    
    res.status(200).json({
      success: true,
      hsCode: hsSgn,
      basicRate: result.basicRate ? result.basicRate + '%' : 'N/A',
      totalCount: result.tariffs.length,
      tariffs: result.tariffs,
      debug: result.rawData  // 디버깅용
    });
    
  } catch (error) {
    console.error('Error:', error.message);
    res.status(200).json({
      success: false,
      hsCode: req.query.hsSgn,
      error: error.message,
      tariffs: []
    });
  }
};
