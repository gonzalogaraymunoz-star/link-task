-- Acceptance: schema, statuses, uniqueness and RLS cross-owner isolation.
update public.link_task_entries set status='verification',planned_for=date '2026-10-27',
 objective='Comprobar',origin='ChatGPT' where id='33333333-3333-4333-8333-333333333333';
update public.link_task_entries set status='archived' where id='55555555-5555-4555-8555-555555555555';
do $checks$ begin
 if not exists(select 1 from public.link_task_entries where status='verification' and planned_for='2026-10-27')
 then raise exception 'verification status or planned_for invalid'; end if;
 if not exists(select 1 from public.link_task_entries where status='archived')
 then raise exception 'archive state disappeared'; end if;
end $checks$;
update public.link_task_entries set client_event_id='dedup-fixture' where id='33333333-3333-4333-8333-333333333333';
-- Duplicate attempt must fail on unique index:
do $unique$
begin
 begin
  update public.link_task_entries set client_event_id='dedup-fixture'
   where id='55555555-5555-4555-8555-555555555555'
    and user_id='11111111-1111-4111-8111-111111111111';
  -- same user different item is not present in fixture; test actual uniqueness with a new row
  insert into public.link_task_entries(user_id,kind,title,client_event_id)
   values ('11111111-1111-4111-8111-111111111111','task','A: dup','dedup-fixture');
  raise exception 'duplicate permitted';
 exception when unique_violation then null;
 end;
end $unique$;

set role authenticated;
set request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';
insert into public.link_task_task_links(user_id,task_entry_id,related_entry_id) values
 ('11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333333','44444444-4444-4444-8444-444444444444');
insert into public.link_task_task_links(user_id,task_entry_id,related_session_id) values
 ('11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333333','77777777-7777-4777-8777-777777777777');
do $a$ begin
 if (select count(*) from public.link_task_task_links)<>2
 then raise exception 'owner A cannot read both owned links'; end if;
 if exists(select 1 from public.link_task_entries where user_id='22222222-2222-4222-8222-222222222222')
 then raise exception 'owner A sees owner B entries'; end if;
end $a$;
-- A must not be able to link B's evidence, despite owning task:
do $isolate$
begin
 begin
  insert into public.link_task_task_links(user_id,task_entry_id,related_entry_id) values
   ('11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333333','66666666-6666-4666-8666-666666666666');
  raise exception 'CROSS_OWNER_INSERT_ALLOWED';
 exception when insufficient_privilege then null;
 end;
end $isolate$;
reset role;

set role authenticated;
set request.jwt.claim.sub='22222222-2222-4222-8222-222222222222';
do $b$ begin
 if exists(select 1 from public.link_task_task_links) then raise exception 'owner B sees owner A links'; end if;
end $b$;
-- User B cannot attach owner A task to any record:
do $isolate$
begin
 begin
  insert into public.link_task_task_links(user_id,task_entry_id,related_entry_id) values
   ('22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333','66666666-6666-4666-8666-666666666666');
  raise exception 'CROSS_OWNER_TASK_ALLOWED';
 exception when insufficient_privilege then null;
 end;
end $isolate$;
reset role;
select 'REPLICA_FASE_B_SCHEMA_AND_RLS_OK' as result;
