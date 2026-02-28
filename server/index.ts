// ============================================================
// The Long Walk — Agent Server (Hono + OpenAI Agents SDK)
// SSE streaming endpoint for walker conversations
// ============================================================

import 'dotenv/config';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { bodyLimit } from 'hono/body-limit';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { readFileSync } from 'fs';
import { Agent, run } from '@openai/agents';
import { setDefaultOpenAIKey } from '@openai/agents';
import { z } from 'zod';
import { getOrCreateAgent, getHistory, addToHistory, removeLastHistory } from './agents';
import { buildGameContextBlock, type WalkerProfile, type GameContext } from './prompts';
import { createEffectsScope, type GameEffect } from './tools';

// --- Input validation schemas ---
const WalkerProfileSchema = z.object({
  name: z.string().min(1).max(100),
  walkerNumber: z.number().int().min(1).max(100),
  age: z.number().int().min(13).max(19),
  homeState: z.string().min(1).max(100),
  tier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  personalityTraits: z.array(z.string()).max(10),
  dialogueStyle: z.string().max(500),
  backstoryNotes: z.string().max(1000),
  psychologicalArchetype: z.string().max(100),
  alliancePotential: z.string().max(50),
});

const GameContextSchema = z.object({
  milesWalked: z.number().min(0).max(500),
  hoursElapsed: z.number().min(0),
  currentTime: z.string(),
  dayNumber: z.number().int().min(1),
  isNight: z.boolean(),
  weather: z.string(),
  terrain: z.string(),
  crowdDensity: z.string(),
  crowdMood: z.string(),
  currentAct: z.number().int().min(1).max(4),
  horrorTier: z.number().int().min(0),
  walkersRemaining: z.number().int().min(1).max(100),
  playerName: z.string().min(1).max(50),
  playerWarnings: z.number().int().min(0).max(3),
  playerMorale: z.number().min(0).max(100),
  playerStamina: z.number().min(0).max(100),
  walkerWarnings: z.number().int().min(0).max(3),
  walkerMorale: z.number().min(0).max(100),
  walkerStamina: z.number().min(0).max(100),
  walkerRelationship: z.number().min(-100).max(100),
  walkerBehavioralState: z.string(),
  recentEvents: z.array(z.string()).max(20),
  arcPhase: z.string().optional(),
  arcPromptHint: z.string().optional(),
  conversationCount: z.number().int().optional(),
  revealedFacts: z.array(z.string()).optional(),
  playerActions: z.array(z.string()).optional(),
  isAllied: z.boolean().optional(),
  isBonded: z.boolean().optional(),
  isEnemy: z.boolean().optional(),
  allyStrain: z.number().optional(),
});

const VALID_APPROACH_TYPES = new Set([
  'arc_milestone', 'elimination_reaction', 'warning_check', 'vulnerability',
  'offer_alliance', 'crisis_aftermath', 'introduction', 'proximity', 'enemy_confrontation',
]);

// --- Config ---
const MODEL = 'gpt-5.2-chat-latest';
const PORT = Number(process.env.PORT) || 3001;
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error('[Server] OPENAI_API_KEY not set. Exiting.');
  process.exit(1);
}
setDefaultOpenAIKey(apiKey);

// --- Rate Limiter ---
// Simple in-memory rate limiter: Map<ip, timestamp[]>
const rateLimitStore = new Map<string, number[]>();

function rateLimit(maxRequests: number, windowMs: number) {
  return async (c: any, next: () => Promise<void>) => {
    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
    const now = Date.now();
    const key = `${ip}:${c.req.path}`;

    let timestamps = rateLimitStore.get(key) || [];
    // Prune timestamps outside the window
    timestamps = timestamps.filter((t) => now - t < windowMs);

    if (timestamps.length >= maxRequests) {
      return c.json({ error: 'Too many requests' }, 429);
    }

    timestamps.push(now);
    rateLimitStore.set(key, timestamps);
    await next();
  };
}

// Periodically clean up stale entries (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of rateLimitStore) {
    const fresh = timestamps.filter((t) => now - t < 60_000);
    if (fresh.length === 0) {
      rateLimitStore.delete(key);
    } else {
      rateLimitStore.set(key, fresh);
    }
  }
}, 5 * 60 * 1000);

// --- Hono App ---
const app = new Hono();

// Global error handler — catches unhandled errors in any route
app.onError((err, c) => {
  console.error('[Server] Unhandled error:', err.message);
  return c.json({ error: 'Internal server error' }, 500);
});

// Security headers middleware
app.use('*', async (c, next) => {
  await next();
  c.res.headers.set('X-Content-Type-Options', 'nosniff');
  c.res.headers.set('X-Frame-Options', 'DENY');
  c.res.headers.set('Referrer-Policy', 'no-referrer');
  c.res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  c.res.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'");
});

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
  origin: (origin) => ALLOWED_ORIGINS.has(origin) ? origin : null,
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
}));

// Body size limit for API routes (50 KB)
app.use('/api/*', bodyLimit({ maxSize: 50 * 1024 }));

// Rate limiting per endpoint
app.use('/api/chat/*', rateLimit(10, 60_000));
app.use('/api/overhear', rateLimit(5, 60_000));
app.use('/api/approach', rateLimit(5, 60_000));

// Health check
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', model: 'gpt-5.2-chat-latest' });
});

