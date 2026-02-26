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
export type NarrativeType = 'narration' | 'dialogue' | 'warning' | 'elimination' | 'system' | 'thought' | 'crowd' | 'hallucination' | 'event';
export type Act = 1 | 2 | 3 | 4;
export type HorrorTier = 1 | 2 | 3 | 4;

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
  warningTimer: number;  // game-minutes since last warning (3600s = 60min to walk off)
  alive: boolean;
  position: PackPosition;
  foodCooldown: number;  // game-minutes until food can be requested
  waterCooldown: number; // game-minutes until water can be requested
  alliances: number[];   // walker_numbers of allied NPCs
  flags: Record<string, boolean>;
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
  conversationFlags: Record<string, boolean>;
  eliminatedAtMile: number | null;
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
