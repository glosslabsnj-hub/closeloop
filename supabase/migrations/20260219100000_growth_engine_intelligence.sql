-- ============================================================
-- Growth Engine Intelligence & Bug Fixes
-- Adds: RPC functions, lead metadata on enrollments,
--        performance tracking, learning feedback loops,
--        email column on saved leads, RLS fixes
-- ============================================================

-- 0a. Add email column to admin_saved_leads (for outreach)
alter table admin_saved_leads
  add column if not exists email text;

-- 0b. Add email column to admin_reseller_leads (for outreach)
alter table admin_reseller_leads
  add column if not exists email text;

-- 0c. Update RLS on admin_saved_leads so super_admin can see ALL leads
-- (including auto-discovered ones saved by the system)
drop policy if exists "admin_saved_leads_user_access" on admin_saved_leads;
create policy "admin_saved_leads_access" on admin_saved_leads
  for all using (
    user_id = auth.uid()
    or exists (select 1 from user_roles where user_id = auth.uid() and role = 'super_admin')
  );

-- 1. Add lead_metadata JSONB to enrollments for rich personalization context
alter table admin_outreach_enrollments
  add column if not exists lead_metadata jsonb not null default '{}';

-- 2. Add configurable links to settings
alter table admin_growth_settings
  add column if not exists demo_link text not null default 'https://closeloop.ai',
  add column if not exists trial_link text not null default 'https://closeloop.ai/signup';

-- 3. Add performance tracking to sequences
alter table admin_outreach_sequences
  add column if not exists total_sent int not null default 0,
  add column if not exists total_responded int not null default 0,
  add column if not exists total_converted int not null default 0,
  add column if not exists avg_response_rate numeric(5,2) not null default 0;

-- 4. Add per-step performance tracking
alter table admin_outreach_sequence_steps
  add column if not exists total_sent int not null default 0,
  add column if not exists total_responded int not null default 0,
  add column if not exists response_rate numeric(5,2) not null default 0;

-- 5. Add discovery performance tracking to settings
alter table admin_growth_settings
  add column if not exists discovery_stats jsonb not null default '{}';
-- Shape: { "plumber:Austin TX": { "found": 50, "enrolled": 10, "responded": 3, "converted": 1 } }

-- 6. Add best_performing_industries/locations derived stats
alter table admin_growth_settings
  add column if not exists best_industries text[] not null default '{}',
  add column if not exists best_locations text[] not null default '{}';

-- 7. RPC: Atomic increment campaign enrolled count
create or replace function admin_increment_campaign_enrolled(p_campaign_id uuid, p_count int default 1)
returns void language plpgsql security definer as $$
begin
  update admin_outreach_campaigns
  set total_enrolled = total_enrolled + p_count,
      updated_at = now()
  where id = p_campaign_id;
end;
$$;

-- 8. RPC: Atomic increment campaign responded count
create or replace function admin_increment_campaign_responded(p_campaign_id uuid)
returns void language plpgsql security definer as $$
begin
  update admin_outreach_campaigns
  set total_responded = total_responded + 1,
      updated_at = now()
  where id = p_campaign_id;
end;
$$;

-- 9. RPC: Atomic increment campaign converted count
create or replace function admin_increment_campaign_converted(p_campaign_id uuid)
returns void language plpgsql security definer as $$
begin
  update admin_outreach_campaigns
  set total_converted = total_converted + 1,
      updated_at = now()
  where id = p_campaign_id;
end;
$$;

-- 10. RPC: Increment sequence performance stats
create or replace function admin_increment_sequence_sent(p_sequence_id uuid)
returns void language plpgsql security definer as $$
begin
  update admin_outreach_sequences
  set total_sent = total_sent + 1,
      updated_at = now()
  where id = p_sequence_id;
end;
$$;

create or replace function admin_increment_sequence_responded(p_sequence_id uuid)
returns void language plpgsql security definer as $$
begin
  update admin_outreach_sequences
  set total_responded = total_responded + 1,
      avg_response_rate = case
        when total_sent > 0 then round(((total_responded + 1)::numeric / total_sent) * 100, 2)
        else 0
      end,
      updated_at = now()
  where id = p_sequence_id;
end;
$$;

-- 11. RPC: Increment step-level performance
create or replace function admin_increment_step_sent(p_sequence_id uuid, p_step_order int)
returns void language plpgsql security definer as $$
begin
  update admin_outreach_sequence_steps
  set total_sent = total_sent + 1
  where sequence_id = p_sequence_id and step_order = p_step_order;
end;
$$;

