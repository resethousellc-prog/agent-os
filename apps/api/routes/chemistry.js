import { Router } from 'express';
import { humanAuth } from '../middleware/humanAuth.js';
import { supabaseAdmin } from '../services/supabase.js';

const router = Router();
router.use(humanAuth);

// GET /api/chemistry — agent_chemistry pairs for this workspace.
// ?agent_id=<uuid> filters to pairs containing that agent.
router.get('/', async (req, res) => {
  const { agent_id } = req.query;
  let query = supabaseAdmin
    .from('agent_chemistry')
    .select('*')
    .eq('workspace_id', req.workspaceId)
    .order('chemistry_score', { ascending: false });

  if (agent_id) query = query.contains('agent_ids', [agent_id]);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ chemistry: data || [] });
});

export default router;
