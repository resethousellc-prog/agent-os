import { Router } from 'express';
import { humanAuth } from '../middleware/humanAuth.js';
import { supabaseAdmin } from '../services/supabase.js';

const router = Router();
router.use(humanAuth);

const INTERACTION_TYPES = [
  'handoff', 'collaborative', 'delegation', 'escalation', 'peer_review', 'swarm',
];

// GET /api/loops — list interaction loops for this workspace
router.get('/', async (req, res) => {
  const { status, interaction_type } = req.query;
  let query = supabaseAdmin
    .from('interaction_loops')
    .select('*')
    .eq('workspace_id', req.workspaceId)
    .order('updated_at', { ascending: false });

  if (status) query = query.eq('status', status);
  if (interaction_type) query = query.eq('interaction_type', interaction_type);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ loops: data || [] });
});

// POST /api/loops — create an interaction loop (saved by InteractionDesigner)
router.post('/', async (req, res) => {
  const {
    name, description, interaction_type, participant_roles, trigger_config,
    message_schema, completion_condition, max_rounds, timeout_ms, on_timeout,
    on_failure, linked_workflow_id,
  } = req.body;

  if (!name) return res.status(400).json({ error: 'name is required' });
  if (!INTERACTION_TYPES.includes(interaction_type)) {
    return res.status(400).json({ error: `interaction_type must be one of: ${INTERACTION_TYPES.join(', ')}` });
  }

  const { data, error } = await supabaseAdmin
    .from('interaction_loops')
    .insert({
      workspace_id: req.workspaceId,
      name, description, interaction_type, participant_roles, trigger_config,
      message_schema, completion_condition, max_rounds, timeout_ms, on_timeout,
      on_failure, linked_workflow_id,
      created_by: req.user.id,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ loop: data });
});

// GET /api/loops/:id — loop config + recent threads
router.get('/:id', async (req, res) => {
  const { data: loop, error } = await supabaseAdmin
    .from('interaction_loops')
    .select('*')
    .eq('id', req.params.id)
    .eq('workspace_id', req.workspaceId)
    .single();

  if (error || !loop) return res.status(404).json({ error: 'Loop not found' });

  const { data: threads } = await supabaseAdmin
    .from('interaction_threads')
    .select('*')
    .eq('loop_id', req.params.id)
    .order('started_at', { ascending: false })
    .limit(25);

  res.json({ loop, threads: threads || [] });
});

// PUT /api/loops/:id
router.put('/:id', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('interaction_loops')
    .update({ ...req.body, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .eq('workspace_id', req.workspaceId)
    .select()
    .single();

  if (error || !data) return res.status(404).json({ error: 'Loop not found' });
  res.json({ loop: data });
});

// DELETE /api/loops/:id — archive
router.delete('/:id', async (req, res) => {
  await supabaseAdmin
    .from('interaction_loops')
    .update({ status: 'archived' })
    .eq('id', req.params.id)
    .eq('workspace_id', req.workspaceId);
  res.json({ success: true });
});

export default router;
