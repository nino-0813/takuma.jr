
import React, { useState } from 'react';
import { Onboarding } from './components/Onboarding';
import { Login } from './components/Login';
import { MainLayout } from './components/MainLayout';
import { useAuth } from './lib/AuthContext';

type LocalScreen = 'onboarding' | 'login';

const App: React.FC = () => {
  const { user, loading, signOut } = useAuth();
  const [localScreen, setLocalScreen] = useState<LocalScreen>('onboarding');

  if (loading) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-white shadow-xl flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-400 font-bold">読み込み中...</p>
        </div>
      </div>
    );
  }

  // If user is logged in via Supabase, show main layout
  if (user) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-white shadow-xl relative overflow-hidden flex flex-col">
        <MainLayout onLogout={async () => { await signOut(); setLocalScreen('onboarding'); }} />
      </div>
    );
  }

  // Not logged in: show onboarding or login
  return (
    <div className="max-w-md mx-auto min-h-screen bg-white shadow-xl relative overflow-hidden flex flex-col">
      {localScreen === 'onboarding' && (
        <Onboarding
          onFinish={() => setLocalScreen('login')}
          onGoToLogin={() => setLocalScreen('login')}
        />
      )}
      {localScreen === 'login' && (
        <Login
          onLogin={() => {/* Auth state change will handle navigation */}}
          onGoToRegister={() => {}}
        />
      )}
    </div>
  );
};

export default App;
