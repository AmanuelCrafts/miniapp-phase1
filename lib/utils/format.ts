const integerFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

const decimalFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "1250" -> "1,250 ETB" */
export function formatETB(value: number): string {
  return `${integerFormatter.format(value)} ETB`;
}

/** "7.5" -> "7.50 ETB" (always two decimals for daily income). */
export function formatETB2(value: number): string {
  return `${decimalFormatter.format(value)} ETB`;
}

/** "7.5" -> "+7.50 ETB / DAY" */
export function formatDailyIncome(value: number): string {
  return `+${decimalFormatter.format(value)} ETB / DAY`;
}

/** "2026-10-01T..." -> "Oct 2026" */
export function formatMonthYear(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}
