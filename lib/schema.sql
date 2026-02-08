-- ====================================
-- Soccer Club Manager - Supabase Schema
-- ====================================
-- Run this in Supabase SQL Editor (https://ewvywkvzqcvnonunzmaz.supabase.co)

-- 1. Profiles (extends Supabase auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null default '',
  team text default 'ジュニアA',
  position text default 'MF',
  number int default 10,
  avatar_url text default '',
  course text default 'ジュニアコース',
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Authenticated can view all profiles" on public.profiles for select using (auth.role() = 'authenticated');
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Practice Records (練習記録)
create table if not exists public.practice_records (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  date date not null,
  mood text not null default 'happy',
  menu text default '',
  tags text[] default '{}',
  created_at timestamptz default now()
);

alter table public.practice_records enable row level security;
create policy "Users can view own records" on public.practice_records for select using (auth.uid() = user_id);
create policy "Users can insert own records" on public.practice_records for insert with check (auth.uid() = user_id);
create policy "Users can update own records" on public.practice_records for update using (auth.uid() = user_id);
create policy "Users can delete own records" on public.practice_records for delete using (auth.uid() = user_id);

-- 3. Clock Records (出勤/退勤)
create table if not exists public.clock_records (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  date date not null,
  clock_in timestamptz,
  clock_out timestamptz,
  created_at timestamptz default now(),
  unique (user_id, date)
);

alter table public.clock_records enable row level security;
create policy "Users can view own clocks" on public.clock_records for select using (auth.uid() = user_id);
create policy "Users can insert own clocks" on public.clock_records for insert with check (auth.uid() = user_id);
create policy "Users can update own clocks" on public.clock_records for update using (auth.uid() = user_id);

-- 4. Attendance (出欠回答)
create table if not exists public.attendance (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  event_id text not null,
  status text not null check (status in ('attend', 'absent', 'undecided')),
  reason text default '',
  created_at timestamptz default now(),
  unique (user_id, event_id)
);

alter table public.attendance enable row level security;
create policy "Users can view own attendance" on public.attendance for select using (auth.uid() = user_id);
create policy "Authenticated can view all attendance" on public.attendance for select using (auth.role() = 'authenticated');
create policy "Users can insert own attendance" on public.attendance for insert with check (auth.uid() = user_id);
create policy "Users can update own attendance" on public.attendance for update using (auth.uid() = user_id);

-- 5. Absence Reports (欠席連絡)
create table if not exists public.absence_reports (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  event_title text not null,
  reason text not null,
  created_at timestamptz default now()
);

alter table public.absence_reports enable row level security;
create policy "Users can view own absences" on public.absence_reports for select using (auth.uid() = user_id);
create policy "Users can insert own absences" on public.absence_reports for insert with check (auth.uid() = user_id);

-- 6a. Match Video Folders (試合動画をまとめるフォルダ)
create table if not exists public.match_video_folders (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  created_at timestamptz default now()
);

alter table public.match_video_folders enable row level security;
create policy "Authenticated can view match_video_folders" on public.match_video_folders for select to authenticated using (true);
create policy "Authenticated can insert match_video_folders" on public.match_video_folders for insert to authenticated with check (true);
create policy "Authenticated can update match_video_folders" on public.match_video_folders for update to authenticated using (true);
create policy "Authenticated can delete match_video_folders" on public.match_video_folders for delete to authenticated using (true);

-- 6b. Match Videos (試合動画記録) ※ログイン済みユーザー全員が閲覧可能
create table if not exists public.match_videos (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  folder_id uuid references public.match_video_folders on delete set null,
  title text not null default '試合動画',
  match_date date not null,
  opponent text default '',
  video_url text default '',
  note text default '',
  created_at timestamptz default now()
);


alter table public.match_videos enable row level security;
drop policy if exists "Users can view own match_videos" on public.match_videos;
drop policy if exists "Authenticated can view all match_videos" on public.match_videos;
drop policy if exists "Users can insert own match_videos" on public.match_videos;
drop policy if exists "Users can update own match_videos" on public.match_videos;
drop policy if exists "Users can delete own match_videos" on public.match_videos;
create policy "Authenticated can view all match_videos" on public.match_videos for select to authenticated using (true);
create policy "Users can insert own match_videos" on public.match_videos for insert with check (auth.uid() = user_id);
create policy "Users can update own match_videos" on public.match_videos for update using (auth.uid() = user_id);
create policy "Users can delete own match_videos" on public.match_videos for delete using (auth.uid() = user_id);

-- 既存の match_videos に folder_id がない場合に追加（2回目以降の実行は無視される）
alter table public.match_videos add column if not exists folder_id uuid references public.match_video_folders on delete set null;

-- Storage: バケット "match-videos" を Dashboard で作成し、Visibility を Private にしてから実行
create policy "Users can upload own match videos" on storage.objects for insert to authenticated with check (bucket_id = 'match-videos' and (storage.foldername(name))[1] = (auth.uid())::text);
create policy "Authenticated can view all match videos" on storage.objects for select to authenticated using (bucket_id = 'match-videos');
create policy "Users can update own match videos" on storage.objects for update to authenticated using (bucket_id = 'match-videos' and (storage.foldername(name))[1] = (auth.uid())::text);
create policy "Users can delete own match videos" on storage.objects for delete to authenticated using (bucket_id = 'match-videos' and (storage.foldername(name))[1] = (auth.uid())::text);

-- Storage: バケット "chat-files" を Dashboard で作成し Public にすると、チャットの画像・PDF等の添付が利用可能になります
create policy "Authenticated can upload chat files" on storage.objects for insert to authenticated with check (bucket_id = 'chat-files');
create policy "Authenticated can view chat files" on storage.objects for select to authenticated using (bucket_id = 'chat-files');

-- 7. Chat Rooms (チームチャットのルーム)
create table if not exists public.chat_rooms (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  category text not null default '連絡',
  avatar_url text default '',
  created_at timestamptz default now()
);

alter table public.chat_rooms enable row level security;
create policy "Authenticated can view chat_rooms" on public.chat_rooms for select to authenticated using (true);
create policy "Authenticated can insert chat_rooms" on public.chat_rooms for insert to authenticated with check (true);
create policy "Authenticated can update chat_rooms" on public.chat_rooms for update to authenticated using (true);
create policy "Authenticated can delete chat_rooms" on public.chat_rooms for delete to authenticated using (true);

-- 8. Chat Messages (チャットメッセージ)
-- ※ Realtime を使う場合: Supabase Dashboard → Database → Replication → chat_messages を ON にしてください
create table if not exists public.chat_messages (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references public.chat_rooms on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  content text not null,
  created_at timestamptz default now()
);

create index if not exists idx_chat_messages_room_id on public.chat_messages(room_id);
create index if not exists idx_chat_messages_created_at on public.chat_messages(room_id, created_at);

alter table public.chat_messages enable row level security;
create policy "Authenticated can view chat_messages" on public.chat_messages for select to authenticated using (true);
create policy "Users can insert own chat_messages" on public.chat_messages for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update own chat_messages" on public.chat_messages for update to authenticated using (auth.uid() = user_id);
create policy "Users can delete own chat_messages" on public.chat_messages for delete to authenticated using (auth.uid() = user_id);

-- 9. Chat Message Reads (既読)
create table if not exists public.chat_message_reads (
  message_id uuid references public.chat_messages on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  read_at timestamptz default now(),
  primary key (message_id, user_id)
);

create index if not exists idx_chat_message_reads_message_id on public.chat_message_reads(message_id);

alter table public.chat_message_reads enable row level security;
create policy "Authenticated can view chat_message_reads" on public.chat_message_reads for select to authenticated using (true);
create policy "Users can insert own chat_message_reads" on public.chat_message_reads for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update own chat_message_reads" on public.chat_message_reads for update to authenticated using (auth.uid() = user_id);

-- 10. Schedule Events (スケジュール予定) チーム共通
create table if not exists public.schedule_events (
  id uuid default gen_random_uuid() primary key,
  event_date date not null,
  title text not null default '',
  time text default '',
  location text default '',
  type text not null check (type in ('practice', 'match', 'event')) default 'practice',
  items text[] default '{}',
  created_at timestamptz default now()
);

create index if not exists idx_schedule_events_event_date on public.schedule_events(event_date);

alter table public.schedule_events enable row level security;
create policy "Authenticated can view schedule_events" on public.schedule_events for select to authenticated using (true);
create policy "Authenticated can insert schedule_events" on public.schedule_events for insert to authenticated with check (true);
create policy "Authenticated can update schedule_events" on public.schedule_events for update to authenticated using (true);
create policy "Authenticated can delete schedule_events" on public.schedule_events for delete to authenticated using (true);

-- 初期ルーム（任意: 既存データがなくてもアプリは動作します）
insert into public.chat_rooms (id, name, category, avatar_url) values
  ('a0000001-0001-0001-0001-000000000001'::uuid, 'チーム全体連絡', '連絡', 'https://picsum.photos/seed/group1/100/100'),
  ('a0000001-0001-0001-0001-000000000002'::uuid, 'U-12 (6年生)', '学年別', 'https://picsum.photos/seed/group2/100/100'),
  ('a0000001-0001-0001-0001-000000000003'::uuid, '保護者会 役員連絡', '保護者会', 'https://picsum.photos/seed/group3/100/100'),
  ('a0000001-0001-0001-0001-000000000004'::uuid, '車出し当番グループ', '運営', 'https://picsum.photos/seed/group4/100/100')
on conflict (id) do nothing;
