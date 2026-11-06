-- Run in a NEW, dedicated Supabase project for My Rhythm.
create table if not exists public.rhythm_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.rhythm_state enable row level security;
create policy "read own rhythm" on public.rhythm_state for select to authenticated using ((select auth.uid()) = user_id);
create policy "insert own rhythm" on public.rhythm_state for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "update own rhythm" on public.rhythm_state for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "delete own rhythm" on public.rhythm_state for delete to authenticated using ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.rhythm_state to authenticated;
revoke all on public.rhythm_state from anon;