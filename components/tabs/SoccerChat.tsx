import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, MessageCircle, ChevronLeft, Send, X, Trash2, LayoutGrid, GraduationCap, Users, Settings, FileText } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { profiles, chatRooms, chatMessages, uploadChatFile, deleteChatFileByUrl } from '../../lib/database';
import { imageFileToWebp } from '../../lib/imageToWebp';

interface ChatRoom {
  id: string;
  name: string;
  message: string;
  time: string;
  unread?: number;
  avatar: string;
  category: string;
}

interface Message {
  id: string;
  sender: string;
  content: string;
  time: string;
  isMe: boolean;
  readCount?: number;
}

/** 添付メッセージの content が JSON の場合の型 */
interface ChatAttachment {
  t: 'img' | 'file';
  u: string;
  n?: string;
}

function parseAttachment(content: string): ChatAttachment | null {
  if (!content || !content.trim().startsWith('{')) return null;
  try {
    const o = JSON.parse(content) as unknown;
    if (o && typeof o === 'object' && 'u' in o && typeof (o as ChatAttachment).u === 'string') return o as ChatAttachment;
  } catch {
    // ignore
  }
  return null;
}

const FALLBACK_ROOMS: ChatRoom[] = [
  { id: '1', name: 'チーム全体連絡', message: 'メッセージがありません', time: '--', avatar: 'https://picsum.photos/seed/group1/100/100', category: '連絡' },
  { id: '2', name: 'U-12 (6年生)', message: 'メッセージがありません', time: '--', avatar: 'https://picsum.photos/seed/group2/100/100', category: '学年別' },
  { id: '3', name: '保護者会 役員連絡', message: 'メッセージがありません', time: '--', avatar: 'https://picsum.photos/seed/group3/100/100', category: '保護者会' },
  { id: '4', name: '車出し当番グループ', message: 'メッセージがありません', time: '--', avatar: 'https://picsum.photos/seed/group4/100/100', category: '運営' },
];

function formatMessageTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 24 * 60 * 60 * 1000 && d.getDate() === now.getDate()) {
    return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  }
  if (diff < 48 * 60 * 60 * 1000) return '昨日';
  if (diff < 7 * 24 * 60 * 60 * 1000) return ['日', '月', '火', '水', '木', '金', '土'][d.getDay()] + '曜日';
  return d.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });
}

interface SoccerChatProps {
  onChatRoomOpenChange?: (open: boolean) => void;
}

