#!/usr/bin/env bash
# Session 1 migration runner for Agent OS against staffarmy-prod.
# Requires SUPABASE_DB_URL (direct Postgres connection string) in the environment.
#
#   export SUPABASE_DB_URL="postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres"
#   ./run_migrations.sh
#
set -euo pipefail

if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
  echo "ERROR: SUPABASE_DB_URL is not set." >&2
  echo "Export the direct Postgres connection string for the staffarmy-prod project first." >&2
  exit 1
fi

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/migrations"

for f in \
  000_preflight.sql \
  001_workspaces.sql \
  002_wis_agents.sql \
  003_agent_keys.sql \
  004_agent_tools.sql \
  005_workflows.sql \
  006_workflow_runs.sql \
  007_improvements.sql \
  008_agent_builds.sql \
  009_agent_attributes.sql \
  010_agent_development_log.sql \
  011_departments.sql \
  012_infrastructures.sql \
  013_platform_tables.sql \
  014_communication_layer.sql \
  015_a2a_training.sql
do
  echo "==> Applying $f"
  psql "$SUPABASE_DB_URL" --single-transaction -v ON_ERROR_STOP=1 -f "$DIR/$f"
done

echo "==> Running verification queries"
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f "$(dirname "$DIR")/verification.sql"

echo "All migrations applied and verification queries executed."
