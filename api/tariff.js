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
    
    console.log('관세율 조회 시작:', hsSgn);
    
    // UNI-PASS 관세율 조회 API
    const url = 'https://unipass.customs.go.kr:38010/ext/rest/trrtQry/retrieveTrrt';
    const response = await axios.get(url, {
      params: {
        crkyCn: 'h230s205h078z119t090z040x0',
        hsSgn: hsSgn
      },
      timeout: 10000
    });
    
    // XML을 JSON으로 변환
    const data = await parser.parseStringPromise(response.data);
    
    // 결과 정리
    const result = {
      hsCode: hsSgn,
      tariffs: [],
      basicRate: null
    };
    
    // 데이터 파싱
    if (data.TrrtQryRtnVo?.TrrtQryRsltVo) {
      const items = data.TrrtQryRtnVo.TrrtQryRsltVo;
      const tariffList = Array.isArray(items) ? items : [items];
      
      tariffList.forEach(item => {
        if (item.trrt) {
          const tariffInfo = {
            type: item.trrtTpNm || '기타',
            rate: item.trrt,
            code: item.trrtTpcd || '',
            startDate: item.aplyStrtDt || '',
            endDate: item.aplyEndDt || ''
          };
          
          result.tariffs.push(tariffInfo);
          
          // 기본세율 찾기
          if (item.trrtTpcd === 'A') {
            result.basicRate = item.trrt;
          }
        }
      });
    }
    
    // 성공 응답
    res.status(200).json({
      success: true,
      hsCode: hsSgn,
      basicRate: result.basicRate ? result.basicRate + '%' : 'N/A',
      totalCount: result.tariffs.length,
      tariffs: result.tariffs
    });
    
  } catch (error) {
    console.error('Tariff API Error:', error.message);
    
    // 에러 시에도 기본 응답
    res.status(200).json({
      success: false,
      hsCode: req.query.hsSgn || '',
      message: '관세율 조회 중 오류가 발생했습니다',
      error: error.message,
      tariffs: []
    });
  }
};
