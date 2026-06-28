import express from 'express';
import cors from 'cors';

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
import a2aRouter from './routes/a2a.js';

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

// Agent API (key auth)
app.use('/api/agent', agentApiRouter);

// A2A protocol endpoint (agent-to-agent task delivery)
app.use('/a2a', a2aRouter);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Agent OS API running on port ${PORT}`));
