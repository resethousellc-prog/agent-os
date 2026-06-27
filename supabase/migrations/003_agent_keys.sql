-- MIGRATION 003 — agent_keys

CREATE TABLE IF NOT EXISTS agent_keys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id),
  agent_id        UUID NOT NULL REFERENCES wis_agents(id),
  key_hash        TEXT UNIQUE NOT NULL,
  key_prefix      TEXT NOT NULL,
  scopes          TEXT[] DEFAULT '{}',
  last_used_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  revoked         BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE agent_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agent_keys_workspace" ON agent_keys
  USING (workspace_id IN (
    SELECT id FROM workspaces WHERE owner_user_id = auth.uid()
  ));
CREATE INDEX idx_agent_keys_agent ON agent_keys (agent_id);
CREATE INDEX idx_agent_keys_hash  ON agent_keys (key_hash) WHERE revoked = FALSE;
