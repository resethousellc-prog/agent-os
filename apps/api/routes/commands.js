// POST /api/agent/commands — natural language → GHL agent routing
import { Router } from 'express';
import { humanAuth } from '../middleware/humanAuth.js';
import { supabaseAdmin } from '../services/supabase.js';
import { routeTask } from '../services/modelRouter.js';

const router = Router();

router.post('/', humanAuth, async (req, res) => {
  const { command } = req.body;
  if (!command) return res.status(400).json({ error: 'command required' });

  try {
    // Classify the command
    const classifyResult = await routeTask({
      taskType: 'classification',
      agentTier: 'T2-HIGH',
      user: `Classify this GHL command into one of: contact_management, workflow_building, messaging, reporting, broadcast, unknown.
Command: "${command}"
Return JSON only: {"category": "...", "estimated_duration_ms": 5000}`,
    });

    let category = 'contact_management';
    let estimatedDuration = 5000;
    try {
      const text  = classifyResult?.content?.[0]?.text || classifyResult?.text || '{}';
      const clean = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      category          = parsed.category || category;
      estimatedDuration = parsed.estimated_duration_ms || estimatedDuration;
    } catch { /* use defaults */ }

    // Find the right agent
    const agentMap = {
      contact_management: 'ghl-operations-manager',
      workflow_building:  'ghl-workflow-builder',
      messaging:          'ghl-conversation-agent',
      reporting:          'ghl-reporting-agent',
      broadcast:          'ghl-conversation-agent',
      unknown:            'ghl-operations-manager',
    };
    const agentName = agentMap[category] || 'ghl-operations-manager';

    const { data: agent } = await supabaseAdmin
      .from('wis_agents')
      .select('id, display_name, status')
      .eq('name', agentName)
      .eq('workspace_id', req.workspaceId)
      .single();

    if (!agent) return res.status(404).json({ error: 'GHL agent not found — ensure agents are seeded' });

    // Create A2A task
    const taskId = `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await supabaseAdmin.from('a2a_tasks').insert({
      a2a_task_id:        taskId,
      workspace_id:       req.workspaceId,
      interaction_type:   category,
      recipient_agent_id: agent.id,
      status:             'submitted',
      input_payload:      { command, category },
    });

    res.json({
      task_id:            taskId,
      agent_name:         agent.display_name,
      category,
      estimated_duration: estimatedDuration,
      status:             'submitted',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
