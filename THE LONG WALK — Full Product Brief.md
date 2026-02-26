# **THE LONG WALK — Full Product Brief**

### **Survival / Psychological Endurance Simulation**

### **Based on *The Long Walk* by Stephen King (as Richard Bachman, 1979\)**

**Document Version:** 1.0 **Prepared by:** Walker-1 (Senior Game Designer & Narrative Architect) **Target Build Tool:** Claude Code (Anthropic) **Date:** February 2026

---

## **Table of Contents**

1. Executive Summary  
2. Game Overview & Concept  
3. The Player Character  
4. Canon Walker Roster — Full NPC Data  
5. Core Game Mechanics  
6. Narrative Structure & Pacing  
7. Dialogue & Relationship System  
8. Psychological Horror Layer  
9. UI/UX Design Specification  
10. Game State Schema  
11. Tech Stack & Architecture  
12. Implementation Phases & Milestones  
13. Claude Code Prompt Chains  
14. Dialogue Samples  
15. Tone & Design Principles  
16. Appendix A — Elimination Order  
17. Appendix B — Route & Environment Map  
18. Appendix C — Crowd Behavior Model

---

## **1\. Executive Summary**

**The Long Walk** is a single-player, web-based survival simulation and psychological horror game. The player is one of 100 teenage boys forced to walk south along a road without stopping. Drop below 4 mph and you get a warning. Three warnings and you're eliminated — permanently. The last walker standing wins The Prize: anything they want for the rest of their life.

The game is not about combat, reflexes, or power fantasies. It is about **endurance, human connection, psychological degradation, and the slow horror of inevitability**. The player must manage physical stats (stamina, hydration, pain), social relationships (alliances, rivalries, trust), and their own psychological state (morale, clarity, hallucinations) while walking a road that never ends.

All 99 NPC walkers are drawn from Stephen King's original novel. The player is **Walker \#100**, an outsider from the fictional 51st state of New Columbia, inserted into the canon events as a new variable.

**Target Experience:** 4–8 hours of playtime per full run. The game should feel like reading the book — a slow, creeping, deeply personal descent.

---

## **2\. Game Overview & Concept**

### **2.1 Setting**

An alternate-history United States where a yearly event called The Long Walk is a nationally televised institution. 100 boys between 16 and 18 volunteer (ostensibly). The walk begins at the Maine/Canada border and heads south along Route 1\. The walk continues until only one walker remains.

The walk is governed by **The Major**, a military authority figure who represents the totalitarian undertones of this society. The walkers are followed by a military half-track convoy that enforces the rules and carries out eliminations.

### **2.2 Core Premise**

* **100 walkers** start. 1 finishes.  
* Maintain **4 mph minimum** at all times.  
* **3 warnings** \= elimination (a walker "buys their ticket").  
* Warnings can be **walked off**: 1 warning removed per hour of clean walking (no new infractions).  
* Walkers can request **food and water** from a belt mechanism on the half-track, but cannot stop to eat.  
* There is **no rest, no sleep, no stopping**. The walk continues 24 hours a day.  
* The crowd watches from the roadside. Their mood shifts as the walk progresses.

### **2.3 Genre Tags**

`survival` · `psychological horror` · `narrative simulation` · `endurance` · `interactive fiction` · `character-driven`

### **2.4 Platform**

Web browser (desktop primary, tablet secondary). No mobile optimization required for v1.

---

## **3\. The Player Character**

### **3.1 Identity**

* **Walker Number:** \#100  
* **Origin:** New Columbia — the 51st state, a recently admitted territory (fictional). This makes the player a geographic and cultural outsider. The other walkers are curious, suspicious, or dismissive.  
* **Name:** Player-chosen at game start.  
* **Age:** Player-chosen (16, 17, or 18). Affects some NPC dialogue.

### **3.2 Character Creation (Game Start)**

At the start of the game, before the walk begins, the player makes the following choices:

#### **3.2.1 Name**

Free text input. Used in all NPC dialogue addressing the player.

#### **3.2.2 Age**

Select 16, 17, or 18\. Affects:

* NPC dialogue (younger \= more patronizing from some, more protective from others)  
* Slight stamina curve differences (younger \= slightly better recovery, older \= slightly better baseline endurance)

#### **3.2.3 Why Did You Enter?**

Select one:

* **"To prove something."** → NPCs perceive the player as driven, competitive. Garners respect from walkers like Olson, suspicion from McVries.  
* **"I don't know."** → NPCs perceive the player as lost, possibly reckless. Garners sympathy from Garraty, philosophical interest from Stebbins.  
* **"For someone else."** → NPCs perceive the player as self-sacrificing. Garners warmth from Baker, curiosity from Scramm (who entered for his wife).  
* **"For The Prize."** → NPCs perceive the player as pragmatic or greedy. Garners kinship from Barkovitch, wariness from McVries.

#### **3.2.4 What Would Your Prize Be?**

Free text input. Stored as `player_prize`. This string is reflected back in NPC dialogue at key moments:

* Mile 50: An NPC asks, "So what's your Prize?"  
* Mile 150: The player hallucinates their Prize during a fatigue event.  
* Endgame: The Prize echoes in the final narrative beats.

### **3.3 Player Stats**

| Stat | Range | Description |
| ----- | ----- | ----- |
| `stamina` | 0–100 | Physical energy. Degrades constantly. Affected by terrain, weather, injuries. At 0 \= collapse (warning). |
| `speed` | 0–7 mph | Current walking speed. Below 4.0 \= warning issued. Player controls this via input. |
| `hydration` | 0–100 | Water level. Degrades over time. Replenished by requesting water. Low hydration accelerates stamina loss. |
| `hunger` | 0–100 | Food satiation. Degrades over time. Replenished by requesting food. Low hunger reduces stamina recovery. |
| `pain` | 0–100 | Physical pain (blisters, cramps, injuries). Increases over time. High pain reduces max speed and drains morale. |
| `morale` | 0–100 | Psychological state. Affected by NPC interactions, eliminations, crowd behavior, and personal events. Low morale accelerates stamina loss and triggers despair events. |
| `clarity` | 0–100 | Mental sharpness. Degrades with sleep deprivation. Below 30 \= hallucination events. Below 10 \= unreliable UI. |
| `warnings` | 0–3 | Current warning count. At 3 \= game over. |
| `warning_timer` | Seconds | Time since last warning. At 3600 seconds (1 hour) with no new warning, one warning is removed. |
| `miles_walked` | Float | Total distance covered. Primary progression metric. |
| `hours_elapsed` | Float | Total time elapsed. Drives day/night cycle and fatigue. |

**4\. Canon Walker Roster — Full NPC Data**

### **4.1 Data Model**

Every walker NPC uses the following schema:

json

```json
{
  "name": "string",
  "walker_number": "integer",
  "age": "integer (16-18)",
  "home_state": "string",
  "personality_traits": ["string"],
  "dialogue_style": "string",
  "backstory_notes": "string",
  "relationship_to_player": "string (hostile|wary|neutral|curious|friendly)",
  "elimination_mile": "integer (approximate)",
  "elimination_narrative_beat": "string",
  "key_scenes": ["string"],
  "alliance_potential": "string (none|low|medium|high)",
  "physical_state": "string (strong|average|weak)",
  "psychological_archetype": "string",
  "walking_position": "string (front|middle|back)"
}
```

### **4.2 Major NPCs (Tier 1 — Full Dialogue Trees Required)**

---

#### **Ray Garraty — Walker \#47**

json

```json
{
  "name": "Raymond Davis Garraty",
  "walker_number": 47,
  "age": 17,
  "home_state": "Maine",
  "personality_traits": ["thoughtful", "empathetic", "stubborn", "internally conflicted", "loyal"],
  "dialogue_style": "Conversational and warm, becomes increasingly raw and fragmented as exhaustion mounts. Asks questions. Shares vulnerabilities.",
  "backstory_notes": "From Pownal, Maine. Has a girlfriend named Jan. His father was 'Squaded' — disappeared by the authoritarian regime for unclear reasons. Entered the Walk partly out of a death wish he doesn't fully understand. The protagonist of the novel.",
  "relationship_to_player": "curious",
  "elimination_mile": 400,
  "elimination_narrative_beat": "Survives to the final stretch. In the novel he is the last walker standing but is psychologically shattered. In the game, Garraty is one of the final NPCs — his fate depends on whether the player survives longer.",
  "key_scenes": [
    "Befriending the player early (mile 5-15)",
    "Conversation about why they entered (mile 30)",
    "Reaction to Olson's breakdown (mile 80-100)",
    "Jan sighting at the roadside crowd (mile 130-140)",
    "Despair spiral after McVries is eliminated",
    "Final stretch delirium — talking to people who aren't there",
    "The dark figure scene — sees something on the road ahead"
  ],
  "alliance_potential": "high",
  "physical_state": "average",
  "psychological_archetype": "The Everyman — the reader/player's anchor to humanity",
  "walking_position": "middle"
}
```

---

#### **Peter McVries — Walker \#61**

json

```json
{
  "name": "Peter McVries",
  "walker_number": 61,
  "age": 17,
  "home_state": "Connecticut",
  "personality_traits": ["witty", "self-destructive", "perceptive", "sardonic", "surprisingly tender"],
  "dialogue_style": "Sharp, sarcastic, often deflects with humor. Becomes more sincere and philosophical as the walk progresses. Has a poet's instinct buried under cynicism.",
  "backstory_notes": "Has a prominent scar on his face from a girl named Priscilla who attacked him (or whom he provoked — the truth is ambiguous). Entered the Walk as a form of elaborate self-destruction. Forms the deepest bond with Garraty. Saves Garraty's life at least once.",
  "relationship_to_player": "wary",
  "elimination_mile": 350,
  "elimination_narrative_beat": "McVries reaches a point of acceptance. He has been walking to die from the beginning. His elimination is quiet and chosen — he simply stops walking. One of the most emotionally devastating moments in the novel.",
  "key_scenes": [
    "Testing the player with sharp questions (mile 10-20)",
    "Saving Garraty from a stumble (mile 50-60)",
    "The scar conversation — tells the story if trust is high (mile 80)",
    "Confrontation with Barkovitch (mile 100-120)",
    "Growing closeness with Garraty — philosophical night conversations",
    "His quiet decision to stop — the resignation scene"
  ],
  "alliance_potential": "high",
  "physical_state": "average",
  "psychological_archetype": "The Self-Appointed Martyr — walking toward death with open eyes",
  "walking_position": "middle"
}
```

---

#### **Stebbins — Walker \#88**

json

```json
{
  "name": "Stebbins",
  "walker_number": 88,
  "age": 18,
  "home_state": "Unknown (deliberately vague)",
  "personality_traits": ["enigmatic", "coldly intelligent", "detached", "provocative", "lonely"],
  "dialogue_style": "Speaks rarely and in short, cutting observations. Never wastes words. His dialogue should feel like being dissected. Occasionally offers genuine insight disguised as cruelty.",
  "backstory_notes": "Walks alone at the back of the pack. Reveals late in the walk that he is The Major's illegitimate son. Entered to prove himself to a father who sees him as disposable. The ultimate tragic figure — he thought The Major would save him, but The Major has no intention of doing so.",
  "relationship_to_player": "neutral",
  "elimination_mile": 399,
  "elimination_narrative_beat": "One of the last two or three walkers. In the novel, he is the second-to-last to fall. He collapses with a look of surprise — he genuinely believed The Major would intervene. His death is the final proof that the system has no mercy.",
  "key_scenes": [
    "First encounter — the player notices him walking alone at the back (mile 1-5)",
    "Cryptic warning to the player about alliances (mile 40)",
    "Reveals he knows more about the Walk's rules than anyone (mile 100)",
    "The Major revelation — whispered confession (mile 300+)",
    "Final collapse — shock and betrayal on his face"
  ],
  "alliance_potential": "none",
  "physical_state": "strong",
  "psychological_archetype": "The Oracle — knows the truth but is trapped by it",
  "walking_position": "back"
}
```

---

#### **Hank Olson — Walker \#70**

json

