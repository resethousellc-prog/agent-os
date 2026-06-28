import { Router } from 'express';
import { agentAuth, requireScope } from '../middleware/agentAuth.js';
import { supabaseAdmin } from '../services/supabase.js';
// escalationAlertQueue is used by the escalations + tool-execute routes below.
// agentInboxQueue delivers A2A messages to the recipient agent's worker.
// Imported here (fail-soft when REDIS_URL is unset) so the routes have them in scope.
import { escalationAlertQueue, agentInboxQueue } from '../services/bullmq.js';

const router = Router();
router.use(agentAuth);

// GET /api/agent/workflows — my assigned workflows
router.get('/workflows', requireScope('workflows:read'), async (req, res) => {
  const agentWorkflows = req.agent.assigned_workflows || [];
  if (!agentWorkflows.length) return res.json({ workflows: [] });

  const { data } = await supabaseAdmin
    .from('workflows')
    .select('*')
    .in('id', agentWorkflows)
    .eq('status', 'active');

  res.json({ workflows: data || [] });
});

// POST /api/agent/runs — log a workflow execution
router.post('/runs', requireScope('runs:write'), async (req, res) => {
  const { workflow_id, status, duration_ms, steps_completed,
          steps_total, error_log, input_payload, output_payload, metadata } = req.body;

  // Verify agent is assigned to this workflow
  if (!req.agent.assigned_workflows?.includes(workflow_id)) {
    return res.status(403).json({ error: 'Agent not assigned to this workflow' });
  }

  const { data: run } = await supabaseAdmin
    .from('workflow_runs')
    .insert({
      workspace_id: req.workspaceId,
      workflow_id,
      agent_id: req.agent.id,
      status,
      started_at: new Date().toISOString(),
      completed_at: status !== 'running' ? new Date().toISOString() : null,
      duration_ms,
      steps_completed,
      steps_total,
      error_log,
      input_payload,
      output_payload,
      metadata,
    })
    .select()
    .single();

  // Check success rate — if below threshold, trigger improvement analysis
  if (status === 'failed') {
    await checkSuccessRateAndTriggerImprovement(workflow_id, req.workspaceId);
  }

  res.status(201).json({ run });
});

