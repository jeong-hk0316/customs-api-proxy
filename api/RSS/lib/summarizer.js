function summarizeKo20(text) {
  if (!text) return "내용 없음";
  const s = String(text).replace(/\s+/g, " ").replace(/[「」\[\]\(\)]/g, "").trim();
  return s.length <= 20 ? s : s.slice(0, 20);
}
module.exports = { summarizeKo20 };
