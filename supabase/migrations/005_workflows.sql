-- MIGRATION 005 — workflows

CREATE TABLE IF NOT EXISTS workflows (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id),
  name            TEXT NOT NULL,
  description     TEXT,
  platform        TEXT CHECK (platform IN ('ghl','geelark','bullmq','make','multi')),
  department      TEXT,
  trigger_type    TEXT CHECK (trigger_type IN ('event','scheduled','webhook','manual')),
  trigger_config  JSONB DEFAULT '{}'::JSONB,
  steps           JSONB DEFAULT '[]'::JSONB,
  conditions      JSONB DEFAULT '[]'::JSONB,
  error_handling  TEXT DEFAULT 'escalate',
  estimated_runtime TEXT,
  status          TEXT DEFAULT 'draft' CHECK (status IN ('draft','active','paused','archived')),
  owner_agent_id  UUID REFERENCES wis_agents(id),
  created_by      TEXT DEFAULT 'human',
  version         INTEGER DEFAULT 1,
  parent_id       UUID REFERENCES workflows(id),
  tags            TEXT[] DEFAULT '{}',
  scaffold_goal   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workflows_workspace" ON workflows
  USING (workspace_id IN (
    SELECT id FROM workspaces WHERE owner_user_id = auth.uid()
  ));
CREATE INDEX idx_workflows_workspace ON workflows (workspace_id, status);
CREATE INDEX idx_workflows_agent     ON workflows (owner_agent_id);
CREATE TRIGGER workflows_updated_at
  BEFORE UPDATE ON workflows
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
