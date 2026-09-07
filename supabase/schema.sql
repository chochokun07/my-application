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
