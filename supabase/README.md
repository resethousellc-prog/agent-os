# Session 1 — Supabase Schema (staffarmy-prod)

These 15 migrations (+ pre-flight) build the Agent OS operational schema against the
**existing** `staffarmy-prod` Supabase project. Do **not** create a new Supabase project.

## Files (run in order)

```
000_preflight.sql            trigger_set_updated_at()
001_workspaces.sql           workspaces + PostArmy seed row
002_wis_agents.sql           wis_agents + 3 indexes
003_agent_keys.sql           agent_keys
004_agent_tools.sql          agent_tools + 31 tools seeded
005_workflows.sql            workflows
006_workflow_runs.sql        workflow_runs
007_improvements.sql         improvements
008_agent_builds.sql         agent_builds
009_agent_attributes.sql     agent_attributes
010_agent_development_log.sql agent_development_log
011_departments.sql          departments + 22 departments seeded
012_infrastructures.sql      infrastructure_templates + infrastructures
013_platform_tables.sql      platform_connections, platform_actions_log (partitioned 2026/2027),
                             geelark_cells, ghl_entities
014_communication_layer.sql  interaction_loops, interaction_threads, agent_messages,
                             agent_chemistry, escalations, loop_performance
015_a2a_training.sql         a2a_tasks, training_scenarios, training_results, agent_prompt_versions
verification.sql             the 7 verification queries
```

## How to run

### Option A — psql with the direct Postgres connection string

```bash
export SUPABASE_DB_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"
./run_migrations.sh
```

`run_migrations.sh` applies `000`–`015` in order (each wrapped in a transaction) and then
runs `verification.sql`, printing the results of all 7 checks.

### Option B — Supabase Studio SQL editor

Paste each file's contents in order (000 → 015), then paste `verification.sql` and confirm:

| # | Check | Expected |
|---|-------|----------|
| 1 | PostArmy workspace | 1 row, `PostArmy Inc.`, `white_label` |
| 2 | departments count | 22 |
| 3 | agent_tools count | **31** (checklist says 30 — 31 is correct) |
| 4 | tool breakdown | bullmq=3, comms=8, geelark=4, ghl=5, s3=2, supabase=2, wis=5 |
| 5 | table-name count | 27 distinct names (incl. 2026/2027 partitions) |
| 6 | RLS | `rowsecurity = true` on every row |
| 7 | Realtime | `relreplident = 'f'` on `agent_messages` + `interaction_threads` |

> NOTE: migrations are idempotent where practical (`CREATE TABLE IF NOT EXISTS`,
> `ON CONFLICT DO NOTHING`, `CREATE OR REPLACE FUNCTION`). The `CREATE POLICY`,
> `CREATE INDEX`, `CREATE TRIGGER`, and partition `CREATE TABLE` statements are not
> guarded, so a clean run against a project that does not already have these objects is
> assumed. If re-running, drop the objects first or ignore "already exists" errors.
