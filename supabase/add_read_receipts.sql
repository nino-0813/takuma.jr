-- ============================================================
--  チャットの既読機能を追加
--  ※先に add_chat.sql（messages テーブル）を実行しておいてください
--  Supabase → SQL Editor に貼り付けて Run
-- ============================================================

-- メンバーごとの「どこまで読んだか」を記録
create table if not exists public.chat_reads (
  team_id uuid not null references public.teams(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (team_id, member_id)
);

alter table public.chat_reads enable row level security;

drop policy if exists "anon_all_chat_reads" on public.chat_reads;
create policy "anon_all_chat_reads" on public.chat_reads
  for all to anon, authenticated
  using (true) with check (true);

-- リアルタイム配信（既読がすぐ反映されるように）
do $$
begin
  alter publication supabase_realtime add table public.chat_reads;
exception
  when duplicate_object then null;
end $$;
