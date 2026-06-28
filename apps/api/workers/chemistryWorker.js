// Weekly chemistry recalculation (cron: Sunday 1am).
// For each agent pair in a workspace, pull the last 30 days of shared threads and
// recompute a 0-100 chemistry score, then replace the workspace's agent_chemistry rows.
import { Worker } from 'bullmq';
import { connection, chemistryRecalcQueue } from '../services/bullmq.js';
import { supabaseAdmin } from '../services/supabase.js';

const clamp01 = (n) => Math.max(0, Math.min(1, n));

export async function recalcChemistry(workspaceId, days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data: threads } = await supabaseAdmin
    .from('interaction_threads')
    .select('participant_agent_ids, status, current_round, rounds_total, duration_ms')
    .eq('workspace_id', workspaceId)
    .gte('started_at', since);

  // Accumulate per unordered agent pair.
  const pairs = new Map();
  for (const t of threads || []) {
    const ids = [...new Set(t.participant_agent_ids || [])];
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const sorted = [ids[i], ids[j]].sort(); // smallest UUID first
        const key = sorted.join('::');
        const acc = pairs.get(key) || {
          agent_ids: sorted, total: 0, successful: 0, escalated: 0, rounds: 0, duration: 0,
        };
        acc.total += 1;
        if (t.status === 'completed') acc.successful += 1;
        if (t.status === 'escalated') acc.escalated += 1;
        acc.rounds += (t.rounds_total || t.current_round || 1);
        acc.duration += (t.duration_ms || 0);
        pairs.set(key, acc);
      }
    }
  }

  const rows = [];
  for (const acc of pairs.values()) {
    const success = acc.successful / acc.total;
    const escalation = acc.escalated / acc.total;
    const avgRounds = acc.rounds / acc.total;
    const avgDuration = Math.round(acc.duration / acc.total);
    const roundEfficiency = clamp01(1 - (avgRounds - 1) / 9);   // 1 round → 1.0, 10+ → 0
    const speed = clamp01(1 - avgDuration / 300000);            // 0ms → 1, ≥300s → 0
    const base = (success * 0.4) + ((1 - escalation) * 0.3) + (roundEfficiency * 0.2) + (speed * 0.1);

    rows.push({
      workspace_id: workspaceId,
      agent_ids: acc.agent_ids,
      threads_total: acc.total,
      threads_successful: acc.successful,
      avg_rounds: Math.round(avgRounds * 100) / 100,
      avg_duration_ms: avgDuration,
      escalation_rate: Math.round(escalation * 10000) / 100,
      chemistry_score: Math.round(base * 100),
      last_calculated_at: new Date().toISOString(),
      calculated_from_days: days,
    });
  }

  // Replace this workspace's chemistry snapshot.
  await supabaseAdmin.from('agent_chemistry').delete().eq('workspace_id', workspaceId);
  if (rows.length) await supabaseAdmin.from('agent_chemistry').insert(rows);

  return { pairs: rows.length };
}

export function startChemistryWorker() {
  if (!connection) return null;
  return new Worker('chemistry-recalc', async (job) => {
    const { workspace_id } = job.data;
    if (workspace_id) return recalcChemistry(workspace_id);

    // No workspace specified → recalc all workspaces.
    const { data: workspaces } = await supabaseAdmin.from('workspaces').select('id');
    for (const w of workspaces || []) await recalcChemistry(w.id);
    return { workspaces: workspaces?.length || 0 };
  }, { connection });
}

// Schedule the weekly recalc (Sunday 01:00).
export async function scheduleChemistryRecalc(workspaceId) {
  return chemistryRecalcQueue.add(
    'CHEMISTRY-RECALC',
    { workspace_id: workspaceId },
    { repeat: { pattern: '0 1 * * 0' } }
  );
}
