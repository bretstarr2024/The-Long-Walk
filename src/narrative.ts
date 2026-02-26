// ============================================================
// The Long Walk — Narrative Events, Hallucinations, Endings
// ============================================================

import { GameState, NarrativeEntry, GameEvent } from './types';
import { addNarrative, getWalkersRemaining, getWalkerState } from './state';

// ============================================================
// SCRIPTED EVENTS (checked each tick)
// ============================================================

export function checkScriptedEvents(state: GameState) {
  for (const event of SCRIPTED_EVENTS) {
    if (state.triggeredEvents.has(event.id)) continue;
    if (state.world.milesWalked < event.triggerMile) continue;
    if (event.triggerConditions && !event.triggerConditions(state)) continue;

    state.triggeredEvents.add(event.id);
    const entries = event.execute(state);
    for (const e of entries) {
      state.narrativeLog.push(e);
    }
  }
}

function entry(state: GameState, text: string, type: import('./types').NarrativeType): NarrativeEntry {
  return { mile: state.world.milesWalked, hour: state.world.hoursElapsed, text, type };
}

const SCRIPTED_EVENTS: GameEvent[] = [
  // --- ACT 1: THE STARTING LINE ---
  {
    id: 'first_steps', type: 'scripted_scene', triggerMile: 0.5, priority: 10, fired: false,
    execute: (s) => [
      entry(s, 'The road stretches south. One hundred walkers. The halftrack rumbles behind you like a mechanical heartbeat.', 'narration'),
      entry(s, 'The crowd along the starting line cheers. Signs wave. Someone shouts a walker\'s number.', 'crowd'),
      entry(s, 'Your legs feel strong. Fresh. That will change.', 'thought'),
    ],
  },
  {
    id: 'first_elim_shock', type: 'scripted_scene', triggerMile: 8, priority: 10, fired: false,
    triggerConditions: (s) => s.eliminationCount >= 1,
    execute: (s) => [
      entry(s, 'The first elimination ripples through the group like a shockwave. Some walkers laugh nervously. Some go silent. The halftrack doesn\'t slow down.', 'narration'),
      entry(s, 'It\'s real. This is actually real.', 'thought'),
    ],
  },
  {
    id: 'barkovitch_incident', type: 'scripted_scene', triggerMile: 18, priority: 9, fired: false,
    triggerConditions: (s) => {
      const b = getWalkerState(s, 5);
      return !!b && b.alive;
    },
    execute: (s) => [
      entry(s, 'A commotion ahead. Barkovitch is in someone\'s face, needling, taunting. The other walker stumbles — distracted, furious — and his speed drops.', 'narration'),
      entry(s, '"Warning. Walker #—" The soldier\'s voice cuts through.', 'narration'),
      entry(s, 'It happens fast after that. Barkovitch grins as the walker goes down. "I\'ll dance on all your graves," he calls out. The hatred aimed at him is palpable.', 'narration'),
      entry(s, 'Several walkers move away from Barkovitch. A pariah is born.', 'narration'),
    ],
  },
  {
    id: 'first_night', type: 'scripted_scene', triggerMile: 50, priority: 8, fired: false,
    triggerConditions: (s) => s.world.isNight,
    execute: (s) => [
      entry(s, 'Night falls. The temperature drops. The road ahead disappears into darkness, lit only by the halftrack\'s headlights.', 'narration'),
      entry(s, 'The crowd thins. A few spectators remain, holding lanterns. Their faces are orange and strange in the flickering light.', 'crowd'),
      entry(s, 'Night walking. A different kind of hell. The body screams for sleep that will never come.', 'thought'),
    ],
  },

  // --- ACT 2: THE GRIND ---
  {
    id: 'olson_breakdown_start', type: 'scripted_scene', triggerMile: 90, priority: 10, fired: false,
    triggerConditions: (s) => {
      const o = getWalkerState(s, 70);
      return !!o && o.alive;
    },
    execute: (s) => [
      entry(s, 'Olson is in trouble. Real trouble. He\'s limping badly, his face a rictus of pain and denial. "I\'m fine," he keeps saying. "I\'m FINE." No one believes him.', 'narration'),
      entry(s, 'Other walkers watch from the corners of their eyes. Some with pity. Some with relief that it isn\'t them.', 'narration'),
    ],
  },
  {
    id: 'olson_breakdown_peak', type: 'scripted_scene', triggerMile: 105, priority: 10, fired: false,
    triggerConditions: (s) => {
      const o = getWalkerState(s, 70);
      return !!o && o.alive;
    },
    execute: (s) => [
      entry(s, 'Olson is screaming now. Incoherent. He staggers, nearly falls, catches himself. The bravado, the swagger, the "I\'m gonna win" — all of it stripped away.', 'narration'),
      entry(s, 'What\'s left is a seventeen-year-old boy who is terrified to die.', 'narration'),
      entry(s, '"Warning. Walker #70. Second warning."', 'warning'),
      entry(s, 'Olson screams at the soldiers. Obscenities. Pleas. They don\'t react.', 'narration'),
    ],
  },
  {
    id: 'scramm_rain', type: 'scripted_scene', triggerMile: 105, priority: 9, fired: false,
    execute: (s) => {
      s.world.weather = 'heavy_rain';
      return [
        entry(s, 'The rain starts without warning. Not a drizzle — a downpour. Cold, driving, relentless. The road turns to a river.', 'narration'),
        entry(s, 'Scramm tilts his face to the sky. He doesn\'t seem to mind. He\'s the strongest walker out here. What\'s a little rain?', 'narration'),
      ];
    },
  },
  {
    id: 'scramm_cough', type: 'scripted_scene', triggerMile: 125, priority: 9, fired: false,
    triggerConditions: (s) => {
      const sc = getWalkerState(s, 45);
      return !!sc && sc.alive;
    },
    execute: (s) => {
      const sc = getWalkerState(s, 45);
      if (sc) sc.stamina = Math.min(sc.stamina, 50); // sickness hits
      return [
        entry(s, 'Scramm coughs. It\'s a deep, wet sound that makes nearby walkers flinch. He waves it off. "Just a cold."', 'narration'),
        entry(s, 'But everyone hears it. And everyone knows what a cold becomes on a road with no rest, no shelter, and no end.', 'narration'),
      ];
    },
  },

  // --- ACT 3: THE LONG DARK ---
  {
    id: 'scramm_pact', type: 'scripted_scene', triggerMile: 168, priority: 10, fired: false,
    triggerConditions: (s) => {
      const sc = getWalkerState(s, 45);
      return !!sc && sc.alive && sc.stamina < 30;
    },
    execute: (s) => [
      entry(s, 'The walkers near Scramm gather. Someone — maybe Garraty, maybe McVries — says it first: "His wife. Cathy. If any of us win... we take care of her. And the baby."', 'narration'),
      entry(s, 'One by one, the remaining walkers nod. Even the ones who barely knew Scramm. It is the most human thing that has happened on this road.', 'narration'),
      entry(s, 'Scramm\'s eyes are glassy with fever. But he hears. And he tries to smile.', 'narration'),
    ],
  },
  {
    id: 'sleep_deprivation_onset', type: 'scripted_scene', triggerMile: 100, priority: 7, fired: false,
    triggerConditions: (s) => s.world.hoursElapsed >= 20,
    execute: (s) => [
      entry(s, 'Something is wrong with your eyes. The road shimmers. Faces blur at the edges. You haven\'t slept in... how long?', 'thought'),
      entry(s, 'Your body has entered a new state. Not tired. Beyond tired. A hollow, buzzing unreality.', 'narration'),
    ],
  },
  {
    id: 'barkovitch_dance', type: 'scripted_scene', triggerMile: 245, priority: 10, fired: false,
    triggerConditions: (s) => {
      const b = getWalkerState(s, 5);
      return !!b && b.alive;
    },
    execute: (s) => [
      entry(s, 'Barkovitch begins to dance. In the middle of the road. Arms out, spinning, laughing — a horrible, grating sound.', 'narration'),
      entry(s, '"I\'M DANCING!" he screams. "I TOLD YOU I\'D DANCE! I\'M DANCING ON ALL YOUR GRAVES!"', 'narration'),
      entry(s, 'But there are no graves here. Only the road and the halftrack and the slow certainty. And Barkovitch, dancing, dancing, as his speed drops below four.', 'narration'),
      entry(s, '"Warning. Walker #5."', 'warning'),
      entry(s, 'He doesn\'t stop dancing.', 'narration'),
    ],
  },

  // --- ACT 4: THE FINAL STRETCH ---
  {
    id: 'parker_charge', type: 'scripted_scene', triggerMile: 275, priority: 10, fired: false,
    triggerConditions: (s) => {
      const p = getWalkerState(s, 34);
      return !!p && p.alive;
    },
    execute: (s) => [
      entry(s, 'Parker stops walking forward. He turns toward the halftrack. Every walker nearby freezes.', 'narration'),
      entry(s, '"COME ON THEN!" he screams at the soldiers. "YOU WANT TO SHOOT SOMEONE? SHOOT SOMEONE WHO\'S LOOKING AT YOU!"', 'narration'),
      entry(s, 'He charges the halftrack. It\'s futile. Beautiful. Pointless. The most defiant thing you\'ve ever seen.', 'narration'),
      entry(s, 'Parker goes down running. Not walking. Running.', 'elimination'),
    ],
  },
  {
    id: 'mcvries_choice', type: 'scripted_scene', triggerMile: 348, priority: 10, fired: false,
    triggerConditions: (s) => {
      const m = getWalkerState(s, 61);
      return !!m && m.alive;
    },
    execute: (s) => [
      entry(s, 'McVries slows. Not stumbling. Not failing. Just... slowing. Choosing.', 'narration'),
      entry(s, 'He sits down on the road. Cross-legged. Like a kid at a campfire. He looks up at the sky.', 'narration'),
      entry(s, '"Warning. Walker #61. First warning."', 'warning'),
      entry(s, 'McVries doesn\'t move. His face is peaceful. A small smile — the one with the scar, the real one.', 'narration'),
    ],
  },
  {
    id: 'stebbins_collapse', type: 'scripted_scene', triggerMile: 397, priority: 10, fired: false,
    triggerConditions: (s) => {
      const st = getWalkerState(s, 88);
      return !!st && st.alive;
    },
    execute: (s) => [
      entry(s, 'Stebbins stumbles. For the first time in nearly four hundred miles, Stebbins stumbles.', 'narration'),
      entry(s, 'He looks toward the halftrack. Toward The Major\'s compartment. His expression — surprise. Genuine, devastating surprise.', 'narration'),
      entry(s, 'He thought his father would save him. Until this moment, he truly believed it.', 'narration'),
      entry(s, 'Stebbins goes down. The look of betrayal on his face is the last true thing on this road.', 'elimination'),
    ],
  },
];

