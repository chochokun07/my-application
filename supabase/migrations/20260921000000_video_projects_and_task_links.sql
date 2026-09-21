-- Video project lifecycle and task associations

alter table public.script_projects
  add column if not exists status text not null default 'active';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.script_projects'::regclass
      and conname = 'script_projects_status_check'
  ) then
    alter table public.script_projects
      add constraint script_projects_status_check check (status in ('active', 'completed'));
  end if;
end
$$;

alter table public.tasks
  add column if not exists script_project_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.tasks'::regclass
      and conname = 'tasks_script_project_id_fkey'
  ) then
    alter table public.tasks
      add constraint tasks_script_project_id_fkey
      foreign key (script_project_id)
      references public.script_projects(id)
      on delete set null;
  end if;
end
$$;

create index if not exists tasks_script_project_id_idx
  on public.tasks (user_id, script_project_id);

create index if not exists tasks_script_project_id_fkey_idx
  on public.tasks (script_project_id);
