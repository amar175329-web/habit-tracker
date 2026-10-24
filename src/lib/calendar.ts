export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function monthRange(year: number, month: number): { from: string; to: string } {
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const last = daysInMonth(year, month);
  const to = `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  return { from, to };
}

export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

// Monday = 0 ... Sunday = 6
export function mondayIndex(date: Date): number {
  const js = date.getDay(); // 0 Sun .. 6 Sat
  return js === 0 ? 6 : js - 1;
}

export function calendarCells(year: number, month: number): (string | null)[] {
  const first = new Date(year, month - 1, 1);
  const total = daysInMonth(year, month);
  const offset = mondayIndex(first); // blanks before first
  const cells: (string | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= total; d++) {
    cells.push(`${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  // Ensure 6 rows (42 cells) for consistent height? pad to 42
  while (cells.length < 42) cells.push(null);
  return cells;
}

export function rangeForYear(year: number): { from: string; to: string } {
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}

export function formatMonthYear(year: number, month: number): string {
  const d = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(d);
}

// For timeline: get N days back from today inclusive
export function lastNDays(n: number, endDateKey: string): { from: string; to: string } {
  const end = new Date(`${endDateKey}T12:00:00`);
  const start = new Date(end);
  start.setDate(start.getDate() - (n - 1));
  const to = endDateKey;
  const from = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
  return { from, to };
}
