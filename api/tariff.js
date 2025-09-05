const axios = require('axios');
const xml2js = require('xml2js');

module.exports = async (req, res) => {
  const parser = new xml2js.Parser({ 
    explicitArray: false,
    ignoreAttrs: true 
  });
  
  try {
    let { hsSgn } = req.query;
    
    if (!hsSgn) {
      return res.status(400).json({
        error: 'HS코드(hsSgn)는 필수입니다'
      });
    }
    
    // HS코드를 10자리로 맞추기
    if (hsSgn.length < 10) {
      hsSgn = hsSgn.padEnd(10, '0');
    }
    
    const url = 'https://unipass.customs.go.kr:38010/ext/rest/trrtQry/retrieveTrrt';
    const response = await axios.get(url, {
      params: {
        crkyCn: 'h230s205h078z119t090z040x0',
        hsSgn: hsSgn
      }
    });
    
    const data = await parser.parseStringPromise(response.data);
    
    const result = {
      hsCode: hsSgn,
      tariffs: [],
      basicRate: null
    };
    
    // trrtQryRtnVo → trrtQryRsltVo 경로 확인
    if (data.trrtQryRtnVo?.trrtQryRsltVo) {
      const items = data.trrtQryRtnVo.trrtQryRsltVo;
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
          
          // 기본세율 찾기 (A 또는 기본 포함)
          if (item.trrtTpcd === 'A' || item.trrtTpNm?.includes('기본')) {
            result.basicRate = item.trrt;
          }
        }
      });
    }
    
    res.status(200).json({
      success: true,
      hsCode: hsSgn.substring(0, 10),
      basicRate: result.basicRate ? result.basicRate + '%' : 'N/A',
      totalCount: result.tariffs.length,
      tariffs: result.tariffs
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      hsCode: req.query.hsSgn
    });
  }
};
