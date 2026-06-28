import express from 'express';
import cors from 'cors';

import { humanAuth } from './middleware/humanAuth.js';
import { loadWorkspace } from './middleware/loadWorkspace.js';
import { requirePlan } from './middleware/planGate.js';

import workflowsRouter from './routes/workflows.js';
import scaffoldRouter from './routes/scaffold.js';
import agentsRouter from './routes/agents.js';
import agentApiRouter from './routes/agentApi.js';
import toolsRouter from './routes/tools.js';
import performanceRouter from './routes/performance.js';
import improvementsRouter from './routes/improvements.js';
import departmentsRouter from './routes/departments.js';
import platformsRouter from './routes/platforms.js';
import loopsRouter from './routes/loops.js';
import threadsRouter from './routes/threads.js';
import escalationsRouter from './routes/escalations.js';
import chemistryRouter from './routes/chemistry.js';
import workflowRunsRouter from './routes/workflowRuns.js';
import a2aRouter from './routes/a2a.js';
import webhooksRouter from './routes/webhooks.js';
import commandsRouter from './routes/commands.js';
import geelarkRouter from './routes/geelark.js';
import infrastructuresRouter from './routes/infrastructures.js';
import workspacesRouter from './routes/workspaces.js';

// Side-effect: start background workers (all fail-soft without Redis).
import './workers/attributeWorker.js';
import './workers/geelarkResetWorker.js';
import './workers/graduationWorker.js';
import './workers/modelCostTracker.js';

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'agent-os-api' }));

// Human API
app.use('/api/workflows', workflowsRouter);
app.use('/api/scaffold', scaffoldRouter);
app.use('/api/agents', agentsRouter);
app.use('/api/tools', toolsRouter);
app.use('/api/monitor', performanceRouter);
app.use('/api/improvements', improvementsRouter);
app.use('/api/departments', departmentsRouter);
app.use('/api/platforms', platformsRouter);
app.use('/api/loops', loopsRouter);
app.use('/api/threads', threadsRouter);
app.use('/api/escalations', escalationsRouter);
app.use('/api/chemistry', chemistryRouter);
app.use('/api/workflow-runs', workflowRunsRouter);
app.use('/api/geelark', geelarkRouter);
app.use('/api/workspaces', workspacesRouter);

// Infrastructure builder — reads open to plan holders; writes gated to pro/white_label.
app.use(
  '/api/infrastructures',
  humanAuth,
  loadWorkspace,
  (req, res, next) => (req.method === 'GET' ? next() : requirePlan('pro', 'white_label')(req, res, next)),
  infrastructuresRouter
);

// Natural-language command routing → GHL agents.
// Mounted BEFORE the key-auth /api/agent router so humanAuth applies here.
app.use('/api/agent/commands', commandsRouter);

// Agent API (key auth)
app.use('/api/agent', agentApiRouter);

// Inbound platform webhooks (no auth — verified by payload/source)
app.use('/webhooks', webhooksRouter);

// A2A protocol endpoint (agent-to-agent task delivery)
app.use('/a2a', a2aRouter);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Agent OS API running on port ${PORT}`));
