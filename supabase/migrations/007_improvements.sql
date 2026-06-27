-- MIGRATION 007 — improvements

CREATE TABLE IF NOT EXISTS improvements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id),
  workflow_id     UUID NOT NULL REFERENCES workflows(id),
  generated_by    TEXT DEFAULT 'scheduled_analysis' CHECK (generated_by IN (
    'scheduled_analysis','agent_request','human_request'
  )),
  analysis        TEXT,
  suggestions     JSONB DEFAULT '[]'::JSONB,
  impact_level    TEXT DEFAULT 'medium' CHECK (impact_level IN ('high','medium','low')),
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','applied','dismissed')),
  applied_version INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE improvements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "improvements_workspace" ON improvements
  USING (workspace_id IN (
    SELECT id FROM workspaces WHERE owner_user_id = auth.uid()
  ));
CREATE INDEX idx_improvements_workflow ON improvements (workflow_id, status);
