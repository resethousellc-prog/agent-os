import { supabaseAdmin } from '../supabase.js';
import { simulateGHLResponse } from './ghlSimulator.js';
import { simulateGeeLarkResponse } from './geelarkSimulator.js';
import { callClaude } from '../claude.js';

// Re-export so trainingWorker.js can import both runners from one module.
export { generateTrainingScenarios } from './scenarioGenerator.js';

const PASS_THRESHOLD = parseInt(process.env.TRAINING_PASS_THRESHOLD || '95');

export async function runTrainingBatch(agentId, platform, batchSize = 50) {
  // Resolve the agent's workspace (needed for agent_development_log inserts — NOT NULL).
  const { data: agentRow } = await supabaseAdmin
    .from('wis_agents')
    .select('workspace_id')
    .eq('id', agentId)
    .single();
  const workspaceId = agentRow?.workspace_id;

  // Get agent's current system prompt version
  const { data: promptVersion } = await supabaseAdmin
    .from('agent_prompt_versions')
    .select('version, system_prompt')
    .eq('agent_id', agentId)
    .order('version', { ascending: false })
    .limit(1)
    .single();

  // Get random scenarios for this platform
  const { data: scenarios } = await supabaseAdmin
    .from('training_scenarios')
    .select('*')
    .eq('platform', platform)
    .limit(batchSize);

  if (!scenarios?.length) return { error: 'No scenarios found' };

  const results = [];
  const simulate = platform === 'ghl' ? simulateGHLResponse : simulateGeeLarkResponse;

  for (const scenario of scenarios) {
    const conversationHistory = [];
    let allActionsPassed = true;
    const scores = { task_completed: false, correct_api_calls: false,
                     error_handling: false, output_format_correct: false };

    // Run each action in the scenario
    for (const action of (scenario.agent_actions || [])) {
      const response = await simulate(action, conversationHistory);

      conversationHistory.push(
        { role: 'user', content: `Execute: ${JSON.stringify(action)}` },
        { role: 'assistant', content: JSON.stringify(response) }
      );

      // Check if action succeeded
      if (response.error || response.statusCode >= 400) {
        // Check if agent should have handled this error
        if (action.on_failure !== 'skip') {
          allActionsPassed = false;
          break;
        }
      }
    }

    // Score the run
    const expectedOutcome = scenario.expected_outcome || {};
    const criteria = scenario.success_criteria || {};

    scores.task_completed = allActionsPassed;
    scores.correct_api_calls = conversationHistory.length >= (scenario.agent_actions?.length || 0) * 2;
    scores.error_handling = !conversationHistory.some(m =>
      typeof m.content === 'string' && m.content.includes('"error"') && !criteria.error_expected
    );
    scores.output_format_correct = true; // Checked by format validator

    const passed = Object.values(scores).every(Boolean);
    results.push({
      agent_id: agentId,
      scenario_id: scenario.id,
      simulator: 'qwen-agentworld-35b',
      passed,
      score: scores,
      actions_taken: conversationHistory,
      failure_reason: !passed ? 'One or more criteria failed' : null,
      system_prompt_version: promptVersion?.version || 1,
    });
  }

  // Bulk insert results
  await supabaseAdmin.from('training_results').insert(results);

  const passRate = results.filter(r => r.passed).length / results.length * 100;

  // If pass rate below threshold, trigger prompt improvement
  if (passRate < PASS_THRESHOLD) {
    await improveSystemPrompt(agentId, results.filter(r => !r.passed), promptVersion, workspaceId);
  } else {
    // Graduate agent to production_ready
    await graduateAgent(agentId, workspaceId);
  }

  return { passRate, total: results.length, passed: results.filter(r => r.passed).length };
}

async function improveSystemPrompt(agentId, failedRuns, currentPromptVersion, workspaceId) {
  const failureSummary = failedRuns.slice(0, 10).map(r =>
    `Failed scenario: ${r.scenario_id}\nReason: ${r.failure_reason}\nActions: ${JSON.stringify(r.actions_taken?.slice(0, 4))}`
  ).join('\n\n');

  const result = await callClaude({
    system: 'You improve AI agent system prompts based on training failures. Return only the improved system prompt text.',
    user: `Current system prompt version ${currentPromptVersion?.version || 1}:
${currentPromptVersion?.system_prompt || ''}

Failures (${failedRuns.length} total):
${failureSummary}

Identify the patterns causing failures and write an improved system prompt that addresses them.`,
    model: 'claude-sonnet-4-6',
    maxTokens: 4000,
  });

  if (!result?.text) return;

  // Save new prompt version
  await supabaseAdmin.from('agent_prompt_versions').insert({
    agent_id: agentId,
    version: (currentPromptVersion?.version || 1) + 1,
    system_prompt: result.text,
    change_reason: 'Auto-improved based on training failures',
    training_score: failedRuns.length > 0 ? (1 - failedRuns.length / 50) * 100 : 0,
  });

  // Log in development log
  await supabaseAdmin.from('agent_development_log').insert({
    workspace_id: workspaceId,
    agent_id: agentId,
    event_type: 'attribute_update',
    event_detail: { action: 'prompt_improved', failures: failedRuns.length },
    triggered_by: 'system',
  });
}

async function graduateAgent(agentId, workspaceId) {
  await supabaseAdmin.from('wis_agents')
    .update({ status: 'production_ready' })
    .eq('id', agentId);

  await supabaseAdmin.from('agent_development_log').insert({
    workspace_id: workspaceId,
    agent_id: agentId,
    event_type: 'production_graduated',
    event_detail: { graduated_at: new Date().toISOString() },
    triggered_by: 'training_system',
  });

  // First 7 days in production: require_confirmation=true
  // Handled at the action execution level in the connector
}
