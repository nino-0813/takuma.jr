
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Bell, MapPin, ChevronRight, Play, X, Check } from 'lucide-react';
import { Notification } from '../../types';
import { Tab } from '../../types';
import { useAuth } from '../../lib/AuthContext';
import { clockRecords, absenceReports, scheduleEvents as scheduleEventsDb, attendance as attendanceDb, practiceRecords, matchVideos as matchVideosDb } from '../../lib/database';
import { getNextEventFromEvents, type ScheduleEvent } from '../../lib/scheduleEvents';

interface SoccerHomeProps {
  onStartPractice: () => void;
  onNavigateTab?: (tab: Tab) => void;
}

const NOTIFICATIONS: Notification[] = [
  { id: '1', title: '練習試合のお知らせ', message: '11/3(日) 中央スポーツパークで練習試合があります', time: '10分前', read: false, type: 'event' },
  { id: '2', title: '【重要】集合場所変更', message: '雨天のため集合場所が体育館ロビーに変更されました', time: '1時間前', read: false, type: 'important' },
  { id: '3', title: '新しい動画が追加されました', message: '「シザースフェイントのコツ」がアカデミーに追加', time: '昨日', read: true, type: 'info' },
  { id: '4', title: 'スタンプ獲得！', message: '連続10日練習記録達成のスタンプを獲得しました', time: '2日前', read: true, type: 'info' },
];

