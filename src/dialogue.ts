// ============================================================
// The Long Walk — Dialogue Engine + All Trees
// ============================================================

import { GameState, DialogueNode, DialogueOption, DialogueInstance, WalkerState } from './types';
import { addNarrative, getWalkerData, getWalkerState, getWalkersRemaining, getNearbyWalkers } from './state';

// ============================================================
// DIALOGUE ENGINE
// ============================================================

export function getAvailableDialogues(state: GameState): DialogueNode[] {
  const nearby = getNearbyWalkers(state);
  const nearbyNums = new Set(nearby.map(w => w.walkerNumber));

  return ALL_DIALOGUE_NODES.filter(node => {
    if (state.triggeredEvents.has('dlg_' + node.id)) return false;
    if (!nearbyNums.has(node.speaker)) return false;

    const w = getWalkerState(state, node.speaker);
    if (!w || !w.alive) return false;

    return evaluateConditions(state, node, w);
  });
}

function evaluateConditions(state: GameState, node: DialogueNode, w: WalkerState): boolean {
  const c = node.conditions;
  const mile = state.world.milesWalked;

  if (c.mileRange && (mile < c.mileRange[0] || mile > c.mileRange[1])) return false;
  if (c.relationshipMin !== undefined && w.relationship < c.relationshipMin) return false;
  if (c.walkerAlive !== undefined) {
    const target = getWalkerState(state, c.walkerAlive);
    if (!target || !target.alive) return false;
  }
  if (c.flagRequired && !state.player.flags[c.flagRequired]) return false;
  if (c.flagAbsent && state.player.flags[c.flagAbsent]) return false;
  if (c.clarityMin !== undefined && state.player.clarity < c.clarityMin) return false;
  if (c.maxWalkersRemaining !== undefined) {
    if (getWalkersRemaining(state) > c.maxWalkersRemaining) return false;
  }
  if (c.playerPosition && state.player.position !== c.playerPosition) return false;
  if (c.playerReason && state.player.reason !== c.playerReason) return false;

  return true;
}

export function startDialogue(state: GameState, nodeId: string): boolean {
  const node = ALL_DIALOGUE_NODES.find(n => n.id === nodeId);
  if (!node) return false;

  const data = getWalkerData(state, node.speaker);
  if (!data) return false;

  // Filter options by requirements
  const options = node.options.filter(opt => {
    if (opt.requires?.playerReason && state.player.reason !== opt.requires.playerReason) return false;
    if (opt.requires?.flag && !state.player.flags[opt.requires.flag]) return false;
    return true;
  });

  state.activeDialogue = {
    walkerNumber: node.speaker,
    walkerName: data.name,
    currentNodeId: node.id,
    text: node.text,
    options,
    turnsTaken: 0,
    maxTurns: 4,
  };

  state.isPaused = true;
  state.triggeredEvents.add('dlg_' + node.id);
  return true;
}

export function selectDialogueOption(state: GameState, optionIndex: number) {
  if (!state.activeDialogue) return;

  const option = state.activeDialogue.options[optionIndex];
  if (!option) return;

  const w = getWalkerState(state, state.activeDialogue.walkerNumber);

  // Add dialogue to narrative
  addNarrative(state, `You: "${option.text}"`, 'dialogue');
  addNarrative(state, option.response, 'dialogue');

  // Apply effects
  if (option.effects) {
    if (option.effects.relationship && w) {
      w.relationship = Math.max(-100, Math.min(100, w.relationship + option.effects.relationship));
    }
    if (option.effects.playerMorale) {
      state.player.morale = Math.max(0, Math.min(100, state.player.morale + option.effects.playerMorale));
    }
    if (option.effects.npcMorale && w) {
      w.morale = Math.max(0, Math.min(100, w.morale + option.effects.npcMorale));
    }
    if (option.effects.setFlag) {
      state.player.flags[option.effects.setFlag] = true;
    }
  }

  // Record conversation
  state.conversationHistory.push({
    walkerNumber: state.activeDialogue.walkerNumber,
    mile: state.world.milesWalked,
    hour: state.world.hoursElapsed,
    nodeId: state.activeDialogue.currentNodeId,
    relationshipChange: option.effects?.relationship || 0,
  });

  // Check for next node or close
  if (option.nextNode) {
    const next = ALL_DIALOGUE_NODES.find(n => n.id === option.nextNode);
    if (next) {
      const data = getWalkerData(state, next.speaker);
      state.activeDialogue.text = next.text;
      state.activeDialogue.options = next.options;
      state.activeDialogue.currentNodeId = next.id;
      state.activeDialogue.turnsTaken++;
      state.triggeredEvents.add('dlg_' + next.id);
      return;
    }
  }

  // Close dialogue
  closeDialogue(state);
}

