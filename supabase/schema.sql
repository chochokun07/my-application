-- My application v0.1
-- Supabase SQL Editorで一度だけ実行してください。

create extension if not exists pgcrypto;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 120),
  memo text,
  status text not null default 'todo'
    check (status in ('todo', 'in_progress', 'on_hold', 'completed')),
  due_date date,
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high')),
  tags text[] not null default '{}',
  created_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  reminder_at timestamptz,
  reminder_enabled boolean not null default false,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.tasks
  add column if not exists tags text[] not null default '{}';

alter table public.tasks
  add column if not exists research_report text;

create table if not exists public.research_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 120),
  objective text,
  status text not null default 'active'
    check (status in ('idea', 'active', 'paused', 'completed')),
  target_date date,
  next_action text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.research_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 120),
  scheduled_at timestamptz not null,
  kind text not null default 'experiment'
    check (kind in ('experiment', 'meeting', 'deadline', 'other')),
  plan_id uuid references public.research_plans(id) on delete set null,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.research_plans
  add column if not exists origin_facts text;

alter table public.research_plans
  add column if not exists hypothesis text;

alter table public.research_plans
  add column if not exists hypothesis_basis text;

alter table public.tasks
  add column if not exists is_research boolean not null default false;

alter table public.tasks
  add column if not exists research_plan_id uuid references public.research_plans(id) on delete set null;

update public.tasks
set is_research = true
where research_plan_id is not null
  and is_research = false;

create index if not exists tasks_user_id_created_at_idx
  on public.tasks (user_id, created_at desc);

create index if not exists tasks_research_plan_id_idx
  on public.tasks (user_id, research_plan_id);

create index if not exists research_plans_user_id_updated_at_idx
  on public.research_plans (user_id, updated_at desc);

create index if not exists research_schedules_user_id_scheduled_at_idx
  on public.research_schedules (user_id, scheduled_at asc);

alter table public.tasks enable row level security;

drop policy if exists "Users can view their own tasks" on public.tasks;
create policy "Users can view their own tasks"
  on public.tasks for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own tasks" on public.tasks;
create policy "Users can create their own tasks"
  on public.tasks for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own tasks" on public.tasks;
create policy "Users can update their own tasks"
  on public.tasks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own tasks" on public.tasks;
create policy "Users can delete their own tasks"
  on public.tasks for delete
  using (auth.uid() = user_id);

alter table public.research_plans enable row level security;

drop policy if exists "Users can view their own research plans" on public.research_plans;
create policy "Users can view their own research plans"
  on public.research_plans for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own research plans" on public.research_plans;
create policy "Users can create their own research plans"
  on public.research_plans for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own research plans" on public.research_plans;
create policy "Users can update their own research plans"
  on public.research_plans for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own research plans" on public.research_plans;
create policy "Users can delete their own research plans"
  on public.research_plans for delete
  using (auth.uid() = user_id);

alter table public.research_schedules enable row level security;

drop policy if exists "Users can view their own research schedules" on public.research_schedules;
create policy "Users can view their own research schedules"
  on public.research_schedules for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own research schedules" on public.research_schedules;
create policy "Users can create their own research schedules"
  on public.research_schedules for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own research schedules" on public.research_schedules;
create policy "Users can update their own research schedules"
  on public.research_schedules for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own research schedules" on public.research_schedules;
create policy "Users can delete their own research schedules"
  on public.research_schedules for delete
  using (auth.uid() = user_id);

create or replace function public.set_tasks_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function public.set_tasks_updated_at();

create or replace function public.set_research_plans_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists research_plans_set_updated_at on public.research_plans;
create trigger research_plans_set_updated_at
before update on public.research_plans
for each row execute function public.set_research_plans_updated_at();

create or replace function public.set_research_schedules_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists research_schedules_set_updated_at on public.research_schedules;
create trigger research_schedules_set_updated_at
before update on public.research_schedules
for each row execute function public.set_research_schedules_updated_at();