// ============================================================
// HALLUCINATION SYSTEM
// ============================================================

export function checkHallucinations(state: GameState) {
  const clarity = state.player.clarity;
  const mile = state.world.milesWalked;

  // The Echo: clarity < 50, mile > 150
  if (clarity < 50 && mile > 150 && !state.triggeredEvents.has('halluc_echo')) {
    if (Math.random() < 0.02) {
      state.triggeredEvents.add('halluc_echo');
      const eliminated = state.walkers.filter(w => !w.alive && w.eliminatedAtMile !== null);
      if (eliminated.length > 0) {
        const ghost = eliminated[Math.floor(Math.random() * eliminated.length)];
        const data = state.walkerData.find(d => d.walkerNumber === ghost.walkerNumber);
        if (data) {
          addNarrative(state, `You see ${data.name} walking beside you. But ${data.name} has been gone since mile ${ghost.eliminatedAtMile?.toFixed(0)}. You blink. They're gone.`, 'hallucination');
        }
      }
    }
  }

  // The Conversation: clarity < 40, mile > 200
  if (clarity < 40 && mile > 200 && !state.triggeredEvents.has('halluc_conversation')) {
    if (Math.random() < 0.015) {
      state.triggeredEvents.add('halluc_conversation');
      addNarrative(state, 'Someone is talking to you. You answer. It\'s a normal conversation. Then you realize the voice belongs to someone who was eliminated fifty miles ago. You stop talking. The voice continues without you.', 'hallucination');
    }
  }

  // The Prize: clarity < 30, mile > 250
  if (clarity < 30 && mile > 250 && !state.triggeredEvents.has('halluc_prize')) {
    if (Math.random() < 0.02) {
      state.triggeredEvents.add('halluc_prize');
      const prize = state.player.prize || 'something you can\'t quite name';
      addNarrative(state, `By the roadside, you see it: ${prize}. Clear as day. Waiting. You reach for it — and your hand passes through air. The vision corrupts, distorts, and dissolves into the road.`, 'hallucination');
    }
  }

  // The Path: clarity < 20, mile > 300
  if (clarity < 20 && mile > 300 && !state.triggeredEvents.has('halluc_path')) {
    if (Math.random() < 0.02) {
      state.triggeredEvents.add('halluc_path');
      addNarrative(state, 'The road splits. One path leads somewhere bright and warm. The other continues into darkness. You choose. It doesn\'t matter. Both lead forward.', 'hallucination');
    }
  }

  // The Mirror: clarity < 10, mile > 350
  if (clarity < 10 && mile > 350 && !state.triggeredEvents.has('halluc_mirror')) {
    if (Math.random() < 0.03) {
      state.triggeredEvents.add('halluc_mirror');
      addNarrative(state, `You see yourself on the roadside. Watching yourself walk past. You make eye contact with yourself. Your other self mouths something you can't hear. Then you're gone. Or they are. You can't tell which one is real.`, 'hallucination');
    }
  }

  // Random procedural hallucinations at low clarity
  if (clarity < 40 && Math.random() < 0.005) {
    const hallucinations = [
      'The road is breathing. You can see it rise and fall.',
      'The halftrack sounds like a voice. It\'s saying your name.',
      'The walker ahead of you has no face.',
      'You hear music. There is no music.',
      'Your feet aren\'t touching the ground. You\'re floating an inch above the road.',
      'The crowd is standing perfectly still. All of them. Watching.',
      'You can taste colors. The road tastes gray.',
    ];
    addNarrative(state, hallucinations[Math.floor(Math.random() * hallucinations.length)], 'hallucination');
  }
}

