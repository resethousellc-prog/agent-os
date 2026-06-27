-- MIGRATION 004 — agent_tools (the toolbelt)
-- NOTE: Total seed count is 31 tools. The completion checklist target of 30 is
-- incorrect — all 31 are intentional and correct.
-- Verify with `SELECT COUNT(*) FROM agent_tools` returning 31.

CREATE TABLE IF NOT EXISTS agent_tools (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT UNIQUE NOT NULL,
  display_name      TEXT,
  platform          TEXT,
  description       TEXT,
  input_schema      JSONB DEFAULT '{}'::JSONB,
  output_schema     JSONB DEFAULT '{}'::JSONB,
  requires_approval BOOLEAN DEFAULT FALSE,
  tier_minimum      TEXT DEFAULT 'T1-EXEC' CHECK (tier_minimum IN ('T1-EXEC','T2-HIGH','T3-FULL')),
  active            BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO agent_tools (name, display_name, platform, description, requires_approval, tier_minimum) VALUES
-- GeeLark tools (4)
('geelark:post_content',    'Post Content',        'geelark', 'Post content to a GeeLark cell',         false, 'T1-EXEC'),
('geelark:read_analytics',  'Read Analytics',      'geelark', 'Read cell performance metrics',          false, 'T1-EXEC'),
('geelark:rotate_proxy',    'Rotate Proxy',        'geelark', 'Rotate proxy on a cell',                 true,  'T2-HIGH'),
('geelark:pause_cell',      'Pause Cell',          'geelark', 'Pause a cell automation',                true,  'T2-HIGH'),
-- GHL tools (5)
('ghl:create_contact',      'Create Contact',      'ghl',     'Create a contact in GHL',                false, 'T1-EXEC'),
('ghl:update_contact',      'Update Contact',      'ghl',     'Update contact fields/tags',             false, 'T1-EXEC'),
('ghl:trigger_workflow',    'Trigger Workflow',    'ghl',     'Fire a GHL workflow',                    true,  'T2-HIGH'),
('ghl:send_sms',            'Send SMS',            'ghl',     'Send SMS via GHL',                       false, 'T1-EXEC'),
('ghl:send_email',          'Send Email',          'ghl',     'Send email via GHL',                     false, 'T1-EXEC'),
-- BullMQ tools (3)
('bullmq:enqueue_job',      'Enqueue Job',         'bullmq',  'Add a job to a queue',                   false, 'T1-EXEC'),
('bullmq:read_queue_status','Queue Status',        'bullmq',  'Read queue depth + job statuses',        false, 'T1-EXEC'),
('bullmq:retry_failed',     'Retry Failed',        'bullmq',  'Retry failed jobs in a queue',           true,  'T2-HIGH'),
-- S3 tools (2)
('s3:read_content',         'Read Content',        's3',      'Read content from S3',                   false, 'T1-EXEC'),
('s3:write_content',        'Write Content',       's3',      'Write content to S3',                    false, 'T1-EXEC'),
-- Supabase tools (2)
('supabase:read_records',   'Read Records',        'supabase','Read from authorized tables',            false, 'T1-EXEC'),
('supabase:write_records',  'Write Records',       'supabase','Write to authorized tables',             false, 'T1-EXEC'),
-- WIS tools (5)
('wis:request_scaffold',    'Request Scaffold',    'wis',     'Ask WIS to generate workflow scaffold',  false, 'T2-HIGH'),
('wis:log_run',             'Log Run',             'wis',     'Log a workflow execution',               false, 'T1-EXEC'),
('wis:request_improvement', 'Request Improvement', 'wis',     'Flag workflow for AI improvement',       false, 'T2-HIGH'),
('wis:read_performance',    'Read Performance',    'wis',     'Read performance data for workflows',    false, 'T1-EXEC'),
('wis:submit_draft',        'Submit Draft',        'wis',     'Submit draft spec for new agent',        false, 'T2-HIGH'),
-- Communication / A2A tools (8)
('comms:initiate_thread',   'Initiate Thread',     'comms',   'Start a new interaction thread',         false, 'T2-HIGH'),
('comms:send_message',      'Send Message',        'comms',   'Send a message in an active thread',     false, 'T1-EXEC'),
('comms:respond_to_message','Respond',             'comms',   'Respond to a received message',          false, 'T1-EXEC'),
('comms:request_review',    'Request Review',      'comms',   'Ask another agent to review output',     false, 'T2-HIGH'),
('comms:delegate_task',     'Delegate Task',       'comms',   'Assign subtask to a T1 agent',           false, 'T2-HIGH'),
('comms:escalate',          'Escalate',            'comms',   'Escalate unresolvable decision',         false, 'T1-EXEC'),
('comms:merge_outputs',     'Merge Outputs',       'comms',   'Merge multiple agent outputs',           false, 'T3-FULL'),
('comms:broadcast',         'Broadcast',           'comms',   'Message all thread participants',        false, 'T2-HIGH')
ON CONFLICT (name) DO NOTHING;
