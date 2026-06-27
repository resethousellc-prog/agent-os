-- MIGRATION 008 — agent_builds

CREATE TABLE IF NOT EXISTS agent_builds (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        UUID NOT NULL REFERENCES workspaces(id),
  submitted_by        UUID REFERENCES wis_agents(id),
  draft_spec          JSONB NOT NULL,
  justification       TEXT,
  status              TEXT DEFAULT 'pending' CHECK (status IN (
    'pending','approved','rejected','activated'
  )),
  reviewed_by         TEXT,
  review_notes        TEXT,
  resulting_agent_id  UUID REFERENCES wis_agents(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE agent_builds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agent_builds_workspace" ON agent_builds
  USING (workspace_id IN (
    SELECT id FROM workspaces WHERE owner_user_id = auth.uid()
  ));
