function dedupe(items) {
  const norm = s => (s || "").toLowerCase()
    .replace(/[\s\u00A0]+/g, " ")
    .replace(/【.*?】/g, "")
    .trim();

  const normLink = u => {
    try {
      const url = new URL(u);
      return `${url.hostname}${url.pathname}`; // 쿼리 차이 최소화
    } catch {
      return u || "";
    }
  };

  const map = new Map();
  for (const it of items) {
    const key = norm(it.title) + "||" + normLink(it.link);
    if (!map.has(key)) map.set(key, it);
  }
  return [...map.values()];
}
module.exports = { dedupe };
