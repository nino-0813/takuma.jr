import React, { useState } from 'react';
import { Home, Calendar, Video, MessageCircle, User as UserIcon, Plus } from 'lucide-react';
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
  const [scheduleOpenAddEvent, setScheduleOpenAddEvent] = useState(false);
  const [scheduleAddEventOpen, setScheduleAddEventOpen] = useState(false);
  const [chatRoomOpen, setChatRoomOpen] = useState(false);
  const [mypageProfileModalOpen, setMypageProfileModalOpen] = useState(false);

  /** フル画面の追加・編集・モーダルなどでナビを隠すか */
  const hideBottomNav = (activeTab === 'chat' && chatRoomOpen) || (activeTab === 'schedule' && scheduleAddEventOpen) || (activeTab === 'mypage' && mypageProfileModalOpen);

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
      case 'schedule': return <SoccerSchedule triggerOpenAddEvent={scheduleOpenAddEvent} onTriggerOpenAddEvent={() => setScheduleOpenAddEvent(false)} onAddEventOpenChange={setScheduleAddEventOpen} />;
      case 'chat': return <SoccerChat onChatRoomOpenChange={setChatRoomOpen} />;
      case 'academy': return <SoccerAcademy />;
      case 'mypage': return <SoccerMyPage onLogout={handleLogout} onProfileModalOpenChange={setMypageProfileModalOpen} />;
      default: return null;
    }
  };

  if (showPracticeRecord) {
    return <SoccerPracticeRecord onClose={() => setShowPracticeRecord(false)} />;
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-50 relative overflow-hidden h-screen">
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden hide-scrollbar relative z-0"
        style={{
          paddingBottom: hideBottomNav ? 0 : 'max(6rem, calc(6rem + env(safe-area-inset-bottom)))',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {renderContent()}
      </div>

      {/* Floating Action Button - 予定を追加（追加画面を開いているときは非表示） */}
      {activeTab === 'schedule' && !scheduleAddEventOpen && (
        <button
          onClick={() => setScheduleOpenAddEvent(true)}
          className="absolute bottom-28 right-6 w-14 h-14 bg-emerald-500 rounded-full shadow-lg shadow-emerald-200 flex items-center justify-center text-white active:scale-95 transition-transform z-10"
          aria-label="予定を追加"
        >
          <Plus size={32} />
        </button>
      )}

      {/* Navigation - チャットルーム・予定追加などフル画面のときは非表示。safe-areaでスマホのホームインジケーターを避ける */}
      {!hideBottomNav && (
      <div
        className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/90 backdrop-blur-md border-t border-slate-100 shadow-[0_-2px_10px_rgba(0,0,0,0.06)] px-3 py-2 sm:px-4 sm:py-3 flex justify-between items-center z-50"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      >
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
      )}
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
