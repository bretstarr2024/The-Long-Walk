// ============================================================
// The Long Walk — Agent Server (Hono + OpenAI Agents SDK)
// SSE streaming endpoint for walker conversations
// ============================================================

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { run } from '@openai/agents';
import { setDefaultOpenAIKey } from '@openai/agents';
import { getOrCreateAgent, getHistory, addToHistory } from './agents';
import { buildGameContextBlock, type WalkerProfile, type GameContext } from './prompts';
import { pendingEffects, type GameEffect } from './tools';

// --- Config ---
const PORT = 3001;
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error('[Server] OPENAI_API_KEY not set. Exiting.');
  process.exit(1);
}
setDefaultOpenAIKey(apiKey);

// --- Hono App ---
const app = new Hono();

// CORS for Vite dev server
app.use('*', cors({
  origin: (origin) => origin || '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
}));

// Health check
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', model: 'gpt-5.2-chat-latest' });
});

// --- Chat endpoint (SSE streaming) ---
interface ChatRequest {
  message: string;
  walker: WalkerProfile;
  gameContext: GameContext;
}

app.post('/api/chat/:walkerId', async (c) => {
  const walkerId = parseInt(c.req.param('walkerId'));
  const body = await c.req.json<ChatRequest>();
  const { message, walker, gameContext } = body;

  if (!message || !walker || !gameContext) {
    return c.json({ error: 'Missing message, walker, or gameContext' }, 400);
  }

  // Get or create agent for this walker
  const agent = getOrCreateAgent(walker);

  // Build conversation input with game context
  const contextBlock = buildGameContextBlock(gameContext);
  const history = getHistory(walkerId);

  // Build input items for the agent
  // Only user/assistant roles are supported in Agents SDK input items,
  // so we embed the game context as a prefix on the player's message.
  const inputItems: Array<{ role: string; content: string }> = [
    // Previous conversation history
    ...history,
    // Player's message with game context embedded
    { role: 'user', content: `[GAME STATE]\n${contextBlock}\n\n[PLAYER SAYS]\n${message}` },
  ];

  // Record player message in history
  addToHistory(walkerId, 'user', message);

  // Clear pending effects
  pendingEffects.length = 0;

  // Stream response via SSE
  return new Response(
    new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const send = (event: string, data: string) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`));
        };

        try {
          const result = await run(agent, inputItems as any, { stream: true });

          let fullText = '';

          // Iterate stream events to extract text
          for await (const event of result) {
            if (event.type === 'raw_model_stream_event') {
              const data = event.data as any;
              // The Agents SDK emits 'output_text_delta' (not 'response.output_text.delta')
              if (data?.type === 'output_text_delta' && data.delta) {
                fullText += data.delta;
                send('token', JSON.stringify({ text: data.delta }));
              }
            }
          }

          // Stream iteration completes when done
          await result.completed;

          // Send any accumulated game effects from tool calls
          for (const effect of pendingEffects) {
            effect.walkerId = walkerId;
            send('effect', JSON.stringify(effect));
          }

          // Record agent response in history
          if (fullText) {
            addToHistory(walkerId, 'assistant', fullText);
          }

          send('done', JSON.stringify({ text: fullText }));
          controller.close();
        } catch (err: any) {
          console.error(`[Server] Agent error for walker ${walkerId}:`, err.message || err);
          send('error', JSON.stringify({ error: err.message || 'Agent failed' }));
          controller.close();
        }
      },
    }),
    {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    }
  );
});

// --- Start ---
console.log(`[Server] The Long Walk Agent Server starting on port ${PORT}`);
serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`[Server] Running at http://localhost:${info.port}`);
  console.log(`[Server] Model: gpt-5.2-chat-latest`);
  console.log(`[Server] Health: http://localhost:${info.port}/api/health`);
});
