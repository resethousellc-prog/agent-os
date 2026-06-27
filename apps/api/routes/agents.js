import { Router } from 'express';
import { humanAuth } from '../middleware/humanAuth.js';
import { supabaseAdmin } from '../services/supabase.js';
import { brendaPool } from '../services/brendaDb.js';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

const router = Router();
router.use(humanAuth);

// GET /api/agents
router.get('/', async (req, res) => {
  const { data } = await supabaseAdmin
    .from('wis_agents')
    .select('*, agent_attributes(*), wis_agents!supervisor_agent_id(name)')
    .eq('workspace_id', req.workspaceId)
    .order('tier', { ascending: false });
  res.json({ agents: data || [] });
});

// POST /api/agents
router.post('/', async (req, res) => {
  // Check plan limits
  const { count } = await supabaseAdmin
    .from('wis_agents')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', req.workspaceId)
    .eq('status', 'active');

  if (count >= (req.workspace.max_agents || 5)) {
    return res.status(403).json({ error: 'Agent limit reached for your plan' });
  }

  const { data: agent } = await supabaseAdmin
    .from('wis_agents')
    .insert({ workspace_id: req.workspaceId, ...req.body })
    .select()
    .single();

  // Seed default attributes
  await supabaseAdmin.from('agent_attributes').insert({
    workspace_id: req.workspaceId,
    agent_id: agent.id,
  });

  // Log creation
  await supabaseAdmin.from('agent_development_log').insert({
    workspace_id: req.workspaceId,
    agent_id: agent.id,
    event_type: 'attribute_update',
    event_detail: { action: 'agent_created', tier: agent.tier },
    triggered_by: req.user.id,
  });

  res.status(201).json({ agent });
});

// POST /api/agents/:id/keys — generate API key
router.post('/:id/keys', async (req, res) => {
  const { scopes = ['workflows:read', 'runs:write'] } = req.body;

  // Verify agent belongs to workspace
  const { data: agent } = await supabaseAdmin
    .from('wis_agents')
    .select('id')
    .eq('id', req.params.id)
    .eq('workspace_id', req.workspaceId)
    .single();

  if (!agent) return res.status(404).json({ error: 'Agent not found' });

  // Generate key: bai_ prefix + random
  const rawKey = `bai_${randomUUID().replace(/-/g, '')}`;
  const keyHash = await bcrypt.hash(rawKey, 10);
  const keyPrefix = rawKey.substring(0, 8);

  await supabaseAdmin.from('agent_keys').insert({
    workspace_id: req.workspaceId,
    agent_id: req.params.id,
    key_hash: keyHash,
    key_prefix: keyPrefix,
    scopes,
  });

  // Return raw key ONCE — never stored in plaintext
  res.json({ key: rawKey, prefix: keyPrefix, scopes });
});

// PUT /api/agents/:id/promote
router.put('/:id/promote', async (req, res) => {
  const PROMOTION_PATH = { 'T1-EXEC': 'T2-HIGH', 'T2-HIGH': 'T3-FULL' };

  const { data: agent } = await supabaseAdmin
    .from('wis_agents')
    .select('tier')
    .eq('id', req.params.id)
    .single();

  const newTier = PROMOTION_PATH[agent.tier];
  if (!newTier) return res.status(400).json({ error: 'Already at maximum tier' });

  // Check plan allows this tier
  if (!req.workspace.tier_access.includes(newTier)) {
    return res.status(403).json({ error: `Your plan does not allow ${newTier} agents` });
  }

  await supabaseAdmin.from('wis_agents')
    .update({ tier: newTier })
    .eq('id', req.params.id);

  await supabaseAdmin.from('agent_development_log').insert({
    workspace_id: req.workspaceId,
    agent_id: req.params.id,
    event_type: 'tier_promotion',
    event_detail: { from: agent.tier, to: newTier },
    triggered_by: req.user.id,
  });

  res.json({ success: true, new_tier: newTier });
});

export default router;
