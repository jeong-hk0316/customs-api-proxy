const axios = require('axios');
const xml2js = require('xml2js');

const parser = new xml2js.Parser({ explicitArray: false });

// API 키 설정
const TRADE_KEY = '3VkSJ0Q0/cRKftezt4f/L899ZRVB7IBNc/r8fSqbf5yBFrjXoZP19XZXfceKbp9zwffD4hO+BOyzHxBaiRynSg==';
const TARIFF_KEY = 'h230s205h078z119t090z040x0';

module.exports = async (req, res) => {
  try {
    const { hsSgn, strtYymm, endYymm } = req.query;
    
    if (!hsSgn || !strtYymm || !endYymm) {
      return res.status(400).json({ 
        error: 'HS코드(hsSgn), 시작년월(strtYymm), 종료년월(endYymm)은 필수입니다' 
      });
    }

    console.log('조회 시작:', { hsSgn, strtYymm, endYymm });

    // 1. 전체 수입 데이터 조회
    const url = 'https://apis.data.go.kr/1220000/nitemtrade/getNitemtradeList';
    const params = {
      serviceKey: TRADE_KEY,
      strtYymm: strtYymm,
      endYymm: endYymm,
      hsSgn: hsSgn
    };

    const tradeResponse = await axios.get(url, { params });
    const tradeResult = await parser.parseStringPromise(tradeResponse.data);
    
    const items = tradeResult.response?.body?.items?.item || [];
    const tradeData = Array.isArray(items) ? items : [items];

    // 2. 환율 데이터 조회
    const exchangeUrl = 'https://apis.data.go.kr/1220000/retrieveTrifFxrtInfo/getRetrieveTrifFxrtInfo';
    const exchangeParams = {
      serviceKey: TRADE_KEY,
      aplyBgnDt: strtYymm + '01',
      weekFxrtTpcd: '2'  // 수입 환율
    };

    const exchangeResponse = await axios.get(exchangeUrl, { params: exchangeParams });
    const exchangeResult = await parser.parseStringPromise(exchangeResponse.data);
    
    const exchangeItems = exchangeResult.response?.body?.items?.item || [];
    const exchangeData = Array.isArray(exchangeItems) ? exchangeItems : [exchangeItems];
    
    // USD 환율 찾기
    const usdRate = exchangeData.find(item => item.currSgn === 'USD');
    const exchangeRate = usdRate ? parseFloat(usdRate.fxrt) : 1100;

    // 3. 데이터 가공
    let totalImportDollar = 0;
    let totalImportWeight = 0;
    const countryData = {};

    tradeData.forEach(item => {
      if (item.year !== '총계' && item.impDlr) {
        const dollar = parseInt(item.impDlr) || 0;
        const weight = parseInt(item.impWgt) || 0;
        
        totalImportDollar += dollar;
        totalImportWeight += weight;

        if (item.statCd && item.statCd !== '-') {
          if (!countryData[item.statCd]) {
            countryData[item.statCd] = {
              countryCode: item.statCd,
              countryName: item.statCdCntnKor1 || item.statCd,
              importDollar: 0,
              importWeight: 0
            };
          }
          countryData[item.statCd].importDollar += dollar;
          countryData[item.statCd].importWeight += weight;
        }
      }
    });

    // 국가별 데이터 정리
    const countryDetails = Object.values(countryData).map(country => ({
      ...country,
      importKRW: Math.round(country.importDollar * exchangeRate),
      sharePercent: totalImportDollar > 0 
        ? ((country.importDollar / totalImportDollar) * 100).toFixed(2) + '%'
        : '0%'
    }));

    // 비율 내림차순 정렬
    countryDetails.sort((a, b) => parseFloat(b.sharePercent) - parseFloat(a.sharePercent));

    // 4. 관세율 조회
    let tariffInfo = { basicRate: 'N/A', fta: [] };
    try {
      const tariffUrl = 'https://unipass.customs.go.kr:38010/ext/rest/trrtQry/retrieveTrrt';
      const tariffParams = {
        crkyCn: TARIFF_KEY,
        hsSgn: hsSgn
      };

      const tariffResponse = await axios.get(tariffUrl, { 
        params: tariffParams,
        headers: { 'Accept': 'application/xml' }
      });
      
      const tariffResult = await parser.parseStringPromise(tariffResponse.data);
      
      if (tariffResult.TrrtQryRtnVo?.TrrtQryRsltVo) {
        const tariffItems = tariffResult.TrrtQryRtnVo.TrrtQryRsltVo;
        const items = Array.isArray(tariffItems) ? tariffItems : [tariffItems];
        
        items.forEach(item => {
          if (item.trrt) {
            if (item.trrtTpcd === 'A') {
              tariffInfo.basicRate = item.trrt + '%';
            } else if (item.trrtTpNm) {
              tariffInfo.fta.push({
                name: item.trrtTpNm,
                rate: item.trrt + '%'
              });
            }
          }
        });
      }
    } catch (tariffError) {
      console.error('관세율 조회 실패:', tariffError.message);
    }

    // 5. 최종 응답
    res.status(200).json({
      success: true,
      query: { 
        hsSgn, 
        period: `${strtYymm} ~ ${endYymm}` 
      },
      summary: {
        totalImportWeight: totalImportWeight.toLocaleString() + ' kg',
        totalImportDollar: '$' + totalImportDollar.toLocaleString(),
        totalImportKRW: '₩' + Math.round(totalImportDollar * exchangeRate).toLocaleString(),
        exchangeRate: exchangeRate,
        numberOfCountries: countryDetails.length
      },
      countryDetails: countryDetails,
      tariffInfo: tariffInfo
    });
    
  } catch (error) {
    console.error('Import Analysis Error:', error);
    res.status(500).json({ 
      error: 'API 호출 실패', 
      details: error.message 
    });
  }
};