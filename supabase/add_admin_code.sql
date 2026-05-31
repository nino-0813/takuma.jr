-- ============================================================
--  管理者コードを追加（コードを知っている人は自分で管理者になれる）
--  Supabase → SQL Editor に貼り付けて Run
-- ============================================================

alter table public.teams add column if not exists admin_code text;

-- 既存チームにランダムな管理者コードを割り当て（未設定のものだけ）
update public.teams
set admin_code = upper(substr(md5(random()::text), 1, 6))
where admin_code is null;
