import { HABIT_ORDER, type HabitId } from "./habits";

export interface DayLike {
  date: string;
  habitLogs: { habitId: HabitId; state: 0 | 1 | 2 }[];
  dailyLog: { content: string } | null;
  sleepLog: { durationMinutes: number } | null;
}

export function habitScore(state: 0 | 1 | 2): number {
  if (state === 2) return 1;
  if (state === 1) return 0.5;
  return 0;
}

export function weeklyStats(days: DayLike[]) {
  // days assumed 7, ordered
  const byHabit: Record<HabitId, { RED: number; LIGHT: number; WHITE: number; score: number; pct: number }> = {
    workout: { RED: 0, LIGHT: 0, WHITE: 0, score: 0, pct: 0 },
    study: { RED: 0, LIGHT: 0, WHITE: 0, score: 0, pct: 0 },
    ai: { RED: 0, LIGHT: 0, WHITE: 0, score: 0, pct: 0 },
    book: { RED: 0, LIGHT: 0, WHITE: 0, score: 0, pct: 0 },
    video: { RED: 0, LIGHT: 0, WHITE: 0, score: 0, pct: 0 },
  };
  const n = days.length || 7;
  for (const d of days) {
    const map: Record<string, number> = {};
    for (const l of d.habitLogs) map[l.habitId] = l.state;
    for (const hid of Object.keys(byHabit) as HabitId[]) {
      const s = (map[hid] as 0 | 1 | 2 | undefined) ?? 0;
      if (s === 2) byHabit[hid].RED++;
      else if (s === 1) byHabit[hid].LIGHT++;
      else byHabit[hid].WHITE++;
      byHabit[hid].score += habitScore(s);
    }
  }
  for (const hid of Object.keys(byHabit) as HabitId[]) {
    byHabit[hid].pct = Math.round((byHabit[hid].score / n) * 100);
  }

  const sleeps = days.map((d) => d.sleepLog?.durationMinutes ?? null);
  const present = sleeps.filter((x): x is number => x !== null);
  const avg = present.length ? Math.round(present.reduce((a, b) => a + b, 0) / present.length) : null;
  const variance = present.length >= 2 ? Math.round(Math.sqrt(present.reduce((a, b) => a + (b - (avg ?? 0)) ** 2, 0) / present.length)) : null;
  const withLog = days.filter((d) => (d.dailyLog?.content?.trim()?.length ?? 0) > 0).length;
  const withAny = days.filter((d) => d.habitLogs.length > 0 || d.dailyLog || d.sleepLog).length;

  return { byHabit, sleeps, avg, variance, withLog, withAny, n };
}

export function monthlyStats(days: DayLike[]) {
  const w = weeklyStats(days);
  // monthly same as weekly but n is days in month
  const activeDays = days.filter((d) => d.habitLogs.length > 0 || d.dailyLog || d.sleepLog).length;
  // distribution across RED/LIGHT/WHITE totals (5 habits per day)
  const totalSlots = days.length * 5;
  let red = 0, light = 0, white = totalSlots;
  for (const d of days) {
    for (const l of d.habitLogs) {
      if (l.state === 2) { red++; white--; }
      else if (l.state === 1) { light++; white--; }
    }
  }
  // word count signal (not productivity)
  let totalWords = 0, maxWords = 0, daysWithWords = 0;
  for (const d of days) {
    const c = d.dailyLog?.content?.trim() ?? "";
    if (!c) continue;
    const wc = c.split(/\s+/).filter(Boolean).length;
    totalWords += wc;
    maxWords = Math.max(maxWords, wc);
    daysWithWords++;
  }
  const avgWords = daysWithWords ? Math.round(totalWords / daysWithWords) : 0;

  return { ...w, activeDays, totalSlots, red, light, white, totalWords, avgWords, maxWords, daysWithWords };
}

export interface Correlation {
  habit: HabitId;
  label: string;
  lowSleepDays: number;
  normalSleepDays: number;
  lowRate: number; // 0-1
  normalRate: number;
  diff: number; // normal - low
  dataDays: number;
}

export function correlations(days: DayLike[]): { insights: Correlation[]; qualified: boolean; reason: string } {
  // need 30 distinct days with relevant records (at least one habit or sleep)
  const relevant = days.filter((d) => d.habitLogs.length > 0 || d.sleepLog);
  if (relevant.length < 30) {
    return { insights: [], qualified: false, reason: `Only ${relevant.length} days with relevant records — need 30.` };
  }
  const insights: Correlation[] = [];
  // Define low sleep <360 (6h), normal >=420 (7h)
  for (const hid of HABIT_ORDER) {
    const lowDays = days.filter((d) => (d.sleepLog?.durationMinutes ?? 999) < 360);
    const normalDays = days.filter((d) => (d.sleepLog?.durationMinutes ?? 0) >= 420);
    if (lowDays.length < 5 || normalDays.length < 5) continue; // not enough sample
    const lowRate = lowDays.filter((d) => d.habitLogs.some((l) => l.habitId === hid && l.state !== 0)).length / lowDays.length;
    const normalRate = normalDays.filter((d) => d.habitLogs.some((l) => l.habitId === hid && l.state !== 0)).length / normalDays.length;
    const diff = normalRate - lowRate;
    if (Math.abs(diff) < 0.15) continue; // only notable
    insights.push({
      habit: hid,
      label: `Across the recorded data, ${diff > 0 ? "lower-sleep days were associated with fewer" : "lower-sleep days were associated with more"} ${hid} completions.`,
      lowSleepDays: lowDays.length,
      normalSleepDays: normalDays.length,
      lowRate,
      normalRate,
      diff,
      dataDays: relevant.length,
    });
  }
  if (insights.length === 0) {
    return { insights: [], qualified: true, reason: "No notable pattern — rates similar across sleep levels." };
  }
  return { insights, qualified: true, reason: `Based on ${relevant.length} days with records` };
}

export interface EquityPoint {
  date: string;
  dayScore: number; // 0 to 5.0
  equity: number; // Cumulative points earned
  ath: number; // All-time high
  drawdown: number; // ath - equity
  pctDone: number; // day score / 5 * 100
}

export function calculateEquityCurve(days: DayLike[]): {
  points: EquityPoint[];
  currentEquity: number;
  allTimeHigh: number;
  maxDrawdown: number;
  winRate: number; // % of days with score >= 3.0 (60%+)
  totalDays: number;
} {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  let cumulative = 0;
  let ath = 0;
  let maxDd = 0;
  let winningDays = 0;

  const points: EquityPoint[] = sorted.map((d) => {
    let dayScore = 0;
    for (const l of d.habitLogs) {
      dayScore += habitScore(l.state);
    }
    cumulative += dayScore;
    if (cumulative > ath) ath = cumulative;
    const dd = Math.max(0, ath - cumulative);
    if (dd > maxDd) maxDd = dd;

    if (dayScore >= 3.0) winningDays++;

    return {
      date: d.date,
      dayScore: Number(dayScore.toFixed(1)),
      equity: Number(cumulative.toFixed(1)),
      ath: Number(ath.toFixed(1)),
      drawdown: Number(dd.toFixed(1)),
      pctDone: Math.round((dayScore / 5) * 100),
    };
  });

  const totalDays = sorted.length;
  const winRate = totalDays > 0 ? Math.round((winningDays / totalDays) * 100) : 0;

  return {
    points,
    currentEquity: Number(cumulative.toFixed(1)),
    allTimeHigh: Number(ath.toFixed(1)),
    maxDrawdown: Number(maxDd.toFixed(1)),
    winRate,
    totalDays,
  };
}

