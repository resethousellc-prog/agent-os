import { Router } from 'express';
import { humanAuth } from '../middleware/humanAuth.js';
import { supabaseAdmin } from '../services/supabase.js';

const router = Router();
router.use(humanAuth);

// GET /api/departments — list departments for this workspace
router.get('/', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('departments')
    .select('*, wis_agents:department_head_id(name, display_name, tier)')
    .eq('workspace_id', req.workspaceId)
    .order('name', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ departments: data || [] });
});

// POST /api/departments — create a department
router.post('/', async (req, res) => {
  const { name, display_name, description, department_head_id, owned_workflow_ids, handoff_map } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const { data, error } = await supabaseAdmin
    .from('departments')
    .insert({
      workspace_id: req.workspaceId,
      name, display_name, description, department_head_id, owned_workflow_ids, handoff_map,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ department: data });
});

// GET /api/departments/:id
router.get('/:id', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('departments')
    .select('*')
    .eq('id', req.params.id)
    .eq('workspace_id', req.workspaceId)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Department not found' });
  res.json({ department: data });
});

// PUT /api/departments/:id
router.put('/:id', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('departments')
    .update({ ...req.body, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .eq('workspace_id', req.workspaceId)
    .select()
    .single();

  if (error || !data) return res.status(404).json({ error: 'Department not found' });
  res.json({ department: data });
});

// DELETE /api/departments/:id — soft-delete (mark inactive)
router.delete('/:id', async (req, res) => {
  await supabaseAdmin
    .from('departments')
    .update({ status: 'inactive' })
    .eq('id', req.params.id)
    .eq('workspace_id', req.workspaceId);
  res.json({ success: true });
});

export default router;