-- 趣味: 動画プロジェクト、構想、台本
create table if not exists public.script_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 160),
  concept_type text not null default 'generic'
    check (concept_type in ('generic', 'identity_prediction')),
  output_template text not null default '{speaker}「{body}」',
  chars_per_minute integer not null default 300
    check (chars_per_minute between 1 and 2000),
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.script_chapters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.script_projects(id) on delete cascade,
  position integer not null default 1 check (position > 0),
  name text not null check (char_length(trim(name)) between 1 and 160),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.script_dialogue_lines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  chapter_id uuid not null references public.script_chapters(id) on delete cascade,
  position integer not null default 1 check (position > 0),
  speaker text not null default '',
  body text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.script_speakers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  position integer not null default 1 check (position > 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.project_concepts (
  project_id uuid primary key references public.script_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  concept_type text not null default 'generic'
    check (concept_type in ('generic', 'identity_prediction')),
  tool_key text,
  body text,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.identity_concept_items (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.script_projects(id) on delete cascade,
  target_id text not null,
  section_id text not null,
  field_key text,
  label text not null,
  placeholder text not null default '',
  position integer not null default 1 check (position > 0),
  body text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists identity_concept_items_fixed_field_idx
  on public.identity_concept_items (project_id, target_id, section_id, field_key)
  where field_key is not null;

alter table public.script_projects
  add column if not exists position integer not null default 0 check (position >= 0);

create index if not exists script_projects_user_position_idx
  on public.script_projects (user_id, position);

create index if not exists script_projects_user_updated_idx
  on public.script_projects (user_id, updated_at desc);

create index if not exists script_chapters_project_position_idx
  on public.script_chapters (project_id, position);

create index if not exists script_dialogue_lines_chapter_position_idx
  on public.script_dialogue_lines (chapter_id, position);

create index if not exists script_speakers_user_position_idx
  on public.script_speakers (user_id, position);

create index if not exists identity_concept_items_project_target_section_idx
  on public.identity_concept_items (project_id, target_id, section_id, position);

alter table public.script_projects enable row level security;
drop policy if exists "script_projects_select_own" on public.script_projects;
create policy "script_projects_select_own" on public.script_projects for select using (auth.uid() = user_id);
drop policy if exists "script_projects_insert_own" on public.script_projects;
create policy "script_projects_insert_own" on public.script_projects for insert with check (auth.uid() = user_id);
drop policy if exists "script_projects_update_own" on public.script_projects;
create policy "script_projects_update_own" on public.script_projects for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "script_projects_delete_own" on public.script_projects;
create policy "script_projects_delete_own" on public.script_projects for delete using (auth.uid() = user_id);

alter table public.script_chapters enable row level security;
drop policy if exists "script_chapters_select_own" on public.script_chapters;
create policy "script_chapters_select_own" on public.script_chapters for select using (auth.uid() = user_id);
drop policy if exists "script_chapters_insert_own" on public.script_chapters;
create policy "script_chapters_insert_own" on public.script_chapters for insert with check (auth.uid() = user_id);
drop policy if exists "script_chapters_update_own" on public.script_chapters;
create policy "script_chapters_update_own" on public.script_chapters for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "script_chapters_delete_own" on public.script_chapters;
create policy "script_chapters_delete_own" on public.script_chapters for delete using (auth.uid() = user_id);

alter table public.script_dialogue_lines enable row level security;
drop policy if exists "script_dialogue_lines_select_own" on public.script_dialogue_lines;
create policy "script_dialogue_lines_select_own" on public.script_dialogue_lines for select using (auth.uid() = user_id);
drop policy if exists "script_dialogue_lines_insert_own" on public.script_dialogue_lines;
create policy "script_dialogue_lines_insert_own" on public.script_dialogue_lines for insert with check (auth.uid() = user_id);
drop policy if exists "script_dialogue_lines_update_own" on public.script_dialogue_lines;
create policy "script_dialogue_lines_update_own" on public.script_dialogue_lines for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "script_dialogue_lines_delete_own" on public.script_dialogue_lines;
create policy "script_dialogue_lines_delete_own" on public.script_dialogue_lines for delete using (auth.uid() = user_id);

alter table public.script_speakers enable row level security;
drop policy if exists "script_speakers_select_own" on public.script_speakers;
create policy "script_speakers_select_own" on public.script_speakers for select using (auth.uid() = user_id);
drop policy if exists "script_speakers_insert_own" on public.script_speakers;
create policy "script_speakers_insert_own" on public.script_speakers for insert with check (auth.uid() = user_id);
drop policy if exists "script_speakers_update_own" on public.script_speakers;
create policy "script_speakers_update_own" on public.script_speakers for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "script_speakers_delete_own" on public.script_speakers;
create policy "script_speakers_delete_own" on public.script_speakers for delete using (auth.uid() = user_id);

alter table public.project_concepts enable row level security;
drop policy if exists "project_concepts_select_own" on public.project_concepts;
create policy "project_concepts_select_own" on public.project_concepts for select using (auth.uid() = user_id);
drop policy if exists "project_concepts_insert_own" on public.project_concepts;
create policy "project_concepts_insert_own" on public.project_concepts for insert with check (auth.uid() = user_id);
drop policy if exists "project_concepts_update_own" on public.project_concepts;
create policy "project_concepts_update_own" on public.project_concepts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "project_concepts_delete_own" on public.project_concepts;
create policy "project_concepts_delete_own" on public.project_concepts for delete using (auth.uid() = user_id);

alter table public.identity_concept_items enable row level security;
drop policy if exists "identity_concept_items_select_own" on public.identity_concept_items;
create policy "identity_concept_items_select_own" on public.identity_concept_items for select using (auth.uid() = user_id);
drop policy if exists "identity_concept_items_insert_own" on public.identity_concept_items;
create policy "identity_concept_items_insert_own" on public.identity_concept_items for insert with check (auth.uid() = user_id);
drop policy if exists "identity_concept_items_update_own" on public.identity_concept_items;
create policy "identity_concept_items_update_own" on public.identity_concept_items for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "identity_concept_items_delete_own" on public.identity_concept_items;
create policy "identity_concept_items_delete_own" on public.identity_concept_items for delete using (auth.uid() = user_id);

create or replace function public.set_hobby_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists script_projects_set_updated_at on public.script_projects;
create trigger script_projects_set_updated_at before update on public.script_projects for each row execute function public.set_hobby_updated_at();

drop trigger if exists script_chapters_set_updated_at on public.script_chapters;
create trigger script_chapters_set_updated_at before update on public.script_chapters for each row execute function public.set_hobby_updated_at();

drop trigger if exists script_dialogue_lines_set_updated_at on public.script_dialogue_lines;
create trigger script_dialogue_lines_set_updated_at before update on public.script_dialogue_lines for each row execute function public.set_hobby_updated_at();

drop trigger if exists script_speakers_set_updated_at on public.script_speakers;
create trigger script_speakers_set_updated_at before update on public.script_speakers for each row execute function public.set_hobby_updated_at();

drop trigger if exists project_concepts_set_updated_at on public.project_concepts;
create trigger project_concepts_set_updated_at before update on public.project_concepts for each row execute function public.set_hobby_updated_at();

drop trigger if exists identity_concept_items_set_updated_at on public.identity_concept_items;
create trigger identity_concept_items_set_updated_at before update on public.identity_concept_items for each row execute function public.set_hobby_updated_at();

-- 研究サーバー連携: 軽量な要約・同期時刻・Research Packetメタ情報のみ
-- サーバーURL、アクセストークン、研究ファイル本文、Packet本文、Sol回答全文は保存しない。
create table if not exists public.research_page_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state_summary text,
  last_sync_at timestamptz,
  last_record_title text,
  server_label text,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.research_packets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  problem text not null,
  source_files text[] not null default '{}',
  generated_by text not null default 'local-server',
  status text not null default 'draft'
    check (status in ('draft', 'sent_to_sol', 'reviewed', 'adopted', 'rejected')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.research_consultations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  packet_id uuid not null references public.research_packets(id) on delete cascade,
  status text not null default 'draft'
    check (status in ('draft', 'adopted', 'rejected')),
  response_excerpt text,
  adopted_record_path text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, packet_id)
);

create index if not exists research_packets_user_created_idx
  on public.research_packets (user_id, created_at desc);

create index if not exists research_consultations_user_updated_idx
  on public.research_consultations (user_id, updated_at desc);

alter table public.research_page_settings enable row level security;
alter table public.research_packets enable row level security;
alter table public.research_consultations enable row level security;

drop policy if exists "research_page_settings_select_own" on public.research_page_settings;
create policy "research_page_settings_select_own" on public.research_page_settings for select using (auth.uid() = user_id);
drop policy if exists "research_page_settings_insert_own" on public.research_page_settings;
create policy "research_page_settings_insert_own" on public.research_page_settings for insert with check (auth.uid() = user_id);
drop policy if exists "research_page_settings_update_own" on public.research_page_settings;
create policy "research_page_settings_update_own" on public.research_page_settings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "research_page_settings_delete_own" on public.research_page_settings;
create policy "research_page_settings_delete_own" on public.research_page_settings for delete using (auth.uid() = user_id);

drop policy if exists "research_packets_select_own" on public.research_packets;
create policy "research_packets_select_own" on public.research_packets for select using (auth.uid() = user_id);
drop policy if exists "research_packets_insert_own" on public.research_packets;
create policy "research_packets_insert_own" on public.research_packets for insert with check (auth.uid() = user_id);
drop policy if exists "research_packets_update_own" on public.research_packets;
create policy "research_packets_update_own" on public.research_packets for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "research_packets_delete_own" on public.research_packets;
create policy "research_packets_delete_own" on public.research_packets for delete using (auth.uid() = user_id);

drop policy if exists "research_consultations_select_own" on public.research_consultations;
create policy "research_consultations_select_own" on public.research_consultations for select using (auth.uid() = user_id);
drop policy if exists "research_consultations_insert_own" on public.research_consultations;
create policy "research_consultations_insert_own" on public.research_consultations for insert with check (auth.uid() = user_id);
drop policy if exists "research_consultations_update_own" on public.research_consultations;
create policy "research_consultations_update_own" on public.research_consultations for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "research_consultations_delete_own" on public.research_consultations;
create policy "research_consultations_delete_own" on public.research_consultations for delete using (auth.uid() = user_id);

drop trigger if exists research_page_settings_set_updated_at on public.research_page_settings;
create trigger research_page_settings_set_updated_at before update on public.research_page_settings for each row execute function public.set_hobby_updated_at();
drop trigger if exists research_packets_set_updated_at on public.research_packets;
create trigger research_packets_set_updated_at before update on public.research_packets for each row execute function public.set_hobby_updated_at();
drop trigger if exists research_consultations_set_updated_at on public.research_consultations;
create trigger research_consultations_set_updated_at before update on public.research_consultations for each row execute function public.set_hobby_updated_at();