create or replace function admin_increment_step_responded(p_sequence_id uuid, p_step_order int)
returns void language plpgsql security definer as $$
begin
  update admin_outreach_sequence_steps
  set total_responded = total_responded + 1,
      response_rate = case
        when total_sent > 0 then round(((total_responded + 1)::numeric / total_sent) * 100, 2)
        else 0
      end
  where sequence_id = p_sequence_id and step_order = p_step_order;
end;
$$;

-- 12. RPC: Update discovery stats for a given industry+location
create or replace function admin_update_discovery_stats(
  p_industry text,
  p_location text,
  p_found int default 0,
  p_enrolled int default 0,
  p_responded int default 0,
  p_converted int default 0
)
returns void language plpgsql security definer as $$
declare
  v_key text := p_industry || ':' || p_location;
  v_current jsonb;
  v_stats jsonb;
begin
  select discovery_stats into v_current
  from admin_growth_settings
  limit 1;

  v_stats := coalesce(v_current->v_key, '{}'::jsonb);
  v_stats := jsonb_build_object(
    'found', coalesce((v_stats->>'found')::int, 0) + p_found,
    'enrolled', coalesce((v_stats->>'enrolled')::int, 0) + p_enrolled,
    'responded', coalesce((v_stats->>'responded')::int, 0) + p_responded,
    'converted', coalesce((v_stats->>'converted')::int, 0) + p_converted,
    'last_run', now()
  );

  update admin_growth_settings
  set discovery_stats = coalesce(discovery_stats, '{}'::jsonb) || jsonb_build_object(v_key, v_stats),
      updated_at = now();
end;
$$;

-- 13. RPC: Get best performing discovery combos (for smart prioritization)
create or replace function admin_get_best_discovery_combos(p_limit int default 10)
returns table(combo text, found int, enrolled int, responded int, converted int, conversion_rate numeric)
language plpgsql security definer as $$
begin
  return query
  select
    key as combo,
    (value->>'found')::int as found,
    (value->>'enrolled')::int as enrolled,
    (value->>'responded')::int as responded,
    (value->>'converted')::int as converted,
    case when (value->>'enrolled')::int > 0
      then round(((value->>'converted')::numeric / (value->>'enrolled')::int) * 100, 2)
      else 0
    end as conversion_rate
  from admin_growth_settings, jsonb_each(discovery_stats)
  where (value->>'enrolled')::int > 0
  order by
    case when (value->>'enrolled')::int > 0
      then ((value->>'converted')::numeric / (value->>'enrolled')::int)
      else 0
    end desc
  limit p_limit;
end;
$$;

-- 14. Add social engagement tracking columns
alter table admin_social_posts
  add column if not exists likes int not null default 0,
  add column if not exists comments int not null default 0,
  add column if not exists shares int not null default 0,
  add column if not exists impressions int not null default 0,
  add column if not exists clicks int not null default 0;

-- 15. RPC: Mark enrollment as converted and cascade stats
create or replace function admin_mark_enrollment_converted(p_enrollment_id uuid)
returns void language plpgsql security definer as $$
declare
  v_enrollment record;
  v_campaign record;
  v_meta jsonb;
begin
  -- Get enrollment
  select * into v_enrollment
  from admin_outreach_enrollments
  where id = p_enrollment_id;

  if not found then return; end if;
  if v_enrollment.status = 'converted' then return; end if;

  -- Update enrollment status
  update admin_outreach_enrollments
  set status = 'converted', updated_at = now()
  where id = p_enrollment_id;

  -- Increment campaign converted count
  perform admin_increment_campaign_converted(v_enrollment.campaign_id);

  -- Get campaign for sequence_id
  select * into v_campaign
  from admin_outreach_campaigns
  where id = v_enrollment.campaign_id;

  if found then
    -- Increment sequence converted count
    update admin_outreach_sequences
    set total_converted = total_converted + 1,
        updated_at = now()
    where id = v_campaign.sequence_id;

    -- Update discovery stats if lead has metadata with industry+location
    v_meta := coalesce(v_enrollment.lead_metadata, '{}'::jsonb);
    if v_meta->>'industry' is not null and v_meta->>'location' is not null then
      perform admin_update_discovery_stats(
        v_meta->>'industry',
        v_meta->>'location',
        0, 0, 0, 1  -- just increment converted
      );
    end if;
  end if;

  -- Log activity
  insert into admin_growth_activity_log (activity_type, title, description, metadata)
  values (
    'conversion',
    v_enrollment.lead_name || ' converted!',
    'Lead converted from outreach campaign',
    jsonb_build_object(
      'enrollment_id', p_enrollment_id,
      'campaign_id', v_enrollment.campaign_id,
      'lead_name', v_enrollment.lead_name
    )
  );
end;
$$;
