// Agent OS shared type documentation (JSDoc — no TypeScript)

/**
 * @typedef {Object} WisAgent
 * @property {string} id - UUID
 * @property {string} workspace_id - UUID FK to workspaces
 * @property {string|null} agent_registry_id - TEXT reference to Brenda DB agent_registry.agent_id
 * @property {string} name
 * @property {string} display_name
 * @property {string} department
 * @property {'T1-EXEC'|'T2-HIGH'|'T3-FULL'} tier
 * @property {'active'|'suspended'|'retired'|'in_training'|'production_ready'} status
 * @property {string[]} capabilities
 * @property {string[]} assigned_workflows
 * @property {string[]} platform_access
 * @property {string|null} a2a_url
 * @property {Object} agent_card
 * @property {boolean} a2a_active
 * @property {'claude'|'qwen-executor'|'qwen-research'|'qwen-multilingual'} model_provider
 * @property {string} model_name
 * @property {boolean} thinking_mode
 * @property {Object} model_override_rules
 * @property {string|null} supervisor_agent_id
 */

/**
 * @typedef {Object} Workflow
 * @property {string} id
 * @property {string} workspace_id
 * @property {string} name
 * @property {'ghl'|'geelark'|'bullmq'|'make'|'multi'} platform
 * @property {'event'|'scheduled'|'webhook'|'manual'} trigger_type
 * @property {Object[]} steps
 * @property {'draft'|'active'|'paused'|'archived'} status
 */

/**
 * @typedef {Object} A2ATask
 * @property {string} id
 * @property {string} a2a_task_id
 * @property {string} workspace_id
 * @property {'submitted'|'working'|'input-required'|'completed'|'failed'} status
 * @property {number} round_number
 */
