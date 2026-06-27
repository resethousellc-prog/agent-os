-- MIGRATION 002 — wis_agents

CREATE TABLE IF NOT EXISTS wis_agents (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id          UUID NOT NULL REFERENCES workspaces(id),
  -- Cross-DB reference to Brenda DB agent_registry.agent_id — TEXT, not FK
  agent_registry_id     TEXT,
  name                  TEXT NOT NULL,
  display_name          TEXT,
  department            TEXT,
  tier                  TEXT DEFAULT 'T1-EXEC' CHECK (tier IN ('T1-EXEC','T2-HIGH','T3-FULL')),
  status                TEXT DEFAULT 'active' CHECK (status IN (
    'active','suspended','retired','in_training','production_ready'
  )),
  capabilities          TEXT[] DEFAULT '{}',
  assigned_workflows    UUID[] DEFAULT '{}',
  platform_access       TEXT[] DEFAULT '{}',
  -- A2A protocol
  a2a_url               TEXT,
  agent_card            JSONB DEFAULT '{}'::JSONB,
  a2a_active            BOOLEAN DEFAULT FALSE,
  -- Model assignment
  model_provider        TEXT DEFAULT 'claude' CHECK (model_provider IN (
    'claude','qwen-executor','qwen-research','qwen-multilingual'
  )),
  model_name            TEXT DEFAULT 'claude-sonnet-4-6',
  thinking_mode         BOOLEAN DEFAULT FALSE,
  model_override_rules  JSONB DEFAULT '{}'::JSONB,
  -- Supervisor link (self-referential)
  supervisor_agent_id   UUID REFERENCES wis_agents(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE wis_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wis_agents_workspace" ON wis_agents
  USING (workspace_id IN (
    SELECT id FROM workspaces WHERE owner_user_id = auth.uid()
  ));
CREATE INDEX idx_wis_agents_workspace ON wis_agents (workspace_id);
CREATE INDEX idx_wis_agents_registry  ON wis_agents (agent_registry_id);
CREATE INDEX idx_wis_agents_tier      ON wis_agents (tier, status);
CREATE TRIGGER wis_agents_updated_at
  BEFORE UPDATE ON wis_agents
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
