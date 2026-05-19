-- Phase 21: Retention automation.
-- Additive automation rules, previews, send logs, and notification-module gated execution.

create table if not exists public.retention_automation_rules (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  rule_key text not null,
  name text not null,
  description text,
  trigger_type text not null,
  condition_config jsonb not null default '{}'::jsonb,
  notification_type text not null,
  channel text not null default 'whatsapp' check (channel in ('email', 'whatsapp', 'telegram', 'sms', 'in_app')),
  template_id uuid references public.notification_templates(id) on delete set null,
  is_enabled boolean not null default true,
  last_run_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, rule_key)
);

create table if not exists public.retention_automation_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  rule_id uuid references public.retention_automation_rules(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  action_type text not null check (action_type in ('preview', 'send', 'skip', 'fail')),
  status text not null check (status in ('previewed', 'sent', 'skipped', 'failed')),
  notification_id uuid references public.notifications(id) on delete set null,
  channel text check (channel is null or channel in ('email', 'whatsapp', 'telegram', 'sms', 'in_app')),
  recipient text,
  message_preview text,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists retention_rules_business_enabled_idx
  on public.retention_automation_rules(business_id, is_enabled, trigger_type);
create index if not exists retention_logs_business_created_idx
  on public.retention_automation_logs(business_id, created_at desc);
create index if not exists retention_logs_rule_customer_idx
  on public.retention_automation_logs(rule_id, customer_id, status, created_at desc)
  where customer_id is not null;

drop trigger if exists set_retention_automation_rules_updated_at on public.retention_automation_rules;
create trigger set_retention_automation_rules_updated_at
before update on public.retention_automation_rules
for each row execute function public.set_updated_at();

alter table public.retention_automation_rules enable row level security;
alter table public.retention_automation_logs enable row level security;

drop policy if exists "retention automation rules tenant read" on public.retention_automation_rules;
create policy "retention automation rules tenant read" on public.retention_automation_rules
for select to authenticated
using (
  public.has_business_access(business_id)
  and public.has_module_access(business_id, 'notification')
  and public.has_staff_permission(business_id, 'notifications.manage')
);

drop policy if exists "retention automation rules tenant write" on public.retention_automation_rules;
create policy "retention automation rules tenant write" on public.retention_automation_rules
for all to authenticated
using (
  public.has_business_access(business_id)
  and public.has_module_access(business_id, 'notification')
  and public.has_staff_permission(business_id, 'notifications.manage')
)
with check (
  public.has_business_access(business_id)
  and public.has_module_access(business_id, 'notification')
  and public.has_staff_permission(business_id, 'notifications.manage')
);

drop policy if exists "retention automation logs tenant read" on public.retention_automation_logs;
create policy "retention automation logs tenant read" on public.retention_automation_logs
for select to authenticated
using (
  public.has_business_access(business_id)
  and public.has_module_access(business_id, 'notification')
  and public.has_staff_permission(business_id, 'notifications.manage')
);

drop policy if exists "retention automation logs tenant insert" on public.retention_automation_logs;
create policy "retention automation logs tenant insert" on public.retention_automation_logs
for insert to authenticated
with check (
  public.has_business_access(business_id)
  and public.has_module_access(business_id, 'notification')
  and public.has_staff_permission(business_id, 'notifications.manage')
);

create or replace function public.seed_phase21_retention_automation(p_business_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_business_access(p_business_id) and not public.is_super_admin(auth.uid()) then
    raise exception 'Not allowed to seed retention automation' using errcode = 'P0001';
  end if;

  insert into public.notification_templates (business_id, notification_type, channel, subject, body, variables, is_default, is_active)
  values
    (p_business_id, 'inactive_customer_promo', 'whatsapp', null,
      'Hi {customer_name}, we miss you at {business_name}. Use {promo_code} on your next visit.',
      '["customer_name","business_name","promo_code"]'::jsonb, true, true),
    (p_business_id, 'membership_expiring_soon', 'whatsapp', null,
      'Hi {customer_name}, your {membership_name} at {business_name} expires on {expiry_date}. Reply to renew.',
      '["customer_name","business_name","membership_name","expiry_date"]'::jsonb, true, true),
    (p_business_id, 'birthday_reward', 'whatsapp', null,
      'Happy birthday month, {customer_name}! {business_name} has a reward for you: {reward_name}.',
      '["customer_name","business_name","reward_name"]'::jsonb, true, true),
    (p_business_id, 'no_show_follow_up', 'whatsapp', null,
      'Hi {customer_name}, we noticed you missed your booking at {business_name}. Reply here if you want to reschedule.',
      '["customer_name","business_name"]'::jsonb, true, true),
    (p_business_id, 'first_time_thank_you', 'whatsapp', null,
      'Hi {customer_name}, thank you for your first visit to {business_name}. We hope to see you again soon.',
      '["customer_name","business_name"]'::jsonb, true, true),
    (p_business_id, 'high_spender_vip_reward', 'whatsapp', null,
      'Hi {customer_name}, thank you for being one of {business_name}''s top customers. Your VIP reward: {reward_name}.',
      '["customer_name","business_name","reward_name"]'::jsonb, true, true)
  on conflict (business_id, notification_type, channel) do update set
    subject = excluded.subject,
    body = excluded.body,
    variables = excluded.variables,
    is_default = true,
    is_active = true,
    updated_at = now();

  insert into public.retention_automation_rules (
    business_id, rule_key, name, description, trigger_type, condition_config, notification_type, channel, created_by
  )
  values
    (p_business_id, 'inactive_30_days', 'Inactive 30 days promo', 'Find customers with no recent completed booking or POS sale and prepare a comeback promo.', 'scheduled',
      '{"inactive_days":30,"dedupe_days":30,"max_per_run":50,"promo_code":"WELCOME-BACK"}'::jsonb, 'inactive_customer_promo', 'whatsapp', auth.uid()),
    (p_business_id, 'membership_expiring_3_days', 'Membership expiring in 3 days', 'Remind active members before their plan expires.', 'scheduled',
      '{"days_before_expiry":3,"dedupe_days":7,"max_per_run":50}'::jsonb, 'membership_expiring_soon', 'whatsapp', auth.uid()),
    (p_business_id, 'birthday_this_month', 'Birthday this month reward', 'Send a birthday-month reward to customers with a birthday on file.', 'scheduled',
      '{"dedupe_days":330,"max_per_run":50,"reward_name":"Birthday reward"}'::jsonb, 'birthday_reward', 'whatsapp', auth.uid()),
    (p_business_id, 'no_show_follow_up', 'No-show follow-up', 'Follow up customers who recently missed a booking.', 'event',
      '{"lookback_days":7,"dedupe_days":14,"max_per_run":50}'::jsonb, 'no_show_follow_up', 'whatsapp', auth.uid()),
    (p_business_id, 'first_time_customer_thank_you', 'First-time customer thank you', 'Thank customers after their first completed visit.', 'event',
      '{"lookback_days":7,"dedupe_days":90,"max_per_run":50}'::jsonb, 'first_time_thank_you', 'whatsapp', auth.uid()),
    (p_business_id, 'high_spender_vip_reward', 'High spender VIP reward', 'Reward high-value customers based on lifetime spend.', 'scheduled',
      '{"min_total_spent":1000,"dedupe_days":90,"max_per_run":50,"reward_name":"VIP reward"}'::jsonb, 'high_spender_vip_reward', 'whatsapp', auth.uid())
  on conflict (business_id, rule_key) do update set
    name = excluded.name,
    description = excluded.description,
    trigger_type = excluded.trigger_type,
    notification_type = excluded.notification_type,
    updated_at = now();
end;
$$;

create or replace function public.retention_rule_customer_candidates(p_rule_id uuid)
returns table (
  customer_id uuid,
  customer_name text,
  phone text,
  email text,
  variables jsonb,
  reference_type text,
  reference_id uuid
)
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_rule public.retention_automation_rules%rowtype;
  v_business public.businesses%rowtype;
  v_limit int;
begin
  select * into v_rule from public.retention_automation_rules where id = p_rule_id;
  if not found then
    return;
  end if;

  if not public.business_has_module_access(v_rule.business_id, 'notification') then
    return;
  end if;

  select * into v_business from public.businesses where id = v_rule.business_id;
  v_limit := greatest(1, least(coalesce((v_rule.condition_config->>'max_per_run')::int, 50), 200));

  if v_rule.rule_key = 'inactive_30_days' then
    return query
    select c.id, c.full_name, c.phone, c.email,
      jsonb_build_object(
        'customer_name', coalesce(c.full_name, 'Customer'),
        'business_name', coalesce(v_business.name, 'Our business'),
        'promo_code', coalesce(v_rule.condition_config->>'promo_code', 'WELCOME-BACK')
      ),
      'customer'::text,
      c.id
    from public.customers c
    where c.business_id = v_rule.business_id
      and c.status = 'active'
      and (c.phone is not null or c.email is not null)
      and not exists (
        select 1 from public.bookings b
        where b.business_id = c.business_id
          and b.customer_id = c.id
          and b.status = 'completed'
          and b.booking_date >= current_date - (coalesce((v_rule.condition_config->>'inactive_days')::int, 30) * interval '1 day')
      )
      and not exists (
        select 1 from public.pos_orders po
        where po.business_id = c.business_id
          and po.customer_id = c.id
          and po.order_status = 'completed'
          and coalesce(po.completed_at, po.created_at) >= now() - (coalesce((v_rule.condition_config->>'inactive_days')::int, 30) * interval '1 day')
      )
    order by c.updated_at asc
    limit v_limit;
  elsif v_rule.rule_key = 'membership_expiring_3_days' then
    return query
    select c.id, c.full_name, c.phone, c.email,
      jsonb_build_object(
        'customer_name', coalesce(c.full_name, 'Customer'),
        'business_name', coalesce(v_business.name, 'Our business'),
        'membership_name', coalesce(mp.name, 'Membership'),
        'expiry_date', m.end_date::text
      ),
      'membership'::text,
      m.id
    from public.memberships m
    join public.customers c on c.id = m.customer_id
    join public.membership_plans mp on mp.id = m.plan_id
    where m.business_id = v_rule.business_id
      and m.status = 'active'
      and m.end_date = current_date + coalesce((v_rule.condition_config->>'days_before_expiry')::int, 3)
      and (c.phone is not null or c.email is not null)
    order by m.end_date asc
    limit v_limit;
  elsif v_rule.rule_key = 'birthday_this_month' then
    return query
    select c.id, c.full_name, c.phone, c.email,
      jsonb_build_object(
        'customer_name', coalesce(c.full_name, 'Customer'),
        'business_name', coalesce(v_business.name, 'Our business'),
        'reward_name', coalesce(v_rule.condition_config->>'reward_name', 'Birthday reward')
      ),
      'customer'::text,
      c.id
    from public.customers c
    where c.business_id = v_rule.business_id
      and c.status = 'active'
      and c.birthday is not null
      and extract(month from c.birthday) = extract(month from current_date)
      and (c.phone is not null or c.email is not null)
    order by c.birthday asc
    limit v_limit;
  elsif v_rule.rule_key = 'no_show_follow_up' then
    return query
    select c.id, c.full_name, c.phone, c.email,
      jsonb_build_object(
        'customer_name', coalesce(c.full_name, 'Customer'),
        'business_name', coalesce(v_business.name, 'Our business')
      ),
      'booking'::text,
      b.id
    from public.bookings b
    join public.customers c on c.id = b.customer_id
    where b.business_id = v_rule.business_id
      and b.status = 'no_show'
      and b.booking_date >= current_date - (coalesce((v_rule.condition_config->>'lookback_days')::int, 7) * interval '1 day')
      and (c.phone is not null or c.email is not null)
    order by b.booking_date desc
    limit v_limit;
  elsif v_rule.rule_key = 'first_time_customer_thank_you' then
    return query
    select c.id, c.full_name, c.phone, c.email,
      jsonb_build_object(
        'customer_name', coalesce(c.full_name, 'Customer'),
        'business_name', coalesce(v_business.name, 'Our business')
      ),
      'customer'::text,
      c.id
    from public.customers c
    where c.business_id = v_rule.business_id
      and c.status = 'active'
      and c.visit_count = 1
      and (c.phone is not null or c.email is not null)
      and c.updated_at >= now() - (coalesce((v_rule.condition_config->>'lookback_days')::int, 7) * interval '1 day')
    order by c.updated_at desc
    limit v_limit;
  elsif v_rule.rule_key = 'high_spender_vip_reward' then
    return query
    select c.id, c.full_name, c.phone, c.email,
      jsonb_build_object(
        'customer_name', coalesce(c.full_name, 'Customer'),
        'business_name', coalesce(v_business.name, 'Our business'),
        'reward_name', coalesce(v_rule.condition_config->>'reward_name', 'VIP reward')
      ),
      'customer'::text,
      c.id
    from public.customers c
    where c.business_id = v_rule.business_id
      and c.status = 'active'
      and c.total_spent >= coalesce((v_rule.condition_config->>'min_total_spent')::numeric, 1000)
      and (c.phone is not null or c.email is not null)
    order by c.total_spent desc
    limit v_limit;
  end if;
end;
$$;

create or replace function public.run_retention_automation_rule(
  p_rule_id uuid,
  p_preview boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rule public.retention_automation_rules%rowtype;
  v_template public.notification_templates%rowtype;
  v_candidate record;
  v_business_name text;
  v_message text;
  v_title text;
  v_recipient text;
  v_notification_id uuid;
  v_processed int := 0;
  v_sent int := 0;
  v_skipped int := 0;
  v_failed int := 0;
  v_dedupe_days int;
  v_results jsonb := '[]'::jsonb;
begin
  select * into v_rule from public.retention_automation_rules where id = p_rule_id;
  if not found then
    raise exception 'Retention automation rule not found' using errcode = 'P0001';
  end if;

  if auth.uid() is not null
    and not public.has_business_access(v_rule.business_id)
    and not public.is_super_admin(auth.uid())
  then
    raise exception 'Not allowed to run retention automation' using errcode = 'P0001';
  end if;

  if not public.business_has_module_access(v_rule.business_id, 'notification') then
    insert into public.retention_automation_logs (
      business_id, rule_id, action_type, status, reason, created_by
    )
    values (
      v_rule.business_id, v_rule.id, 'skip', 'skipped', 'Notification module is disabled.', auth.uid()
    );
    return jsonb_build_object('processed', 0, 'sent', 0, 'skipped', 1, 'failed', 0, 'results', v_results);
  end if;

  if not v_rule.is_enabled then
    insert into public.retention_automation_logs (
      business_id, rule_id, action_type, status, reason, created_by
    )
    values (
      v_rule.business_id, v_rule.id, 'skip', 'skipped', 'Automation rule is disabled.', auth.uid()
    );
    return jsonb_build_object('processed', 0, 'sent', 0, 'skipped', 1, 'failed', 0, 'results', v_results);
  end if;

  select name into v_business_name from public.businesses where id = v_rule.business_id;
  v_dedupe_days := coalesce((v_rule.condition_config->>'dedupe_days')::int, 30);

  select *
  into v_template
  from public.notification_templates
  where id = v_rule.template_id
    and business_id = v_rule.business_id
    and is_active = true;

  if not found then
    select *
    into v_template
    from public.notification_templates
    where business_id = v_rule.business_id
      and notification_type = v_rule.notification_type
      and channel = v_rule.channel
      and is_active = true
    limit 1;
  end if;

  for v_candidate in select * from public.retention_rule_customer_candidates(v_rule.id) loop
    v_processed := v_processed + 1;
    v_recipient := case
      when v_rule.channel = 'email' then nullif(v_candidate.email, '')
      when v_rule.channel in ('whatsapp', 'sms', 'telegram') then nullif(v_candidate.phone, '')
      else coalesce(nullif(v_candidate.email, ''), nullif(v_candidate.phone, ''))
    end;

    if v_recipient is null then
      v_skipped := v_skipped + 1;
      insert into public.retention_automation_logs (
        business_id, rule_id, customer_id, action_type, status, channel, reason, metadata, created_by
      )
      values (
        v_rule.business_id, v_rule.id, v_candidate.customer_id, 'skip', 'skipped', v_rule.channel,
        'Customer has no contact details for this channel.',
        jsonb_build_object('reference_type', v_candidate.reference_type, 'reference_id', v_candidate.reference_id),
        auth.uid()
      );
      continue;
    end if;

    if exists (
      select 1
      from public.retention_automation_logs ral
      where ral.rule_id = v_rule.id
        and ral.customer_id = v_candidate.customer_id
        and ral.status = 'sent'
        and ral.created_at >= now() - (v_dedupe_days * interval '1 day')
    ) then
      v_skipped := v_skipped + 1;
      insert into public.retention_automation_logs (
        business_id, rule_id, customer_id, action_type, status, channel, recipient, reason, metadata, created_by
      )
      values (
        v_rule.business_id, v_rule.id, v_candidate.customer_id, 'skip', 'skipped', v_rule.channel, v_recipient,
        'Customer already matched this automation within the dedupe window.',
        jsonb_build_object('dedupe_days', v_dedupe_days, 'reference_type', v_candidate.reference_type, 'reference_id', v_candidate.reference_id),
        auth.uid()
      );
      continue;
    end if;

    if v_template.id is not null then
      v_title := coalesce(public.render_notification_template_sql(v_template.subject, v_candidate.variables), replace(v_rule.notification_type, '_', ' '));
      v_message := public.render_notification_template_sql(v_template.body, v_candidate.variables);
    else
      v_title := replace(v_rule.notification_type, '_', ' ');
      v_message := coalesce(v_candidate.customer_name, 'Customer') || ', ' || coalesce(v_business_name, 'our business') || ' has an update for you.';
    end if;

    if p_preview then
      insert into public.retention_automation_logs (
        business_id, rule_id, customer_id, action_type, status, channel, recipient, message_preview, metadata, created_by
      )
      values (
        v_rule.business_id, v_rule.id, v_candidate.customer_id, 'preview', 'previewed', v_rule.channel, v_recipient, v_message,
        jsonb_build_object('reference_type', v_candidate.reference_type, 'reference_id', v_candidate.reference_id, 'variables', v_candidate.variables),
        auth.uid()
      );
      v_results := v_results || jsonb_build_array(jsonb_build_object('customer_id', v_candidate.customer_id, 'customer_name', v_candidate.customer_name, 'status', 'previewed', 'message', v_message));
    else
      v_notification_id := public.log_templated_notification_attempt(
        v_rule.business_id,
        v_candidate.customer_id,
        v_rule.notification_type,
        v_rule.channel,
        v_recipient,
        v_candidate.variables,
        v_candidate.reference_type,
        v_candidate.reference_id
      );

      if v_notification_id is null then
        v_failed := v_failed + 1;
        insert into public.retention_automation_logs (
          business_id, rule_id, customer_id, action_type, status, channel, recipient, message_preview, reason, metadata, created_by
        )
        values (
          v_rule.business_id, v_rule.id, v_candidate.customer_id, 'fail', 'failed', v_rule.channel, v_recipient, v_message,
          'Notification could not be created.',
          jsonb_build_object('reference_type', v_candidate.reference_type, 'reference_id', v_candidate.reference_id),
          auth.uid()
        );
      else
        v_sent := v_sent + 1;
        insert into public.retention_automation_logs (
          business_id, rule_id, customer_id, action_type, status, notification_id, channel, recipient, message_preview, metadata, created_by
        )
        values (
          v_rule.business_id, v_rule.id, v_candidate.customer_id, 'send', 'sent', v_notification_id, v_rule.channel, v_recipient, v_message,
          jsonb_build_object('reference_type', v_candidate.reference_type, 'reference_id', v_candidate.reference_id),
          auth.uid()
        );
        v_results := v_results || jsonb_build_array(jsonb_build_object('customer_id', v_candidate.customer_id, 'customer_name', v_candidate.customer_name, 'status', 'sent', 'notification_id', v_notification_id));
      end if;
    end if;
  end loop;

  if not p_preview then
    update public.retention_automation_rules
    set last_run_at = now()
    where id = v_rule.id;
  end if;

  return jsonb_build_object(
    'processed', v_processed,
    'sent', v_sent,
    'skipped', v_skipped,
    'failed', v_failed,
    'results', v_results
  );
end;
$$;

create or replace function public.handle_retention_booking_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rule_id uuid;
begin
  if not public.business_has_module_access(new.business_id, 'notification') then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status is distinct from new.status and new.status = 'no_show' then
    select id into v_rule_id
    from public.retention_automation_rules
    where business_id = new.business_id
      and rule_key = 'no_show_follow_up'
      and is_enabled = true
    limit 1;

    if v_rule_id is not null then
      perform public.run_retention_automation_rule(v_rule_id, false);
    end if;
  elsif tg_op = 'UPDATE' and old.status is distinct from new.status and new.status = 'completed' then
    select id into v_rule_id
    from public.retention_automation_rules
    where business_id = new.business_id
      and rule_key = 'first_time_customer_thank_you'
      and is_enabled = true
    limit 1;

    if v_rule_id is not null then
      perform public.run_retention_automation_rule(v_rule_id, false);
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists retention_booking_event_after_status on public.bookings;
create trigger retention_booking_event_after_status
  after update of status on public.bookings
  for each row execute function public.handle_retention_booking_event();

grant execute on function public.seed_phase21_retention_automation(uuid) to authenticated;
revoke execute on function public.retention_rule_customer_candidates(uuid) from public, anon, authenticated;
grant execute on function public.run_retention_automation_rule(uuid, boolean) to authenticated;
