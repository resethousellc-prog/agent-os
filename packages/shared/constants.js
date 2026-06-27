// Agent OS shared constants
// Used by both apps/api and apps/web

export const DEPARTMENTS = [
  'command_center',
  'content_intelligence',
  'algorithm_intelligence',
  'platform_intelligence',
  'video_department',
  'ugc_intelligence',
  'lead_intelligence',
  'strategy_intelligence',
  'website_intelligence',
  'growth_intelligence',
  'damage_control',
  'sovereign_brain',
  'human_response_engine',
  'member_success',
  'data_warehouse',
  'knowledge_acquisition',
  'brand_intelligence',
  'affiliate',
  'brenda_books',
  'ghl_operations',
  'geelark_operations',
  'infrastructure',
];

export const TIERS = ['T1-EXEC', 'T2-HIGH', 'T3-FULL'];

export const TIER_LABELS = {
  'T3-FULL': 'Franchise',
  'T2-HIGH': 'Veteran',
  'T1-EXEC': 'Rookie',
};

export const PLAN_LIMITS = {
  starter:     { tiers: ['T1-EXEC'],                       max_agents: 5,    max_workflows: 10  },
  growth:      { tiers: ['T1-EXEC', 'T2-HIGH'],            max_agents: 25,   max_workflows: 9999 },
  pro:         { tiers: ['T1-EXEC', 'T2-HIGH', 'T3-FULL'], max_agents: 9999, max_workflows: 9999 },
  white_label: { tiers: ['T1-EXEC', 'T2-HIGH', 'T3-FULL'], max_agents: 9999, max_workflows: 9999 },
};

export const POSTARMY_WORKSPACE_ID = '00000000-0000-0000-0000-000000000001';

export const AGENT_STATUSES = ['active', 'suspended', 'retired', 'in_training', 'production_ready'];

export const AGENT_ATTRIBUTES = [
  'reasoning_depth',
  'execution_speed',
  'reliability',
  'creativity',
  'autonomy',
  'communication',
  'collaboration_score',
  'delegation_quality',
];
