// ============================================================
// The Long Walk — Complete Walker Roster (99 NPCs)
// Tier 1: 9 major NPCs (full dialogue trees)
// Tier 2: 15 supporting NPCs (limited dialogue)
// Tier 3: 75 background NPCs (ambient only)
// Walker #100 = Player
// ============================================================

import { WalkerData, NPCRelationship } from '../types';

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
    arcStages: [
      { arcPhase: 'introduction', mileRange: [0, 20], minConversations: 0, promptHint: 'Friendly but guarded. Testing if the player is worth knowing. Talk about Maine, the crowd, the strangeness of the first miles.' },
      { arcPhase: 'opening_up', mileRange: [20, 80], minConversations: 2, promptHint: 'Bonding. You talk about Jan, about home, about why anyone would do this. Starting to lean on the player.' },
      { arcPhase: 'vulnerability', mileRange: [80, 200], minConversations: 4, promptHint: 'The walk is breaking you. You think about your father being Squaded. You wonder if you entered because you wanted to die. Be honest.' },
      { arcPhase: 'crisis', mileRange: [200, 370], minConversations: 6, promptHint: 'Friends are dying. McVries is fading. You are being stripped down to something raw. Talk about what survival costs.' },
      { arcPhase: 'farewell', mileRange: [370, 400], minConversations: 0, promptHint: 'Delirium. You might see Jan in the crowd. You talk to people who aren\'t there. But when you talk to the player, there are flashes of lucidity. Say what matters.' },
    ],
    declineNarratives: [
      'Garraty\'s eyes have a thousand-yard stare. He keeps looking into the crowd as if searching for someone.',
      'Garraty stumbles, catches himself. He laughs — a hollow, broken sound.',
      'Garraty is muttering to himself. You catch the name "Jan" repeated like a prayer.',
    ],
    eliminationScene: [
      { text: 'Garraty\'s pace falters. His eyes are glassy, unfocused. He\'s looking at something on the road ahead that no one else can see.', type: 'narration' },
      { text: '"There," he whispers. "There it is. Can you see it?" He walks toward the dark figure on the road. Or perhaps it walks toward him.', type: 'narration' },
      { text: 'Ray Garraty, Walker #47. The Everyman. Gone into whatever waits at the end of the road.', type: 'elimination' },
    ],
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
    arcStages: [
      { arcPhase: 'introduction', mileRange: [0, 20], minConversations: 0, promptHint: 'Sizing up the player. Sharp, sarcastic, testing. You want to see if they\'re real or just another fool walking to die.' },
      { arcPhase: 'opening_up', mileRange: [20, 80], minConversations: 2, promptHint: 'Starting to trust the player. Still deflecting with humor, but cracks are showing. You might mention Priscilla, the scar.' },
      { arcPhase: 'vulnerability', mileRange: [80, 200], minConversations: 4, promptHint: 'The mask is slipping. You can talk about the scar — self-inflicted, after Priscilla. You entered the Walk to die. Be honest about that.' },
      { arcPhase: 'crisis', mileRange: [200, 340], minConversations: 6, promptHint: 'Questioning everything. Is The Prize real? Does winning mean anything? You\'re raw and philosophical. The wit is still there but it hurts now.' },
      { arcPhase: 'farewell', mileRange: [340, 355], minConversations: 0, promptHint: 'You\'ve accepted what\'s coming. You\'ve been walking to die from the beginning. You\'re at peace. You want the player to be okay after you\'re gone.' },
    ],
    declineNarratives: [
      'McVries is quieter now. The sarcasm has dried up. He walks with a strange calm.',
      'McVries looks at the road behind him, then ahead. As if measuring the distance to something only he can see.',
      'McVries catches your eye and smiles. It\'s the most genuine smile you\'ve seen from him. It terrifies you.',
    ],
    eliminationScene: [
      { text: 'McVries slows. Not stumbling, not failing — slowing. Deliberately. He sits down on the edge of the road as if he\'s found a park bench.', type: 'narration' },
      { text: '"I\'ve been walking toward this since the starting line," he says quietly. "I think you knew that." His face is calm. Serene. He has chosen this.', type: 'narration' },
      { text: 'Peter McVries, Walker #61. The Self-Appointed Martyr. He didn\'t fall. He stopped.', type: 'elimination' },
    ],
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
    arcStages: [
      { arcPhase: 'introduction', mileRange: [0, 30], minConversations: 0, promptHint: 'You walk alone at the back. The player has to come to you. Speak rarely. Short, cutting observations. "Talking is a waste of energy."' },
      { arcPhase: 'opening_up', mileRange: [30, 150], minConversations: 1, promptHint: 'You warn about alliances. Cryptic, cold. "The ones who walk together die together." You know more than you let on.' },
      { arcPhase: 'vulnerability', mileRange: [150, 350], minConversations: 3, promptHint: 'Cracks in the armor. You are desperately lonely. You might hint that you know the Major personally. Be bitter, not self-pitying.' },
      { arcPhase: 'crisis', mileRange: [350, 390], minConversations: 5, promptHint: 'The certainty is crumbling. You believed the system would save you — that he would intervene. The doubt is corrosive. You cannot maintain detachment when your life depends on a father who may not care.' },
      { arcPhase: 'farewell', mileRange: [390, 400], minConversations: 0, promptHint: 'The revelation: The Major is your father. You entered to prove yourself to a man who sees you as disposable. You believed he would intervene. He won\'t.' },
    ],
    declineNarratives: [
      'Stebbins is further back than usual. His stride, always precise, has developed a slight hitch.',
      'For the first time, Stebbins looks surprised. As if the Walk is something that happens to other people.',
    ],
    eliminationScene: [
      { text: 'Stebbins stumbles. For a moment his expression is one of pure surprise — not at the stumble, but at the realization that no one is coming to save him.', type: 'narration' },
      { text: '"He was supposed to..." Stebbins whispers. He doesn\'t finish the sentence. The Major\'s illegitimate son, walking to prove himself to a father who never looked back.', type: 'narration' },
      { text: 'Stebbins, Walker #88. The Oracle. He believed the system had a heart. It doesn\'t.', type: 'elimination' },
    ],
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
    arcStages: [
      { arcPhase: 'introduction', mileRange: [0, 15], minConversations: 0, promptHint: 'All swagger. "I\'m gonna win this thing." Loud, boastful, dismissive. You genuinely believe your athleticism makes you invincible.' },
      { arcPhase: 'opening_up', mileRange: [15, 60], minConversations: 1, promptHint: 'Still confident but quieter. The first cracks: a twinge in your knee, tiredness you didn\'t expect. Mask it with bravado.' },
      { arcPhase: 'vulnerability', mileRange: [60, 95], minConversations: 2, promptHint: 'The knee is bad. You\'re limping. The bravado is forced now. If the player is kind, you might admit you\'re scared. If not, you lash out.' },
      { arcPhase: 'crisis', mileRange: [95, 115], minConversations: 0, promptHint: 'Breaking down. Screaming, begging, denial. "I\'m FINE." You are not fine. The strong man reduced to a terrified boy.' },
      { arcPhase: 'farewell', mileRange: [105, 115], minConversations: 0, promptHint: 'The bravado is gone. Just a scared boy. If the player is nearby, you might reach out one last time — not for help, but for someone to see you as you were before this.' },
    ],
    declineNarratives: [
      'Olson is limping badly now. He keeps saying "I\'m fine" to no one in particular.',
      'Olson\'s jaw is clenched so tight you can see the muscles jumping. Every step costs him.',
      'Olson stumbles and nearly goes down. When he gets up, the bravado is gone. Just fear.',
      'Olson is screaming at the road. At the sky. At no one. Other walkers give him a wide berth.',
    ],
    eliminationScene: [
      { text: 'Olson is screaming. Not words anymore — just sound. Raw, animal terror. The boy who was going to win through sheer physical dominance can barely stand.', type: 'narration' },
      { text: 'He looks at the walkers passing him. At the faces that won\'t look back. "Please," he says. Just that one word. "Please."', type: 'narration' },
      { text: 'Hank Olson, Walker #70. The False Champion. He entered believing his body would carry him. His body betrayed him first.', type: 'elimination' },
    ],
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
    arcStages: [
      { arcPhase: 'introduction', mileRange: [0, 15], minConversations: 0, promptHint: 'Warm, welcoming. "You look like you could use a friend." Tell a story about home, about your dog. Southern charm that feels genuine.' },
      { arcPhase: 'opening_up', mileRange: [15, 80], minConversations: 2, promptHint: 'You give practical advice — food spacing, pacing. You tell longer stories about Alabama. You\'re the campfire in the nightmare.' },
      { arcPhase: 'vulnerability', mileRange: [80, 160], minConversations: 4, promptHint: 'You don\'t know why you entered. That bothers you. The stories are getting shorter. You lean on the player now as much as they lean on you.' },
      { arcPhase: 'crisis', mileRange: [160, 185], minConversations: 5, promptHint: 'The stories are breaking apart. You start them and lose the thread. You know what\'s coming. You don\'t want to burden anyone but you\'re afraid. Admit it — to the player, to yourself.' },
      { arcPhase: 'farewell', mileRange: [185, 205], minConversations: 0, promptHint: 'Your body is failing but you keep telling stories. Fragments now. You start one about your dog Jasper and can\'t finish it. Be gentle. Be brave.' },
    ],
    declineNarratives: [
      'Baker\'s stories are getting shorter. He starts one about a fishing trip, then trails off.',
      'Baker is limping now. He smiles when he catches you looking. The smile doesn\'t reach his eyes.',
      'Baker starts a story about his dog Jasper and can\'t remember how it ends. He laughs softly. "Well," he says. "You get the idea."',
    ],
    eliminationScene: [
      { text: 'Baker is telling a story. You\'ve heard a hundred of them by now — about Alabama, about Jasper, about fishing holes and summer rain. This one is about a barn owl that lived in his uncle\'s roof.', type: 'narration' },
      { text: '"It used to swoop down and—" He stops mid-sentence. Not dramatically. Just... stops. Like a record player reaching the end of a side.', type: 'narration' },
      { text: 'Art Baker, Walker #3. The Heart. He died the way he lived — quietly, gently, mid-sentence, with a story unfinished.', type: 'elimination' },
    ],
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
    arcStages: [
      { arcPhase: 'introduction', mileRange: [0, 20], minConversations: 0, promptHint: 'Needling, taunting, looking for a reaction. You provoke because it\'s the only way you know how to connect. "I\'ll dance on your grave."' },
      { arcPhase: 'opening_up', mileRange: [20, 120], minConversations: 1, promptHint: 'Ostracized. Everyone hates you and you pretend that\'s what you wanted. If the player talks to you, be suspicious — nobody talks to you willingly.' },
      { arcPhase: 'vulnerability', mileRange: [120, 230], minConversations: 2, promptHint: 'The mask slips. You\'re desperately lonely. You\'ve never been loved. If the player shows genuine kindness, you don\'t know how to handle it. Might lash out or go quiet.' },
      { arcPhase: 'crisis', mileRange: [230, 250], minConversations: 0, promptHint: 'Unraveling. You promised to dance on their graves. And now you\'re going to. The madness is setting in. You laugh at things that aren\'t funny.' },
      { arcPhase: 'farewell', mileRange: [245, 255], minConversations: 0, promptHint: 'The dance is coming. If the player was kind to you — the only one who ever was — there might be one last flicker of the real you underneath. "You didn\'t have to talk to me." Then the madness takes over.' },
    ],
    declineNarratives: [
      'Barkovitch walks alone in a bubble of empty space. No one will walk within ten feet of him.',
      'Barkovitch is talking to himself. Laughing at something. The laughter has an edge to it that makes your skin crawl.',
      'Barkovitch catches you looking and grins. "Still here," he says. "I\'m still here and they\'re not."',
    ],
    eliminationScene: [
      { text: 'Barkovitch begins to dance. Not gracefully — a lurching, manic, broken dance on the asphalt. His eyes are wild. "I TOLD YOU!" he screams. "I TOLD YOU I\'D DANCE ON YOUR GRAVES!"', type: 'narration' },
      { text: 'He spins, stumbles, keeps dancing. The other walkers watch in horrified silence. Some look away. It is the most terrifying and the most pitiable thing you have ever seen.', type: 'narration' },
      { text: 'Gary Barkovitch, Walker #5. The Pariah. He danced. Just like he promised.', type: 'elimination' },
    ],
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
    arcStages: [
      { arcPhase: 'introduction', mileRange: [0, 30], minConversations: 0, promptHint: 'Confrontational, suspicious. Testing the player. "You think this is fair? You think any of this is fair?" Blunt, profane, direct.' },
      { arcPhase: 'opening_up', mileRange: [30, 120], minConversations: 2, promptHint: 'If the player agrees the system is broken, you respect them. Working-class anger. Talk about where you come from, what the Prize would mean.' },
      { arcPhase: 'vulnerability', mileRange: [120, 240], minConversations: 3, promptHint: 'The anger is becoming focused. You\'re planning something. You hint at making a break for it. Not suicidal — defiant. You refuse to die walking.' },
      { arcPhase: 'crisis', mileRange: [240, 265], minConversations: 4, promptHint: 'You\'re committed. The plan is real. You talk about what it means to choose how you go. Ask the player if they think anyone remembers the walkers who just stopped. You won\'t be one of them.' },
      { arcPhase: 'farewell', mileRange: [265, 285], minConversations: 0, promptHint: 'You\'ve decided. You\'re going to make a run for it. Not to escape — to make a statement. Let them shoot you running, not walking. Tell the player to remember.' },
    ],
    declineNarratives: [
      'Parker\'s jaw is set. He keeps looking at the soldiers on the halftrack with an expression that makes you nervous.',
      'Parker mutters: "Running, not walking. That\'s how I go." He doesn\'t seem to be talking to anyone.',
      'Parker\'s fists are clenched at his sides. He\'s coiled like a spring.',
    ],
    eliminationScene: [
      { text: 'Parker breaks from the pack. Not stumbling, not falling — running. Sprinting toward the halftrack perimeter with everything he has left.', type: 'narration' },
      { text: 'It is the most beautiful and futile thing you have ever seen. A working-class kid from Indiana charging the machine that is going to kill him. He goes down running, not walking.', type: 'narration' },
      { text: 'Collie Parker, Walker #34. The Rebel. He refused to die on their terms.', type: 'elimination' },
    ],
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
    arcStages: [
      { arcPhase: 'introduction', mileRange: [0, 30], minConversations: 0, promptHint: 'Friendly, earnest, simple. Talk about Cathy, your wife. She\'s pregnant — due in four months. You entered for the Prize money. No guile.' },
      { arcPhase: 'opening_up', mileRange: [30, 100], minConversations: 2, promptHint: 'You\'re the strongest walker out here and you know it. But you talk about Cathy constantly. The Prize isn\'t abstract to you — it\'s diapers and a house.' },
      { arcPhase: 'vulnerability', mileRange: [100, 145], minConversations: 3, promptHint: 'The cold got you. You\'re coughing. You deny it — "Just a cold." But the fever is rising. You\'re terrified not of dying but of leaving Cathy alone.' },
      { arcPhase: 'crisis', mileRange: [145, 170], minConversations: 4, promptHint: 'You can\'t deny it anymore. The pneumonia is killing you. You need the others to promise — promise to take care of Cathy. The pact matters more than your pride. Beg if you have to.' },
      { arcPhase: 'farewell', mileRange: [170, 185], minConversations: 0, promptHint: 'You know you\'re dying. The pact — the others swore to take care of Cathy. Walk as far as you can. Every step is for her.' },
    ],
    declineNarratives: [
      'Scramm\'s cough has gotten deeper. Wet. He waves off concerned looks. "Just a cold."',
      'Scramm is shivering despite the temperature. The fever is visible now — his face is flushed, his eyes glassy.',
      'Scramm stumbles and catches himself. He whispers "Cathy" like it\'s the only word keeping his legs moving.',
      'Scramm\'s lips are moving silently. He\'s talking to someone who isn\'t here. Maybe praying.',
    ],
    eliminationScene: [
      { text: 'Scramm walks. Step after impossible step. The strongest boy on the road, brought down by rain and a cold that became pneumonia. His lips move constantly — Cathy, Cathy, Cathy.', type: 'narration' },
      { text: 'He looks up at the walkers around him. At the ones who swore the pact. "Take care of her," he says. Not a question. A command. The last thing a dying man can give.', type: 'narration' },
      { text: 'Scramm, Walker #45. The Gentle Giant. He walked until his body physically could not carry him one more step. And then he walked one more.', type: 'elimination' },
    ],
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
    arcStages: [
      { arcPhase: 'introduction', mileRange: [0, 30], minConversations: 0, promptHint: 'Writing in your notebook. Precise, measured. You ask the player questions — data gathering. "What made you sign up?" You\'re documenting, not bonding.' },
      { arcPhase: 'opening_up', mileRange: [30, 100], minConversations: 2, promptHint: 'You share your statistics with the player. Average elimination mile. Survival curves. You find patterns comforting. But you\'re starting to care about the walkers as people, not data.' },
      { arcPhase: 'vulnerability', mileRange: [100, 190], minConversations: 3, promptHint: 'The notebook is getting harder to hold. You realize documenting horror doesn\'t protect you from feeling it. Share an entry with the player. Let them see you.' },
      { arcPhase: 'crisis', mileRange: [190, 210], minConversations: 4, promptHint: 'Your hands are shaking. The entries are getting illegible. You question whether documenting any of this matters — will anyone read it? Will it change anything? The detachment that protected you is gone.' },
      { arcPhase: 'farewell', mileRange: [210, 225], minConversations: 0, promptHint: 'The notebook. You know you can\'t carry it much further. It matters to you that someone reads it. That the Walk is remembered as it really was.' },
    ],
    declineNarratives: [
      'Harkness is writing slower. His usually precise handwriting wanders across the page.',
      'Harkness stares at his notebook for a long time without writing anything.',
      'Harkness\'s pen slips from his fingers. He picks it up, looks at it like he\'s forgotten what it\'s for.',
    ],
    eliminationScene: [
      { text: 'Harkness stops writing. He looks at his notebook — filled with data, observations, the cold mathematics of death — and then he looks at the road.', type: 'narration' },
      { text: 'He lets the notebook fall. It hits the asphalt and the pages flutter open. Mile counts, elimination times, weather patterns. The entire Walk, documented in careful handwriting.', type: 'narration' },
      { text: 'Harkness, Walker #49. The Witness. He wrote it all down. Somebody should pick up that notebook.', type: 'elimination' },
    ],
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

