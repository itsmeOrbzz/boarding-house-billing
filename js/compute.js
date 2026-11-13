const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const FULL_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function formatPeso(num) {
  const n = Number(num) || 0;
  return (
    "₱" +
    n.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

export function computeRoomTotals(room) {
  const monthlyRent = Number(room.monthlyRent) || 0;
  const divisor = Number(room.divisorDays) || 30;
  const remDays = Number(room.remainingDays) || 0;

  let rentDue = monthlyRent;
  if (room.rentMode === "prorated") {
    rentDue = (monthlyRent / divisor) * remDays;
  }

  const roundedRentDue = Math.round((rentDue + Number.EPSILON) * 100) / 100;

  const elec = Number(room.electricity) || 0;
  const water = Number(room.water) || 0;
  const wifi = Number(room.wifi) || 0;
  const totalUtilities =
    Math.round((elec + water + wifi + Number.EPSILON) * 100) / 100;
  const grandTotal =
    Math.round((roundedRentDue + totalUtilities + Number.EPSILON) * 100) / 100;

  return {
    rentDue: roundedRentDue,
    totalUtilities,
    grandTotal,
  };
}

export function parseMoveInDayNumber(str) {
  const match = String(str).match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

export function formatOrdinalDay(n) {
  const num = parseInt(n, 10);
  if (isNaN(num)) return n;
  const s = ["th", "st", "nd", "rd"];
  const v = num % 100;
  return num + (s[(v - 20) % 10] || s[v] || s[0]) + " Day";
}

export function formatShortMonthDay(isoDateStr) {
  if (!isoDateStr) return "";
  const [y, m, d] = isoDateStr.split("-").map(Number);
  if (!m || !d) return "";
  return `${SHORT_MONTHS[m - 1]} ${d}`;
}

export function formatPeriodRange(startIso, endIso) {
  const s = formatShortMonthDay(startIso);
  const e = formatShortMonthDay(endIso);
  if (s && e) return `${s} to ${e}`;
  return s || e || "";
}

export function formatFullMonthDay(isoDateStr) {
  if (!isoDateStr) return "";
  const [y, m, d] = isoDateStr.split("-").map(Number);
  if (!m || !d) return "";
  return `${FULL_MONTHS[m - 1]} ${d}`;
}

export function formatIsoToOrdinalDay(isoDateStr) {
  if (!isoDateStr) return "";
  const parts = isoDateStr.split("-").map(Number);
  const day = parts[2];
  if (!day) return "";
  return formatOrdinalDay(day);
}

/**
 * Calculates calendar day difference between startIso and endIso (e.g. Nov 2 to Dec 1 = 29 days)
 */
export function computeCalendarSpanDays(startIso, endIso) {
  if (!startIso || !endIso) return null;
  const [sy, sm, sd] = startIso.split("-").map(Number);
  const [ey, em, ed] = endIso.split("-").map(Number);
  const startUtc = Date.UTC(sy, sm - 1, sd);
  const endUtc = Date.UTC(ey, em - 1, ed);
  const diffDays = Math.round((endUtc - startUtc) / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : null;
}

/**
 * Given a startIso (e.g. 2026-11-15), returns the 1st of the following month (2026-12-01)
 */
export function getNextMonthFirstIso(startIso) {
  if (!startIso) return "";
  const [y, m] = startIso.split("-").map(Number);
  if (!y || !m) return "";
  const nextMonth = m === 12 ? 1 : m + 1;
  const nextYear = m === 12 ? y + 1 : y;
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
}

export function parseDisplayDateToIso(
  str,
  fallbackYear = new Date().getFullYear(),
) {
  if (!str) return toIsoDate(new Date());
  const clean = String(str).trim();

  for (let i = 0; i < 12; i++) {
    const shortM = SHORT_MONTHS[i].toLowerCase();
    const fullM = FULL_MONTHS[i].toLowerCase();
    const lower = clean.toLowerCase();
    if (lower.startsWith(fullM) || lower.startsWith(shortM)) {
      const dayMatch = clean.match(/\d+/);
      const day = dayMatch ? parseInt(dayMatch[0], 10) : 1;
      return `${fallbackYear}-${String(i + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  const dayOnly = parseMoveInDayNumber(clean);
  if (dayOnly && dayOnly >= 1 && dayOnly <= 31) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(dayOnly).padStart(2, "0")}`;
  }

  return toIsoDate(new Date());
}

export function parseRangeToIso(rangeStr) {
  const year = new Date().getFullYear();
  if (!rangeStr || !String(rangeStr).includes("to")) {
    const today = toIsoDate(new Date());
    return { startIso: today, endIso: getNextMonthFirstIso(today) || today };
  }
  const parts = String(rangeStr).split(/\s+to\s+/i);
  const startIso = parseDisplayDateToIso(parts[0], year);
  let endIso = parseDisplayDateToIso(parts[1], year);

  // If end month is earlier in the calendar than start month (e.g., Dec to Jan), bump end year by 1
  if (endIso < startIso) {
    const [ey, em, ed] = endIso.split("-");
    endIso = `${Number(ey) + 1}-${em}-${ed}`;
  }
  return { startIso, endIso };
}

function toIsoDate(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
