import { callClaude } from '../claude.js';
import { supabaseAdmin } from '../supabase.js';

const GHL_SCENARIO_CATEGORIES = [
  'contact_creation', 'contact_update', 'tag_management',
  'workflow_enrollment', 'workflow_building', 'sms_sending',
  'email_sending', 'pipeline_management', 'appointment_booking',
  'bulk_operations', 'dedup_handling', 'rate_limit_recovery',
  'error_handling', 'reporting', 'edge_cases'
];

const GEELARK_SCENARIO_CATEGORIES = [
  'content_push', 'fleet_health_check', 'cell_management',
  'proxy_rotation', 'flag_recovery', 'analytics_retrieval',
  'bulk_scheduling', 'warmup_sequence', 'pod_management',
  'suspension_handling', 'error_recovery', 'performance_reporting'
];

export async function generateTrainingScenarios(platform, count = 500) {
  const categories = platform === 'ghl' ? GHL_SCENARIO_CATEGORIES : GEELARK_SCENARIO_CATEGORIES;
  const perCategory = Math.ceil(count / categories.length);
  const scenarios = [];

  for (const category of categories) {
    const result = await callClaude({
      system: `You generate training scenarios for AI agents operating ${platform.toUpperCase()}.
Return JSON array only. Each scenario: { input_goal, agent_actions, expected_outcome, success_criteria }`,
      user: `Generate ${perCategory} training scenarios for category: ${category}
Platform: ${platform.toUpperCase()}
Difficulty mix: 40% basic, 40% intermediate, 20% edge_case

Example format:
[
  {
    "input_goal": "Create a new contact for john@example.com with tag 'drei-standard'",
    "agent_actions": [
      { "action": "contacts.search", "payload": { "email": "john@example.com" } },
      { "action": "contacts.create", "payload": { "email": "john@example.com", "tags": ["drei-standard"] } }
    ],
    "expected_outcome": { "contact_created": true, "tags_applied": ["drei-standard"] },
    "success_criteria": { "contact_id_present": true, "no_duplicate": true, "tags_correct": true }
  }
]`,
      model: 'claude-sonnet-4-6',
      maxTokens: 4000,
    });

    try {
      const parsed = JSON.parse((result?.text || '[]').replace(/```json|```/g, '').trim());
      for (const scenario of parsed) {
        scenarios.push({
          platform,
          category,
          difficulty: scenario.difficulty || 'intermediate',
          input_goal: scenario.input_goal,
          agent_actions: scenario.agent_actions,
          expected_outcome: scenario.expected_outcome,
          success_criteria: scenario.success_criteria,
          generated_by: 'claude',
        });
      }
    } catch { /* skip malformed scenarios */ }
  }

  // Bulk insert to Supabase
  if (scenarios.length > 0) {
    await supabaseAdmin.from('training_scenarios').insert(scenarios);
  }

  return scenarios.length;
}
