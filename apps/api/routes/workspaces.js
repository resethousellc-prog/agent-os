import { Router } from 'express';
import { humanAuth } from '../middleware/humanAuth.js';
import { supabaseAdmin } from '../services/supabase.js';

const router = Router();

// POST /api/workspaces — create workspace (called on StaffArmy signup webhook)
router.post('/', async (req, res) => {
  const { name, owner_user_id, plan = 'starter' } = req.body;
  try {
    const { data, error } = await supabaseAdmin.from('workspaces').insert({
      name,
      owner_user_id,
      plan,
      tier_access:   plan === 'starter' ? ['T1-EXEC'] : plan === 'growth' ? ['T1-EXEC','T2-HIGH'] : ['T1-EXEC','T2-HIGH','T3-FULL'],
      max_agents:    plan === 'starter' ? 5 : plan === 'growth' ? 25 : 9999,
      max_workflows: plan === 'starter' ? 10 : 9999,
    }).select().single();
    if (error) throw error;
    res.json({ workspace: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/workspaces/mine
router.get('/mine', humanAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('workspaces')
      .select('*')
      .eq('id', req.workspaceId)
      .single();
    if (error) throw error;
    res.json({ workspace: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/workspaces/clients — list sub-workspaces
router.get('/clients', humanAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('workspaces')
      .select('*')
      .eq('parent_workspace_id', req.workspaceId);
    if (error) throw error;
    res.json({ clients: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/workspaces/client — create sub-workspace (white_label plan)
router.post('/client', humanAuth, async (req, res) => {
  try {
    const { data: parent } = await supabaseAdmin.from('workspaces').select('plan, branding').eq('id', req.workspaceId).single();
    if (parent?.plan !== 'white_label') {
      return res.status(403).json({ error: 'Client workspaces require white_label plan' });
    }
    const { data, error } = await supabaseAdmin.from('workspaces').insert({
      name:                req.body.name,
      owner_user_id:       req.body.owner_user_id || null,
      plan:                'starter',
      tier_access:         ['T1-EXEC'],
      max_agents:          5,
      max_workflows:       10,
      branding:            parent.branding || {},
      parent_workspace_id: req.workspaceId,
    }).select().single();
    if (error) throw error;
    res.json({ workspace: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/workspaces/:id/branding
router.put('/:id/branding', humanAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('workspaces')
      .update({ branding: req.body })
      .eq('id', req.params.id)
      .eq('owner_user_id', req.user.id)
      .select().single();
    if (error) throw error;
    res.json({ workspace: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/workspaces/:id/usage
router.get('/:id/usage', humanAuth, async (req, res) => {
  try {
    const { data: ws } = await supabaseAdmin.from('workspaces').select('*').eq('id', req.params.id).single();
    const { count: agentCount }    = await supabaseAdmin.from('wis_agents').select('*', { count: 'exact', head: true }).eq('workspace_id', req.params.id);
    const { count: workflowCount } = await supabaseAdmin.from('workflows').select('*', { count: 'exact', head: true }).eq('workspace_id', req.params.id);
    res.json({
      plan:               ws.plan,
      tier_access:        ws.tier_access,
      agents_used:        agentCount || 0,
      agents_max:         ws.max_agents,
      workflows_used:     workflowCount || 0,
      workflows_max:      ws.max_workflows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
