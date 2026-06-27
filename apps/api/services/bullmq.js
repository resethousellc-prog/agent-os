// BullMQ queue integration for Agent OS.
// Fail-soft: if REDIS_URL is not configured, queues become no-op stubs so the
// API still boots (e.g. before env vars are set on Railway). Real Queue objects
// are created once REDIS_URL is present.
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

export const connection = process.env.REDIS_URL
  ? new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null })
  : null;

function makeQueue(name) {
  if (!connection) {
    return {
      name,
      async add(jobName) {
        console.warn(`[bullmq] queue "${name}" job "${jobName}" skipped — no REDIS_URL`);
        return null;
      },
    };
  }
  return new Queue(name, { connection });
}

// New Agent OS queues (see AGENT_OS_BUILD_CONTEXT.md)
export const agentInboxQueue      = makeQueue('agent-inbox');
export const threadTimeoutQueue   = makeQueue('thread-timeout');
export const escalationAlertQueue = makeQueue('escalation-alert');
export const chemistryRecalcQueue = makeQueue('chemistry-recalc');
export const loopPerformanceQueue = makeQueue('loop-performance');
export const agentTrainingQueue   = makeQueue('agent-training');
export const improvementQueue     = makeQueue('improvement-cycle');
