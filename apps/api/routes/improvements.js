import { Router } from 'express';
import { humanAuth } from '../middleware/humanAuth.js';
import { supabaseAdmin } from '../services/supabase.js';

const router = Router();
router.use(humanAuth);

// GET /api/improvements — list improvement suggestions (optional ?status= / ?workflow_id=)
router.get('/', async (req, res) => {
  const { status, workflow_id } = req.query;
  let query = supabaseAdmin
    .from('improvements')
    .select('*, workflows(name, platform, department)')
    .eq('workspace_id', req.workspaceId)
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);
  if (workflow_id) query = query.eq('workflow_id', workflow_id);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ improvements: data || [] });
});

// POST /api/improvements/:id/apply — mark an improvement as applied
router.post('/:id/apply', async (req, res) => {
  const { applied_version } = req.body;
  const { data, error } = await supabaseAdmin
    .from('improvements')
    .update({ status: 'applied', applied_version: applied_version ?? null })
    .eq('id', req.params.id)
    .eq('workspace_id', req.workspaceId)
    .select()
    .single();

  if (error || !data) return res.status(404).json({ error: 'Improvement not found' });
  res.json({ improvement: data });
});

// POST /api/improvements/:id/dismiss — dismiss an improvement
router.post('/:id/dismiss', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('improvements')
    .update({ status: 'dismissed' })
    .eq('id', req.params.id)
    .eq('workspace_id', req.workspaceId)
    .select()
    .single();

  if (error || !data) return res.status(404).json({ error: 'Improvement not found' });
  res.json({ improvement: data });
});

export default router;
