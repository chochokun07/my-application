-- Existing schema baseline
-- The current database schema was applied before migration tracking began.
-- This migration records the starting point without recreating existing tables.
do $$
declare
  missing_tables text[];
begin
  select array_agg(table_name order by table_name)
    into missing_tables
  from unnest(array[
    'tasks',
    'research_plans',
    'research_schedules',
    'work_events',
    'script_projects',
    'script_chapters',
    'script_dialogue_lines',
    'script_speakers',
    'project_concepts',
    'identity_concept_items',
    'research_page_settings',
    'research_packets',
    'research_consultations',
    'notes'
  ]::text[]) as required(table_name)
  where to_regclass('public.' || required.table_name) is null;

  if missing_tables is not null then
    raise exception 'Baseline check failed. Missing public tables: %', array_to_string(missing_tables, ', ');
  end if;
end
$$;
