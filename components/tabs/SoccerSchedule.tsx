
import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, MapPin, Calendar as CalIcon, Clock, Briefcase, X, Check, Trash2, MapPinned } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { attendance as attendanceDb, scheduleEvents as scheduleEventsDb } from '../../lib/database';
import type { ScheduleEvent } from '../../lib/scheduleEvents';

interface SoccerScheduleProps {
  triggerOpenAddEvent?: boolean;
  onTriggerOpenAddEvent?: () => void;
}

export const SoccerSchedule: React.FC<SoccerScheduleProps> = ({ triggerOpenAddEvent, onTriggerOpenAddEvent }) => {
  const { user } = useAuth();
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState(today.getDate());
  const [showAttendance, setShowAttendance] = useState<string | null>(null);
  const [attendanceStatus, setAttendanceStatus] = useState<Record<string, 'attend' | 'absent' | 'undecided'>>({});
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', startTime: '', endTime: '', location: '', type: 'practice' as ScheduleEvent['type'] });
  const [locationLoading, setLocationLoading] = useState(false);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  const loadEvents = useCallback(() => {
    setEventsLoading(true);
    scheduleEventsDb.listByMonth(currentYear, currentMonth).then(({ data, error }) => {
      setEventsLoading(false);
      if (error) {
        setEvents([]);
        return;
      }
      setEvents(
        (data || []).map((r: { id: string; event_date: string; title: string; time: string; location: string; type: string; items?: string[] }) => {
          const d = new Date(r.event_date);
          return {
            id: r.id,
            title: r.title,
            time: r.time,
            location: r.location,
            type: r.type as ScheduleEvent['type'],
            items: r.items,
            date: d.getDate(),
            month: d.getMonth(),
            year: d.getFullYear(),
          };
        })
      );
    });
  }, [currentYear, currentMonth]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    if (triggerOpenAddEvent) {
      setShowAddEvent(true);
      onTriggerOpenAddEvent?.();
    }
  }, [triggerOpenAddEvent, onTriggerOpenAddEvent]);

  useEffect(() => {
    if (user) {
      attendanceDb.list(user.id).then(({ data }) => {
        const statusMap: Record<string, 'attend' | 'absent' | 'undecided'> = {};
        data.forEach((a: any) => { statusMap[a.event_id] = a.status; });
        setAttendanceStatus(statusMap);
      });
    }
  }, [user]);

  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const prevMonthDays = getDaysInMonth(currentYear, currentMonth - 1);
  const calendarDays: { day: number; currentMonth: boolean }[] = [];

  for (let i = firstDay - 1; i >= 0; i--) {
    calendarDays.push({ day: prevMonthDays - i, currentMonth: false });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({ day: i, currentMonth: true });
  }
  const remaining = 7 - (calendarDays.length % 7);
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      calendarDays.push({ day: i, currentMonth: false });
    }
  }

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
    else setCurrentMonth(currentMonth - 1);
    setSelectedDate(1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
    else setCurrentMonth(currentMonth + 1);
    setSelectedDate(1);
  };

  const goToToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setSelectedDate(today.getDate());
  };

  const getEventsForDate = (day: number) =>
    events.filter(
      (e) =>
        e.date === day &&
        (e.month === undefined || (e.month === currentMonth && e.year === currentYear))
    );
  const selectedEvents = getEventsForDate(selectedDate);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'practice': return 'bg-emerald-400';
      case 'match': return 'bg-blue-400';
      case 'event': return 'bg-orange-400';
      default: return 'bg-slate-400';
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'practice': return { label: 'PRACTICE', cls: 'text-emerald-500 bg-emerald-50' };
      case 'match': return { label: 'MATCH', cls: 'text-blue-500 bg-blue-50' };
      case 'event': return { label: 'EVENT', cls: 'text-orange-500 bg-orange-50' };
      default: return { label: '', cls: '' };
    }
  };

  const openMap = (location: string) => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`, '_blank');
  };

  const EVENT_TYPE_OPTIONS: { value: ScheduleEvent['type']; label: string }[] = [
    { value: 'practice', label: '練習' },
    { value: 'match', label: '試合' },
    { value: 'event', label: '遠征' },
  ];

  const timeString = [newEvent.startTime, newEvent.endTime].filter(Boolean).join(' - ') || '';

  const handleAddEvent = async () => {
    if (!newEvent.title.trim()) return;
    const eventDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(selectedDate).padStart(2, '0')}`;
    const { error } = await scheduleEventsDb.create({
      event_date: eventDate,
      title: newEvent.title.trim(),
      time: timeString,
      location: newEvent.location.trim() || '',
      type: newEvent.type,
    });
    if (error) return;
    setNewEvent({ title: '', startTime: '', endTime: '', location: '', type: 'practice' });
    setShowAddEvent(false);
    loadEvents();
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('お使いのブラウザは位置情報に対応していません');
      return;
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { 'Accept-Language': 'ja', 'User-Agent': 'SoccerClubApp/1.0' } }
          );
          const data = await res.json();
          const name = data.display_name || data.address?.road || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
          setNewEvent((e) => ({ ...e, location: name }));
        } catch {
          setNewEvent((e) => ({ ...e, location: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}` }));
        }
        setLocationLoading(false);
      },
      () => {
        alert('位置情報を取得できませんでした。設定で位置情報を許可してください。');
        setLocationLoading(false);
      }
    );
  };

  return (
    <div className="p-6 space-y-8 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-emerald-500 rounded-lg text-white"><CalIcon size={20} /></div>
          <h2 className="text-xl font-black text-slate-800">スケジュール管理</h2>
        </div>
        <button onClick={goToToday} className="px-3 py-1 bg-emerald-100 text-emerald-600 text-[10px] font-bold rounded-lg uppercase tracking-wider active:scale-95 transition-transform">今日</button>
      </div>

      {/* Calendar */}
      <section className="relative bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        {eventsLoading && (
          <div className="absolute inset-0 rounded-3xl bg-white/80 flex items-center justify-center z-10">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <div className="flex items-center justify-between mb-6">
          <button onClick={prevMonth} className="p-2 hover:bg-slate-50 rounded-full transition-colors active:scale-95"><ChevronLeft size={18} className="text-slate-400" /></button>
          <h3 className="text-sm font-black text-slate-800">{currentYear}年 {monthNames[currentMonth]}</h3>
          <button onClick={nextMonth} className="p-2 hover:bg-slate-50 rounded-full transition-colors active:scale-95"><ChevronRight size={18} className="text-slate-400" /></button>
        </div>

        <div className="grid grid-cols-7 gap-y-3 mb-4">
          {dayNames.map((d, i) => (
            <div key={i} className="text-center text-[10px] font-bold text-slate-300">{d}</div>
          ))}
          {calendarDays.map((d, i) => {
            const events = d.currentMonth ? getEventsForDate(d.day) : [];
            const isSelected = d.currentMonth && d.day === selectedDate;
            const isToday = d.currentMonth && d.day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
            return (
              <div key={i} className="flex flex-col items-center">
                <button
                  onClick={() => d.currentMonth && setSelectedDate(d.day)}
                  className={`w-8 h-8 flex items-center justify-center text-xs font-bold rounded-lg transition-all ${
                    isSelected ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' :
                    isToday ? 'bg-emerald-100 text-emerald-700' :
                    d.currentMonth ? 'text-slate-600 hover:bg-slate-50' : 'text-slate-200'
                  }`}
                >
                  {d.day}
                </button>
                <div className="flex space-x-0.5 mt-1 h-1.5">
                  {events.map((ev, j) => (
                    <div key={j} className={`w-1 h-1 rounded-full ${getTypeColor(ev.type)}`} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-center space-x-4 pt-4 border-t border-slate-50">
          <Legend color="bg-emerald-400" label="練習" />
          <Legend color="bg-blue-400" label="試合" />
          <Legend color="bg-orange-400" label="遠征" />
        </div>
      </section>

      {/* Daily Agenda */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-slate-800 tracking-tight text-lg">{currentMonth + 1}月{selectedDate}日 の予定</h3>
          {selectedEvents.length > 0 && (
            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${getTypeBadge(selectedEvents[0].type).cls}`}>{getTypeBadge(selectedEvents[0].type).label}</span>
          )}
        </div>

        {selectedEvents.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 text-center">
            <div className="text-3xl mb-2">📅</div>
            <p className="text-sm font-bold text-slate-400">この日の予定はありません</p>
            <button onClick={() => setShowAddEvent(true)} className="mt-3 px-4 py-2 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-xl">予定を追加</button>
          </div>
        ) : (
          <>
          {selectedEvents.map((event) => (
            <div key={event.id} className="mb-4">
              <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 relative">
                <button
                  type="button"
                  onClick={async () => {
                    if (!confirm(`「${event.title}」を削除しますか？`)) return;
                    await scheduleEventsDb.delete(event.id);
                    loadEvents();
                  }}
                  className="absolute top-3 right-3 z-10 p-2 rounded-xl text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                  aria-label="予定を削除"
                >
                  <Trash2 size={18} />
                </button>
                {(event.type === 'match' || event.type === 'practice') && (
                  <div className="h-32 bg-slate-900 relative">
                    <img src={event.type === 'match' ? '/images/2.webp' : '/images/1.webp'} alt={event.type === 'match' ? '試合' : '練習'} className="w-full h-full object-cover opacity-70" />
                    <div className="absolute inset-0 flex items-center justify-center space-x-8 text-white">
                      <div className="text-center">
                        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm mb-1"></div>
                        <p className="text-[10px] font-bold">ジュニアA</p>
                      </div>
                      <div className="text-xl font-black italic">VS</div>
                      <div className="text-center">
                        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm mb-1"></div>
                        <p className="text-[10px] font-bold">{event.title.split('vs ')[1] || '対戦相手'}</p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="p-5 space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="mt-1 p-1.5 bg-slate-50 text-slate-400 rounded-lg"><Clock size={16} /></div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{event.time}</p>
                      {event.type === 'match' && <p className="text-[10px] text-slate-400 font-medium">集合時間: {event.time.split(' - ')[0].replace(':00', ':30').replace(':30', ':00')}</p>}
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="mt-1 p-1.5 bg-slate-50 text-slate-400 rounded-lg"><MapPin size={16} /></div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{event.location}</p>
                      <button onClick={() => openMap(event.location)} className="text-[10px] text-emerald-500 font-bold underline flex items-center">マップで見る <svg className="w-3 h-3 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg></button>
                    </div>
                  </div>
                  {event.items && (
                    <div className="p-4 bg-slate-50 rounded-2xl">
                      <div className="flex items-center space-x-2 mb-2 text-slate-500">
                        <Briefcase size={14} />
                        <span className="text-xs font-bold">持ち物</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 font-medium">
                        {event.items.map((item, j) => (
                          <div key={j} className="flex items-center space-x-1"><div className="w-1 h-1 rounded-full bg-slate-300"></div><span>{item}</span></div>
                        ))}
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => setShowAttendance(event.id)}
                    className={`w-full py-4 font-bold text-sm rounded-2xl shadow-lg flex items-center justify-center space-x-2 active:scale-95 transition-transform ${
                      attendanceStatus[event.id] === 'attend' ? 'bg-emerald-100 text-emerald-700 shadow-emerald-50' :
                      attendanceStatus[event.id] === 'absent' ? 'bg-red-100 text-red-700 shadow-red-50' :
                      'bg-emerald-500 text-white shadow-emerald-100'
                    }`}
                  >
                    <AttendIcon size={18} />
                    <span>{attendanceStatus[event.id] === 'attend' ? '✓ 出席で回答済み' : attendanceStatus[event.id] === 'absent' ? '✕ 欠席で回答済み' : '出欠を回答する'}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
          <button onClick={() => setShowAddEvent(true)} className="mt-2 w-full py-3 border-2 border-dashed border-slate-200 text-slate-400 text-sm font-bold rounded-2xl">この日に予定を追加</button>
          </>
        )}
      </section>

      {/* Attendance Modal */}
      {showAttendance && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={() => setShowAttendance(null)}>
          <div className="bg-white rounded-t-3xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-2" />
            <h3 className="text-lg font-bold text-slate-800 text-center">出欠を回答</h3>
            <button
              onClick={async () => { if (user && showAttendance) { await attendanceDb.upsert(user.id, showAttendance, 'attend'); setAttendanceStatus(prev => ({ ...prev, [showAttendance]: 'attend' })); } setShowAttendance(null); }}
              className="w-full py-4 bg-emerald-500 text-white font-bold rounded-2xl flex items-center justify-center space-x-2 active:scale-95 transition-transform"
            >
              <Check size={20} /><span>出席します</span>
            </button>
            <button
              onClick={async () => { if (user && showAttendance) { await attendanceDb.upsert(user.id, showAttendance, 'absent'); setAttendanceStatus(prev => ({ ...prev, [showAttendance]: 'absent' })); } setShowAttendance(null); }}
              className="w-full py-4 bg-red-500 text-white font-bold rounded-2xl flex items-center justify-center space-x-2 active:scale-95 transition-transform"
            >
              <X size={20} /><span>欠席します</span>
            </button>
            <button onClick={() => setShowAttendance(null)} className="w-full py-3 text-slate-400 font-bold text-sm">キャンセル</button>
          </div>
        </div>
      )}

      {/* Add Event Modal */}
      {showAddEvent && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/50" onClick={() => setShowAddEvent(false)}>
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-sm p-6 pb-10 sm:pb-6 space-y-5 relative max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto sm:hidden" />
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-800">予定を追加</h3>
                <p className="text-xs text-slate-500 mt-0.5">{currentYear}年{currentMonth + 1}月{selectedDate}日</p>
              </div>
              <button onClick={() => setShowAddEvent(false)} className="p-2 rounded-full hover:bg-slate-100 text-slate-400"><X size={20} /></button>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">タグ</label>
              <div className="flex gap-2">
                {EVENT_TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setNewEvent({ ...newEvent, type: opt.value })}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                      newEvent.type === opt.value
                        ? opt.value === 'practice'
                          ? 'bg-emerald-500 text-white shadow-sm'
                          : opt.value === 'match'
                            ? 'bg-blue-500 text-white shadow-sm'
                            : 'bg-orange-500 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden border border-slate-100 aspect-video bg-slate-900">
              <img
                src={newEvent.type === 'match' ? '/images/2.webp' : '/images/1.webp'}
                alt={newEvent.type === 'match' ? '試合' : '練習'}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">タイトル</label>
              <input value={newEvent.title} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} placeholder="例: 定期練習" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">時間</label>
              <div className="flex items-center gap-2">
                <input type="time" value={newEvent.startTime} onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })} className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                <span className="text-slate-300 font-bold">〜</span>
                <input type="time" value={newEvent.endTime} onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })} className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">場所</label>
              <div className="flex gap-2">
                <input value={newEvent.location} onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })} placeholder="住所や施設名" className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                <button type="button" onClick={getCurrentLocation} disabled={locationLoading} className="shrink-0 px-3 py-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 font-bold text-xs flex items-center gap-1 disabled:opacity-50" title="現在地を取得">
                  <MapPinned size={18} />
                  {locationLoading ? '取得中...' : '現在地'}
                </button>
              </div>
            </div>
            <button onClick={handleAddEvent} className="w-full py-3.5 bg-emerald-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-200 active:scale-[0.99] transition-transform">追加する</button>
          </div>
        </div>
      )}
    </div>
  );
};

const Legend: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <div className="flex items-center space-x-1.5">
    <div className={`w-1.5 h-1.5 rounded-full ${color}`}></div>
    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
  </div>
);

const AttendIcon: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><polyline points="17 11 19 13 23 9"></polyline></svg>
);
