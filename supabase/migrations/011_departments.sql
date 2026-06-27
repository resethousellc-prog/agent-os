-- MIGRATION 011 — departments

CREATE TABLE IF NOT EXISTS departments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        UUID NOT NULL REFERENCES workspaces(id),
  name                TEXT NOT NULL,
  display_name        TEXT,
  description         TEXT,
  department_head_id  UUID REFERENCES wis_agents(id),
  owned_workflow_ids  UUID[] DEFAULT '{}',
  handoff_map         JSONB DEFAULT '{}'::JSONB,
  status              TEXT DEFAULT 'active',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "departments_workspace" ON departments
  USING (workspace_id IN (
    SELECT id FROM workspaces WHERE owner_user_id = auth.uid()
  ));
CREATE TRIGGER departments_updated_at
  BEFORE UPDATE ON departments
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Seed all 22 departments for PostArmy Inc. workspace
INSERT INTO departments (workspace_id, name, display_name) VALUES
('00000000-0000-0000-0000-000000000001', 'command_center',        'Command Center'),
('00000000-0000-0000-0000-000000000001', 'content_intelligence',  'Content Intelligence'),
('00000000-0000-0000-0000-000000000001', 'algorithm_intelligence','Algorithm Intelligence'),
('00000000-0000-0000-0000-000000000001', 'platform_intelligence', 'Platform Intelligence'),
('00000000-0000-0000-0000-000000000001', 'video_department',      'Video Department'),
('00000000-0000-0000-0000-000000000001', 'ugc_intelligence',      'UGC Intelligence'),
('00000000-0000-0000-0000-000000000001', 'lead_intelligence',     'Lead Intelligence'),
('00000000-0000-0000-0000-000000000001', 'strategy_intelligence', 'Strategy Intelligence'),
('00000000-0000-0000-0000-000000000001', 'website_intelligence',  'Website Intelligence'),
('00000000-0000-0000-0000-000000000001', 'growth_intelligence',   'Growth Intelligence'),
('00000000-0000-0000-0000-000000000001', 'damage_control',        'Damage Control'),
('00000000-0000-0000-0000-000000000001', 'sovereign_brain',       'Sovereign Brain'),
('00000000-0000-0000-0000-000000000001', 'human_response_engine', 'Human Response Engine'),
('00000000-0000-0000-0000-000000000001', 'member_success',        'Member Success'),
('00000000-0000-0000-0000-000000000001', 'data_warehouse',        'Data Warehouse'),
('00000000-0000-0000-0000-000000000001', 'knowledge_acquisition', 'Knowledge Acquisition'),
('00000000-0000-0000-0000-000000000001', 'brand_intelligence',    'Brand Intelligence'),
('00000000-0000-0000-0000-000000000001', 'affiliate',             'Affiliate'),
('00000000-0000-0000-0000-000000000001', 'brenda_books',          'Brenda Books'),
('00000000-0000-0000-0000-000000000001', 'ghl_operations',        'GHL Operations'),
('00000000-0000-0000-0000-000000000001', 'geelark_operations',    'GeeLark Operations'),
('00000000-0000-0000-0000-000000000001', 'infrastructure',        'Infrastructure')
ON CONFLICT DO NOTHING;
