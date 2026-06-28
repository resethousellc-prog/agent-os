import { callQwen } from '../qwen.js';

const GEELARK_DOMAIN_PROMPT = `You are simulating the GeeLark device management API.
You respond EXACTLY as GeeLark would respond to API calls.

FLEET CONTEXT:
- Total cells: 100
- Pods: fitness (20 cells), real_estate (15 cells), business (25 cells), lifestyle (20 cells), general (20 cells)
- Cell naming: POD01-CELL01 through POD05-CELL20
- All cells have status: active unless specified

SIMULATION RULES:
1. Respond with exact GeeLark JSON format
2. 5% chance of flag event on any posting action (realistic rate)
3. If flag_count > 3 in 24hrs: return suspended status
4. Proxy errors: 2% of proxy assignments fail
5. Task completion: 95% success rate (5% fail with realistic reasons)
6. Analytics: generate realistic engagement numbers per niche
   - Fitness: 2-8% engagement rate
   - Real estate: 0.5-2% engagement rate
   - Business: 1-3% engagement rate
7. Never return data about real accounts

RESPONSE FORMATS:
Profile status: { "id": "...", "name": "POD01-CELL01", "status": "active|flagged|suspended", "health_score": 85, "flag_count": 0 }
Task created: { "taskId": "task_[id]", "status": "queued", "profileId": "...", "scheduledAt": "..." }
Task completed: { "taskId": "task_[id]", "status": "completed", "completedAt": "..." }
Content pushed: { "postId": "post_[id]", "status": "published", "platformPostId": "ig_[id]", "publishedAt": "..." }
Fleet health: { "healthy": 94, "flagged": 4, "suspended": 1, "offline": 1, "total": 100 }
`;

export async function simulateGeeLarkResponse(agentAction, conversationHistory = []) {
  if (!process.env.QWEN_AGENTWORLD_URL) {
    return mockGeeLarkResponse(agentAction);
  }

  const result = await callQwen({
    endpoint: process.env.QWEN_AGENTWORLD_URL,
    messages: [
      { role: 'system', content: GEELARK_DOMAIN_PROMPT },
      ...conversationHistory,
      {
        role: 'user',
        content: `Agent action: ${JSON.stringify(agentAction)}
Return the exact GeeLark API response JSON. Nothing else.`
      }
    ],
    maxTokens: 1024,
    temperature: 0.3,
    enableThinking: true,
  });

  try {
    return JSON.parse((result?.text || '{}').replace(/```json|```/g, '').trim());
  } catch {
    return { error: 'Simulation parse error' };
  }
}

function mockGeeLarkResponse(action) {
  const id = Math.random().toString(36).substring(2, 12);
  if (action.action?.includes('task')) return { taskId: `task_${id}`, status: 'queued' };
  if (action.action?.includes('content')) return { postId: `post_${id}`, status: 'published' };
  if (action.action?.includes('health')) return { healthy: 94, flagged: 4, suspended: 1, offline: 1, total: 100 };
  return { success: true };
}
