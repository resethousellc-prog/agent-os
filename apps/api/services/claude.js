export async function callClaude({ system, user, model = 'claude-sonnet-4-6', maxTokens = 2000 }) {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: user }],
      }),
    });
    const data = await res.json();
    return { text: data?.content?.[0]?.text || null };
  } catch {
    return null;
  }
}
