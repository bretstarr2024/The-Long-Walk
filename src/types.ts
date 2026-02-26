// ============================================================
// The Long Walk — Complete Type Definitions
// Aligned with Product Brief v1.0
// ============================================================

// --- Enums & Unions ---

export type Reason = 'prove' | 'unknown' | 'someone' | 'prize';
export type PackPosition = 'front' | 'middle' | 'back';
export type Weather = 'clear' | 'cloudy' | 'rain' | 'heavy_rain' | 'fog' | 'cold';
export type Terrain = 'flat' | 'uphill' | 'downhill' | 'rough';
export type CrowdDensity = 'none' | 'sparse' | 'moderate' | 'heavy' | 'massive';
export type CrowdMood = 'excited' | 'cheering' | 'subdued' | 'uneasy' | 'hostile' | 'surreal';
export type BehavioralState = 'steady' | 'struggling' | 'talking' | 'breaking_down' | 'eliminated';
export type AlliancePotential = 'none' | 'low' | 'medium' | 'high';
export type Screen = 'title' | 'creation' | 'intro' | 'game' | 'dialogue' | 'gameover';
export type NarrativeType = 'narration' | 'dialogue' | 'warning' | 'elimination' | 'system' | 'thought' | 'crowd' | 'hallucination' | 'event' | 'overheard';
export type Act = 1 | 2 | 3 | 4;
export type HorrorTier = 1 | 2 | 3 | 4;

export type CrisisType =
  | 'stumble'
  | 'falling_asleep'
  | 'blister_burst'
  | 'cramp_lockup'
  | 'vomiting'
  | 'panic_attack'
  | 'bathroom_emergency'
  | 'hypothermia'
  | 'ally_stumble'
  | 'stranger_plea';

// --- Crisis System ---

export interface CrisisEffects {
  stamina?: number;
  pain?: number;
  morale?: number;
  hydration?: number;
  hunger?: number;
  clarity?: number;
  speedOverride?: number;      // force speed to this value
  speedDuration?: number;      // game-minutes the override lasts
  staminaDrainMult?: number;   // temporary stamina drain multiplier
  staminaDrainDuration?: number;
  warningRisk?: number;        // 0-1 chance of warning
  bladderReset?: boolean;
  // Ally effects
  allyStamina?: number;
  allyMorale?: number;
  allyHunger?: number;
  allyHydration?: number;
  allyRelationship?: number;
  allySpeedBoost?: boolean;
  // Special
  breakAlliance?: boolean;     // alliance breaks
  allyStrain?: number;         // strain added to ally
}

export interface CrisisOption {
  id: string;
  label: string;
  description: string;
  effects: CrisisEffects;
  requiresAlly: boolean;
  narrative: string;
}

export interface ActiveCrisis {
  type: CrisisType;
  title: string;
  description: string;
  options: CrisisOption[];
  timeLimit: number;           // game-minutes total
  timeRemaining: number;       // game-minutes left
  speedOverride?: number;      // forced speed during crisis
  defaultEffects: CrisisEffects;
  defaultNarrative: string;
  targetWalker?: number;       // walker number for ally_stumble / stranger_plea
}

// Temporary effects applied after crisis resolution
export interface TempEffect {
  type: 'speed_override' | 'stamina_drain_mult' | 'morale_delayed';
  value: number;
  remaining: number;           // game-minutes remaining
}

// --- Player ---