export const SoccerChat: React.FC<SoccerChatProps> = ({ onChatRoomOpenChange }) => {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('すべて');
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [openChat, setOpenChat] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatName, setNewChatName] = useState('');
  const [newChatCategory, setNewChatCategory] = useState<string>('連絡');
  const [creating, setCreating] = useState(false);
  const [roomsFromApi, setRoomsFromApi] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const categories = ['すべて', '学年別', '保護者会', '運営', '連絡'] as const;
  const categoryIcons: Record<typeof categories[number], React.ReactNode> = {
    'すべて': <LayoutGrid size={14} />,
    '学年別': <GraduationCap size={14} />,
    '保護者会': <Users size={14} />,
    '運営': <Settings size={14} />,
    '連絡': <MessageCircle size={14} />,
  };
  const categoryOptions = ['学年別', '保護者会', '運営', '連絡'];
  const userId = user?.id ?? '';

  useEffect(() => {
    if (!userId) return;
    profiles.get(userId).then(({ data }) => {
      setDisplayName(data?.name || '自分');
    });
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    setRoomsLoading(true);
    chatRooms
      .list()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data?.length) {
          setRooms(FALLBACK_ROOMS);
          setRoomsFromApi(false);
        } else {
          setRoomsFromApi(true);
          setRooms(
            data.map((r: { id: string; name: string; category: string; avatar_url?: string; created_at?: string }) => ({
              id: r.id,
              name: r.name,
              message: 'メッセージをタップして表示',
              time: r.created_at ? formatMessageTime(r.created_at) : '--',
              avatar: r.avatar_url || `https://picsum.photos/seed/${r.id}/100/100`,
              category: r.category || '連絡',
            }))
          );
        }
      })
      .finally(() => {
        if (!cancelled) setRoomsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadMessages = useCallback(
    async (roomId: string) => {
      if (!roomId) return;
      setMessagesLoading(true);
      const { data, error } = await chatMessages.list(roomId);
      setMessagesLoading(false);
      if (error) {
        setMessages([]);
        return;
      }
      const list = (data || []).map(
        (m: { id: string; user_id: string; content: string; created_at: string; sender_name?: string }) => ({
          id: m.id,
          sender: m.sender_name || '不明',
          content: m.content,
          time: formatMessageTime(m.created_at),
          isMe: m.user_id === userId,
        })
      );
      setMessages(list);
      if (!userId) return;
      await chatMessages.markAsRead(roomId, userId);
      const myIds = list.filter((m) => m.isMe).map((m) => m.id);
      if (myIds.length === 0) return;
      const { data: counts } = await chatMessages.getReadCounts(myIds);
      setMessages((prev) => prev.map((m) => ({ ...m, readCount: m.isMe ? (counts[m.id] ?? 0) : undefined })));
    },
    [userId]
  );

  useEffect(() => {
    onChatRoomOpenChange?.(!!openChat);
  }, [openChat, onChatRoomOpenChange]);

  useEffect(() => {
    if (!openChat) return;
    loadMessages(openChat.id);
    const unsub = chatMessages.subscribe(openChat.id, (payload) => {
      const m = payload.new;
      if (m.user_id === userId) return;
      setMessages((prev) => [
        ...prev,
        {
          id: m.id,
          sender: (m.profiles?.name as string) || '不明',
          content: m.content,
          time: formatMessageTime(m.created_at),
          isMe: false,
        },
      ]);
    });
    return () => {
      unsub();
    };
  }, [openChat?.id, userId, loadMessages]);

  const filteredRooms = rooms.filter((room) => {
    const matchCategory = activeCategory === 'すべて' || room.category === activeCategory;
    const matchSearch = !searchQuery || room.name.includes(searchQuery) || room.message.includes(searchQuery);
    return matchCategory && matchSearch;
  });

  const sendMessage = async () => {
    const content = newMessage.trim();
    if (!content || !openChat || !userId) return;
    setSending(true);
    const { error } = await chatMessages.send(openChat.id, userId, content);
    setSending(false);
    if (error) {
      return;
    }
    setNewMessage('');
    setMessages((prev) => [
      ...prev,
      {
        id: `local-${Date.now()}`,
        sender: displayName || '自分',
        content,
        time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
        isMe: true,
      },
    ]);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !openChat || !userId) return;
    if ((file.type || '').startsWith('image/')) {
      try {
        file = await imageFileToWebp(file);
      } catch {
        return;
      }
    }
    setUploadingFile(true);
    const { url, error } = await uploadChatFile(openChat.id, userId, file);
    setUploadingFile(false);
    if (error || !url) return;
    const isImage = (file.type || '').startsWith('image/');
    const payload: ChatAttachment = { t: isImage ? 'img' : 'file', u: url, n: file.name };
    const content = JSON.stringify(payload);
    const { error: sendError } = await chatMessages.send(openChat.id, userId, content);
    if (sendError) return;
    setMessages((prev) => [
      ...prev,
      {
        id: `local-${Date.now()}`,
        sender: displayName || '自分',
        content,
        time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
        isMe: true,
      },
    ]);
  };

  const deleteMessage = async (msg: Message) => {
    if (!msg.isMe) return;
    if (!confirm('このメッセージを削除しますか？')) return;
    const att = parseAttachment(msg.content);
    if (att?.u) await deleteChatFileByUrl(att.u);
    if (msg.id.startsWith('local-')) {
      setMessages((prev) => prev.filter((m) => m.id !== msg.id));
      return;
    }
    setDeletingMessageId(msg.id);
    const { error } = await chatMessages.delete(msg.id);
    setDeletingMessageId(null);
    if (!error) setMessages((prev) => prev.filter((m) => m.id !== msg.id));
  };

  const deleteRoom = async (room: ChatRoom) => {
    if (!roomsFromApi) return;
    if (!confirm(`「${room.name}」を削除しますか？\nルーム内のメッセージもすべて削除されます。`)) return;
    setDeletingId(room.id);
    const { error } = await chatRooms.delete(room.id);
    setDeletingId(null);
    if (error) return;
    if (openChat?.id === room.id) setOpenChat(null);
    chatRooms.list().then(({ data, error: err }) => {
      if (err || !data?.length) {
        setRooms(FALLBACK_ROOMS);
        setRoomsFromApi(false);
      } else {
        setRooms(
          data.map((r: { id: string; name: string; category: string; avatar_url?: string; created_at?: string }) => ({
            id: r.id,
            name: r.name,
            message: 'メッセージをタップして表示',
            time: r.created_at ? formatMessageTime(r.created_at) : '--',
            avatar: r.avatar_url || `https://picsum.photos/seed/${r.id}/100/100`,
            category: r.category || '連絡',
          }))
        );
      }
    });
  };

  const createNewChat = async () => {
    const name = newChatName.trim();
    if (!name) return;
    setCreating(true);
    const { data, error } = await chatRooms.create({ name, category: newChatCategory });
    setCreating(false);
    if (error) {
      return;
    }
    const newRoom: ChatRoom = {
      id: data!.id,
      name: data!.name,
      message: 'メッセージを送信してみましょう',
      time: '今',
      avatar: data!.avatar_url || `https://picsum.photos/seed/${data!.id}/100/100`,
      category: data!.category || newChatCategory,
    };
    setRooms((prev) => [newRoom, ...prev]);
    setNewChatName('');
    setNewChatCategory('連絡');
    setShowNewChat(false);
    setOpenChat(newRoom);
  };

  if (openChat) {
    return (
      <div className="flex flex-col h-screen bg-[#b2c7d9]">
        <div className="flex items-center px-2 py-3 bg-[#a0b8cc] border-b border-[#8fa5b8] space-x-2">
          <button onClick={() => setOpenChat(null)} className="p-2 hover:bg-white/20 rounded-full">
            <ChevronLeft size={24} className="text-slate-700" />
          </button>
          <div className="w-9 h-9 rounded-full bg-white/90 flex items-center justify-center text-lg shrink-0" aria-hidden>
            ⚽
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-slate-800 truncate">{openChat.name}</h3>
            <p className="text-[10px] text-slate-600">メンバー 24人</p>
          </div>
        </div>

        {messagesLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-3 py-4 min-h-0" style={{ paddingBottom: 'max(5rem, calc(4.5rem + env(safe-area-inset-bottom)))' }}>
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 rounded-full bg-white/60 flex items-center justify-center text-4xl mb-4">💬</div>
                <p className="text-sm font-bold text-slate-600">トークがまだありません</p>
                <p className="text-xs text-slate-500 mt-1">メッセージを送ってみましょう</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-center gap-3 py-2">
                  <span className="h-px flex-1 bg-white/40 rounded" />
                  <span className="text-[11px] text-slate-600 font-medium px-2">今日</span>
                  <span className="h-px flex-1 bg-white/40 rounded" />
                </div>
                {messages.map((msg) => (
                  <div key={msg.id} className="mt-1">
                    <div className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex flex-col max-w-[78%] ${msg.isMe ? 'items-end' : 'items-start'}`}>
                        {!msg.isMe && <span className="text-[11px] text-slate-600 font-medium mb-0.5 px-1">{msg.sender}</span>}
                        <div
                          className={`px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                            msg.isMe
                              ? 'bg-[#d4f4dd] text-slate-800 rounded-[18px_18px_4px_18px]'
                              : 'bg-white text-slate-800 rounded-[18px_18px_18px_4px]'
                          }`}
                        >
                          {(() => {
                            const att = parseAttachment(msg.content);
                            if (att?.t === 'img') {
                              return (
                                <a href={att.u} target="_blank" rel="noopener noreferrer" className="block">
                                  <img src={att.u} alt={att.n || '画像'} className="max-w-full max-h-64 rounded-lg object-contain" />
                                </a>
                              );
                            }
                            if (att?.t === 'file') {
                              return (
                                <a href={att.u} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-emerald-700 underline font-medium">
                                  <FileText size={18} />
                                  {att.n || 'ファイル'}
                                </a>
                              );
                            }
                            return <>{msg.content}</>;
                          })()}
                        </div>
                        <div className={`flex items-center gap-1.5 mt-0.5 px-1 ${msg.isMe ? 'justify-end' : 'justify-start'}`}>
                          <span className="text-[10px] text-slate-500">{msg.time}</span>
                          {msg.isMe && (msg.readCount ?? 0) > 0 && (
                            <span className="text-[10px] text-slate-400">既読 {msg.readCount}</span>
                          )}
                          {msg.isMe && (
                            <button
                              type="button"
                              onClick={() => deleteMessage(msg)}
                              disabled={deletingMessageId === msg.id}
                              className="p-1 rounded text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                              aria-label="メッセージを削除"
                              title="削除"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto px-3 py-2 bg-[#a0b8cc] z-[60]" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={handleFileSelect}
          />
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending || uploadingFile}
              className="shrink-0 w-10 h-10 rounded-full bg-white/90 text-slate-600 flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50 disabled:pointer-events-none border border-slate-200 shadow-sm"
              aria-label="画像・ファイルを添付"
              title="画像・PDF・ファイルを添付"
            >
              <Plus size={22} strokeWidth={2.5} />
            </button>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="メッセージ"
              className="flex-1 px-4 py-2.5 bg-white rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50 min-h-[40px]"
              disabled={sending}
            />
            <button
              onClick={sendMessage}
              disabled={sending || !newMessage.trim()}
              className="shrink-0 w-10 h-10 rounded-full bg-[#07c755] text-white flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50 disabled:pointer-events-none"
              aria-label="送信"
            >
              <Send size={20} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-emerald-500 rounded-lg text-white">
            <MessageCircle size={20} />
          </div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">チームチャット</h2>
        </div>
        <button
          onClick={() => setShowNewChat(true)}
          className="p-2 bg-white rounded-full shadow-sm border border-slate-100 active:scale-95 transition-transform"
        >
          <Plus size={20} className="text-slate-400" />
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="チームや話題を検索"
          className="w-full pl-12 pr-4 py-3 bg-white border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <section>
        <div className="bg-slate-900 rounded-3xl overflow-hidden mb-6 relative group h-44 shadow-xl">
          <img src="https://picsum.photos/seed/stadium-night/600/300" className="w-full h-full object-cover opacity-50" alt="" />
          <div className="absolute inset-0 p-5 flex flex-col justify-end">
            <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1 flex items-center">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse" />
              NEW INFO
            </span>
            <div className="flex items-start space-x-2">
              <div className="w-1.5 h-6 bg-emerald-500 rounded-full mt-1" />
              <div>
                <h3 className="text-lg font-black text-white leading-tight">【重要】今週末の練習試合について</h3>
                <p className="text-[10px] text-white/60 font-medium mt-1">雨天時の集合場所が変更になりま...</p>
              </div>
            </div>
            <button
              onClick={() => filteredRooms.length > 0 && setOpenChat(filteredRooms[0])}
              className="mt-3 px-4 py-1.5 bg-emerald-500 text-white text-[10px] font-black rounded-lg self-end shadow-lg shadow-emerald-500/20 active:scale-95 transition-transform"
            >
              詳細を見る
            </button>
          </div>
        </div>

        <div className="flex space-x-2 overflow-x-auto hide-scrollbar pb-2">
          {categories.map((tag, i) => (
            <button
              key={i}
              onClick={() => setActiveCategory(tag)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                activeCategory === tag ? 'bg-emerald-500 text-white' : 'bg-white text-slate-400 border border-slate-100'
              }`}
            >
              <span className="shrink-0 [&>svg]:block">{categoryIcons[tag]}</span>
              {tag}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        {roomsLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-slate-400">該当するチャットがありません</p>
          </div>
        ) : (
          filteredRooms.map((room) => (
            <div
              key={room.id}
              className="flex items-center space-x-4 p-2 active:bg-slate-50 rounded-2xl transition-colors"
            >
              <div
                onClick={() => setOpenChat(room)}
                className="flex items-center space-x-4 flex-1 min-w-0 cursor-pointer"
              >
                <div className="relative shrink-0">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-slate-100 overflow-hidden shadow-sm flex items-center justify-center text-3xl" aria-hidden>
                    ⚽
                  </div>
                  {room.unread != null && room.unread > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                      <span className="text-[10px] font-black text-white">{room.unread}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="text-sm font-bold text-slate-800 truncate">{room.name}</h4>
                    <span className="text-[9px] font-bold text-slate-300 shrink-0 ml-1">{room.time}</span>
                  </div>
                  <p className="text-xs text-slate-400 truncate leading-tight">{room.message}</p>
                </div>
              </div>
              {roomsFromApi && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); deleteRoom(room); }}
                  disabled={deletingId === room.id}
                  className="shrink-0 p-2 rounded-xl text-slate-300 hover:bg-red-50 hover:text-red-500 active:bg-red-100 transition-colors disabled:opacity-50"
                  aria-label={`${room.name}を削除`}
                  title="ルームを削除"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          ))
        )}
      </section>

      {showNewChat && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50"
          onClick={() => !creating && setShowNewChat(false)}
        >
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 space-y-4 relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => !creating && setShowNewChat(false)}
              className="absolute top-4 right-4 p-1 text-slate-400"
              aria-label="閉じる"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-slate-800">新しいチャットを作成</h3>
            <input
              value={newChatName}
              onChange={(e) => setNewChatName(e.target.value)}
              placeholder="チャット名を入力"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              onKeyDown={(e) => e.key === 'Enter' && createNewChat()}
            />
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">タグ（なんのチャットか）</p>
              <div className="flex flex-wrap gap-2">
                {categoryOptions.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setNewChatCategory(cat)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${newChatCategory === cat ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                  >
                    <span className="shrink-0 [&>svg]:block">{categoryIcons[cat]}</span>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={createNewChat}
              disabled={creating || !newChatName.trim()}
              className="w-full py-3 bg-emerald-500 text-white rounded-xl font-bold active:scale-95 transition-transform disabled:opacity-50"
            >
              {creating ? '作成中...' : '作成する'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
