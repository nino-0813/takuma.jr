-- ============================================================
--  チャットのリアクション（👍 ❤️ ⚽️ など）を追加
--  ※先に add_chat.sql（messages テーブル）を実行しておいてください
--  Supabase → SQL Editor に貼り付けて Run
-- ============================================================

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
create index if not exists idx_reactions_team on public.message_reactions(team_id);

alter table public.message_reactions enable row level security;

drop policy if exists "anon_all_message_reactions" on public.message_reactions;
create policy "anon_all_message_reactions" on public.message_reactions
  for all to anon, authenticated
  using (true) with check (true);

-- リアルタイム配信
do $$
begin
  alter publication supabase_realtime add table public.message_reactions;
exception
  when duplicate_object then null;
end $$;
