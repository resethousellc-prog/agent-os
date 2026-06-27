-- MIGRATION 006 — workflow_runs

CREATE TABLE IF NOT EXISTS workflow_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id),
  workflow_id     UUID NOT NULL REFERENCES workflows(id),
  agent_id        UUID REFERENCES wis_agents(id),
  triggered_by    TEXT DEFAULT 'agent' CHECK (triggered_by IN ('agent','human','scheduler')),
  status          TEXT DEFAULT 'running' CHECK (status IN ('running','success','failed','partial')),
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  duration_ms     INTEGER,
  steps_completed INTEGER DEFAULT 0,
  steps_total     INTEGER DEFAULT 0,
  error_log       JSONB DEFAULT '[]'::JSONB,
  input_payload   JSONB DEFAULT '{}'::JSONB,
  output_payload  JSONB DEFAULT '{}'::JSONB,
  metadata        JSONB DEFAULT '{}'::JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE workflow_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workflow_runs_workspace" ON workflow_runs
  USING (workspace_id IN (
    SELECT id FROM workspaces WHERE owner_user_id = auth.uid()
  ));
CREATE INDEX idx_workflow_runs_workflow ON workflow_runs (workflow_id, started_at DESC);
CREATE INDEX idx_workflow_runs_agent    ON workflow_runs (agent_id);
CREATE INDEX idx_workflow_runs_status   ON workflow_runs (status, started_at DESC);
