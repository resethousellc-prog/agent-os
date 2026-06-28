-- MIGRATION 017 — Schema additions for Sessions 10–14 (Batch E)
-- Run manually in the Supabase SQL Editor (staffarmy-prod project).

-- Add parent_workspace_id to workspaces (Session 13 agency sub-workspaces)
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS parent_workspace_id UUID REFERENCES workspaces(id);

-- Add system_reports table (Session 14 model cost tracker)
CREATE TABLE IF NOT EXISTS system_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID REFERENCES workspaces(id),
  report_type   TEXT NOT NULL,
  period_start  TIMESTAMPTZ NOT NULL,
  period_end    TIMESTAMPTZ NOT NULL,
  data          JSONB NOT NULL DEFAULT '{}'::JSONB,
  generated_by  TEXT DEFAULT 'system',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE system_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "system_reports_workspace" ON system_reports
  USING (workspace_id IN (
    SELECT id FROM workspaces WHERE owner_user_id = auth.uid()
  ) OR workspace_id IS NULL);
CREATE INDEX idx_system_reports_type ON system_reports (report_type, created_at DESC);

-- NOTE: Session 14 references a "hive_mind_intelligence" table alias.
-- We use system_reports instead — no additional table needed.
