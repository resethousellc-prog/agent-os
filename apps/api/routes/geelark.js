import { Router } from 'express';
import { humanAuth } from '../middleware/humanAuth.js';
import { supabaseAdmin } from '../services/supabase.js';

const router = Router();

// POST /api/geelark/cells/sync — sync from reelmax-portal
router.post('/cells/sync', humanAuth, async (req, res) => {
  try {
    const reelmaxUrl = process.env.REELMAX_INTERNAL_URL;
    if (!reelmaxUrl) return res.status(503).json({ error: 'REELMAX_INTERNAL_URL not set' });

    const response = await fetch(`${reelmaxUrl}/api/geelark/profiles`, {
      headers: { 'x-internal-key': process.env.INTERNAL_API_KEY || '' },
    }).catch(() => null);

    if (!response?.ok) {
      return res.status(503).json({ error: 'Could not reach reelmax-portal', synced: 0 });
    }

    const profiles = await response.json();
    let synced = 0;

    for (const profile of profiles?.profiles || profiles || []) {
      await supabaseAdmin.from('geelark_cells').upsert({
        workspace_id:       req.workspaceId,
        geelark_profile_id: profile.id || profile.profile_id,
        name:               profile.name || profile.alias,
        pod:                profile.pod || profile.group || 'default',
        platform:           profile.platform || 'instagram',
        status:             profile.status || 'active',
        health_score:       profile.health_score || 100,
        warmup_complete:    profile.warmup_complete || false,
      }, { onConflict: 'geelark_profile_id' });
      synced++;
    }

    res.json({ synced, message: `Synced ${synced} cells from reelmax-portal` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/geelark/fleet/health — fleet health overview
router.get('/fleet/health', humanAuth, async (req, res) => {
  try {
    const { data: cells } = await supabaseAdmin
      .from('geelark_cells')
      .select('*')
      .eq('workspace_id', req.workspaceId);

    const byStatus = { active: 0, flagged: 0, suspended: 0, offline: 0, warmup: 0 };
    for (const cell of cells || []) {
      byStatus[cell.status] = (byStatus[cell.status] || 0) + 1;
    }

    const sorted    = [...(cells || [])].sort((a, b) => (b.health_score || 0) - (a.health_score || 0));
    const top10     = sorted.slice(0, 10);
    const bottom10  = sorted.slice(-10);

    res.json({
      total:     cells?.length || 0,
      by_status: byStatus,
      top_10:    top10,
      bottom_10: bottom10,
      cells:     cells || [],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
