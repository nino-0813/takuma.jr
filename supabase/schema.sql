-- ============================================================
--  チームつながる  データベーススキーマ
--  Supabase ダッシュボード → SQL Editor に貼り付けて Run してください
-- ============================================================

-- 拡張（gen_random_uuid 用、通常は有効）
create extension if not exists "pgcrypto";

-- ---------- チーム ----------
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  emoji text,
  invite_code text not null unique,
  created_at timestamptz not null default now()
);

-- ---------- メンバー（保護者） ----------
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  child_name text,
  jersey_number int,
  phone text,
  created_at timestamptz not null default now()
);
create index if not exists idx_members_team on public.members(team_id);

-- ---------- 予定（試合・練習など） ----------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  type text not null default 'match' check (type in ('match', 'practice', 'other')),
  title text not null,
  opponent text,
  location text,
  start_at timestamptz not null,
  meet_time text,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists idx_events_team on public.events(team_id);
create index if not exists idx_events_start on public.events(start_at);

-- ---------- 参加表明 ----------
create table if not exists public.attendances (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  status text not null check (status in ('yes', 'no', 'maybe')),
  comment text,
  updated_at timestamptz not null default now(),
  unique (event_id, member_id)
);
create index if not exists idx_att_event on public.attendances(event_id);

-- ---------- 当番（鍵当番など） ----------
create table if not exists public.duties (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  date date not null,
  type text not null default 'key',
  member_id uuid references public.members(id) on delete set null,
  note text,
  unique (team_id, date, type)
);
create index if not exists idx_duties_team on public.duties(team_id);

-- ---------- お知らせ掲示板 ----------
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  member_id uuid references public.members(id) on delete set null,
  title text not null,
  body text not null,
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_ann_team on public.announcements(team_id);

-- ---------- 配車 ----------
create table if not exists public.carpools (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  driver_member_id uuid not null references public.members(id) on delete cascade,
  seats int not null default 3,
  departure_place text,
  departure_time text,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists idx_carpool_event on public.carpools(event_id);

create table if not exists public.carpool_riders (
  id uuid primary key default gen_random_uuid(),
  carpool_id uuid not null references public.carpools(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (carpool_id, member_id)
);

-- ---------- チャット ----------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  member_id uuid references public.members(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_messages_team on public.messages(team_id, created_at);

-- ---------- チャット既読 ----------
create table if not exists public.chat_reads (
  team_id uuid not null references public.teams(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (team_id, member_id)
);

-- ---------- チャットのリアクション ----------
create table if not exists public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  message_id uuid not null references public.messages(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (message_id, member_id, emoji)
);
create index if not exists idx_reactions_message on public.message_reactions(message_id);

-- ---------- プッシュ通知の購読 ----------
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_push_team on public.push_subscriptions(team_id);

-- リアルタイム配信（送信後すぐ全員に届く）を有効化
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.chat_reads;
alter publication supabase_realtime add table public.message_reactions;

-- ============================================================
--  RLS（行レベルセキュリティ）
--  ※ このアプリはログイン無し（匂い当たらない招待リンク方式）のため、
--    anon ロールに対して読み書きを許可します。
--    本格運用で厳密な権限分離が必要になったら Supabase Auth へ移行できます。
-- ============================================================
alter table public.teams           enable row level security;
alter table public.members         enable row level security;
alter table public.events          enable row level security;
alter table public.attendances     enable row level security;
alter table public.duties          enable row level security;
alter table public.announcements   enable row level security;
alter table public.carpools        enable row level security;
alter table public.carpool_riders  enable row level security;
alter table public.messages          enable row level security;
alter table public.chat_reads        enable row level security;
alter table public.message_reactions enable row level security;
alter table public.push_subscriptions enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'teams','members','events','attendances','duties',
    'announcements','carpools','carpool_riders','messages','chat_reads',
    'message_reactions','push_subscriptions'
  ]
  loop
    execute format('drop policy if exists "anon_all_%1$s" on public.%1$I;', t);
    execute format(
      'create policy "anon_all_%1$s" on public.%1$I
         for all to anon, authenticated
         using (true) with check (true);', t);
  end loop;
end $$;
