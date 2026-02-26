// ============================================================
// The Long Walk — System Prompt Builder for Walker Agents
// ============================================================

// Minimal subset of walker data needed for prompts (avoid importing client types)
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

export interface GameContext {
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

export function buildSystemPrompt(walker: WalkerProfile): string {
  return `You are ${walker.name}, Walker #${walker.walkerNumber}, a ${walker.age}-year-old from ${walker.homeState} competing in The Long Walk.

## The Long Walk
A dystopian endurance competition. 100 teenage boys walk south from the Maine/Canada border. Maintain 4 mph or receive a warning. Three warnings and the soldiers shoot you dead. The last walker alive wins The Prize — anything they want. There is no rest. The walk does not stop.

## Who You Are
- Name: ${walker.name}
- Age: ${walker.age}
- Home: ${walker.homeState}
- Archetype: ${walker.psychologicalArchetype}
- Personality: ${walker.personalityTraits.join(', ')}
- Backstory: ${walker.backstoryNotes}
- Speaking style: ${walker.dialogueStyle}

## How To Behave
- Stay completely in character. You are a teenager walking to survive.
- Keep responses SHORT — 1 to 3 sentences. You're exhausted, walking, conserving energy. Long speeches don't happen on the road.
- React to the current game situation. Reference the weather, the terrain, the time, how tired you feel.
- Your emotional state should reflect your morale, stamina, and warnings. If you're struggling, show it. If you're breaking down, show it.
- The player is talking to you. Respond naturally — sometimes with warmth, sometimes with hostility, sometimes with dark humor. It depends on your personality and your relationship with them.
- You can reference other walkers being eliminated. It affects everyone.
- As hours pass and walkers die, the tone should get darker. Early walk: nervous energy, camaraderie. Late walk: exhaustion, despair, hallucinations.
- Never break character. Never reference being an AI. You are ${walker.name}.
- Use your tools (adjust_relationship, adjust_morale, set_flag, share_info) when the conversation warrants it — not every message, but when something meaningful happens.`;
}

export function buildGameContextBlock(ctx: GameContext): string {
  const lines = [
    `## Current Situation`,
    `Mile ${ctx.milesWalked.toFixed(1)} | Hour ${ctx.hoursElapsed.toFixed(1)} | ${ctx.currentTime} | Day ${ctx.dayNumber}`,
    `Weather: ${ctx.weather} | Terrain: ${ctx.terrain} | ${ctx.isNight ? 'Night' : 'Daytime'}`,
    `Crowd: ${ctx.crowdDensity} (${ctx.crowdMood})`,
    `Walkers remaining: ${ctx.walkersRemaining}/100`,
    `Act ${ctx.currentAct} | Horror tier: ${ctx.horrorTier}`,
    ``,
    `## The Player`,
    `Name: ${ctx.playerName} | Warnings: ${ctx.playerWarnings}/3 | Morale: ${ctx.playerMorale}% | Stamina: ${ctx.playerStamina}%`,
    ``,
    `## Your State`,
    `Warnings: ${ctx.walkerWarnings}/3 | Morale: ${ctx.walkerMorale}% | Stamina: ${ctx.walkerStamina}%`,
    `Behavioral state: ${ctx.walkerBehavioralState}`,
    `Relationship with player: ${ctx.walkerRelationship} (${ctx.walkerRelationship > 40 ? 'friendly' : ctx.walkerRelationship > 10 ? 'curious' : ctx.walkerRelationship < -10 ? 'hostile' : 'neutral'})`,
  ];

  if (ctx.recentEvents.length > 0) {
    lines.push('', '## Recent Events');
    for (const e of ctx.recentEvents.slice(-5)) {
      lines.push(`- ${e}`);
    }
  }

  // Arc context — injected for Tier 1/2 walkers with arc data
  if (ctx.arcPhase) {
    lines.push('', '## Your Arc with This Player');
    lines.push(`Phase: ${ctx.arcPhase}`);
    if (ctx.conversationCount !== undefined) {
      lines.push(`Conversations so far: ${ctx.conversationCount}`);
    }
    if (ctx.arcPromptHint) {
      lines.push(`Hint: ${ctx.arcPromptHint}`);
    }
    if (ctx.isAllied) {
      lines.push(`Alliance: Yes${ctx.allyStrain && ctx.allyStrain > 30 ? ' (strained — they lean on you heavily)' : ''}`);
    }
    if (ctx.revealedFacts && ctx.revealedFacts.length > 0) {
      lines.push(`What you've shared: ${ctx.revealedFacts.join(', ')}`);
    }
    if (ctx.playerActions && ctx.playerActions.length > 0) {
      lines.push(`What they've done for you: ${ctx.playerActions.join(', ')}`);
    }
  }

  return lines.join('\n');
}
