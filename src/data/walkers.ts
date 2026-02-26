// ============================================================
// The Long Walk — Complete Walker Roster (99 NPCs)
// Tier 1: 9 major NPCs (full dialogue trees)
// Tier 2: 15 supporting NPCs (limited dialogue)
// Tier 3: 75 background NPCs (ambient only)
// Walker #100 = Player
// ============================================================

import { WalkerData } from '../types';

// --- TIER 1: Major NPCs ---

const TIER_1: WalkerData[] = [
  {
    name: 'Raymond Davis Garraty',
    walkerNumber: 47,
    age: 17,
    homeState: 'Maine',
    tier: 1,
    personalityTraits: ['thoughtful', 'empathetic', 'stubborn', 'internally conflicted', 'loyal'],
    dialogueStyle: 'Conversational and warm, becomes increasingly raw and fragmented as exhaustion mounts.',
    backstoryNotes: 'From Pownal, Maine. Girlfriend named Jan. His father was Squaded. Entered partly out of a death wish he doesn\'t fully understand.',
    initialRelationship: 15,
    eliminationMile: 400,
    eliminationNarrative: 'Garraty is one of the final walkers. His fate depends on whether the player survives longer. If he falls, he walks toward a dark figure on the road that may or may not be real.',
    keyScenes: ['befriending player early', 'why they entered', 'Olson reaction', 'Jan sighting', 'despair after McVries', 'final delirium'],
    alliancePotential: 'high',
    physicalState: 'average',
    psychologicalArchetype: 'The Everyman',
    walkingPosition: 'middle',
  },
  {
    name: 'Peter McVries',
    walkerNumber: 61,
    age: 17,
    homeState: 'Connecticut',
    tier: 1,
    personalityTraits: ['witty', 'self-destructive', 'perceptive', 'sardonic', 'surprisingly tender'],
    dialogueStyle: 'Sharp, sarcastic, deflects with humor. Becomes more sincere and philosophical as the walk progresses.',
    backstoryNotes: 'Prominent scar on face from a girl named Priscilla. Entered as a form of self-destruction. Forms deepest bond with Garraty. Saves Garraty\'s life at least once.',
    initialRelationship: -5,
    eliminationMile: 350,
    eliminationNarrative: 'McVries reaches acceptance. He has been walking to die from the beginning. He simply stops. Quiet. Chosen. One of the most devastating moments.',
    keyScenes: ['testing the player', 'saving Garraty', 'scar story', 'Barkovitch confrontation', 'philosophical nights', 'his quiet decision to stop'],
    alliancePotential: 'high',
    physicalState: 'average',
    psychologicalArchetype: 'The Self-Appointed Martyr',
    walkingPosition: 'middle',
  },
  {
    name: 'Stebbins',
    walkerNumber: 88,
    age: 18,
    homeState: 'Unknown',
    tier: 1,
    personalityTraits: ['enigmatic', 'coldly intelligent', 'detached', 'provocative', 'lonely'],
    dialogueStyle: 'Speaks rarely and in short, cutting observations. Never wastes words. Feels like being dissected.',
    backstoryNotes: 'The Major\'s illegitimate son. Entered to prove himself to a father who sees him as disposable. Walks alone at the back.',
    initialRelationship: 0,
    eliminationMile: 399,
    eliminationNarrative: 'One of the last to fall. Collapses with a look of surprise — he genuinely believed The Major would intervene. The final proof that the system has no mercy.',
    keyScenes: ['first encounter at the back', 'cryptic warning about alliances', 'knows more than anyone', 'Major revelation', 'final collapse and betrayal'],
    alliancePotential: 'none',
    physicalState: 'strong',
    psychologicalArchetype: 'The Oracle',
    walkingPosition: 'back',
  },
  {
    name: 'Hank Olson',
    walkerNumber: 70,
    age: 17,
    homeState: 'Massachusetts',
    tier: 1,
    personalityTraits: ['brash', 'physically dominant', 'insecure underneath', 'bravado', 'crumbles under pressure'],
    dialogueStyle: 'Loud, boastful, talks about winning. Uses humor as armor. Becomes desperate and unhinged.',
    backstoryNotes: 'Athletic, popular. Entered convinced he\'d win through physical dominance. His decline is prolonged, ugly, and deeply pitiable.',
    initialRelationship: -10,
    eliminationMile: 110,
    eliminationNarrative: 'Olson\'s breakdown: screaming, raving, losing control. He can barely walk. His drawn-out elimination reduces a strong man to nothing.',
    keyScenes: ['boasting about strength', 'mocking player\'s outsider status', 'first limping', 'the breakdown — screaming, begging', 'prolonged deterioration'],
    alliancePotential: 'low',
    physicalState: 'strong',
    psychologicalArchetype: 'The False Champion',
    walkingPosition: 'front',
  },
  {
    name: 'Art Baker',
    walkerNumber: 3,
    age: 17,
    homeState: 'Alabama',
    tier: 1,
    personalityTraits: ['kind', 'grounded', 'storyteller', 'gentle', 'quietly brave'],
    dialogueStyle: 'Southern warmth. Tells long winding stories about home. Speaks softly. Like a campfire in a nightmare.',
    backstoryNotes: 'Rural background. Entered for reasons he doesn\'t fully articulate. One of the most decent people on the Walk. His death hits hard because he deserved better.',
    initialRelationship: 20,
    eliminationMile: 200,
    eliminationNarrative: 'Baker declines gradually. Keeps telling stories even as his body fails. Goes quietly, mid-sentence in a story about his dog.',
    keyScenes: ['welcoming player', 'stories about home', 'pacing advice', 'stories fragment', 'final interrupted story'],
    alliancePotential: 'high',
    physicalState: 'average',
    psychologicalArchetype: 'The Heart',
    walkingPosition: 'middle',
  },
  {
    name: 'Gary Barkovitch',
    walkerNumber: 5,
    age: 16,
    homeState: 'Connecticut',
    tier: 1,
    personalityTraits: ['provocative', 'vindictive', 'insecure', 'clever', 'self-isolating'],
    dialogueStyle: 'Needling, taunting, looking for a reaction. Speaks to wound. Occasionally lets the mask slip.',
    backstoryNotes: 'Universally disliked. Provokes a confrontation that leads to another walker\'s death. Promises to dance on their graves. Pitiable underneath — never been loved.',
    initialRelationship: -30,
    eliminationMile: 250,
    eliminationNarrative: 'Barkovitch dances on the road, raving, before being eliminated. Horrifying and sad in equal measure.',
    keyScenes: ['first provocation', 'the incident causing a death', 'being ostracized', 'rare vulnerability', 'the dance'],
    alliancePotential: 'none',
    physicalState: 'average',
    psychologicalArchetype: 'The Pariah',
    walkingPosition: 'middle',
  },
  {
    name: 'Collie Parker',
    walkerNumber: 34,
    age: 18,
    homeState: 'Indiana',
    tier: 1,
    personalityTraits: ['confrontational', 'working-class anger', 'brave', 'impulsive', 'anti-authority'],
    dialogueStyle: 'Blunt, profane, direct. Strong sense of injustice. His anger is righteous but self-destructive.',
    backstoryNotes: 'Working-class background. Entered with a chip on his shoulder. Most likely to curse at soldiers and rage against the machine.',
    initialRelationship: 0,
    eliminationMile: 280,
    eliminationNarrative: 'Parker makes a run for it — tries to break through the perimeter. A futile act of defiance. Goes down fighting.',
    keyScenes: ['confronting a soldier', 'ranting about the system', 'grudging respect for player', 'planning escape', 'the futile charge'],
    alliancePotential: 'medium',
    physicalState: 'strong',
    psychologicalArchetype: 'The Rebel',
    walkingPosition: 'front',
  },
  {
    name: 'Scramm',
    walkerNumber: 45,
    age: 18,
    homeState: 'Montana',
    tier: 1,
    personalityTraits: ['strong', 'simple', 'good-natured', 'devoted', 'tragic'],
    dialogueStyle: 'Plain-spoken, earnest, sincere. Talks about his wife. No guile. His simplicity makes his tragedy hit harder.',
    backstoryNotes: 'Married young — wife Cathy is pregnant. Entered for the Prize money. Strongest walker physically. Catches cold in rain that turns to pneumonia.',
    initialRelationship: 15,
    eliminationMile: 180,
    eliminationNarrative: 'Scramm catches cold in the rain. Despite being strongest, illness drains him. Walks as long as he can, thinking of Cathy. The pact for his wife is one of the novel\'s most human moments.',
    keyScenes: ['talking about Cathy', 'physical dominance', 'caught in rain', 'decline and coughing', 'the pact', 'final determined miles'],
    alliancePotential: 'medium',
    physicalState: 'strong',
    psychologicalArchetype: 'The Gentle Giant',
    walkingPosition: 'front',
  },
  {
    name: 'Harkness',
    walkerNumber: 49,
    age: 17,
    homeState: 'New Hampshire',
    tier: 1,
    personalityTraits: ['observational', 'quiet', 'intellectual', 'meticulous', 'detached'],
    dialogueStyle: 'Measured, precise. Asks probing questions out of data-gathering instinct. Short declarative sentences.',
    backstoryNotes: 'Walks while writing in a notebook. Documenting the Long Walk. The chronicler, the witness.',
    initialRelationship: 5,
    eliminationMile: 220,
    eliminationNarrative: 'Harkness drops his notebook before his elimination. Whether someone picks it up becomes a poignant detail.',
    keyScenes: ['scribbling in notebook', 'sharing a statistic', 'letting player read an entry', 'why he documents', 'dropping the notebook'],
    alliancePotential: 'low',
    physicalState: 'average',
    psychologicalArchetype: 'The Witness',
    walkingPosition: 'middle',
  },
];

