const axios = require('axios');
const xml2js = require('xml2js');

module.exports = async (req, res) => {
  const parser = new xml2js.Parser({ 
    explicitArray: false,
    ignoreAttrs: true 
  });
  
  try {
    const { hsSgn, startDate, endDate } = req.query;
    
    if (!hsSgn || !startDate || !endDate) {
      return res.status(400).json({
        error: '필수 파라미터: hsSgn(HS코드), startDate(시작년월), endDate(종료년월)'
      });
    }

    // 수출입 실적 조회
    const tradeUrl = 'https://apis.data.go.kr/1220000/nitemtrade/getNitemtradeList';
    const tradeResponse = await axios.get(tradeUrl, {
      params: {
        serviceKey: '3VkSJ0Q0/cRKftezt4f/L899ZRVB7IBNc/r8fSqbf5yBFrjXoZP19XZXfceKbp9zwffD4hO+BOyzHxBaiRynSg==',
        strtYymm: startDate,
        endYymm: endDate,
        hsSgn: hsSgn
      }
    });

    const tradeData = await parser.parseStringPromise(tradeResponse.data);
    const items = tradeData.response?.body?.items?.item || [];
    const tradeItems = Array.isArray(items) ? items : [items];
    
    // 국가별 집계
    const summary = {
      totalImportUSD: 0,
      totalImportKG: 0,
      countries: {}
    };
    
    tradeItems.forEach(item => {
      if (item.impDlr && item.year !== '총계') {
        const usd = parseInt(item.impDlr) || 0;
        const kg = parseInt(item.impWgt) || 0;
        
        summary.totalImportUSD += usd;
        summary.totalImportKG += kg;
        
        if (item.statCd && item.statCd !== '-') {
          if (!summary.countries[item.statCd]) {
            summary.countries[item.statCd] = {
              name: item.statCdCntnKor1,
              importUSD: 0,
              importKG: 0
            };
          }
          summary.countries[item.statCd].importUSD += usd;
          summary.countries[item.statCd].importKG += kg;
        }
      }
    });
    
    // 환율 적용 (기본 1100원)
    const exchangeRate = 1100;
    
    // 국가별 비율 계산
    const countryList = Object.entries(summary.countries).map(([code, data]) => ({
      code,
      name: data.name,
      importUSD: data.importUSD,
      importKRW: data.importUSD * exchangeRate,
      importKG: data.importKG,
      share: ((data.importUSD / summary.totalImportUSD) * 100).toFixed(1) + '%'
    }));
    
    countryList.sort((a, b) => b.importUSD - a.importUSD);
    
    res.status(200).json({
      success: true,
      period: `${startDate} ~ ${endDate}`,
      hsCode: hsSgn,
      exchangeRate: exchangeRate,
      summary: {
        totalImportUSD: summary.totalImportUSD.toLocaleString(),
        totalImportKRW: (summary.totalImportUSD * exchangeRate).toLocaleString(),
        totalImportKG: summary.totalImportKG.toLocaleString(),
        numberOfCountries: countryList.length
      },
      countries: countryList
    });
    
  } catch (error) {
    console.error('API Error:', error.message);
    res.status(500).json({
      error: 'API 호출 실패',
      message: error.message
    });
  }
};
