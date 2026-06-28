import { callClaude } from './claude.js';
import { callQwen } from './qwen.js';

// Task type → model config
const TASK_ROUTING = {
  // T1-EXEC tasks → Qwen3-14B (fast, cheap, DashScope)
  'json_extraction':      { url: () => process.env.QWEN_EXECUTOR_URL,      model: () => process.env.QWEN_EXECUTOR_MODEL },
  'content_variation':    { url: () => process.env.QWEN_EXECUTOR_URL,      model: () => process.env.QWEN_EXECUTOR_MODEL },
  'classification':       { url: () => process.env.QWEN_EXECUTOR_URL,      model: () => process.env.QWEN_EXECUTOR_MODEL },
  'template_filling':     { url: () => process.env.QWEN_EXECUTOR_URL,      model: () => process.env.QWEN_EXECUTOR_MODEL },
  'api_call':             { url: () => process.env.QWEN_EXECUTOR_URL,      model: () => process.env.QWEN_EXECUTOR_MODEL },
  'routing_decision':     { url: () => process.env.QWEN_EXECUTOR_URL,      model: () => process.env.QWEN_EXECUTOR_MODEL },
  'dedup_check':          { url: () => process.env.QWEN_EXECUTOR_URL,      model: () => process.env.QWEN_EXECUTOR_MODEL },
  'log_formatting':       { url: () => process.env.QWEN_EXECUTOR_URL,      model: () => process.env.QWEN_EXECUTOR_MODEL },

  // Research tasks → Qwen3-32B
  'rag_retrieval':        { url: () => process.env.QWEN_RESEARCH_URL,      model: () => process.env.QWEN_RESEARCH_MODEL },
  'research_summary':     { url: () => process.env.QWEN_RESEARCH_URL,      model: () => process.env.QWEN_RESEARCH_MODEL },
  'math_calculation':     { url: () => process.env.QWEN_RESEARCH_URL,      model: () => process.env.QWEN_RESEARCH_MODEL },
  'report_generation':    { url: () => process.env.QWEN_RESEARCH_URL,      model: () => process.env.QWEN_RESEARCH_MODEL },

  // Multilingual → Qwen multilingual
  'portuguese_content':   { url: () => process.env.QWEN_MULTILINGUAL_URL,  model: () => process.env.QWEN_MULTILINGUAL_MODEL },
  'spanish_content':      { url: () => process.env.QWEN_MULTILINGUAL_URL,  model: () => process.env.QWEN_MULTILINGUAL_MODEL },
  'translation':          { url: () => process.env.QWEN_MULTILINGUAL_URL,  model: () => process.env.QWEN_MULTILINGUAL_MODEL },

  // Simulation → AgentWorld
  // Phase 1: DashScope QWEN_AGENTWORLD_URL
  // Phase 2: Railway H100 — just swap env var, code unchanged
  'simulation':           { url: () => process.env.QWEN_AGENTWORLD_URL,    model: () => process.env.QWEN_AGENTWORLD_MODEL },
  'agent_training':       { url: () => process.env.QWEN_AGENTWORLD_URL,    model: () => process.env.QWEN_AGENTWORLD_MODEL },
  'ghl_simulation':       { url: () => process.env.QWEN_AGENTWORLD_URL,    model: () => process.env.QWEN_AGENTWORLD_MODEL },
  'geelark_simulation':   { url: () => process.env.QWEN_AGENTWORLD_URL,    model: () => process.env.QWEN_AGENTWORLD_MODEL },

  // T2/T3 tasks → Claude (non-negotiable)
  'workflow_design':      null,
  'agent_creation':       null,
  'brand_copy':           null,
  'high_stakes_action':   null,
  'scaffold_generation':  null,
  'strategy':             null,
  'improvement_analysis': null,
};

const TIER_DEFAULT = {
  'T1-EXEC': { url: () => process.env.QWEN_EXECUTOR_URL, model: () => process.env.QWEN_EXECUTOR_MODEL },
  'T2-HIGH': null,  // Claude
  'T3-FULL': null,  // Claude
};

// Call Qwen and transparently fall back to Claude if Qwen is unavailable
// (cold start, rate limit, empty response, missing config, etc.).
export async function callQwenWithFallback({ endpoint, model, system, user, messages, options = {} }) {
  const qwenMessages = messages || [
    ...(system ? [{ role: 'system', content: system }] : []),
    ...(user   ? [{ role: 'user',   content: user   }] : []),
  ];

  const enableThinking = options.thinking ||
    ((options.complexityScore || 0) > parseFloat(process.env.QWEN_THINKING_THRESHOLD || '0.7'));

  const result = await callQwen({
    endpoint, model, messages: qwenMessages,
    enableThinking,
    maxTokens: options.maxTokens || 2048,
    temperature: options.temperature || 0.7,
  });

  if (!result?.text) {
    console.warn('[ModelRouter] Qwen unavailable, falling back to Claude');
    const fallback = await callClaude({
      system,
      user: user || qwenMessages.map(m => m.content).join('\n\n'),
      model: 'claude-sonnet-4-6',
    });
    return { ...fallback, model: 'claude-fallback', provider: 'claude' };
  }

  return { ...result, model: 'qwen', endpoint, qwenModel: model, provider: 'qwen' };
}

export async function routeTask({
  taskType,
  agentTier,
  messages,
  system,
  user,
  options = {},
}) {
  const routing = TASK_ROUTING[taskType] !== undefined
    ? TASK_ROUTING[taskType]
    : (TIER_DEFAULT[agentTier] || null);

  const isQwen = routing !== null;

  if (isQwen) {
    const endpoint = routing.url();
    const model = routing.model();

    // Qwen with transparent Claude fallback.
    return callQwenWithFallback({ endpoint, model, system, user, messages, options });
  }

  // Route to Claude
  const result = await callClaude({
    system, user,
    model: 'claude-sonnet-4-6',
    maxTokens: options.maxTokens || 2000,
  });
  return { ...result, model: 'claude' };
}

export function enrichJobWithModelTier(jobData, agentTier) {
  return {
    ...jobData,
    model_tier: agentTier || 'T1-EXEC',
    task_type: jobData.task_type || 'classification',
  };
}
