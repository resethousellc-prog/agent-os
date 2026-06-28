// Improvement-cycle worker.
// Consumes the 'improvement-cycle' queue and runs AI improvement analysis for
// workflows and (Session 9 addendum) flagged interaction loops. Re-exports
// escalationAlertQueue so agent-facing routes can dynamically import it
// (see routes/agentApi.js). Fail-soft: the Worker only starts when Redis is available.
import { Worker } from 'bullmq';
import { connection, escalationAlertQueue, improvementQueue } from '../services/bullmq.js';
import { supabaseAdmin } from '../services/supabase.js';
import { callClaude } from '../services/claude.js';

export { escalationAlertQueue, improvementQueue };

// Analyze interaction loops flagged for improvement and store suggestions.
export async function analyzeFlaggedLoops() {
  const { data: flaggedLoops } = await supabaseAdmin
    .from('loop_performance')
    .select('*, interaction_loops(*)')
    .eq('improvement_flag', true)
    .gte('calculated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

  for (const lp of flaggedLoops || []) {
    const timeoutRate = lp.threads_total
      ? Math.round((lp.threads_timed_out / lp.threads_total) * 1000) / 10
      : 0;

    const analysis = await callClaude({
      system: 'You analyze AI agent interaction loop performance and suggest improvements. Return JSON.',
      user: `Loop: ${lp.interaction_loops?.name}
Type: ${lp.interaction_loops?.interaction_type}
Performance: success_rate=${lp.success_rate}%, avg_rounds=${lp.avg_rounds}, escalation_rate=${lp.escalation_rate}%
Bottleneck agent round: ${lp.bottleneck_round}
Timeout rate: ${timeoutRate}%

Suggest specific improvements. Return JSON: { analysis, suggestions: [], impact_level: 'high|medium|low' }`,
      model: 'claude-sonnet-4-6',
    });

    if (analysis?.text) {
      try {
        const parsed = JSON.parse(analysis.text.replace(/```json|```/g, '').trim());
        await supabaseAdmin.from('improvements').insert({
          workspace_id: lp.interaction_loops?.workspace_id,
          workflow_id: null, // loop improvement, not workflow
          generated_by: 'scheduled_analysis',
          analysis: parsed.analysis,
          suggestions: parsed.suggestions,
          impact_level: parsed.impact_level || 'medium',
          // loop_id captured in suggestions metadata by the analyzer
        });
      } catch { /* skip malformed analysis */ }
    }
  }

  return { analyzed: flaggedLoops?.length || 0 };
}

export const improvementWorker = connection
  ? new Worker(
      'improvement-cycle',
      async (job) => {
        // Workflow-level analysis is handled inline by the agent run logger;
        // the nightly job sweeps flagged interaction loops here.
        console.log('[improvementWorker] received', job.name, job.id);
        const loops = await analyzeFlaggedLoops();
        return { ok: true, ...loops };
      },
      { connection }
    )
  : null;
