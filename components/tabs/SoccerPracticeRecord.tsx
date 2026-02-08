
import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Check, Star, X } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { practiceRecords, clockRecords } from '../../lib/database';

interface SoccerPracticeRecordProps {
  onClose: () => void;
}

export const SoccerPracticeRecord: React.FC<SoccerPracticeRecordProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [mood, setMood] = useState<string>('happy');
  const [menu, setMenu] = useState('');
  const [tags, setTags] = useState<string[]>(['パス練習', '体幹トレ', 'リフティング']);
  const [newTag, setNewTag] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [participationDates, setParticipationDates] = useState<string[]>([]);

  const loadParticipation = React.useCallback(() => {
    if (!user) return;
    Promise.all([
      clockRecords.listParticipationDates(user.id),
      practiceRecords.list(user.id),
    ]).then(([clock, records]) => {
      const fromClock = clock.data || [];
      const fromRecords = (records.data || []).map((r: { date: string }) => r.date);
      const set = new Set<string>([...fromClock, ...fromRecords]);
      const sorted = Array.from(set).sort((a, b) => b.localeCompare(a));
      setParticipationDates(sorted);
    });
  }, [user]);

  useEffect(() => {
    loadParticipation();
  }, [loadParticipation]);

  useEffect(() => {
    const onFocus = () => loadParticipation();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [loadParticipation]);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const { streak, stamps, goal, todayParticipated } = useMemo(() => {
    const set = new Set(participationDates);
    let streak = 0;
    const d = new Date();
    const start = new Date(d);
    if (!set.has(todayStr)) start.setDate(start.getDate() - 1);
    for (let i = 0; i < 365; i++) {
      const s = start.toISOString().split('T')[0];
      if (!set.has(s)) break;
      streak++;
      start.setDate(start.getDate() - 1);
    }
    const stamps = set.size;
    const tenDays: string[] = [];
    for (let i = 0; i < 10; i++) {
      const t = new Date();
      t.setDate(t.getDate() - i);
      tenDays.push(t.toISOString().split('T')[0]);
    }
    const goal = tenDays.filter((d) => set.has(d)).length;
    const todayParticipated = set.has(todayStr);
    return { streak, stamps, goal, todayParticipated };
  }, [participationDates, todayStr]);

  const formatDate = (d: Date) => {
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 (${days[d.getDay()]})`;
  };

  const changeDate = (delta: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + delta);
    setSelectedDate(newDate);
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
      setShowTagInput(false);
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await practiceRecords.create(user.id, {
      date: selectedDate.toISOString().split('T')[0],
      mood,
      menu,
      tags,
    });
    setSaving(false);
    if (error) {
      alert('保存に失敗しました: ' + error.message);
    } else {
      setSaved(true);
      setTimeout(() => onClose(), 1500);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 animate-slideUp h-screen overflow-y-auto hide-scrollbar">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button onClick={onClose} className="p-2 bg-white rounded-full shadow-sm border border-slate-100 active:scale-95 transition-transform">
            <ChevronLeft size={24} className="text-slate-800" />
          </button>
          <h2 className="text-lg font-black text-slate-800">今日の練習記録</h2>
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold border-2 border-white shadow-sm overflow-hidden">
            <img src="https://picsum.photos/seed/user/100/100" alt="Avatar" className="w-full h-full object-cover" />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">継続日数</p>
            <div className="flex items-baseline space-x-1">
              <span className="text-3xl font-black text-slate-800">{streak}</span>
              <span className="text-xs font-bold text-slate-800">日</span>
            </div>
            {todayParticipated && (
              <div className="flex items-center mt-2 text-emerald-500 space-x-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L10 10.586 13.586 7H12z" clipRule="evenodd" /></svg>
                <span className="text-[10px] font-black">+1日</span>
              </div>
            )}
            <div className="absolute -right-2 -bottom-2 text-slate-50 opacity-10"><Calendar size={64} /></div>
          </div>
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">獲得スタンプ</p>
            <div className="flex items-baseline space-x-1">
              <span className="text-3xl font-black text-slate-800">{stamps}</span>
              <span className="text-xs font-bold text-slate-800">個</span>
            </div>
            {todayParticipated && (
              <div className="flex items-center mt-2 text-blue-500 space-x-1">
                <span className="text-[10px] font-black">🔥 +1個</span>
              </div>
            )}
            <div className="absolute -right-2 -bottom-2 text-slate-50 opacity-10"><Star size={64} /></div>
          </div>
        </div>

        {/* Goal Section */}
        <section className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-emerald-700">{goal >= 10 ? '目標達成！' : `目標まであと${10 - goal}日！`}</h3>
            <span className="text-xs font-bold text-emerald-600">{goal} / 10</span>
          </div>
          <div className="flex justify-between">
            {Array.from({ length: 10 }, (_, i) => i + 1).map(i => (
              i <= goal ? (
                <div key={i} className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-sm shadow-emerald-200">
                  <Check size={14} strokeWidth={3} />
                </div>
              ) : (
                <div key={i} className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-400">
                  <Star size={12} fill="currentColor" />
                </div>
              )
            ))}
          </div>
        </section>

        {/* Form Fields */}
        <section className="space-y-6">
          <div>
            <div className="flex items-center space-x-2 mb-3 text-slate-800">
              <Calendar size={18} />
              <h3 className="text-sm font-black">日付と気分</h3>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-4">
              <div className="flex items-center justify-between">
                <button onClick={() => changeDate(-1)} className="p-1 hover:bg-slate-50 rounded-full"><ChevronLeft size={18} className="text-slate-400" /></button>
                <span className="text-sm font-bold text-slate-800">{formatDate(selectedDate)}</span>
                <button onClick={() => changeDate(1)} className="p-1 hover:bg-slate-50 rounded-full"><ChevronRight size={18} className="text-slate-400" /></button>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-3">
              <MoodButton emoji="🤩" label="さいこう" active={mood === 'perfect'} onClick={() => setMood('perfect')} />
              <MoodButton emoji="⚽" label="しゅうちゅう" active={mood === 'focused'} onClick={() => setMood('focused')} />
              <MoodButton emoji="😊" label="たのしい" active={mood === 'happy'} onClick={() => setMood('happy')} />
              <MoodButton emoji="🤨" label="ふつう" active={mood === 'normal'} onClick={() => setMood('normal')} />
              <MoodButton emoji="😴" label="つかれた" active={mood === 'tired'} onClick={() => setMood('tired')} />
            </div>
          </div>

          <div>
            <div className="flex items-center space-x-2 mb-3 text-slate-800">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              <h3 className="text-sm font-black">今日の練習メニュー</h3>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <textarea value={menu} onChange={(e) => setMenu(e.target.value)} placeholder="例：ドリブル、シュート練習、ミニゲーム" className="w-full min-h-[100px] text-sm text-slate-600 focus:outline-none resize-none" />
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-50">
                {tags.map(tag => (
                  <span key={tag} className="px-3 py-1 bg-emerald-50 text-[10px] font-bold text-emerald-600 rounded-full border border-emerald-100 flex items-center">
                    <Check size={10} className="mr-1" /> {tag}
                    <button onClick={() => removeTag(tag)} className="ml-1.5 text-emerald-400 hover:text-red-500"><X size={10} /></button>
                  </span>
                ))}
                {showTagInput ? (
                  <div className="flex items-center space-x-1">
                    <input type="text" value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTag()} placeholder="タグ名" autoFocus className="px-2 py-1 text-[10px] border border-slate-200 rounded-full w-20 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                    <button onClick={addTag} className="text-emerald-500"><Check size={14} /></button>
                    <button onClick={() => { setShowTagInput(false); setNewTag(''); }} className="text-slate-400"><X size={14} /></button>
                  </div>
                ) : (
                  <button onClick={() => setShowTagInput(true)} className="px-3 py-1 bg-slate-50 text-[10px] font-bold text-slate-400 rounded-full border border-slate-100 flex items-center">
                    <PlusIcon size={12} className="mr-1" /> 追加項目
                  </button>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saved || saving}
            className={`w-full py-5 font-black text-sm rounded-3xl shadow-xl flex items-center justify-center space-x-3 active:scale-95 transition-all mt-4 ${
              saved ? 'bg-emerald-100 text-emerald-700 shadow-emerald-50' : 'bg-emerald-500 text-white shadow-emerald-200'
            } disabled:opacity-70`}
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{saved ? '保存しました！ ✓' : '練習記録を保存する'}</span>
                {!saved && <Check size={20} strokeWidth={3} />}
              </>
            )}
          </button>
        </section>
      </div>
    </div>
  );
};

const MoodButton: React.FC<{ emoji: string; label: string; active: boolean; onClick: () => void }> = ({ emoji, label, active, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center p-3 rounded-2xl transition-all border-2 ${active ? 'bg-emerald-50 border-emerald-500 shadow-sm' : 'bg-white border-transparent text-slate-400 opacity-60'}`}>
    <span className="text-2xl mb-1">{emoji}</span>
    <span className="text-[8px] font-black whitespace-nowrap">{label}</span>
  </button>
);

const PlusIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
);
