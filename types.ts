
export type Screen = 'onboarding' | 'login' | 'main';
export type Tab = 'home' | 'schedule' | 'chat' | 'academy' | 'mypage';

export interface Activity {
  id: string;
  title: string;
  time: string;
  location: string;
  type: 'practice' | 'match' | 'event';
  isImportant?: boolean;
  date?: string;
  description?: string;
}

export interface ChatMessage {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  unreadCount?: number;
  avatar: string;
  category?: string;
}

export interface VideoLesson {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  category: string;
  coach: string;
  date: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  description?: string;
}

export interface PracticeRecord {
  id: string;
  date: string;
  mood: string;
  menu: string;
  tags: string[];
  savedAt: string;
}

export interface ClockRecord {
  date: string;
  clockIn?: string;
  clockOut?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'info' | 'important' | 'event';
}