// ============================================================
// ENDING DETECTION
// ============================================================

export type EndingType = 'hollow_victory' | 'pact' | 'refusal' | 'collapse' | 'ghost' | null;

export function checkEnding(state: GameState): EndingType {
  const alive = getWalkersRemaining(state);
  const playerAlive = state.player.alive;

  if (!playerAlive) return 'collapse';

  // Player is last walker
  if (alive <= 1 && playerAlive) {
    // Ghost ending: clarity < 5
    if (state.player.clarity < 5) return 'ghost';

    // Refusal ending: morale > 80 (nearly impossible this late)
    if (state.player.morale > 80) return 'refusal';

    // Pact ending: strong alliance with Garraty or McVries, both alive in final 5
    const garraty = getWalkerState(state, 47);
    const mcvries = getWalkerState(state, 61);
    if ((garraty?.alive && garraty.isAlliedWithPlayer) || (mcvries?.alive && mcvries?.isAlliedWithPlayer)) {
      if (alive <= 3) return 'pact';
    }

    return 'hollow_victory';
  }

  return null;
}

export function getEndingText(ending: EndingType, state: GameState): { title: string; text: string; isVictory: boolean } {
  const name = state.player.name;
  const miles = state.world.milesWalked.toFixed(1);
  const prize = state.player.prize || 'everything and nothing';

  switch (ending) {
    case 'hollow_victory':
      return {
        title: 'THE PRIZE',
        text: `The crowd erupts. The Major's halftrack pulls alongside. A door opens.\n\nBut you can barely see. Barely hear. Your body moves forward because that is all it knows how to do.\n\nYou won. ${name} won. Walker #100. The Prize is yours: ${prize}.\n\nBut you're still walking. You can't stop. The road stretches on and your legs carry you forward into something — or nothing — and the cheering fades behind you like everything else.\n\nYou feel like you could walk forever. That's the secret. That's the horrible, wonderful secret.`,
        isVictory: true,
      };
    case 'pact':
      return {
        title: 'THE PACT',
        text: `The last two of you walk side by side. Neither speaks. The road is empty.\n\nOne of you — it doesn't matter who — says: "What if we just... keep walking? Together?"\n\nThe halftrack idles. The soldiers wait. The system has no rule for this.\n\nYou walk. Together. Into whatever comes next. The screen goes white.\n\nSomewhere, ${prize} waits. Or it doesn't. The Walk has no answer. Only the road.`,
        isVictory: true,
      };
    case 'refusal':
      return {
        title: 'THE REFUSAL',
        text: `You stop walking. Not from exhaustion. Not from despair.\n\nFrom choice.\n\nYou sit down in the middle of the road. The warnings come. You don't care.\n\n"${prize}," you say to no one. Then you close your eyes.\n\nThe Walk was never about winning. It was about this moment — the moment you decide that endurance is not the same as meaning.\n\nThe crowd falls silent. Somewhere, The Major watches.`,
        isVictory: false,
      };
    case 'collapse':
      return {
        title: 'ELIMINATED',
        text: `Walker #100 — ${name} — Eliminated — Mile ${miles}.\n\nThe Walk continues. The other walkers barely notice. Some do. Most don't.\n\nThe crowd moves on. The halftrack rumbles south. Your story ends here, on a road in Maine, ${miles} miles from where it started.\n\nYou walked ${miles} miles. That is something. That has to be something.`,
        isVictory: false,
      };
    case 'ghost':
      return {
        title: 'THE GHOST',
        text: `You are walking. Or you have stopped walking. You are not sure.\n\nThe road is there. The walkers are there — or they aren't. The crowd is a blur of light and sound and silence all at once.\n\nAre you still alive? The answer used to matter.\n\nYou see ${prize} ahead of you. Behind you. Inside you. It doesn't matter. You are the road now. The road is you.\n\n${name} walks. Or doesn't. The boundary has dissolved. The Walk continues. It always continues.`,
        isVictory: false,
      };
    default:
      return { title: 'THE WALK', text: 'The walk continues.', isVictory: false };
  }
}

export function getGameStats(state: GameState): Record<string, string> {
  return {
    'Miles Walked': state.world.milesWalked.toFixed(1),
    'Hours Survived': state.world.hoursElapsed.toFixed(1),
    'Walkers Outlasted': String(state.eliminationCount),
    'Alliances Formed': String(state.conversationHistory.filter(c => state.player.alliances.includes(c.walkerNumber)).length > 0 ? state.player.alliances.length : 0),
    'Conversations Had': String(state.conversationHistory.length),
    'Warnings Received': String(state.player.warnings),
    'Day': String(state.world.dayNumber),
  };
}
