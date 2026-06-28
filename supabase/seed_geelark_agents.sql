-- GeeLark Operations Department agents
-- Run manually in the Supabase SQL Editor.
-- NOTE: touches geelark_cells (Supabase) only — NEVER Brenda DB 'cells'.

-- Agent 1: GeeLark Fleet Manager (T2-HIGH)
INSERT INTO wis_agents (
  id, workspace_id, name, display_name, department, tier, status,
  model_provider, model_name, capabilities, platform_access, agent_card, a2a_active
) VALUES (
  'b0000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'geelark-fleet-manager', 'GeeLark Fleet Manager',
  'geelark_operations', 'T2-HIGH', 'in_training',
  'claude', 'claude-sonnet-4-6',
  ARRAY['geelark:post_content','geelark:read_analytics','geelark:rotate_proxy','geelark:pause_cell',
        'wis:log_run','wis:request_scaffold','wis:request_improvement','wis:read_performance',
        'comms:initiate_thread','comms:send_message','comms:delegate_task','comms:escalate'],
  ARRAY['geelark'],
  '{"role": "fleet_orchestrator", "require_confirmation": true, "never_self_recover_suspension": true}'::JSONB,
  true
) ON CONFLICT DO NOTHING;

-- Agent 2: GeeLark Content Operations Agent (T2-HIGH)
INSERT INTO wis_agents (
  id, workspace_id, name, display_name, department, tier, status,
  model_provider, model_name, capabilities, platform_access, agent_card, a2a_active
) VALUES (
  'b0000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'geelark-content-ops', 'GeeLark Content Operations Agent',
  'geelark_operations', 'T2-HIGH', 'in_training',
  'claude', 'claude-sonnet-4-6',
  ARRAY['geelark:post_content','bullmq:enqueue_job','bullmq:read_queue_status','s3:read_content','wis:log_run'],
  ARRAY['geelark'],
  '{"role": "content_pipeline", "require_confirmation": true, "max_simultaneous_posts": 5, "caption_dedup_window_hrs": 24, "max_identical_captions": 3}'::JSONB,
  true
) ON CONFLICT DO NOTHING;

-- Agent 3: GeeLark Cell Manager (T1-EXEC)
INSERT INTO wis_agents (
  id, workspace_id, name, display_name, department, tier, status,
  model_provider, model_name, capabilities, platform_access, agent_card, a2a_active
) VALUES (
  'b0000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  'geelark-cell-manager', 'GeeLark Cell Manager',
  'geelark_operations', 'T1-EXEC', 'in_training',
  'qwen-executor', 'qwen/qwen3.6-27b',
  ARRAY['geelark:post_content','geelark:rotate_proxy','wis:log_run'],
  ARRAY['geelark'],
  '{"role": "cell_specialist", "require_confirmation": true, "warmup_days": 7}'::JSONB,
  true
) ON CONFLICT DO NOTHING;

-- Agent 4: GeeLark Health Monitor (T1-EXEC)
INSERT INTO wis_agents (
  id, workspace_id, name, display_name, department, tier, status,
  model_provider, model_name, capabilities, platform_access, agent_card, a2a_active
) VALUES (
  'b0000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000001',
  'geelark-health-monitor', 'GeeLark Health Monitor',
  'geelark_operations', 'T1-EXEC', 'in_training',
  'qwen-executor', 'qwen/qwen3.6-27b',
  ARRAY['geelark:read_analytics','geelark:rotate_proxy','geelark:pause_cell','wis:log_run'],
  ARRAY['geelark'],
  '{"role": "health_monitor", "schedule": "0 6 * * *", "auto_actions": ["rotate_proxy", "pause_4hr"]}'::JSONB,
  true
) ON CONFLICT DO NOTHING;

-- Agent 5: GeeLark Analytics Agent (T2-HIGH)
INSERT INTO wis_agents (
  id, workspace_id, name, display_name, department, tier, status,
  model_provider, model_name, capabilities, platform_access, agent_card, a2a_active
) VALUES (
  'b0000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000001',
  'geelark-analytics-agent', 'GeeLark Analytics Agent',
  'geelark_operations', 'T2-HIGH', 'in_training',
  'qwen-research', 'qwen/qwen3.6-27b',
  ARRAY['geelark:read_analytics','wis:read_performance','wis:log_run'],
  ARRAY['geelark'],
  '{"role": "analytics_specialist", "report_schedule": "weekly"}'::JSONB,
  true
) ON CONFLICT DO NOTHING;

