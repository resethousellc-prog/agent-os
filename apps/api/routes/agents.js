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

// POST /api/agents/:id/train — start training run
router.post('/:id/train', async (req, res) => {
  const { platform = 'ghl', batch_size = 100 } = req.body;

  const { trainingQueue } = await import('../workers/trainingWorker.js');
  const job = await trainingQueue.add('TRAINING-BATCH', {
    agent_id: req.params.id,
    platform,
    batch_size,
  });

  res.json({ job_id: job.id, message: 'Training started' });
});

// POST /api/agents/training/generate-scenarios
router.post('/training/generate-scenarios', async (req, res) => {
  const { platform, count = 500 } = req.body;
  const { trainingQueue } = await import('../workers/trainingWorker.js');
  const job = await trainingQueue.add('GENERATE-SCENARIOS', { platform, count });
  res.json({ job_id: job.id });
});

// GET /api/agents/:id/training-status
router.get('/:id/training-status', async (req, res) => {
  const { data: results } = await supabaseAdmin
    .from('training_results')
    .select('passed, score, run_at, system_prompt_version')
    .eq('agent_id', req.params.id)
    .order('run_at', { ascending: false })
    .limit(100);

  const passRate = results?.length
    ? results.filter(r => r.passed).length / results.length * 100
    : 0;

  const { data: agent } = await supabaseAdmin
    .from('wis_agents')
    .select('status')
    .eq('id', req.params.id)
    .single();

  res.json({
    agent_status: agent?.status,
    pass_rate: passRate,
    total_runs: results?.length || 0,
    recent_runs: results?.slice(0, 10),
    graduation_threshold: parseInt(process.env.TRAINING_PASS_THRESHOLD || '95'),
  });
});

// ── Session 6: agent builds (draft picks) ──────────────────────────────────

// GET /api/agents/builds/pending — pending agent builds
router.get('/builds/pending', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('agent_builds')
      .select('*')
      .eq('workspace_id', req.user.workspaceId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ builds: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/agents/builds/:buildId/approve
router.post('/builds/:buildId/approve', async (req, res) => {
  const { buildId } = req.params;
  const { review_notes } = req.body;
  try {
    const { data: build } = await supabaseAdmin
      .from('agent_builds').select('*').eq('id', buildId).single();

    // Create the agent from the draft spec
    const { data: agent } = await supabaseAdmin
      .from('wis_agents')
      .insert({ ...build.draft_spec, workspace_id: req.user.workspaceId, status: 'active' })
      .select().single();

    // Update build status
    await supabaseAdmin.from('agent_builds').update({
      status: 'activated',
      reviewed_by: req.user.id || 'fab',
      review_notes,
      resulting_agent_id: agent.id,
    }).eq('id', buildId);

    res.json({ agent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/agents/builds/:buildId/reject
router.post('/builds/:buildId/reject', async (req, res) => {
  const { buildId } = req.params;
  const { review_notes } = req.body;
  try {
    await supabaseAdmin.from('agent_builds').update({
      status: 'rejected',
      reviewed_by: req.user.id || 'fab',
      review_notes,
    }).eq('id', buildId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/agents/:id/attributes — seed/snapshot attributes
router.post('/:id/attributes', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('agent_attributes').insert({
      workspace_id: req.user.workspaceId,
      agent_id: req.params.id,
      ...req.body,
    }).select().single();
    if (error) throw error;
    res.json({ attributes: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/agents/:id/development — log a development event
router.post('/:id/development', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('agent_development_log').insert({
      workspace_id: req.user.workspaceId,
      agent_id: req.params.id,
      ...req.body,
    }).select().single();
    if (error) throw error;
    res.json({ event: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Session 8: Film Room reads + overrides ─────────────────────────────────

// GET /api/agents/:id/development — development log
router.get('/:id/development', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('agent_development_log')
      .select('*')
      .eq('agent_id', req.params.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    res.json({ events: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/agents/:id/attributes/history
router.get('/:id/attributes/history', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('agent_attributes')
      .select('*')
      .eq('agent_id', req.params.id)
      .order('recorded_at', { ascending: false })
      .limit(90);
    if (error) throw error;
    const latest = data?.[0] || null;
    res.json({ history: data || [], latest });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/agents/:id/attributes/override — manual attribute override
router.post('/:id/attributes/override', async (req, res) => {
  try {
    const { attribute, value, note } = req.body;
    const { data: current } = await supabaseAdmin
      .from('agent_attributes')
      .select('*')
      .eq('agent_id', req.params.id)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .single();

    const base = { ...(current || {}) };
    delete base.id;
    delete base.recorded_at;
    const updated = { ...base, [attribute]: value, override_by: 'fab', override_note: note };

    const { data, error } = await supabaseAdmin.from('agent_attributes').insert({
      workspace_id: req.user.workspaceId,
      agent_id: req.params.id,
      ...updated,
    }).select().single();
    if (error) throw error;

    await supabaseAdmin.from('agent_development_log').insert({
      workspace_id: req.user.workspaceId,
      agent_id: req.params.id,
      event_type: 'manual_override',
      event_detail: { attribute, value, note },
      triggered_by: 'fab',
    });

    res.json({ attributes: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/agents/:id — update agent; suspending auto-escalates active threads
router.put('/:id', async (req, res) => {
  try {
    const { data: agent, error } = await supabaseAdmin
      .from('wis_agents')
      .update(req.body)
      .eq('id', req.params.id)
      .eq('workspace_id', req.user.workspaceId)
      .select().single();
    if (error) throw error;

    if (req.body.status === 'suspended') {
      const { data: activeThreads } = await supabaseAdmin
        .from('interaction_threads')
        .select('id')
        .contains('participant_agent_ids', [req.params.id])
        .eq('status', 'active');

      for (const thread of activeThreads || []) {
        await supabaseAdmin.from('interaction_threads').update({
          status: 'escalated',
          escalated_to: 'human',
          escalation_reason: `Participant agent ${req.params.id} suspended mid-thread`,
        }).eq('id', thread.id);

        await supabaseAdmin.from('escalations').insert({
          workspace_id: req.user.workspaceId,
          thread_id: thread.id,
          escalated_by: null,
          escalated_to: 'human',
          reason: 'Agent benched mid-thread',
          context: { agent_id: req.params.id },
        });
      }
    }

    res.json({ agent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
