import { callQwen } from '../qwen.js';

const GHL_DOMAIN_PROMPT = `You are simulating the Go High Level (GHL) REST API v1.
You respond EXACTLY as GHL would respond to API calls.

ACCOUNT CONTEXT:
- Location ID: ${process.env.GHL_LOCATION_ID || 'loc_test_12345'}
- API Base: https://services.leadconnectorhq.com

SIMULATION RULES:
1. Always respond with exact GHL JSON response format
2. Generate realistic GHL entity IDs (format: contact_[12alphanum], workflow_[12alphanum])
3. Simulate rate limiting: after 100 requests in 10s, return 429 with Retry-After: 10
4. Simulate validation errors for missing required fields
5. Simulate duplicate detection: if email already in "database", return existing contact
6. Generate realistic timestamps in ISO format
7. Never use real contact information — use synthetic data only

KNOWN GHL RESPONSE FORMATS:
Contact created: { "contact": { "id": "contact_[id]", "email": "...", "firstName": "...", "locationId": "...", "tags": [], "createdAt": "..." } }
Contact not found: { "message": "Contact not found", "statusCode": 404 }
Rate limited: { "message": "Too many requests", "statusCode": 429, "error": "Too Many Requests" }
Workflow created: { "workflow": { "id": "workflow_[id]", "name": "...", "status": "draft", "locationId": "..." } }
Workflow enrolled: { "succeded": true, "contactId": "...", "workflowId": "..." }
Tag added: { "tags": ["tag1", "tag2"] }
SMS sent: { "conversationId": "conv_[id]", "messageId": "msg_[id]", "status": "sent" }
`;

export async function simulateGHLResponse(agentAction, conversationHistory = []) {
  if (!process.env.QWEN_AGENTWORLD_URL) {
    // Fallback mock for development
    return mockGHLResponse(agentAction);
  }

  const result = await callQwen({
    endpoint: process.env.QWEN_AGENTWORLD_URL,
    messages: [
      { role: 'system', content: GHL_DOMAIN_PROMPT },
      ...conversationHistory,
      {
        role: 'user',
        content: `Agent action: ${JSON.stringify(agentAction)}
Return the exact GHL API response JSON for this action. Nothing else.`
      }
    ],
    maxTokens: 1024,
    temperature: 0.3, // Low temperature for consistent simulation
    enableThinking: true, // AgentWorld uses reasoning to predict realistic responses
  });

  try {
    const text = result?.text || '{}';
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch {
    return { error: 'Simulation parse error', raw: result?.text };
  }
}

function mockGHLResponse(action) {
  const id = Math.random().toString(36).substring(2, 14);
  if (action.action?.includes('contact')) return {
    contact: { id: `contact_${id}`, email: action.payload?.email || 'test@test.com',
               locationId: 'loc_test', tags: [], createdAt: new Date().toISOString() }
  };
  if (action.action?.includes('workflow')) return {
    workflow: { id: `workflow_${id}`, name: action.payload?.name || 'Test Workflow',
                status: 'draft', locationId: 'loc_test' }
  };
  return { success: true, id };
}
