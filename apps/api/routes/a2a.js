import { Router } from 'express';
import { randomUUID } from 'crypto';
import { supabaseAdmin } from '../services/supabase.js';
import { agentInboxQueue } from '../services/bullmq.js';

const router = Router();

// Optional internal-key gate: when INTERNAL_API_KEY is set, require it.
function internalAuth(req, res, next) {
  const expected = process.env.INTERNAL_API_KEY;
  if (expected && req.headers['x-internal-api-key'] !== expected) {
    return res.status(401).json({ error: 'Invalid internal key' });
  }
  next();
}

// POST /a2a/agents/:agentId — receive an A2A task for a recipient agent
router.post('/agents/:agentId', internalAuth, async (req, res) => {
  const { agentId } = req.params;
  const {
    a2a_task_id, workspace_id, loop_id, initiator_agent_id,
    interaction_type, input_payload, round_number,
  } = req.body;

  const taskId = a2a_task_id || `a2a_${randomUUID().replace(/-/g, '')}`;

  const { data: task, error } = await supabaseAdmin
    .from('a2a_tasks')
    .insert({
      a2a_task_id: taskId,
      workspace_id,
      loop_id,
      initiator_agent_id,
      recipient_agent_id: agentId,
      interaction_type,
      status: 'submitted',
      round_number: round_number || 1,
      input_payload: input_payload || {},
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // Hand off to the recipient's inbox worker.
  await agentInboxQueue.add('A2A-TASK', {
    recipient_agent_id: agentId,
    a2a_task_id: taskId,
    workspace_id,
  });

  res.status(202).json({ task, status: 'submitted' });
});

export default router;