// --- NPC RELATIONSHIP ARCS (overheard conversations between walkers) ---

export const NPC_RELATIONSHIPS: NPCRelationship[] = [
  // 1. Garraty-McVries: friendship → brotherhood (5 stages)
  {
    walkerA: 47, walkerB: 61, type: 'friendship',
    stages: [
      { id: 'rel_garraty_mcvries_1', mileRange: [3, 8], scenePrompt: 'Garraty and McVries are meeting for the first time. McVries notices Garraty is from Maine — "local boy." Light, sizing each other up. McVries is sarcastic, Garraty is earnest. The beginning of something.' },
      { id: 'rel_garraty_mcvries_2', mileRange: [33, 42], scenePrompt: 'Garraty and McVries discuss why they entered the Walk. Neither has a good answer. They bond over the shared absurdity of volunteering to die.', previousContext: 'At mile 3, they met — McVries tested Garraty with sarcasm, Garraty passed.' },
      { id: 'rel_garraty_mcvries_3', mileRange: [73, 85], scenePrompt: 'McVries finally talks about his scar. The girl named Priscilla. He did it to himself. This is an intimate, painful confession — not casual.', previousContext: 'They\'ve been walking together for 70 miles now. McVries trusts Garraty enough to be vulnerable.' },
      { id: 'rel_garraty_mcvries_4', mileRange: [195, 215], scenePrompt: 'Late-walk philosophical conversation. Who deserves to win? Can you deserve to survive? McVries is fatalistic, Garraty still believes in something.', previousContext: 'They\'ve been through Olson\'s death, Scramm\'s illness. The Walk has stripped away pretense.' },
      { id: 'rel_garraty_mcvries_5', mileRange: [315, 340], scenePrompt: 'The last real conversation. McVries knows he\'s going to stop soon. Garraty senses it. Neither says it directly. The most they\'ve ever said by saying nothing.', previousContext: 'Best friends forged in a death march. McVries entered to die. Garraty is starting to understand that.' },
    ],
  },
  // 2. McVries-Barkovitch: conflict → hatred → pity (3 stages)
  {
    walkerA: 61, walkerB: 5, type: 'conflict',
    stages: [
      { id: 'rel_mcvries_barkovitch_1', mileRange: [19, 28], scenePrompt: 'McVries confronts Barkovitch after the incident where Barkovitch goaded a walker into a warning. Heated, angry. McVries threatens. Barkovitch grins.', previousContext: 'Barkovitch just caused another walker\'s death through psychological manipulation.' },
      { id: 'rel_mcvries_barkovitch_2', mileRange: [145, 165], scenePrompt: 'McVries watches Barkovitch walking alone, isolated by the other walkers. A flash of pity crosses his face. "He\'s going to die alone," McVries murmurs.', previousContext: 'Months of Barkovitch being ostracized. McVries hated him. Now he feels something closer to sorrow.' },
      { id: 'rel_mcvries_barkovitch_3', mileRange: [235, 248], scenePrompt: 'Barkovitch is losing it. McVries watches. "Nobody should die like that," he says. "Not even him." The conflict has resolved into weary pity.', previousContext: 'Barkovitch is approaching his end. The hatred has burned away. Only exhaustion and pity remain.' },
    ],
  },
  // 3. Baker-Scramm: mentorship → grief (3 stages)
  {
    walkerA: 3, walkerB: 45, type: 'mentorship',
    stages: [
      { id: 'rel_baker_scramm_1', mileRange: [10, 18], scenePrompt: 'Baker tells Scramm about his dog Jasper. Scramm talks about Cathy, his pregnant wife. Two simple men sharing what matters. Warm, gentle.', previousContext: 'Early walk. Everyone still has energy for stories.' },
      { id: 'rel_baker_scramm_2', mileRange: [95, 110], scenePrompt: 'Scramm starts coughing after the rain. Baker is worried — keeps glancing at Scramm. "You should take it easy," Baker says. Scramm waves him off. Baker knows.', previousContext: 'Baker and Scramm have been walking near each other for 100 miles. Baker told stories, Scramm talked about Cathy.' },
      { id: 'rel_baker_scramm_3', mileRange: [160, 172], scenePrompt: 'Baker and Scramm have a conversation about Cathy and the baby. Baker swears to take care of her if he wins. His voice breaks. He knows neither of them will win.', previousContext: 'Scramm is dying from pneumonia. Baker is declining too. The pact for Cathy is the most human thing left on the road.' },
    ],
  },
  // 4. Garraty-Stebbins: curiosity → understanding (3 stages)
  {
    walkerA: 47, walkerB: 88, type: 'shared_suffering',
    stages: [
      { id: 'rel_garraty_stebbins_1', mileRange: [23, 32], scenePrompt: 'Garraty drifts to the back and finds Stebbins walking alone. Stebbins gives a cryptic warning: alliances are a way to guarantee you watch your friends die. Cold, cutting.', previousContext: 'No one talks to Stebbins. He walks alone at the back. Garraty is curious.' },
      { id: 'rel_garraty_stebbins_2', mileRange: [145, 165], scenePrompt: 'Stebbins lets slip that he knows things about the Walk that he shouldn\'t. How the scoring works. What happens to winners. Garraty pushes but Stebbins deflects.', previousContext: 'They\'ve spoken once before. Stebbins warned about alliances. Garraty is beginning to trust him — or at least find him fascinating.' },
      { id: 'rel_garraty_stebbins_3', mileRange: [345, 370], scenePrompt: 'Near the end. Stebbins, exhausted, hints at his secret: the Major is his father. Bitter, resigned. Garraty doesn\'t know what to say. The loneliest boy on the road.', previousContext: 'The Walk has stripped everything. Only a handful of walkers remain. Stebbins has been alone for 350 miles.' },
    ],
  },
  // 5. Parker-Garraty: suspicion → respect (2 stages)
  {
    walkerA: 34, walkerB: 47, type: 'rivalry',
    stages: [
      { id: 'rel_parker_garraty_1', mileRange: [45, 60], scenePrompt: 'Parker rants about the system — the Walk, the Major, the Prize. Tests Garraty: "You think this is normal? You think we should be grateful?" Parker is angry but needs someone to agree.', previousContext: 'Parker is a working-class kid from Indiana who entered with a chip on his shoulder.' },
      { id: 'rel_parker_garraty_2', mileRange: [195, 215], scenePrompt: 'Parker and Garraty have a quiet moment. Parker has grudging respect. "You\'re still here. Most of the loudmouths are gone." Parker hints he\'s planning something.', previousContext: 'They\'ve walked 200 miles. Parker\'s rage has crystallized into something purposeful.' },
    ],
  },
  // 6. Olson-McVries: swagger → collapse (2 stages)
  {
    walkerA: 70, walkerB: 61, type: 'shared_suffering',
    stages: [
      { id: 'rel_olson_mcvries_1', mileRange: [4, 10], scenePrompt: 'Olson boasts about his athletic record, how he\'s going to win. McVries watches with a mixture of amusement and pity. "Sure you are, big man," McVries says mildly.', previousContext: 'First hours of the Walk. Everyone is still fresh. Olson is the loudest.' },
      { id: 'rel_olson_mcvries_2', mileRange: [88, 100], scenePrompt: 'McVries can\'t look away from Olson\'s deterioration. The boastful kid is breaking. McVries feels guilty for the pity he didn\'t show earlier. "I should\'ve been nicer to him."', previousContext: 'Olson was the loudest walker at mile 5. Now he\'s limping, desperate, losing his mind.' },
    ],
  },
  // 7. Harkness-Baker: chronicler meets storyteller (2 stages)
  {
    walkerA: 49, walkerB: 3, type: 'friendship',
    stages: [
      { id: 'rel_harkness_baker_1', mileRange: [28, 40], scenePrompt: 'Harkness interviews Baker for his notebook. "Tell me a story." Baker is delighted someone wants to listen. Harkness writes it all down in his careful handwriting.', previousContext: 'Harkness documents everything. Baker tells stories. They are a natural pair.' },
      { id: 'rel_harkness_baker_2', mileRange: [145, 165], scenePrompt: 'Baker\'s stories are getting shorter, more fragmented. Harkness notices but keeps writing. Then he stops. Puts the pen down. Just listens. The chronicler becoming human.', previousContext: 'Harkness has been documenting Baker\'s stories for 130 miles. The stories are fading as Baker fades.' },
    ],
  },
  // 8. Scramm-Garraty: innocence → the pact (3 stages)
  {
    walkerA: 45, walkerB: 47, type: 'friendship',
    stages: [
      { id: 'rel_scramm_garraty_1', mileRange: [50, 65], scenePrompt: 'Scramm talks about Cathy. She\'s due in four months. He\'s going to win and buy her a house. His sincerity is so total it hurts. Garraty doesn\'t have the heart to doubt him.', previousContext: 'Scramm is physically the strongest walker. His simplicity is disarming.' },
      { id: 'rel_scramm_garraty_2', mileRange: [125, 140], scenePrompt: 'Scramm is coughing badly. Garraty walks close, tries to shield him from the wind. Scramm: "It\'s just a cold, Ray." They both know it isn\'t.', previousContext: 'Scramm caught a cold in the rain at mile 105. Baker is worried. Garraty is worried. Scramm denies it.' },
      { id: 'rel_scramm_garraty_3', mileRange: [165, 175], scenePrompt: 'The pact. McVries proposes it. Garraty seconds it. All the remaining walkers nearby swear: if any of them win, they take care of Cathy and the baby. Scramm hears through his fever.', previousContext: 'Scramm is dying. The fever is eating him. The pact for Cathy is the most human moment on the road.' },
    ],
  },
];

// --- COMPLETE ROSTER ---

export const ALL_WALKERS: WalkerData[] = [
  ...TIER_1,
  ...TIER_2,
  ...generateTier3(),
].sort((a, b) => a.walkerNumber - b.walkerNumber);
