export interface ScheduleEvent {
  id: string;
  title: string;
  time: string;
  location: string;
  type: 'practice' | 'match' | 'event';
  items?: string[];
  date: number; // day of month
  month?: number; // 0-11 (追加した予定を特定の月にだけ表示する場合)
  year?: number;
}

export interface NextEventResult {
  event: ScheduleEvent;
  isToday: boolean;
  label: string;
  month: number;
  year: number;
}

/** DBなどから取得した予定リストから「次の予定」を算出する */
export function getNextEventFromEvents(events: ScheduleEvent[]): NextEventResult | null {
  if (events.length === 0) return null;
  const now = new Date();
  const todayDate = now.getDate();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const withFullDate = events
    .filter((e) => {
      const y = e.year ?? currentYear;
      const m = e.month ?? currentMonth;
      return y > currentYear || (y === currentYear && m >= currentMonth);
    })
    .map((e) => ({
      ...e,
      _y: e.year ?? currentYear,
      _m: e.month ?? currentMonth,
    }))
    .filter((e) => e._y > currentYear || (e._y === currentYear && e._m > currentMonth) || (e._y === currentYear && e._m === currentMonth && e.date >= todayDate))
    .sort((a, b) => (a._y !== b._y ? a._y - b._y : a._m !== b._m ? a._m - b._m : a.date - b.date));

  const next = withFullDate[0];
  if (!next) return null;

  const month = next._m;
  const year = next._y;
  const isToday = next._y === currentYear && next._m === currentMonth && next.date === todayDate;
  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  const label = isToday ? '本日' : `${monthNames[month]}${next.date}日`;

  return { event: next, isToday, label, month, year };
}
