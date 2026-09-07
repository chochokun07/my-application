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

create index if not exists tasks_user_id_created_at_idx
  on public.tasks (user_id, created_at desc);

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
