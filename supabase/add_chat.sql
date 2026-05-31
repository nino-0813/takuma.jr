-- ============================================================
--  チャット機能の追加（すでに schema.sql を実行済みの場合はこれだけ実行）
--  Supabase → SQL Editor に貼り付けて Run
-- ============================================================

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  member_id uuid references public.members(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_messages_team on public.messages(team_id, created_at);

alter table public.messages enable row level security;

drop policy if exists "anon_all_messages" on public.messages;
create policy "anon_all_messages" on public.messages
  for all to anon, authenticated
  using (true) with check (true);

-- リアルタイム配信を有効化（送信後すぐ全員に届く）
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;  -- すでに追加済みなら無視
end $$;
