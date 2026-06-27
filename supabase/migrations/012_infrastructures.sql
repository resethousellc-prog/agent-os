-- MIGRATION 012 — infrastructures + templates

CREATE TABLE IF NOT EXISTS infrastructure_templates (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  description         TEXT,
  use_case            TEXT CHECK (use_case IN (
    'content_agency','ecom','coaching','community','drei_affiliate','custom'
  )),
  department_configs  JSONB DEFAULT '[]'::JSONB,
  workflow_configs    JSONB DEFAULT '[]'::JSONB,
  is_public           BOOLEAN DEFAULT FALSE,
  created_by          TEXT DEFAULT 'system',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- infrastructure_templates is a system-level catalog (no workspace_id).
-- RLS: enable but allow read for all authenticated users.
ALTER TABLE infrastructure_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "infra_templates_authenticated_read" ON infrastructure_templates
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "infra_templates_service_write" ON infrastructure_templates
  FOR ALL USING (auth.role() = 'service_role');

CREATE TABLE IF NOT EXISTS infrastructures (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id),
  name            TEXT NOT NULL,
  description     TEXT,
  template_id     UUID REFERENCES infrastructure_templates(id),
  department_ids  UUID[] DEFAULT '{}',
  hierarchy       JSONB DEFAULT '{}'::JSONB,
  status          TEXT DEFAULT 'draft' CHECK (status IN ('draft','active','paused','archived')),
  deployed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE infrastructures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "infrastructures_workspace" ON infrastructures
  USING (workspace_id IN (
    SELECT id FROM workspaces WHERE owner_user_id = auth.uid()
  ));
CREATE TRIGGER infrastructures_updated_at
  BEFORE UPDATE ON infrastructures
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
