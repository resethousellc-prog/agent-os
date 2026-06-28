// Weekly attribute recalculation (cron: Sunday midnight).
// Recomputes reliability/execution_speed from the last 30 days of runs (±5 cap/week),
// flags agents whose reliability drops below 60, and surfaces T2-HIGH tier-unlock
// eligibility. Fail-soft: the Queue/Worker only run when Redis is configured.
import { Worker, Queue } from 'bullmq';
import { connection } from '../services/bullmq.js';
import { supabaseAdmin } from '../services/supabase.js';

export const attributeQueue = connection
  ? new Queue('attribute-recalc', { connection })
  : { name: 'attribute-recalc', async add() { return null; } };

async function checkTierUnlockEligibility(agentId, workspaceId) {
  const { data: agent } = await supabaseAdmin
    .from('wis_agents')
    .select('tier, created_at, status')
    .eq('id', agentId)
    .single();

  if (!agent || agent.tier !== 'T1-EXEC' || agent.status !== 'active') return;

  const daysSinceCreation = (Date.now() - new Date(agent.created_at)) / (1000 * 60 * 60 * 24);
  if (daysSinceCreation < 30) return;

  const { count } = await supabaseAdmin
    .from('workflow_runs')
    .select('*', { count: 'exact', head: true })
    .eq('agent_id', agentId)
    .eq('status', 'success');

  if (count >= 500) {
    await supabaseAdmin.from('agent_development_log').insert({
      workspace_id: workspaceId,
      agent_id: agentId,
      event_type: 'attribute_update',
      event_detail: {
        notification: 'T2_UNLOCK_ELIGIBLE',
        days_active: Math.round(daysSinceCreation),
        successful_runs: count,
        message: 'This agent is eligible for T2-HIGH promotion. Review in Draft Room.',
      },
      triggered_by: 'system',
    });
  }
}

export async function recalcAttributes() {
  const { data: agents } = await supabaseAdmin
    .from('wis_agents')
    .select('id, workspace_id, tier')
    .eq('status', 'active');

  for (const agent of agents || []) {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: runs } = await supabaseAdmin
        .from('workflow_runs')
        .select('status, duration_ms, steps_completed, steps_total')
        .eq('agent_id', agent.id)
        .gte('started_at', thirtyDaysAgo);

      if (!runs || runs.length < 5) continue; // Not enough data

      const total       = runs.length;
      const successful  = runs.filter(r => r.status === 'success').length;
      const successRate = successful / total;
      const avgDuration = runs.reduce((s, r) => s + (r.duration_ms || 0), 0) / total;

      const { data: current } = await supabaseAdmin
        .from('agent_attributes')
        .select('*')
        .eq('agent_id', agent.id)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single();

      const prev = current || {};

      // Map run stats to attribute scores (±5 cap per week)
      const cap = (prev_val = 50, new_val) => {
        const diff = Math.max(-5, Math.min(5, new_val - prev_val));
        return Math.max(0, Math.min(100, prev_val + diff));
      };

      const newAttrs = {
        reliability:      cap(prev.reliability, successRate * 100),
        execution_speed:  cap(prev.execution_speed, Math.max(0, 100 - avgDuration / 1000)),
        reasoning_depth:  prev.reasoning_depth  ?? 50,
        creativity:       prev.creativity       ?? 50,
        autonomy:         prev.autonomy         ?? 50,
        communication:    prev.communication    ?? 50,
        collaboration_score: prev.collaboration_score ?? 50,
        delegation_quality:  prev.delegation_quality  ?? 50,
        escalation_rate:  ((total - successful) / total) * 100,
      };

      await supabaseAdmin.from('agent_attributes').insert({
        workspace_id: agent.workspace_id,
        agent_id: agent.id,
        ...newAttrs,
      });

      if (newAttrs.reliability < 60) {
        await supabaseAdmin.from('agent_development_log').insert({
          workspace_id: agent.workspace_id,
          agent_id: agent.id,
          event_type: 'flagged',
          event_detail: { reason: 'reliability_below_60', reliability: newAttrs.reliability },
          triggered_by: 'system',
        });
      }

      await checkTierUnlockEligibility(agent.id, agent.workspace_id);
    } catch (err) {
      console.error(`[attributeWorker] Error for agent ${agent.id}:`, err.message);
    }
  }

  console.log(`[attributeWorker] Recalculated attributes for ${agents?.length || 0} agents`);
}

export const attributeWorker = connection
  ? new Worker('attribute-recalc', async (job) => {
      if (job.name !== 'ATTRIBUTE-RECALC-WEEKLY') return;
      await recalcAttributes();
    }, { connection })
  : null;

// Schedule weekly cron (Sunday midnight) — only when Redis is available.
if (connection) {
  attributeQueue.add('ATTRIBUTE-RECALC-WEEKLY', {}, {
    repeat: { pattern: '0 0 * * 0' },
    jobId: 'attribute-recalc-weekly',
  }).catch(() => { /* scheduling is best-effort */ });
  console.log('[attributeWorker] Weekly attribute recalc scheduled (Sunday midnight)');
}
