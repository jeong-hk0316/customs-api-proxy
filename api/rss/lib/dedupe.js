// /api/rss/lib/dedupe.js

// ===== 설정(필요시 조정) =====
const OFFICIAL_DOMAINS =
  /(me\.go\.kr|moef\.go\.kr|mafra\.go\.kr|mss\.go\.kr|ftc\.go\.kr|mfds\.go\.kr|mnd\.go\.kr|winwingrowth\.or\.kr)/i;
const KOREA_KR = /korea\.kr/i;

const PREFER = {
  officialFirst: true,      // 원문(부처) 링크를 korea.kr보다 우선
  preferKoreaKr: false,     // true면 korea.kr을 우선
  pressOverNotice: true     // '보도'/'해명'/'참고' > '공지'/'공고'
};

// ===== 유틸 =====
function normTitle(s) {
  return (s || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[【】\[\]\(\)<>]/g, "")
    .trim();
}

function normLink(u) {
  if (!u) return "";
  try {
    const url = new URL(u);
    return `${url.hostname.toLowerCase()}${url.pathname}`; // 쿼리변수 차이는 무시
  } catch {
    return String(u).toLowerCase().trim();
  }
}

function isPressType(t = "") {
  return /(보도|해명|참고)/.test(t);
}
function isNoticeType(t = "") {
  return /(공지|공고|알림)/.test(t);
}

function similarTitle(a, b) {
  const A = normTitle(a);
  const B = normTitle(b);
  if (!A || !B) return false;
  if (A === B) return true;
  const shorter = A.length <= B.length ? A : B;
  const longer  = A.length <= B.length ? B : A;
  // 너무 짧은 제목은 오탑합 방지
  if (shorter.length < 10) return false;
  return longer.includes(shorter);
}

// 충돌 시 어떤 항목을 남길지 결정
function chooseBetter(a, b) {
  const ah = (a.link || "");
  const bh = (b.link || "");
  const aOfficial = OFFICIAL_DOMAINS.test(ah);
  const bOfficial = OFFICIAL_DOMAINS.test(bh);
  const aKorea = KOREA_KR.test(ah);
  const bKorea = KOREA_KR.test(bh);
  const aPress = isPressType(a.type);
  const bPress = isPressType(b.type);

  // 1) 원문 vs korea.kr 우선순위
  if (PREFER.officialFirst && aOfficial !== bOfficial) return aOfficial ? a : b;
  if (PREFER.preferKoreaKr && aKorea !== bKorea)       return aKorea ? a : b;

  // 2) 보도 > 공지
  if (PREFER.pressOverNotice && aPress !== bPress)     return aPress ? a : b;

  // 3) 정보량(설명 길이) 우선
  const aLen = (a.description || a.title || "").length;
  const bLen = (b.description || b.title || "").length;
  if (aLen !== bLen) return aLen > bLen ? a : b;

  // 4) 링크 길이/경로 복잡도(임의 tie-breaker)
  return normLink(a.link).length >= normLink(b.link).length ? a : b;
}

// ===== 메인: 중복 제거 =====
function dedupe(items) {
  if (!Array.isArray(items) || items.length === 0) return [];

  // 1단계: (제목, host/path) 기반 정확 중복 제거
  const exact = new Map(); // key = normTitle + '|' + normLink
  for (const it of items) {
    const key = `${normTitle(it.title)}|${normLink(it.link)}`;
    const prev = exact.get(key);
    exact.set(key, prev ? chooseBetter(prev, it) : it);
  }
  const stage1 = [...exact.values()];

  // 2단계: 유사 제목 병합 (제목만으로 그룹)
  const groups = new Map(); // key = 대표제목
  for (const it of stage1) {
    const t = normTitle(it.title);
    let chosenKey = null;

    for (const k of groups.keys()) {
      if (similarTitle(t, k)) { chosenKey = k; break; }
    }

    if (!chosenKey) {
      groups.set(t, it);
    } else {
      const prev = groups.get(chosenKey);
      groups.set(chosenKey, chooseBetter(prev, it));
    }
  }

  return [...groups.values()];
}

module.exports = { dedupe };