// --- Error classifier — maps OpenAI errors to safe user-facing messages ---
function classifyAgentError(err: any): string {
  const msg = String(err?.message || err?.error?.message || '').toLowerCase();
  const status = err?.status || err?.statusCode || 0;

  if (status === 402 || msg.includes('quota') || msg.includes('billing') || msg.includes('insufficient_quota'))
    return 'API quota exceeded \u2014 check billing';
  if (status === 429 || msg.includes('rate limit') || msg.includes('rate_limit'))
    return 'Rate limited \u2014 try again in a moment';
  if (msg.includes('timeout') || msg.includes('timed out') || err?.name === 'AbortError')
    return 'Agent timed out \u2014 try again';
  if (status === 503 || msg.includes('overloaded') || msg.includes('unavailable'))
    return 'Model temporarily unavailable \u2014 try again';
  if (status === 401 || msg.includes('invalid api key') || msg.includes('authentication'))
    return 'API authentication error \u2014 check server config';
  if (msg.includes('content_filter') || msg.includes('content filter') || msg.includes('moderation'))
    return 'Response filtered \u2014 try a different message';
  if (msg.includes('context_length') || msg.includes('maximum context') || msg.includes('tokens'))
    return 'Conversation too long \u2014 close and reopen chat';

  return 'Agent failed \u2014 try again';
}

// --- Shared SSE response helper ---
// Deduplicates the ReadableStream + SSE iteration pattern used by all 3 endpoints
function createSSEResponse(
  agentOrRun: Agent,
  inputItems: any[],
  options?: {
    effects?: GameEffect[];
    walkerId?: number;
    onSuccess?: (fullText: string) => void;
    onError?: () => void;
  },
): Response {
  const { effects, walkerId, onSuccess, onError } = options || {};

  return new Response(
    new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const send = (event: string, data: string) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`));
        };

        try {
          const timeoutMs = 60_000;
          const result = await Promise.race([
            run(agentOrRun, inputItems as any, { stream: true }),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Agent timed out after 60s')), timeoutMs)
            ),
          ]);

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

          // Send any accumulated game effects from tool calls
          if (effects) {
            for (const effect of effects) {
              if (walkerId !== undefined) {
                effect.walkerId = walkerId;
              }
              send('effect', JSON.stringify(effect));
            }
          }

          // Invoke success callback (e.g. record history)
          if (onSuccess) {
            onSuccess(fullText);
          }

          send('done', JSON.stringify({ text: fullText }));
          controller.close();
        } catch (err: any) {
          console.error(`[Server] SSE error:`, err);
          if (onError) {
            onError();
          }
          const safeMessage = classifyAgentError(err);
          send('error', JSON.stringify({ error: safeMessage }));
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
}

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

  // Message length validation
  if (message.length > 1000) {
    return c.json({ error: 'Message too long (max 1000 characters)' }, 400);
  }

  // Structured validation
  try {
    WalkerProfileSchema.parse(walker);
    GameContextSchema.parse(gameContext);
  } catch {
    return c.json({ error: 'Invalid request data' }, 400);
  }

  // Create request-scoped effects accumulator + tools (closure-bound, no shared state)
  const { effects, tools } = createEffectsScope();

  // Get or create agent for this walker with scoped tools
  const agent = getOrCreateAgent(walker, tools);

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

  // Stream response via SSE
  return createSSEResponse(agent, inputItems, {
    effects,
    walkerId,
    onSuccess: (fullText) => {
      if (fullText) {
        addToHistory(walkerId, 'assistant', fullText);
      }
    },
    onError: () => {
      removeLastHistory(walkerId);
    },
  });
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

  // Scene prompt length validation
  if (scenePrompt.length > 500) {
    return c.json({ error: 'Scene prompt too long (max 500 characters)' }, 400);
  }

  // Structured validation
  try {
    WalkerProfileSchema.parse(walkerA);
    WalkerProfileSchema.parse(walkerB);
    GameContextSchema.parse(gameContext);
  } catch {
    return c.json({ error: 'Invalid request data' }, 400);
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

  const inputItems = [
    {
      type: 'message' as const,
      role: 'user' as const,
      content: [{ type: 'input_text' as const, text: `Generate the overheard conversation between ${walkerA.name} and ${walkerB.name}.` }],
    },
  ];

  return createSSEResponse(overhearAgent, inputItems);
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

  // Approach type whitelist
  if (!VALID_APPROACH_TYPES.has(approachType)) {
    return c.json({ error: 'Invalid approach type' }, 400);
  }

  // Approach context length validation
  if (approachContext.length > 500) {
    return c.json({ error: 'Approach context too long (max 500 characters)' }, 400);
  }

  // Structured validation
  try {
    WalkerProfileSchema.parse(walker);
    GameContextSchema.parse(gameContext);
  } catch {
    return c.json({ error: 'Invalid request data' }, 400);
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

  const inputItems = [
    {
      type: 'message' as const,
      role: 'user' as const,
      content: [{ type: 'input_text' as const, text: `[NPC INITIATES CONVERSATION]\nYou see Walker #100 (${gameContext.playerName}) nearby. You want to say something to them.\nContext: ${approachContext}\nSpeak first. 1-2 sentences. Stay in character.` }],
    },
  ];

  return createSSEResponse(approachAgent, inputItems);
});

// --- Static file serving (production) ---
if (process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT) {
  app.use('/*', serveStatic({ root: './dist' }));

  let indexHtml: string;
  try {
    indexHtml = readFileSync('./dist/index.html', 'utf-8');
  } catch (err) {
    console.error('[Server] Failed to read dist/index.html:', err);
    indexHtml = '<!DOCTYPE html><html><head><title>The Long Walk</title></head><body><p>Application failed to load. Please try again later.</p></body></html>';
  }

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