```json
{
  "name": "Hank Olson",
  "walker_number": 70,
  "age": 17,
  "home_state": "Massachusetts",
  "personality_traits": ["brash", "physically dominant", "insecure underneath", "bravado", "crumbles under pressure"],
  "dialogue_style": "Loud, boastful, talks about what he'll do when he wins. Uses humor as armor. Becomes increasingly desperate and unhinged as his body fails him.",
  "backstory_notes": "Athletic, popular. Entered the Walk convinced he'd win through sheer physical dominance. Represents the archetype of the overconfident competitor. His decline is prolonged, ugly, and deeply pitiable — the strongest body doesn't mean the strongest will.",
  "relationship_to_player": "wary",
  "elimination_mile": 110,
  "elimination_narrative_beat": "Olson's breakdown is one of the novel's most harrowing sequences. He begins screaming, raving, losing control of his bodily functions. The soldiers give him warnings but he can barely walk. His drawn-out elimination is a defining moment of horror — a strong man reduced to nothing.",
  "key_scenes": [
    "Boasting about his training and strength (mile 1-10)",
    "Challenging or mocking the player's outsider status (mile 15-25)",
    "First signs of trouble — limping, overheating (mile 60-70)",
    "The breakdown — screaming, begging, raving (mile 90-110)",
    "Other walkers' reactions to his prolonged deterioration"
  ],
  "alliance_potential": "low",
  "physical_state": "strong",
  "psychological_archetype": "The False Champion — strength without depth",
  "walking_position": "front"
}
```

---

#### **Art Baker — Walker \#3**

json

```json
{
  "name": "Art Baker",
  "walker_number": 3,
  "age": 17,
  "home_state": "Alabama (or another Southern state)",
  "personality_traits": ["kind", "grounded", "storyteller", "gentle", "quietly brave"],
  "dialogue_style": "Southern warmth. Tells long, winding stories about home — his family, his land, his dogs. Speaks softly. His dialogue should feel like a campfire in the middle of a nightmare.",
  "backstory_notes": "Comes from a rural background. Entered the Walk for reasons he doesn't fully articulate — possibly to escape poverty, possibly for the adventure. He is one of the most genuinely decent people on the Walk. His death hits hard because he deserved better.",
  "relationship_to_player": "friendly",
  "elimination_mile": 200,
  "elimination_narrative_beat": "Baker declines gradually. He keeps telling stories even as his body fails. He goes quietly, mid-sentence in a story about his dog. One of the saddest eliminations.",
  "key_scenes": [
    "Welcoming the player warmly as a fellow 'outsider' (mile 5-10)",
    "Stories about home — his dog, his grandmother's cooking (mile 20-50)",
    "Teaching the player about pacing and food timing (mile 30)",
    "Growing weaker — stories become fragmented (mile 150-180)",
    "Final story, interrupted"
  ],
  "alliance_potential": "high",
  "physical_state": "average",
  "psychological_archetype": "The Heart — the one who makes you feel this matters",
  "walking_position": "middle"
}
```

---

#### **Gary Barkovitch — Walker \#5**

json

```json
{
  "name": "Gary Barkovitch",
  "walker_number": 5,
  "age": 16,
  "home_state": "Connecticut (or another Northeast state)",
  "personality_traits": ["provocative", "vindictive", "insecure", "clever", "self-isolating"],
  "dialogue_style": "Needling, taunting, always looking for a reaction. Speaks to wound. Underneath it is desperate loneliness and self-loathing. Occasionally lets the mask slip.",
  "backstory_notes": "Universally disliked by the other walkers. He provokes a confrontation early that leads to another walker's death, cementing his pariah status. He promises to 'dance on their graves.' Despite his antagonism, he is pitiable — a teenager who has never been loved, acting out the only way he knows how.",
  "relationship_to_player": "hostile",
  "elimination_mile": 250,
  "elimination_narrative_beat": "Barkovitch's end is grim. He makes good on his promise to 'dance' — he dances on the road, raving, before being eliminated. It's horrifying and sad in equal measure.",
  "key_scenes": [
    "First provocation — taunting the player or another walker (mile 5-10)",
    "The incident that leads to another walker's elimination (mile 15-25)",
    "Being ostracized — walking alone, jeered at (mile 30-60)",
    "A rare moment of vulnerability if the player approaches with empathy (mile 100)",
    "The dance — his final, deranged scene"
  ],
  "alliance_potential": "none",
  "physical_state": "average",
  "psychological_archetype": "The Pariah — what happens when alienation turns toxic",
  "walking_position": "middle"
}
```

---

#### **Collie Parker — Walker \#34**

json

```json
{
  "name": "Collie Parker",
  "walker_number": 34,
  "age": 18,
  "home_state": "Indiana (or another Midwest state)",
  "personality_traits": ["confrontational", "working-class anger", "brave", "impulsive", "anti-authority"],
  "dialogue_style": "Blunt, profane, direct. Doesn't mince words. Has a strong sense of injustice. His anger is righteous but self-destructive.",
  "backstory_notes": "Working-class background. Entered the Walk with a chip on his shoulder about the system. He's the walker most likely to curse at the soldiers, challenge the rules, and rage against the machine. His anger is both his fuel and his undoing.",
  "relationship_to_player": "neutral",
  "elimination_mile": 280,
  "elimination_narrative_beat": "Parker makes a run for it — tries to break through the perimeter. It's a futile act of defiance. He goes down fighting, which is exactly how he would have wanted it.",
  "key_scenes": [
    "Confronting a soldier (mile 10-20)",
    "Ranting about the system to anyone who'll listen (mile 40-60)",
    "Grudging respect for the player if they show spine (mile 50-80)",
    "Planning his escape attempt (mile 200-270)",
    "The futile charge"
  ],
  "alliance_potential": "medium",
  "physical_state": "strong",
  "psychological_archetype": "The Rebel — rage against the dying of the light",
  "walking_position": "front"
}
```

---

#### **Scramm — Walker \#45**

json

```json
{
  "name": "Scramm",
  "walker_number": 45,
  "age": 18,
  "home_state": "Montana (or another Western state)",
  "personality_traits": ["strong", "simple", "good-natured", "devoted", "tragic"],
  "dialogue_style": "Plain-spoken, earnest, sincere. Talks about his wife and their plans. No guile whatsoever. His simplicity makes his tragedy hit harder.",
  "backstory_notes": "Married young — his wife Cathy is pregnant. He entered the Walk for the Prize money to support his family. He is the strongest walker physically. His decline begins when he catches a cold that turns into pneumonia — the strongest body brought low by something mundane. The other walkers, moved by his story, agree to chip in and support his wife if they win.",
  "relationship_to_player": "friendly",
  "elimination_mile": 180,
  "elimination_narrative_beat": "Scramm catches cold in the rain. Despite being the strongest walker, the illness drains him over the course of hours. He walks as long as he can, thinking of his wife. The group's agreement to support Cathy is one of the novel's most human moments.",
  "key_scenes": [
    "Talking about Cathy and the baby (mile 10-30)",
    "Demonstrating his physical dominance — barely sweating (mile 1-50)",
    "Getting caught in rain — the cold begins (mile 100-120)",
    "Decline — coughing, weakening, but still walking (mile 130-170)",
    "The pact — walkers agree to help his wife (mile 160-175)",
    "His quiet, determined final miles"
  ],
  "alliance_potential": "medium",
  "physical_state": "strong",
  "psychological_archetype": "The Gentle Giant — strength undone by fate",
  "walking_position": "front"
}
```

---

#### **Harkness — Walker \#49**

json

```json
{
  "name": "Harkness",
  "walker_number": 49,
  "age": 17,
  "home_state": "New Hampshire (or another New England state)",
  "personality_traits": ["observational", "quiet", "intellectual", "meticulous", "detached"],
  "dialogue_style": "Measured, precise. Asks probing questions not out of warmth but out of data-gathering instinct. Speaks like someone writing in their head. Short, declarative sentences.",
  "backstory_notes": "Walks while writing in a small notebook. He is documenting the Long Walk — keeping tallies, noting patterns, recording quotes. He represents the chronicler, the witness. His notebook is referenced by other characters. He may share insights from his observations if the player earns his trust.",
  "relationship_to_player": "curious",
  "elimination_mile": 220,
  "elimination_narrative_beat": "Harkness drops his notebook before his elimination. Whether someone picks it up becomes a minor but poignant detail.",
  "key_scenes": [
    "Scribbling in his notebook while walking (mile 1-10)",
    "Sharing a statistic or observation with the player (mile 30-50)",
    "Letting the player read a notebook entry (mile 80-100)",
    "A conversation about why he's documenting this (mile 120)",
    "Dropping the notebook"
  ],
  "alliance_potential": "low",
  "physical_state": "average",
  "psychological_archetype": "The Witness — recording so it means something",
  "walking_position": "middle"
}
```

---

#### **The Major — Non-Walker Authority**

json

```json
{
  "name": "The Major",
  "walker_number": null,
  "age": "Unknown (middle-aged)",
  "home_state": "N/A",
  "personality_traits": ["authoritarian", "calm", "paternal-veneer", "ruthless", "systemic"],
  "dialogue_style": "Formal, clipped military speech. Speaks to the walkers as if they are honored participants, not condemned boys. His politeness is the most terrifying thing about him.",
  "backstory_notes": "The architect and overseer of the Long Walk. Appears at the start to address the walkers, intermittently via the half-track, and his presence is felt throughout as the enforcing authority. Stebbins reveals he is The Major's illegitimate son. The Major does not save him.",
  "relationship_to_player": "N/A — not interactable in normal terms",
  "elimination_mile": null,
  "elimination_narrative_beat": "N/A",
  "key_scenes": [
    "Opening address to the walkers (mile 0)",
    "Half-track passes — the player glimpses him (mile 50, 150, 300)",
    "His shadow over Stebbins' revelation"
  ],
  "alliance_potential": "none",
  "physical_state": "N/A",
  "psychological_archetype": "The System — impersonal authority wearing a human mask",
  "walking_position": "N/A — in the half-track"
}
```

### **4.3 Supporting NPCs (Tier 2 — Limited Dialogue, Defined Personality)**

These walkers have fewer scripted interactions but are still named, have distinct personalities, and their eliminations are noted events.

json

