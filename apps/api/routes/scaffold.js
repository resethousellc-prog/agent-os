import { Router } from 'express';
import { humanAuth } from '../middleware/humanAuth.js';
import { callClaude } from '../services/claude.js';
import { routeTask } from '../services/modelRouter.js';
import { supabaseAdmin } from '../services/supabase.js';

const router = Router();
router.use(humanAuth);

const SCAFFOLD_SYSTEM = `You are an AI workflow architect for Brenda AI / PostArmy Inc.
You design automation workflows for GHL (GoHighLevel), GeeLark (social media fleet),
and BullMQ (job queue). You understand the 22-department structure and agent tiers
(T3-FULL, T2-HIGH, T1-EXEC).

Return ONLY valid JSON matching this exact structure:
{
  "name": "workflow name",
  "description": "what this workflow does",
  "platform": "ghl|geelark|bullmq|multi",
  "department": "department_name",
  "trigger_type": "event|scheduled|webhook|manual",
  "trigger_config": {},
  "steps": [
    {
      "order": 1,
      "action": "action name",
      "platform": "ghl|geelark|bullmq",
      "description": "what this step does",
      "input_schema": {},
      "output_schema": {},
      "timeout_ms": 10000,
      "retry_count": 3,
      "on_failure": "escalate|skip|abort"
    }
  ],
  "conditions": [],
  "error_handling": "escalate",
  "estimated_runtime": "30s|2min|5min"
}`;

// POST /api/scaffold — generate a workflow scaffold (Session 7: returned, not saved).
// The UI reviews/edits the steps then saves via POST /api/workflows ("Save to Library").
router.post('/', async (req, res) => {
  const { goal, platform, department, trigger_type, complexity } = req.body;
  if (!goal) return res.status(400).json({ error: 'goal required' });

  try {
    const result = await routeTask({
      taskType: 'workflow_design',  // routes to Claude (T2/T3 non-negotiable)
      agentTier: 'T2-HIGH',
      system: SCAFFOLD_SYSTEM,
      user: `Goal: ${goal}
Platform: ${platform || 'multi'}
Department: ${department || 'any'}
Trigger type: ${trigger_type || 'event'}
Complexity: ${complexity || 'medium'}

Generate a complete workflow scaffold JSON.`,
    });

    let scaffold;
    try {
      const text = result?.content?.[0]?.text || result?.text || '';
      scaffold = JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch {
      return res.status(500).json({ error: 'Failed to parse scaffold from model' });
    }

    res.json({ scaffold });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/scaffold/:id/refine
router.post('/:id/refine', async (req, res) => {
  const { refinement } = req.body;

  const { data: workflow } = await supabaseAdmin
    .from('workflows')
    .select('*')
    .eq('id', req.params.id)
    .eq('workspace_id', req.workspaceId)
    .single();

  if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

  const result = await callClaude({
    system: SCAFFOLD_SYSTEM,
    user: `Existing workflow:
${JSON.stringify(workflow, null, 2)}

Refinement request: ${refinement}

Return the updated workflow JSON only.`,
    model: 'claude-sonnet-4-6',
  });

  if (!result?.text) return res.status(500).json({ error: 'Refinement failed' });

  try {
    const refined = JSON.parse(result.text.replace(/```json|```/g, '').trim());
    const { data: updated } = await supabaseAdmin
      .from('workflows')
      .update({
        ...refined,
        version: (workflow.version || 1) + 1,
        parent_id: workflow.parent_id || workflow.id,
      })
      .eq('id', req.params.id)
      .select()
      .single();

    res.json({ workflow: updated });
  } catch (err) {
    res.status(500).json({ error: 'Invalid refined JSON' });
  }
});

export default router;
