-- ToolPilot only: explicit confirmation, cross-source deduplication and suppression.
alter table public.toolpilot_leads add column if not exists confirmed_at timestamptz;
create table if not exists public.toolpilot_email_suppressions (
 email text primary key check(email=lower(btrim(email))),
 reason text not null check(reason in ('bounce','unsubscribe','complaint')),
 created_at timestamptz not null default now()
);
alter table public.toolpilot_email_suppressions enable row level security;
revoke all on public.toolpilot_email_suppressions from public, anon, authenticated;
grant select, insert, update on public.toolpilot_email_suppressions to service_role;
insert into public.toolpilot_email_suppressions(email,reason)
values ('support@ultimatefreetools.com','bounce') on conflict(email) do nothing;
create or replace view public.toolpilot_confirmed_buyers with (security_invoker=true) as
select distinct on (lower(btrim(l.email))) lower(btrim(l.email)) as email,
 l.id as lead_id, l.confirmed_at, l.source, l.locale
from public.toolpilot_leads l
where l.consent is true and l.confirmed_at is not null and l.unsubscribed is not true
and not exists(select 1 from public.toolpilot_leads x where lower(btrim(x.email))=lower(btrim(l.email)) and x.unsubscribed is true)
and not exists(select 1 from public.toolpilot_email_suppressions s where s.email=lower(btrim(l.email)))
order by lower(btrim(l.email)), l.confirmed_at desc, l.id desc;
revoke all on public.toolpilot_confirmed_buyers from public, anon, authenticated;
grant select on public.toolpilot_confirmed_buyers to service_role;
-- Test using reserved .invalid addresses; subtransaction always rolls back fixtures.
do $test$
begin
 begin
  insert into public.toolpilot_leads(email,consent,source,locale,confirmed_at) values
  ('toolpilot-qa-a@example.invalid',true,'qa-1','en',null),
  ('toolpilot-qa-b@example.invalid',true,'qa-1','en',now()),
  ('toolpilot-qa-b@example.invalid',true,'qa-2','en',now()),
  ('toolpilot-qa-c@example.invalid',true,'qa-1','en',now()),
  ('toolpilot-qa-d@example.invalid',true,'qa-1','en',now()),
  ('toolpilot-qa-d@example.invalid',true,'qa-2','en',null);
  insert into public.toolpilot_email_suppressions(email,reason) values ('toolpilot-qa-c@example.invalid','bounce');
  update public.toolpilot_leads set unsubscribed=true where email='toolpilot-qa-d@example.invalid' and source='qa-2';
  if (select count(*) from public.toolpilot_confirmed_buyers where email like 'toolpilot-qa-%@example.invalid') <> 1 then raise exception 'buyer eligibility failed'; end if;
  if not exists(select 1 from public.toolpilot_confirmed_buyers where email='toolpilot-qa-b@example.invalid') then raise exception 'deduplication failed'; end if;
  if has_table_privilege('anon','public.toolpilot_confirmed_buyers','SELECT') or has_table_privilege('authenticated','public.toolpilot_confirmed_buyers','SELECT') then raise exception 'buyer view exposed'; end if;
  raise exception using errcode='TP001', message='fixtures rollback';
 exception when sqlstate 'TP001' then null;
 end;
end $test$;
