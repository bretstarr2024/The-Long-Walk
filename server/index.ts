// ============================================================
// The Long Walk — Agent Server (Hono + OpenAI Agents SDK)
// SSE streaming endpoint for walker conversations
// ============================================================

import 'dotenv/config';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { readFileSync } from 'fs';
import { Agent, run } from '@openai/agents';
import { setDefaultOpenAIKey } from '@openai/agents';
import { getOrCreateAgent, getHistory, addToHistory, removeLastHistory } from './agents';
import { buildGameContextBlock, type WalkerProfile, type GameContext } from './prompts';
import { createEffectsScope, type GameEffect } from './tools';

// --- Config ---
const MODEL = 'gpt-5.2-chat-latest';
const PORT = Number(process.env.PORT) || 3001;
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error('[Server] OPENAI_API_KEY not set. Exiting.');
  process.exit(1);
}
setDefaultOpenAIKey(apiKey);

// --- Hono App ---
const app = new Hono();

// CORS for Vite dev server — restrict to known origins
const ALLOWED_ORIGINS = new Set([
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
]);
if (process.env.RAILWAY_PUBLIC_DOMAIN) {
  ALLOWED_ORIGINS.add(`https://${process.env.RAILWAY_PUBLIC_DOMAIN}`);
}
app.use('*', cors({
  origin: (origin) => ALLOWED_ORIGINS.has(origin) ? origin : 'http://localhost:5173',
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

  // Validate walkerId
  if (!Number.isFinite(walkerId) || walkerId < 1 || walkerId > 100) {
    return c.json({ error: 'Invalid walkerId — must be 1-100' }, 400);
  }

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

  // Build input items for the agent (Responses API format)
  // Only user/assistant roles are supported in Agents SDK input items,
  // so we embed the game context as a prefix on the player's message.
  const inputItems = [
    // Previous conversation history
    ...history,
    // Player's message with game context embedded
    {
      type: 'message' as const,
      role: 'user' as const,
      content: [{ type: 'input_text' as const, text: `[GAME STATE]\n${contextBlock}\n\n[PLAYER SAYS]\n${message}` }],
    },
  ];

  // Record player message in history (will be rolled back on error)
  addToHistory(walkerId, 'user', message);

  // Create request-scoped effects accumulator
  const effects = createEffectsScope();

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
          for (const effect of effects) {
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
          // Roll back the user message we added before the agent call
          removeLastHistory(walkerId);
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

// --- Overhear endpoint (two walkers talking to each other) ---
interface OverhearRequest {
  walkerA: WalkerProfile;
  walkerB: WalkerProfile;
  gameContext: GameContext;
  scenePrompt: string;
}

app.post('/api/overhear', async (c) => {
  const body = await c.req.json<OverhearRequest>();
  const { walkerA, walkerB, gameContext, scenePrompt } = body;

  if (!walkerA || !walkerB || !gameContext || !scenePrompt) {
    return c.json({ error: 'Missing walkerA, walkerB, gameContext, or scenePrompt' }, 400);
  }

  const contextBlock = buildGameContextBlock(gameContext, true); // skip walker state for overhear

  const overhearAgent = new Agent({
    name: 'Overhear_Narrator',
    instructions: `You are a narrator for The Long Walk, a dystopian survival story. Two walkers are having a brief conversation that a nearby walker overhears.

## The Long Walk
100 teenage boys walk south from the Maine/Canada border. Maintain 4 mph or get a warning. Three warnings = shot dead. Last one alive wins The Prize.

## Walker A: ${walkerA.name} (#${walkerA.walkerNumber})
- Age: ${walkerA.age}, from ${walkerA.homeState}
- Personality: ${walkerA.personalityTraits.join(', ')}
- Speaking style: ${walkerA.dialogueStyle}
- Backstory: ${walkerA.backstoryNotes}

## Walker B: ${walkerB.name} (#${walkerB.walkerNumber})
- Age: ${walkerB.age}, from ${walkerB.homeState}
- Personality: ${walkerB.personalityTraits.join(', ')}
- Speaking style: ${walkerB.dialogueStyle}
- Backstory: ${walkerB.backstoryNotes}

${contextBlock}

## Scene: ${scenePrompt}

## Rules
- Write a SHORT overheard exchange: 3 to 5 lines of dialogue.
- Format each line as: SpeakerName: "Dialogue" or SpeakerName: *action/description*
- Stay in character for both walkers. Reflect their personality, speaking style, and current physical/emotional state.
- The conversation should feel natural — snippets caught while walking, not complete scenes.
- Reflect the current game state: mile, weather, time, how many walkers remain, how tired they are.
- The tone darkens as the walk progresses. Early = nervous energy. Late = exhaustion, despair, dark humor.
- No preamble, no narration outside the lines. Just the exchange.`,
    model: MODEL,
    modelSettings: {
      maxTokens: 250,
    },
  });

  return new Response(
    new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const send = (event: string, data: string) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`));
        };

        try {
          const result = await run(overhearAgent, [
            {
              type: 'message' as const,
              role: 'user' as const,
              content: [{ type: 'input_text' as const, text: `Generate the overheard conversation between ${walkerA.name} and ${walkerB.name}.` }],
            },
          ], { stream: true });

          let fullText = '';

          for await (const event of result) {
            if (event.type === 'raw_model_stream_event') {
              const data = event.data as any;
              if (data?.type === 'output_text_delta' && data.delta) {
                fullText += data.delta;
                send('token', JSON.stringify({ text: data.delta }));
              }
            }
          }

          await result.completed;
          send('done', JSON.stringify({ text: fullText }));
          controller.close();
        } catch (err: any) {
          console.error(`[Server] Overhear error:`, err.message || err);
          send('error', JSON.stringify({ error: err.message || 'Overhear failed' }));
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

// --- Approach endpoint (NPC initiates conversation with player) ---
interface ApproachRequest {
  walker: WalkerProfile;
  gameContext: GameContext;
  approachType: string;
  approachContext: string;
}

app.post('/api/approach', async (c) => {
  const body = await c.req.json<ApproachRequest>();
  const { walker, gameContext, approachType, approachContext } = body;

  if (!walker || !gameContext || !approachType || !approachContext) {
    return c.json({ error: 'Missing walker, gameContext, approachType, or approachContext' }, 400);
  }

  const contextBlock = buildGameContextBlock(gameContext);

  const approachAgent = new Agent({
    name: `Approach_${walker.name}`,
    instructions: `You are ${walker.name}, Walker #${walker.walkerNumber}, a ${walker.age}-year-old from ${walker.homeState} competing in The Long Walk.

## The Long Walk
100 teenage boys walk south from the Maine/Canada border. Maintain 4 mph or get a warning. Three warnings = shot dead. Last one alive wins The Prize.

## Who You Are
- Name: ${walker.name}
- Age: ${walker.age}
- Home: ${walker.homeState}
- Archetype: ${walker.psychologicalArchetype}
- Personality: ${walker.personalityTraits.join(', ')}
- Backstory: ${walker.backstoryNotes}
- Speaking style: ${walker.dialogueStyle}

${contextBlock}

## Your Task
You are approaching Walker #100 (${gameContext.playerName}) to say something.
Approach type: ${approachType}
Context: ${approachContext}

## Rules
- Write ONLY your opening line — 1 to 2 sentences. Nothing more.
- Stay completely in character. You are a teenager walking to survive.
- React to the current game state: weather, terrain, time, how tired you feel.
- Your emotional state reflects your morale (${gameContext.walkerMorale}%), stamina (${gameContext.walkerStamina}%), and warnings (${gameContext.walkerWarnings}/3).
- No quotation marks around your speech — just speak directly.
- No narration, no stage directions. Just what you say.
- Never break character. Never reference being an AI.`,
    model: MODEL,
    modelSettings: {
      maxTokens: 100,
    },
  });

  return new Response(
    new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const send = (event: string, data: string) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`));
        };

        try {
          const result = await run(approachAgent, [
            {
              type: 'message' as const,
              role: 'user' as const,
              content: [{ type: 'input_text' as const, text: `[NPC INITIATES CONVERSATION]\nYou see Walker #100 (${gameContext.playerName}) nearby. You want to say something to them.\nContext: ${approachContext}\nSpeak first. 1-2 sentences. Stay in character.` }],
            },
          ], { stream: true });

          let fullText = '';

          for await (const event of result) {
            if (event.type === 'raw_model_stream_event') {
              const data = event.data as any;
              if (data?.type === 'output_text_delta' && data.delta) {
                fullText += data.delta;
                send('token', JSON.stringify({ text: data.delta }));
              }
            }
          }

          await result.completed;
          send('done', JSON.stringify({ text: fullText }));
          controller.close();
        } catch (err: any) {
          console.error(`[Server] Approach error for ${walker.name}:`, err.message || err);
          send('error', JSON.stringify({ error: err.message || 'Approach failed' }));
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

// --- Static file serving (production) ---
if (process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT) {
  app.use('/*', serveStatic({ root: './dist' }));
  const indexHtml = readFileSync('./dist/index.html', 'utf-8');
  app.get('*', (c) => {
    if (c.req.path.startsWith('/api/')) {
      return c.json({ error: 'Not found' }, 404);
    }
    return c.html(indexHtml);
  });
}

// --- Start ---
console.log(`[Server] The Long Walk Agent Server starting on port ${PORT}`);
serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`[Server] Running at http://localhost:${info.port}`);
  console.log(`[Server] Model: gpt-5.2-chat-latest`);
  console.log(`[Server] Health: http://localhost:${info.port}/api/health`);
});
