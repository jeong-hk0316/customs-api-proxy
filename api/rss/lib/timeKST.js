// /api/rss/lib/timeKST.js
// KST(Asia/Seoul) 전용 시간 유틸 + 한국형 날짜 파서(환경부/공정위 대응)

// 현재 시각(KST)
function kstNow() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
}

// 어제~오늘(KST) 기본 구간 or from/to(YYYY-MM-DD) 지정 구간
function dateRangeKST(from, to) {
  const now = kstNow();
  let start, end;

  if (from) {
    // YYYY-MM-DDT00:00:00+09:00
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

// YYYY-MM-DD (KST) 포맷
function formatYMDKST(date) {
  if (!date) return "";
  // 입력이 UTC든 로컬이든 KST 캘린더 기준으로 YYYY-MM-DD만 출력하면 충분
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// 한국/기관 사이트에서 흔한 날짜 문자열을 Date로 변환
// - 지원: RFC1123/ISO 표준, YYYY-MM-DD, YYYY.MM.DD, YYYY/MM/DD, MM-DD, MM.DD, "N월 N일"
// - 실패 시: today(KST)로 fallback하여 누락 방지
function parseKoreanDate(dateStr, { fallbackToToday = true } = {}) {
  if (!dateStr) return fallbackToToday ? kstNow() : null;

  try {
    // 1) 표준 파싱 시도
    const basic = new Date(dateStr);
    if (!isNaN(basic)) return basic;

    const s = String(dateStr).trim();

    // 2) YYYY-MM-DD / YYYY.MM.DD / YYYY/MM/DD
    let m = s.match(/(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})/);
    if (m) {
      const [, y, mo, da] = m;
      return new Date(`${y}-${String(mo).padStart(2, "0")}-${String(da).padStart(2, "0")}T12:00:00+09:00`);
    }

    // 3) MM-DD / MM.DD / MM/DD → 올해로 가정
    m = s.match(/(?:^|\s)(\d{1,2})[.\-\/](\d{1,2})(?:\s|$)/);
    if (m) {
      const [, mo, da] = m;
      const y = kstNow().getFullYear();
      return new Date(`${y}-${String(mo).padStart(2, "0")}-${String(da).padStart(2, "0")}T12:00:00+09:00`);
    }

    // 4) "N월 N일"
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

// pubDate가 없거나 특이 포맷일 때 title/description에서 날짜를 추출하는 보조 함수
function coerceItemDate({ pubDate, title, description }, { fallbackToToday = true } = {}) {
  // 1) pubDate 우선
  let d = parseKoreanDate(pubDate, { fallbackToToday: false });
  if (d) return d;

  // 2) title에서 추출
  if (title) {
    d = parseKoreanDate(title, { fallbackToToday: false });
    if (d) return d;
  }

  // 3) description에서 추출
  if (description) {
    d = parseKoreanDate(description, { fallbackToToday: false });
    if (d) return d;
  }

  // 4) 그래도 없으면 오늘 날짜
  return fallbackToToday ? kstNow() : null;
}

module.exports = {
  kstNow,
  dateRangeKST,
  formatYMDKST,
  parseKoreanDate,
  coerceItemDate
};
