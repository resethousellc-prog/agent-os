-- Infrastructure templates (Session 12 — Command Pillar)
-- Run manually in the Supabase SQL Editor.

INSERT INTO infrastructure_templates (name, description, use_case, department_configs, is_public) VALUES
(
  'DREI / Affiliate Storefront',
  'Complete AI infrastructure for affiliate marketers. GHL for lead management, GeeLark for social proof content, automated follow-up sequences.',
  'drei_affiliate',
  '[
    {"department": "ghl_operations", "agents": ["contact_agent", "conversation_agent", "workflow_builder"], "workflows": ["lead_capture", "follow_up_sequence", "conversion_tracking"]},
    {"department": "geelark_operations", "agents": ["content_ops", "fleet_manager"], "workflows": ["social_proof_content", "engagement_automation"]},
    {"department": "content_intelligence", "agents": ["content_strategist"], "workflows": ["content_calendar", "hook_generation"]}
  ]'::JSONB,
  true
),
(
  'Content Agency',
  'Full-service content agency infrastructure. Multi-client management, content production pipeline, performance reporting.',
  'content_agency',
  '[
    {"department": "content_intelligence", "agents": ["content_strategist", "hook_writer"], "workflows": ["brief_to_content", "review_cycle", "approval_flow"]},
    {"department": "geelark_operations", "agents": ["content_ops", "analytics_agent"], "workflows": ["multi_client_distribution", "performance_tracking"]},
    {"department": "member_success", "agents": ["client_success"], "workflows": ["onboarding", "monthly_reporting", "renewal"]}
  ]'::JSONB,
  true
),
(
  'Coaching / Course Business',
  'Course creator and coach infrastructure. Lead nurture, community management, student success automation.',
  'coaching',
  '[
    {"department": "ghl_operations", "agents": ["contact_agent", "workflow_builder", "conversation_agent"], "workflows": ["lead_nurture_sequence", "enrollment_automation", "student_onboarding"]},
    {"department": "member_success", "agents": ["student_success"], "workflows": ["check_in_automation", "completion_tracking", "testimonial_request"]},
    {"department": "content_intelligence", "agents": ["content_strategist"], "workflows": ["weekly_content_calendar"]}
  ]'::JSONB,
  true
),
(
  'PostArmy Inc.',
  'The actual PostArmy Inc. infrastructure — all 22 departments, GHL + GeeLark operations, full agent roster.',
  'custom',
  '[
    {"department": "command_center", "agents": [], "workflows": []},
    {"department": "ghl_operations", "agents": ["ghl-operations-manager","ghl-workflow-builder","ghl-contact-agent","ghl-conversation-agent","ghl-reporting-agent"], "workflows": []},
    {"department": "geelark_operations", "agents": ["geelark-fleet-manager","geelark-content-ops","geelark-cell-manager","geelark-health-monitor","geelark-analytics-agent"], "workflows": []}
  ]'::JSONB,
  false
)
ON CONFLICT DO NOTHING;