export function closeDialogue(state: GameState) {
  state.activeDialogue = null;
  state.isPaused = false;
}

// ============================================================
// NPC-INITIATED DIALOGUE CHECK
// ============================================================

export function checkNPCDialogue(state: GameState): string | null {
  // Only trigger every ~5 miles
  const mileKey = Math.floor(state.world.milesWalked / 5);
  if (state.triggeredEvents.has('npc_dlg_check_' + mileKey)) return null;
  state.triggeredEvents.add('npc_dlg_check_' + mileKey);

  const available = getAvailableDialogues(state);
  if (available.length === 0) return null;

  // Pick highest priority
  available.sort((a, b) => {
    const pa = ALL_DIALOGUE_NODES.indexOf(a);
    const pb = ALL_DIALOGUE_NODES.indexOf(b);
    return pa - pb; // earlier in list = higher priority for Tier 1
  });

  return available[0].id;
}

// ============================================================
// CONTEXTUAL AMBIENT LINES (for Talk button with no scripted dialogue)
// ============================================================

export function getContextualLine(state: GameState, w: WalkerState): string {
  const data = getWalkerData(state, w.walkerNumber);
  const mile = state.world.milesWalked;
  const lines: string[] = [];

  if (mile < 20) {
    lines.push('"My feet are fine. It\'s my brain that\'s tired."');
    lines.push('"How far do you think we\'ll get?"');
    lines.push('"Ninety-nine walkers and me. What are the odds?"');
  } else if (mile < 80) {
    lines.push('"My legs feel like they belong to someone else."');
    lines.push('"I\'m running out of things to think about."');
    lines.push('"The road doesn\'t end. It never ends."');
  } else if (mile < 200) {
    lines.push('"I can\'t feel my feet. Is that normal?"');
    lines.push('"Keep talking. If I stop talking, I stop walking."');
    lines.push('"I had a dream. While walking. Is that possible?"');
  } else {
    lines.push('"Walking. Just walking. That\'s all there is."');
    lines.push('"I forgot why I\'m here."');
    lines.push('"Is this still real?"');
  }

  if (w.stamina < 30) {
    lines.push('"I can\'t... just... one more step..."');
    lines.push('"Help me. Please. Stay near me."');
  }
  if (w.warnings >= 2) {
    lines.push('"Two warnings. I can\'t get another one."');
  }
  if (state.world.isNight) {
    lines.push('"The stars don\'t care about us."');
    lines.push('"Nighttime\'s the hardest."');
  }
  if (state.world.weather === 'rain' || state.world.weather === 'heavy_rain') {
    lines.push('"This goddamn rain."');
  }

  return lines[Math.floor(Math.random() * lines.length)];
}

// ============================================================
// ALL DIALOGUE TREES
// ============================================================

