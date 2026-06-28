import { Router } from 'express';
import { humanAuth } from '../middleware/humanAuth.js';
import { supabaseAdmin } from '../services/supabase.js';

const router = Router();

// GET /api/infrastructures
router.get('/', humanAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('infrastructures')
      .select('*')
      .eq('workspace_id', req.workspaceId);
    if (error) throw error;
    res.json({ infrastructures: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/infrastructures/templates
router.get('/templates', humanAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('infrastructure_templates')
      .select('*')
      .or('is_public.eq.true,created_by.eq.system');
    if (error) throw error;
    res.json({ templates: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/infrastructures/from-template
router.post('/from-template', humanAuth, async (req, res) => {
  const { template_id, name } = req.body;
  try {
    const { data: template } = await supabaseAdmin
      .from('infrastructure_templates')
      .select('*')
      .eq('id', template_id)
      .single();

    if (!template) return res.status(404).json({ error: 'Template not found' });

    // Create departments from template config
    const deptIds = [];
    for (const config of template.department_configs || []) {
      const { data: dept } = await supabaseAdmin
        .from('departments')
        .insert({
          workspace_id: req.workspaceId,
          name:         config.department,
          display_name: config.department.replace(/_/g, ' '),
          status:       'active',
        })
        .select().single();
      if (dept) deptIds.push(dept.id);
    }

    // Create the infrastructure record
    const { data: infra, error } = await supabaseAdmin
      .from('infrastructures')
      .insert({
        workspace_id:   req.workspaceId,
        name:           name || template.name,
        template_id,
        department_ids: deptIds,
        status:         'draft',
      })
      .select().single();

    if (error) throw error;
    res.json({ infrastructure: infra, departments_created: deptIds.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/infrastructures/:id/health
router.get('/:id/health', humanAuth, async (req, res) => {
  try {
    const { data: infra } = await supabaseAdmin
      .from('infrastructures')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (!infra) return res.status(404).json({ error: 'Infrastructure not found' });

    // Get agents for each department
    const { data: agents } = await supabaseAdmin
      .from('wis_agents')
      .select('id, department, status, tier')
      .eq('workspace_id', req.workspaceId);

    const deptHealth = {};
    for (const agent of agents || []) {
      if (!deptHealth[agent.department]) deptHealth[agent.department] = { agents: 0, active: 0 };
      deptHealth[agent.department].agents++;
      if (agent.status === 'active') deptHealth[agent.department].active++;
    }

    res.json({ infrastructure: infra, department_health: deptHealth });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
