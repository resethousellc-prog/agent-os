import { supabaseAdmin } from '../services/supabase.js';

export async function humanAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Invalid token' });

  // Get workspace for this user
  const { data: workspace } = await supabaseAdmin
    .from('workspaces')
    .select('id, plan, tier_access, max_agents, max_workflows')
    .eq('owner_user_id', user.id)
    .single();

  if (!workspace) return res.status(403).json({ error: 'No workspace found' });

  req.user = user;
  req.workspaceId = workspace.id;
  req.workspace = workspace;
  next();
}
