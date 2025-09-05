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
    
    // 1. 환율 정보 조회 (수입 기준)
    let exchangeRate = 1100; // 기본값
    const exchangeRates = [];
    
    try {
      // 시작월부터 종료월까지 각 월의 환율 조회
      const startYear = parseInt(startDate.substring(0, 4));
      const startMonth = parseInt(startDate.substring(4, 6));
      const endYear = parseInt(endDate.substring(0, 4));
      const endMonth = parseInt(endDate.substring(4, 6));
      
      for (let year = startYear; year <= endYear; year++) {
        const monthStart = (year === startYear) ? startMonth : 1;
        const monthEnd = (year === endYear) ? endMonth : 12;
        
        for (let month = monthStart; month <= monthEnd; month++) {
          const dateStr = `${year}${String(month).padStart(2, '0')}01`;
          
          const exchangeUrl = 'https://apis.data.go.kr/1220000/retrieveTrifFxrtInfo/getRetrieveTrifFxrtInfo';
          const exchangeResponse = await axios.get(exchangeUrl, {
            params: {
              serviceKey: '3VkSJ0Q0/cRKftezt4f/L899ZRVB7IBNc/r8fSqbf5yBFrjXoZP19XZXfceKbp9zwffD4hO+BOyzHxBaiRynSg==',
              aplyBgnDt: dateStr,
              weekFxrtTpcd: '2' // 수입 환율
            }
          });
          
          const exchangeData = await parser.parseStringPromise(exchangeResponse.data);
          const items = exchangeData.response?.body?.items?.item || [];
          const rateItems = Array.isArray(items) ? items : [items];
          
          const usdRate = rateItems.find(item => item.currSgn === 'USD');
          if (usdRate && usdRate.fxrt) {
            exchangeRates.push(parseFloat(usdRate.fxrt));
          }
        }
      }
      
      // 평균 환율 계산
      if (exchangeRates.length > 0) {
        exchangeRate = Math.round(exchangeRates.reduce((a, b) => a + b, 0) / exchangeRates.length);
      }
    } catch (exchangeError) {
      console.error('환율 조회 실패, 기본값 사용:', exchangeError.message);
    }
    
    // 2. 수출입 실적 조회
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
    
    // 3. 국가별 집계
    const summary = {
      totalImportUSD: 0,
      totalImportKG: 0,
      totalExportUSD: 0,
      totalExportKG: 0,
      countries: {}
    };
    
    tradeItems.forEach(item => {
      if (item.year !== '총계') {
        const impUsd = parseInt(item.impDlr) || 0;
        const impKg = parseInt(item.impWgt) || 0;
        const expUsd = parseInt(item.expDlr) || 0;
        const expKg = parseInt(item.expWgt) || 0;
        
        summary.totalImportUSD += impUsd;
        summary.totalImportKG += impKg;
        summary.totalExportUSD += expUsd;
        summary.totalExportKG += expKg;
        
        if (item.statCd && item.statCd !== '-') {
          if (!summary.countries[item.statCd]) {
            summary.countries[item.statCd] = {
              name: item.statCdCntnKor1,
              importUSD: 0,
              importKG: 0,
              exportUSD: 0,
              exportKG: 0
            };
          }
          summary.countries[item.statCd].importUSD += impUsd;
          summary.countries[item.statCd].importKG += impKg;
          summary.countries[item.statCd].exportUSD += expUsd;
          summary.countries[item.statCd].exportKG += expKg;
        }
      }
    });
    
    // 4. 무역수지 계산
    const totalBalance = summary.totalExportUSD - summary.totalImportUSD;
    
    // 5. 국가별 데이터 정리
    const countryList = Object.entries(summary.countries).map(([code, data]) => {
      const balance = data.exportUSD - data.importUSD;
      return {
        code,
        name: data.name,
        // 수입
        importUSD: data.importUSD,
        importKRW: Math.round(data.importUSD * exchangeRate),
        importKG: data.importKG,
        importShare: summary.totalImportUSD > 0 
          ? ((data.importUSD / summary.totalImportUSD) * 100).toFixed(1) + '%'
          : '0%',
        // 수출
        exportUSD: data.exportUSD,
        exportKRW: Math.round(data.exportUSD * exchangeRate),
        exportKG: data.exportKG,
        exportShare: summary.totalExportUSD > 0
          ? ((data.exportUSD / summary.totalExportUSD) * 100).toFixed(1) + '%'
          : '0%',
        // 무역수지
        balanceUSD: balance,
        balanceKRW: Math.round(balance * exchangeRate),
        balanceStatus: balance > 0 ? '흑자' : balance < 0 ? '적자' : '균형'
      };
    });
    
    // 수입액 기준 내림차순 정렬
    countryList.sort((a, b) => b.importUSD - a.importUSD);
    
    res.status(200).json({
      success: true,
      period: `${startDate} ~ ${endDate}`,
      hsCode: hsSgn,
      exchangeRate: exchangeRate,
      exchangeRateType: exchangeRates.length > 1 ? '기간 평균' : '단일 월',
      summary: {
        // 수입
        totalImportUSD: summary.totalImportUSD.toLocaleString(),
        totalImportKRW: Math.round(summary.totalImportUSD * exchangeRate).toLocaleString(),
        totalImportKG: summary.totalImportKG.toLocaleString(),
        // 수출
        totalExportUSD: summary.totalExportUSD.toLocaleString(),
        totalExportKRW: Math.round(summary.totalExportUSD * exchangeRate).toLocaleString(),
        totalExportKG: summary.totalExportKG.toLocaleString(),
        // 무역수지
        tradeBalanceUSD: totalBalance.toLocaleString(),
        tradeBalanceKRW: Math.round(totalBalance * exchangeRate).toLocaleString(),
        tradeStatus: totalBalance > 0 ? '무역흑자' : totalBalance < 0 ? '무역적자' : '무역균형',
        // 국가 수
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
