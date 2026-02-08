import React, { useState, useEffect } from 'react';
import { Home, Calendar, Video, MessageCircle, User as UserIcon, Plus, Smartphone, X } from 'lucide-react';
import { Tab } from '../types';
import { SoccerHome } from './tabs/SoccerHome';
import { SoccerSchedule } from './tabs/SoccerSchedule';
import { SoccerChat } from './tabs/SoccerChat';
import { SoccerAcademy } from './tabs/SoccerAcademy';
import { SoccerPracticeRecord } from './tabs/SoccerPracticeRecord';
import { SoccerMyPage } from './tabs/SoccerMyPage';

interface MainLayoutProps {
  onLogout?: () => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [showPracticeRecord, setShowPracticeRecord] = useState(false);
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [mobileUrl, setMobileUrl] = useState('');
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [scheduleOpenAddEvent, setScheduleOpenAddEvent] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setMobileUrl(window.location.origin + '/');
    }
  }, []);

  const handleNavigateTab = (tab: Tab) => {
    setActiveTab(tab);
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      window.location.reload();
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <SoccerHome
            onStartPractice={() => setShowPracticeRecord(true)}
            onNavigateTab={handleNavigateTab}
          />
        );
      case 'schedule': return <SoccerSchedule triggerOpenAddEvent={scheduleOpenAddEvent} onTriggerOpenAddEvent={() => setScheduleOpenAddEvent(false)} />;
      case 'chat': return <SoccerChat />;
      case 'academy': return <SoccerAcademy />;
      case 'mypage': return <SoccerMyPage onLogout={handleLogout} />;
      default: return null;
    }
  };

  if (showPracticeRecord) {
    return <SoccerPracticeRecord onClose={() => setShowPracticeRecord(false)} />;
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-50 relative overflow-hidden h-screen">
      {/* スマホで確認ボタン - 常に最前面で表示 */}
      <button
        type="button"
        onClick={() => setShowMobileModal(true)}
        className="fixed top-4 right-4 z-[100] p-2.5 rounded-full bg-white/90 backdrop-blur border border-slate-200 shadow-sm text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-colors"
        title="スマホで確認"
        aria-label="スマホで確認"
      >
        <Smartphone size={22} />
      </button>

      <div className="flex-1 overflow-y-auto pb-24 hide-scrollbar relative z-0">
        {renderContent()}
      </div>

      {/* スマホで確認モーダル - 下部ナビより前面に表示 */}
      {showMobileModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50" onClick={() => setShowMobileModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 relative" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setShowMobileModal(false)} className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600" aria-label="閉じる">
              <X size={20} />
            </button>
            <div className="flex items-center gap-2 mb-4">
              <Smartphone className="text-emerald-500" size={24} />
              <h3 className="text-lg font-bold text-slate-800">スマホで確認</h3>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              同じWi-Fiに接続したスマホで、下のURLを開くかQRコードをスキャンしてください。PCでlocalhostの場合は、ターミナルに表示されている「Network」のURLを入力してください。
            </p>
            <input
              type="url"
              value={mobileUrl}
              onChange={(e) => setMobileUrl(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
              placeholder="http://192.168.x.x:3005/"
            />
            <div className="flex justify-center mb-2">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(mobileUrl || 'https://example.com')}`}
                alt="スマホで開く用QRコード"
                className="w-48 h-48 rounded-xl border border-slate-100"
              />
            </div>
            <p className="text-xs text-slate-400 text-center">QRコードをスマホのカメラでスキャン</p>
          </div>
        </div>
      )}

      {/* Floating Action Button - 予定を追加 */}
      {activeTab === 'schedule' && (
        <button
          onClick={() => setScheduleOpenAddEvent(true)}
          className="absolute bottom-28 right-6 w-14 h-14 bg-emerald-500 rounded-full shadow-lg shadow-emerald-200 flex items-center justify-center text-white active:scale-95 transition-transform z-10"
          aria-label="予定を追加"
        >
          <Plus size={32} />
        </button>
      )}

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/80 backdrop-blur-md border-t border-slate-100 px-4 py-3 flex justify-between items-center z-50">
        <NavItem
          icon={<Home size={22} />}
          label="ホーム"
          active={activeTab === 'home'}
          onClick={() => setActiveTab('home')}
        />
        <NavItem
          icon={<Calendar size={22} />}
          label="スケジュール"
          active={activeTab === 'schedule'}
          onClick={() => setActiveTab('schedule')}
        />
        <NavItem
          icon={<MessageCircle size={22} />}
          label="チャット"
          active={activeTab === 'chat'}
          onClick={() => setActiveTab('chat')}
        />
        <NavItem
          icon={<Video size={22} />}
          label="試合動画"
          active={activeTab === 'academy'}
          onClick={() => setActiveTab('academy')}
        />
        <NavItem
          icon={<UserIcon size={22} />}
          label="マイページ"
          active={activeTab === 'mypage'}
          onClick={() => setActiveTab('mypage')}
        />
      </div>
    </div>
  );
};

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center space-y-1 transition-colors ${active ? 'text-emerald-500' : 'text-slate-400'}`}
  >
    <div className={`p-1 rounded-lg ${active ? 'bg-emerald-50' : 'bg-transparent'}`}>
      {icon}
    </div>
    <span className="text-[10px] font-bold tracking-tight">{label}</span>
  </button>
);
