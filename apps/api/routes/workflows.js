import { Router } from 'express';
import { humanAuth } from '../middleware/humanAuth.js';
import { supabaseAdmin } from '../services/supabase.js';

const router = Router();
router.use(humanAuth);

// GET /api/workflows
router.get('/', async (req, res) => {
  const { status, platform, department, tag } = req.query;
  let query = supabaseAdmin
    .from('workflows')
    .select('*, wis_agents(name, tier)')
    .eq('workspace_id', req.workspaceId)
    .order('updated_at', { ascending: false });

  if (status) query = query.eq('status', status);
  if (platform) query = query.eq('platform', platform);
  if (department) query = query.eq('department', department);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ workflows: data });
});

// POST /api/workflows
router.post('/', async (req, res) => {
  const { name, description, platform, department, trigger_type,
          trigger_config, steps, conditions, error_handling,
          estimated_runtime, tags, scaffold_goal } = req.body;

  const { data, error } = await supabaseAdmin
    .from('workflows')
    .insert({
      workspace_id: req.workspaceId,
      name, description, platform, department, trigger_type,
      trigger_config, steps, conditions, error_handling,
      estimated_runtime, tags, scaffold_goal,
      created_by: req.user.id,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ workflow: data });
});

// GET /api/workflows/:id
router.get('/:id', async (req, res) => {
  const { data: workflow, error } = await supabaseAdmin
    .from('workflows')
    .select('*, wis_agents(name, tier, display_name)')
    .eq('id', req.params.id)
    .eq('workspace_id', req.workspaceId)
    .single();

  if (error || !workflow) return res.status(404).json({ error: 'Not found' });

  const { data: runs } = await supabaseAdmin
    .from('workflow_runs')
    .select('*')
    .eq('workflow_id', req.params.id)
    .order('started_at', { ascending: false })
    .limit(20);

  res.json({ workflow, runs: runs || [] });
});

// PUT /api/workflows/:id
router.put('/:id', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('workflows')
    .update({ ...req.body, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .eq('workspace_id', req.workspaceId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ workflow: data });
});

// DELETE /api/workflows/:id (archive)
router.delete('/:id', async (req, res) => {
  await supabaseAdmin
    .from('workflows')
    .update({ status: 'archived' })
    .eq('id', req.params.id)
    .eq('workspace_id', req.workspaceId);
  res.json({ success: true });
});

export default router;
