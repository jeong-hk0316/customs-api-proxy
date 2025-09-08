function kstNow() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
}
function dateRangeKST(fromStr, toStr) {
  const now = kstNow();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const start = fromStr ? new Date(fromStr + "T00:00:00+09:00") : yesterday;
  const end   = toStr   ? new Date(toStr   + "T23:59:59+09:00") : new Date(today.getTime() + 86399999);
  return { start, end };
}
function formatYMDKST(d) {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
module.exports = { dateRangeKST, formatYMDKST };
