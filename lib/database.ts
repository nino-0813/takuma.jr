import { supabase } from './supabase';

// ============================================================
// Auth
// ============================================================
export const auth = {
  async signUp(email: string, password: string, name: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    return { data, error };
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  },

  async signInWithOAuth(provider: 'google') {
    const { data, error } = await supabase.auth.signInWithOAuth({ provider });
    return { data, error };
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  async getUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  async resetPassword(email: string) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email);
    return { data, error };
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  },
};

// ============================================================
// Profiles
// ============================================================
export const profiles = {
  async get(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    return { data, error };
  },

  async update(userId: string, updates: { name?: string; team?: string; position?: string; number?: number; avatar_url?: string; course?: string }) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    return { data, error };
  },
};

// ============================================================
// Practice Records (練習記録)
// ============================================================
export const practiceRecords = {
  async list(userId: string) {
    const { data, error } = await supabase
      .from('practice_records')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });
    return { data: data || [], error };
  },

  async create(userId: string, record: { date: string; mood: string; menu: string; tags: string[] }) {
    const { data, error } = await supabase
      .from('practice_records')
      .insert({ user_id: userId, ...record })
      .select()
      .single();
    return { data, error };
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('practice_records')
      .delete()
      .eq('id', id);
    return { error };
  },
};

// ============================================================
// Clock Records (出勤/退勤)
// ============================================================
export const clockRecords = {
  async getToday(userId: string) {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('clock_records')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle();
    return { data, error };
  },

  /** 打刻（参加）した日付一覧 YYYY-MM-DD（過去〜今日、降順想定で取得） */
  async listParticipationDates(userId: string) {
    const { data, error } = await supabase
      .from('clock_records')
      .select('date')
      .eq('user_id', userId)
      .not('clock_in', 'is', null)
      .order('date', { ascending: false });
    if (error) return { data: [] as string[], error };
    const dates = (data || []).map((r: { date: string }) => r.date);
    return { data: dates, error: null };
  },

  async clockIn(userId: string) {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    // upsert: if record exists for today, update clock_in; else insert
    const { data, error } = await supabase
      .from('clock_records')
      .upsert(
        { user_id: userId, date: today, clock_in: now },
        { onConflict: 'user_id,date' }
      )
      .select()
      .single();
    return { data, error };
  },

  async clockOut(userId: string) {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('clock_records')
      .update({ clock_out: now })
      .eq('user_id', userId)
      .eq('date', today)
      .select()
      .single();
    return { data, error };
  },
};

// ============================================================
// Attendance (出欠回答)
// ============================================================
export const attendance = {
  async list(userId: string) {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', userId);
    return { data: data || [], error };
  },

  async upsert(userId: string, eventId: string, status: 'attend' | 'absent' | 'undecided', reason?: string) {
    const { data, error } = await supabase
      .from('attendance')
      .upsert(
        { user_id: userId, event_id: eventId, status, reason: reason || '' },
        { onConflict: 'user_id,event_id' }
      )
      .select()
      .single();
    return { data, error };
  },

  /** 指定イベントの出欠一覧を名前付きで取得（出席・欠席・未定） */
  async listByEvent(eventId: string): Promise<{
    attend: { user_id: string; name: string }[];
    absent: { user_id: string; name: string }[];
    undecided: { user_id: string; name: string }[];
  }> {
    const { data: rows, error } = await supabase
      .from('attendance')
      .select('user_id, status')
      .eq('event_id', eventId);
    if (error) return { attend: [], absent: [], undecided: [] };
    const userIds = [...new Set((rows || []).map((r: { user_id: string }) => r.user_id))];
    if (userIds.length === 0) return { attend: [], absent: [], undecided: [] };
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', userIds);
    const nameBy = (profiles || []).reduce<Record<string, string>>((acc, p: { id: string; name: string }) => {
      acc[p.id] = p.name || '(名前なし)';
      return acc;
    }, {});
    const attend: { user_id: string; name: string }[] = [];
    const absent: { user_id: string; name: string }[] = [];
    const undecided: { user_id: string; name: string }[] = [];
    (rows || []).forEach((r: { user_id: string; status: string }) => {
      const name = nameBy[r.user_id] ?? '(名前なし)';
      if (r.status === 'attend') attend.push({ user_id: r.user_id, name });
      else if (r.status === 'absent') absent.push({ user_id: r.user_id, name });
      else undecided.push({ user_id: r.user_id, name });
    });
    return { attend, absent, undecided };
  },
};