export const SoccerHome: React.FC<SoccerHomeProps> = ({ onStartPractice, onNavigateTab }) => {
  const { user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState(NOTIFICATIONS);
  const [showDetail, setShowDetail] = useState(false);
  const [showAbsence, setShowAbsence] = useState(false);
  const [absenceReason, setAbsenceReason] = useState('');
  const [absenceSent, setAbsenceSent] = useState(false);
  const [clockIn, setClockIn] = useState<string | null>(null);
  const [clockOut, setClockOut] = useState<string | null>(null);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState<Record<string, 'attend' | 'absent' | 'undecided'>>({});
  const [eventAttendance, setEventAttendance] = useState<{ attend: { user_id: string; name: string }[]; absent: { user_id: string; name: string }[]; undecided: { user_id: string; name: string }[] } | null>(null);
  const [latestPracticeRecord, setLatestPracticeRecord] = useState<{ id: string; date: string; mood: string; menu: string; tags: string[] } | null>(null);
  const [latestMatchVideo, setLatestMatchVideo] = useState<{ id: string; title: string; match_date: string; video_url: string } | null>(null);

  const loadAttendance = useCallback(() => {
    if (!user) return;
    attendanceDb.list(user.id).then(({ data }) => {
      const statusMap: Record<string, 'attend' | 'absent' | 'undecided'> = {};
      (data || []).forEach((a: { event_id: string; status: string }) => { statusMap[a.event_id] = a.status as 'attend' | 'absent' | 'undecided'; });
      setAttendanceStatus(statusMap);
    });
  }, [user]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  useEffect(() => {
    if (user) {
      clockRecords.getToday(user.id).then(({ data }) => {
        if (data) {
          setClockIn(data.clock_in ? new Date(data.clock_in).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : null);
          setClockOut(data.clock_out ? new Date(data.clock_out).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : null);
        }
      });
    }
  }, [user]);

  const userName = user?.user_metadata?.name || 'はると';
  const unreadCount = notifications.filter(n => !n.read).length;
  const [scheduleEventsList, setScheduleEventsList] = useState<ScheduleEvent[]>([]);
  useEffect(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    Promise.all([
      scheduleEventsDb.listByMonth(y, m),
      scheduleEventsDb.listByMonth(m === 11 ? y + 1 : y, (m + 1) % 12),
    ]).then(([a, b]) => {
      const map = (d: { id: string; event_date: string; title: string; time: string; location: string; type: string; items?: string[] }[]) =>
        (d || []).map((r) => {
          const date = new Date(r.event_date);
          return {
            id: r.id,
            title: r.title,
            time: r.time,
            location: r.location,
            type: r.type as ScheduleEvent['type'],
            items: r.items,
            date: date.getDate(),
            month: date.getMonth(),
            year: date.getFullYear(),
          };
        });
      setScheduleEventsList([...map(a.data || []), ...map(b.data || [])]);
    });
  }, []);
  const nextSchedule = useMemo(() => getNextEventFromEvents(scheduleEventsList), [scheduleEventsList]);
  const [eventDayWeather, setEventDayWeather] = useState<{ tempMax?: number; tempMin?: number; weatherCode?: number } | null>(null);

  useEffect(() => {
    if (!nextSchedule?.event.id) {
      setEventAttendance(null);
      return;
    }
    attendanceDb.listByEvent(nextSchedule.event.id).then(setEventAttendance);
  }, [nextSchedule?.event.id]);

  const loadLatestPracticeRecord = useCallback(() => {
    if (!user) return;
    practiceRecords.list(user.id).then(({ data }) => {
      const list = data || [];
      if (list.length > 0) {
        const r = list[0] as { id: string; date: string; mood: string; menu: string; tags: string[] };
        setLatestPracticeRecord({ id: r.id, date: r.date, mood: r.mood, menu: r.menu || '', tags: r.tags || [] });
      } else {
        setLatestPracticeRecord(null);
      }
    });
  }, [user]);

  useEffect(() => {
    loadLatestPracticeRecord();
  }, [loadLatestPracticeRecord]);

  const loadLatestMatchVideo = useCallback(() => {
    matchVideosDb.listAll().then(({ data }) => {
      const list = data || [];
      if (list.length > 0) {
        const v = list[0] as { id: string; title: string; match_date: string; video_url: string };
        setLatestMatchVideo({ id: v.id, title: v.title || '試合動画', match_date: v.match_date, video_url: v.video_url || '' });
      } else {
        setLatestMatchVideo(null);
      }
    });
  }, []);

  useEffect(() => {
    loadLatestMatchVideo();
  }, [loadLatestMatchVideo]);

  useEffect(() => {
    const onFocus = () => {
      loadAttendance();
      loadLatestPracticeRecord();
      loadLatestMatchVideo();
      if (nextSchedule?.event.id) attendanceDb.listByEvent(nextSchedule.event.id).then(setEventAttendance);
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [loadAttendance, loadLatestPracticeRecord, loadLatestMatchVideo, nextSchedule?.event.id]);

  const formatRecordDate = (dateStr: string) => {
    const today = new Date();
    const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.getFullYear() + '-' + String(yesterday.getMonth() + 1).padStart(2, '0') + '-' + String(yesterday.getDate()).padStart(2, '0');
    if (dateStr === todayStr) return '今日';
    if (dateStr === yesterdayStr) return '昨日';
    const [y, m, d] = dateStr.split('-').map(Number);
    return `${m}月${d}日`;
  };
  const moodEmoji = (mood: string) => {
    if (mood === 'perfect') return '🤩';
    if (mood === 'focused') return '⚽';
    if (mood === 'happy') return '😊';
    if (mood === 'normal') return '🤨';
    if (mood === 'tired') return '😴';
    return '😊';
  };
  const moodLabel = (mood: string) => {
    if (mood === 'perfect') return 'さいこう';
    if (mood === 'focused') return 'しゅうちゅう';
    if (mood === 'happy') return 'たのしい';
    if (mood === 'normal') return 'ふつう';
    if (mood === 'tired') return 'つかれた';
    return 'たのしい';
  };
  const getYoutubeThumbUrl = (url: string): string | null => {
    const u = (url || '').trim();
    if (!u) return null;
    const m = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : null;
  };
  const weatherLabel = (code: number) => {
    if (code === 0) return '晴れ';
    if (code === 1 || code === 2 || code === 3) return '曇り';
    if (code === 45 || code === 48) return '霧';
    if (code >= 51 && code <= 67) return '雨';
    if (code >= 71 && code <= 77) return '雪';
    if (code >= 80 && code <= 82) return 'にわか雨';
    if (code >= 85 && code <= 86) return 'にわか雪';
    if (code === 95) return '雷';
    return '曇り';
  };
  const weatherDisplay = eventDayWeather
    ? `${weatherLabel(eventDayWeather.weatherCode ?? 0)} ${eventDayWeather.tempMax != null ? Math.round(eventDayWeather.tempMax) + '℃' : ''}`
    : null;

  useEffect(() => {
    if (!nextSchedule) {
      setEventDayWeather(null);
      return;
    }
    const y = nextSchedule.event.year ?? new Date().getFullYear();
    const m = (nextSchedule.event.month ?? new Date().getMonth()) + 1;
    const d = nextSchedule.event.date;
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const todayStr = new Date().toISOString().split('T')[0];
    if (dateStr < todayStr) {
      setEventDayWeather(null);
      return;
    }
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=35.6762&longitude=139.6503&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=Asia%2FTokyo&start_date=${dateStr}&end_date=${dateStr}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.daily?.time?.[0] === dateStr) {
          setEventDayWeather({
            tempMax: data.daily.temperature_2m_max?.[0],
            tempMin: data.daily.temperature_2m_min?.[0],
            weatherCode: data.daily.weathercode?.[0],
          });
        } else {
          setEventDayWeather(null);
        }
      })
      .catch(() => setEventDayWeather(null));
  }, [nextSchedule?.event?.id, nextSchedule?.event?.date, nextSchedule?.event?.month, nextSchedule?.event?.year]);

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const handleClockIn = async () => {
    if (!user) return;
    const { data } = await clockRecords.clockIn(user.id);
    if (data?.clock_in) {
      setClockIn(new Date(data.clock_in).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }));
    }
    onStartPractice();
  };

  const handleClockOut = async () => {
    if (!user || !clockIn) return;
    const { data } = await clockRecords.clockOut(user.id);
    if (data?.clock_out) {
      const outTime = new Date(data.clock_out).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
      setClockOut(outTime);
      alert(`練習終了を記録しました (${clockIn} 〜 ${outTime})`);
    }
  };

  const sendAbsence = async () => {
    if (!absenceReason.trim() || !user || !nextSchedule) return;
    const title = `${nextSchedule.event.time.split(' - ')[0]} 〜 ${nextSchedule.event.title}`;
    await absenceReports.create(user.id, title, absenceReason);
    setAbsenceSent(true);
    setTimeout(() => {
      setShowAbsence(false);
      setAbsenceSent(false);
      setAbsenceReason('');
    }, 1500);
  };

  const openMap = (location?: string) => {
    const q = location || nextSchedule?.event.location || 'Aグラウンド';
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`, '_blank');
  };

  return (
    <div className="p-6 space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold border-2 border-white shadow-sm overflow-hidden">
            <img src="https://picsum.photos/seed/user/100/100" alt="Avatar" className="w-full h-full object-cover" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-full">Junior Course</span>
            <h2 className="text-lg font-bold text-slate-800">おかえり、{userName}くん</h2>
          </div>
        </div>
        <button onClick={() => setShowNotifications(true)} className="relative p-2 text-slate-400 hover:text-emerald-500 transition-colors">
          <Bell size={24} />
          {unreadCount > 0 && <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-bold text-white">{unreadCount}</span>}
        </button>
      </div>

      {/* Next Activity */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-slate-800 tracking-tight">次の活動</h3>
          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest flex items-center">Coming Up <div className="ml-1 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div></span>
        </div>
        {nextSchedule ? (
          <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100">
            <div className="h-44 sm:h-48 bg-slate-900 relative flex items-center justify-center">
              <img
                src={nextSchedule.event.type === 'match' ? '/images/2.webp' : '/images/1.webp'}
                alt={nextSchedule.event.type === 'match' ? '試合' : '練習'}
                className="w-full h-full object-contain"
              />
              <div className="absolute top-4 left-4"><span className="px-3 py-1 bg-emerald-500 text-white text-[10px] font-bold rounded-lg shadow-lg">{nextSchedule.label}</span></div>
              <div className="absolute bottom-4 left-4 text-white"><div className="flex items-center space-x-1 opacity-80 mb-1"><MapPin size={12} /><span className="text-[10px] font-bold">{nextSchedule.event.location}</span></div></div>
            </div>
            <div className="p-5 flex items-center justify-between">
              <div>
                <span className="text-xl font-black text-slate-800">{nextSchedule.event.time.split(' - ')[0]} 〜 {nextSchedule.event.title}</span>
                <div className="flex items-center space-x-2 text-xs text-slate-400 font-medium mt-1">
                  <span className="flex items-center space-x-1"><div className="w-2 h-2 rounded-full bg-yellow-400"></div> <span>{weatherDisplay || '--'}</span></span>
                  <span>•</span><span>{nextSchedule.event.location}</span>
                </div>
              </div>
              <button onClick={() => openMap(nextSchedule.event.location)} className="p-2 bg-emerald-50 text-emerald-500 rounded-xl active:scale-95 transition-transform"><MapPin size={20} /></button>
            </div>
            <div className="px-5 pb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold text-slate-500">この予定への参加</span>
                {attendanceStatus[nextSchedule.event.id] === 'attend' && (
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-lg">✓ 出席で回答済み</span>
                )}
                {attendanceStatus[nextSchedule.event.id] === 'absent' && (
                  <span className="px-2 py-1 bg-red-100 text-red-700 text-[10px] font-bold rounded-lg">✕ 欠席で回答済み</span>
                )}
                {attendanceStatus[nextSchedule.event.id] === 'undecided' && (
                  <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-lg">未定</span>
                )}
                {!attendanceStatus[nextSchedule.event.id] && (
                  <span className="text-[10px] text-slate-400 font-bold">未回答</span>
                )}
              </div>
              {eventAttendance && (eventAttendance.attend.length > 0 || eventAttendance.absent.length > 0 || eventAttendance.undecided.length > 0) && (
                <div className="mb-3 pt-3 border-t border-slate-100 space-y-2">
                  <span className="text-[10px] font-bold text-slate-500">出欠一覧</span>
                  {eventAttendance.attend.length > 0 && (
                    <div className="text-[11px]">
                      <span className="font-bold text-emerald-600">出席 ({eventAttendance.attend.length}人): </span>
                      <span className="text-slate-600">{eventAttendance.attend.map((a) => a.name).join('、')}</span>
                    </div>
                  )}
                  {eventAttendance.absent.length > 0 && (
                    <div className="text-[11px]">
                      <span className="font-bold text-red-600">欠席 ({eventAttendance.absent.length}人): </span>
                      <span className="text-slate-600">{eventAttendance.absent.map((a) => a.name).join('、')}</span>
                    </div>
                  )}
                  {eventAttendance.undecided.length > 0 && (
                    <div className="text-[11px]">
                      <span className="font-bold text-slate-500">未定 ({eventAttendance.undecided.length}人): </span>
                      <span className="text-slate-600">{eventAttendance.undecided.map((a) => a.name).join('、')}</span>
                    </div>
                  )}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setShowDetail(true)} className="flex-1 min-w-[100px] py-3 bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-100 active:scale-95 transition-transform">詳細を確認</button>
                <button onClick={() => setShowAbsence(true)} className="flex-1 min-w-[100px] py-3 bg-white border border-slate-100 text-slate-400 text-xs font-bold rounded-xl active:scale-95 transition-transform">欠席連絡</button>
                {!attendanceStatus[nextSchedule.event.id] && onNavigateTab && (
                  <button onClick={() => onNavigateTab('schedule')} className="w-full py-2.5 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-xl border border-emerald-100 active:scale-95 transition-transform">出欠を回答する → スケジュール</button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 text-center">
            <div className="text-3xl mb-2">📅</div>
            <p className="text-sm font-bold text-slate-400">次の予定はありません</p>
          </div>
        )}
        <div className="mt-4 p-4 bg-emerald-50 rounded-2xl flex items-center justify-between border border-emerald-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600"><UserIcon size={20} /></div>
            <div>
              <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">今日の参加</p>
              <p className="text-xs font-bold text-slate-800">{clockIn ? `${clockIn} に参加済み` : '参加を記録しましょう'}</p>
            </div>
          </div>
          <button onClick={clockIn ? onStartPractice : handleClockIn} className="px-4 py-2 bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm active:scale-95 transition-transform">{clockIn ? '練習記録を書く' : '参加を記録'}</button>
        </div>
      </section>

      {/* Review - 練習記録 */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-slate-800 tracking-tight">前回の振り返り</h3>
          <button onClick={() => onNavigateTab?.('mypage')} className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">すべて見る</button>
        </div>
        {latestPracticeRecord ? (
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4 cursor-pointer active:bg-slate-50" onClick={() => onNavigateTab?.('mypage')}>
            <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center shrink-0">
              <div className="flex flex-col items-center">
                <span className="text-[8px] font-black leading-tight">{moodLabel(latestPracticeRecord.mood)}</span>
                <span className="text-lg">{moodEmoji(latestPracticeRecord.mood)}</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start gap-2">
                <h4 className="text-xs font-bold text-slate-800 truncate">
                  {latestPracticeRecord.tags.length > 0 ? latestPracticeRecord.tags[0] : '練習記録'}
                </h4>
                <span className="text-[9px] text-slate-400 font-bold shrink-0">{formatRecordDate(latestPracticeRecord.date)}</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{latestPracticeRecord.menu || 'メニュー未記入'}</p>
            </div>
            <ChevronRight size={16} className="text-slate-300 shrink-0" />
          </div>
        ) : (
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between" onClick={onStartPractice}>
            <p className="text-xs text-slate-500 font-medium">まだ練習記録がありません</p>
            <button className="px-3 py-2 bg-emerald-500 text-white text-xs font-bold rounded-xl active:scale-95 transition-transform">記録をつける</button>
          </div>
        )}
      </section>

      {/* Learning - 最新の試合動画 */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-slate-800 tracking-tight">おすすめの学習</h3>
          <button onClick={() => onNavigateTab?.('academy')} className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">試合動画</button>
        </div>
        {latestMatchVideo ? (
          <button onClick={() => onNavigateTab?.('academy')} className="relative group overflow-hidden rounded-3xl shadow-sm w-full text-left active:scale-[0.99] transition-transform">
            <div className="h-48 relative bg-slate-900">
              {getYoutubeThumbUrl(latestMatchVideo.video_url) ? (
                <img src={getYoutubeThumbUrl(latestMatchVideo.video_url)!} alt={latestMatchVideo.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Play size={48} className="text-white/60" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/20 group-active:bg-black/30 flex items-center justify-center">
                <div className="w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-xl">
                  <Play size={28} fill="currentColor" className="ml-0.5" />
                </div>
              </div>
            </div>
            <div className="p-4 bg-white border-x border-b border-slate-100 rounded-b-3xl">
              <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">試合動画</span>
              <h4 className="text-sm font-bold text-slate-800 mt-1 line-clamp-2">{latestMatchVideo.title}</h4>
              <p className="text-[10px] text-slate-400 font-bold mt-1">
                {latestMatchVideo.match_date ? (() => {
                  const [y, m, d] = latestMatchVideo.match_date.split('-');
                  return y && m && d ? `${y}年${parseInt(m, 10)}月${parseInt(d, 10)}日` : '';
                })() : ''}
              </p>
            </div>
          </button>
        ) : (
          <button onClick={() => onNavigateTab?.('academy')} className="relative overflow-hidden rounded-3xl shadow-sm w-full text-left border border-slate-100 bg-white active:scale-[0.99] transition-transform">
            <div className="h-32 flex items-center justify-center bg-slate-50">
              <Play size={40} className="text-slate-300" />
            </div>
            <div className="p-4">
              <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">試合動画</span>
              <p className="text-sm font-bold text-slate-500 mt-1">まだ試合動画がありません</p>
              <p className="text-[10px] text-emerald-500 font-bold mt-2">試合動画を見る →</p>
            </div>
          </button>
        )}
      </section>

      {/* Clock In/Out */}
      <div className="grid grid-cols-2 gap-4 pb-4">
        <button onClick={handleClockIn} className="py-4 bg-emerald-500 text-white text-xs font-bold rounded-2xl flex flex-col items-center justify-center space-y-1 shadow-lg shadow-emerald-100 active:scale-95 transition-transform">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
          <span>練習開始 (CLOCK IN)</span>
          {clockIn && <span className="text-[9px] opacity-70">{clockIn}</span>}
        </button>
        <button onClick={handleClockOut} disabled={!clockIn || !!clockOut} className={`py-4 text-xs font-bold rounded-2xl flex flex-col items-center justify-center space-y-1 shadow-lg active:scale-95 transition-transform ${clockIn && !clockOut ? 'bg-slate-800 text-white shadow-slate-200' : 'bg-slate-300 text-slate-500 shadow-slate-100'}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          <span>練習終了 (CLOCK OUT)</span>
          {clockOut && <span className="text-[9px] opacity-70">{clockOut}</span>}
        </button>
      </div>

      {/* Notifications Panel */}
      {showNotifications && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={() => setShowNotifications(false)}>
          <div className="bg-white w-full max-w-sm h-full overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="text-lg font-bold text-slate-800">通知</h3>
              <div className="flex items-center space-x-2">
                <button onClick={markAllRead} className="text-[10px] text-emerald-500 font-bold">すべて既読</button>
                <button onClick={() => setShowNotifications(false)} className="p-1 text-slate-400"><X size={20} /></button>
              </div>
            </div>
            <div className="divide-y divide-slate-50">
              {notifications.map(n => (
                <div key={n.id} className={`p-5 flex items-start space-x-3 ${!n.read ? 'bg-emerald-50/50' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${n.type === 'important' ? 'bg-red-100 text-red-500' : n.type === 'event' ? 'bg-blue-100 text-blue-500' : 'bg-slate-100 text-slate-400'}`}><Bell size={14} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start"><h4 className={`text-sm font-bold ${!n.read ? 'text-slate-800' : 'text-slate-500'}`}>{n.title}</h4>{!n.read && <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1.5" />}</div>
                    <p className="text-xs text-slate-400 mt-0.5">{n.message}</p>
                    <p className="text-[9px] text-slate-300 mt-1">{n.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Activity Detail Modal */}
      {showDetail && nextSchedule && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={() => setShowDetail(false)}>
          <div className="bg-white rounded-t-3xl w-full max-w-md p-6 space-y-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-2" />
            <h3 className="text-xl font-black text-slate-800">{nextSchedule.event.time.split(' - ')[0]} 〜 {nextSchedule.event.title}</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-sm text-slate-600"><MapPin size={16} className="text-emerald-500" /><span>{nextSchedule.event.location}</span></div>
              <div className="flex items-center space-x-3 text-sm text-slate-600"><div className="w-4 h-4 rounded-full bg-yellow-400" /><span>晴れ 24℃</span></div>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4">
              <h4 className="text-xs font-bold text-slate-500 mb-2">練習内容</h4>
              <ul className="space-y-1 text-sm text-slate-700"><li>• ウォームアップ (15分)</li><li>• パス練習 (20分)</li><li>• ドリブル練習 (20分)</li><li>• ミニゲーム (30分)</li><li>• クールダウン (10分)</li></ul>
            </div>
            {eventAttendance && (eventAttendance.attend.length > 0 || eventAttendance.absent.length > 0 || eventAttendance.undecided.length > 0) && (
              <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-500">出欠一覧</h4>
                {eventAttendance.attend.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-emerald-600 mb-1">出席 ({eventAttendance.attend.length}人)</p>
                    <p className="text-sm text-slate-700">{eventAttendance.attend.map((a) => a.name).join('、')}</p>
                  </div>
                )}
                {eventAttendance.absent.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-red-600 mb-1">欠席 ({eventAttendance.absent.length}人)</p>
                    <p className="text-sm text-slate-700">{eventAttendance.absent.map((a) => a.name).join('、')}</p>
                  </div>
                )}
                {eventAttendance.undecided.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 mb-1">未定 ({eventAttendance.undecided.length}人)</p>
                    <p className="text-sm text-slate-700">{eventAttendance.undecided.map((a) => a.name).join('、')}</p>
                  </div>
                )}
              </div>
            )}
            <button onClick={() => openMap(nextSchedule.event.location)} className="w-full py-3 bg-emerald-500 text-white font-bold rounded-2xl active:scale-95 transition-transform flex items-center justify-center space-x-2"><MapPin size={18} /><span>マップで場所を見る</span></button>
            <button onClick={() => setShowDetail(false)} className="w-full py-2 text-slate-400 text-sm font-bold">閉じる</button>
          </div>
        </div>
      )}

      {/* Absence Modal */}
      {showAbsence && nextSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50" onClick={() => setShowAbsence(false)}>
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-800">欠席連絡</h3>
            <p className="text-xs text-slate-400">{nextSchedule.event.time.split(' - ')[0]} 〜 {nextSchedule.event.title} ({nextSchedule.label})</p>
            {absenceSent ? (
              <div className="text-center py-6"><div className="w-12 h-12 bg-emerald-100 rounded-full mx-auto flex items-center justify-center mb-3"><Check size={24} className="text-emerald-500" /></div><p className="text-sm font-bold text-slate-800">欠席連絡を送信しました</p></div>
            ) : (
              <>
                <textarea value={absenceReason} onChange={(e) => setAbsenceReason(e.target.value)} placeholder="欠席理由を入力してください" className="w-full min-h-[100px] px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
                <button onClick={sendAbsence} className="w-full py-3 bg-red-500 text-white rounded-xl font-bold active:scale-95 transition-transform">欠席を連絡する</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Video Player Modal */}
      {showVideoPlayer && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black" onClick={() => setShowVideoPlayer(false)}>
          <div className="flex items-center p-4" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowVideoPlayer(false)} className="p-2 text-white"><X size={24} /></button>
            <h3 className="text-white font-bold ml-2 text-sm">相手を抜く！最強のステップオーバー習得術</h3>
          </div>
          <div className="flex-1 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <div className="relative w-full aspect-video max-w-lg">
              <img src="https://picsum.photos/seed/dribble/600/400" alt="Video" className="w-full h-full object-cover rounded-lg" />
              <div className="absolute inset-0 flex items-center justify-center"><div className="w-16 h-16 bg-emerald-500/80 rounded-full flex items-center justify-center"><Play size={32} fill="white" className="text-white ml-1" /></div></div>
            </div>
          </div>
          <div className="p-6 bg-white rounded-t-3xl" onClick={(e) => e.stopPropagation()}>
            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Skill Academy</span>
            <h4 className="text-base font-bold text-slate-800 mt-1">相手を抜く！最強のステップオーバー習得術</h4>
            <button onClick={() => { setShowVideoPlayer(false); onNavigateTab?.('academy'); }} className="mt-4 w-full py-3 bg-emerald-500 text-white font-bold rounded-xl active:scale-95 transition-transform text-sm">試合動画を見る</button>
          </div>
        </div>
      )}
    </div>
  );
};

const UserIcon: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
);
