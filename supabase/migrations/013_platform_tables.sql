-- MIGRATION 013 — platform tables

CREATE TABLE IF NOT EXISTS platform_connections (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      UUID NOT NULL REFERENCES workspaces(id),
  platform          TEXT NOT NULL CHECK (platform IN ('ghl','geelark')),
  status            TEXT DEFAULT 'connected',
  credentials       JSONB DEFAULT '{}'::JSONB,  -- stores env var NAMES only, never raw keys
  config            JSONB DEFAULT '{}'::JSONB,
  last_health_check TIMESTAMPTZ,
  health_status     TEXT DEFAULT 'healthy' CHECK (health_status IN ('healthy','degraded','offline')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE platform_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "platform_connections_workspace" ON platform_connections
  USING (workspace_id IN (
    SELECT id FROM workspaces WHERE owner_user_id = auth.uid()
  ));

-- PARTITIONED table — partition MUST be created at table creation time
CREATE TABLE IF NOT EXISTS platform_actions_log (
  id                  UUID DEFAULT gen_random_uuid(),
  workspace_id        UUID NOT NULL,
  platform            TEXT NOT NULL,
  action              TEXT NOT NULL,
  agent_id            UUID,
  workflow_run_id     UUID,
  request_payload     JSONB DEFAULT '{}'::JSONB,
  response_payload    JSONB DEFAULT '{}'::JSONB,
  platform_entity_id  TEXT,
  status              TEXT DEFAULT 'success' CHECK (status IN ('success','failed','retried')),
  retries             INTEGER DEFAULT 0,
  duration_ms         INTEGER,
  error_message       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Partition for 2026
CREATE TABLE platform_actions_log_2026 PARTITION OF platform_actions_log
  FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

-- Partition for 2027 (provision now to avoid midnight gaps)
CREATE TABLE platform_actions_log_2027 PARTITION OF platform_actions_log
  FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');

-- RLS on parent table covers all partitions
ALTER TABLE platform_actions_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pal_workspace" ON platform_actions_log
  USING (workspace_id IN (
    SELECT id FROM workspaces WHERE owner_user_id = auth.uid()
  ));

CREATE INDEX idx_pal_workspace ON platform_actions_log (workspace_id, platform, created_at DESC);
CREATE INDEX idx_pal_agent     ON platform_actions_log (agent_id, created_at DESC);

-- geelark_cells — PostArmy's OWN 100-device in-house fleet
-- THIS IS NOT the same as Brenda DB 'cells' table (those are DFY subscriber cells)
CREATE TABLE IF NOT EXISTS geelark_cells (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        UUID NOT NULL REFERENCES workspaces(id),
  geelark_profile_id  TEXT UNIQUE NOT NULL,
  name                TEXT NOT NULL,
  pod                 TEXT,
  platform            TEXT CHECK (platform IN ('instagram','tiktok','facebook')),
  proxy_id            TEXT,
  phone_number        TEXT,
  status              TEXT DEFAULT 'active' CHECK (status IN (
    'active','flagged','suspended','offline','warmup'
  )),
  health_score        INTEGER DEFAULT 100,
  flag_count          INTEGER DEFAULT 0,
  last_flag_at        TIMESTAMPTZ,
  last_post_at        TIMESTAMPTZ,
  posts_today         INTEGER DEFAULT 0,
  assigned_agent_id   UUID REFERENCES wis_agents(id),
  warmup_complete     BOOLEAN DEFAULT FALSE,
  warmup_started_at   TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE geelark_cells ENABLE ROW LEVEL SECURITY;
CREATE POLICY "geelark_cells_workspace" ON geelark_cells
  USING (workspace_id IN (
    SELECT id FROM workspaces WHERE owner_user_id = auth.uid()
  ));
CREATE INDEX idx_geelark_cells_pod   ON geelark_cells (pod, status);
CREATE INDEX idx_geelark_cells_agent ON geelark_cells (assigned_agent_id);
CREATE TRIGGER geelark_cells_updated_at
  BEFORE UPDATE ON geelark_cells
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ghl_entities — local cache of GHL data synced via webhooks
CREATE TABLE IF NOT EXISTS ghl_entities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id),
  entity_type     TEXT NOT NULL CHECK (entity_type IN (
    'contact','workflow','opportunity','calendar','pipeline'
  )),
  ghl_id          TEXT UNIQUE NOT NULL,
  name            TEXT,
  metadata        JSONB DEFAULT '{}'::JSONB,
  last_synced_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE ghl_entities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ghl_entities_workspace" ON ghl_entities
  USING (workspace_id IN (
    SELECT id FROM workspaces WHERE owner_user_id = auth.uid()
  ));
CREATE INDEX idx_ghl_entities_type ON ghl_entities (entity_type, workspace_id);
