// ============================================================
// The Long Walk — Browser Agent Client (SSE)
// Sends messages to the server and streams responses
// ============================================================

const SERVER_URL = import.meta.env.VITE_AGENT_SERVER_URL
  ?? (import.meta.env.DEV ? 'http://localhost:3001' : '');

export interface TokenEvent { type: 'token'; text: string }
export interface EffectEvent { type: 'effect'; effectType: string; walkerId?: number; delta?: number; key?: string; value?: boolean; text?: string }
export interface DoneEvent { type: 'done'; text: string }
export interface ErrorEvent { type: 'error'; error: string }
export type StreamEvent = TokenEvent | EffectEvent | DoneEvent | ErrorEvent;

export interface WalkerProfile {
  name: string;
  walkerNumber: number;
  age: number;
  homeState: string;
  tier: 1 | 2 | 3;
  personalityTraits: string[];
  dialogueStyle: string;
  backstoryNotes: string;
  psychologicalArchetype: string;
  alliancePotential: string;
}

export interface GameContextForAgent {
  milesWalked: number;
  hoursElapsed: number;
  currentTime: string;
  dayNumber: number;
  isNight: boolean;
  weather: string;
  terrain: string;
  crowdDensity: string;
  crowdMood: string;
  currentAct: number;
  horrorTier: number;
  walkersRemaining: number;
  playerName: string;
  playerWarnings: number;
  playerMorale: number;
  playerStamina: number;
  walkerWarnings: number;
  walkerMorale: number;
  walkerStamina: number;
  walkerRelationship: number;
  walkerBehavioralState: string;
  recentEvents: string[];
  // Arc context (optional — populated for Tier 1/2 walkers with arc data)
  arcPhase?: string;
  arcPromptHint?: string;
  conversationCount?: number;
  revealedFacts?: string[];
  playerActions?: string[];
  isAllied?: boolean;
  allyStrain?: number;
}

export interface OverhearResult {
  text: string;
  error?: string;
}

export async function requestOverhear(
  walkerA: WalkerProfile,
  walkerB: WalkerProfile,
  gameContext: GameContextForAgent,
  scenePrompt: string,
): Promise<OverhearResult> {
  try {
    const res = await fetch(`${SERVER_URL}/api/overhear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walkerA, walkerB, gameContext, scenePrompt }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok || !res.body) {
      return { text: '', error: `Server responded with ${res.status}` };
    }

    // Read SSE stream, collect full text from done event
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      let currentEvent = '';
      let currentData = '';

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith('data: ')) {
          currentData = line.slice(6).trim();
        } else if (line === '' && currentEvent && currentData) {
          try {
            const parsed = JSON.parse(currentData);
            if (currentEvent === 'done') fullText = parsed.text;
            else if (currentEvent === 'error') return { text: '', error: parsed.error };
          } catch { /* ignore parse errors */ }
          currentEvent = '';
          currentData = '';
        }
      }
    }

    return { text: fullText };
  } catch (err: any) {
    return { text: '', error: err.message || 'Overhear request failed' };
  }
}

export async function requestApproach(
  walker: WalkerProfile,
  gameContext: GameContextForAgent,
  approachType: string,
  approachContext: string,
): Promise<OverhearResult> {
  try {
    const res = await fetch(`${SERVER_URL}/api/approach`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walker, gameContext, approachType, approachContext }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok || !res.body) {
      return { text: '', error: `Server responded with ${res.status}` };
    }

    // Read SSE stream, collect full text from done event
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      let currentEvent = '';
      let currentData = '';

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith('data: ')) {
          currentData = line.slice(6).trim();
        } else if (line === '' && currentEvent && currentData) {
          try {
            const parsed = JSON.parse(currentData);
            if (currentEvent === 'done') fullText = parsed.text;
            else if (currentEvent === 'error') return { text: '', error: parsed.error };
          } catch { /* ignore parse errors */ }
          currentEvent = '';
          currentData = '';
        }
      }
    }

    return { text: fullText };
  } catch (err: any) {
    return { text: '', error: err.message || 'Approach request failed' };
  }
}

export async function isServerAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${SERVER_URL}/api/health`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function* sendMessage(
  walkerId: number,
  message: string,
  walker: WalkerProfile,
  gameContext: GameContextForAgent
): AsyncGenerator<StreamEvent> {
  const res = await fetch(`${SERVER_URL}/api/chat/${walkerId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, walker, gameContext }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok || !res.body) {
    yield { type: 'error', error: `Server responded with ${res.status}` };
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Parse SSE events from buffer
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep incomplete line in buffer

    let currentEvent = '';
    let currentData = '';

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        currentEvent = line.slice(7).trim();
      } else if (line.startsWith('data: ')) {
        currentData = line.slice(6).trim();
      } else if (line === '' && currentEvent && currentData) {
        // Empty line = end of event
        try {
          const parsed = JSON.parse(currentData);
          switch (currentEvent) {
            case 'token':
              yield { type: 'token', text: parsed.text };
              break;
            case 'effect':
              yield {
                type: 'effect',
                effectType: parsed.type,
                walkerId: parsed.walkerId,
                delta: parsed.delta,
                key: parsed.key,
                value: parsed.value,
                text: parsed.text,
              };
              break;
            case 'done':
              yield { type: 'done', text: parsed.text };
              break;
            case 'error':
              yield { type: 'error', error: parsed.error };
              break;
          }
        } catch (e) {
          console.error('[AgentClient] Failed to parse SSE data:', currentData, e);
        }
        currentEvent = '';
        currentData = '';
      }
    }
  }
}