```json
[
  {
    "name": "Curley",
    "walker_number": 7,
    "age": 16,
    "home_state": "Vermont",
    "personality_traits": ["nervous", "talkative", "young"],
    "dialogue_style": "Rapid, anxious chatter. Talks to cope with fear.",
    "backstory_notes": "One of the youngest walkers. In over his head from the start.",
    "relationship_to_player": "friendly",
    "elimination_mile": 20,
    "elimination_narrative_beat": "One of the very first eliminations. A shocking early death that establishes the stakes.",
    "key_scenes": ["Chatting nervously at the start", "His sudden collapse and elimination"],
    "alliance_potential": "low",
    "physical_state": "weak",
    "psychological_archetype": "The Canary — first to fall, signals danger",
    "walking_position": "middle"
  },
  {
    "name": "Ewing",
    "walker_number": 9,
    "age": 17,
    "home_state": "Ohio",
    "personality_traits": ["quiet", "steady", "unremarkable"],
    "dialogue_style": "Brief, functional. Doesn't seek conversation.",
    "backstory_notes": "A background walker. His elimination is a reminder that most of these boys are anonymous.",
    "relationship_to_player": "neutral",
    "elimination_mile": 60,
    "elimination_narrative_beat": "Eliminated without fanfare. The player may barely notice.",
    "key_scenes": ["A brief exchange about the weather", "His quiet exit"],
    "alliance_potential": "none",
    "physical_state": "average",
    "psychological_archetype": "The Anonymous — most walkers die without being known",
    "walking_position": "middle"
  },
  {
    "name": "Toland",
    "walker_number": 92,
    "age": 17,
    "home_state": "Pennsylvania",
    "personality_traits": ["friendly", "average", "hopeful"],
    "dialogue_style": "Optimistic small talk that becomes strained.",
    "backstory_notes": "Represents the ordinary boy who had no idea what he was getting into.",
    "relationship_to_player": "curious",
    "elimination_mile": 75,
    "elimination_narrative_beat": "Goes down on a hill. The terrain beat him.",
    "key_scenes": ["Bonding over being 'high numbers'", "Struggling on incline"],
    "alliance_potential": "low",
    "physical_state": "weak",
    "psychological_archetype": "The Everykid — could be anyone",
    "walking_position": "middle"
  },
  {
    "name": "Rank",
    "walker_number": 72,
    "age": 18,
    "home_state": "New York",
    "personality_traits": ["tough", "streetwise", "practical"],
    "dialogue_style": "Clipped, urban, no-nonsense.",
    "backstory_notes": "City kid. Doesn't romanticize the Walk.",
    "relationship_to_player": "neutral",
    "elimination_mile": 130,
    "elimination_narrative_beat": "Cramps take him. He fights it but can't recover.",
    "key_scenes": ["Practical advice about foot care", "His leg seizing up"],
    "alliance_potential": "low",
    "physical_state": "average",
    "psychological_archetype": "The Pragmatist",
    "walking_position": "middle"
  },
  {
    "name": "Percy",
    "walker_number": 31,
    "age": 16,
    "home_state": "Virginia",
    "personality_traits": ["religious", "devout", "gentle", "fearful"],
    "dialogue_style": "Prays aloud. Quotes scripture. Trembling voice.",
    "backstory_notes": "Entered believing God would protect him. His faith is tested.",
    "relationship_to_player": "friendly",
    "elimination_mile": 90,
    "elimination_narrative_beat": "Dies praying. The contrast between his faith and the Walk's brutality is stark.",
    "key_scenes": ["Praying at the start", "Offering to pray for the player", "Crisis of faith", "Final prayer"],
    "alliance_potential": "low",
    "physical_state": "weak",
    "psychological_archetype": "The Believer — faith vs. the machine",
    "walking_position": "back"
  },
  {
    "name": "Zuck",
    "walker_number": 98,
    "age": 17,
    "home_state": "Maine",
    "personality_traits": ["local", "proud", "chatty"],
    "dialogue_style": "Enthusiastic about being on home turf. Points out landmarks.",
    "backstory_notes": "From a town along the route. Excited when they pass through his area.",
    "relationship_to_player": "curious",
    "elimination_mile": 85,
    "elimination_narrative_beat": "Eliminated within sight of his hometown. Devastating irony.",
    "key_scenes": ["Pointing out landmarks", "Excitement as hometown approaches", "Falling just before reaching it"],
    "alliance_potential": "low",
    "physical_state": "average",
    "psychological_archetype": "The Local — so close to home, so far from safety",
    "walking_position": "middle"
  },
  {
    "name": "Abraham",
    "walker_number": 2,
    "age": 17,
    "home_state": "Georgia",
    "personality_traits": ["quiet", "internal", "stoic"],
    "dialogue_style": "Minimal. Nods more than speaks.",
    "backstory_notes": "A background presence. Rarely speaks but his silent endurance is notable.",
    "relationship_to_player": "neutral",
    "elimination_mile": 150,
    "elimination_narrative_beat": "Goes quietly. The group barely reacts — they've become numb.",
    "key_scenes": ["A wordless nod of acknowledgment to the player", "His silent end"],
    "alliance_potential": "none",
    "physical_state": "average",
    "psychological_archetype": "The Stoic",
    "walking_position": "back"
  },
  {
    "name": "Pearson",
    "walker_number": 60,
    "age": 17,
    "home_state": "Massachusetts",
    "personality_traits": ["intellectual", "anxious", "overthinks"],
    "dialogue_style": "Rapid analytical speech. Calculates odds aloud.",
    "backstory_notes": "A numbers guy. Keeps calculating survival probabilities, which terrifies him more.",
    "relationship_to_player": "curious",
    "elimination_mile": 100,
    "elimination_narrative_beat": "His anxiety overwhelms him before his body gives out.",
    "key_scenes": ["Sharing probability calculations", "Spiraling into panic over the math"],
    "alliance_potential": "low",
    "physical_state": "average",
    "psychological_archetype": "The Calculator — knowledge doesn't save you",
    "walking_position": "middle"
  },
  {
    "name": "Jensen",
    "walker_number": 52,
    "age": 18,
    "home_state": "Minnesota",
    "personality_traits": ["calm", "nordic stoicism", "enduring"],
    "dialogue_style": "Even-keeled. Doesn't waste energy on emotion.",
    "backstory_notes": "Farm boy. Built for endurance. Goes much further than expected.",
    "relationship_to_player": "neutral",
    "elimination_mile": 300,
    "elimination_narrative_beat": "His body simply gives out after extraordinary endurance. No drama. Just stops.",
    "key_scenes": ["A brief conversation about farming and patience", "His quiet collapse late in the walk"],
    "alliance_potential": "low",
    "physical_state": "strong",
    "psychological_archetype": "The Endurer — goes far, but not far enough",
    "walking_position": "middle"
  },
  {
    "name": "Wyman",
    "walker_number": 97,
    "age": 16,
    "home_state": "Rhode Island",
    "personality_traits": ["scared", "young", "regretful"],
    "dialogue_style": "Whispers. Cries quietly. Asks 'why did I do this' repeatedly.",
    "backstory_notes": "Entered on a dare. Regrets it immediately. Represents the horror of irreversible choice.",
    "relationship_to_player": "friendly",
    "elimination_mile": 40,
    "elimination_narrative_beat": "An early death that underscores how real this is. He's crying when he goes.",
    "key_scenes": ["Confiding that he entered on a dare", "Crying openly", "Begging someone to help"],
    "alliance_potential": "low",
    "physical_state": "weak",
    "psychological_archetype": "The Regretful — no take-backs",
    "walking_position": "back"
  },
  {
    "name": "Fenter",
    "walker_number": 18,
    "age": 17,
    "home_state": "Delaware",
    "personality_traits": ["jokester", "deflective", "anxious underneath"],
    "dialogue_style": "Constant jokes and one-liners. The humor gets darker as time passes.",
    "backstory_notes": "Uses humor as a coping mechanism. The group clown. When his jokes stop, it's a sign.",
    "relationship_to_player": "friendly",
    "elimination_mile": 120,
    "elimination_narrative_beat": "His last words are a punchline. It's unclear if it's brave or heartbreaking.",
    "key_scenes": ["Cracking jokes at the start", "Dark humor mid-walk", "The silence when jokes stop", "Final punchline"],
    "alliance_potential": "medium",
    "physical_state": "average",
    "psychological_archetype": "The Comedian — laughing so he doesn't scream",
    "walking_position": "middle"
  },
  {
    "name": "Klingerman",
    "walker_number": 55,
    "age": 18,
    "home_state": "Florida",
    "personality_traits": ["aggressive", "competitive", "suspicious"],
    "dialogue_style": "Combative. Sees everyone as a rival. Speaks in short, clipped bursts.",
    "backstory_notes": "Entered to win, no other reason. Views every interaction through a competitive lens.",
    "relationship_to_player": "hostile",
    "elimination_mile": 160,
    "elimination_narrative_beat": "Tries to psych out a rival, trips, and can't recover. Ironic.",
    "key_scenes": ["Trying to intimidate the player", "Picking fights with other walkers", "His ironic stumble"],
    "alliance_potential": "none",
    "physical_state": "strong",
    "psychological_archetype": "The Competitor — winning isn't everything, it's the only thing (until it isn't)",
    "walking_position": "front"
  },
  {
    "name": "Travin",
    "walker_number": 91,
    "age": 17,
    "home_state": "Michigan",
    "personality_traits": ["musical", "dreamy", "escapist"],
    "dialogue_style": "Hums songs. Talks about music. Drifts into reverie.",
    "backstory_notes": "Plays guitar back home. Uses music as a mental escape during the walk.",
    "relationship_to_player": "friendly",
    "elimination_mile": 140,
    "elimination_narrative_beat": "Humming a song when he goes. The song cuts off mid-note.",
    "key_scenes": ["Humming walking rhythms", "Talking about bands and songs", "The song that stops"],
    "alliance_potential": "low",
    "physical_state": "average",
    "psychological_archetype": "The Dreamer — somewhere else in his head",
    "walking_position": "middle"
  },
  {
    "name": "Gallant",
    "walker_number": 20,
    "age": 17,
    "home_state": "Iowa",
    "personality_traits": ["earnest", "patriotic", "naive"],
    "dialogue_style": "Sincere, almost painfully so. Believes in the Walk as an honor.",
    "backstory_notes": "Genuinely believes in the system. His disillusionment, when it comes, is total.",
    "relationship_to_player": "friendly",
    "elimination_mile": 170,
    "elimination_narrative_beat": "Eliminated while still insisting 'this means something.' His faith outlasts his body.",
    "key_scenes": ["Expressing pride in being selected", "Defending the Walk's honor", "Moment of doubt", "Final insistence"],
    "alliance_potential": "low",
    "physical_state": "average",
    "psychological_archetype": "The True Believer — propaganda's perfect victim",
    "walking_position": "middle"
  },
  {
    "name": "Rattigan",
    "walker_number": 75,
    "age": 18,
    "home_state": "New Jersey",
    "personality_traits": ["gruff", "pragmatic", "seen-it-all"],
    "dialogue_style": "World-weary. Talks like a man three times his age.",
    "backstory_notes": "Hard upbringing. Nothing about the Walk surprises him.",
    "relationship_to_player": "neutral",
    "elimination_mile": 240,
    "elimination_narrative_beat": "Goes without complaint. Expected it.",
    "key_scenes": ["Sharing cigarettes if available", "Nihilistic philosophy", "Accepting the end"],
    "alliance_potential": "low",
    "physical_state": "average",
    "psychological_archetype": "The Fatalist",
    "walking_position": "back"
  }
]
```

### **4.4 Background NPCs (Tier 3 — Minimal Interaction, Named for Elimination Events)**

The remaining walkers (to fill the 100-walker roster) are generated procedurally but each has:

* A unique name  
* A walker number  
* A home state  
* 2-3 personality traits  
* An elimination mile  
* A one-line elimination description

These walkers provide ambient dialogue (single lines, reactions to events) but do not have full dialogue trees. Their eliminations are announced and felt but not scripted in detail.

**Generation Rule:** Fill walkers \#1–\#99 (excluding those already defined above) with procedurally assigned data. Names should be plausible American teen boy names. States should be distributed across the US. No duplicate numbers.

 **5\. Core Game Mechanics**

### **5.1 The Walking Loop**

The fundamental gameplay loop is continuous forward motion. The game is always moving. The player's primary input is **speed management**.

**Speed Control:**

* The player has a speed slider or directional input ranging from 0 to \~7 mph.  
* Normal comfortable pace: \~4.5 mph (safe, moderate stamina drain).  
* Fast pace: 5–6 mph (burns stamina faster, builds buffer distance).  
* Slow pace: 4.0–4.4 mph (conserves stamina, risky — close to the threshold).  
* Below 4.0 mph: **Warning issued.** Clock starts. Another infraction before walking it off \= second warning.  
* 0 mph (stopped): Immediate warning. Continued stopping \= rapid elimination.

**Speed is not just a number — it's a risk dial.** Walk too fast, you burn out. Walk too slow, you die. The sweet spot shrinks as fatigue mounts.

### **5.2 Stamina System**

Stamina is the master resource. It degrades constantly and its rate of degradation increases over time.

**Base Degradation Rate:**

* Hours 0–12: \-0.5 stamina/minute (fresh legs)  
* Hours 12–24: \-0.8 stamina/minute (fatigue setting in)  
* Hours 24–48: \-1.2 stamina/minute (sleep deprivation)  
* Hours 48–72: \-1.8 stamina/minute (body breaking down)  
* Hours 72+: \-2.5 stamina/minute (survival mode)

**Modifiers:**

* **Terrain:** Uphill \= \+50% drain. Downhill \= \-20% drain (but \+pain on knees).  
* **Weather:** Rain \= \+25% drain. Cold \= \+15% drain. Heat \= \+30% drain.  
* **Hydration \< 30:** \+40% drain.  
* **Hunger \< 30:** \+20% drain.  
* **Pain \> 70:** \+30% drain.  
* **Morale \< 20:** \+25% drain.  
* **Speed \> 5 mph:** \+50% drain.  
* **Alliance active:** \-10% drain (having someone to walk with helps).

**Recovery:**

* Stamina does not recover naturally after hour 24 (sleep deprivation makes full recovery impossible).  
* Food provides \+5 stamina per meal (limited to 1 request per 30 min in-game time).  
* Water provides \+3 stamina per drink (limited to 1 per 15 min).  
* High morale slows degradation but doesn't restore.

### **5.3 Warning System**

The warning system is the game's death clock.

**Rules (faithful to the novel):**

1. Walking below 4.0 mph for more than 10 seconds triggers a warning.  
2. Each warning is announced by a soldier on the half-track: "Warning. Walker \[number\]. First warning."  
3. At 3 warnings, the walker is eliminated.  
4. Warnings can be walked off: **1 hour of walking above 4.0 mph without a new infraction** removes 1 warning (oldest first).  
5. The warning timer resets if a new warning is issued.

**UI Implementation:**

