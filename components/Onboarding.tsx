
import React, { useState } from 'react';

interface OnboardingProps {
  onFinish: () => void;
  onGoToLogin: () => void;
}

const SLIDES = [
  {
    icon: '⚽',
    title: 'チームをひとつに',
    subtitle: 'すべての連絡が、ここに',
    description: 'スケジュール共有、出欠管理、チャット。\nチーム運営に必要なすべてを一元管理。',
    features: [
      { emoji: '📅', label: 'スケジュール' },
      { emoji: '💬', label: 'チャット' },
      { emoji: '✅', label: '出欠管理' },
    ],
    bg: 'from-emerald-500 to-teal-600',
    image: 'https://picsum.photos/seed/soccer-team/400/300',
  },
  {
    icon: '📝',
    title: '成長を記録しよう',
    subtitle: '毎日の積み重ねが、未来のスターを創る',
    description: '練習メニュー、気分、振り返り。\n日々の記録でレベルアップを実感しよう。',
    features: [
      { emoji: '🔥', label: '練習記録' },
      { emoji: '📊', label: '成長グラフ' },
      { emoji: '🏅', label: 'スタンプ' },
    ],
    bg: 'from-blue-500 to-indigo-600',
    image: 'https://picsum.photos/seed/soccer-kid/400/300',
  },
  {
    icon: '🎓',
    title: 'スキルを磨こう',
    subtitle: 'プロの技を、動画で学ぶ',
    description: 'ドリブル、シュート、パス。\nコーチ監修の動画レッスンでレベルアップ。',
    features: [
      { emoji: '🎬', label: '動画レッスン' },
      { emoji: '⚡', label: 'スキル別' },
      { emoji: '🏆', label: 'チャレンジ' },
    ],
    bg: 'from-orange-500 to-red-500',
    image: 'https://picsum.photos/seed/soccer-dribble/400/300',
  },
];

export const Onboarding: React.FC<OnboardingProps> = ({ onFinish, onGoToLogin }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slide = SLIDES[currentSlide];
  const isLast = currentSlide === SLIDES.length - 1;

  const next = () => {
    if (isLast) {
      onFinish();
    } else {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const goToSlide = (i: number) => setCurrentSlide(i);

  return (
    <div className="flex-1 flex flex-col bg-white h-screen relative overflow-hidden">
      {/* Hero Image Area */}
      <div className={`relative w-full h-[45%] bg-gradient-to-br ${slide.bg} overflow-hidden transition-all duration-500`}>
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-8 left-6 w-24 h-24 border-2 border-white rounded-full" />
          <div className="absolute top-20 right-10 w-16 h-16 border-2 border-white rounded-full" />
          <div className="absolute bottom-10 left-16 w-12 h-12 border-2 border-white rounded-full" />
          <div className="absolute bottom-20 right-6 w-20 h-20 border-2 border-white rounded-full" />
          {/* Soccer field lines */}
          <div className="absolute top-1/2 left-0 right-0 h-px bg-white" />
          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border-2 border-white rounded-full" />
        </div>

        {/* Image */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <div className="w-48 h-48 rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white/30 transform rotate-3 transition-transform duration-500">
              <img src={slide.image} alt="" className="w-full h-full object-cover" />
            </div>
            {/* Floating badge */}
            <div className="absolute -top-3 -right-3 w-14 h-14 bg-white rounded-2xl shadow-lg flex items-center justify-center text-2xl transform -rotate-6">
              {slide.icon}
            </div>
          </div>
        </div>

        {/* Feature pills floating */}
        <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-3">
          {slide.features.map((f, i) => (
            <div
              key={i}
              className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center space-x-1.5 border border-white/30"
            >
              <span className="text-sm">{f.emoji}</span>
              <span className="text-[10px] font-bold text-white tracking-tight">{f.label}</span>
            </div>
          ))}
        </div>

        {/* Skip button */}
        {!isLast && (
          <button
            onClick={onFinish}
            className="absolute top-12 right-6 text-white/70 text-xs font-bold px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-colors"
          >
            スキップ
          </button>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col items-center justify-between p-8 pt-8">
        {/* Brand */}
        <div className="text-center">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">TAKUMA</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.25em] mt-1">SOCCER CLUB APP</p>
        </div>

        {/* Text */}
        <div className="text-center space-y-3">
          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">{slide.subtitle}</p>
          <h1 className="text-3xl font-black text-slate-800 leading-tight tracking-tight">
            {slide.title}
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-line">
            {slide.description}
          </p>
        </div>

        {/* Dots */}
        <div className="flex space-x-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => goToSlide(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === currentSlide ? 'w-6 bg-emerald-500' : 'w-2 bg-slate-200 hover:bg-slate-300'
              }`}
            />
          ))}
        </div>

        {/* Buttons */}
        <div className="w-full space-y-4">
          <button
            onClick={next}
            className={`w-full py-4 rounded-2xl font-bold shadow-lg flex items-center justify-center space-x-2 active:scale-95 transition-all ${
              isLast
                ? 'bg-emerald-500 text-white shadow-emerald-200'
                : 'bg-slate-800 text-white shadow-slate-200'
            }`}
          >
            <span>{isLast ? 'はじめる' : '次へ'}</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
          <p className="text-xs text-gray-400 text-center">
            アカウントをお持ちですか？{' '}
            <button onClick={onGoToLogin} className="text-emerald-500 font-bold">
              ログイン
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