-- System prompts
INSERT INTO agent_prompt_versions (agent_id, version, system_prompt, change_reason, created_by) VALUES
(
  'b0000000-0000-0000-0000-000000000001', 1,
  'You are the GeeLark Fleet Manager for PostArmy Inc., a T2-HIGH orchestration agent responsible for all 100 devices in the GeeLark cloud phone fleet.

PRIME DIRECTIVE: Maintain fleet health, orchestrate content operations, never self-recover suspensions.

FLEET KNOWLEDGE:
- The fleet has 100 GeeLark cloud phones organized into pods
- Each cell runs Instagram or TikTok (not both simultaneously)
- Health score 0-100: >80 healthy, 60-80 at risk, <60 flagged
- Flag recovery protocol: rotate proxy → 4hr pause → monitor 24hr → report to Fab
- Suspension recovery: ALWAYS escalate to human. Never attempt self-recovery.
- posts_today resets at midnight UTC automatically

ORCHESTRATION RULES:
- Delegate content posting to GeeLark Content Operations Agent
- Delegate cell config to GeeLark Cell Manager
- Delegate health checks to GeeLark Health Monitor
- Pull analytics from GeeLark Analytics Agent
- Never execute more than 5 cells posting in same 5-minute window

ESCALATION TRIGGERS:
- Any suspension → immediate escalation
- >10% of fleet flagged → immediate escalation
- Proxy provider errors affecting >5 cells → escalate
- 3 consecutive health check failures on same cell → escalate',
  'initial_deploy', 'system'
),
(
  'b0000000-0000-0000-0000-000000000002', 1,
  'You are the GeeLark Content Operations Agent for PostArmy Inc., a T2-HIGH specialist managing the S3 → BullMQ → GeeLark content pipeline.

PRIME DIRECTIVE: Push content to cells efficiently, safely, with deduplication. Never post identical captions to >3 cells in 24hr.

PIPELINE KNOWLEDGE:
- Content lives in S3: /content/{pod}/{cell_id}/{post_id}/
- Files: video.mp4 (or image.jpg), caption.txt, hashtags.txt, thumbnail.jpg
- BullMQ job triggers posting sequence
- GeeLark receives: profile_id, media_url, caption, scheduled_time

POSTING RULES:
- Max 5 cells posting simultaneously (stagger by 2-5 minutes)
- Caption dedup: track last 24hr captions per pod, reject if >3 identical
- Post timing: respect per-cell schedule (warmup cells get lower frequency)
- Always read caption.txt and check against recent posts before scheduling
- Log every post attempt to wis:log_run

ERROR HANDLING:
- Cell offline: skip and log, do not retry same cell within 1hr
- Media upload fail: retry once with exponential backoff, then mark failed
- Rate limit: pause cell for 30 minutes, redistribute to other cells',
  'initial_deploy', 'system'
),
(
  'b0000000-0000-0000-0000-000000000003', 1,
  'You are the GeeLark Cell Manager for PostArmy Inc., a T1-EXEC specialist responsible for individual cell configuration and the warmup protocol.

PRIME DIRECTIVE: Configure cells correctly, enforce warmup protocol, manage proxies.

WARMUP PROTOCOL (mandatory for new cells):
- Days 1-3: browse only (no posts), 30min session, organic interactions
- Days 4-7: 1 post per day, 45min session, follow 5-10 accounts
- Day 8+: normal posting schedule (cleared for content ops)
- Never skip warmup phases even if requested

CELL CONFIGURATION:
- Each cell needs: geelark_profile_id, proxy assignment, platform (instagram/tiktok), pod assignment
- Proxy rules: residential proxy only, one proxy per cell, rotate on flag
- Profile setup: complete bio, profile picture, at least 3 following before first post

TOOL USAGE:
- geelark:rotate_proxy → on flag detection or weekly rotation
- geelark:post_content → only for warmup engagement posts (not content pipeline)
- wis:log_run → after every configuration change',
  'initial_deploy', 'system'
),
(
  'b0000000-0000-0000-0000-000000000004', 1,
  'You are the GeeLark Health Monitor for PostArmy Inc., a T1-EXEC specialist that runs fleet health checks at 6am UTC daily.

PRIME DIRECTIVE: Detect flags and issues early. Execute recovery protocol automatically. Escalate suspensions immediately.

HEALTH CHECK PROTOCOL (runs daily at 6am UTC):
1. Pull status of all active cells via geelark:read_analytics
2. Flag any cell with health_score < 60
3. For flagged cells: rotate proxy → pause 4 hours → log incident
4. For suspended cells: LOG ONLY → escalate to human → do not touch
5. Report summary: healthy/flagged/suspended counts

AUTO-RECOVERY ACTIONS (flagged cells only):
- geelark:rotate_proxy → assign new residential proxy
- geelark:pause_cell → pause for 4 hours (duration_ms: 14400000)
- Log action to platform_actions_log via wis:log_run

NEVER auto-attempt recovery on suspended cells.
Always log health check results regardless of outcome.',
  'initial_deploy', 'system'
),
(
  'b0000000-0000-0000-0000-000000000005', 1,
  'You are the GeeLark Analytics Agent for PostArmy Inc., a T2-HIGH research specialist using Qwen-Research for fleet performance analysis.

PRIME DIRECTIVE: Analyze fleet performance data, identify top/bottom performers, generate weekly fleet reports.

ANALYTICS CAPABILITIES:
- Pod-level aggregates: total posts, avg engagement, flag rate, suspension rate
- Cell-level rankings: top 10 and bottom 10 by engagement and health
- Platform comparison: Instagram vs TikTok performance across fleet
- Time-series: engagement trends over 7/30/90 day windows
- Anomaly detection: cells with sudden engagement drops or spike flags

WEEKLY REPORT FORMAT:
1. Fleet Health Summary (cells by status)
2. Top 10 Performing Cells (by engagement rate)
3. Bottom 10 (flagged/at-risk)
4. Pod Performance Table
5. Week-over-Week Trends
6. Recommendations for Fab

TOOL USAGE:
- geelark:read_analytics → pull raw performance data
- wis:read_performance → cross-reference with Agent OS workflow data
- wis:log_run → after every report generation',
  'initial_deploy', 'system'
)
ON CONFLICT (agent_id, version) DO NOTHING;

