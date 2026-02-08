
import React, { useState, useEffect, useMemo } from 'react';
import { ChevronRight, Award, Calendar, Star, Clock, LogOut, Settings } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { practiceRecords as practiceRecordsDb, profiles, clockRecords, attendance as attendanceDb, scheduleEvents as scheduleEventsDb } from '../../lib/database';

interface PracticeRecord {
  id: string;
  date: string;
  mood: string;
  menu: string;
  tags: string[];
  created_at: string;
}

interface SoccerMyPageProps {
  onLogout: () => void;
}

const MOOD_LABELS: Record<string, string> = {
  perfect: '🤩 さいこう',
  focused: '⚽ しゅうちゅう',
  happy: '😊 たのしい',
  normal: '🤨 ふつう',
  tired: '😴 つかれた',
};

export const SoccerMyPage: React.FC<SoccerMyPageProps> = ({ onLogout }) => {
  const { user } = useAuth();
  const [records, setRecords] = useState<PracticeRecord[]>([]);
  const [showRecordDetail, setShowRecordDetail] = useState<PracticeRecord | null>(null);
  const [profileName, setProfileName] = useState('はると');
  const [profileTeam, setProfileTeam] = useState('ジュニアA');
  const [profilePosition, setProfilePosition] = useState('MF');
  const [profileNumber, setProfileNumber] = useState(10);
  const [profileCourse, setProfileCourse] = useState('ジュニアコース');
  const [loading, setLoading] = useState(true);
  const [participationDates, setParticipationDates] = useState<string[]>([]);
  const [showAttendanceHistory, setShowAttendanceHistory] = useState(false);
  const [attendanceHistory, setAttendanceHistory] = useState<{ event_date: string; title: string; time: string; status: 'attend' | 'absent' | 'undecided' }[]>([]);
  const [attendanceHistoryLoading, setAttendanceHistoryLoading] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', team: 'ジュニアA', position: 'MF', number: 10, course: 'ジュニアコース' });
  const [profileSaving, setProfileSaving] = useState(false);

  useEffect(() => {
    if (user) {
      profiles.get(user.id).then(({ data }) => {
        if (data) {
          const p = data as { name?: string; team?: string; position?: string; number?: number; course?: string };
          if (p.name) setProfileName(p.name);
          if (p.team) setProfileTeam(p.team);
          if (p.position) setProfilePosition(p.position);
          if (p.number != null) setProfileNumber(p.number);
          if (p.course) setProfileCourse(p.course);
        }
      });
      practiceRecordsDb.list(user.id).then(({ data }) => {
        setRecords(data as PracticeRecord[]);
        setLoading(false);
      });
      Promise.all([
        clockRecords.listParticipationDates(user.id),
        practiceRecordsDb.list(user.id),
      ]).then(([clock, recs]) => {
        const fromClock = clock.data || [];
        const fromRecords = (recs.data || []).map((r: { date: string }) => r.date);
        const set = new Set<string>([...fromClock, ...fromRecords]);
        setParticipationDates(Array.from(set).sort((a, b) => b.localeCompare(a)));
      });
    }
  }, [user]);

  const totalPractices = records.length;
  const { streak, badges } = useMemo(() => {
    const set = new Set(participationDates);
    const now = new Date();
    const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    let streak = 0;
    const start = new Date();
    if (!set.has(todayStr)) start.setDate(start.getDate() - 1);
    for (let i = 0; i < 365; i++) {
      const s = start.getFullYear() + '-' + String(start.getMonth() + 1).padStart(2, '0') + '-' + String(start.getDate()).padStart(2, '0');
      if (!set.has(s)) break;
      streak++;
      start.setDate(start.getDate() - 1);
    }
    return { streak, badges: set.size };
  }, [participationDates]);

  return (
    <div className="p-6 space-y-6 animate-fadeIn pb-8">
      {/* Profile Header */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 overflow-hidden border-2 border-emerald-300 shadow-md">
            <img src="https://picsum.photos/seed/user/100/100" alt="Avatar" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-black text-slate-800">{profileName || user?.email?.split('@')[0] || 'ユーザー'}</h2>
            <p className="text-xs text-slate-400 font-bold">{profileTeam} • 背番号 {profileNumber}</p>
            <div className="flex items-center space-x-2 mt-1">
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[9px] font-bold rounded-full">{profilePosition}</span>
              <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-bold rounded-full">{profileCourse}</span>
            </div>
          </div>
          <button onClick={() => { setProfileForm({ name: profileName, team: profileTeam, position: profilePosition, number: profileNumber, course: profileCourse }); setShowProfileSettings(true); }} className="p-2 bg-slate-50 rounded-full text-slate-400">
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 text-center">
          <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-2">
            <Calendar size={16} className="text-emerald-500" />
          </div>
          <p className="text-xl font-black text-slate-800">{streak}</p>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">継続日数</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 text-center">
          <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center mx-auto mb-2">
            <Star size={16} className="text-orange-500" />
          </div>
          <p className="text-xl font-black text-slate-800">{totalPractices}</p>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">練習記録</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 text-center">
          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-2">
            <Award size={16} className="text-blue-500" />
          </div>
          <p className="text-xl font-black text-slate-800">{badges}</p>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">バッジ</p>
        </div>
      </div>

      {/* Practice History */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-black text-slate-800">練習記録の履歴</h3>
          <span className="text-[10px] text-slate-400 font-bold">{totalPractices}件</span>
        </div>

        {records.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 text-center">
            <div className="text-3xl mb-2">📝</div>
            <p className="text-sm font-bold text-slate-400">まだ練習記録がありません</p>
            <p className="text-xs text-slate-300 mt-1">ホーム画面から練習記録を始めましょう</p>
          </div>
        ) : (
          <div className="space-y-3">
            {records.slice().reverse().map(record => {
              const date = new Date(record.date);
              return (
                <button
                  key={record.id}
                  onClick={() => setShowRecordDetail(record)}
                  className="w-full bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4 text-left active:bg-slate-50"
                >
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-lg">
                    {record.mood === 'perfect' ? '🤩' : record.mood === 'focused' ? '⚽' : record.mood === 'happy' ? '😊' : record.mood === 'normal' ? '🤨' : '😴'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{record.tags.join(', ') || '練習記録'}</p>
                    <p className="text-[10px] text-slate-400">{date.getMonth() + 1}/{date.getDate()} • {MOOD_LABELS[record.mood] || record.mood}</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-300" />
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Menu Items */}
      <section className="space-y-2">
        <MenuItem
          icon={<Clock size={18} />}
          label="出欠履歴"
          onClick={async () => {
            if (!user) return;
            setShowAttendanceHistory(true);
            setAttendanceHistoryLoading(true);
            const { data: list } = await attendanceDb.list(user.id);
            const rows = (list || []) as { event_id: string; status: string }[];
            if (rows.length === 0) {
              setAttendanceHistory([]);
              setAttendanceHistoryLoading(false);
              return;
            }
            const eventIds = [...new Set(rows.map((r) => r.event_id))];
            const { data: events } = await scheduleEventsDb.listByIds(eventIds);
            const eventMap = (events || []).reduce<Record<string, { event_date: string; title: string; time: string }>>((acc, e: { id: string; event_date: string; title: string; time: string }) => {
              acc[e.id] = { event_date: e.event_date, title: e.title, time: e.time || '' };
              return acc;
            }, {});
            const merged = rows
              .map((r) => {
                const ev = eventMap[r.event_id];
                if (!ev) return null;
                return { ...ev, status: r.status as 'attend' | 'absent' | 'undecided' };
              })
              .filter(Boolean) as { event_date: string; title: string; time: string; status: 'attend' | 'absent' | 'undecided' }[];
            merged.sort((a, b) => b.event_date.localeCompare(a.event_date));
            setAttendanceHistory(merged);
            setAttendanceHistoryLoading(false);
          }}
        />
        <button
          onClick={onLogout}
          className="w-full flex items-center space-x-3 p-4 bg-white rounded-2xl shadow-sm border border-red-100 text-red-500 active:bg-red-50 transition-colors"
        >
          <LogOut size={18} />
          <span className="text-sm font-bold">ログアウト</span>
        </button>
      </section>

      {/* プロフィール設定モーダル */}
      {showProfileSettings && user && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={() => setShowProfileSettings(false)}>
          <div className="bg-white rounded-t-3xl w-full max-w-md max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mt-2 mb-4" />
            <h3 className="text-lg font-bold text-slate-800 px-6 pb-4">プロフィール設定</h3>
            <div className="px-6 space-y-4 pb-6">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">名前</label>
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="名前"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">チーム</label>
                <input
                  type="text"
                  value={profileForm.team}
                  onChange={(e) => setProfileForm((f) => ({ ...f, team: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="ジュニアA"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">ポジション</label>
                <select
                  value={profileForm.position}
                  onChange={(e) => setProfileForm((f) => ({ ...f, position: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="GK">GK</option>
                  <option value="DF">DF</option>
                  <option value="MF">MF</option>
                  <option value="FW">FW</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">背番号</label>
                <input
                  type="number"
                  min={0}
                  max={99}
                  value={profileForm.number}
                  onChange={(e) => setProfileForm((f) => ({ ...f, number: parseInt(e.target.value, 10) || 0 }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">コース</label>
                <input
                  type="text"
                  value={profileForm.course}
                  onChange={(e) => setProfileForm((f) => ({ ...f, course: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="ジュニアコース"
                />
              </div>
              <button
                onClick={async () => {
                  setProfileSaving(true);
                  const { error } = await profiles.update(user.id, {
                    name: profileForm.name || undefined,
                    team: profileForm.team || undefined,
                    position: profileForm.position || undefined,
                    number: profileForm.number,
                    course: profileForm.course || undefined,
                  });
                  setProfileSaving(false);
                  if (error) {
                    alert('保存に失敗しました: ' + error.message);
                  } else {
                    setProfileName(profileForm.name || profileName);
                    setProfileTeam(profileForm.team);
                    setProfilePosition(profileForm.position);
                    setProfileNumber(profileForm.number);
                    setProfileCourse(profileForm.course);
                    setShowProfileSettings(false);
                  }
                }}
                disabled={profileSaving}
                className="w-full py-4 bg-emerald-500 text-white font-bold rounded-2xl active:scale-[0.99] disabled:opacity-70"
              >
                {profileSaving ? '保存中...' : '保存する'}
              </button>
              <button onClick={() => setShowProfileSettings(false)} className="w-full py-3 text-slate-400 font-bold text-sm">
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Detail Modal */}
      {showRecordDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50" onClick={() => setShowRecordDetail(null)}>
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-800">練習記録の詳細</h3>
            <div className="text-center py-2">
              <span className="text-4xl">{showRecordDetail.mood === 'perfect' ? '🤩' : showRecordDetail.mood === 'focused' ? '⚽' : showRecordDetail.mood === 'happy' ? '😊' : showRecordDetail.mood === 'normal' ? '🤨' : '😴'}</span>
              <p className="text-sm font-bold text-slate-600 mt-1">{MOOD_LABELS[showRecordDetail.mood] || showRecordDetail.mood}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[10px] font-bold text-slate-400 mb-1">日付</p>
              <p className="text-sm text-slate-700">{new Date(showRecordDetail.date).toLocaleDateString('ja-JP')}</p>
            </div>
            {showRecordDetail.menu && (
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-[10px] font-bold text-slate-400 mb-1">練習メニュー</p>
                <p className="text-sm text-slate-700">{showRecordDetail.menu}</p>
              </div>
            )}
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[10px] font-bold text-slate-400 mb-1">タグ</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {showRecordDetail.tags.map(tag => (
                  <span key={tag} className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-full">{tag}</span>
                ))}
              </div>
            </div>
            <button onClick={() => setShowRecordDetail(null)} className="w-full py-3 text-slate-400 font-bold text-sm">閉じる</button>
          </div>
        </div>
      )}

      {/* 出欠履歴モーダル */}
      {showAttendanceHistory && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={() => setShowAttendanceHistory(false)}>
          <div className="bg-white rounded-t-3xl w-full max-w-md max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mt-2 mb-4" />
            <h3 className="text-lg font-bold text-slate-800 px-6 pb-3">出欠履歴</h3>
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              {attendanceHistoryLoading ? (
                <div className="py-8 flex justify-center">
                  <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : attendanceHistory.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">出欠回答の履歴がありません</p>
              ) : (
                <ul className="space-y-2">
                  {attendanceHistory.map((item, i) => (
                    <li key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-800 truncate">{item.title}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {item.event_date.replace(/-/g, '/')}
                          {item.time ? ` ${item.time}` : ''}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 ml-2 px-2 py-0.5 text-[10px] font-bold rounded-lg ${
                          item.status === 'attend' ? 'bg-emerald-100 text-emerald-700' : item.status === 'absent' ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {item.status === 'attend' ? '出席' : item.status === 'absent' ? '欠席' : '未定'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="p-4 border-t border-slate-100">
              <button onClick={() => setShowAttendanceHistory(false)} className="w-full py-3 text-slate-400 font-bold text-sm">
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MenuItem: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void }> = ({ icon, label, onClick }) => (
  <button onClick={onClick} className="w-full flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-slate-100 active:bg-slate-50 transition-colors">
    <div className="flex items-center space-x-3 text-slate-600">
      {icon}
      <span className="text-sm font-bold">{label}</span>
    </div>
    <ChevronRight size={16} className="text-slate-300" />
  </button>
);
