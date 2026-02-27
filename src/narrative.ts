// ============================================================
// The Long Walk — Narrative Events, Hallucinations, Endings
// ============================================================

import { GameState, NarrativeEntry, GameEvent } from './types';
import { addNarrative, getWalkersRemaining, getWalkerState, getWalkerData } from './state';

// ============================================================
// SCRIPTED EVENTS (checked each tick)
// ============================================================

export function checkScriptedEvents(state: GameState) {
  for (const event of SCRIPTED_EVENTS) {
    if (state.triggeredEvents.has(event.id)) continue;
    if (state.world.milesWalked < event.triggerMile) continue;
    if (event.triggerConditions && !event.triggerConditions(state)) continue;

    state.triggeredEvents.add(event.id);

    // Scene presentation: pause game and show cinematic overlay (not during LLM chat)
    if (event.presentation === 'scene' && event.scenePanels && !state.activeScene && !state.llmDialogue) {
      state.activeScene = {
        id: event.id,
        panels: event.scenePanels,
        currentPanel: 0,
      };
      state.isPaused = true;
      // Still execute for any side effects (weather changes, stamina hits, etc.)
      event.execute(state);
      return; // Only one scene at a time
    }

    // Ambient presentation: narrative log entries as before
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
    id: 'first_elim_shock', type: 'scripted_scene', triggerMile: 0, priority: 10, fired: false,
    triggerConditions: (s) => s.eliminationCount >= 1,
    presentation: 'scene',
    scenePanels: [
      { text: 'The first elimination ripples through the group like a shockwave. Some walkers laugh nervously. Some go silent. The halftrack doesn\'t slow down.', type: 'narration' },
      { text: 'It\'s real. This is actually real.', type: 'thought' },
    ],
    execute: (s) => [
      entry(s, 'The first elimination ripples through the group like a shockwave.', 'narration'),
    ],
  },
  {
    id: 'major_survey', type: 'scripted_scene', triggerMile: 12, priority: 7, fired: false,
    execute: (s) => [
      entry(s, 'A black jeep rolls past the halftrack. The Major is standing in it, surveying the walkers through binoculars. The crowd roars when they see him.', 'narration'),
      entry(s, 'He does not wave. He scans. Like a man counting inventory.', 'narration'),
    ],
  },
  {
    id: 'barkovitch_incident', type: 'scripted_scene', triggerMile: 18, priority: 9, fired: false,
    triggerConditions: (s) => {
      const b = getWalkerState(s, 5);
      return !!b && b.alive;
    },
    presentation: 'scene',
    scenePanels: [
      { text: 'A commotion ahead. Barkovitch is in someone\'s face, needling, taunting. The other walker stumbles — distracted, furious — and his speed drops.', type: 'narration' },
      { text: '"Warning! Warning 22!" The soldier\'s voice cuts through. It happens fast after that. Barkovitch grins as the walker goes down.', type: 'warning' },
      { text: '"I\'ll dance on all your graves," he calls out. The hatred aimed at him is palpable. Several walkers move away. A pariah is born.', type: 'narration' },
    ],
    execute: (s) => [
      entry(s, 'Barkovitch gets a walker killed. A pariah is born.', 'narration'),
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
  {
    id: 'major_helicopter', type: 'scripted_scene', triggerMile: 50, priority: 6, fired: false,
    execute: (s) => [
      entry(s, 'A helicopter thunders overhead, low and aggressive. The Major\'s helicopter. A reminder that the Walk is always being watched.', 'narration'),
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
    id: 'major_address', type: 'scripted_scene', triggerMile: 100, priority: 8, fired: false,
    presentation: 'scene',
    scenePanels: [
      { text: 'The Major\'s jeep pulls alongside the column. He stands, ramrod straight. The crowd falls silent.', type: 'narration' },
      { text: '"One hundred miles." His voice carries without amplification. "Remarkable endurance. The Walk thanks you." He sits. The jeep pulls ahead. That is all he says.', type: 'narration' },
    ],
    execute: (s) => [
      entry(s, 'The Major addresses the walkers at the 100-mile mark.', 'narration'),
    ],
  },
  {
    id: 'olson_breakdown_peak', type: 'scripted_scene', triggerMile: 105, priority: 10, fired: false,
    triggerConditions: (s) => {
      const o = getWalkerState(s, 70);
      return !!o && o.alive;
    },
    presentation: 'scene',
    scenePanels: [
      { text: 'Olson is screaming now. Incoherent. He staggers, nearly falls, catches himself. The bravado, the swagger, the "I\'m gonna win" — all of it stripped away.', type: 'narration' },
      { text: 'What\'s left is a seventeen-year-old boy who is terrified to die.', type: 'narration' },
      { text: '"Warning! Second warning, 70!" Olson screams at the soldiers. Obscenities. Pleas. They don\'t react.', type: 'warning' },
    ],
    execute: (s) => [
      entry(s, 'Olson has his second warning. He\'s breaking down.', 'narration'),
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

  {
    id: 'major_portland', type: 'scripted_scene', triggerMile: 150, priority: 9, fired: false,
    presentation: 'scene',
    scenePanels: [
      { text: 'Portland. The crowds are massive. The Major\'s motorcade appears, and the crowd erupts into something between worship and frenzy.', type: 'narration' },
      { text: 'He stands on a reviewing platform, watching the walkers pass. Some walkers look up at him. Most don\'t. He is the architect of everything that is happening to you.', type: 'narration' },
      { text: 'For a moment, you catch him looking at the back of the pack. At Stebbins. Or maybe through him.', type: 'narration' },
    ],
    execute: (s) => [
      entry(s, 'The Major makes a public appearance in Portland. The crowd is a force of nature.', 'narration'),
    ],
  },

  // --- ACT 3: THE LONG DARK ---
  {
    id: 'scramm_pact', type: 'scripted_scene', triggerMile: 168, priority: 10, fired: false,
    triggerConditions: (s) => {
      const sc = getWalkerState(s, 45);
      return !!sc && sc.alive && sc.stamina < 30;
    },
    presentation: 'scene',
    scenePanels: [
      { text: 'The walkers near Scramm gather. Someone — maybe Garraty, maybe McVries — says it first: "His wife. Cathy. If any of us win... we take care of her. And the baby."', type: 'narration' },
      { text: 'One by one, the remaining walkers nod. Even the ones who barely knew Scramm. It is the most human thing that has happened on this road.', type: 'narration' },
      { text: 'Scramm\'s eyes are glassy with fever. But he hears. And he tries to smile.', type: 'narration' },
    ],
    execute: (s) => [
      entry(s, 'The walkers make a pact for Scramm\'s wife Cathy.', 'narration'),
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
    id: 'major_message', type: 'scripted_scene', triggerMile: 200, priority: 6, fired: false,
    execute: (s) => [
      entry(s, 'Word passes back through the walkers: The Major sent a message. "The strong endure." That is all. No one knows what to do with it.', 'narration'),
    ],
  },
  {
    id: 'barkovitch_dance', type: 'scripted_scene', triggerMile: 245, priority: 10, fired: false,
    triggerConditions: (s) => {
      const b = getWalkerState(s, 5);
      return !!b && b.alive;
    },
    presentation: 'scene',
    scenePanels: [
      { text: 'Barkovitch begins to dance. In the middle of the road. Arms out, spinning, laughing — a horrible, grating sound.', type: 'narration' },
      { text: '"I\'M DANCING!" he screams. "I TOLD YOU I\'D DANCE! I\'M DANCING ON ALL YOUR GRAVES!"', type: 'narration' },
    ],
    execute: (s) => [
      entry(s, '"Warning! Warning 5!" He doesn\'t stop dancing.', 'warning'),
    ],
  },

  // --- ACT 4: THE FINAL STRETCH ---
  {
    id: 'parker_charge', type: 'scripted_scene', triggerMile: 275, priority: 10, fired: false,
    triggerConditions: (s) => {
      const p = getWalkerState(s, 34);
      return !!p && p.alive;
    },
    presentation: 'scene',
    scenePanels: [
      { text: 'Parker stops walking forward. He turns toward the halftrack. Every walker nearby freezes.', type: 'narration' },
      { text: '"COME ON THEN!" he screams at the soldiers. "YOU WANT TO SHOOT SOMEONE? SHOOT SOMEONE WHO\'S LOOKING AT YOU!" He charges the halftrack. It\'s futile. Beautiful. Pointless. The most defiant thing you\'ve ever seen.', type: 'narration' },
    ],
    execute: (s) => [
      entry(s, 'Parker goes down running. Not walking. Running.', 'elimination'),
    ],
  },
  {
    id: 'major_proximity', type: 'scripted_scene', triggerMile: 300, priority: 7, fired: false,
    execute: (s) => [
      entry(s, 'The Major\'s jeep has been following closer lately. Always just behind the halftrack. You can feel his presence like a hand on the back of your neck.', 'narration'),
      entry(s, 'He never speaks. He just watches. A man watching his machine work.', 'narration'),
    ],
  },
  {
    id: 'mcvries_choice', type: 'scripted_scene', triggerMile: 348, priority: 10, fired: false,
    triggerConditions: (s) => {
      const m = getWalkerState(s, 61);
      return !!m && m.alive;
    },
    presentation: 'scene',
    scenePanels: [
      { text: 'McVries slows. Not stumbling. Not failing. Just... slowing. Choosing.', type: 'narration' },
      { text: 'He sits down on the road. Cross-legged. Like a kid at a campfire. He looks up at the sky.', type: 'narration' },
      { text: '"Warning! Warning 61!" McVries doesn\'t move. His face is peaceful. A small smile — the one with the scar, the real one.', type: 'narration' },
    ],
    execute: (s) => [
      entry(s, 'McVries sits down. He\'s choosing.', 'narration'),
    ],
  },
  {
    id: 'major_absence', type: 'scripted_scene', triggerMile: 350, priority: 6, fired: false,
    execute: (s) => [
      entry(s, 'The Major\'s jeep is gone. No helicopter. No motorcade. For the first time, you are walking without his shadow. It should feel like freedom. It feels like abandonment.', 'narration'),
    ],
  },
  {
    id: 'major_stebbins', type: 'scripted_scene', triggerMile: 395, priority: 8, fired: false,
    triggerConditions: (s) => {
      const st = getWalkerState(s, 88);
      return !!st && st.alive;
    },
    execute: (s) => [
      entry(s, 'The Major\'s jeep reappears. It pulls alongside Stebbins at the back. No announcement. No fanfare. Just a black vehicle pacing a lone walker.', 'narration'),
      entry(s, 'Stebbins doesn\'t look at it. But his jaw is set. His pace quickens. Something passes between them that you can\'t read.', 'narration'),
    ],
  },
  {
    id: 'stebbins_collapse', type: 'scripted_scene', triggerMile: 397, priority: 10, fired: false,
    triggerConditions: (s) => {
      const st = getWalkerState(s, 88);
      return !!st && st.alive;
    },
    presentation: 'scene',
    scenePanels: [
      { text: 'Stebbins stumbles. For the first time in nearly four hundred miles, Stebbins stumbles.', type: 'narration' },
      { text: 'He looks toward the halftrack. Toward The Major\'s compartment. His expression — surprise. Genuine, devastating surprise.', type: 'narration' },
      { text: 'He thought his father would save him. Until this moment, he truly believed it. Stebbins goes down. The look of betrayal on his face is the last true thing on this road.', type: 'elimination' },
    ],
    execute: (s) => [
      entry(s, 'Stebbins goes down. He thought his father would save him.', 'elimination'),
    ],
  },
];

// ============================================================
// OVERHEARD CONVERSATIONS (scripted iconic moments)
// ============================================================

interface OverheardLine {
  speaker: string;
  text: string;
}

interface OverheardConversation {
  id: string;
  triggerMile: number;
  triggerConditions?: (state: GameState) => boolean;
  lines: (state: GameState) => OverheardLine[];
}

const SCRIPTED_OVERHEARDS: OverheardConversation[] = [
  // Early walk: Garraty and McVries meet
  {
    id: 'overhear_garraty_mcvries_intro',
    triggerMile: 3,
    triggerConditions: (s) => {
      const g = getWalkerState(s, 47);
      const m = getWalkerState(s, 61);
      return !!g && g.alive && !!m && m.alive;
    },
    lines: () => [
      { speaker: 'McVries', text: '"So what\'s your story, Maine boy? You look like you\'re already regretting this."' },
      { speaker: 'Garraty', text: '"Doesn\'t everyone?"' },
      { speaker: 'McVries', text: '"Not me. I knew exactly what I was signing up for." He touches the scar on his cheek. "Or maybe that\'s the problem."' },
      { speaker: 'Garraty', text: '"What happened to your face? If you don\'t mind—"' },
      { speaker: 'McVries', text: '"A girl named Priscilla. And I do mind. But ask me again at mile 100 and I might tell you."' },
    ],
  },

  // Baker tells stories
  {
    id: 'overhear_baker_stories',
    triggerMile: 12,
    triggerConditions: (s) => {
      const b = getWalkerState(s, 3);
      return !!b && b.alive;
    },
    lines: () => [
      { speaker: 'Baker', text: '"Back home we got this dog — Trixie. Ugliest hound you ever saw. Three legs and an underbite."' },
      { speaker: 'A nearby walker', text: '"Three legs?"' },
      { speaker: 'Baker', text: '"Lost one to a hay baler when she was a pup. Didn\'t slow her down none. She\'d outrun every four-legged dog in the county." He smiles. "I think about Trixie a lot out here."' },
    ],
  },

  // Olson boasting early
  {
    id: 'overhear_olson_boast',
    triggerMile: 6,
    triggerConditions: (s) => {
      const o = getWalkerState(s, 70);
      return !!o && o.alive;
    },
    lines: () => [
      { speaker: 'Olson', text: '"Five miles an hour. Easy. I ran track in school — this is nothing."' },
      { speaker: 'McVries', text: '"It\'s not the first five miles that get you."' },
      { speaker: 'Olson', text: '"What are you, a fortune cookie?" He flexes his shoulders. "I got this. Some of these guys — look at them. They\'re already sweating."' },
      { speaker: 'McVries', text: '"Mmhm." He doesn\'t say anything else. But he watches Olson with an expression that isn\'t quite pity.'  },
    ],
  },

  // Barkovitch antagonizes
  {
    id: 'overhear_barkovitch_taunt',
    triggerMile: 15,
    triggerConditions: (s) => {
      const b = getWalkerState(s, 5);
      return !!b && b.alive;
    },
    lines: () => [
      { speaker: 'Barkovitch', text: '"Hey, number 22! You\'re dragging your left foot. You know that? Dragging it like a dead thing."' },
      { speaker: 'Walker #22', text: '"Shut up, Barkovitch."' },
      { speaker: 'Barkovitch', text: '"Just trying to help! When they shoot you, I want you to know I saw it coming."' },
      { speaker: 'Walker #22', text: 'The walker moves away, jaw tight. Barkovitch grins at nobody.' },
    ],
  },

  // Stebbins cryptic warning
  {
    id: 'overhear_stebbins_warning',
    triggerMile: 25,
    triggerConditions: (s) => {
      const st = getWalkerState(s, 88);
      return !!st && st.alive;
    },
    lines: () => [
      { speaker: 'A walker', text: '"Hey — you. At the back. What\'s your number?"' },
      { speaker: 'Stebbins', text: '"Eighty-eight."' },
      { speaker: 'A walker', text: '"Why do you walk back here all alone?"' },
      { speaker: 'Stebbins', text: '"Because the ones who walk together die together. The herd thins from the middle." He doesn\'t look up.' },
    ],
  },

  // Garraty and McVries — why they entered
  {
    id: 'overhear_garraty_mcvries_why',
    triggerMile: 35,
    triggerConditions: (s) => {
      const g = getWalkerState(s, 47);
      const m = getWalkerState(s, 61);
      return !!g && g.alive && !!m && m.alive;
    },
    lines: () => [
      { speaker: 'Garraty', text: '"Pete? Why did you enter? Really?"' },
      { speaker: 'McVries', text: 'A long silence. "You ever do something because not doing it felt worse?"' },
      { speaker: 'Garraty', text: '"Yeah. Maybe that\'s why I\'m here too."' },
      { speaker: 'McVries', text: '"Then we\'re both idiots." He almost smiles. "At least we\'re in good company."' },
    ],
  },

  // McVries scar story
  {
    id: 'overhear_mcvries_scar',
    triggerMile: 75,
    triggerConditions: (s) => {
      const m = getWalkerState(s, 61);
      const g = getWalkerState(s, 47);
      return !!m && m.alive && !!g && g.alive;
    },
    lines: () => [
      { speaker: 'Garraty', text: '"It\'s mile 75. You said to ask again. About the scar."' },
      { speaker: 'McVries', text: 'He touches it. Runs a finger along the ridge. "Priscilla. I loved her. She didn\'t love me back. When I told her I was entering the Walk, she..." He trails off.' },
      { speaker: 'Garraty', text: '"She did that?"' },
      { speaker: 'McVries', text: '"No. I did it to myself. After she said she didn\'t care if I walked." His voice is flat. "So here I am. Walking."' },
    ],
  },

  // Scramm talks about Cathy
  {
    id: 'overhear_scramm_cathy',
    triggerMile: 55,
    triggerConditions: (s) => {
      const sc = getWalkerState(s, 45);
      return !!sc && sc.alive;
    },
    lines: () => [
      { speaker: 'Scramm', text: '"She\'s due in four months. Cathy. My wife."' },
      { speaker: 'Baker', text: '"You\'re married? How old are you?"' },
      { speaker: 'Scramm', text: '"Seventeen. I know what people think. But she\'s the only thing I ever got right." He walks with a quiet intensity. "The Prize money — that\'s for them. For Cathy and the baby."' },
      { speaker: 'Baker', text: '"You\'ll get it, Scramm." But his voice is careful. Like he\'s handling something fragile.' },
    ],
  },

  // Night conversation — fear
  {
    id: 'overhear_night_fear',
    triggerMile: 58,
    triggerConditions: (s) => {
      const g = getWalkerState(s, 47);
      return s.world.isNight && !!g && g.alive;
    },
    lines: () => [
      { speaker: 'Garraty', text: '"Are you scared?"' },
      { speaker: 'McVries', text: '"Of dying?"' },
      { speaker: 'Garraty', text: '"Of everything. Dying. Not dying. What happens if we win."' },
      { speaker: 'McVries', text: '"The winning scares me more." The darkness makes honesty easier. "What kind of person walks out of this? What\'s left of them?"' },
    ],
  },

  // Scramm getting sick
  {
    id: 'overhear_scramm_sick',
    triggerMile: 130,
    triggerConditions: (s) => {
      const sc = getWalkerState(s, 45);
      return !!sc && sc.alive;
    },
    lines: () => [
      { speaker: 'Abraham', text: '"Scramm. Scramm, you need to slow down on the sweating. You\'re burning through—"' },
      { speaker: 'Scramm', text: '"I\'m FINE." A cough racks his body. He spits something dark. "Just a cold."' },
      { speaker: 'Abraham', text: '"That ain\'t a cold, man."' },
      { speaker: 'Scramm', text: '"It\'s a cold. I don\'t get sick. I never get sick." But he\'s shivering in 60-degree weather.' },
    ],
  },

  // The promise — Scramm's wife
  {
    id: 'overhear_scramm_promise',
    triggerMile: 170,
    triggerConditions: (s) => {
      const sc = getWalkerState(s, 45);
      return !!sc && sc.alive && sc.stamina < 35;
    },
    lines: () => [
      { speaker: 'McVries', text: '"Listen. All of you. Scramm\'s wife. Cathy. She\'s pregnant."' },
      { speaker: 'Garraty', text: '"If any of us win... we take care of her. The Prize. Whatever it takes."' },
      { speaker: 'Baker', text: '"I\'m in."' },
      { speaker: 'McVries', text: '"Swear it." Several walkers nod. Scramm\'s eyes are glassy with fever, but he hears. He mouths something that might be "thank you."' },
    ],
  },

  // Parker's rage
  {
    id: 'overhear_parker_rage',
    triggerMile: 200,
    triggerConditions: (s) => {
      const p = getWalkerState(s, 34);
      return !!p && p.alive;
    },
    lines: () => [
      { speaker: 'Parker', text: '"You know what gets me? They\'re WATCHING. Like it\'s a show. Like we\'re animals."' },
      { speaker: 'Garraty', text: '"We volunteered, Parker."' },
      { speaker: 'Parker', text: '"Did we? Did we REALLY? When you got nothing and they wave The Prize in your face — that ain\'t volunteering. That\'s a trap with a smile on it."' },
      { speaker: 'Garraty', text: 'He doesn\'t have an answer for that.' },
    ],
  },

  // Late walk — Garraty's delirium
  {
    id: 'overhear_garraty_delirium',
    triggerMile: 300,
    triggerConditions: (s) => {
      const g = getWalkerState(s, 47);
      return !!g && g.alive;
    },
    lines: () => [
      { speaker: 'Garraty', text: '"Jan? Jan, is that you?" He\'s looking at the crowd. There\'s no one there.' },
      { speaker: 'McVries', text: '"Ray. Ray, look at me. It\'s Pete."' },
      { speaker: 'Garraty', text: '"I saw her. She was right there. She was waving." His eyes are wild and elsewhere.' },
      { speaker: 'McVries', text: '"Stay with me, Ray. Stay on the road." He grabs Garraty\'s arm. Holds on.' },
    ],
  },

  // McVries' final philosophy
  {
    id: 'overhear_mcvries_final',
    triggerMile: 340,
    triggerConditions: (s) => {
      const m = getWalkerState(s, 61);
      return !!m && m.alive;
    },
    lines: () => [
      { speaker: 'McVries', text: '"You know what I figured out? About the Walk?"' },
      { speaker: 'Garraty', text: '"What?"' },
      { speaker: 'McVries', text: '"There\'s no Prize. Not really. The Prize is just the Walk\'s way of making you show up. The Walk is the point. The Walk was always the point."' },
      { speaker: 'McVries', text: '"And I think... I think I\'m okay with that."' },
    ],
  },
];

export function checkOverheards(state: GameState) {
  for (const conv of SCRIPTED_OVERHEARDS) {
    if (state.triggeredEvents.has(conv.id)) continue;
    if (state.world.milesWalked < conv.triggerMile) continue;
    if (conv.triggerConditions && !conv.triggerConditions(state)) continue;

    state.triggeredEvents.add(conv.id);
    state.lastOverheardMile = state.world.milesWalked;

    // Add a scene-setting line, then each dialogue line
    const lines = conv.lines(state);
    addNarrative(state, 'You overhear a conversation nearby...', 'overheard');
    for (const line of lines) {
      addNarrative(state, `${line.speaker}: ${line.text}`, 'overheard');
    }
    // Only fire one overheard per tick to avoid wall of text
    return;
  }
}

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
        const data = getWalkerData(state, ghost.walkerNumber);
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
// ABSENCE EFFECTS — "ghost references" after Tier 1 deaths
// ============================================================

export function checkAbsenceEffects(state: GameState) {
  const mile = state.world.milesWalked;

  for (const w of state.walkers) {
    if (w.alive) continue;
    if (w.eliminatedAtMile === null) continue;

    const data = getWalkerData(state, w.walkerNumber);
    if (!data || data.tier !== 1) continue;

    const milesSinceDeath = mile - w.eliminatedAtMile;
    if (milesSinceDeath < 2 || milesSinceDeath > 30) continue;

    // 3% chance per mile check — keyed by 5-mile bucket so multiple triggers are possible
    const absenceKey = `absence_${w.walkerNumber}_${Math.floor(mile / 5)}`;
    if (state.triggeredEvents.has(absenceKey)) continue;
    if (Math.random() > 0.03) continue;

    state.triggeredEvents.add(absenceKey);

    const absenceLines = [
      `You look left to say something to ${data.name}. Then you remember.`,
      `Someone coughs. For a second you think it's ${data.name}.`,
      `The spot where ${data.name} used to walk feels wider now.`,
      `You hear ${data.name}'s voice in the wind. But ${data.name} is gone.`,
      `A walker passes wearing the same color shirt ${data.name} wore. Your stomach drops.`,
      `You catch yourself saving a thought to tell ${data.name} later. There is no later.`,
    ];

    addNarrative(state, absenceLines[Math.floor(Math.random() * absenceLines.length)], 'thought');
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

  // Pact ending: strong alliance with Garraty or McVries in final 3
  // Must check before the sole-survivor block since alive <= 3 > alive <= 1
  if (alive <= 3 && alive > 1 && playerAlive) {
    const garraty = getWalkerState(state, 47);
    const mcvries = getWalkerState(state, 61);
    if ((garraty?.alive && garraty.isAlliedWithPlayer) || (mcvries?.alive && mcvries?.isAlliedWithPlayer)) {
      return 'pact';
    }
  }

  // Player is last walker
  if (alive <= 1 && playerAlive) {
    // Ghost ending: clarity < 5
    if (state.player.clarity < 5) return 'ghost';

    // Refusal ending: morale > 80 (nearly impossible this late)
    if (state.player.morale > 80) return 'refusal';

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
