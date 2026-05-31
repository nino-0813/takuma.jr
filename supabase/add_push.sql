-- ============================================================
--  プッシュ通知の購読情報テーブル
--  Supabase → SQL Editor に貼り付けて Run
-- ============================================================

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

alter table public.push_subscriptions enable row level security;

drop policy if exists "anon_all_push_subscriptions" on public.push_subscriptions;
create policy "anon_all_push_subscriptions" on public.push_subscriptions
  for all to anon, authenticated
  using (true) with check (true);
