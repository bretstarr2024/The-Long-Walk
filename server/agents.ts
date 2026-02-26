// ============================================================
// The Long Walk — Walker Agent Factory
// Creates and caches OpenAI Agents for each walker
// ============================================================

import { Agent } from '@openai/agents';
import { buildSystemPrompt, WalkerProfile } from './prompts';
import { ALL_TOOLS } from './tools';

const MODEL = 'gpt-5.2-chat-latest';

// Cache: one agent per walker number
const agentCache = new Map<number, Agent>();

// Conversation history per walker: array of input items
const historyCache = new Map<number, Array<{ role: string; content: string }>>();

export function getOrCreateAgent(walker: WalkerProfile): Agent {
  const existing = agentCache.get(walker.walkerNumber);
  if (existing) return existing;

  const agent = new Agent({
    name: `Walker_${walker.walkerNumber}_${walker.name.replace(/\s+/g, '_')}`,
    instructions: buildSystemPrompt(walker),
    handoffDescription: `${walker.name}, walker #${walker.walkerNumber}`,
    tools: ALL_TOOLS,
    model: MODEL,
    modelSettings: {
      maxTokens: 200,
    },
  });

  agentCache.set(walker.walkerNumber, agent);
  return agent;
}

export function getHistory(walkerNumber: number): Array<{ role: string; content: string }> {
  if (!historyCache.has(walkerNumber)) {
    historyCache.set(walkerNumber, []);
  }
  return historyCache.get(walkerNumber)!;
}

export function addToHistory(walkerNumber: number, role: string, content: string) {
  const history = getHistory(walkerNumber);
  history.push({ role, content });
  // Keep history bounded (last 20 messages)
  if (history.length > 20) {
    historyCache.set(walkerNumber, history.slice(-20));
  }
}

export function clearHistory(walkerNumber: number) {
  historyCache.delete(walkerNumber);
}
