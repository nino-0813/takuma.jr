import { format, isToday, isTomorrow } from "date-fns";
import { ja } from "date-fns/locale";

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

const WEEK = ["日", "月", "火", "水", "木", "金", "土"];

export function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${format(d, "M月d日", { locale: ja })}(${WEEK[d.getDay()]})`;
}

export function fmtTime(iso: string) {
  return format(new Date(iso), "HH:mm");
}

export function fmtDayLabel(iso: string) {
  const d = new Date(iso);
  if (isToday(d)) return "今日";
  if (isTomorrow(d)) return "明日";
  return fmtDate(iso);
}

export function weekdayJa(date: Date) {
  return WEEK[date.getDay()];
}

export function toDateKey(d: Date) {
  return format(d, "yyyy-MM-dd");
}

export function generateInviteCode(len = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export function eventTypeLabel(type: string) {
  switch (type) {
    case "match":
      return "試合";
    case "practice":
      return "練習";
    default:
      return "予定";
  }
}

export function eventTypeColor(type: string) {
  switch (type) {
    case "match":
      return "bg-pitch-600";
    case "practice":
      return "bg-sky-500";
    default:
      return "bg-slate-400";
  }
}
