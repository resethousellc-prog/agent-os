import { Router } from 'express';
import { humanAuth } from '../middleware/humanAuth.js';
import { supabaseAdmin } from '../services/supabase.js';

const router = Router();
router.use(humanAuth);

const VALID_PLATFORMS = ['ghl', 'geelark'];

// GET /api/platforms — list platform connections for this workspace
router.get('/', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('platform_connections')
    .select('*')
    .eq('workspace_id', req.workspaceId)
    .order('platform', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ connections: data || [] });
});

// POST /api/platforms — connect a platform (ghl | geelark)
// IMPORTANT: credentials must store env var NAMES only, never raw keys.
router.post('/', async (req, res) => {
  const { platform, credentials = {}, config = {} } = req.body;
  if (!VALID_PLATFORMS.includes(platform)) {
    return res.status(400).json({ error: `platform must be one of: ${VALID_PLATFORMS.join(', ')}` });
  }

  const { data, error } = await supabaseAdmin
    .from('platform_connections')
    .insert({
      workspace_id: req.workspaceId,
      platform,
      credentials, // env var NAMES only
      config,
      status: 'connected',
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ connection: data });
});

// PUT /api/platforms/:id — update config / status / health
router.put('/:id', async (req, res) => {
  const { config, status, health_status, last_health_check, credentials } = req.body;
  const patch = {};
  if (config !== undefined) patch.config = config;
  if (status !== undefined) patch.status = status;
  if (health_status !== undefined) patch.health_status = health_status;
  if (last_health_check !== undefined) patch.last_health_check = last_health_check;
  if (credentials !== undefined) patch.credentials = credentials; // env var NAMES only

  const { data, error } = await supabaseAdmin
    .from('platform_connections')
    .update(patch)
    .eq('id', req.params.id)
    .eq('workspace_id', req.workspaceId)
    .select()
    .single();

  if (error || !data) return res.status(404).json({ error: 'Connection not found' });
  res.json({ connection: data });
});

// DELETE /api/platforms/:id — remove a connection
router.delete('/:id', async (req, res) => {
  await supabaseAdmin
    .from('platform_connections')
    .delete()
    .eq('id', req.params.id)
    .eq('workspace_id', req.workspaceId);
  res.json({ success: true });
});

// GET /api/platforms/monitor/ghl — GHL action metrics (30 days)
router.get('/monitor/ghl', async (req, res) => {
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: actions } = await supabaseAdmin
      .from('platform_actions_log')
      .select('action, status, duration_ms, created_at')
      .eq('workspace_id', req.workspaceId)
      .eq('platform', 'ghl')
      .gte('created_at', since);

    const total     = actions?.length || 0;
    const succeeded = actions?.filter(a => a.status === 'success').length || 0;
    const byAction  = {};

    for (const a of actions || []) {
      if (!byAction[a.action]) byAction[a.action] = { total: 0, success: 0, durations: [] };
      byAction[a.action].total++;
      if (a.status === 'success') byAction[a.action].success++;
      byAction[a.action].durations.push(a.duration_ms || 0);
    }
    for (const k of Object.keys(byAction)) {
      const d = byAction[k].durations;
      byAction[k].avg_ms       = d.length ? Math.round(d.reduce((a, b) => a + b, 0) / d.length) : 0;
      byAction[k].success_rate = byAction[k].total ? Math.round(byAction[k].success / byAction[k].total * 100) : 0;
      delete byAction[k].durations;
    }

    res.json({
      total_actions: total,
      success_rate:  total ? Math.round(succeeded / total * 100) : 0,
      by_action:     byAction,
      period_days:   30,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/platforms/monitor/geelark — GeeLark fleet metrics
router.get('/monitor/geelark', async (req, res) => {
  try {
    const { data: cells } = await supabaseAdmin
      .from('geelark_cells')
      .select('*')
      .eq('workspace_id', req.workspaceId);

    const byStatus = { active: 0, flagged: 0, suspended: 0, offline: 0, warmup: 0 };
    const byPod    = {};

    for (const cell of cells || []) {
      byStatus[cell.status] = (byStatus[cell.status] || 0) + 1;
      if (!byPod[cell.pod]) byPod[cell.pod] = { cells: 0, flagged: 0, scores: [] };
      byPod[cell.pod].cells++;
      if (cell.status === 'flagged') byPod[cell.pod].flagged++;
      byPod[cell.pod].scores.push(cell.health_score || 100);
    }
    for (const pod of Object.keys(byPod)) {
      const scores = byPod[pod].scores;
      byPod[pod].avg_health = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 100;
      delete byPod[pod].scores;
    }

    const sorted      = [...(cells || [])].sort((a, b) => (b.health_score || 0) - (a.health_score || 0));
    const topCells    = sorted.slice(0, 10).map(c => ({ name: c.name, health: c.health_score, pod: c.pod }));
    const bottomCells = sorted.slice(-10).map(c => ({ name: c.name, health: c.health_score, pod: c.pod }));

    res.json({
      total:      cells?.length || 0,
      by_status:  byStatus,
      by_pod:     byPod,
      top_10:     topCells,
      bottom_10:  bottomCells,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