export interface PlayerState {
  name: string;
  age: number;
  reason: Reason;
  prize: string;
  walkerNumber: 100;
  stamina: number;       // 0-100
  speed: number;         // current actual mph
  targetSpeed: number;   // what the player wants
  hydration: number;     // 0-100
  hunger: number;        // 0-100
  pain: number;          // 0-100
  morale: number;        // 0-100
  clarity: number;       // 0-100
  warnings: number;      // 0-3
  warningTimer: number;  // game-minutes walk-off counter (60 min above 4.0 to clear a warning)
  slowAccum: number;     // game-minutes accumulated below 4.0 mph (threshold → warning)
  lastWarningTime: number; // game-hours when last warning was issued (cooldown enforcement)
  alive: boolean;
  position: PackPosition;
  foodCooldown: number;  // game-minutes until food can be requested
  waterCooldown: number; // game-minutes until water can be requested
  alliances: number[];   // walker_numbers of allied NPCs
  flags: Record<string, boolean>;
  bladder: number;       // 0-100
  activeCrisis: ActiveCrisis | null;
  lastCrisisMile: number;
  tempEffects: TempEffect[];
}

// --- Walker Arc System ---

export type ArcPhase = 'introduction' | 'opening_up' | 'vulnerability' | 'crisis' | 'farewell';

export interface WalkerArcStage {
  arcPhase: ArcPhase;
  mileRange: [number, number];
  minConversations: number;
  promptHint: string;
}

// --- NPC Relationship Arcs (overheard conversations between walkers) ---

export interface NPCRelationshipStage {
  id: string;
  mileRange: [number, number];
  scenePrompt: string;
  previousContext?: string;  // "previously..." text for LLM
}

export interface NPCRelationship {
  walkerA: number;
  walkerB: number;
  type: 'friendship' | 'rivalry' | 'mentorship' | 'shared_suffering' | 'conflict';
  stages: NPCRelationshipStage[];
}

// --- Scene System (cinematic overlays) ---

export interface ScenePanel {
  text: string;
  type: NarrativeType;
}

export interface ActiveScene {
  id: string;
  panels: ScenePanel[];
  currentPanel: number;
}

// --- Approach System (NPC-initiated conversations) ---

export type ApproachType =
  | 'arc_milestone'
  | 'elimination_reaction'
  | 'warning_check'
  | 'vulnerability'
  | 'offer_alliance'
  | 'crisis_aftermath'
  | 'introduction'
  | 'proximity';

export interface ApproachState {
  walkerId: number;
  walkerName: string;
  type: ApproachType;
  text: string;        // the NPC's opening line (from LLM)
  isStreaming: boolean; // still waiting for LLM response
  streamBuffer: string;
  startTime: number;   // real timestamp for auto-dismiss
}

// --- NPC Walker ---

export interface WalkerData {
  name: string;
  walkerNumber: number;
  age: number;
  homeState: string;
  tier: 1 | 2 | 3;
  personalityTraits: string[];
  dialogueStyle: string;
  backstoryNotes: string;
  initialRelationship: number; // -100 to 100
  eliminationMile: number;
  eliminationNarrative: string;
  keyScenes: string[];
  alliancePotential: AlliancePotential;
  physicalState: 'strong' | 'average' | 'weak';
  psychologicalArchetype: string;
  walkingPosition: PackPosition;
  // Character development (optional, Tier 1/2 only)
  arcStages?: WalkerArcStage[];
  declineNarratives?: string[];
  eliminationScene?: ScenePanel[];
}

export interface WalkerState {
  walkerNumber: number;
  alive: boolean;
  stamina: number;
  speed: number;
  pain: number;
  morale: number;
  clarity: number;
  warnings: number;
  warningTimer: number;  // game-minutes: walk-off counter (60 min to clear a warning)
  position: PackPosition;
  relationship: number;  // -100 to 100 toward player
  behavioralState: BehavioralState;
  isAlliedWithPlayer: boolean;
  allyStrain: number;    // 0-100, strain from player leaning on this ally
  conversationFlags: Record<string, boolean>;
  eliminatedAtMile: number | null;
  conversationCount: number;    // completed conversations with player
  revealedFacts: string[];      // facts shared via LLM share_info tool
  playerActions: string[];      // what player has done for this walker
  lastDeclineNarrativeMile: number;  // mile of last decline narrative shown
}

// --- World ---

