// Improvement-cycle worker.
// Consumes the 'improvement-cycle' queue and (in later sessions) runs AI workflow
// improvement analysis. Re-exports escalationAlertQueue so agent-facing routes can
// dynamically import it (see routes/agentApi.js). Fail-soft: the Worker only starts
// when a Redis connection is available.
import { Worker } from 'bullmq';
import { connection, escalationAlertQueue, improvementQueue } from '../services/bullmq.js';

export { escalationAlertQueue, improvementQueue };

export const improvementWorker = connection
  ? new Worker(
      'improvement-cycle',
      async (job) => {
        // Placeholder — full improvement analysis lands in a later session (7/8).
        console.log('[improvementWorker] received', job.name, job.id);
        return { ok: true };
      },
      { connection }
    )
  : null;
