const axios = require('axios');
const xml2js = require('xml2js');

module.exports = async (req, res) => {
  const parser = new xml2js.Parser({
    explicitArray: false,
    ignoreAttrs: true,
  });

  // 숫자 안전 파싱
  const toNum = (v) => {
    if (v === null || v === undefined) return 0;
    const s = String(v).replace(/,/g, '').trim();
    if (s === '' || s.toLowerCase() === 'null' || s.toLowerCase() === 'nan') return 0;
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };

  const kgToTon = (kg) => +(kg / 1000).toFixed(3);
  const krwThousand = (usd, fx) => Math.round((usd * fx) / 1000);

  // YYYYMM 증가
  const nextYYYYMM = (yyyymm) => {
    let y = parseInt(yyyymm.slice(0, 4), 10);
    let m = parseInt(yyyymm.slice(4, 6), 10) + 1;
    if (m > 12) { y += 1; m = 1; }
    return `${y}${String(m).padStart(2, '0')}`;
  };

  // yyyymm 범위 생성
  const rangeYYYYMM = (start, end) => {
    const out = [];
    let cur = start;
    while (cur <= end) {
      out.push(cur);
      cur = nextYYYYMM(cur);
    }
    return out;
  };

  try {
    const { hsSgn, startDate, endDate, granularity = 'monthly' } = req.query;

    if (!hsSgn || !startDate || !endDate) {
      return res.status(400).json({
        error: '필수 파라미터: hsSgn(HS코드), startDate(YYYYMM), endDate(YYYYMM)',
      });
    }
    if (!['monthly', 'annual'].includes(granularity)) {
      return res.status(400).json({ error: 'granularity는 monthly 또는 annual 만 허용됩니다.' });
    }

    // -------------------------------
    // 1) 환율 조회(수입 기준)
    // -------------------------------
    const SERVICE_KEY = '3VkSJ0Q0/cRKftezt4f/L899ZRVB7IBNc/r8fSqbf5yBFrjXoZP19XZXfceKbp9zwffD4hO+BOyzHxBaiRynSg==';
    const exchangeUrl = 'https://apis.data.go.kr/1220000/retrieveTrifFxrtInfo/getRetrieveTrifFxrtInfo';
    const monthlyFx = {}; // { '202401': 1320, ... }
    const annualFx = {};  // { '2024': 1318, ... }

    try {
      const yyyymmList = rangeYYYYMM(startDate, endDate);
      const fxBucketsByYear = {};

      for (const yyyymm of yyyymmList) {
        const dateStr = `${yyyymm}01`;
        const rsp = await axios.get(exchangeUrl, {
          params: {
            serviceKey: SERVICE_KEY,
            aplyBgnDt: dateStr,
            weekFxrtTpcd: '2', // 수입환율
          },
          timeout: 20000,
        });

        const fxData = await parser.parseStringPromise(rsp.data);
        const items = fxData?.response?.body?.items?.item || [];
        const list = Array.isArray(items) ? items : [items];
        const usd = list.find((it) => it.currSgn === 'USD');
        const fx = toNum(usd?.fxrt);
        if (fx > 0) {
          monthlyFx[yyyymm] = fx;
          const y = yyyymm.slice(0, 4);
          fxBucketsByYear[y] = fxBucketsByYear[y] || [];
          fxBucketsByYear[y].push(fx);
        }
      }

      for (const [year, arr] of Object.entries(fxBucketsByYear)) {
        if (arr.length) {
          annualFx[year] = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
        }
      }
    } catch (e) {
      console.error('환율 조회 실패:', e.message);
    }

    const periodFxList = Object.values(monthlyFx);
    const periodFxAvg = periodFxList.length
      ? Math.round(periodFxList.reduce((a, b) => a + b, 0) / periodFxList.length)
      : 1100; // 폴백

    // -------------------------------
    // 2) 월별 반복 호출(가장 확실한 방법)
    // -------------------------------
    const tradeUrl = 'https://apis.data.go.kr/1220000/nitemtrade/getNitemtradeList';

    const summary = {
      totalImportUSD: 0,
      totalImportKG: 0,
      totalExportUSD: 0,
      totalExportKG: 0,
      countries: {}, // 전체 기간 국가별 합계
    };

    const monthlyAgg = {}; // { '202401': { impKg, impUsd, expKg, expUsd, byCountry: {KR:{...}} } }
    const annualAgg  = {}; // 연도 합계

    const months = rangeYYYYMM(startDate, endDate);

    for (const yyyymm of months) {
      // 해당 월만 조회(합산 방지)
      const tradeResp = await axios.get(tradeUrl, {
        params: {
          serviceKey: SERVICE_KEY,
          strtYymm: yyyymm,
          endYymm: yyyymm,
          hsSgn,
          // 필요 시: type: 'xml' (기본), imexTp 등 추가 가능
          // detail/dtlYn 등은 문서별 상이 → 확실하지 않음
        },
        timeout: 20000,
      });

      const tradeData = await parser.parseStringPromise(tradeResp.data);
      const rawItems = tradeData?.response?.body?.items?.item || [];
      const items = Array.isArray(rawItems) ? rawItems : [rawItems];

      // 월 컨테이너
      if (!monthlyAgg[yyyymm]) {
        monthlyAgg[yyyymm] = { impKg: 0, impUsd: 0, expKg: 0, expUsd: 0, byCountry: {} };
      }

      for (const it of items) {
        // 일부 API는 합계행이 있을 수 있음 → 방지
        const isTotalRow =
          (it?.statCd === '총계') || (it?.year === '총계') || (it?.natNm === '총계');
        if (isTotalRow) continue;

        const impUsd = toNum(it?.impDlr);
        const impKg  = toNum(it?.impWgt);
        const expUsd = toNum(it?.expDlr);
        const expKg  = toNum(it?.expWgt);

        // 월 집계
        monthlyAgg[yyyymm].impUsd += impUsd;
        monthlyAgg[yyyymm].impKg  += impKg;
        monthlyAgg[yyyymm].expUsd += expUsd;
        monthlyAgg[yyyymm].expKg  += expKg;

        // 전체 합계
        summary.totalImportUSD += impUsd;
        summary.totalImportKG  += impKg;
        summary.totalExportUSD += expUsd;
        summary.totalExportKG  += expKg;

        // 국가키
        const natCode = it?.statCd || it?.natCd || it?.natCode;
        const natName = it?.statCdCntnKor1 || it?.natNm || natCode || '-';

        if (natCode && natCode !== '-') {
          // 월별 국가 집계(옵션: 월별 국가표가 필요하면 사용)
          if (!monthlyAgg[yyyymm].byCountry[natCode]) {
            monthlyAgg[yyyymm].byCountry[natCode] = { name: natName, impUsd: 0, impKg: 0, expUsd: 0, expKg: 0 };
          }
          monthlyAgg[yyyymm].byCountry[natCode].impUsd += impUsd;
          monthlyAgg[yyyymm].byCountry[natCode].impKg  += impKg;
          monthlyAgg[yyyymm].byCountry[natCode].expUsd += expUsd;
          monthlyAgg[yyyymm].byCountry[natCode].expKg  += expKg;

          // 전체 기간 국가 집계
          if (!summary.countries[natCode]) {
            summary.countries[natCode] = { name: natName, importUSD: 0, importKG: 0, exportUSD: 0, exportKG: 0 };
          }
          summary.countries[natCode].importUSD += impUsd;
          summary.countries[natCode].importKG  += impKg;
          summary.countries[natCode].exportUSD += expUsd;
          summary.countries[natCode].exportKG  += expKg;
        }
      }
    }

    // 연도 합계(월 집계로부터 파생)
    for (const [k, rec] of Object.entries(monthlyAgg)) {
      const y = k.slice(0, 4);
      if (!annualAgg[y]) annualAgg[y] = { impKg: 0, impUsd: 0, expKg: 0, expUsd: 0 };
      annualAgg[y].impKg += rec.impKg;
      annualAgg[y].impUsd += rec.impUsd;
      annualAgg[y].expKg += rec.expKg;
      annualAgg[y].expUsd += rec.expUsd;
    }

    // 국가 리스트(비중)
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
        exportShare: +((data.exportUSD / totalExp) * 100).toFixed(1),
      };
    }).sort((a, b) => b.importUSD - a.importUSD);

    // -------------------------------
    // details 생성
    // -------------------------------
    let details = [];
    if (granularity === 'monthly') {
      const keys = Object.keys(monthlyAgg).sort(); // yyyymm 오름차순
      details = keys.map((k) => {
        const rec = monthlyAgg[k];
        const fx = monthlyFx[k] || periodFxAvg; // 월별 환율, 없으면 기간평균
        return {
          yyyymm: k,
          importWeightT: kgToTon(rec.impKg),
          importUsd: rec.impUsd,
          importKrwThousand: krwThousand(rec.impUsd, fx),
          exportWeightT: kgToTon(rec.expKg),
          exportUsd: rec.expUsd,
          exportKrwThousand: krwThousand(rec.expUsd, fx),
          fxRate: fx,
        };
      });
    } else {
      const keys = Object.keys(annualAgg).sort(); // yyyy 오름차순
      details = keys.map((y) => {
        const rec = annualAgg[y];
        const fx = annualFx[y] || periodFxAvg;
        return {
          year: y,
          importWeightT: kgToTon(rec.impKg),
          importUsd: rec.impUsd,
          importKrwThousand: krwThousand(rec.impUsd, fx),
          exportWeightT: kgToTon(rec.expKg),
          exportUsd: rec.expUsd,
          exportKrwThousand: krwThousand(rec.expUsd, fx),
          fxRate: fx,
        };
      });
    }

    const totalBalanceUSD = summary.totalExportUSD - summary.totalImportUSD;

    return res.status(200).json({
      success: true,
      period: `${startDate} ~ ${endDate}`,
      hsCode: hsSgn,
      fxMeta: {
        mode: granularity === 'monthly' ? 'monthly' : 'annual',
        source: 'KCS(관세청) 수입환율',
        periodFxAvg,
      },
      summary: {
        totalImportUSD: summary.totalImportUSD,
        totalImportKRWThousand: krwThousand(summary.totalImportUSD, periodFxAvg),
        totalImportT: kgToTon(summary.totalImportKG),
        totalExportUSD: summary.totalExportUSD,
        totalExportKRWThousand: krwThousand(summary.totalExportUSD, periodFxAvg),
        totalExportT: kgToTon(summary.totalExportKG),
        tradeBalanceUSD: totalBalanceUSD,
        tradeBalanceKRWThousand: krwThousand(totalBalanceUSD, periodFxAvg),
      },
      details,          // 월별 또는 연도별
      countries: countryList,
    });

  } catch (error) {
    console.error('API Error:', error.message);
    return res.status(500).json({
      error: 'API 호출 실패',
      message: error.message,
    });
  }
};
