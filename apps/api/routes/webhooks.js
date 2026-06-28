import { Router } from 'express';
import { supabaseAdmin } from '../services/supabase.js';

const router = Router();

// POST /webhooks/ghl — receive GHL webhook events
router.post('/ghl', async (req, res) => {
  try {
    const payload = req.body;
    await supabaseAdmin.from('platform_actions_log').insert({
      workspace_id:      payload.locationId || '00000000-0000-0000-0000-000000000001',
      platform:          'ghl',
      action:            payload.type || 'webhook_event',
      request_payload:   payload,
      response_payload:  {},
      status:            'success',
      created_at:        new Date().toISOString(),
    });
    res.json({ received: true });
  } catch (err) {
    console.error('[webhook:ghl]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /webhooks/geelark — receive GeeLark webhook events
router.post('/geelark', async (req, res) => {
  try {
    const payload = req.body;
    await supabaseAdmin.from('platform_actions_log').insert({
      workspace_id:      '00000000-0000-0000-0000-000000000001',
      platform:          'geelark',
      action:            payload.event_type || 'webhook_event',
      request_payload:   payload,
      response_payload:  {},
      status:            'success',
      created_at:        new Date().toISOString(),
    });
    res.json({ received: true });
  } catch (err) {
    console.error('[webhook:geelark]', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
