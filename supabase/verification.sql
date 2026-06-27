-- SESSION 1 VERIFICATION QUERIES
-- Run all of these. Every one must return the expected result before proceeding to Session 3.

-- 1. PostArmy workspace exists
SELECT id, name, plan FROM workspaces WHERE id = '00000000-0000-0000-0000-000000000001';
-- Expected: 1 row, name='PostArmy Inc.', plan='white_label'

-- 2. All 22 departments seeded
SELECT COUNT(*) FROM departments WHERE workspace_id = '00000000-0000-0000-0000-000000000001';
-- Expected: 22

-- 3. All 31 tools seeded
SELECT COUNT(*) FROM agent_tools;
-- Expected: 31

-- 4. Tool breakdown by platform
SELECT platform, COUNT(*) FROM agent_tools GROUP BY platform ORDER BY platform;
-- Expected: bullmq=3, comms=8, geelark=4, ghl=5, s3=2, supabase=2, wis=5

-- 5. Total table count in public schema (Agent OS tables only — filter by name)
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'workspaces','wis_agents','agent_keys','agent_tools','workflows','workflow_runs',
  'improvements','agent_builds','agent_attributes','agent_development_log','departments',
  'infrastructure_templates','infrastructures','platform_connections','platform_actions_log',
  'geelark_cells','ghl_entities','interaction_loops','interaction_threads','agent_messages',
  'agent_chemistry','escalations','loop_performance','a2a_tasks','training_scenarios',
  'training_results','agent_prompt_versions'
);
-- Expected: 27 (26 logical tables + platform_actions_log_2026/2027 partitions count separately,
--   but the parent shows as 1, so 27 distinct table names)

-- 6. RLS enabled on all tables
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'workspaces','wis_agents','agent_keys','workflows','workflow_runs',
  'improvements','agent_builds','agent_attributes','agent_development_log','departments',
  'infrastructure_templates','infrastructures','platform_connections','platform_actions_log',
  'geelark_cells','ghl_entities','interaction_loops','interaction_threads','agent_messages',
  'agent_chemistry','escalations','loop_performance','a2a_tasks','training_scenarios',
  'training_results','agent_prompt_versions'
);
-- Expected: rowsecurity = TRUE for every row

-- 7. Realtime enabled on agent_messages + interaction_threads
SELECT relname, relreplident FROM pg_class
WHERE relname IN ('agent_messages','interaction_threads');
-- Expected: relreplident = 'f' (FULL) for both
