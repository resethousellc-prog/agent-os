-- MIGRATION 010 — agent_development_log

CREATE TABLE IF NOT EXISTS agent_development_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id),
  agent_id        UUID NOT NULL REFERENCES wis_agents(id),
  event_type      TEXT NOT NULL CHECK (event_type IN (
    'attribute_update','tier_promotion','tier_demotion','skill_added',
    'skill_removed','flagged','reactivated','retired','manual_override',
    'training_started','training_completed','production_graduated'
  )),
  event_detail    JSONB DEFAULT '{}'::JSONB,
  triggered_by    TEXT DEFAULT 'system',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE agent_development_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agent_dev_log_workspace" ON agent_development_log
  USING (workspace_id IN (
    SELECT id FROM workspaces WHERE owner_user_id = auth.uid()
  ));
CREATE INDEX idx_agent_dev_log_agent ON agent_development_log (agent_id, created_at DESC);