// --- TIER 2: Supporting NPCs ---

const TIER_2: WalkerData[] = [
  {
    name: 'Curley', walkerNumber: 7, age: 16, homeState: 'Vermont', tier: 2,
    personalityTraits: ['nervous', 'talkative', 'young'],
    dialogueStyle: 'Rapid, anxious chatter. Talks to cope with fear.',
    backstoryNotes: 'One of the youngest. In over his head from the start.',
    initialRelationship: 10, eliminationMile: 20,
    eliminationNarrative: 'One of the very first eliminations. A shocking early death that establishes the stakes.',
    keyScenes: ['chatting nervously at start', 'sudden collapse'], alliancePotential: 'low',
    physicalState: 'weak', psychologicalArchetype: 'The Canary', walkingPosition: 'middle',
  },
  {
    name: 'Ewing', walkerNumber: 9, age: 17, homeState: 'Ohio', tier: 2,
    personalityTraits: ['quiet', 'steady', 'unremarkable'],
    dialogueStyle: 'Brief, functional.',
    backstoryNotes: 'A background walker. His elimination reminds us most boys are anonymous.',
    initialRelationship: 0, eliminationMile: 60,
    eliminationNarrative: 'Eliminated without fanfare. The player may barely notice.',
    keyScenes: ['brief exchange about weather', 'quiet exit'], alliancePotential: 'none',
    physicalState: 'average', psychologicalArchetype: 'The Anonymous', walkingPosition: 'middle',
  },
  {
    name: 'Fenter', walkerNumber: 18, age: 17, homeState: 'Delaware', tier: 2,
    personalityTraits: ['jokester', 'deflective', 'anxious underneath'],
    dialogueStyle: 'Constant jokes. Humor gets darker.',
    backstoryNotes: 'Uses humor as coping. Group clown. When jokes stop, it\'s a sign.',
    initialRelationship: 10, eliminationMile: 120,
    eliminationNarrative: 'His last words are a punchline. Unclear if brave or heartbreaking.',
    keyScenes: ['cracking jokes', 'dark humor', 'the silence', 'final punchline'], alliancePotential: 'medium',
    physicalState: 'average', psychologicalArchetype: 'The Comedian', walkingPosition: 'middle',
  },
  {
    name: 'Gallant', walkerNumber: 20, age: 17, homeState: 'Iowa', tier: 2,
    personalityTraits: ['earnest', 'patriotic', 'naive'],
    dialogueStyle: 'Sincere, painfully so. Believes in the Walk as an honor.',
    backstoryNotes: 'Genuinely believes in the system. His disillusionment is total.',
    initialRelationship: 10, eliminationMile: 170,
    eliminationNarrative: 'Eliminated while insisting "this means something." Faith outlasts body.',
    keyScenes: ['expressing pride', 'defending the Walk', 'moment of doubt', 'final insistence'], alliancePotential: 'low',
    physicalState: 'average', psychologicalArchetype: 'The True Believer', walkingPosition: 'middle',
  },
  {
    name: 'Percy', walkerNumber: 31, age: 16, homeState: 'Virginia', tier: 2,
    personalityTraits: ['religious', 'devout', 'gentle', 'fearful'],
    dialogueStyle: 'Prays aloud. Quotes scripture. Trembling voice.',
    backstoryNotes: 'Entered believing God would protect him. Faith is tested.',
    initialRelationship: 10, eliminationMile: 90,
    eliminationNarrative: 'Dies praying. The contrast between faith and the Walk\'s brutality is stark.',
    keyScenes: ['praying at start', 'offering to pray for player', 'crisis of faith', 'final prayer'], alliancePotential: 'low',
    physicalState: 'weak', psychologicalArchetype: 'The Believer', walkingPosition: 'back',
  },
  {
    name: 'Jensen', walkerNumber: 52, age: 18, homeState: 'Minnesota', tier: 2,
    personalityTraits: ['calm', 'nordic stoicism', 'enduring'],
    dialogueStyle: 'Even-keeled. Doesn\'t waste energy on emotion.',
    backstoryNotes: 'Farm boy. Built for endurance. Goes much further than expected.',
    initialRelationship: 0, eliminationMile: 300,
    eliminationNarrative: 'His body simply gives out after extraordinary endurance. No drama. Just stops.',
    keyScenes: ['conversation about farming', 'quiet collapse late'], alliancePotential: 'low',
    physicalState: 'strong', psychologicalArchetype: 'The Endurer', walkingPosition: 'middle',
  },
  {
    name: 'Klingerman', walkerNumber: 55, age: 18, homeState: 'Florida', tier: 2,
    personalityTraits: ['aggressive', 'competitive', 'suspicious'],
    dialogueStyle: 'Combative. Sees everyone as a rival.',
    backstoryNotes: 'Entered to win, no other reason. Views everything through a competitive lens.',
    initialRelationship: -15, eliminationMile: 160,
    eliminationNarrative: 'Tries to psych out a rival, trips, can\'t recover. Ironic.',
    keyScenes: ['intimidating player', 'picking fights', 'ironic stumble'], alliancePotential: 'none',
    physicalState: 'strong', psychologicalArchetype: 'The Competitor', walkingPosition: 'front',
  },
  {
    name: 'Pearson', walkerNumber: 60, age: 17, homeState: 'Massachusetts', tier: 2,
    personalityTraits: ['intellectual', 'anxious', 'overthinks'],
    dialogueStyle: 'Rapid analytical speech. Calculates odds aloud.',
    backstoryNotes: 'Numbers guy. Calculates survival probabilities which terrifies him more.',
    initialRelationship: 5, eliminationMile: 100,
    eliminationNarrative: 'His anxiety overwhelms him before his body gives out.',
    keyScenes: ['probability calculations', 'spiraling into panic'], alliancePotential: 'low',
    physicalState: 'average', psychologicalArchetype: 'The Calculator', walkingPosition: 'middle',
  },
  {
    name: 'Rank', walkerNumber: 72, age: 18, homeState: 'New York', tier: 2,
    personalityTraits: ['tough', 'streetwise', 'practical'],
    dialogueStyle: 'Clipped, urban, no-nonsense.',
    backstoryNotes: 'City kid. Doesn\'t romanticize the Walk.',
    initialRelationship: 0, eliminationMile: 130,
    eliminationNarrative: 'Cramps take him. Fights it but can\'t recover.',
    keyScenes: ['practical advice about foot care', 'leg seizing'], alliancePotential: 'low',
    physicalState: 'average', psychologicalArchetype: 'The Pragmatist', walkingPosition: 'middle',
  },
  {
    name: 'Rattigan', walkerNumber: 75, age: 18, homeState: 'New Jersey', tier: 2,
    personalityTraits: ['gruff', 'pragmatic', 'seen-it-all'],
    dialogueStyle: 'World-weary. Talks like a man three times his age.',
    backstoryNotes: 'Hard upbringing. Nothing surprises him.',
    initialRelationship: 0, eliminationMile: 240,
    eliminationNarrative: 'Goes without complaint. Expected it.',
    keyScenes: ['nihilistic philosophy', 'accepting the end'], alliancePotential: 'low',
    physicalState: 'average', psychologicalArchetype: 'The Fatalist', walkingPosition: 'back',
  },
  {
    name: 'Travin', walkerNumber: 91, age: 17, homeState: 'Michigan', tier: 2,
    personalityTraits: ['musical', 'dreamy', 'escapist'],
    dialogueStyle: 'Hums songs. Talks about music. Drifts into reverie.',
    backstoryNotes: 'Plays guitar at home. Uses music as mental escape.',
    initialRelationship: 5, eliminationMile: 140,
    eliminationNarrative: 'Humming a song when he goes. The song cuts off mid-note.',
    keyScenes: ['humming rhythms', 'talking about music', 'the song that stops'], alliancePotential: 'low',
    physicalState: 'average', psychologicalArchetype: 'The Dreamer', walkingPosition: 'middle',
  },
  {
    name: 'Toland', walkerNumber: 92, age: 17, homeState: 'Pennsylvania', tier: 2,
    personalityTraits: ['friendly', 'average', 'hopeful'],
    dialogueStyle: 'Optimistic small talk that becomes strained.',
    backstoryNotes: 'Ordinary boy. Had no idea what he was getting into.',
    initialRelationship: 5, eliminationMile: 75,
    eliminationNarrative: 'Goes down on a hill. The terrain beat him.',
    keyScenes: ['bonding over high numbers', 'struggling on incline'], alliancePotential: 'low',
    physicalState: 'weak', psychologicalArchetype: 'The Everykid', walkingPosition: 'middle',
  },
  {
    name: 'Wyman', walkerNumber: 97, age: 16, homeState: 'Rhode Island', tier: 2,
    personalityTraits: ['scared', 'young', 'regretful'],
    dialogueStyle: 'Whispers. Cries. Asks "why did I do this" repeatedly.',
    backstoryNotes: 'Entered on a dare. Regrets it immediately.',
    initialRelationship: 5, eliminationMile: 40,
    eliminationNarrative: 'An early death. He\'s crying when he goes.',
    keyScenes: ['confiding about dare', 'crying openly', 'begging for help'], alliancePotential: 'low',
    physicalState: 'weak', psychologicalArchetype: 'The Regretful', walkingPosition: 'back',
  },
  {
    name: 'Zuck', walkerNumber: 98, age: 17, homeState: 'Maine', tier: 2,
    personalityTraits: ['local', 'proud', 'chatty'],
    dialogueStyle: 'Enthusiastic about home turf. Points out landmarks.',
    backstoryNotes: 'From a town along the route. Excited when they pass through his area.',
    initialRelationship: 5, eliminationMile: 85,
    eliminationNarrative: 'Eliminated within sight of his hometown. Devastating irony.',
    keyScenes: ['pointing out landmarks', 'excitement as town approaches', 'falling just before'], alliancePotential: 'low',
    physicalState: 'average', psychologicalArchetype: 'The Local', walkingPosition: 'middle',
  },
  {
    name: 'Abraham', walkerNumber: 2, age: 17, homeState: 'Georgia', tier: 2,
    personalityTraits: ['quiet', 'internal', 'stoic'],
    dialogueStyle: 'Minimal. Nods more than speaks.',
    backstoryNotes: 'A background presence. His silent endurance is notable.',
    initialRelationship: 0, eliminationMile: 150,
    eliminationNarrative: 'Goes quietly. The group barely reacts — they\'ve become numb.',
    keyScenes: ['wordless nod', 'silent end'], alliancePotential: 'none',
    physicalState: 'average', psychologicalArchetype: 'The Stoic', walkingPosition: 'back',
  },
];

