-- ZUNO Music account state
-- Run once in the SQL Editor of a dedicated ZUNO Supabase project.
-- Only authenticated users can access their own row.

create table if not exists public.zuno_user_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint zuno_user_state_object check (jsonb_typeof(state) = 'object')
);

alter table public.zuno_user_state enable row level security;

grant usage on schema public to authenticated;
revoke all on table public.zuno_user_state from anon;
revoke all on table public.zuno_user_state from public;
grant select, insert, update, delete on table public.zuno_user_state to authenticated;

drop policy if exists "Users can read their own ZUNO state" on public.zuno_user_state;
create policy "Users can read their own ZUNO state"
  on public.zuno_user_state
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own ZUNO state" on public.zuno_user_state;
create policy "Users can create their own ZUNO state"
  on public.zuno_user_state
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own ZUNO state" on public.zuno_user_state;
create policy "Users can update their own ZUNO state"
  on public.zuno_user_state
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own ZUNO state" on public.zuno_user_state;
create policy "Users can delete their own ZUNO state"
  on public.zuno_user_state
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Realtime is used to reflect updates made on another signed-in device.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'zuno_user_state'
  ) then
    alter publication supabase_realtime add table public.zuno_user_state;
  end if;
end
$$;
