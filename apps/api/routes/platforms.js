import { Router } from 'express';
import { humanAuth } from '../middleware/humanAuth.js';
import { supabaseAdmin } from '../services/supabase.js';

const router = Router();
router.use(humanAuth);

const VALID_PLATFORMS = ['ghl', 'geelark'];

// GET /api/platforms — list platform connections for this workspace
router.get('/', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('platform_connections')
    .select('*')
    .eq('workspace_id', req.workspaceId)
    .order('platform', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ connections: data || [] });
});

// POST /api/platforms — connect a platform (ghl | geelark)
// IMPORTANT: credentials must store env var NAMES only, never raw keys.
router.post('/', async (req, res) => {
  const { platform, credentials = {}, config = {} } = req.body;
  if (!VALID_PLATFORMS.includes(platform)) {
    return res.status(400).json({ error: `platform must be one of: ${VALID_PLATFORMS.join(', ')}` });
  }

  const { data, error } = await supabaseAdmin
    .from('platform_connections')
    .insert({
      workspace_id: req.workspaceId,
      platform,
      credentials, // env var NAMES only
      config,
      status: 'connected',
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ connection: data });
});

// PUT /api/platforms/:id — update config / status / health
router.put('/:id', async (req, res) => {
  const { config, status, health_status, last_health_check, credentials } = req.body;
  const patch = {};
  if (config !== undefined) patch.config = config;
  if (status !== undefined) patch.status = status;
  if (health_status !== undefined) patch.health_status = health_status;
  if (last_health_check !== undefined) patch.last_health_check = last_health_check;
  if (credentials !== undefined) patch.credentials = credentials; // env var NAMES only

  const { data, error } = await supabaseAdmin
    .from('platform_connections')
    .update(patch)
    .eq('id', req.params.id)
    .eq('workspace_id', req.workspaceId)
    .select()
    .single();

  if (error || !data) return res.status(404).json({ error: 'Connection not found' });
  res.json({ connection: data });
});

// DELETE /api/platforms/:id — remove a connection
router.delete('/:id', async (req, res) => {
  await supabaseAdmin
    .from('platform_connections')
    .delete()
    .eq('id', req.params.id)
    .eq('workspace_id', req.workspaceId);
  res.json({ success: true });
});

export default router;
