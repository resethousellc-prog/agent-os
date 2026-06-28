// Nightly loop-performance metrics (cron: 02:00).
// For each interaction loop, summarize the last 24h of threads into loop_performance,
// flagging loops whose success rate falls below the alert threshold for improvement.
import { Worker } from 'bullmq';
import { connection, loopPerformanceQueue } from '../services/bullmq.js';
import { supabaseAdmin } from '../services/supabase.js';

export async function calcLoopPerformance(workspaceId, periodHours = 24) {
  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - periodHours * 60 * 60 * 1000);
  const threshold = parseInt(process.env.SUCCESS_RATE_ALERT_THRESHOLD || '70');

  const { data: loops } = await supabaseAdmin
    .from('interaction_loops')
    .select('id')
    .eq('workspace_id', workspaceId);

  const inserted = [];
  for (const loop of loops || []) {
    const { data: threads } = await supabaseAdmin
      .from('interaction_threads')
      .select('status, current_round, rounds_total, duration_ms')
      .eq('loop_id', loop.id)
      .gte('started_at', periodStart.toISOString());

    const total = threads?.length || 0;
    if (!total) continue;

    const completed = threads.filter(t => t.status === 'completed').length;
    const escalated = threads.filter(t => t.status === 'escalated').length;
    const timedOut = threads.filter(t => t.status === 'timed_out').length;
    const roundsSum = threads.reduce((s, t) => s + (t.rounds_total || t.current_round || 1), 0);
    const durationSum = threads.reduce((s, t) => s + (t.duration_ms || 0), 0);
    const successRate = Math.round((completed / total) * 1000) / 10;

    const { data: row } = await supabaseAdmin
      .from('loop_performance')
      .insert({
        loop_id: loop.id,
        workspace_id: workspaceId,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        threads_total: total,
        threads_completed: completed,
        threads_escalated: escalated,
        threads_timed_out: timedOut,
        avg_rounds: Math.round((roundsSum / total) * 100) / 100,
        avg_duration_ms: Math.round(durationSum / total),
        success_rate: successRate,
        improvement_flag: successRate < threshold,
      })
      .select()
      .single();

    if (row) inserted.push(row);
  }

  return { loops: inserted.length };
}

export function startLoopPerformanceWorker() {
  if (!connection) return null;
  return new Worker('loop-performance', async (job) => {
    const { workspace_id } = job.data;
    if (workspace_id) return calcLoopPerformance(workspace_id);

    const { data: workspaces } = await supabaseAdmin.from('workspaces').select('id');
    for (const w of workspaces || []) await calcLoopPerformance(w.id);
    return { workspaces: workspaces?.length || 0 };
  }, { connection });
}

// Schedule the nightly run (02:00 daily).
export async function scheduleLoopPerformance(workspaceId) {
  return loopPerformanceQueue.add(
    'LOOP-PERFORMANCE',
    { workspace_id: workspaceId },
    { repeat: { pattern: '0 2 * * *' } }
  );
}
