// Gate a route behind one or more workspace plans. Requires loadWorkspace (or
// humanAuth, which also sets req.workspace) to have run first.
export function requirePlan(...plans) {
  return async (req, res, next) => {
    const workspace = req.workspace;
    if (!workspace) {
      return res.status(403).json({ error: 'Workspace not loaded — add loadWorkspace middleware' });
    }
    if (!plans.includes(workspace.plan)) {
      return res.status(403).json({
        error: `This feature requires ${plans.join(' or ')} plan`,
        current_plan: workspace.plan,
        upgrade_url:  '/upgrade',
      });
    }
    next();
  };
}
