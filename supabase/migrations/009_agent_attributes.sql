-- MIGRATION 009 — agent_attributes

CREATE TABLE IF NOT EXISTS agent_attributes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id          UUID NOT NULL REFERENCES workspaces(id),
  agent_id              UUID NOT NULL REFERENCES wis_agents(id),
  reasoning_depth       INTEGER DEFAULT 50 CHECK (reasoning_depth BETWEEN 0 AND 100),
  execution_speed       INTEGER DEFAULT 50 CHECK (execution_speed BETWEEN 0 AND 100),
  reliability           INTEGER DEFAULT 50 CHECK (reliability BETWEEN 0 AND 100),
  creativity            INTEGER DEFAULT 50 CHECK (creativity BETWEEN 0 AND 100),
  autonomy              INTEGER DEFAULT 50 CHECK (autonomy BETWEEN 0 AND 100),
  communication         INTEGER DEFAULT 50 CHECK (communication BETWEEN 0 AND 100),
  collaboration_score   INTEGER DEFAULT 50 CHECK (collaboration_score BETWEEN 0 AND 100),
  delegation_quality    INTEGER DEFAULT 50 CHECK (delegation_quality BETWEEN 0 AND 100),
  escalation_rate       NUMERIC(5,2) DEFAULT 0,
  recorded_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  calculated_from       JSONB DEFAULT '[]'::JSONB,
  override_by           TEXT,
  override_note         TEXT
);
ALTER TABLE agent_attributes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agent_attributes_workspace" ON agent_attributes
  USING (workspace_id IN (
    SELECT id FROM workspaces WHERE owner_user_id = auth.uid()
  ));
CREATE INDEX idx_agent_attributes_agent ON agent_attributes (agent_id, recorded_at DESC);
