const axios = require('axios');
const xml2js = require('xml2js');

module.exports = async (req, res) => {
  const parser = new xml2js.Parser({
    explicitArray: false,
    ignoreAttrs: true
  });

  // 숫자 안전 파싱(콤마/공백 제거)
  const toNum = (v) => {
    if (v === null || v === undefined) return 0;
    const s = String(v).replace(/,/g, '').trim();
    if (s === '' || s.toLowerCase() === 'null' || s.toLowerCase() === 'nan') return 0;
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };

  const kgToTon = (kg) => +(kg / 1000).toFixed(3);
  const krwThousand = (usd, fx) => Math.round((usd * fx) / 1000);

  try {
    const { hsSgn, startDate, endDate, granularity = 'monthly' } = req.query;

    if (!hsSgn || !startDate || !endDate) {
      return res.status(400).json({
        error: '필수 파라미터: hsSgn(HS코드), startDate(시작년월:YYYYMM), endDate(종료년월:YYYYMM)'
      });
    }
    if (!['monthly', 'annual'].includes(granularity)) {
      return res.status(400).json({ error: 'granularity는 monthly 또는 annual 만 허용됩니다.' });
    }

    // -------------------------------
    // 1) 환율 조회 (수입 기준: weekFxrtTpcd=2)
    //    - 월별 평균: 각 YYYYMM에 대해 1일자 기준 호출 후 USD 환율 추출(가용 데이터 기준)
    //    - 연도 평균: 월별을 모아 연도별 평균으로 집계
    // -------------------------------
    const SERVICE_KEY = '3VkSJ0Q0/cRKftezt4f/L899ZRVB7IBNc/r8fSqbf5yBFrjXoZP19XZXfceKbp9zwffD4hO+BOyzHxBaiRynSg==';
    const exchangeUrl = 'https://apis.data.go.kr/1220000/retrieveTrifFxrtInfo/getRetrieveTrifFxrtInfo';
    const monthlyFx = {}; // { '202401': 1320, ... }
    const annualFx = {};  // { '2024': 1318, ... }

    try {
      const startYear = parseInt(startDate.substring(0, 4));
      const startMonth = parseInt(startDate.substring(4, 6));
      const endYear = parseInt(endDate.substring(0, 4));
      const endMonth = parseInt(endDate.substring(4, 6));

      for (let year = startYear; year <= endYear; year++) {
        const monthStart = (year === startYear) ? startMonth : 1;
        const monthEnd = (year === endYear) ? endMonth : 12;

        const fxBucket = []; // 해당 연도의 월별 환율 값 모음

        for (let month = monthStart; month <= monthEnd; month++) {
          const yyyymm = `${year}${String(month).padStart(2, '0')}`;
          const dateStr = `${yyyymm}01`;

          const rsp = await axios.get(exchangeUrl, {
            params: {
              serviceKey: SERVICE_KEY,     // ← 요청대로 하드코딩 유지
              aplyBgnDt: dateStr,
              weekFxrtTpcd: '2'           // 수입 환율
            },
            timeout: 20000
          });

          const fxData = await parser.parseStringPromise(rsp.data);
          const items = fxData?.response?.body?.items?.item || [];
          const rateItems = Array.isArray(items) ? items : [items];
          const usdRateObj = rateItems.find((it) => it.currSgn === 'USD');

          if (usdRateObj?.fxrt) {
            const fx = toNum(usdRateObj.fxrt);
            if (fx > 0) {
              monthlyFx[yyyymm] = fx;
              fxBucket.push(fx);
            }
          }
        }

        if (fxBucket.length) {
          const avg = Math.round(fxBucket.reduce((a, b) => a + b, 0) / fxBucket.length);
          annualFx[String(year)] = avg;
        }
      }
    } catch (e) {
      console.error('환율 조회 실패:', e.message);
    }

    // 기간 전체 평균(폴백용)
    const periodFxList = Object.values(monthlyFx);
    const periodFxAvg = periodFxList.length
      ? Math.round(periodFxList.reduce((a, b) => a + b, 0) / periodFxList.length)
      : 1100;

    // -------------------------------
    // 2) 품목별 국가별 수출입 실적 조회
    // -------------------------------
    const tradeUrl = 'https://apis.data.go.kr/1220000/nitemtrade/getNitemtradeList';
    const tradeResponse = await axios.get(tradeUrl, {
      params: {
        serviceKey: SERVICE_KEY,          // ← 요청대로 하드코딩 유지
        strtYymm: startDate,
        endYymm: endDate,
        hsSgn
      },
      timeout: 20000
    });

    const tradeData = await parser.parseStringPromise(tradeResponse.data);
    const rawItems = tradeData?.response?.body?.items?.item || [];
    const tradeItems = Array.isArray(rawItems) ? rawItems : [rawItems];

    // -------------------------------
    // 3) 합계/국가별/그루핑(월별 or 연도별)
    // -------------------------------
    const summary = {
      totalImportUSD: 0,
      totalImportKG: 0,
      totalExportUSD: 0,
      totalExportKG: 0,
      countries: {}
    };

    // 월/연 단위 그루핑 컨테이너
    const monthlyAgg = {}; // { '202401': { impKg, impUsd, expKg, expUsd } }
    const annualAgg = {};  // { '2024':   { impKg, impUsd, expKg, expUsd } }

    for (const item of tradeItems) {
      // 총계 라인 필터(필드명은 실제 응답 구조에 맞게 조정 필요)
      if (item?.year === '총계') continue;

      const impUsd = toNum(item?.impDlr);
      const impKg  = toNum(item?.impWgt);
      const expUsd = toNum(item?.expDlr);
      const expKg  = toNum(item?.expWgt);

      summary.totalImportUSD += impUsd;
      summary.totalImportKG  += impKg;
      summary.totalExportUSD += expUsd;
      summary.totalExportKG  += expKg;

      // 국가별 집계
      const natCode = item?.statCd;
      if (natCode && natCode !== '-') {
        const natName = item?.statCdCntnKor1 || item?.natNm || natCode;
        if (!summary.countries[natCode]) {
          summary.countries[natCode] = {
            name: natName,
            importUSD: 0,
            importKG: 0,
            exportUSD: 0,
            exportKG: 0
          };
        }
        summary.countries[natCode].importUSD += impUsd;
        summary.countries[natCode].importKG += impKg;
        summary.countries[natCode].exportUSD += expUsd;
        summary.countries[natCode].exportKG += expKg;
      }

      // 그루핑 키 (월/연)
      const yyyymm = item?.yymm || item?.yyyymm || item?.yym || '';
      const yyyy = yyyymm ? String(yyyymm).slice(0, 4) : (item?.year || '');

      if (yyyymm) {
        if (!monthlyAgg[yyyymm]) monthlyAgg[yyyymm] = { impKg: 0, impUsd: 0, expKg: 0, expUsd: 0 };
        monthlyAgg[yyyymm].impKg += impKg;
        monthlyAgg[yyyymm].impUsd += impUsd;
        monthlyAgg[yyyymm].expKg += expKg;
        monthlyAgg[yyyymm].expUsd += expUsd;
      }

      if (yyyy) {
        if (!annualAgg[yyyy]) annualAgg[yyyy] = { impKg: 0, impUsd: 0, expKg: 0, expUsd: 0 };
        annualAgg[yyyy].impKg += impKg;
        annualAgg[yyyy].impUsd += impUsd;
        annualAgg[yyyy].expKg += expKg;
        annualAgg[yyyy].expUsd += expUsd;
      }
    }

    // 국가별 표(수입액 기준 정렬, 비중 계산)
    const countryList = Object.entries(summary.countries).map(([code, data]) => {
      const totalImp = summary.totalImportUSD || 1;
      const totalExp = summary.totalExportUSD || 1;
      return {
        code,
        name: data.name,
        importUSD: data.importUSD,
        importKG: data.importKG,
        exportUSD: data.exportUSD,
        exportKG: data.exportKG,
        importShare: +((data.importUSD / totalImp) * 100).toFixed(1),
        exportShare: +((data.exportUSD / totalExp) * 100).toFixed(1)
      };
    }).sort((a, b) => b.importUSD - a.importUSD);

    // -------------------------------
    // 4) details 생성 (요청 단위만 반환)
    // ------
