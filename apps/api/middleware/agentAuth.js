import bcrypt from 'bcrypt';
import { supabaseAdmin } from '../services/supabase.js';

export function requireScope(...scopes) {
  return async (req, res, next) => {
    // Already authed by agentAuth middleware
    const missingScope = scopes.find(s => !req.keyScopes?.includes(s));
    if (missingScope) {
      return res.status(403).json({ error: `Missing scope: ${missingScope}` });
    }
    next();
  };
}

export async function agentAuth(req, res, next) {
  const apiKey = req.headers['x-agent-key'];
  if (!apiKey) return res.status(401).json({ error: 'No agent key' });

  const prefix = apiKey.substring(0, 8);

  // Find key by prefix (fast lookup), then verify hash
  const { data: keys } = await supabaseAdmin
    .from('agent_keys')
    .select('*, wis_agents(*)')
    .eq('key_prefix', prefix)
    .eq('revoked', false)
    .limit(10);

  if (!keys?.length) return res.status(403).json({ error: 'Invalid key' });

  let validKey = null;
  for (const key of keys) {
    const match = await bcrypt.compare(apiKey, key.key_hash);
    if (match) { validKey = key; break; }
  }

  if (!validKey) return res.status(403).json({ error: 'Invalid key' });
  if (validKey.expires_at && new Date(validKey.expires_at) < new Date()) {
    return res.status(403).json({ error: 'Key expired' });
  }

  // Update last_used_at (fire and forget)
  supabaseAdmin.from('agent_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', validKey.id);

  req.agent = validKey.wis_agents;
  req.agentKeyId = validKey.id;
  req.workspaceId = validKey.workspace_id;
  req.keyScopes = validKey.scopes || [];
  next();
}
