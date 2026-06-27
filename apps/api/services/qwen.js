// Qwen API wrapper — OpenAI-compatible
// Works with DashScope (Phase 1) and Railway vLLM (Phase 2)
// The URL and model name are the only things that change between phases

export async function callQwen({
  endpoint,
  model,
  messages,
  maxTokens = 2048,
  temperature = 0.7,
  enableThinking = false,
}) {
  // Resolve endpoint: use specific URL or fall back to DashScope base
  const url = endpoint || process.env.QWEN_API_BASE;
  const apiKey = process.env.DASHSCOPE_API_KEY;

  if (!url || !apiKey) {
    console.warn('[Qwen] No endpoint or API key configured — skipping');
    return null;
  }

  try {
    const res = await fetch(`${url}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || process.env.QWEN_EXECUTOR_MODEL || 'qwen-plus',
        messages,
        max_tokens: maxTokens,
        temperature,
        // Qwen3 dual-mode: enable_thinking for complex tasks
        ...(enableThinking !== undefined ? { enable_thinking: enableThinking } : {}),
      }),
      // AgentWorld simulation can take time — 10 min timeout for training
      signal: AbortSignal.timeout(
        model === process.env.QWEN_AGENTWORLD_MODEL ? 600000 : 60000
      ),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[Qwen] API error:', res.status, err);
      return null;
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    return { text: text || null, usage: data?.usage };
  } catch (err) {
    console.error('[Qwen] Request failed:', err.message);
    return null;
  }
}

export async function callQwenAgentWorld({ messages, conversationHistory = [] }) {
  return callQwen({
    endpoint: process.env.QWEN_AGENTWORLD_URL,
    model: process.env.QWEN_AGENTWORLD_MODEL,
    messages: [...conversationHistory, ...messages],
    maxTokens: 32768,  // AgentWorld needs long context
    temperature: 0.3,   // Low temp for consistent simulation
    enableThinking: true, // AgentWorld uses chain-of-thought
  });
}
