module.exports = (req, res) => {
  res.status(200).json({
    name: "한국 관세청 수입 분석 API",
    version: "1.0.0",
    description: "HS코드와 기간으로 수입 통계를 종합 분석합니다",
    usage: {
      endpoint: "/api/import-analysis",
      method: "GET",
      parameters: {
        hsSgn: "HS코드 (필수, 예: 0202)",
        strtYymm: "시작년월 (필수, 예: 202301)",
        endYymm: "종료년월 (필수, 예: 202312)"
      },
      example: "/api/import-analysis?hsSgn=0202&strtYymm=202301&endYymm=202312"
    },
    response: {
      summary: "전체 수입 요약 (총량, 총액, 원화환산 등)",
      countryDetails: "국가별 상세 정보 (수입량, 금액, 비율)",
      tariffInfo: "관세율 정보"
    }
  });
};