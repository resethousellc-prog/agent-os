-- MIGRATION 001 — workspaces

CREATE TABLE IF NOT EXISTS workspaces (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  owner_user_id   UUID,
  plan            TEXT DEFAULT 'starter' CHECK (plan IN ('starter','growth','pro','white_label')),
  tier_access     TEXT[] DEFAULT ARRAY['T1-EXEC'],
  max_agents      INTEGER DEFAULT 5,
  max_workflows   INTEGER DEFAULT 10,
  branding        JSONB DEFAULT '{}'::JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_owner" ON workspaces
  USING (owner_user_id = auth.uid());
CREATE TRIGGER workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Seed PostArmy Inc. workspace (Fab's workspace — permanent)
INSERT INTO workspaces (id, name, plan, tier_access, max_agents, max_workflows)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'PostArmy Inc.',
  'white_label',
  ARRAY['T1-EXEC','T2-HIGH','T3-FULL'],
  9999,
  9999
) ON CONFLICT DO NOTHING;
