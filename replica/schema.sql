-- BORRADOR NO EJECUTADO. Antes de aplicar, generar migración con Supabase CLI y probar en staging.
-- LINK TASK Fase B: planificación independiente, verificación real y vínculos.
begin;
alter table public.link_task_entries add column if not exists planned_for date;
alter table public.link_task_entries add column if not exists due_on date;
alter table public.link_task_entries add column if not exists position integer not null default 0;
alter table public.link_task_entries add column if not exists objective text;
alter table public.link_task_entries add column if not exists origin text;
alter table public.link_task_entries add column if not exists client_event_id text;
alter table public.link_task_entries drop constraint if exists link_task_entries_status_check;
alter table public.link_task_entries add constraint link_task_entries_status_check
  check (status in ('open','in_progress','verification','done','archived'));
alter table public.link_task_entries add constraint link_task_entries_verification_kind_check
  check (status <> 'verification' or kind='task');
alter table public.link_task_entries add constraint link_task_entries_position_check
  check (position between 0 and 1000000);
create index if not exists link_task_entries_plan_idx
  on public.link_task_entries (user_id, planned_for, position)
  where kind='task' and status <> 'archived';
create unique index if not exists link_task_entries_event_uq
  on public.link_task_entries (user_id, client_event_id) where client_event_id is not null;

create table if not exists public.link_task_task_links (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 task_entry_id uuid not null references public.link_task_entries(id) on delete cascade,
 related_entry_id uuid references public.link_task_entries(id) on delete cascade,
 related_session_id uuid references public.link_task_sessions(id) on delete cascade,
 created_at timestamptz not null default now(),
 constraint link_task_task_links_target_check check
   ((related_entry_id is not null)::integer + (related_session_id is not null)::integer = 1)
);
create unique index if not exists link_task_links_entry_uq on public.link_task_task_links(task_entry_id,related_entry_id)
  where related_entry_id is not null;
create unique index if not exists link_task_links_session_uq on public.link_task_task_links(task_entry_id,related_session_id)
  where related_session_id is not null;
create index if not exists link_task_links_owner_idx on public.link_task_task_links(user_id,task_entry_id);
alter table public.link_task_task_links enable row level security;
-- Policy verifies owner on both ends. No cross-user relationships even if IDs leak.
create policy link_task_links_read on public.link_task_task_links for select to authenticated
 using (
  user_id=(select auth.uid())
  and exists (select 1 from public.link_task_entries e where e.id=task_entry_id and e.user_id=(select auth.uid()) and e.kind='task')
  and (
   (related_entry_id is not null and exists
      (select 1 from public.link_task_entries e2 where e2.id=related_entry_id and e2.user_id=(select auth.uid()) and e2.kind='evidence'))
   or
   (related_session_id is not null and exists
      (select 1 from public.link_task_sessions s where s.id=related_session_id and s.user_id=(select auth.uid())))
  )
 );
create policy link_task_links_insert on public.link_task_task_links for insert to authenticated
 with check (
  user_id=(select auth.uid())
  and exists (select 1 from public.link_task_entries e where e.id=task_entry_id and e.user_id=(select auth.uid()) and e.kind='task')
  and (
   (related_entry_id is not null and exists
      (select 1 from public.link_task_entries e2 where e2.id=related_entry_id and e2.user_id=(select auth.uid()) and e2.kind='evidence'))
   or
   (related_session_id is not null and exists
      (select 1 from public.link_task_sessions s where s.id=related_session_id and s.user_id=(select auth.uid())))
  )
 );
create policy link_task_links_delete on public.link_task_task_links for delete to authenticated
 using (user_id=(select auth.uid()));
revoke all on public.link_task_task_links from anon, authenticated;
grant select,insert,delete on public.link_task_task_links to authenticated;
commit;
