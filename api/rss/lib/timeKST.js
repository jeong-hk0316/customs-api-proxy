// KST(Asia/Seoul) 전용 시간 유틸 + 한국형 날짜 파서

function kstNow() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
}

function dateRangeKST(from, to) {
  const now = kstNow();
  let start, end;

  if (from) {
    start = new Date(`${from}T00:00:00+09:00`);
  } else {
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    start = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0);
  }

  if (to) {
    end = new Date(`${to}T23:59:59+09:00`);
  } else {
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  }

  return { start, end };
}

function formatYMDKST(date) {
  if (!date) return "";
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// 다국적/기관형 날짜 문자열 → Date
function parseKoreanDate(dateStr, { fallbackToToday = true } = {}) {
  if (!dateStr) return fallbackToToday ? kstNow() : null;

  try {
    const basic = new Date(dateStr);
    if (!isNaN(basic)) return basic;

    const s = String(dateStr).trim();

    // YYYY-MM-DD / YYYY.MM.DD / YYYY/MM/DD
    let m = s.match(/(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})/);
    if (m) {
      const [, y, mo, da] = m;
      return new Date(`${y}-${String(mo).padStart(2, "0")}-${String(da).padStart(2, "0")}T12:00:00+09:00`);
    }

    // MM-DD / MM.DD / MM/DD → 올해
    m = s.match(/(?:^|\s)(\d{1,2})[.\-\/](\d{1,2})(?:\s|$)/);
    if (m) {
      const [, mo, da] = m;
      const y = kstNow().getFullYear();
      return new Date(`${y}-${String(mo).padStart(2, "0")}-${String(da).padStart(2, "0")}T12:00:00+09:00`);
    }

    // "N월 N일"
    m = s.match(/(\d{1,2})월\s*(\d{1,2})일/);
    if (m) {
      const [, mo, da] = m;
      const y = kstNow().getFullYear();
      return new Date(`${y}-${String(mo).padStart(2, "0")}-${String(da).padStart(2, "0")}T12:00:00+09:00`);
    }

    return fallbackToToday ? kstNow() : null;
  } catch (e) {
    console.error("[parseKoreanDate] error:", e);
    return fallbackToToday ? kstNow() : null;
  }
}

// pubDate 없을 때 title/description에서 추출 → 최종 fallback: 오늘
function coerceItemDate({ pubDate, title, description }, { fallbackToToday = true } = {}) {
  let d = parseKoreanDate(pubDate, { fallbackToToday: false });
  if (d) return d;
  if (title) {
    d = parseKoreanDate(title, { fallbackToToday: false });
    if (d) return d;
  }
  if (description) {
    d = parseKoreanDate(description, { fallbackToToday: false });
    if (d) return d;
  }
  return fallbackToToday ? kstNow() : null;
}

module.exports = {
  kstNow,
  dateRangeKST,
  formatYMDKST,
  parseKoreanDate,
  coerceItemDate
};
