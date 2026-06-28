import { Router } from 'express';
import { humanAuth } from '../middleware/humanAuth.js';
import { supabaseAdmin } from '../services/supabase.js';

const router = Router();
router.use(humanAuth);

// GET /api/escalations — pending escalations (EscalationTray). ?status= to filter.
router.get('/', async (req, res) => {
  const status = req.query.status || 'pending';
  const { data, error } = await supabaseAdmin
    .from('escalations')
    .select('*, escalated_by_agent:escalated_by(name, display_name, tier), interaction_threads(id, status)')
    .eq('workspace_id', req.workspaceId)
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ escalations: data || [] });
});

// PUT /api/escalations/:id/resolve — human resolves with a decision
router.put('/:id/resolve', async (req, res) => {
  const { resolution } = req.body;
  if (!resolution) return res.status(400).json({ error: 'resolution is required' });

  const { data: escalation, error } = await supabaseAdmin
    .from('escalations')
    .update({
      status: 'resolved',
      resolution,
      resolved_by: req.user.id,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', req.params.id)
    .eq('workspace_id', req.workspaceId)
    .select()
    .single();

  if (error || !escalation) return res.status(404).json({ error: 'Escalation not found' });

  // Return the linked thread to active so the loop can continue with the decision.
  if (escalation.thread_id) {
    await supabaseAdmin.from('interaction_threads')
      .update({ status: 'active' })
      .eq('id', escalation.thread_id);
  }

  res.json({ escalation });
});

// PUT /api/escalations/:id/override — force-complete the thread
router.put('/:id/override', async (req, res) => {
  const { resolution } = req.body;

  const { data: escalation, error } = await supabaseAdmin
    .from('escalations')
    .update({
      status: 'overridden',
      resolution: resolution || 'Force-completed by operator',
      resolved_by: req.user.id,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', req.params.id)
    .eq('workspace_id', req.workspaceId)
    .select()
    .single();

  if (error || !escalation) return res.status(404).json({ error: 'Escalation not found' });

  if (escalation.thread_id) {
    await supabaseAdmin.from('interaction_threads')
      .update({
        status: 'completed',
        outcome: 'overridden',
        completed_at: new Date().toISOString(),
      })
      .eq('id', escalation.thread_id);
  }

  res.json({ escalation });
});

export default router;
