-- MIGRATION 015 — A2A + training tables

CREATE TABLE IF NOT EXISTS a2a_tasks (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  a2a_task_id         TEXT UNIQUE NOT NULL,
  workspace_id        UUID REFERENCES workspaces(id),
  loop_id             UUID REFERENCES interaction_loops(id),
  initiator_agent_id  UUID REFERENCES wis_agents(id),
  recipient_agent_id  UUID REFERENCES wis_agents(id),
  interaction_type    TEXT,
  status              TEXT DEFAULT 'submitted' CHECK (status IN (
    'submitted','working','input-required','completed','failed'
  )),
  round_number        INTEGER DEFAULT 1,
  input_payload       JSONB DEFAULT '{}'::JSONB,
  output_payload      JSONB DEFAULT '{}'::JSONB,
  escalated           BOOLEAN DEFAULT FALSE,
  escalated_to        TEXT,
  started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at        TIMESTAMPTZ,
  duration_ms         INTEGER
);
ALTER TABLE a2a_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "a2a_tasks_workspace" ON a2a_tasks
  USING (workspace_id IN (
    SELECT id FROM workspaces WHERE owner_user_id = auth.uid()
  ));
CREATE INDEX idx_a2a_tasks_status ON a2a_tasks (status, started_at DESC);

CREATE TABLE IF NOT EXISTS training_scenarios (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform         TEXT NOT NULL CHECK (platform IN ('ghl','geelark')),
  category         TEXT NOT NULL,
  difficulty       TEXT DEFAULT 'intermediate' CHECK (difficulty IN ('basic','intermediate','edge_case')),
  input_goal       TEXT NOT NULL,
  agent_actions    JSONB DEFAULT '[]'::JSONB,
  expected_outcome JSONB DEFAULT '{}'::JSONB,
  success_criteria JSONB DEFAULT '{}'::JSONB,
  generated_by     TEXT DEFAULT 'claude',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE training_scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "training_scenarios_read" ON training_scenarios
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "training_scenarios_write" ON training_scenarios
  FOR ALL USING (auth.role() = 'service_role');
CREATE INDEX idx_training_scenarios_platform ON training_scenarios (platform, category);

CREATE TABLE IF NOT EXISTS training_results (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id              UUID NOT NULL REFERENCES wis_agents(id),
  scenario_id           UUID NOT NULL REFERENCES training_scenarios(id),
  simulator             TEXT DEFAULT 'qwen-agentworld-35b',
  passed                BOOLEAN NOT NULL,
  score                 JSONB DEFAULT '{}'::JSONB,
  actions_taken         JSONB DEFAULT '[]'::JSONB,
  failure_reason        TEXT,
  system_prompt_version INTEGER DEFAULT 1,
  run_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE training_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "training_results_workspace" ON training_results
  USING (agent_id IN (
    SELECT id FROM wis_agents WHERE workspace_id IN (
      SELECT id FROM workspaces WHERE owner_user_id = auth.uid()
    )
  ));
CREATE INDEX idx_training_results_agent ON training_results (agent_id, run_at DESC);
CREATE INDEX idx_training_results_pass  ON training_results (agent_id, passed);

CREATE TABLE IF NOT EXISTS agent_prompt_versions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id        UUID NOT NULL REFERENCES wis_agents(id),
  version         INTEGER NOT NULL,
  system_prompt   TEXT NOT NULL,
  change_reason   TEXT,
  training_score  NUMERIC(5,2),
  created_by      TEXT DEFAULT 'system',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE agent_prompt_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prompt_versions_workspace" ON agent_prompt_versions
  USING (agent_id IN (
    SELECT id FROM wis_agents WHERE workspace_id IN (
      SELECT id FROM workspaces WHERE owner_user_id = auth.uid()
    )
  ));
CREATE UNIQUE INDEX idx_agent_prompt_version ON agent_prompt_versions (agent_id, version);
