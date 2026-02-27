// ============================================================
// The Long Walk — Walker Agent Factory
// Creates and caches OpenAI Agents for each walker
// ============================================================

import { Agent } from '@openai/agents';
import { buildSystemPrompt, WalkerProfile } from './prompts';

const MODEL = 'gpt-5.2-chat-latest';

// Conversation history per walker: Responses API input items
type InputItem = {
  type: 'message';
  role: string;
  content: Array<{ type: string; text: string }>;
};
const historyCache = new Map<number, InputItem[]>();

export function getOrCreateAgent(walker: WalkerProfile, tools: any[]): Agent {
  // Tools are request-scoped (closure-bound effects), so always create a fresh agent
  // but reuse cached instructions. Agent instances are lightweight.
  const agent = new Agent({
    name: `Walker_${walker.walkerNumber}_${walker.name.replace(/\s+/g, '_')}`,
    instructions: buildSystemPrompt(walker),
    handoffDescription: `${walker.name}, walker #${walker.walkerNumber}`,
    tools,
    model: MODEL,
    modelSettings: {
      maxTokens: 200,
    },
  });

  return agent;
}

export function getHistory(walkerNumber: number): InputItem[] {
  if (!historyCache.has(walkerNumber)) {
    historyCache.set(walkerNumber, []);
  }
  return historyCache.get(walkerNumber)!;
}

export function addToHistory(walkerNumber: number, role: string, content: string) {
  const history = getHistory(walkerNumber);
  const contentType = role === 'assistant' ? 'output_text' : 'input_text';
  history.push({
    type: 'message',
    role,
    content: [{ type: contentType, text: content }],
  });
  // Keep history bounded — trim to 20 messages, always starting with a user message
  // to preserve user/assistant alternation required by the Responses API
  if (history.length > 20) {
    let trimmed = history.slice(-20);
    // Ensure first message is user role (drop leading assistant messages)
    while (trimmed.length > 0 && trimmed[0].role === 'assistant') {
      trimmed = trimmed.slice(1);
    }
    historyCache.set(walkerNumber, trimmed);
  }
}

export function removeLastHistory(walkerNumber: number) {
  const history = historyCache.get(walkerNumber);
  if (history && history.length > 0) {
    history.pop();
  }
}

