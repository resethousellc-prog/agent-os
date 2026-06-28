# Agent OS — Claude Code Instructions

## Repo structure
- apps/web → React/Vite frontend (Vercel)
- apps/api → Express API (Railway, port 3001)
- packages/shared → shared types + constants
- supabase/ → migration + seed SQL files (run manually in Supabase SQL Editor)

## Build status
All 14 sessions complete (Batches A–E). Sessions 10–14 added the GHL + GeeLark
operations departments, the Command pillar, multi-tenant / white-label support,
and the model router graduation + cost tracking workers.

## Critical rules
1. NEVER modify resethousellc-prog/reelmax-portal or staffarmy-portal
2. Tier names: T3-FULL / T2-HIGH / T1-EXEC — never T3-APEX or T2-INTEL
3. geelark_cells (Supabase) ≠ cells (Brenda DB). Different tables, different DBs, different concepts.
4. Supabase = Agent OS operational state. Brenda DB = intelligence layer (read-only from Agent OS).
5. All new tables must have workspace_id FK.
6. Never store raw API keys in platform_connections.credentials — store env var NAMES only.
7. Run `node --check` on all new JS files before committing.
8. Run `npm run build:web` (or `npm run build` in apps/web) before push.
9. Brenda AI is never exposed to end users. Copy says "Agent OS" only.
10. agent_tools seed must contain exactly 31 tools (the checklist says 30 but count is 31 — all 31 are correct, ship them all).
11. `req.workspaceId` is set by humanAuth middleware (primary). humanAuth also sets `req.user.workspaceId` as an alias for backwards-compat with Batch D routes.
12. All workers are fail-soft: they use the shared `connection` from services/bullmq.js and only create the Queue/Worker + cron when REDIS_URL is set, so the API boots without Redis.

## Databases
- SUPABASE_URL + keys → all new Agent OS tables
- BRENDA_DATABASE_URL → existing intelligence tables (agent_registry, cells) — READ ONLY
- Never use Supabase as FK target for Brenda DB data — cross-DB reference is TEXT only

## API conventions
- Auth: `humanAuth` middleware from middleware/humanAuth.js (human users)
- Plan gating: `loadWorkspace` + `requirePlan(...plans)` from middleware/ (run after humanAuth)
- Supabase: `supabaseAdmin` from services/supabase.js
- Model router: `routeTask` from services/modelRouter.js (Qwen tasks fall back to Claude via `callQwenWithFallback`)
- Qwen: via Groq (DASHSCOPE_API_KEY = Groq key, QWEN_API_BASE = https://api.groq.com/openai/v1)
- GHL/GeeLark actions always route through REELMAX_INTERNAL_URL (reelmax-portal internal)

## Workers (all in apps/api/workers/, all fail-soft)
- improvementWorker.js — workflow + loop analysis (extended in Batches C/D — do NOT overwrite)
- attributeWorker.js — weekly attribute recalculation
- trainingWorker.js — agent training pipeline
- chemistryWorker.js — weekly chemistry recalculation
- loopPerformanceWorker.js — loop metrics
- geelarkResetWorker.js — midnight UTC posts_today reset (Session 11)
- graduationWorker.js — Monday 3am graduation check, 95% threshold, re-train if stale (Session 14)
- modelCostTracker.js — Sunday midnight cost report → system_reports table (Session 14)

## Manual SQL (run in Supabase SQL Editor — Claude Code cannot execute against live Supabase)
- supabase/017_schema_additions.sql — workspaces.parent_workspace_id + system_reports
- supabase/seed_ghl_agents.sql — 5 GHL agents + prompts + 3 loops
- supabase/seed_geelark_agents.sql — 5 GeeLark agents + prompts + 5 loops
- supabase/seed_infra_templates.sql — 4 infrastructure templates

## PostArmy Inc. workspace seed ID
00000000-0000-0000-0000-000000000001
