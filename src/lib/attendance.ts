export type AttendanceRecord = {
  id: string;
  date: string;       // "2026-05-01"
  day: string;        // "金"
  status: "出勤" | "欠勤" | "有給";
  start: string;      // "09:00"
  end: string;        // "18:00"
  break: string;      // "1:00"
  hours: string;      // "8:00"
  location: "オフィス" | "オンライン";
  source?: "manual" | "slack";
};

export function timeToMinutes(t: string): number {
  if (!t || t === "0:00") return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(mins: number): string {
  if (mins <= 0) return "0:00";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

export function calcBreak(workMins: number): string {
  if (workMins >= 480) return "1:00";   // 8時間以上
  if (workMins >= 360) return "0:45";   // 6〜8時間
  return "0:00";
}

export function calcHours(start: string, end: string, breakTime: string): string {
  const startM = timeToMinutes(start);
  const endM = timeToMinutes(end);
  const breakM = timeToMinutes(breakTime);
  return minutesToTime(Math.max(0, endM - startM - breakM));
}

export function getDayOfWeek(dateStr: string): string {
  const days = ["日", "月", "火", "水", "木", "金", "土"];
  return days[new Date(dateStr).getDay()];
}

// HH:MM形式に正規化（例: "9:5" → "09:05"）
export function normalizeTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  return `${String(h).padStart(2, "0")}:${String(m ?? 0).padStart(2, "0")}`;
}

export const INITIAL_RECORDS: AttendanceRecord[] = [
  { id: "1", date: "2026-05-01", day: "金", status: "出勤", start: "12:00", end: "19:00", break: "0:45", hours: "6:15", location: "オフィス", source: "manual" },
  { id: "2", date: "2026-05-07", day: "木", status: "出勤", start: "13:30", end: "19:00", break: "0:00", hours: "5:30", location: "オフィス", source: "manual" },
  { id: "3", date: "2026-05-08", day: "金", status: "出勤", start: "12:40", end: "19:00", break: "0:45", hours: "5:35", location: "オフィス", source: "manual" },
  { id: "4", date: "2026-05-11", day: "月", status: "出勤", start: "15:00", end: "19:00", break: "0:00", hours: "4:00", location: "オフィス", source: "manual" },
  { id: "5", date: "2026-05-12", day: "火", status: "出勤", start: "16:00", end: "19:00", break: "0:00", hours: "3:00", location: "オフィス", source: "manual" },
  { id: "6", date: "2026-05-14", day: "木", status: "出勤", start: "10:00", end: "19:00", break: "1:00", hours: "8:00", location: "オフィス", source: "manual" },
  { id: "7", date: "2026-05-15", day: "金", status: "出勤", start: "12:00", end: "21:00", break: "1:00", hours: "8:00", location: "オフィス", source: "manual" },
  { id: "8", date: "2026-05-18", day: "月", status: "出勤", start: "15:00", end: "19:00", break: "0:00", hours: "4:00", location: "オフィス", source: "manual" },
  { id: "9", date: "2026-05-19", day: "火", status: "出勤", start: "16:00", end: "21:00", break: "0:00", hours: "5:00", location: "オフィス", source: "manual" },
  { id: "10", date: "2026-05-21", day: "木", status: "出勤", start: "10:00", end: "21:00", break: "1:00", hours: "10:00", location: "オフィス", source: "manual" },
  { id: "11", date: "2026-05-22", day: "金", status: "出勤", start: "12:15", end: "19:00", break: "0:45", hours: "6:00", location: "オフィス", source: "manual" },
  { id: "12", date: "2026-05-25", day: "月", status: "出勤", start: "15:00", end: "19:00", break: "0:00", hours: "4:00", location: "オフィス", source: "manual" },
  { id: "13", date: "2026-05-26", day: "火", status: "出勤", start: "16:00", end: "20:00", break: "0:00", hours: "4:00", location: "オフィス", source: "manual" },
  { id: "14", date: "2026-05-28", day: "木", status: "出勤", start: "10:00", end: "19:00", break: "1:00", hours: "8:00", location: "オフィス", source: "manual" },
  { id: "15", date: "2026-05-29", day: "金", status: "出勤", start: "12:00", end: "19:00", break: "0:45", hours: "6:15", location: "オフィス", source: "manual" },
];