// --- TIER 3: Background NPCs (procedurally generated to fill 1-99) ---

const usedNumbers = new Set([
  ...TIER_1.map(w => w.walkerNumber),
  ...TIER_2.map(w => w.walkerNumber),
]);

const FIRST_NAMES = [
  'Adams', 'Bennett', 'Carroll', 'Dixon', 'Emerson', 'Foster', 'Gibson', 'Hartley',
  'Irwin', 'Jarvis', 'Kemp', 'Loomis', 'Marsh', 'Norwood', 'Ogden', 'Pratt',
  'Quimby', 'Rowe', 'Slater', 'Tate', 'Upton', 'Voss', 'Walsh', 'Yates',
  'Aldrich', 'Booth', 'Crane', 'Dorsey', 'Enright', 'Finch', 'Gould', 'Henley',
  'Ives', 'Judd', 'Kirby', 'Lyle', 'Mercer', 'Neff', 'Oakes', 'Putnam',
  'Rand', 'Sawyer', 'Thorne', 'Underhill', 'Vickers', 'Whitfield', 'York', 'Zeller',
  'Archer', 'Bates', 'Cobb', 'Dalton', 'Eaton', 'Floyd', 'Graves', 'Hull',
  'Ingalls', 'Joyce', 'Knox', 'Lang', 'Moody', 'Nash', 'Odom', 'Pace',
  'Quinn', 'Riggs', 'Stokes', 'Tuttle', 'Unger', 'Vance', 'Weeks', 'Wyatt',
  'Abbott', 'Blackwell',
];

