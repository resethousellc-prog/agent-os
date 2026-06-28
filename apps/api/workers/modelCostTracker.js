// Weekly model cost report (Sunday midnight) → system_reports table.
// Fail-soft: the Queue/Worker only run when Redis is configured, and the worker
// no-ops gracefully if system_reports does not yet exist (migration 017).
import { Worker, Queue } from 'bullmq';
import { connection } from '../services/bullmq.js';
import { supabaseAdmin } from '../services/supabase.js';

// Pricing constants (per 1M tokens, USD)
const CLAUDE_INPUT_PRICE  = 3.00;   // Claude Sonnet 4.6
const QWEN_PRICE          = 0.29;   // Groq qwen3.6-27b per 1M tokens
const AVG_TOKENS_PER_RUN  = 2000;   // Conservative estimate

export const modelCostQueue = connection
  ? new Queue('model-cost-tracker', { connection })
  : { name: 'model-cost-tracker', async add() { return null; } };

export const modelCostWorker = connection
  ? new Worker('model-cost-tracker', async (job) => {
      if (job.name !== 'MODEL-COST-WEEKLY') return;

      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // Get all workflow runs from last 7 days
      const { data: runs } = await supabaseAdmin
        .from('workflow_runs')
        .select('agent_id, metadata, created_at')
        .gte('created_at', weekAgo);

      // Get agent model providers
      const agentIds   = [...new Set((runs || []).map(r => r.agent_id).filter(Boolean))];
      const { data: agents } = agentIds.length
        ? await supabaseAdmin.from('wis_agents').select('id, model_provider').in('id', agentIds)
        : { data: [] };

      const providerMap = Object.fromEntries((agents || []).map(a => [a.id, a.model_provider]));

      let claudeRuns = 0;
      let qwenRuns   = 0;

      for (const run of runs || []) {
        const provider = providerMap[run.agent_id] || 'claude';
        if (provider === 'claude') claudeRuns++;
        else qwenRuns++;
      }

      const claudeCost = (claudeRuns * AVG_TOKENS_PER_RUN / 1_000_000) * CLAUDE_INPUT_PRICE;
      const qwenCost   = (qwenRuns   * AVG_TOKENS_PER_RUN / 1_000_000) * QWEN_PRICE;
      const totalCost  = claudeCost + qwenCost;

      const report = {
        period_start:       weekAgo,
        period_end:         new Date().toISOString(),
        claude_runs:        claudeRuns,
        qwen_runs:          qwenRuns,
        total_runs:         claudeRuns + qwenRuns,
        claude_cost_usd:    parseFloat(claudeCost.toFixed(4)),
        qwen_cost_usd:      parseFloat(qwenCost.toFixed(4)),
        total_cost_usd:     parseFloat(totalCost.toFixed(4)),
        avg_tokens_assumed: AVG_TOKENS_PER_RUN,
      };

      const { error } = await supabaseAdmin.from('system_reports').insert({
        report_type:  'model_cost',
        period_start: weekAgo,
        period_end:   new Date().toISOString(),
        data:         report,
        generated_by: 'system',
      });

      if (error) {
        console.error('[modelCostTracker] Could not write report (table missing?):', error.message);
        return;
      }

      console.log(`[modelCostTracker] Weekly cost report: $${totalCost.toFixed(4)} total (Claude: $${claudeCost.toFixed(4)}, Qwen: $${qwenCost.toFixed(4)})`);
    }, { connection })
  : null;

// Sunday midnight — only when Redis is available.
if (connection) {
  modelCostQueue.add('MODEL-COST-WEEKLY', {}, {
    repeat: { pattern: '0 0 * * 0' },
    jobId:  'model-cost-weekly',
  });
  console.log('[modelCostTracker] Weekly model cost tracker scheduled (Sunday midnight)');
}
