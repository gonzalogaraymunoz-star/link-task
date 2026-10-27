-- Test fixture ONLY: disposable PostgreSQL service, no personal data.
create schema if not exists auth;
create table auth.users (id uuid primary key);
create or replace function auth.uid() returns uuid
language sql stable as $fn$select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid$fn$;
do $roles$ begin
 if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
 if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
end $roles$;
grant usage on schema public,auth to authenticated;
grant execute on function auth.uid() to authenticated;
create table public.link_task_entries(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id),
 kind text not null check (kind in('task','evidence','conversation','decision')),
 status text not null default 'open',
 business text not null default 'LINK WORLD',
 title text not null,
 summary text not null default '',
 reference_url text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint link_task_entries_status_check check (status in('open','in_progress','done','archived'))
);
create table public.link_task_sessions(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id),
 title text not null
);
alter table public.link_task_entries enable row level security;
alter table public.link_task_sessions enable row level security;
create policy entry_select on public.link_task_entries for select to authenticated
 using (user_id=(select auth.uid()));
create policy session_select on public.link_task_sessions for select to authenticated
 using (user_id=(select auth.uid()));
grant select,insert,update,delete on public.link_task_entries,public.link_task_sessions to authenticated;
insert into auth.users(id) values
 ('11111111-1111-4111-8111-111111111111'),
 ('22222222-2222-4222-8222-222222222222');
insert into public.link_task_entries(id,user_id,kind,status,title) values
 ('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111','task','open','A: Task'),
 ('44444444-4444-4444-8444-444444444444','11111111-1111-4111-8111-111111111111','evidence','open','A: Evidence'),
 ('55555555-5555-4555-8555-555555555555','22222222-2222-4222-8222-222222222222','task','open','B: Task'),
 ('66666666-6666-4666-8666-666666666666','22222222-2222-4222-8222-222222222222','evidence','open','B: Evidence');
insert into public.link_task_sessions(id,user_id,title) values
 ('77777777-7777-4777-8777-777777777777','11111111-1111-4111-8111-111111111111','A: Session');