const STATES = [
  'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Georgia', 'Hawaii',
  'Idaho', 'Illinois', 'Kansas', 'Kentucky', 'Louisiana', 'Maryland', 'Michigan',
  'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Jersey',
  'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Oklahoma', 'Oregon',
  'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Washington',
  'West Virginia', 'Wisconsin', 'Wyoming',
];

const TRAIT_POOL = [
  'quiet', 'nervous', 'tough', 'shy', 'determined', 'scared', 'stoic', 'friendly',
  'withdrawn', 'aggressive', 'hopeful', 'bitter', 'calm', 'fidgety', 'prayerful',
  'sarcastic', 'loyal', 'loner', 'talkative', 'pragmatic',
];

const ARCHETYPES = [
  'The Unknown', 'The Background', 'The Filler', 'The Forgotten', 'The Number',
  'The Anonymous', 'The Silent', 'The Unremarkable', 'The Nobody', 'The Statistic',
];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

function generateTier3(): WalkerData[] {
  const rng = seededRandom(42);
  const walkers: WalkerData[] = [];
  let nameIdx = 0;

  // Distribute elimination miles: most in 10-200, fewer in 200-380
  const elimMiles: number[] = [];
  for (let i = 0; i < 80; i++) {
    if (i < 30) elimMiles.push(5 + Math.floor(rng() * 95)); // 5-100
    else if (i < 55) elimMiles.push(100 + Math.floor(rng() * 100)); // 100-200
    else if (i < 70) elimMiles.push(200 + Math.floor(rng() * 100)); // 200-300
    else elimMiles.push(300 + Math.floor(rng() * 80)); // 300-380
  }
  elimMiles.sort((a, b) => a - b);

  let elimIdx = 0;
  for (let num = 1; num <= 99; num++) {
    if (usedNumbers.has(num)) continue;
    if (nameIdx >= FIRST_NAMES.length) break;

    const name = FIRST_NAMES[nameIdx++];
    const state = STATES[Math.floor(rng() * STATES.length)];
    const age = 16 + Math.floor(rng() * 3);
    const t1 = TRAIT_POOL[Math.floor(rng() * TRAIT_POOL.length)];
    const t2 = TRAIT_POOL[Math.floor(rng() * TRAIT_POOL.length)];
    const physStates: Array<'strong' | 'average' | 'weak'> = ['average', 'average', 'average', 'weak', 'strong'];
    const positions: Array<'front' | 'middle' | 'back'> = ['middle', 'middle', 'middle', 'front', 'back'];

    walkers.push({
      name,
      walkerNumber: num,
      age,
      homeState: state,
      tier: 3,
      personalityTraits: [t1, t2],
      dialogueStyle: 'Brief, ambient.',
      backstoryNotes: `A walker from ${state}. Number ${num}.`,
      initialRelationship: Math.floor(rng() * 20 - 10),
      eliminationMile: elimMiles[elimIdx++] || (200 + Math.floor(rng() * 100)),
      eliminationNarrative: `Walker #${num}, ${name}, is eliminated.`,
      keyScenes: [],
      alliancePotential: 'none',
      physicalState: physStates[Math.floor(rng() * physStates.length)],
      psychologicalArchetype: ARCHETYPES[Math.floor(rng() * ARCHETYPES.length)],
      walkingPosition: positions[Math.floor(rng() * positions.length)],
    });
  }

  return walkers;
}

// --- COMPLETE ROSTER ---

export const ALL_WALKERS: WalkerData[] = [
  ...TIER_1,
  ...TIER_2,
  ...generateTier3(),
].sort((a, b) => a.walkerNumber - b.walkerNumber);
