import { Router } from 'express';
import { humanAuth } from '../middleware/humanAuth.js';
import { supabaseAdmin } from '../services/supabase.js';

const router = Router();
router.use(humanAuth);

// GET /api/tools — list the toolbelt catalog (agent_tools is a global catalog).
// Optional filters: ?platform=ghl  ?tier_minimum=T2-HIGH  ?active=false
router.get('/', async (req, res) => {
  const { platform, tier_minimum, active } = req.query;
  let query = supabaseAdmin
    .from('agent_tools')
    .select('*')
    .order('platform', { ascending: true })
    .order('name', { ascending: true });

  if (active === undefined) query = query.eq('active', true);
  else if (active === 'false') query = query.eq('active', false);

  if (platform) query = query.eq('platform', platform);
  if (tier_minimum) query = query.eq('tier_minimum', tier_minimum);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ tools: data || [] });
});

// GET /api/tools/:name — single tool definition
router.get('/:name', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('agent_tools')
    .select('*')
    .eq('name', req.params.name)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Tool not found' });
  res.json({ tool: data });
});

export default router;