// ============================================================
// Schedule Events (スケジュール予定)
// ============================================================
export const scheduleEvents = {
  /** 指定月の予定を取得。event_date は YYYY-MM-DD */
  async listByMonth(year: number, month: number) {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('schedule_events')
      .select('*')
      .gte('event_date', startStr)
      .lte('event_date', endStr)
      .order('event_date', { ascending: true })
      .order('time', { ascending: true });
    return { data: data || [], error };
  },

  /** 指定IDの予定をまとめて取得（出欠履歴表示用） */
  async listByIds(ids: string[]) {
    if (ids.length === 0) return { data: [] as { id: string; event_date: string; title: string; time: string }[], error: null };
    const { data, error } = await supabase
      .from('schedule_events')
      .select('id, event_date, title, time')
      .in('id', ids);
    return { data: data || [], error };
  },

  async create(row: { event_date: string; title: string; time?: string; location?: string; type: 'practice' | 'match' | 'event'; items?: string[] }) {
    const { data, error } = await supabase
      .from('schedule_events')
      .insert({
        event_date: row.event_date,
        title: row.title,
        time: row.time || '',
        location: row.location || '',
        type: row.type,
        items: row.items || [],
      })
      .select()
      .single();
    return { data, error };
  },

  async update(id: string, row: { event_date?: string; title?: string; time?: string; location?: string; type?: 'practice' | 'match' | 'event'; items?: string[] }) {
    const { data, error } = await supabase
      .from('schedule_events')
      .update(row)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  async delete(id: string) {
    const { error } = await supabase.from('schedule_events').delete().eq('id', id);
    return { error };
  },
};

// ============================================================
// Absence Reports (欠席連絡)
// ============================================================
export const absenceReports = {
  async create(userId: string, eventTitle: string, reason: string) {
    const { data, error } = await supabase
      .from('absence_reports')
      .insert({ user_id: userId, event_title: eventTitle, reason })
      .select()
      .single();
    return { data, error };
  },

  async list(userId: string) {
    const { data, error } = await supabase
      .from('absence_reports')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return { data: data || [], error };
  },
};

// ============================================================
// Match Video Folders (試合動画フォルダ)
// ============================================================
export const matchVideoFolders = {
  async list() {
    const { data, error } = await supabase
      .from('match_video_folders')
      .select('*')
      .order('name');
    return { data: data || [], error };
  },

  async create(name: string) {
    const { data, error } = await supabase
      .from('match_video_folders')
      .insert({ name: name.trim() })
      .select()
      .single();
    return { data, error };
  },

  async update(id: string, name: string) {
    const { data, error } = await supabase
      .from('match_video_folders')
      .update({ name: name.trim() })
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  async delete(id: string) {
    const { error } = await supabase.from('match_video_folders').delete().eq('id', id);
    return { error };
  },
};

// ============================================================
// Match Videos (試合動画記録)
// ============================================================
export const matchVideos = {
  /** ログイン済みユーザー全員の試合動画を取得（一覧表示用） */
  async listAll() {
    const { data, error } = await supabase
      .from('match_videos')
      .select('*')
      .order('match_date', { ascending: false });
    return { data: data || [], error };
  },

  async list(userId: string) {
    const { data, error } = await supabase
      .from('match_videos')
      .select('*')
      .eq('user_id', userId)
      .order('match_date', { ascending: false });
    return { data: data || [], error };
  },

  async create(userId: string, row: { title: string; match_date: string; opponent?: string; video_url?: string; note?: string; folder_id?: string | null }) {
    const { data, error } = await supabase
      .from('match_videos')
      .insert({ user_id: userId, ...row })
      .select()
      .single();
    return { data, error };
  },

  async update(id: string, updates: { title?: string; match_date?: string; opponent?: string; video_url?: string; note?: string; folder_id?: string | null }) {
    const { data, error } = await supabase
      .from('match_videos')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  async delete(id: string) {
    const { error } = await supabase.from('match_videos').delete().eq('id', id);
    return { error };
  },

  /** 動画ファイルを Storage にアップロード。返す path を video_url に保存する */
  async uploadFile(userId: string, file: File): Promise<{ path: string; error: Error | null }> {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'mp4';
    const name = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('match-videos').upload(name, file, {
      contentType: file.type,
      upsert: false,
    });
    if (error) return { path: '', error };
    return { path: name, error: null };
  },

  /** 再生用URLを取得。http(s) ならそのまま、それ以外は Storage の署名付きURL */
  async getPlaybackUrl(videoUrl: string): Promise<string> {
    const u = (videoUrl || '').trim();
    if (!u) return '';
    if (u.startsWith('http://') || u.startsWith('https://')) return u;
    const { data, error } = await supabase.storage.from('match-videos').createSignedUrl(u, 3600);
    if (error || !data?.signedUrl) return '';
    return data.signedUrl;
  },

  /** Storage のファイルを削除（動画レコード削除時に呼ぶ） */
  async deleteStorageFile(path: string): Promise<void> {
    if (!path || path.startsWith('http')) return;
    await supabase.storage.from('match-videos').remove([path]);
  },
};

// ============================================================
// Chat (チームチャット)
// ============================================================
export const chatRooms = {
  async list() {
    const { data, error } = await supabase
      .from('chat_rooms')
      .select('*')
      .order('created_at', { ascending: false });
    return { data: data || [], error };
  },

  async create(room: { name: string; category?: string; avatar_url?: string }) {
    const { data, error } = await supabase
      .from('chat_rooms')
      .insert({
        name: room.name,
        category: room.category || '連絡',
        avatar_url: room.avatar_url || '',
      })
      .select()
      .single();
    return { data, error };
  },

  async delete(id: string) {
    const { error } = await supabase.from('chat_rooms').delete().eq('id', id);
    return { error };
  },
};

const CHAT_FILES_BUCKET = 'chat-files';

/** チャット用ファイルの公開URLから Storage のパスを抽出して削除。自前ドメインの URL の場合のみ削除する。 */
export async function deleteChatFileByUrl(url: string): Promise<void> {
  try {
    const match = url.match(/\/storage\/v1\/object\/public\/chat-files\/(.+)$/);
    if (match?.[1]) await supabase.storage.from(CHAT_FILES_BUCKET).remove([decodeURIComponent(match[1])]);
  } catch {
    // ignore
  }
}

/** チャット用ファイル（画像・PDF等）を Storage にアップロード。公開URLを返す。バケット "chat-files" を Dashboard で Public 作成すること。 */
export async function uploadChatFile(roomId: string, userId: string, file: File): Promise<{ url: string; error: Error | null }> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  const path = `${roomId}/${userId}/${crypto.randomUUID()}_${safeName}`;
  const { error } = await supabase.storage.from(CHAT_FILES_BUCKET).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (error) return { url: '', error };
  const { data: { publicUrl } } = supabase.storage.from(CHAT_FILES_BUCKET).getPublicUrl(path);
  return { url: publicUrl, error: null };
}

export const chatMessages = {
  async list(roomId: string) {
    const { data: rows, error } = await supabase
      .from('chat_messages')
      .select('id, room_id, user_id, content, created_at')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });
    if (error) return { data: [], error };
    const userIds = [...new Set((rows || []).map((r: { user_id: string }) => r.user_id))];
    const names: Record<string, string> = {};
    for (const uid of userIds) {
      const { data: p } = await supabase.from('profiles').select('name').eq('id', uid).single();
      names[uid] = (p as { name?: string } | null)?.name || '不明';
    }
    const data = (rows || []).map((r: { user_id: string; [k: string]: unknown }) => ({
      ...r,
      sender_name: names[r.user_id],
    }));
    return { data, error: null };
  },

  async send(roomId: string, userId: string, content: string) {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({ room_id: roomId, user_id: userId, content: content.trim() })
      .select()
      .single();
    return { data, error };
  },

  /** 自分のメッセージを削除（RLS で本人のみ削除可） */
  async delete(messageId: string) {
    const { error } = await supabase.from('chat_messages').delete().eq('id', messageId);
    return { error };
  },

  /** ルームを開いたときに、自分以外のメッセージを既読にする */
  async markAsRead(roomId: string, userId: string) {
    const { data: messages } = await supabase
      .from('chat_messages')
      .select('id, user_id')
      .eq('room_id', roomId);
    if (!messages?.length) return { error: null };
    const now = new Date().toISOString();
    const rows = messages
      .filter((m: { user_id: string }) => m.user_id !== userId)
      .map((m: { id: string }) => ({ message_id: m.id, user_id: userId, read_at: now }));
    if (rows.length === 0) return { error: null };
    const { error } = await supabase.from('chat_message_reads').upsert(rows, {
      onConflict: 'message_id,user_id',
    });
    return { error };
  },

  /** 自分のメッセージの既読数を取得。返り値は { [messageId]: count } */
  async getReadCounts(messageIds: string[]): Promise<{ data: Record<string, number>; error: unknown }> {
    if (messageIds.length === 0) return { data: {}, error: null };
    const { data: rows, error } = await supabase
      .from('chat_message_reads')
      .select('message_id')
      .in('message_id', messageIds);
    if (error) return { data: {}, error };
    const counts: Record<string, number> = {};
    for (const id of messageIds) counts[id] = 0;
    for (const r of rows || []) {
      const id = (r as { message_id: string }).message_id;
      if (id in counts) counts[id] += 1;
    }
    return { data: counts, error: null };
  },

  subscribe(roomId: string, onMessage: (payload: { new: { id: string; user_id: string; content: string; created_at: string; profiles: { name: string } | null } }) => void) {
    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` },
        async (payload) => {
          const newRow = payload.new as { id: string; user_id: string; content: string; created_at: string };
          const { data: profile } = await supabase.from('profiles').select('name').eq('id', newRow.user_id).single();
          onMessage({ new: { ...newRow, profiles: profile } });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  },
};
