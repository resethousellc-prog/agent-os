// Weekly graduation check (Monday 3am). Auto-graduates in_training agents at
// >=95% pass rate; flags stale (>7 day) under-threshold agents for re-training.
// Fail-soft: the Queue/Worker only run when Redis is configured.
import { Worker, Queue } from 'bullmq';
import { connection } from '../services/bullmq.js';
import { supabaseAdmin } from '../services/supabase.js';

export const graduationQueue = connection
  ? new Queue('graduation-check', { connection })
  : { name: 'graduation-check', async add() { return null; } };

export const graduationWorker = connection
  ? new Worker('graduation-check', async (job) => {
      if (job.name !== 'GRADUATION-CHECK-WEEKLY') return;

      const { data: agents } = await supabaseAdmin
        .from('wis_agents')
        .select('id, workspace_id, name, display_name')
        .eq('status', 'in_training');

      for (const agent of agents || []) {
        try {
          // Get recent training results
          const { data: results } = await supabaseAdmin
            .from('training_results')
            .select('passed, run_at')
            .eq('agent_id', agent.id)
            .order('run_at', { ascending: false })
            .limit(50);

          if (!results || results.length < 10) {
            console.log(`[graduationWorker] Agent ${agent.name}: insufficient training data (${results?.length || 0} runs)`);
            continue;
          }

          const passed   = results.filter(r => r.passed).length;
          const passRate = passed / results.length;

          if (passRate >= 0.95) {
            // Auto-graduate
            await supabaseAdmin.from('wis_agents')
              .update({ status: 'production_ready' })
              .eq('id', agent.id);

            await supabaseAdmin.from('agent_development_log').insert({
              workspace_id: agent.workspace_id,
              agent_id:     agent.id,
              event_type:   'production_graduated',
              event_detail: { pass_rate: passRate, runs_evaluated: results.length },
              triggered_by: 'system',
            });

            console.log(`[graduationWorker] Graduated ${agent.name} (${(passRate * 100).toFixed(1)}% pass rate)`);
          } else {
            // Check if re-training is needed (last training > 7 days ago)
            const lastRun = results[0]?.run_at;
            const daysSinceLastRun = lastRun
              ? (Date.now() - new Date(lastRun)) / (1000 * 60 * 60 * 24)
              : 999;

            if (daysSinceLastRun > 7) {
              await supabaseAdmin.from('agent_development_log').insert({
                workspace_id: agent.workspace_id,
                agent_id:     agent.id,
                event_type:   'training_started',
                event_detail: {
                  reason:       'stale_training',
                  pass_rate:    passRate,
                  days_since:   Math.round(daysSinceLastRun),
                  action:       'retraining_scheduled',
                },
                triggered_by: 'system',
              });
              console.log(`[graduationWorker] Scheduled re-training for ${agent.name} (${(passRate * 100).toFixed(1)}% pass, ${Math.round(daysSinceLastRun)} days stale)`);
            } else {
              console.log(`[graduationWorker] ${agent.name}: ${(passRate * 100).toFixed(1)}% pass rate — not ready yet`);
            }
          }
        } catch (err) {
          console.error(`[graduationWorker] Error for agent ${agent.id}:`, err.message);
        }
      }
    }, { connection })
  : null;

// Monday 3am — only when Redis is available.
if (connection) {
  graduationQueue.add('GRADUATION-CHECK-WEEKLY', {}, {
    repeat: { pattern: '0 3 * * 1' },
    jobId:  'graduation-check-weekly',
  });
  console.log('[graduationWorker] Weekly graduation check scheduled (Monday 3am)');
}
