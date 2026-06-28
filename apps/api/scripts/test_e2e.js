#!/usr/bin/env node
// DREI onboarding end-to-end test
// Run: node apps/api/scripts/test_e2e.js
// This is a manual test script — does NOT auto-run in CI

import { supabaseAdmin } from '../services/supabase.js';
import { routeTask } from '../services/modelRouter.js';

async function runE2ETest() {
  console.log('=== DREI Onboarding E2E Test ===\n');

  const workspaceId = '00000000-0000-0000-0000-000000000001';
  const tasks = [
    { type: 'contact_management', description: 'Create GHL contact for DREI prospect', tier: 'T1-EXEC', platform: 'ghl' },
    { type: 'workflow_building',  description: 'Build GHL onboarding workflow for DREI', tier: 'T2-HIGH', platform: 'ghl' },
    { type: 'content_planning',   description: 'Plan GeeLark content for DREI social proof', tier: 'T1-EXEC', platform: 'geelark' },
    { type: 'analytics',          description: 'Pull DREI campaign performance data', tier: 'T2-HIGH', platform: 'ghl' },
    { type: 'reporting',          description: 'Generate DREI onboarding summary report', tier: 'T3-FULL', platform: 'multi' },
  ];

  let allPassed = true;

  for (const task of tasks) {
    const taskId = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    console.log(`[${task.tier}] ${task.description}`);

    try {
      // Create A2A task record
      await supabaseAdmin.from('a2a_tasks').insert({
        a2a_task_id:      taskId,
        workspace_id:     workspaceId,
        interaction_type: task.type,
        status:           'submitted',
        input_payload:    { description: task.description, platform: task.platform },
      });

      // Route task through model router
      const result = await routeTask({
        taskType:  task.type,
        agentTier: task.tier,
        user:      `Test task: ${task.description}. Respond with a brief confirmation that you received and understood the task.`,
      });

      const text = result?.content?.[0]?.text || result?.text || '';
      const passed = text.length > 10;

      // Update A2A task
      await supabaseAdmin.from('a2a_tasks').update({
        status:         passed ? 'completed' : 'failed',
        output_payload: { response: text.slice(0, 200) },
        completed_at:   new Date().toISOString(),
      }).eq('a2a_task_id', taskId);

      // Log to platform_actions_log
      await supabaseAdmin.from('platform_actions_log').insert({
        workspace_id:     workspaceId,
        platform:         task.platform,
        action:           task.type,
        request_payload:  { description: task.description },
        response_payload: { text: text.slice(0, 200) },
        status:           passed ? 'success' : 'failed',
        created_at:       new Date().toISOString(),
      });

      console.log(`  ${passed ? 'PASS' : 'FAIL'} — ${text.slice(0, 80)}...\n`);
      if (!passed) allPassed = false;

    } catch (err) {
      console.log(`  ERROR — ${err.message}\n`);
      allPassed = false;
    }
  }

  console.log('=== Result:', allPassed ? 'ALL PASSED' : 'SOME FAILED', '===');
  process.exit(allPassed ? 0 : 1);
}

runE2ETest().catch(err => {
  console.error('E2E test crashed:', err);
  process.exit(1);
});