* Warning count displayed prominently at all times (0, 1, 2, or 3 — 3 is never displayed because game over triggers).  
* Warning dots or icons that pulse when active.  
* A subtle timer bar showing progress toward walking off the oldest warning.  
* When a warning is issued, a sharp audio cue and visual flash. The screen tightens.  
* At 2 warnings, the UI becomes more intense — color shift, heartbeat audio, narrowed field of view.

### **5.4 Food & Water System**

Walkers can request food and water from the half-track's conveyor belt.

* **Food:** Energy bars, sandwiches, tube concentrates. Each provides \+5 stamina, \+20 hunger satisfaction. Cooldown: 30 minutes between requests.  
* **Water:** Canteen refills. Each provides \+3 stamina, \+25 hydration. Cooldown: 15 minutes between requests.  
* **Requesting:** Player presses a button/key. The belt extends. There is a short window to grab the supplies while walking (cannot stop). Missing the window wastes the cooldown.  
* **Vomiting risk:** Eating while at high pain or low clarity has a chance of causing vomiting, which negates the food benefit and drains stamina/hydration further.

### **5.5 Pain & Injury System**

Pain accumulates over time and from specific events.

**Sources of Pain:**

* **Blisters:** Begin forming after mile 20\. Increase pain by \+1 per mile after onset. Major source of chronic pain.  
* **Muscle cramps:** Random events, more likely at low hydration and high miles. Spike of \+15 pain, reduces speed temporarily.  
* **Charley horse:** Severe cramp variant. \+25 pain spike. Risky — may trigger warning if speed drops.  
* **Falls/Stumbles:** Random events at low clarity or on rough terrain. \+10 pain, \+1 warning risk.  
* **Weather exposure:** Prolonged rain or cold adds slow pain buildup.

**Pain Effects:**

* Pain \> 50: Max achievable speed reduced to 6 mph.  
* Pain \> 70: Max speed reduced to 5 mph. Morale drain doubled.  
* Pain \> 90: Max speed reduced to 4.5 mph. Every step is agony. High warning risk.

**Pain does not decrease.** It is a one-way ratchet. This is intentional and faithful to the novel — the body does not heal on the Walk.

### **5.6 Morale System**

Morale represents psychological will to continue.

**Morale Boosters (+):**

* Positive NPC conversation: \+3 to \+8  
* Alliance member walking nearby: \+1 per 10 minutes  
* Crowd cheering (early game): \+2 per event  
* Reaching a milestone (every 50 miles): \+5  
* Sharing a story or joke: \+3  
* Remembering The Prize (player-triggered reflection): \+5, but diminishing returns

**Morale Drains (-):**

* Walker elimination witnessed: \-5 to \-15 (depending on relationship)  
* Alliance member eliminated: \-20 to \-30  
* Hostile NPC interaction: \-5  
* Pain spike: \-3  
* Night phase: \-1 per 30 minutes (darkness is psychologically harder)  
* Crowd hostility (late game): \-3 per event  
* Warning received: \-10  
* Hallucination event: \-5

**Morale Effects:**

* Morale \> 70: Dialogue options are confident and clear. Stamina drain is at base rate.  
* Morale 40–70: Normal range. Some dialogue options become unavailable (too tired for wit).  
* Morale 20–40: Despair setting in. NPC dialogue reflects concern. Stamina drain increased.  
* Morale \< 20: Critical despair. Risk of "giving up" events — the player's character considers stopping. The player must make choices to keep going. If morale hits 0, the character stops walking (game over via willpower failure, not physical collapse).

### **5.7 Clarity / Sleep Deprivation**

Clarity starts at 100 and begins degrading after hour 16 (no sleep available).

**Degradation:**

