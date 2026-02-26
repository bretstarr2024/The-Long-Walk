// ============================================================
// The Long Walk — Agent Tools (Game Effects)
// Tools that walker agents can call to affect game state
// ============================================================

import { tool } from '@openai/agents';
import { z } from 'zod';

// Game effects are returned to the client as structured data
export interface GameEffect {
  type: 'relationship' | 'morale' | 'flag' | 'info';
  walkerId?: number;
  delta?: number;
  key?: string;
  value?: boolean;
  text?: string;
}

// Request-scoped effects accumulator — each request gets its own array
// to prevent race conditions between concurrent agent calls.
// The active scope is set per-request via createEffectsScope().
let _activeEffects: GameEffect[] = [];

export function createEffectsScope(): GameEffect[] {
  const effects: GameEffect[] = [];
  _activeEffects = effects;
  return effects;
}

export const adjustRelationship = tool({
  name: 'adjust_relationship',
  description: 'Adjust how this walker feels about the player. Positive = warming up, negative = cooling off. Use after meaningful emotional exchanges.',
  parameters: z.object({
    delta: z.number().min(-10).max(10).describe('Relationship change (-10 to +10)'),
    reason: z.string().describe('Brief reason for the change'),
  }),
  execute: async ({ delta, reason }) => {
    _activeEffects.push({ type: 'relationship', delta });
    return `Relationship shifted by ${delta > 0 ? '+' : ''}${delta}: ${reason}`;
  },
});

export const adjustMorale = tool({
  name: 'adjust_morale',
  description: "Adjust the player's morale. Encouraging words boost morale, demoralizing talk lowers it.",
  parameters: z.object({
    delta: z.number().min(-5).max(5).describe('Morale change (-5 to +5)'),
  }),
  execute: async ({ delta }) => {
    _activeEffects.push({ type: 'morale', delta });
    return `Player morale ${delta > 0 ? 'boosted' : 'lowered'} by ${Math.abs(delta)}.`;
  },
});

export const setFlag = tool({
  name: 'set_flag',
  description: 'Set a narrative flag to remember something important about this conversation. Use for tracking promises, secrets shared, or emotional bonds.',
  parameters: z.object({
    key: z.string().describe('Flag name (e.g. "shared_backstory", "made_promise")'),
    value: z.boolean().describe('Flag value'),
  }),
  execute: async ({ key, value }) => {
    _activeEffects.push({ type: 'flag', key, value });
    return `Flag "${key}" set to ${value}.`;
  },
});

export const shareInfo = tool({
  name: 'share_info',
  description: 'Share a piece of lore, backstory, or important narrative information with the player. Use when revealing something significant.',
  parameters: z.object({
    text: z.string().describe('The information to share'),
  }),
  execute: async ({ text }) => {
    _activeEffects.push({ type: 'info', text });
    return `Shared info: ${text}`;
  },
});

export const ALL_TOOLS = [adjustRelationship, adjustMorale, setFlag, shareInfo];
