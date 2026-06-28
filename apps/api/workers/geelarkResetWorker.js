// Daily reset of geelark_cells.posts_today at midnight UTC.
// Fail-soft: the Queue/Worker only run when Redis is configured.
import { Worker, Queue } from 'bullmq';
import { connection } from '../services/bullmq.js';
import { supabaseAdmin } from '../services/supabase.js';

export const geelarkResetQueue = connection
  ? new Queue('geelark-reset', { connection })
  : { name: 'geelark-reset', async add() { return null; } };

export const geelarkResetWorker = connection
  ? new Worker('geelark-reset', async (job) => {
      if (job.name !== 'GEELARK-POSTS-RESET') return;

      const { error } = await supabaseAdmin
        .from('geelark_cells')
        .update({ posts_today: 0 })
        .gte('id', '00000000-0000-0000-0000-000000000000'); // update all rows

      if (error) {
        console.error('[geelarkResetWorker] Error resetting posts_today:', error.message);
      } else {
        console.log('[geelarkResetWorker] posts_today reset to 0 for all cells');
      }
    }, { connection })
  : null;

// Schedule: midnight UTC daily — only when Redis is available.
if (connection) {
  geelarkResetQueue.add('GEELARK-POSTS-RESET', {}, {
    repeat: { pattern: '0 0 * * *' },
    jobId:  'geelark-posts-reset-daily',
  });
  console.log('[geelarkResetWorker] Daily posts_today reset scheduled (midnight UTC)');
}