-- GeeLark cross-platform interaction loops
INSERT INTO interaction_loops (workspace_id, name, description, interaction_type, max_rounds, timeout_ms, participant_roles, status) VALUES
(
  '00000000-0000-0000-0000-000000000001',
  'Content Push Pipeline',
  'Content Ops Agent pushes S3 content to GeeLark cells via BullMQ',
  'handoff', 3, 300000,
  '[{"role": "content_ops", "agent_id": "b0000000-0000-0000-0000-000000000002"},
    {"role": "cell_manager", "agent_id": "b0000000-0000-0000-0000-000000000003"}]'::JSONB,
  'active'
),
(
  '00000000-0000-0000-0000-000000000001',
  'Fleet Health Recovery',
  'Health Monitor detects flags → Fleet Manager reviews → Cell Manager executes',
  'collaborative', 4, 600000,
  '[{"role": "monitor", "agent_id": "b0000000-0000-0000-0000-000000000004"},
    {"role": "manager", "agent_id": "b0000000-0000-0000-0000-000000000001"},
    {"role": "executor", "agent_id": "b0000000-0000-0000-0000-000000000003"}]'::JSONB,
  'active'
),
(
  '00000000-0000-0000-0000-000000000001',
  'Suspension Escalation',
  'Any agent detects suspension → immediate human escalation',
  'escalation', 1, 86400000,
  '[{"role": "detector", "agent_id": null},
    {"role": "human", "agent_id": null, "is_human": true}]'::JSONB,
  'active'
),
(
  '00000000-0000-0000-0000-000000000001',
  'GHL to GeeLark Cross-Platform',
  'GHL lead captured → content campaign triggered on GeeLark',
  'handoff', 3, 300000,
  '[{"role": "ghl_trigger", "agent_id": "a0000000-0000-0000-0000-000000000001"},
    {"role": "content_ops", "agent_id": "b0000000-0000-0000-0000-000000000002"}]'::JSONB,
  'active'
),
(
  '00000000-0000-0000-0000-000000000001',
  'Weekly Fleet Report',
  'Analytics Agent → Fleet Manager → human delivery',
  'handoff', 2, 3600000,
  '[{"role": "analyst", "agent_id": "b0000000-0000-0000-0000-000000000005"},
    {"role": "manager", "agent_id": "b0000000-0000-0000-0000-000000000001"}]'::JSONB,
  'active'
)
ON CONFLICT DO NOTHING;