* Hours 0–16: No clarity loss (body hasn't needed sleep yet).  
* Hours 16–24: \-1 clarity per hour.  
* Hours 24–36: \-2 clarity per hour.  
* Hours 36–48: \-3 clarity per hour.  
* Hours 48+: \-4 clarity per hour.

**Clarity Effects:**

* Clarity \> 60: Normal gameplay. Full UI reliability.  
* Clarity 30–60: Mild hallucinations. Ambient sounds distort. Occasional phantom walker sightings.  
* Clarity 15–30: Moderate hallucinations. NPC dialogue may include lines that aren't real. UI elements flicker or display wrong information briefly.  
* Clarity \< 15: Severe hallucination. The player sees and hears things that aren't there. The crowd becomes surreal. Dead walkers may appear to be walking again. UI is unreliable — speed display may be wrong, warning count may flicker.

---

## **6\. Narrative Structure & Pacing**

### **6.1 Act Structure**

The game is divided into narrative acts tied to mile markers and walker count.

#### **Act 1 — The Starting Line (Miles 0–30, Walkers 100→\~85)**

**Tone:** Tense excitement. The walk has just begun. Everyone is fresh, nervous, and chatty.

**Key Events:**

* The Major's opening address.  
* Character creation / player introduction.  
* First conversations with nearby walkers.  
* The first elimination — a shockwave through the group. Reality sets in.  
* Barkovitch provokes the incident that leads to a walker's death.  
* Garraty and McVries begin to emerge as central figures.  
* The player establishes (or fails to establish) early relationships.

**Gameplay Focus:** Learning mechanics, managing speed, initiating conversations.

---

#### **Act 2 — The Grind (Miles 30–120, Walkers \~85→\~50)**

**Tone:** Settling into the horror. The novelty is gone. Bodies are starting to fail. The group is thinning.

**Key Events:**

* Olson's prolonged breakdown (miles 80–110).  
* Scramm demonstrates his strength, then catches cold.  
* Baker's stories become a comfort ritual.  
* Barkovitch's isolation deepens.  
* Night falls for the first time — a major tonal shift.  
* First major hill — a stamina gauntlet.  
* The crowd appears in earnest — cheering, signs, spectacle.

**Gameplay Focus:** Managing degrading stats, deeper NPC interactions, first real survival pressure.

---

#### **Act 3 — The Long Dark (Miles 120–250, Walkers \~50→\~20)**

**Tone:** Exhaustion, despair, and psychological fracture. The walk is no longer an event — it's a death march.

**Key Events:**

* Scramm's decline and the pact for his wife.  
* Sleep deprivation begins to manifest. First hallucinations.  
* Garraty sees Jan in the crowd (miles 130–140) — a painful, brief connection.  
* McVries' scar conversation (if player has earned trust).  
* Baker's stories fragment and fade.  
* Barkovitch's dance of death.  
* Parker begins planning his escape attempt.  
* The crowd's mood shifts from celebration to something more primal.  
* Elimination frequency increases. Names are lost. Numbers are forgotten.

**Gameplay Focus:** Survival becomes desperate. Morale management is critical. Hallucinations introduce unreliable information. Alliances become lifelines or liabilities.

---

#### **Act 4 — The Final Stretch (Miles 250–400+, Walkers \~20→1)**

**Tone:** Surreal, haunting, intimate. The walk has become something beyond endurance — it's a psychic landscape.

**Key Events:**

* Parker's futile charge (mile 280).  
* The last dozen walkers are named, known, personal. Every elimination is felt.  
* McVries' quiet decision to stop (mile 350).  
* Stebbins' revelation about The Major (mile 300+).  
* Stebbins' collapse — the look of betrayal (mile 399).  
* The final two walkers — the player and Garraty (or the player and Stebbins, depending on choices).  
* The ending.

**Gameplay Focus:** All stats are critical. Every decision matters. Dialogue is sparse and heavy. The game UI may be degraded by hallucination effects. The player is running on will alone.

### **6.2 Endings**

The game supports multiple endings based on the player's survival, relationships, and psychological state.

**Ending A — The Winner (Hollow Victory)** The player is the last walker standing. The crowd erupts. The Major's half-track pulls alongside. A door opens. But the player's character is so far gone — psychologically, physically — that The Prize feels meaningless. The game ends with the player walking forward, unable to stop. (Faithful to the novel's ambiguous ending with Garraty.)

**Ending B — The Pact** If the player formed a strong alliance with Garraty and/or McVries, and both survive to the final 5, a conversation triggers where one of them suggests simply… walking together. Not competing. The ending is ambiguous — do they both collapse? Does the system intervene? The screen fades.

**Ending C — The Refusal** If the player's morale is above 80 in the final stretch (nearly impossible), they can choose to stop walking voluntarily — not from despair but from moral revulsion. The player sits down on the road. The warnings come. The player's character speaks their Prize one last time, then closes their eyes. It is a chosen death. An act of defiance.

**Ending D — The Collapse** The player is eliminated before the final stretch. Game over, but with narrative weight. The screen shows the walk continuing without the player. The other walkers barely notice. The crowd moves on. The game displays how many miles the player walked, and a single line from a surviving NPC about the player (or no line at all, if no alliances were formed).

**Ending E — The Ghost** If clarity drops below 5 in the final stretch, the player enters a dissociative state. The game continues but the player is no longer sure if they're still walking or if they've already been eliminated. The boundary between alive and dead blurs. The ending is deliberately unclear.

---

## **7\. Dialogue & Relationship System**

### **7.1 Conversation Mechanics**

Conversations happen while walking. They are not pause-screen events — the game continues, stats continue to degrade, and other events can interrupt.

**Initiating Conversation:**

* The player can attempt to talk to any walker within a "proximity zone" (walkers near the player's current position in the pack).  
* Walking position matters: if the player is at the front, they can talk to front-positioned walkers. Move to the back to find Stebbins.  
* The player chooses to "approach" a walker, then selects from available dialogue options.

**Dialogue Structure:**

* Each conversation is a branching tree with 2–4 options per node.  
* Options are gated by: relationship level, mile marker, walkers remaining, player stats (morale, clarity), and previous conversation flags.  
* Conversations have a **length limit** per interaction (2–5 exchanges) — you can't talk forever. You're walking.  
* Longer conversations are possible at night (when fewer eliminations happen and the group is quieter).

### **7.2 Relationship Levels**

Each NPC has a relationship value toward the player: **\-100 (hostile) to \+100 (bonded)**.

| Range | Label | Effects |
| ----- | ----- | ----- |
| \-100 to \-50 | Hostile | NPC refuses conversation. May actively taunt or provoke. Proximity drains morale. |
| \-50 to \-10 | Wary | NPC gives short, guarded responses. Limited dialogue options available. |
| \-10 to \+10 | Neutral | Standard dialogue. NPC is polite but not invested. |
| \+10 to \+40 | Friendly | NPC initiates conversation occasionally. Shares stories. Some trust. |
| \+40 to \+70 | Close | NPC shares backstory. Offers tactical advice. Morale boost from proximity. |
| \+70 to \+100 | Bonded | Full alliance. Mutual morale support. Unique dialogue unlocked. Their elimination devastates the player (-30 morale). |

### **7.3 Alliance System**

Alliances are formalized when relationship reaches \+60 or higher and the player accepts a "walk together" prompt from the NPC (or initiates one).

**Alliance Benefits:**

* Passive morale regeneration when walking near the ally (+1 morale per 10 min).  
* Stamina drain reduced by 10%.  
* Access to exclusive dialogue and backstory.  
* The ally will warn the player if their speed is dropping (audio cue).

**Alliance Costs:**

* When an ally is eliminated, the morale hit is catastrophic (-30 morale).  
* Being in an alliance makes the player a target for hostile NPCs (Barkovitch, Klingerman).  
* Maximum 2 active alliances at a time.

### **7.4 Dialogue Condition System**

Every dialogue node has conditions checked at runtime:

json

```json
{
  "node_id": "garraty_mile30_why_entered",
  "speaker": "garraty",
  "text": "So, New Columbia. Why'd you sign up for this? Long way from home.",
  "conditions": {
    "mile_range": [25, 40],
    "relationship_min": 10,
    "garraty_alive": true,
    "previous_flag_required": "garraty_intro_complete",
    "player_clarity_min": 40
  },
  "options": [
    {
      "text": "To prove something. Back home, nobody thought I could make it.",
      "effects": { "garraty_relationship": +5, "player_morale": +2 },
      "sets_flag": "told_garraty_reason_prove",
      "requires": { "player_reason": "prove" }
    },
    {
      "text": "I don't really know. Do you?",
      "effects": { "garraty_relationship": +8, "player_morale": +3 },
      "sets_flag": "told_garraty_reason_unknown",
      "next_node": "garraty_doesnt_know_either"
    },
    {
      "text": "For someone back home. That's all I'll say.",
      "effects": { "garraty_relationship": +3 },
      "sets_flag": "told_garraty_reason_someone"
    },
    {
      "text": "[Stay quiet]",
      "effects": { "garraty_relationship": -2 }
    }
  ]
}
```

---

## **8\. Psychological Horror Layer**

### **8.1 Design Philosophy**

The horror in The Long Walk is not jump scares or monsters. It is **the slow, dawning realization that this will not end well, and the erosion of everything human under inhuman conditions.** The game's psychological horror layer must reflect this.

### **8.2 Implementation Tiers**

#### **Tier 1 — Subtle Shifts (Miles 0–100)**

* Audio: Footsteps become slightly louder. Ambient sound subtly narrows (less bird song, more engine drone from the half-track).  
* Visual: Color saturation decreases by 5–10%.  
* UI: No changes yet.  
* Crowd: Enthusiastic, celebratory, normal.

#### **Tier 2 — Discomfort (Miles 100–200)**

* Audio: Distant sounds of eliminations. Crowd noise becomes a droning hum. Occasional audio glitch — a voice that wasn't there.  
* Visual: Saturation drops further. Shadows lengthen slightly even during day. Background details become less distinct.  
* UI: Occasional micro-flicker in stat displays (imperceptible unless looking closely).  
* Crowd: Still cheering but faces are less distinct. Some spectators are standing very still.

#### **Tier 3 — Unease (Miles 200–300)**

* Audio: Phantom footsteps (more walkers than there should be). Whispered dialogue that doesn't match any NPC. Music (if any) becomes atonal.  
* Visual: Walker silhouettes in the distance that fade when approached. The road ahead shimmers. Dead walkers briefly appear in the group before vanishing.  
* UI: Warning count display occasionally shows a wrong number for a split second. Speed display jitters.  
* Crowd: Faces are wrong — too wide, too still. Some spectators are holding signs with text that doesn't make sense. Occasional figure in the crowd that looks like someone the player knows (based on player\_prize or backstory).

#### **Tier 4 — Fracture (Miles 300+)**

* Audio: The player's own breathing is louder than anything else. NPC dialogue echoes. Eliminated walkers' voices return. The half-track engine sounds like breathing.  
* Visual: The road ahead bends in ways that don't match the terrain. The sky is the wrong color. NPCs' faces glitch. The crowd is a solid mass of shadow with glowing eyes. Occasional flash of a "normal" frame — a reminder of what reality looked like.  
* UI: Stat displays are unreliable. The player cannot fully trust their speed reading. Warning indicator may show false positives. Mile counter occasionally jumps backward.  
* Crowd: No longer human. A force. An audience to something unknowable.

### **8.3 Hallucination Events**

Scripted hallucination events trigger at specific clarity thresholds and mile markers:

| Clarity | Mile | Event |
| ----- | ----- | ----- |
| \< 50 | 150+ | **The Echo:** A walker who was eliminated earlier appears walking next to the player. They speak a line of their previous dialogue. Then they're gone. |
| \< 40 | 200+ | **The Conversation:** An NPC initiates dialogue, but the NPC has been dead for 50 miles. The dialogue is normal at first, then veers into surreal territory. |
| \< 30 | 250+ | **The Prize:** The player hallucinates their Prize — whatever they typed at game start. It appears as a vision by the road, or a voice describing it. Then it corrupts. |
| \< 20 | 300+ | **The Path:** The road splits. One path leads somewhere bright. The other continues. Both are real. Both are fake. The player must choose, and the choice doesn't matter (both lead forward). |
| \< 10 | 350+ | **The Mirror:** The player sees themselves on the roadside, watching themselves walk past. A brief, deeply unsettling moment of dissociation. |

## **9\. UI/UX Design Specification**

### **9.1 Overall Aesthetic**

**Visual Style:** Muted, desaturated color palette evoking 1970s America — faded greens, dusty browns, worn grays. Think: a Polaroid left in the sun. The visual style should start relatively clear and become progressively more degraded.

**Typography:** Monospaced or typewriter-style font for UI elements. Serif font for narrative text. Sans-serif for system messages (warnings, eliminations).

**Tone:** The UI should feel like a document — clinical, bureaucratic, dehumanizing. Walker numbers are displayed more prominently than names. Stats are presented as data, not health bars.

### **9.2 Screen Layout**

```
┌──────────────────────────────────────────────────────────────┐
│  THE LONG WALK              Mile: 47.3    Walkers: 73/100   │
│                             Hour: 11.8    Time: 6:47 PM     │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                    [MAIN VIEWPORT]                           │
│                                                              │
│          The road stretches ahead. Walkers move              │
│          in a loose column. The half-track idles             │
│          behind. Trees line both sides.                      │
│                                                              │
│          [NARRATIVE TEXT AND EVENT DESCRIPTIONS]              │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  SPEED: ████████░░ 4.6 mph     WARNINGS: ● ○ ○             │
│                                [walking off: 34:12]          │
├──────────────────────────────────────────────────────────────┤
│  STA: ████████░░ 78   HYD: ██████░░░░ 55   HUN: ███████░░ 65│
│  PAI: ██░░░░░░░░ 18   MOR: ████████░░ 72   CLR: █████████░ 89│
├──────────────────────────────────────────────────────────────┤
│  [Talk]  [Request Food]  [Request Water]  [Check Position]  │
│                                                              │
│  Nearby: Garraty (#47) · McVries (#61) · Baker (#3)         │
└──────────────────────────────────────────────────────────────┘
```

### **9.3 Speed Control**

**Implementation:** A horizontal slider or left/right arrow key control.

* Left \= slow down. Right \= speed up.  
* A **red zone** on the left side of the slider marks the danger zone (\< 4.0 mph).  
* The current speed updates in real time.  
* An audio tone shifts pitch with speed — higher pitch \= faster. A low drone at danger speed.

### **9.4 Dialogue Panel**

When a conversation is active, a panel slides in from the right (or bottom on smaller screens):

```
┌──────────────────────────────────────┐
│  GARRATY (#47) — Relationship: +++   │
│                                      │
│  "You holding up okay? You've been   │
│   quiet for a while."                │
│                                      │
│  > "Just conserving energy."         │
│  > "Thinking about home."            │
│  > "How are YOUR feet?"              │
│  > [Stay quiet]                      │
└──────────────────────────────────────┘
```

Conversations auto-close if:

* An elimination event occurs nearby.  
* The player's speed drops below 4.0 mph.  
* The NPC moves out of proximity range.

### **9.5 Elimination Notification**

When a walker is eliminated, the following sequence plays:

1. A sharp, flat sound effect (a crack — not a gunshot, but evocative of one).  
2. The bottom of the screen displays: `WALKER #[XX] — [NAME] — ELIMINATED — MILE [XX.X]`  
3. The notification lingers for 8 seconds, then fades.  
4. The walker count in the header decrements.  
5. If the eliminated walker had a relationship with the player, an additional line appears: `[Name] is gone.` (simple, devastating).

### **9.6 Progressive UI Degradation**

As clarity drops, the UI itself becomes unreliable (see Section 8.2). Implementation:

* **Clarity 60–30:** Stat numbers occasionally display wrong values for 0.5 seconds before correcting.  
* **Clarity 30–15:** The speed display jitters. The mile counter occasionally ticks backward. Colors shift subtly.  
* **Clarity \< 15:** Full unreliability. Warning indicators may show false warnings. Walker names may swap. The narrative text includes lines that didn't happen.

---

## **10\. Game State Schema**

### **10.1 Master State Object**

typescript

```ts
interface GameState {
  // Player
  player: {
    name: string;
    age: number;
    reason_for_entering: 'prove' | 'unknown' | 'someone' | 'prize';
    prize: string;
    walker_number: 100;
    stats: {
      stamina: number;        // 0-100
      speed: number;          // 0-7.0 mph
      hydration: number;      // 0-100
      hunger: number;         // 0-100
      pain: number;           // 0-100
      morale: number;         // 0-100
      clarity: number;        // 0-100
    };
    warnings: number;         // 0-3
    warning_timer: number;    // seconds since last warning
    alive: boolean;
    position_in_pack: 'front' | 'middle' | 'back';
    food_cooldown: number;    // seconds until food can be requested
    water_cooldown: number;   // seconds until water can be requested
    alliances: number[];      // walker_numbers of allied NPCs
    flags: Record<string, boolean>;  // conversation and event flags
  };

  // World
  world: {
    miles_walked: number;
    hours_elapsed: number;
    current_time: string;     // HH:MM format (starts at ~7:00 AM)
    day_number: number;
    is_night: boolean;
    weather: 'clear' | 'cloudy' | 'rain' | 'heavy_rain' | 'fog' | 'cold';
    terrain: 'flat' | 'uphill' | 'downhill' | 'rough';
    crowd_density: 'none' | 'sparse' | 'moderate' | 'heavy' | 'massive';
    crowd_mood: 'excited' | 'cheering' | 'subdued' | 'uneasy' | 'hostile' | 'surreal';
    current_act: 1 | 2 | 3 | 4;
    horror_tier: 1 | 2 | 3 | 4;
  };

  // Walkers
  walkers: Walker[];          // Array of 99 NPC walkers

  // Events
  event_queue: GameEvent[];   // Upcoming scripted events
  event_log: string[];        // Log of past events for narrative reference

  // Dialogue
  active_conversation: ConversationState | null;
  conversation_history: ConversationRecord[];

  // Meta
  save_checkpoint: number;    // mile marker of last save
  playtime_seconds: number;
  elimination_count: number;
}

interface Walker {
  name: string;
  walker_number: number;
  age: number;
  home_state: string;
  tier: 1 | 2 | 3;           // NPC complexity tier
  personality_traits: string[];
  dialogue_style: string;
  backstory_notes: string;
  alive: boolean;
  stats: {
    stamina: number;
    speed: number;
    pain: number;
    morale: number;
    clarity: number;
  };
  warnings: number;
  position_in_pack: 'front' | 'middle' | 'back';
  relationship_to_player: number;  // -100 to +100
  elimination_mile: number;
  elimination_narrative: string;
  behavioral_state: 'steady' | 'struggling' | 'talking' | 'breaking_down' | 'eliminated';
  key_scenes: string[];
  alliance_potential: 'none' | 'low' | 'medium' | 'high';
  is_allied_with_player: boolean;
  conversation_flags: Record<string, boolean>;
}

interface GameEvent {
  id: string;
  type: 'elimination' | 'dialogue' | 'hallucination' | 'crowd' | 'weather' | 'terrain' | 'milestone' | 'scripted_scene';
  trigger_mile: number;
  trigger_conditions: Record<string, any>;
  priority: number;
  data: Record<string, any>;
  fired: boolean;
}

interface ConversationState {
  npc_walker_number: number;
  current_node_id: string;
  turns_taken: number;
  max_turns: number;
}

interface ConversationRecord {
  npc_walker_number: number;
  mile: number;
  hour: number;
  node_ids_visited: string[];
  relationship_change: number;
}
```

---

## **11\. Tech Stack & Architecture**

### **11.1 Recommended Stack**

| Component | Technology | Rationale |
| ----- | ----- | ----- |
| **Runtime** | Web browser | Maximum accessibility. No installation required. |
| **Language** | TypeScript | Type safety for complex state management. |
| **Rendering** | HTML/CSS \+ Canvas (Phaser.js or custom) | The game is primarily text/UI driven. Canvas for the viewport, HTML for the UI chrome. |
| **State Management** | Zustand or plain TypeScript singleton | Lightweight, no framework overhead. |
| **Dialogue Engine** | Custom JSON parser | Dialogue trees stored as JSON. A simple engine evaluates conditions and returns available options. |
| **Build Tool** | Vite | Fast development, TypeScript support out of the box. |
| **Audio** | Howler.js | Simple, reliable web audio. |
| **Save System** | localStorage \+ JSON serialization | Checkpoint saves serialized to localStorage. Export/import for persistence. |
| **Testing** | Vitest | For game logic unit tests. |

### **11.2 Architecture Overview**

```
src/
├── index.html                  # Entry point
├── main.ts                     # Game initialization
├── state/
│   ├── game-state.ts           # Master state object and accessors
│   ├── player.ts               # Player state management
│   ├── walkers.ts              # Walker NPC state management
│   └── world.ts                # World/environment state
├── systems/
│   ├── walking.ts              # Core walking loop, speed, stamina
│   ├── warnings.ts             # Warning system logic
│   ├── elimination.ts          # Elimination triggers and events
│   ├── food-water.ts           # Supply request system
│   ├── pain.ts                 # Pain and injury system
│   ├── morale.ts               # Morale calculation
│   ├── clarity.ts              # Sleep deprivation and hallucinations
│   ├── weather.ts              # Weather changes
│   ├── terrain.ts              # Terrain variation
│   ├── crowd.ts                # Crowd behavior
│   └── npc-behavior.ts         # NPC state machine (walking, struggling, etc.)
├── dialogue/
│   ├── engine.ts               # Dialogue tree evaluator
│   ├── trees/                  # JSON dialogue tree files
│   │   ├── garraty.json
│   │   ├── mcvries.json
│   │   ├── stebbins.json
│   │   └── ...
│   └── conditions.ts           # Condition evaluation functions
├── narrative/
│   ├── events.ts               # Scripted narrative events
│   ├── hallucinations.ts       # Hallucination event system
│   ├── endings.ts              # Endgame logic and branching
│   └── elimination-scenes.ts   # Per-walker elimination narratives
├── ui/
│   ├── renderer.ts             # Main viewport rendering
│   ├── hud.ts                  # Stats display, warnings, speed control
│   ├── dialogue-panel.ts       # Conversation UI
│   ├── notifications.ts        # Elimination and event notifications
│   ├── degradation.ts          # UI degradation effects (horror layer)
│   └── screens/
│       ├── title.ts            # Title screen
│       ├── character-create.ts # Character creation
│       ├── game-over.ts        # Game over / ending screens
│       └── save-load.ts        # Save/load interface
├── audio/
│   ├── manager.ts              # Audio playback and mixing
│   └── sounds/                 # Audio asset references
├── data/
│   ├── walkers.json            # All 100 walker definitions
│   ├── events.json             # Scripted event definitions
│   ├── route.json              # Route terrain and landmark data
│   └── crowds.json             # Crowd behavior definitions
└── utils/
    ├── time.ts                 # In-game time calculations
    ├── random.ts               # Seeded RNG for reproducibility
    └── save.ts                 # Save/load serialization
```

### **11.3 Game Loop**

The game runs on a **tick-based loop** with variable time compression:

* **1 real second \= \~1 in-game minute** (base rate). This means 1 hour of real play ≈ 1 hour in-game ≈ \~4 miles walked at normal pace.  
* **Time compression can be adjusted:** During stretches with no events, time can accelerate (2x, 4x) and slow back to 1x when events trigger.  
* **Each tick updates:** player stats, NPC stats, world state, event queue check, elimination checks.

typescript

```ts
function gameTick(deltaTime: number) {
  // 1. Update world time
  updateWorldTime(deltaTime);

  // 2. Update player stats (stamina, hydration, hunger, pain, morale, clarity)
  updatePlayerStats(deltaTime);

  // 3. Check player warnings
  checkPlayerWarnings();

  // 4. Update all NPC walkers
  updateNPCWalkers(deltaTime);

  // 5. Check NPC eliminations (pre-scripted at specific miles)
  checkNPCEliminations();

  // 6. Check event queue (scripted narrative events)
  processEventQueue();

  // 7. Update environment (weather, terrain, crowd)
  updateEnvironment();

  // 8. Update horror layer (visual/audio based on clarity and mile)
  updateHorrorLayer();

  // 9. Render
  render();
}
```

---

## **12\. Implementation Phases & Milestones**

### **Phase 1 — Core Loop (MVP)**

**Goal:** A playable walking simulation with the basic survival mechanics.

**Deliverables:**

* Project scaffolding (Vite \+ TypeScript)  
* Game state initialization  
* Walking mechanic: speed control, mile tracking, time progression  
* Stamina system: base degradation, speed-based modifier  
* Warning system: 3-strike rule, walk-off timer  
* Player elimination (game over screen)  
* 10 test walkers with basic stats and scripted elimination miles  
* NPC elimination events (basic notification)  
* Basic UI: speed slider, stats display, warning indicator, mile/time counter  
* Food and water request mechanic  
* Basic HUD layout

**Acceptance Criteria:** Player can walk, manage speed, receive/walk-off warnings, request food/water, and be eliminated. 10 NPC walkers are eliminated at scripted mile markers with notifications.

---

### **Phase 2 — Full Roster & Environment**

**Goal:** All 100 walkers present with data. Environment variation.

**Deliverables:**

* Complete walker data file (all 100 walkers with names, numbers, states, traits, elimination miles)  
* Walker generation for Tier 3 (background NPCs)  
* NPC behavioral state machine (steady → struggling → breaking down → eliminated)  
* Day/night cycle with visual and mechanical effects  
* Weather system (clear, rain, fog, cold) with stat modifiers  
* Terrain variation (flat, uphill, downhill) with stamina effects  
* Crowd system (density and mood tied to mile markers)  
* Pain system implementation  
* Walker count display and elimination log  
* Checkpoint save system (every 25 miles)

**Acceptance Criteria:** Full 100-walker simulation runs from start to finish. All walkers are eliminated in approximate order. Environment changes over the course of the walk.

---

### **Phase 3 — Dialogue & Relationships**

**Goal:** The social layer is functional. The player can build relationships and experience character-driven narrative.

**Deliverables:**

* Dialogue engine (JSON tree evaluator with condition checks)  
* Dialogue trees for all Tier 1 NPCs (Garraty, McVries, Stebbins, Olson, Baker, Barkovitch, Parker, Scramm, Harkness)  
* Basic dialogue lines for Tier 2 NPCs (1–3 exchanges each)  
* Ambient dialogue for Tier 3 NPCs (single reactive lines)  
* Relationship system (-100 to \+100 with effects)  
* Alliance mechanic (formation, benefits, loss)  
* Conversation UI panel  
* Proximity system (who's nearby based on player position)  
* Player position control (move through the pack: front/middle/back)  
* NPC reactions to eliminations (dialogue responses to nearby deaths)  
* Character creation screen (name, age, reason, Prize)  
* Prize callback system (player's Prize reflected in dialogue)

**Acceptance Criteria:** Player can have full conversations with Tier 1 NPCs. Relationships change based on choices. Alliances form and break. Garraty, McVries, and Stebbins have complete narrative arcs.

---

### **Phase 4 — Psychological Horror Layer**

**Goal:** The game's tone shifts convincingly over the course of the walk.

**Deliverables:**

* Clarity system with sleep deprivation mechanics  
* Hallucination event system (scripted and procedural)  
* Progressive visual degradation (saturation, distortion, glitch effects)  
* Progressive audio degradation (phantom sounds, echo, atonal shifts)  
* UI degradation system (unreliable stat displays, false warnings)  
* Crowd behavior evolution (cheering → eerie → surreal)  
* Dead walker apparitions  
* The Prize hallucination event  
* Morale crisis events (player character considers stopping)  
* Horror tier system (4 tiers mapped to miles/clarity)

**Acceptance Criteria:** A player completing a full walk experiences a clear, escalating psychological horror progression. Hallucinations feel organic. UI degradation creates genuine unease.

---

### **Phase 5 — Polish & Endgame**

**Goal:** The game has a complete narrative arc with multiple endings and a polished experience.

**Deliverables:**

* All 5 endings implemented (Hollow Victory, The Pact, The Refusal, The Collapse, The Ghost)  
* Final stretch scripted events (Parker's charge, McVries' choice, Stebbins' revelation)  
* Olson's breakdown sequence (full scripted horror)  
* Scramm's decline arc (rain, cold, pact)  
* Baker's story arc (stories fragment, final interrupted story)  
* Barkovitch's dance of death  
* Opening sequence (The Major's address, the starting line, the first steps)  
* Sound design pass (footsteps, half-track, crowd, eliminations, ambient)  
* Visual polish (consistent art direction, particle effects for weather)  
* Title screen with tone-setting text  
* End-of-game statistics screen (miles walked, walkers outlasted, alliances formed, conversations had)  
* Full playtest from start to each ending  
* Performance optimization  
* Bug fixes and balance tuning

**Acceptance Criteria:** A complete, polished, emotionally affecting playthrough from title screen to ending credits.

## **13\. Claude Code Prompt Chains**

These are the specific prompts to feed Claude Code, phase by phase, to build the game incrementally. Each prompt assumes the previous phase is complete.

---

### **Prompt 1 — Project Setup**

```
Create a new TypeScript web project using Vite. The project is called "the-long-walk" — a browser-based survival simulation game. Set up the following structure:

- Vite + TypeScript config
- src/main.ts as entry point
- src/index.html with a basic game container div
- Folders: src/state/, src/systems/, src/dialogue/, src/narrative/, src/ui/, src/audio/, src/data/, src/utils/
- Install dependencies: (no heavy frameworks — vanilla TS with Vite)
- A basic game loop in main.ts that runs at 60fps using requestAnimationFrame
- A placeholder render function that draws "The Long Walk — Mile 0" to a canvas element

Ensure the project builds and runs with `npm run dev`.
```

---

### **Prompt 2 — Core State & Walking Mechanic**

```
In the "the-long-walk" project, implement the core game state and walking mechanic.

1. Create src/state/game-state.ts with the full GameState interface (see spec). Initialize default values: player starts with all stats at 100, speed at 4.5 mph, 0 warnings, mile 0, hour 0.

2. Create src/systems/walking.ts:
   - A function updateWalking(deltaTime) that advances miles_walked based on player speed and deltaTime.
   - Time progression: 1 real second = approximately 1 in-game minute.
   - Stamina degradation: base rate of -0.5/min for first 12 hours, increasing per the spec.
   - Speed modifiers: if player stamina < 30, max speed is reduced proportionally.

3. Create src/ui/hud.ts:
   - Render a HUD showing: current speed (with slider control), miles walked, hours elapsed, stamina bar, and time of day.
   - Speed slider goes from 0 to 7 mph. Highlight the danger zone below 4 mph in red.
   - Update all values each frame from game state.

4. Hook everything into the game loop in main.ts.

The player should be able to adjust their speed and watch miles tick up while stamina slowly drains. No warnings or NPCs yet — just the core walking feel.
```

---

### **Prompt 3 — Warning System & Elimination**

```
Add the warning system and player elimination to the-long-walk.

1. Create src/systems/warnings.ts:
   - Track player warnings (0-3).
   - If player speed < 4.0 mph for more than 10 continuous seconds, issue a warning.
   - Display warning announcement text: "Warning. Walker #100. [First/Second/Third] warning."
   - Walk-off timer: if player walks above 4.0 mph for 3600 in-game seconds (1 hour) without a new warning, remove the oldest warning.
   - At 3 warnings, trigger elimination (game over).

2. Update src/ui/hud.ts:
   - Add warning indicator (3 dots/circles, filled = active warning, empty = available).
   - Add walk-off timer bar (shows progress toward clearing oldest warning).
   - When a warning is issued, flash the screen border red briefly.
   - At 2 warnings, add a persistent red tint to the UI.

3. Create src/ui/screens/game-over.ts:
   - Game over screen showing: "Walker #100 — [Name] — Eliminated — Mile [X]"
   - Display total miles walked, hours survived.
   - "Walk Again" button to restart.

4. Hook warning checks into the game loop after walking update.
```

---

### **Prompt 4 — NPC Walkers (10 Test Walkers)**

```
Add 10 NPC walkers to the-long-walk for testing.

1. Create src/data/walkers.json with 10 walkers:
   - Garraty (#47), McVries (#61), Stebbins (#88), Olson (#70), Baker (#3), Barkovitch (#5), Parker (#34), Scramm (#45), Harkness (#49), and one Tier 2 walker (Curley #7).
   - Each has: name, number, elimination_mile, behavioral_state, speed, stamina.

2. Create src/systems/npc-behavior.ts:
   - Each NPC walker has a simple state machine: steady → struggling → breaking_down → eliminated.
   - NPC speed varies slightly around 4.5 mph. As they approach their elimination mile, their speed drops and state transitions.
   - When an NPC reaches their elimination mile (±5 miles random variance), they are eliminated.

3. Create src/systems/elimination.ts:
   - When an NPC is eliminated, fire an elimination event.
   - Display notification at bottom of screen: "WALKER #[XX] — [NAME] — ELIMINATED — MILE [XX.X]"
   - Update walker count.

4. Update the HUD to show: "Walkers: [alive]/[total]" in the header.

5. Update the game loop to tick all NPC walkers each frame.

After this, the player should see a walker count decreasing as NPCs are eliminated at various mile markers.
```

---

### **Prompt 5 — Food, Water, Hydration, Hunger**

```
Add the food and water systems to the-long-walk.

1. Create src/systems/food-water.ts:
   - Player can request food (button in UI). Effect: +5 stamina, +20 hunger. Cooldown: 30 in-game minutes.
   - Player can request water (button in UI). Effect: +3 stamina, +25 hydration. Cooldown: 15 in-game minutes.
   - Both hunger and hydration degrade at -1 per 10 in-game minutes.
   - Low hydration (< 30) increases stamina drain by 40%.
   - Low hunger (< 30) increases stamina drain by 20%.

2. Update the HUD to show hydration and hunger bars, and food/water request buttons with cooldown timers.

3. Add a vomit risk: if pain > 70 and player eats, 30% chance of vomiting (negates food benefit, costs -10 stamina, -15 hydration).
```

---

### **Prompt 6 — Pain System**

```
Add the pain system to the-long-walk.

1. Create src/systems/pain.ts:
   - Pain starts at 0 and increases over time:
     - After mile 20: +1 pain per mile (blisters forming).
     - Random cramp events: 5% chance per mile after mile 30. +15 pain, temporary speed reduction.
     - Charley horse: 1% chance per mile after mile 50. +25 pain, high risk of speed drop below 4 mph.
   - Pain effects on max speed:
     - Pain > 50: max speed 6 mph
     - Pain > 70: max speed 5 mph
     - Pain > 90: max speed 4.5 mph
   - Pain never decreases.

2. Add pain bar to HUD.

3. Display narrative text for pain events: "Your calves seize. Charley horse. You grit your teeth and keep walking."
```

---

### **Prompt 7 — Morale System**

```
Add the morale system to the-long-walk.

1. Create src/systems/morale.ts implementing the full morale spec:
   - Boosters: NPC conversations (+3 to +8), alliances (+1/10min), milestones (+5), crowd cheering (+2).
   - Drains: eliminations (-5 to -15), ally eliminated (-30), hostile interactions (-5), pain spikes (-3), night (-1/30min), warnings (-10).
   - Effects at thresholds (70+, 40-70, 20-40, <20).
   - At morale 0: game over (willpower failure) — different game over screen text: "You stop walking. Not because your body failed. Because you chose to."

2. Add morale bar to HUD.

3. Display morale-state text in the narrative: "A wave of despair washes over you" at morale < 20.
```

---

### **Prompt 8 — Full 100 Walker Roster**

```
Expand the-long-walk to 100 walkers.

1. Update src/data/walkers.json to include all 100 walkers:
   - Tier 1 (9 walkers): Garraty, McVries, Stebbins, Olson, Baker, Barkovitch, Parker, Scramm, Harkness — use the full character data from the spec.
   - Tier 2 (15 walkers): Curley, Ewing, Toland, Rank, Percy, Zuck, Abraham, Pearson, Jensen, Wyman, Fenter, Klingerman, Travin, Gallant, Rattigan — use the data from the spec.
   - Tier 3 (75 walkers): Generate procedurally. Each needs: name (plausible American teen boy name), walker_number (fill remaining numbers 1-99), age (16-18), home_state (distributed across US states), 2-3 personality traits, elimination_mile (distributed between mile 10 and mile 380, with most concentrated in miles 30-200).
   - Walker #100 is always the player — do not include in NPC data.
   - Ensure elimination miles are spread realistically: many early, thinning through the middle, sparse in the late game.

2. Update NPC behavior system to handle all 100 walkers efficiently.

3. Ensure the elimination notification system works for all walkers.
```

---

### **Prompt 9 — Environment Systems**

```
Add environment systems to the-long-walk.

1. Create src/systems/weather.ts:
   - Weather changes every 2-6 in-game hours (random).
   - States: clear, cloudy, rain, heavy_rain, fog, cold.
   - Effects on stamina drain per spec.
   - Display weather in narrative text and HUD.

2. Create src/systems/terrain.ts:
   - Terrain changes at specific mile markers based on Route 1 geography:
     - Miles 0-20: flat (starting area)
     - Miles 20-40: rolling hills
     - Miles 40-60: flat through towns
     - Miles 60-90: hilly (brutal section)
     - Miles 90-120: flat coastal
     - Miles 120-160: mixed
     - Miles 160-200: gradual hills
     - Miles 200+: varies
   - Uphill: +50% stamina drain. Downhill: -20% drain but +pain on knees.

3. Create src/systems/crowd.ts:
   - Crowd density and mood tied to mile markers and time of day.
   - Early: excited, cheering. Towns: massive crowds. Night: sparse. Late game: surreal.
   - Crowd mood affects morale per spec.
   - Display crowd descriptions in narrative text.

4. Implement day/night cycle:
   - Walk starts at ~7:00 AM.
   - Night: 8:00 PM to 6:00 AM. Darker visual treatment. Morale drain.
   - Dawn/dusk transitions.
```

---

### **Prompt 10 — Dialogue Engine & Character Creation**

```
Add the dialogue system and character creation to the-long-walk.

1. Create src/dialogue/engine.ts:
   - Loads JSON dialogue trees.
   - Evaluates conditions (mile range, relationship, flags, stats, walker alive status).
   - Returns available dialogue options.
   - Applies effects (relationship changes, morale changes, flag setting).
   - Tracks conversation state (current node, turns taken, max turns).

2. Create src/dialogue/conditions.ts:
   - Condition evaluator that checks game state against dialogue node requirements.

3. Create a sample dialogue tree: src/dialogue/trees/garraty.json
   - Include 5 conversation chains:
     - Introduction (mile 1-5)
     - Why they entered (mile 25-40)
     - Jan (mile 50-70)
     - Olson's breakdown reaction (mile 90-110)
     - Late-game despair (mile 300+)

4. Create src/ui/dialogue-panel.ts:
   - Slide-in panel showing NPC name, relationship indicator, dialogue text, and options.
   - Auto-close on elimination events or speed warnings.

5. Create src/ui/screens/character-create.ts:
   - Name input, age selection (16/17/18), reason selection (4 options), Prize input.
   - Store all values in game state.

6. Add a "Talk" button to the HUD that shows nearby walkers. Clicking a walker name initiates conversation.

7. Add proximity system: nearby walkers depend on player's position_in_pack (front/middle/back). Add position controls to HUD.
```

---

### **Prompt 11 — Relationship & Alliance System**

```
Add the full relationship and alliance systems to the-long-walk.

1. Update walker data to include relationship_to_player values per spec.

2. Implement relationship tracking:
   - Each conversation choice modifies relationship by the specified amount.
   - Relationship thresholds affect available dialogue (gated options).
   - Display relationship indicator in dialogue panel (visual: -- / - / neutral / + / ++ / bonded).

3. Implement alliance system:
   - At relationship >= 60, an "ally" prompt can appear.
   - Alliance benefits: morale regen (+1/10min when nearby), stamina drain -10%.
   - Alliance costs: ally elimination = -30 morale. Max 2 alliances.
   - Track alliances in player state.

4. Add ambient NPC dialogue:
   - NPCs occasionally speak unprompted (tied to events and mile markers).
   - Allied NPCs comment on the player's condition ("You're looking rough. Eat something.").
   - Hostile NPCs taunt from nearby.
```

---

### **Prompt 12 — Full Dialogue Trees for Major NPCs**

```
Create complete dialogue trees for all Tier 1 NPCs in the-long-walk.

For each of the following characters, create a JSON dialogue tree file in src/dialogue/trees/:

1. garraty.json — Ray Garraty (#47)
   - 8-10 conversation chains covering: introduction, why he entered, his father (Squaded), Jan, his thoughts on the Walk, reactions to key eliminations, late-game despair, final stretch.

2. mcvries.json — Peter McVries (#61)
   - 8-10 chains: initial wariness, testing the player, the scar story (high trust only), saving Garraty, philosophical night talks, his death wish revelation, final choice.

3. stebbins.json — Stebbins (#88)
   - 5-6 chains: cryptic initial encounter, warnings about alliances, rule knowledge, The Major revelation (mile 300+), final collapse dialogue.

4. olson.json — Hank Olson (#70)
   - 4-5 chains: boasting, mocking the player, first signs of trouble, the breakdown sequence.

5. baker.json — Art Baker (#3)
   - 5-6 chains: warm welcome, home stories (3 different stories), pacing advice, story fragmentation, final interrupted story.

6. barkovitch.json — Gary Barkovitch (#5)
   - 4-5 chains: provocation, the incident, isolation, rare vulnerability moment, the dance.

7. parker.json — Collie Parker (#34)
   - 4-5 chains: confronting soldiers, system rants, grudging respect, escape planning, the charge.

8. scramm.json — Scramm (#45)
   - 4-5 chains: talking about Cathy, showing strength, catching cold, the decline, the pact.

9. harkness.json — Harkness (#49)
   - 3-4 chains: observing and writing, sharing data, letting player read notebook, dropping notebook.

Each tree should use the dialogue condition system. Conversations should feel natural, evolving over the course of the walk. Early conversations are lighter; late conversations are sparse and heavy. Dialogue style matches each character's spec.
```

---

### **Prompt 13 — Psychological Horror Layer**

```
Implement the psychological horror layer in the-long-walk.

1. Create src/systems/clarity.ts:
   - Clarity starts at 100, begins degrading after hour 16 per spec.
   - Degradation rate increases with hours elapsed.

2. Create src/narrative/hallucinations.ts:
   - Implement the 5 scripted hallucination events per spec (The Echo, The Conversation, The Prize, The Path, The Mirror).
   - Add procedural hallucination system: at low clarity, random events (phantom walker, wrong name display, reversed text, phantom elimination sound).

3. Create src/ui/degradation.ts:
   - Tier 1 (miles 0-100): Subtle saturation decrease, ambient audio narrowing.
   - Tier 2 (miles 100-200): Stat display micro-flickers, background detail loss.
   - Tier 3 (miles 200-300): Speed jitter, phantom walkers, wrong stat values for 0.5s, crowd distortion.
   - Tier 4 (miles 300+): Full unreliability. False warning indicators. Mile counter jumps. NPC face glitch.

4. Update crowd system:
   - Crowd behavior evolves per horror tier: excited → subdued → uneasy → surreal.
   - Late-game crowd descriptions become disturbing.

5. Add clarity bar to HUD (but this bar itself becomes unreliable at low clarity).
```

---

### **Prompt 14 — Key Scripted Scenes**

```
Implement the major scripted narrative scenes in the-long-walk.

1. Opening Sequence (mile 0):
   - The Major's address to the walkers.
   - The starting line. 100 boys. The countdown.
   - The first steps. Nervous energy. Chatter.
   - Establish the player's position and nearby walkers.

2. First Elimination (mile ~10-15):
   - The first walker goes down. Everything stops (emotionally, not physically).
   - NPC reactions cascade. Some laugh nervously. Some go silent. The player must keep walking.

3. Barkovitch's Incident (mile ~20):
   - Barkovitch provokes a confrontation that leads to another walker's stumble and elimination.
   - Group turns on Barkovitch. He promises to dance on their graves.

4. Olson's Breakdown (miles 90-110):
   - A multi-mile scripted sequence. Olson goes from bravado to desperation to madness.
   - Other walkers react in real time. Some look away. Some watch.
   - His elimination is prolonged and horrible.

5. Scramm's Rain and Decline (miles 100-180):
   - Weather event: heavy rain at mile 100-110.
   - Scramm catches cold. Over the next 70 miles, he weakens.
   - The pact scene: remaining walkers agree to support his wife.

6. Garraty Sees Jan (miles 130-140):
   - Garraty spots his girlfriend in the crowd. A moment of agonizing connection.
   - He can't stop. She reaches for him. The crowd swallows her.

7. Parker's Charge (mile ~280):
   - Parker announces he's going to run for it. The player can try to talk him out of it (if allied).
   - He runs. He doesn't make it.

8. McVries' Choice (mile ~350):
   - McVries sits down. If allied, the player gets a final conversation.
   - "I've been walking toward this since the start. It's okay."

9. Stebbins' Revelation (mile ~320):
   - If the player has been persistent in approaching Stebbins, he reveals he's The Major's son.
   - "He's my father. He won't let me die." Pause. "Will he?"

10. Stebbins' Collapse (mile ~399):
    - Near the very end. Stebbins falls. The surprise on his face.

11. Ending sequences (per the 5 endings in the spec).
```

---

### **Prompt 15 — Audio, Polish & Endings**

```
Final polish pass for the-long-walk.

1. Audio system (src/audio/manager.ts):
   - Ambient: footsteps (vary with speed and terrain), half-track engine drone, wind, rain.
   - Crowd: cheering (early), murmuring, silence (late).
   - Events: warning klaxon, elimination crack, supply belt mechanical sound.
   - Music: minimal — a droning, atonal score that intensifies with horror tier. Or no music at all, just environmental sound.
   - Horror: phantom footsteps, echo effects, reversed audio snippets, heartbeat at 2 warnings.

2. Implement all 5 endings with unique screens and narrative text.

3. End-of-game statistics:
   - Miles walked
   - Hours survived
   - Walkers outlasted
   - Alliances formed
   - Conversations had
   - Warnings received
   - Warnings walked off
   - Food/water consumed
   - Ending achieved

4. Title screen:
   - "THE LONG WALK"
   - Tagline: "The last one standing wins The Prize."
   - "Begin" button.
   - Muted, atmospheric background.

5. Performance optimization:
   - Ensure 100 walker simulation runs at 60fps.
   - Lazy-load dialogue trees.
   - Efficient render loop (only update changed elements).

6. Playtest checklist:
   - Full walk to each of the 5 endings.
   - Verify all Tier 1 NPC dialogue trees fire correctly.
   - Verify elimination order is approximately correct.
   - Verify horror layer progression feels right.
   - Verify no soft-locks or broken states.
```

---

## **14\. Dialogue Samples**

### **14.1 Garraty — Introduction (Mile 3\)**

**Conditions:** mile 1-10, garraty alive, no previous garraty conversation.

**Garraty:** "Hey. Number 100, right? You're the one from New Columbia?" *He looks you over with open curiosity.* "I'm Garraty. Forty-seven. Maine boy — this is practically my backyard."

**Option A:** "Nice to meet you, Garraty. Yeah, New Columbia. Long way from home." → *Garraty nods.* "Long way from home for all of us. Even me." (+5 relationship)

**Option B:** "Is everyone going to ask me about New Columbia?" → *Garraty laughs.* "Probably. You're exotic, kid. Enjoy it while it lasts." (+3 relationship)

**Option C:** "\[Keep walking in silence.\]" → *Garraty shrugs and falls into step nearby, not offended.* (-1 relationship)

---

### **14.2 McVries — The Scar Story (Mile 82\)**

**Conditions:** mile 75-100, mcvries alive, relationship \>= 50, flag "mcvries\_scar\_asked" set.

**McVries:** *He touches the scar on his cheek absently.* "You really want to know? Alright." *A long pause. His pace doesn't change.* "Her name was Priscilla. She told me she loved me, then she did this. Or maybe I told her something that made her do it. It's hard to remember which version is true anymore."

**Option A:** "That's... I'm sorry, McVries." → "Don't be. I deserved it. Or I didn't. Either way, I'm here now, which is probably the punishment for both versions." (+3 relationship)

**Option B:** "Why are you telling me this?" → *He looks at you sideways.* "Because we might both be dead tomorrow, and someone should know. Even if it doesn't matter." (+5 relationship)

**Option C:** "Sounds like you're still carrying it." → "Carrying it? I'm walking with it. Literally. That's what the Walk is, isn't it? Carrying everything until you can't." (+8 relationship, sets flag "mcvries\_deep\_trust")

---

### **14.3 Stebbins — Cryptic Warning (Mile 42\)**

**Conditions:** mile 35-50, stebbins alive, player position is "back."

**Stebbins:** *He doesn't look at you. Just walks, slightly behind.* "You've been making friends up there." *It's not a question.* "That's a nice way to guarantee you'll watch them die."

**Option A:** "Better than walking alone." → "Is it?" *Nothing else.* (No relationship change. Sets flag "stebbins\_challenged")

**Option B:** "You sound like you know something." → "I know that math applies to everyone on this road. Including the ones you like." (-2 relationship, but sets flag "stebbins\_curiosity")

**Option C:** "\[Walk away.\]" → *You feel his eyes on your back as you move up the column.* (No change)

---

### **14.4 Baker — Story About Home (Mile 28\)**

**Conditions:** mile 20-40, baker alive, relationship \>= 5\.

**Baker:** *His voice is soft, unhurried, like he's got all the time in the world.* "Did I ever tell you about my dog, Jasper? Dumbest retriever in three counties. Couldn't fetch a ball if you put it in his mouth." *He chuckles.* "But he'd sit with you on the porch for hours. Never needed a reason. Just... sat with you."

**Option A:** "Sounds like a good dog." → "Best there ever was. That's what I'm walking for, you know. Not the Prize. Just to get back to that porch." (+5 relationship, \+3 morale)

**Option B:** "I had a dog like that back home." → *Baker grins wide.* "Then you know. You know exactly what I mean." (+8 relationship, \+5 morale)

**Option C:** "Save your breath, Baker. Conserve energy." → *He looks hurt for a second, then nods.* "Yeah. Yeah, you're right." (-3 relationship, the story ends)

---

### **14.5 Barkovitch — Provocation (Mile 12\)**

**Conditions:** mile 8-20, barkovitch alive.

**Barkovitch:** *He sidles up, grinning.* "Hey, New Columbia. I heard they only let you in the Walk because they needed somebody to fill the slot. Like a charity case." *His eyes are bright and mean.* "Must be nice, having a whole state nobody's ever heard of."

**Option A:** "You talk a lot for someone nobody's walking with." → *His grin flickers. You hit something.* "Yeah, well. I'll be dancing on your grave, 100\. Count on it." (-10 relationship)

**Option B:** "\[Ignore him.\]" → *He makes a disgusted sound and moves on to bother someone else.* (-5 relationship, but preserves morale)

**Option C:** "What's your Prize, Barkovitch? Somebody to finally like you?" → *His face goes blank. For just a second, the mask drops. Then it's back.* "Funny guy. We'll see who's laughing at mile 200." (-15 relationship, but sets flag "barkovitch\_wounded")

---

## **15\. Tone & Design Principles**

### **15.1 Dread Over Action**

This is not a game about winning. It is a game about enduring. Every mechanic should reinforce the feeling that the situation is hopeless, but the human will to continue is extraordinary. The player should feel the weight of each mile.

### **15.2 Characters Matter**

The walkers are not HP bars. They are teenage boys with families, fears, dreams, and flaws. Their eliminations should land emotionally. The player should remember Art Baker's story about his dog. They should feel McVries' quiet resignation. Barkovitch's dance should haunt them.

### **15.3 The Player Is an Outsider**

New Columbia is a narrative device. The player enters the Walk with no history, no connections, no reputation. Everything must be earned. Some walkers will be curious. Some will be suspicious. Some won't care. This mirrors the player's actual experience — entering a story already in progress.

### **15.4 Faithful but Expandable**

The canon events of the novel (Olson's breakdown, Scramm's cold, Parker's charge, McVries' choice, Stebbins' revelation) happen regardless of the player. The player is a new variable — they can witness, influence, or be adjacent to these events, but the Walk's story is bigger than any one walker. The player's presence creates new narrative possibilities without overwriting the source material.

### **15.5 The Prize Is Personal**

Whatever the player types as their Prize is sacred to the narrative. It echoes back. It becomes a question: *is anything worth this?* The game never answers. The player must.

### **15.6 Respectful Elimination**

Eliminations are not spectacles. They are losses. The game should never celebrate a walker's death or treat it as a score event. Each elimination reduces the world. The game's atmosphere should reflect this cumulative loss.

### **15.7 Silence Is Powerful**

Not every moment needs dialogue. Not every mile needs an event. Some of the game's most powerful moments should be long stretches of nothing but footsteps, engine drone, and the slowly changing sky. Let the player sit in it.

---

## **Appendix A — Elimination Order**

Approximate elimination order by mile marker (±10 miles for variance). The player's actions do not change NPC elimination order (NPCs are on fixed arcs), but the player's own survival is fully in their hands.

| Mile | Walker(s) Eliminated | Notes |
| ----- | ----- | ----- |
| 5-10 | Tier 3 walkers (3-4) | First shocking eliminations. Reality check. |
| 10-15 | Curley (\#7) | Named early death. Establishes stakes. |
| 15-25 | Tier 3 walkers (5-6), Barkovitch's victim | Barkovitch incident causes a death. |
| 25-40 | Wyman (\#97), Tier 3 walkers (4-5) | Wyman was the dare kid. |
| 40-60 | Ewing (\#9), Tier 3 walkers (6-8) | The grind begins. |
| 60-90 | Toland (\#92), Zuck (\#98), Tier 3 (5-6) | Hills take their toll. Zuck near his hometown. |
| 90-110 | Percy (\#31), Pearson (\#60), **Olson (\#70)** | Olson's breakdown is the landmark event. |
| 110-130 | Fenter (\#18), Rank (\#72), Tier 3 (4-5) | Fenter's last joke. |
| 130-160 | Travin (\#91), Abraham (\#2), Klingerman (\#55), Tier 3 (3-4) | Thinning rapidly. |
| 160-180 | Gallant (\#20), **Scramm (\#45)**, Tier 3 (2-3) | Scramm's death. The pact. |
| 180-220 | **Baker (\#3)**, Harkness (\#49), Tier 3 (2-3) | Baker's interrupted story. Harkness drops notebook. |
| 220-250 | **Barkovitch (\#5)**, Rattigan (\#75), Tier 3 (1-2) | Barkovitch's dance. |
| 250-300 | **Parker (\#34)**, Jensen (\#52), Tier 3 (1-2) | Parker's charge. |
| 300-350 | **McVries (\#61)**, remaining Tier 3 | McVries sits down. |
| 350-399 | **Stebbins (\#88)** | Stebbins collapses. The betrayal. |
| 400+ | Garraty (\#47) OR Player \#100 | Final two. Ending determined. |

---

## **Appendix B — Route & Environment Map**

The walk roughly follows US Route 1 from the Maine/Canada border heading south.

| Mile Range | Location | Terrain | Crowd | Notes |
| ----- | ----- | ----- | ----- | ----- |
| 0-10 | Maine/Canada border, rural | Flat | Sparse, excited | Starting area. Cold morning. |
| 10-30 | Northern Maine woods | Flat to rolling | Sparse | Isolated. Dark trees. |
| 30-50 | Small Maine towns | Flat | Moderate | First real crowds. Signs and banners. |
| 50-80 | Coastal Maine | Rolling hills | Moderate to heavy | Hills are a gauntlet. Ocean views. |
| 80-100 | Through a larger town | Flat | Heavy | Spectacle. Noise. Confetti. |
| 100-130 | Southern Maine | Mixed | Moderate | Rain belt. Weather deteriorates. |
| 130-150 | Approaching Freeport/Portland area | Flat | Heavy | Jan sighting for Garraty. |
| 150-200 | Continuing south | Mixed | Variable | Day 2 begins. Fatigue is real. |
| 200-250 | New Hampshire border area | Hilly | Thinning | Fewer walkers, fewer crowds. |
| 250-300 | Through smaller towns | Mixed | Sparse to moderate | Late game. Surreal. |
| 300-350 | Open road | Flat | Sparse to none | Almost empty. The world narrows. |
| 350-400 | The final stretch | Flat | Massive for finale | Crowds return for the end. |

---

## **Appendix C — Crowd Behavior Model**

The crowd represents the outside world watching the Walk. Their behavior is a game mechanic and a narrative device.

| Phase | Miles | Crowd Density | Mood | Behavior |
| ----- | ----- | ----- | ----- | ----- |
| **Festival** | 0-50 | Moderate to heavy | Excited, celebratory | Cheering, holding signs, throwing confetti. Some hold signs with walker names/numbers. Children wave. It feels like a parade. |
| **Investment** | 50-120 | Heavy | Passionate, partisan | Crowds have favorites. They cheer specific walkers. Some boo walkers they dislike. Signs become more personal. "GO GARRATY\!" |
| **Morbid** | 120-200 | Moderate | Subdued, voyeuristic | The crowd is quieter. They watch more intently. Some are clearly hoping to witness an elimination. The atmosphere shifts from celebration to spectacle. |
| **Uneasy** | 200-300 | Sparse to moderate | Uncomfortable, eerie | Some spectators stand in complete silence. Others stare blankly. Occasional signs with strange messages. The crowd feels wrong. |
| **Surreal** | 300-400 | Sparse to massive (for finale) | Uncanny, hostile, religious | At the end, the crowd becomes a force. They are no longer individual people — they are an entity. Hands reach. Faces blur. The crowd wants blood, or revelation, or both. The final crowd is enormous and terrifying. |

---

## **End of Product Brief**

This document contains all specifications necessary to build *The Long Walk* as a fully playable video game. It should be provided to Claude Code alongside the prompt chain (Section 13\) to guide incremental development from scaffolding to completion.

The walk begins at the border. The road heads south. Keep walking.

*"It's not how long you walk. It's how long you last."*

