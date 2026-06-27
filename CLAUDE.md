# Agent OS — Claude Code Instructions

## Repo structure
- apps/web → React/Vite frontend (Vercel)
- apps/api → Express API (Railway, port 3001)
- packages/shared → shared types + constants

## Critical rules
1. NEVER modify resethousellc-prog/reelmax-portal or staffarmy-portal
2. Tier names: T3-FULL / T2-HIGH / T1-EXEC — never T3-APEX or T2-INTEL
3. geelark_cells (Supabase) ≠ cells (Brenda DB). Different tables, different DBs, different concepts.
4. Supabase = Agent OS operational state. Brenda DB = intelligence layer (read-only from Agent OS).
5. All new tables must have workspace_id FK.
6. Never store raw API keys in platform_connections.credentials — store env var NAMES only.
7. Run `node --check` on all new JS files before committing.
8. Run `npm run build` in apps/web before push.
9. Brenda AI is never exposed to end users. Copy says "Agent OS" only.
10. agent_tools seed must contain exactly 31 tools (the checklist says 30 but count is 31 — all 31 are correct, ship them all).

## Databases
- SUPABASE_URL + keys → all new Agent OS tables
- BRENDA_DATABASE_URL → existing intelligence tables (agent_registry, cells) — READ ONLY
- Never use Supabase as FK target for Brenda DB data — cross-DB reference is TEXT only

## PostArmy Inc. workspace seed ID
00000000-0000-0000-0000-000000000001
