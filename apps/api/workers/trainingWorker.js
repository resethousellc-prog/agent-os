import { Worker, Queue } from 'bullmq';
import { runTrainingBatch, generateTrainingScenarios } from '../services/agentWorld/trainingRunner.js';
import { supabaseAdmin } from '../services/supabase.js';

export const trainingQueue = new Queue('agent-training', {
  connection: { url: process.env.REDIS_URL }
});

export function startTrainingWorker() {
  const worker = new Worker('agent-training', async (job) => {
    if (job.name === 'GENERATE-SCENARIOS') {
      const { platform, count } = job.data;
      const generated = await generateTrainingScenarios(platform, count);
      return { generated };
    }

    if (job.name === 'TRAINING-BATCH') {
      const { agent_id, platform, batch_size } = job.data;

      // Set agent status to in_training
      await supabaseAdmin.from('wis_agents')
        .update({ status: 'in_training' })
        .eq('id', agent_id);

      const result = await runTrainingBatch(agent_id, platform, batch_size || 50);
      return result;
    }
  }, { connection: { url: process.env.REDIS_URL }, concurrency: 2 });

  return worker;
}
