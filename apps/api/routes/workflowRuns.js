import { Router } from 'express';
import { humanAuth } from '../middleware/humanAuth.js';
import { supabaseAdmin } from '../services/supabase.js';

const router = Router();
router.use(humanAuth);

// GET /api/workflow-runs — recent runs, filterable by ?agent_id= and ?workflow_id=, ?limit=
router.get('/', async (req, res) => {
  const { agent_id, workflow_id, status } = req.query;
  const limit = Math.min(parseInt(req.query.limit || '20'), 200);

  let query = supabaseAdmin
    .from('workflow_runs')
    .select('*')
    .eq('workspace_id', req.user.workspaceId)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (agent_id) query = query.eq('agent_id', agent_id);
  if (workflow_id) query = query.eq('workflow_id', workflow_id);
  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ runs: data || [] });
});

// POST /api/workflow-runs — record a run (human/manual trigger path)
router.post('/', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('workflow_runs')
    .insert({ workspace_id: req.user.workspaceId, ...req.body })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ run: data });
});

export default router;
