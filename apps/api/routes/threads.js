import { Router } from 'express';
import { humanAuth } from '../middleware/humanAuth.js';
import { supabaseAdmin } from '../services/supabase.js';

const router = Router();
router.use(humanAuth);

// GET /api/threads — list threads (Huddle left panel). Default: most recent first.
// ?status=active to show only live threads.
router.get('/', async (req, res) => {
  const { status, loop_id } = req.query;
  let query = supabaseAdmin
    .from('interaction_threads')
    .select('*, interaction_loops(name, interaction_type, completion_condition, max_rounds)')
    .eq('workspace_id', req.workspaceId)
    .order('started_at', { ascending: false })
    .limit(100);

  if (status) query = query.eq('status', status);
  if (loop_id) query = query.eq('loop_id', loop_id);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ threads: data || [] });
});

// GET /api/threads/:id — thread + full message feed (Huddle center panel)
router.get('/:id', async (req, res) => {
  const { data: thread, error } = await supabaseAdmin
    .from('interaction_threads')
    .select('*, interaction_loops(*)')
    .eq('id', req.params.id)
    .eq('workspace_id', req.workspaceId)
    .single();

  if (error || !thread) return res.status(404).json({ error: 'Thread not found' });

  const { data: messages } = await supabaseAdmin
    .from('agent_messages')
    .select('*, sender:sender_agent_id(name, display_name, tier), recipient:recipient_agent_id(name, display_name, tier)')
    .eq('thread_id', req.params.id)
    .order('created_at', { ascending: true });

  res.json({ thread, messages: messages || [] });
});

export default router;
