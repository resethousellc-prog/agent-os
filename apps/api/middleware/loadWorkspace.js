import { supabaseAdmin } from '../services/supabase.js';

// Loads the full workspace row onto req.workspace (incl. plan/branding) for
// plan-gating. Run AFTER humanAuth on routes that need it. No-op if no workspace.
export async function loadWorkspace(req, res, next) {
  if (!req.workspaceId) return next();
  try {
    const { data } = await supabaseAdmin
      .from('workspaces')
      .select('*')
      .eq('id', req.workspaceId)
      .single();
    req.workspace = data || null;
  } catch {
    req.workspace = null;
  }
  next();
}
