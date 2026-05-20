-- Phase 37: System health page
-- Additive platform error and job logs for Super Admin health monitoring.

create table if not exists public.system_error_logs (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'frontend',
  severity text not null default 'warning' check (severity in ('info', 'warning', 'critical')),
  message text not null,
  details jsonb not null default '{}'::jsonb,
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.system_jobs (
  id uuid primary key default gen_random_uuid(),
  job_type text not null,
  status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed', 'retrying', 'cancelled')),
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 3 check (max_attempts > 0),
  payload jsonb not null default '{}'::jsonb,
  last_error text,
  run_after timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.system_error_logs enable row level security;
alter table public.system_jobs enable row level security;

drop policy if exists "system error logs super admin all" on public.system_error_logs;
create policy "system error logs super admin all"
  on public.system_error_logs for all
  to authenticated
  using (public.is_super_admin(auth.uid()))
  with check (public.is_super_admin(auth.uid()));

drop policy if exists "system jobs super admin all" on public.system_jobs;
create policy "system jobs super admin all"
  on public.system_jobs for all
  to authenticated
  using (public.is_super_admin(auth.uid()))
  with check (public.is_super_admin(auth.uid()));

drop trigger if exists set_system_jobs_updated_at on public.system_jobs;
create trigger set_system_jobs_updated_at
before update on public.system_jobs
for each row execute function public.set_updated_at();

create index if not exists system_error_logs_created_at_idx on public.system_error_logs(created_at desc);
create index if not exists system_error_logs_severity_idx on public.system_error_logs(severity, created_at desc);
create index if not exists system_error_logs_unresolved_idx on public.system_error_logs(created_at desc) where resolved_at is null;
create index if not exists system_jobs_status_idx on public.system_jobs(status, run_after);
create index if not exists system_jobs_failed_idx on public.system_jobs(created_at desc) where status = 'failed';

create or replace function public.log_system_error(
  p_source text,
  p_severity text,
  p_message text,
  p_details jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is not null and not public.is_super_admin(auth.uid()) then
    raise exception 'Only super admins can write system errors' using errcode = 'P0001';
  end if;

  insert into public.system_error_logs (source, severity, message, details)
  values (
    coalesce(nullif(p_source, ''), 'system'),
    case when p_severity in ('info', 'warning', 'critical') then p_severity else 'warning' end,
    coalesce(nullif(p_message, ''), 'Unspecified system error'),
    coalesce(p_details, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.retry_system_job(p_job_id uuid)
returns public.system_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.system_jobs;
begin
  if not public.is_super_admin(auth.uid()) then
    raise exception 'Only super admins can retry system jobs' using errcode = 'P0001';
  end if;

  update public.system_jobs
  set status = 'retrying',
      attempts = attempts + 1,
      run_after = now(),
      started_at = null,
      completed_at = null,
      last_error = null
  where id = p_job_id
    and status in ('failed', 'cancelled')
  returning * into v_job;

  if v_job.id is null then
    raise exception 'Job is not retryable' using errcode = 'P0001';
  end if;

  return v_job;
end;
$$;

grant execute on function public.log_system_error(text, text, text, jsonb) to authenticated;
grant execute on function public.retry_system_job(uuid) to authenticated;