// POST /api/agent/escalations
router.post('/escalations', requireScope('escalations:write'), async (req, res) => {
  const { thread_id, reason, context } = req.body;

  const { data: escalation } = await supabaseAdmin
    .from('escalations')
    .insert({
      workspace_id: req.workspaceId,
      thread_id,
      escalated_by: req.agent.id,
      escalated_to: 'human',
      reason,
      context,
      response_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  // Update thread status
  await supabaseAdmin.from('interaction_threads')
    .update({ status: 'escalated', escalated_to: 'human', escalation_reason: reason })
    .eq('id', thread_id);

  // Enqueue escalation alert to Fab
  await escalationAlertQueue.add('ESCALATION-ALERT', {
    escalation_id: escalation.id,
    agent_name: req.agent.display_name || req.agent.name,
    reason,
    workspace_id: req.workspaceId,
  });

  res.status(201).json({ escalation });
});

// POST /api/agent/messages — send an A2A message into a thread
router.post('/messages', requireScope('messages:write'), async (req, res) => {
  const { thread_id, loop_id, recipient_agent_id, message_type, round_number,
          payload, attachments, requires_response, response_deadline } = req.body;

  if (!thread_id || !loop_id || !message_type) {
    return res.status(400).json({ error: 'thread_id, loop_id and message_type are required' });
  }

  // Verify the thread belongs to the sender's workspace.
  const { data: thread } = await supabaseAdmin
    .from('interaction_threads')
    .select('id')
    .eq('id', thread_id)
    .eq('workspace_id', req.workspaceId)
    .single();

  if (!thread) return res.status(404).json({ error: 'Thread not found' });

  const { data: message, error } = await supabaseAdmin
    .from('agent_messages')
    .insert({
      thread_id,
      loop_id,
      sender_agent_id: req.agent.id,
      recipient_agent_id,
      message_type,
      round_number: round_number || 1,
      payload: payload || {},
      attachments: attachments || [],
      requires_response: !!requires_response,
      response_deadline,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // Deliver to the recipient agent's inbox worker.
  if (recipient_agent_id) {
    await agentInboxQueue.add('A2A-MESSAGE', {
      recipient_agent_id,
      message_id: message.id,
      thread_id,
      workspace_id: req.workspaceId,
    });
  }

  res.status(201).json({ message });
});

// GET /api/agent/tools — my available tools
router.get('/tools', requireScope('tools:use'), async (req, res) => {
  const agentCaps = req.agent.capabilities || [];
  const tierOrder = { 'T1-EXEC': 1, 'T2-HIGH': 2, 'T3-FULL': 3 };
  const agentTierLevel = tierOrder[req.agent.tier] || 1;

  const { data: tools } = await supabaseAdmin
    .from('agent_tools')
    .select('*')
    .eq('active', true)
    .in('name', agentCaps);

  // Filter by tier minimum
  const accessible = tools?.filter(t => {
    const minLevel = tierOrder[t.tier_minimum] || 1;
    return agentTierLevel >= minLevel;
  });

  res.json({ tools: accessible || [] });
});

// POST /api/agent/tools/:name/execute — agent executes a tool
router.post('/tools/:name/execute', requireScope('tools:use'), async (req, res) => {
  const { name } = req.params;
  const { payload } = req.body;

  // Verify agent has this tool in capabilities
  if (!req.agent.capabilities?.includes(name)) {
    return res.status(403).json({ error: 'Tool not in agent capabilities' });
  }

  // Get tool definition
  const { data: tool } = await supabaseAdmin
    .from('agent_tools')
    .select('*')
    .eq('name', name)
    .eq('active', true)
    .single();

  if (!tool) return res.status(404).json({ error: 'Tool not found' });

  // Tier check
  const tierLevel = { 'T1-EXEC': 1, 'T2-HIGH': 2, 'T3-FULL': 3 };
  if ((tierLevel[req.agent.tier] || 0) < (tierLevel[tool.tier_minimum] || 0)) {
    return res.status(403).json({ error: `Tool requires ${tool.tier_minimum} tier` });
  }

  // Approval gate — queue for human approval if required
  if (tool.requires_approval) {
    const { data: request } = await supabaseAdmin
      .from('agent_builds') // reuse builds table as approval queue
      .insert({
        workspace_id: req.workspaceId,
        submitted_by: req.agent.id,
        draft_spec: { tool_name: name, payload },
        justification: `Tool execution request: ${name}`,
        status: 'pending',
      })
      .select()
      .single();

    // Alert Fab via escalation-alert queue
    await escalationAlertQueue.add('TOOL-APPROVAL-NEEDED', {
      request_id: request.id,
      agent_name: req.agent.display_name || req.agent.name,
      tool_name: name,
      workspace_id: req.workspaceId,
    });

    return res.status(202).json({
      status: 'pending_approval',
      request_id: request.id,
      message: 'Tool requires human approval — request queued for Fab review',
    });
  }

  // Route to reelmax-portal for GHL/GeeLark actions
  if (name.startsWith('ghl:') || name.startsWith('geelark:')) {
    const reelmaxUrl = process.env.REELMAX_INTERNAL_URL;
    try {
      const platformRes = await fetch(`${reelmaxUrl}/api/internal/tool-execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-api-key': process.env.INTERNAL_API_KEY,
        },
        body: JSON.stringify({ tool_name: name, payload, agent_id: req.agent.id }),
      });
      const result = await platformRes.json();

      // Log to platform_actions_log
      await supabaseAdmin.from('platform_actions_log').insert({
        workspace_id: req.workspaceId,
        platform: name.startsWith('ghl:') ? 'ghl' : 'geelark',
        action: name,
        agent_id: req.agent.id,
        request_payload: payload,
        response_payload: result,
        platform_entity_id: result?.id || result?.contactId || null,
        status: result?.error ? 'failed' : 'success',
        duration_ms: result?.duration_ms || 0,
      });

      return res.json(result);
    } catch (err) {
      return res.status(500).json({ error: 'Platform connector unavailable', detail: err.message });
    }
  }

  // WIS/BullMQ/S3 tools handled locally
  // ... extend per tool category
  res.json({ success: true, tool: name, payload, note: 'Local tool executed' });
});

async function checkSuccessRateAndTriggerImprovement(workflowId, workspaceId) {
  try {
    const { data: runs } = await supabaseAdmin
      .from('workflow_runs')
      .select('status')
      .eq('workflow_id', workflowId)
      .order('started_at', { ascending: false })
      .limit(50);

    if (!runs?.length) return;

    // Check 3 consecutive failures (most recent runs)
    const recentThree = runs.slice(0, 3);
    const threeConsecutiveFails = recentThree.length === 3 &&
      recentThree.every(r => r.status === 'failed');

    if (threeConsecutiveFails) {
      // Send GHL alert to Fab immediately
      const alertThreshold = parseInt(process.env.CONSECUTIVE_FAILURE_ALERT || '3');
      const { escalationAlertQueue } = await import('../workers/improvementWorker.js');
      await escalationAlertQueue.add('CONSECUTIVE-FAILURES', {
        workflow_id: workflowId,
        workspace_id: workspaceId,
        consecutive_failures: 3,
        alert_type: 'consecutive_failure',
      });
    }

    // Existing: check 30-day success rate
    const recent30d = runs.filter((_, i) => i < 30);
    if (recent30d.length >= parseInt(process.env.MIN_RUNS_FOR_ANALYSIS || '20')) {
      const successRate = recent30d.filter(r => r.status === 'success').length / recent30d.length * 100;
      const threshold = parseInt(process.env.SUCCESS_RATE_ALERT_THRESHOLD || '70');
      if (successRate < threshold) {
        const { improvementQueue } = await import('../services/bullmq.js');
        await improvementQueue.add('IMPROVEMENT-ANALYSIS', {
          workflow_id: workflowId,
          workspace_id: workspaceId,
          success_rate: successRate,
          triggered_by: 'auto_threshold',
        });
      }
    }
  } catch { /* fail soft */ }
}

export default router;
