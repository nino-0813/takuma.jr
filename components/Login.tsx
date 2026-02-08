
import React, { useState } from 'react';
import { EyeOff, Eye, X } from 'lucide-react';
import { auth } from '../lib/database';

interface LoginProps {
  onLogin: () => void;
  onGoToRegister: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [showModal, setShowModal] = useState<'forgot' | 'register' | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Registration form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regError, setRegError] = useState('');

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const validate = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email.trim()) newErrors.email = 'メールアドレスを入力してください';
    if (!password.trim()) newErrors.password = 'パスワードを入力してください';
    else if (password.length < 6) newErrors.password = 'パスワードは6文字以上で入力してください';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setIsLoading(true);
    setErrors({});
    const { error } = await auth.signIn(email, password);
    setIsLoading(false);
    if (error) {
      setErrors({ general: 'メールアドレスまたはパスワードが正しくありません' });
    } else {
      onLogin();
    }
  };

  const handleRegister = async () => {
    if (!regName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setRegError('すべての項目を入力してください');
      return;
    }
    if (regPassword.length < 6) {
      setRegError('パスワードは6文字以上で入力してください');
      return;
    }
    setRegError('');
    setIsLoading(true);
    const { error } = await auth.signUp(regEmail, regPassword, regName);
    setIsLoading(false);
    if (error) {
      setRegError(error.message);
    } else {
      setShowModal(null);
      onLogin();
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) return;
    await auth.resetPassword(forgotEmail);
    setForgotSent(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <div className="flex-1 flex flex-col p-8 bg-white h-screen">
      <div className="flex flex-col items-center justify-center mt-12 mb-12">
        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
          <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
              <path d="M12,2C6.47,2,2,6.47,2,12s4.47,10,10,10s10-4.47,10-10S17.53,2,12,2z M12,20c-4.41,0-8-3.59-8-8s3.59-8,8-8s8,3.59,8,8 S16.41,20,12,20z M7,13l3,3l7-7l-1.41-1.41L10,13.17L8.41,11.59L7,13z" />
            </svg>
          </div>
        </div>
        <h2 className="text-2xl font-black text-gray-800 tracking-tighter">SOCCER CLUB APP</h2>
        <p className="text-xs text-gray-400 mt-1 uppercase font-bold tracking-widest">Future Star Management Tool</p>
      </div>

      <div className="space-y-6">
        {errors.general && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-xs text-red-600 font-bold">{errors.general}</p>
          </div>
        )}

        <div>
          <label className="text-xs font-bold text-gray-500 ml-1 mb-2 block uppercase tracking-wide">メールアドレス</label>
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setErrors(prev => ({ ...prev, email: undefined, general: undefined })); }}
            onKeyDown={handleKeyDown}
            placeholder="example@soccer.com"
            className={`w-full pl-4 pr-4 py-3 bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-sm ${errors.email ? 'border-red-300 bg-red-50' : 'border-slate-100'}`}
          />
          {errors.email && <p className="text-xs text-red-500 mt-1 ml-1">{errors.email}</p>}
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 ml-1 mb-2 block uppercase tracking-wide">パスワード</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setErrors(prev => ({ ...prev, password: undefined, general: undefined })); }}
              onKeyDown={handleKeyDown}
              placeholder="••••••••"
              className={`w-full pl-4 pr-12 py-3 bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-sm ${errors.password ? 'border-red-300 bg-red-50' : 'border-slate-100'}`}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
              {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-red-500 mt-1 ml-1">{errors.password}</p>}
        </div>

        <button
          onClick={handleLogin}
          disabled={isLoading}
          className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold shadow-lg shadow-emerald-200 flex items-center justify-center space-x-2 active:scale-95 transition-transform disabled:opacity-50"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <span>ログイン</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </>
          )}
        </button>

        <div className="text-center">
          <button onClick={() => setShowModal('forgot')} className="text-xs text-gray-400 font-medium hover:text-emerald-500">パスワードを忘れましたか？</button>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex-1 h-px bg-slate-100"></div>
          <span className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">または</span>
          <div className="flex-1 h-px bg-slate-100"></div>
        </div>

        <button
          onClick={async () => {
            await auth.signInWithOAuth('google');
          }}
          className="w-full py-3 border border-slate-200 rounded-xl flex items-center justify-center space-x-2 text-sm font-semibold text-gray-600 hover:bg-slate-50 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          <span>Googleでログイン</span>
        </button>

        <div className="text-center pt-1">
          <p className="text-xs text-gray-400">アカウントをお持ちでないですか？ <button onClick={() => setShowModal('register')} className="text-emerald-500 font-bold">新規登録</button></p>
        </div>
      </div>

      {/* Modals */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50" onClick={() => { setShowModal(null); setForgotSent(false); }}>
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm p-6 relative" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => { setShowModal(null); setForgotSent(false); }} className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>

            {showModal === 'forgot' && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800">パスワードリセット</h3>
                {forgotSent ? (
                  <div className="text-center py-4">
                    <div className="text-3xl mb-2">📧</div>
                    <p className="text-sm font-bold text-slate-800">メールを送信しました</p>
                    <p className="text-xs text-slate-400 mt-1">届いたメールのリンクからパスワードをリセットしてください</p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-slate-500">登録されたメールアドレスを入力してください。</p>
                    <input type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder="example@soccer.com" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                    <button onClick={handleForgotPassword} className="w-full py-3 bg-emerald-500 text-white rounded-xl font-bold active:scale-95 transition-transform">リセットリンクを送信</button>
                  </>
                )}
              </div>
            )}

            {showModal === 'register' && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800">新規登録</h3>
                <p className="text-sm text-slate-500">名前・メールアドレス・パスワードを入力してアカウントを作成。作成後すぐにログインできます。</p>
                {regError && <p className="text-xs text-red-500 bg-red-50 p-2 rounded-lg">{regError}</p>}
                <input value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="お名前" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                <input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} placeholder="メールアドレス" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                <input type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} placeholder="パスワード（6文字以上）" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                <button onClick={handleRegister} disabled={isLoading} className="w-full py-3 bg-emerald-500 text-white rounded-xl font-bold active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2">
                  {isLoading && <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {isLoading ? '作成中...' : 'アカウントを作成'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
