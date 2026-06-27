-- MIGRATION 014 — communication layer

CREATE TABLE IF NOT EXISTS interaction_loops (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id          UUID NOT NULL REFERENCES workspaces(id),
  name                  TEXT NOT NULL,
  description           TEXT,
  interaction_type      TEXT NOT NULL CHECK (interaction_type IN (
    'handoff','collaborative','delegation','escalation','peer_review','swarm'
  )),
  participant_roles     JSONB DEFAULT '[]'::JSONB,
  trigger_config        JSONB DEFAULT '{}'::JSONB,
  message_schema        JSONB DEFAULT '{}'::JSONB,
  completion_condition  JSONB DEFAULT '{}'::JSONB,
  max_rounds            INTEGER DEFAULT 5,
  timeout_ms            INTEGER DEFAULT 300000,
  on_timeout            TEXT DEFAULT 'escalate',
  on_failure            TEXT DEFAULT 'escalate',
  linked_workflow_id    UUID REFERENCES workflows(id),
  status                TEXT DEFAULT 'active',
  version               INTEGER DEFAULT 1,
  created_by            TEXT DEFAULT 'human',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE interaction_loops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "loops_workspace" ON interaction_loops
  USING (workspace_id IN (
    SELECT id FROM workspaces WHERE owner_user_id = auth.uid()
  ));
CREATE TRIGGER interaction_loops_updated_at
  BEFORE UPDATE ON interaction_loops
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TABLE IF NOT EXISTS interaction_threads (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loop_id               UUID NOT NULL REFERENCES interaction_loops(id),
  workspace_id          UUID NOT NULL REFERENCES workspaces(id),
  triggered_by          TEXT DEFAULT 'agent',
  trigger_agent_id      UUID REFERENCES wis_agents(id),
  participant_agent_ids UUID[] DEFAULT '{}',
  status                TEXT DEFAULT 'active' CHECK (status IN (
    'active','completed','failed','escalated','timed_out','aborted'
  )),
  current_round         INTEGER DEFAULT 1,
  rounds_total          INTEGER,
  started_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at          TIMESTAMPTZ,
  duration_ms           INTEGER,
  outcome               TEXT,
  output_payload        JSONB DEFAULT '{}'::JSONB,
  escalated_to          TEXT,
  escalation_reason     TEXT,
  metadata              JSONB DEFAULT '{}'::JSONB
);
ALTER TABLE interaction_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "threads_workspace" ON interaction_threads
  USING (workspace_id IN (
    SELECT id FROM workspaces WHERE owner_user_id = auth.uid()
  ));
CREATE INDEX idx_threads_loop   ON interaction_threads (loop_id, status);
CREATE INDEX idx_threads_active ON interaction_threads (workspace_id, status)
  WHERE status = 'active';
-- Enable Realtime for live monitor
ALTER TABLE interaction_threads REPLICA IDENTITY FULL;

CREATE TABLE IF NOT EXISTS agent_messages (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id             UUID NOT NULL REFERENCES interaction_threads(id),
  loop_id               UUID NOT NULL REFERENCES interaction_loops(id),
  sender_agent_id       UUID NOT NULL REFERENCES wis_agents(id),
  recipient_agent_id    UUID REFERENCES wis_agents(id),
  message_type          TEXT NOT NULL CHECK (message_type IN (
    'task','output','revision_request','approval','rejection',
    'question','answer','escalation','delegation','result',
    'merge_request','system'
  )),
  round_number          INTEGER DEFAULT 1,
  payload               JSONB NOT NULL DEFAULT '{}'::JSONB,
  attachments           JSONB DEFAULT '[]'::JSONB,
  requires_response     BOOLEAN DEFAULT FALSE,
  response_deadline     TIMESTAMPTZ,
  responded_at          TIMESTAMPTZ,
  status                TEXT DEFAULT 'sent' CHECK (status IN (
    'sent','delivered','read','responded','expired'
  )),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE agent_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_workspace" ON agent_messages
  USING (thread_id IN (
    SELECT id FROM interaction_threads WHERE workspace_id IN (
      SELECT id FROM workspaces WHERE owner_user_id = auth.uid()
    )
  ));
CREATE INDEX idx_messages_thread ON agent_messages (thread_id, created_at ASC);
-- Enable Realtime for live monitor
ALTER TABLE agent_messages REPLICA IDENTITY FULL;

CREATE TABLE IF NOT EXISTS agent_chemistry (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id          UUID NOT NULL REFERENCES workspaces(id),
  agent_ids             UUID[] NOT NULL,  -- sorted smallest UUID first
  interaction_type      TEXT,
  threads_total         INTEGER DEFAULT 0,
  threads_successful    INTEGER DEFAULT 0,
  avg_rounds            NUMERIC(4,2) DEFAULT 0,
  avg_duration_ms       INTEGER DEFAULT 0,
  escalation_rate       NUMERIC(5,2) DEFAULT 0,
  chemistry_score       INTEGER DEFAULT 50,
  last_calculated_at    TIMESTAMPTZ DEFAULT NOW(),
  calculated_from_days  INTEGER DEFAULT 30
);
ALTER TABLE agent_chemistry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chemistry_workspace" ON agent_chemistry
  USING (workspace_id IN (
    SELECT id FROM workspaces WHERE owner_user_id = auth.uid()
  ));

CREATE TABLE IF NOT EXISTS escalations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id         UUID NOT NULL REFERENCES interaction_threads(id),
  workspace_id      UUID NOT NULL REFERENCES workspaces(id),
  escalated_by      UUID REFERENCES wis_agents(id),
  escalated_to      TEXT,
  reason            TEXT NOT NULL,
  context           JSONB DEFAULT '{}'::JSONB,
  status            TEXT DEFAULT 'pending' CHECK (status IN (
    'pending','resolved','overridden','expired'
  )),
  resolution        TEXT,
  resolved_by       TEXT,
  resolved_at       TIMESTAMPTZ,
  response_deadline TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE escalations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "escalations_workspace" ON escalations
  USING (workspace_id IN (
    SELECT id FROM workspaces WHERE owner_user_id = auth.uid()
  ));
CREATE INDEX idx_escalations_pending ON escalations (workspace_id, status)
  WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS loop_performance (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loop_id               UUID NOT NULL REFERENCES interaction_loops(id),
  workspace_id          UUID NOT NULL REFERENCES workspaces(id),
  period_start          TIMESTAMPTZ NOT NULL,
  period_end            TIMESTAMPTZ NOT NULL,
  threads_total         INTEGER DEFAULT 0,
  threads_completed     INTEGER DEFAULT 0,
  threads_escalated     INTEGER DEFAULT 0,
  threads_timed_out     INTEGER DEFAULT 0,
  avg_rounds            NUMERIC(4,2) DEFAULT 0,
  avg_duration_ms       INTEGER DEFAULT 0,
  success_rate          NUMERIC(5,2) DEFAULT 0,
  bottleneck_agent_id   UUID REFERENCES wis_agents(id),
  bottleneck_round      INTEGER,
  improvement_flag      BOOLEAN DEFAULT FALSE,
  calculated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE loop_performance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "loop_perf_workspace" ON loop_performance
  USING (workspace_id IN (
    SELECT id FROM workspaces WHERE owner_user_id = auth.uid()
  ));
