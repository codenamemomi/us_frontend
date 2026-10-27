export interface AnniversaryInfo {
  daysUntil: number;
  isToday: boolean;
  nextDate: Date;
  nextDateFormatted: string; // e.g. "Nov 14"
  monthsTogetherAtNext: number; // e.g. 6
  milestoneLabel: string; // e.g. "6th month" or "1 year"
  daysTogether: number;
  hasCustomDate: boolean;
  startDateFormatted: string;
}

function getOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

/**
 * Calculates the next monthly anniversary and days dating.
 */
export function calculateAnniversary(
  anniversaryDateStr?: string | null,
  fallbackCreatedAt?: string | null
): AnniversaryInfo | null {
  const dateStr = anniversaryDateStr || fallbackCreatedAt;
  if (!dateStr) return null;

  // parse YYYY-MM-DD safely
  const parts = dateStr.split("T")[0].split("-");
  if (parts.length < 3) return null;

  const startYear = parseInt(parts[0], 10);
  const startMonth = parseInt(parts[1], 10) - 1; // 0-indexed
  const startDay = parseInt(parts[2], 10);

  if (isNaN(startYear) || isNaN(startMonth) || isNaN(startDay)) return null;

  const startDate = new Date(startYear, startMonth, startDay);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // calculate days together (inclusive of start day)
  const diffMs = today.getTime() - startDate.getTime();
  const daysTogether = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1);

  // Helper to clamp the day to the last day of the target month
  const getClampedDate = (y: number, m: number, d: number) => {
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    return new Date(y, m, Math.min(d, daysInMonth));
  };

  // Check this month's anniversary
  let candidate = getClampedDate(today.getFullYear(), today.getMonth(), startDay);

  // If candidate has already passed this month, move to next month
  if (candidate.getTime() < today.getTime()) {
    candidate = getClampedDate(today.getFullYear(), today.getMonth() + 1, startDay);
  }

  const daysUntil = Math.round((candidate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const isToday = daysUntil === 0;

  // Calculate total months at the candidate milestone
  const monthsDiff =
    (candidate.getFullYear() - startYear) * 12 + (candidate.getMonth() - startMonth);

  let milestoneLabel = "";
  if (monthsDiff > 0 && monthsDiff % 12 === 0) {
    const years = monthsDiff / 12;
    milestoneLabel = `${years} year ${years === 1 ? "anniversary" : "anniversary"}`;
  } else if (monthsDiff > 0) {
    milestoneLabel = `${monthsDiff}${getOrdinal(monthsDiff)} month`;
  } else {
    milestoneLabel = "first month";
  }

  const nextDateFormatted = candidate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  const startDateFormatted = startDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return {
    daysUntil,
    isToday,
    nextDate: candidate,
    nextDateFormatted,
    monthsTogetherAtNext: monthsDiff,
    milestoneLabel,
    daysTogether,
    hasCustomDate: Boolean(anniversaryDateStr),
    startDateFormatted,
  };
}
