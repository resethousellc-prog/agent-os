import { Router } from 'express';
import { humanAuth } from '../middleware/humanAuth.js';
import { supabaseAdmin } from '../services/supabase.js';

const router = Router();
router.use(humanAuth);

// GET /api/monitor — workspace run summary over the last N days (default 7)
router.get('/', async (req, res) => {
  const days = Math.min(parseInt(req.query.days || '7'), 90);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data: runs, error } = await supabaseAdmin
    .from('workflow_runs')
    .select('status, duration_ms, started_at')
    .eq('workspace_id', req.workspaceId)
    .gte('started_at', since);

  if (error) return res.status(500).json({ error: error.message });

  const total = runs?.length || 0;
  const byStatus = { running: 0, success: 0, failed: 0, partial: 0 };
  let durationSum = 0;
  let durationCount = 0;
  for (const r of runs || []) {
    if (byStatus[r.status] !== undefined) byStatus[r.status]++;
    if (typeof r.duration_ms === 'number') { durationSum += r.duration_ms; durationCount++; }
  }
  const completed = byStatus.success + byStatus.failed + byStatus.partial;
  const success_rate = completed ? Math.round((byStatus.success / completed) * 1000) / 10 : null;

  res.json({
    period_days: days,
    total_runs: total,
    by_status: byStatus,
    success_rate,
    avg_duration_ms: durationCount ? Math.round(durationSum / durationCount) : null,
  });
});

// GET /api/monitor/workflows/:id — per-workflow run metrics
router.get('/workflows/:id', async (req, res) => {
  // Ensure the workflow belongs to this workspace
  const { data: workflow } = await supabaseAdmin
    .from('workflows')
    .select('id, name, status')
    .eq('id', req.params.id)
    .eq('workspace_id', req.workspaceId)
    .single();

  if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

  const { data: runs, error } = await supabaseAdmin
    .from('workflow_runs')
    .select('status, duration_ms, started_at, completed_at')
    .eq('workflow_id', req.params.id)
    .order('started_at', { ascending: false })
    .limit(100);

  if (error) return res.status(500).json({ error: error.message });

  const total = runs?.length || 0;
  const succeeded = (runs || []).filter(r => r.status === 'success').length;
  const failed = (runs || []).filter(r => r.status === 'failed').length;
  const completed = (runs || []).filter(r => r.status !== 'running').length;

  res.json({
    workflow,
    metrics: {
      total_runs: total,
      succeeded,
      failed,
      success_rate: completed ? Math.round((succeeded / completed) * 1000) / 10 : null,
    },
    recent_runs: runs || [],
  });
});

export default router;