const ALL_DIALOGUE_NODES: DialogueNode[] = [
  // ========== GARRATY (#47) ==========
  {
    id: 'garraty_intro', speaker: 47,
    text: '"Hey. Number 100, right? You\'re the one from New Columbia?" He looks you over with open curiosity. "I\'m Garraty. Forty-seven. Maine boy — this is practically my backyard."',
    conditions: { mileRange: [1, 10] },
    options: [
      { text: '"Nice to meet you. Yeah, New Columbia. Long way from home."', response: 'Garraty nods. "Long way from home for all of us. Even me."', effects: { relationship: 5, playerMorale: 3, setFlag: 'garraty_intro_complete' } },
      { text: '"Is everyone going to ask me about New Columbia?"', response: 'Garraty laughs. "Probably. You\'re exotic, kid. Enjoy it while it lasts."', effects: { relationship: 3, setFlag: 'garraty_intro_complete' } },
      { text: '[Keep walking in silence.]', response: 'Garraty shrugs and falls into step nearby, not offended. There\'ll be time to talk. Or there won\'t.', effects: { relationship: -1, setFlag: 'garraty_intro_complete' } },
    ],
  },
  {
    id: 'garraty_why', speaker: 47,
    text: '"So, New Columbia. Why\'d you sign up for this? Long way from home."',
    conditions: { mileRange: [25, 40], relationshipMin: 10, flagRequired: 'garraty_intro_complete' },
    options: [
      { text: '"To prove something. Back home, nobody thought I could make it."', response: '"Yeah." He\'s quiet a moment. "My girlfriend — Jan — she begged me not to. My mom cried. But I had to know." He pauses. "I still don\'t know what I had to know."', effects: { relationship: 5, playerMorale: 2, setFlag: 'told_garraty_reason' }, requires: { playerReason: 'prove' } },
      { text: '"I don\'t really know. Do you?"', response: 'He stares at you for a long moment. "That might be the most honest thing anyone\'s said on this road." His voice drops. "I don\'t think any of us really know."', effects: { relationship: 8, playerMorale: 3, setFlag: 'told_garraty_reason' } },
      { text: '"For someone back home. That\'s all I\'ll say."', response: '"Scramm said something like that. He\'s got a wife. Seventeen and married." He shakes his head. "I hope you both make it far."', effects: { relationship: 3, setFlag: 'told_garraty_reason' }, requires: { playerReason: 'someone' } },
      { text: '[Stay quiet.]', response: 'He nods, accepting the silence. The road stretches on.', effects: { relationship: -2 } },
    ],
  },
  {
    id: 'garraty_night', speaker: 47,
    text: 'The darkness is thick. Garraty walks close, breath visible. "You ever think about what happens to the ones who... after?" His voice is barely a whisper.',
    conditions: { mileRange: [60, 100], relationshipMin: 20, flagRequired: 'garraty_intro_complete' },
    options: [
      { text: '"I try not to."', response: '"Me neither. But I can\'t stop." He swallows. "I keep hearing the sound. You know the sound I mean." He doesn\'t need to say it.', effects: { relationship: 5, playerMorale: -5 } },
      { text: '"Focus on the living. That\'s all we can do."', response: '"McVries said something like that." Garraty almost smiles. "Okay. The living. I\'ll focus on the living."', effects: { relationship: 8, playerMorale: 3 } },
    ],
  },
  {
    id: 'garraty_jan', speaker: 47,
    text: 'Garraty grabs your arm. "There — in the crowd —" His face is white. "It\'s Jan." A girl waves frantically, tears streaming. Garraty raises a hand but doesn\'t wave. He\'s trembling.',
    conditions: { mileRange: [130, 145], relationshipMin: 15 },
    options: [
      { text: '"Go to the edge. Let her see you."', response: 'He drifts toward the crowd, hand outstretched. Their fingers almost touch. Then the soldiers motion him back. She\'s swallowed by the crowd. Garraty walks on, tears cutting tracks through the dust on his face.', effects: { relationship: 15, npcMorale: -30, setFlag: 'garraty_jan_seen' } },
      { text: 'Just walk beside him. Be there.', response: 'No words. Shoulder to shoulder. After a mile of silence: "Thanks for not saying anything." His voice is raw.', effects: { relationship: 20, playerMorale: -5, setFlag: 'garraty_jan_seen' } },
    ],
  },
  {
    id: 'garraty_endgame', speaker: 47,
    text: 'Garraty\'s face is skeletal. But he\'s still walking. "I figured something out," he croaks. "The secret. You just... keep walking. That\'s it. You keep walking until you can\'t. And then you keep walking after that." A broken, terrible laugh. "I could walk forever. That\'s the horrible, wonderful secret."',
    conditions: { mileRange: [350, 400], relationshipMin: 30, maxWalkersRemaining: 10 },
    options: [
      { text: '"There is no secret, Ray."', response: 'He looks at you with something like gratitude. Or grief. "No. There isn\'t. There never was." He walks on. His feet are bleeding through his shoes.', effects: { relationship: 15, playerMorale: -10 } },
      { text: '"Then we walk forever."', response: 'For just a moment, something lights up behind his hollow eyes. Then it\'s gone. "Yeah," he whispers. "Forever."', effects: { relationship: 20, playerMorale: -5 } },
    ],
  },

  // ========== McVRIES (#61) ==========
  {
    id: 'mcvries_intro', speaker: 61,
    text: 'A tall walker with a prominent scar falls into step. "New Columbia. The mystery state." His smile is sharp. "I\'m McVries. Before you ask — it wasn\'t a knife fight. Everyone asks."',
    conditions: { mileRange: [2, 15] },
    options: [
      { text: '"I wasn\'t going to ask."', response: '"Then you\'re the first." His smile becomes genuine. "I\'ll keep an eye on you, New Columbia."', effects: { relationship: 10, playerMorale: 3, setFlag: 'mcvries_intro_complete' } },
      { text: '"What was it then?"', response: 'His smile fades like a sunset. "Love. The worst kind." He picks up pace. "Ask again in a hundred miles."', effects: { relationship: 3, setFlag: 'mcvries_intro_complete' } },
      { text: '"I\'ve got my own scars."', response: '"Yeah? The kind that show, or the kind that don\'t?" He doesn\'t wait. "The second kind are worse. Trust me."', effects: { relationship: 8, setFlag: 'mcvries_intro_complete' } },
    ],
  },
  {
    id: 'mcvries_scar', speaker: 61,
    text: 'McVries touches his scar. "You earned the hundred-mile story." A pause. "There was a girl. Priscilla. She told me she loved me, then she did this. Or maybe I told her something that made her do it."',
    conditions: { mileRange: [75, 100], relationshipMin: 40, flagRequired: 'mcvries_intro_complete' },
    options: [
      { text: '"I\'m sorry, McVries."', response: '"Don\'t be. I deserved it. Or didn\'t. Either way, I\'m here now, which is probably punishment for both versions."', effects: { relationship: 5, setFlag: 'mcvries_scar_told' } },
      { text: '"Why are you telling me this?"', response: '"Because we might both be dead tomorrow, and someone should know. Even if it doesn\'t matter."', effects: { relationship: 8, setFlag: 'mcvries_scar_told' } },
      { text: '"Sounds like you\'re still carrying it."', response: '"Carrying it? I\'m walking with it. That\'s what the Walk is, isn\'t it? Carrying everything until you can\'t."', effects: { relationship: 12, setFlag: 'mcvries_deep_trust' } },
    ],
  },
  {
    id: 'mcvries_philosophy', speaker: 61,
    text: '"Here\'s what I think." The night road stretches into nothing. "We\'re all already dead. We died the moment we stepped onto this road. Everything since then is afterglow."',
    conditions: { mileRange: [150, 250], relationshipMin: 30, flagRequired: 'mcvries_intro_complete' },
    options: [
      { text: '"That\'s the most depressing thing I\'ve ever heard."', response: '"Give it another fifty miles." But he sobers. "If you accept you\'re dead, the fear goes away. And without fear, you can just... walk."', effects: { relationship: 8, playerMorale: -3 } },
      { text: '"I\'m not dead yet, McVries."', response: 'He studies you. "No. I don\'t think you are." Something shifts — respect, maybe. Or envy. "Hold onto that."', effects: { relationship: 15, playerMorale: 8 } },
    ],
  },
  {
    id: 'mcvries_goodbye', speaker: 61,
    text: 'McVries is limping badly. He catches you watching and smiles — that same sharp smile, but softer now. "I\'ve been walking toward this since the start." His voice is calm. "It\'s okay. It really is."',
    conditions: { mileRange: [340, 355], relationshipMin: 40, maxWalkersRemaining: 12 },
    options: [
      { text: '"Don\'t. Keep walking."', response: '"I\'ve been keeping walking for three hundred miles. I think that\'s enough." He squeezes your shoulder. "Win this thing."', effects: { relationship: 20, playerMorale: -20, setFlag: 'mcvries_goodbye' } },
      { text: '"Then we stop together."', response: '"Don\'t you dare." Fierce, sudden. "I walked three hundred miles next to you and I am asking you to keep going. That\'s my Prize. You. Walking."', effects: { relationship: 25, playerMorale: -15, setFlag: 'mcvries_goodbye' } },
    ],
  },

  // ========== STEBBINS (#88) ==========
  {
    id: 'stebbins_first', speaker: 88,
    text: 'A slim walker with pale eyes walks with metronomic consistency at the rear. He notices you. "Lost? Or curious?"',
    conditions: { mileRange: [5, 30], playerPosition: 'back' },
    options: [
      { text: '"Curious. You don\'t talk to anyone."', response: '"Talking is a waste of energy." Those pale eyes. "But you\'re from New Columbia. The variable they didn\'t plan for."', effects: { relationship: 5, setFlag: 'stebbins_met' } },
      { text: '"Just walking."', response: '"No one walks the same. Watch them. Some walk away from something. Some toward. And some walk to end something."', effects: { relationship: 3, playerMorale: -3, setFlag: 'stebbins_met' } },
    ],
  },
  {
    id: 'stebbins_warning', speaker: 88,
    text: 'Stebbins appears beside you. "You\'ve been making friends up there." Not a question. "That\'s a nice way to guarantee you\'ll watch them die."',
    conditions: { mileRange: [35, 50], flagRequired: 'stebbins_met', playerPosition: 'back' },
    options: [
      { text: '"Better than walking alone."', response: '"Is it?" Nothing else.', effects: { relationship: 0, setFlag: 'stebbins_challenged' } },
      { text: '"You sound like you know something."', response: '"I know that math applies to everyone on this road. Including the ones you like."', effects: { relationship: -2, setFlag: 'stebbins_curiosity' } },
    ],
  },
  {
    id: 'stebbins_reveal', speaker: 88,
    text: 'Stebbins falls into step. For the first time, he looks tired. Human. "The Major is my father." A beat. "His bastard son. Unacknowledged."',
    conditions: { mileRange: [300, 395], flagRequired: 'stebbins_met', maxWalkersRemaining: 8 },
    options: [
      { text: '"...What?"', response: '"I entered to make him watch. To make him choose — acknowledge me or kill me." A terrible smile. "Either way, he has to see me."', effects: { relationship: 15, playerMorale: -15, setFlag: 'stebbins_revealed' } },
      { text: '"Then you never planned to win."', response: '"Winning was never the point." His eyes find yours. "But I\'ve been walking a long time. And I find myself wanting to live. Isn\'t that inconvenient?"', effects: { relationship: 20, playerMorale: -10, setFlag: 'stebbins_revealed' } },
    ],
  },

  // ========== BAKER (#3) ==========
  {
    id: 'baker_welcome', speaker: 3,
    text: 'A walker with a warm face and gentle drawl. "Hey there. Baker. Art Baker, number three." He extends a hand briefly. "You look like you could use a friend."',
    conditions: { mileRange: [3, 15] },
    options: [
      { text: '"We could all use a friend out here."', response: '"Ain\'t that the truth." His smile is genuine and heartbreaking. "My gran always said the Lord puts people together for a reason."', effects: { relationship: 15, playerMorale: 8, setFlag: 'baker_intro' } },
      { text: '"Is it smart to make friends here?"', response: '"Maybe not. But I\'d rather die with a friend than live as a stranger." He touches a small cross in his pocket.', effects: { relationship: 10, playerMorale: 5, setFlag: 'baker_intro' } },
    ],
  },
  {
    id: 'baker_dog', speaker: 3,
    text: '"Did I ever tell you about my dog, Jasper?" Baker\'s voice is soft, unhurried. "Dumbest retriever in three counties. Couldn\'t fetch a ball if you put it in his mouth. But he\'d sit with you on the porch for hours."',
    conditions: { mileRange: [20, 50], relationshipMin: 5, flagRequired: 'baker_intro' },
    options: [
      { text: '"Sounds like a good dog."', response: '"Best there ever was. That\'s what I\'m walking for. Not the Prize. Just to get back to that porch."', effects: { relationship: 8, playerMorale: 5 } },
      { text: '"I had a dog like that."', response: 'Baker grins wide. "Then you know. You know exactly what I mean."', effects: { relationship: 12, playerMorale: 8 } },
    ],
  },
  {
    id: 'baker_tip', speaker: 3,
    text: '"Hey," Baker leans in. "Little tip. Don\'t eat the food all at once. Space it out. Small bites every fifteen minutes. Keeps your blood sugar steady."',
    conditions: { mileRange: [8, 35], flagRequired: 'baker_intro' },
    options: [
      { text: '"Thanks, Baker. That\'s smart."', response: 'He tips an imaginary hat. "Farm sense. We feed the horses the same way." A grin. "Don\'t tell nobody I compared you to a horse."', effects: { relationship: 8, playerMorale: 5, setFlag: 'baker_food_tip' } },
    ],
  },

  // ========== OLSON (#70) ==========
  {
    id: 'olson_boast', speaker: 70,
    text: 'A big, swaggering walker shoulders up. "New Columbia, huh? That even a real state?" He grins. "I\'m Olson. And I\'m gonna win this thing."',
    conditions: { mileRange: [1, 15] },
    options: [
      { text: '"Good luck with that."', response: '"Luck\'s got nothing to do with it." He flexes. "See these legs? Made for winning."', effects: { relationship: -5, playerMorale: -2, setFlag: 'olson_met' } },
      { text: '"It\'s a long road."', response: '"Not long enough to stop me." Something flickers behind the bravado. Then the mask snaps back.', effects: { relationship: 0, setFlag: 'olson_met' } },
    ],
  },
  {
    id: 'olson_breaking', speaker: 70,
    text: 'Olson\'s swagger is gone. He\'s limping, face a mask of sweat. He catches you looking. "What are you staring at?" His voice cracks. "I\'m FINE."',
    conditions: { mileRange: [85, 108], flagRequired: 'olson_met' },
    options: [
      { text: '"You\'re not fine. Slow down."', response: '"I DON\'T NEED—" He stops. Something breaks. "My knee. Something\'s wrong with my knee." He looks at you like a scared kid. Because that\'s what he is.', effects: { relationship: 15, playerMorale: -10 } },
      { text: 'Look away. Give him his dignity.', response: 'You turn your head. Behind you, ragged desperate breathing. The sound of a boy trying to be a man in the worst possible way.', effects: { relationship: 5, playerMorale: -8 } },
    ],
  },

  // ========== BARKOVITCH (#5) ==========
  {
    id: 'barkovitch_taunt', speaker: 5,
    text: 'A wiry walker with a mean grin. "The freak from New Columbia. I\'m Barkovitch. And I\'ll dance on your grave, same as the rest."',
    conditions: { mileRange: [5, 20] },
    options: [
      { text: '"You must be very popular."', response: '"Don\'t need popular. Need alive." His eyes glitter. "Popular\'s for the dead."', effects: { relationship: -10, playerMorale: -3, setFlag: 'barkovitch_met' } },
      { text: '[Ignore him.]', response: 'He hates being ignored. "HEY. I\'m talking to you!" But you walk on.', effects: { relationship: -15, playerMorale: 2, setFlag: 'barkovitch_met' } },
      { text: '"What\'s your Prize? Somebody to finally like you?"', response: 'His face goes blank. For a second, the mask drops. Then: "Funny guy. We\'ll see at mile 200."', effects: { relationship: -20, playerMorale: 0, setFlag: 'barkovitch_wounded' } },
    ],
  },
  {
    id: 'barkovitch_alone', speaker: 5,
    text: 'Barkovitch walks alone. Other walkers drift away like he\'s radioactive. His sneer is gone. He sees you. "Come to gloat?"',
    conditions: { mileRange: [100, 200], flagRequired: 'barkovitch_met' },
    options: [
      { text: '"No. Just walking."', response: 'He waits for the insult. When it doesn\'t come, something crumbles. "Nobody talks to me," he whispers. "I made it so nobody would. And now nobody does." Broken glass laughter.', effects: { relationship: 20, playerMorale: -8 } },
      { text: '"You brought this on yourself."', response: '"I know." Two words you never expected. "I know I did." His voice is so small.', effects: { relationship: 5, playerMorale: -10 } },
    ],
  },

  // ========== PARKER (#34) ==========
  {
    id: 'parker_rage', speaker: 34,
    text: 'Parker walks with fists clenched, glaring at the halftrack. "Look at them. Clean uniforms. Fed. While we walk until we die." He spits. "This whole thing is a setup."',
    conditions: { mileRange: [10, 50] },
    options: [
      { text: '"You\'re right. It was never meant to be fair."', response: 'He looks at you — really looks. "You get it. The New Columbia kid gets it." He nods slowly. "Stay angry. Angry keeps you walking."', effects: { relationship: 15, playerMorale: 3, setFlag: 'parker_met' } },
      { text: '"We all volunteered."', response: '"Did we? REALLY?" Chicago steel. "When you got nothing, \'volunteer\' don\'t mean what they think it means."', effects: { relationship: 5, playerMorale: -3, setFlag: 'parker_met' } },
    ],
  },

  // ========== SCRAMM (#45) ==========
  {
    id: 'scramm_cathy', speaker: 45,
    text: 'Scramm walks like a machine — big, steady. But talking about his wife, his face transforms. "Cathy." The name sounds like a prayer. He shows a ring on a chain. "We got married three months ago."',
    conditions: { mileRange: [10, 50] },
    options: [
      { text: '"What\'s she like?"', response: 'His smile could light the whole road. "Small. Like a bird. But tough." A laugh. "She said don\'t come home without the Prize." Pause. "She was kidding. I think."', effects: { relationship: 12, playerMorale: 8, setFlag: 'scramm_met' } },
      { text: '"The Prize is for her?"', response: '"Everything\'s for her." His fists curl — determined, not angry. "A house. A real house. With a yard for the baby." He catches your look. "Yeah. There\'s a baby coming."', effects: { relationship: 10, playerMorale: 5, setFlag: 'scramm_baby_known' } },
    ],
  },
  {
    id: 'scramm_sick', speaker: 45,
    text: 'Scramm has been coughing. Deep, wet, rattling. His face is flushed. "Just a cold." Another cough. "Just a cold. Cathy\'s waiting."',
    conditions: { mileRange: [120, 175], flagRequired: 'scramm_met' },
    options: [
      { text: '"Let me walk beside you. Shield the wind."', response: 'You and others form a windbreak. For a few miles, it helps. But the cough returns deeper. Scramm squeezes your arm. "You\'re a good person," he whispers. "Tell Cathy... if you..."', effects: { relationship: 20, playerMorale: -15, setFlag: 'scramm_pact' } },
      { text: '"You need to slow down. Conserve."', response: '"Can\'t slow down. Speed up or die." Another cough. "Cathy... the baby..." His eyes are desperate and glazed.', effects: { relationship: 10, playerMorale: -20 } },
    ],
  },

  // ========== HARKNESS (#49) ==========
  {
    id: 'harkness_notebook', speaker: 49,
    text: 'The walker with the notebook is scribbling. He writes without looking at the page. He catches you watching. "I\'m writing it all down. Someone has to. Harkness. Forty-nine."',
    conditions: { mileRange: [10, 60] },
    options: [
      { text: '"What are you writing?"', response: '"Everything. Who walks next to who. How gaits change before the first warning." He taps the notebook. "The only true account of what happened here."', effects: { relationship: 10, playerMorale: 3, setFlag: 'harkness_met' } },
      { text: '"Am I in there?"', response: 'He flips back. "\'Walker 100. New Columbia. Watches more than talks.\'" He looks up. "That\'s what I wrote an hour ago."', effects: { relationship: 5, playerMorale: -3, setFlag: 'harkness_met' } },
    ],
  },
];