export interface WorldState {
  milesWalked: number;
  hoursElapsed: number;
  currentTime: string;     // HH:MM
  dayNumber: number;
  isNight: boolean;
  weather: Weather;
  terrain: Terrain;
  crowdDensity: CrowdDensity;
  crowdMood: CrowdMood;
  currentAct: Act;
  horrorTier: HorrorTier;
}

// --- Events ---

export interface GameEvent {
  id: string;
  type: 'elimination' | 'dialogue' | 'hallucination' | 'crowd' | 'weather' | 'terrain' | 'milestone' | 'scripted_scene';
  triggerMile: number;
  triggerConditions?: (state: GameState) => boolean;
  priority: number;
  fired: boolean;
  execute: (state: GameState) => NarrativeEntry[];
  presentation?: 'ambient' | 'scene';
  scenePanels?: ScenePanel[];
}

// --- Dialogue ---

export interface DialogueNode {
  id: string;
  speaker: number; // walker number
  text: string;
  conditions: DialogueConditions;
  options: DialogueOption[];
}

export interface DialogueConditions {
  mileRange?: [number, number];
  relationshipMin?: number;
  walkerAlive?: number;    // check this walker is alive
  flagRequired?: string;
  flagAbsent?: string;
  clarityMin?: number;
  maxWalkersRemaining?: number;
  playerPosition?: PackPosition;
  playerReason?: Reason;
}

export interface DialogueOption {
  text: string;
  response: string;
  effects?: {
    relationship?: number;
    playerMorale?: number;
    npcMorale?: number;
    setFlag?: string;
    info?: string;
  };
  requires?: {
    playerReason?: Reason;
    flag?: string;
  };
  nextNode?: string;
}

export interface DialogueInstance {
  walkerNumber: number;
  walkerName: string;
  currentNodeId: string;
  text: string;
  options: DialogueOption[];
  turnsTaken: number;
  maxTurns: number;
}

// --- Narrative ---

export interface NarrativeEntry {
  mile: number;
  hour: number;
  text: string;
  type: NarrativeType;
}

// --- Conversation History ---

export interface ConversationRecord {
  walkerNumber: number;
  mile: number;
  hour: number;
  nodeId: string;
  relationshipChange: number;
}

// --- LLM Dialogue ---

export interface LLMDialogueMessage {
  role: 'player' | 'walker';
  text: string;
}

export interface LLMDialogueState {
  walkerId: number;
  walkerName: string;
  messages: LLMDialogueMessage[];
  isStreaming: boolean;
  streamBuffer: string;
}

// --- Master Game State ---

export interface GameState {
  player: PlayerState;
  world: WorldState;
  walkers: WalkerState[];
  walkerData: WalkerData[];
  narrativeLog: NarrativeEntry[];
  activeDialogue: DialogueInstance | null;
  llmDialogue: LLMDialogueState | null;
  llmAvailable: boolean;
  conversationHistory: ConversationRecord[];
  eventLog: string[];
  triggeredEvents: Set<string>;
  eliminationCount: number;
  gameSpeed: number;    // 1, 2, 4, 8
  isPaused: boolean;
  screen: Screen;
  playtimeMs: number;
  lastTickTime: number;
  introStep: number;    // for multi-step intro sequence
  lastOverheardMile: number;    // mile of last overheard conversation
  overhearInProgress: boolean;  // prevents overlapping LLM overheards
  activeScene: ActiveScene | null;
  activeApproach: ApproachState | null;
  lastApproachMile: number;
  approachInProgress: boolean;  // prevents overlapping approach LLM calls
  lastWarningMile: number;      // mile of player's most recent warning (for approach triggers)
  lastCrisisResolveMile: number; // mile of last resolved crisis (for approach triggers)
}

// --- Route Data ---

export interface RouteSegment {
  startMile: number;
  endMile: number;
  terrain: Terrain;
  location: string;
  crowdDensity: CrowdDensity;
  notes: string;
}

export interface CrowdPhase {
  startMile: number;
  endMile: number;
  mood: CrowdMood;
  description: string;
}
