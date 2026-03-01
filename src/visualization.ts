// ============================================================
// The Long Walk — Green Phosphor Radar Visualization
// 1980s military radar / oscilloscope aesthetic
// ============================================================

import { GameState, WalkerState, STAT_LABELS, ProximityZone } from './types';
import { getRouteSegment, getCrowdPhase } from './data/route';
import { getPositionTransition } from './engine';
import { getWalkerData, getWalkerState } from './state';

// ============================================================
// PHOSPHOR PALETTE
// Green monochrome — red reserved for danger only
// ============================================================

const PHOSPHOR = '#40FF60';
const PHOSPHOR_DIM = 'rgba(64, 255, 96, 0.3)';
const PHOSPHOR_MID = 'rgba(64, 255, 96, 0.55)';
const PHOSPHOR_BRIGHT = 'rgba(64, 255, 96, 0.8)';
const DANGER_RED = 'rgba(255, 60, 60, 0.8)';
const DANGER_RED_DIM = 'rgba(255, 60, 60, 0.4)';

// Proximity zone radii (canvas pixels)
const WHISPER_RADIUS = 30;
const TALK_RADIUS = 60;
const SHOUT_RADIUS = 100;

// Walker screen positions (updated each frame, used by getWalkerProximity)
const walkerPositions = new Map<number, { x: number; y: number }>();
let playerScreenX = 0;
let playerScreenY = 0;

/** Get the proximity zone of a walker relative to the player */
export function getWalkerProximity(state: GameState, walkerNumber: number): ProximityZone {
  const wPos = walkerPositions.get(walkerNumber);
  if (!wPos) return 'none';
  const dx = wPos.x - playerScreenX;
  const dy = wPos.y - playerScreenY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist <= WHISPER_RADIUS) return 'whisper';
  if (dist <= TALK_RADIUS) return 'talk';
  if (dist <= SHOUT_RADIUS) return 'shout';
  return 'none';
}

// ============================================================
// HELPERS
// ============================================================

function seededJitter(seed: number, frame: number): number {
  const x = Math.sin(seed * 12.9898 + frame * 0.01) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

function positionBand(pos: string): [number, number] {
  switch (pos) {
    case 'front': return [0.08, 0.32];
    case 'middle': return [0.35, 0.62];
    case 'back': return [0.65, 0.88];
    default: return [0.35, 0.62];
  }
}

/** Offset player Y within band based on speed relative to 4.0 mph. Faster = toward front (negative). */
function playerSpeedOffset(speed: number, band: [number, number]): number {
  const bandHalf = (band[1] - band[0]) / 2;
  const delta = Math.max(-1, Math.min(1, (speed - 4.0) / 2.0));
  return -delta * bandHalf * 0.3;
}

function crowdCount(density: string): number {
  switch (density) {
    case 'none': return 0;
    case 'sparse': return 10;
    case 'moderate': return 22;
    case 'heavy': return 36;
    case 'massive': return 55;
    default: return 0;
  }
}

/** Map walker health to green brightness alpha (0.2 = critical, 1.0 = healthy) */
function walkerAlpha(w: WalkerState): number {
  const health = (w.stamina + (100 - w.pain) + w.morale) / 300;
  if (health > 0.7) return 1.0;
  if (health > 0.4) return 0.7;
  if (health > 0.2) return 0.45;
  return 0.25;
}

/** Compute walker X,Y on screen. Returns null if walker is dead/missing data. */
function walkerScreenPos(
  w: WalkerState, H: number, roadLeft: number, roadWidth: number, frame: number
): { x: number; y: number } {
  const band = positionBand(w.position);
  const seed = w.walkerNumber;
  const jx = seededJitter(seed, frame * 0.12) * 0.5;
  const jy = seededJitter(seed + 100, frame * 0.1) * 0.5;
  // Walking bob: subtle vertical oscillation tied to speed
  const bob = Math.sin(frame * 0.1 * Math.max(w.speed, 0.5) + seed * 2.7) * 1;
  const baseX = roadLeft + roadWidth * (0.15 + (seededJitter(seed * 3, 0) * 0.5 + 0.5) * 0.7);
  const baseY = H * (band[0] + (band[1] - band[0]) * ((seed % 23) / 23));
  return { x: baseX + jx, y: baseY + jy + bob };
}

// ============================================================
// TERRAIN SYMBOLS
// Deterministic procedural generation by mile number
// ============================================================

type TerrainSymbol = 'tree' | 'hill' | 'building' | 'water' | 'field' | 'steeple';

interface TerrainObj {
  type: TerrainSymbol;
  xFrac: number;  // 0-1 fraction of margin width
  yFrac: number;  // 0-1 fraction within sub-mile row
}

/** Seeded pseudo-random 0-1 for terrain generation */
function terrainRand(mile: number, idx: number): number {
  const x = Math.sin(mile * 127.1 + idx * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Generate terrain symbols for a given mile based on route location */
function getTerrainForMile(mile: number, location: string): TerrainObj[] {
  const objs: TerrainObj[] = [];
  const loc = location.toLowerCase();

  // Determine symbol set and density from location keywords
  let types: TerrainSymbol[];
  let density: number;

  if (loc.includes('woods') || loc.includes('northern maine')) {
    types = ['tree', 'tree', 'tree', 'tree', 'field'];
    density = 8;
  } else if (loc.includes('small') && loc.includes('town')) {
    types = ['building', 'tree', 'tree', 'building', 'steeple'];
    density = 6;
  } else if (loc.includes('coastal') || loc.includes('coast')) {
    types = ['hill', 'hill', 'tree', 'water', 'water'];
    density = 5;
  } else if (loc.includes('descent')) {
    types = ['hill', 'hill', 'tree', 'building'];
    density = 5;
  } else if (loc.includes('larger town') || loc.includes('portland') || loc.includes('freeport') || loc.includes('population')) {
    types = ['building', 'building', 'building', 'steeple', 'tree'];
    density = 7;
  } else if (loc.includes('deteriorat') || loc.includes('rough')) {
    types = ['hill', 'field', 'field'];
    density = 3;
  } else if (loc.includes('smaller town') || loc.includes('storefronts')) {
    types = ['building', 'field', 'building'];
    density = 3;
  } else if (loc.includes('open road') || loc.includes('narrows')) {
    types = ['field'];
    density = 1;
  } else if (loc.includes('final stretch') || loc.includes('finale')) {
    types = ['field'];
    density = 0; // Crowd figures dominate instead
  } else if (loc.includes('border') || loc.includes('rural')) {
    types = ['tree', 'field', 'tree'];
    density = 4;
  } else if (loc.includes('new hampshire') || loc.includes('hills return')) {
    types = ['hill', 'hill', 'tree', 'field'];
    density = 5;
  } else {
    // Default: scattered trees and fields
    types = ['tree', 'field', 'tree'];
    density = 3;
  }

  for (let i = 0; i < density; i++) {
    const typeIdx = Math.floor(terrainRand(mile, i * 3) * types.length);
    objs.push({
      type: types[typeIdx],
      xFrac: terrainRand(mile, i * 3 + 1),
      yFrac: terrainRand(mile, i * 3 + 2),
    });
  }
  return objs;
}

// Terrain cache: keyed by mile integer, holds last 5 miles
const terrainCache = new Map<number, TerrainObj[]>();
const TERRAIN_CACHE_SIZE = 5;

function getCachedTerrain(mile: number, location: string): TerrainObj[] {
  const key = Math.floor(mile);
  const cached = terrainCache.get(key);
  if (cached) return cached;
  const objs = getTerrainForMile(key, location);
  terrainCache.set(key, objs);
  // Evict old entries
  if (terrainCache.size > TERRAIN_CACHE_SIZE) {
    const oldest = terrainCache.keys().next().value;
    if (oldest !== undefined) terrainCache.delete(oldest);
  }
  return objs;
}

/** Draw a terrain symbol at the given position */
function drawTerrainSymbol(
  ctx: CanvasRenderingContext2D, type: TerrainSymbol,
  x: number, y: number, alpha: number
) {
  ctx.strokeStyle = `rgba(64, 255, 96, ${alpha})`;
  ctx.lineWidth = 0.6;

  switch (type) {
    case 'tree':
      // Vertical trunk + triangle top
      ctx.beginPath();
      ctx.moveTo(x, y + 3); ctx.lineTo(x, y - 1);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - 2, y - 1); ctx.lineTo(x, y - 4); ctx.lineTo(x + 2, y - 1);
      ctx.closePath();
      ctx.stroke();
      break;
    case 'hill':
      // Triangle outline
      ctx.beginPath();
      ctx.moveTo(x - 4, y + 2); ctx.lineTo(x, y - 3); ctx.lineTo(x + 4, y + 2);
      ctx.stroke();
      break;
    case 'building':
      // Small rectangle
      ctx.strokeRect(x - 2, y - 2, 4, 4);
      break;
    case 'steeple':
      // Taller rectangle + pointed top
      ctx.strokeRect(x - 2, y - 1, 4, 5);
      ctx.beginPath();
      ctx.moveTo(x - 2, y - 1); ctx.lineTo(x, y - 4); ctx.lineTo(x + 2, y - 1);
      ctx.stroke();
      break;
    case 'water':
      // Wavy line
      ctx.beginPath();
      ctx.moveTo(x - 4, y);
      ctx.quadraticCurveTo(x - 2, y - 1.5, x, y);
      ctx.quadraticCurveTo(x + 2, y + 1.5, x + 4, y);
      ctx.stroke();
      break;
    case 'field':
      // Short horizontal dash at ground level
      ctx.beginPath();
      ctx.moveTo(x - 2, y); ctx.lineTo(x + 2, y);
      ctx.stroke();
      break;
  }
}

// ============================================================
// STATE
// ============================================================

let frameCounter = 0;
let tooltipWalker: { name: string; status: string; x: number; y: number } | null = null;

// Pre-rendered scanline overlay (rebuilt only when dimensions change)
let scanlineCanvas: HTMLCanvasElement | null = null;
let scanlineW = 0;
let scanlineH = 0;

// Cached canvas dimensions from ResizeObserver
let cachedCanvasWidth = 0;
let cachedCanvasHeight = 0;
let canvasResizeObserver: ResizeObserver | null = null;

// Road scrolling state
let scrollOffset = 0;           // pixels, wraps at dash period
let lastRenderTime = 0;         // for frame-rate-independent scrolling
const SPEED_TO_PX = 12;         // pixels-per-second per mph (tunable)
const DASH_PERIOD = 18;         // road dash spacing (6 dash + 12 gap)
const TICK_PERIOD = 24;         // shoulder tick spacing

// Elimination flash state
let eliminationFlashFrames = 0;

// Track recent eliminations for X marks
interface EliminationMark {
  x: number;
  y: number;
  mile: number;
  birthFrame: number;
}
const eliminationMarks: EliminationMark[] = [];
let lastEliminationCount = 0;

// ============================================================
// INIT
// ============================================================

export function initVisualization(canvas: HTMLCanvasElement) {
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    (canvas as any)._mouseX = mx;
    (canvas as any)._mouseY = my;
  });

  canvas.addEventListener('mouseleave', () => {
    (canvas as any)._mouseX = -1;
    (canvas as any)._mouseY = -1;
    tooltipWalker = null;
  });

  // Cache canvas dimensions via ResizeObserver
  if (canvasResizeObserver) canvasResizeObserver.disconnect();
  canvasResizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      cachedCanvasWidth = entry.contentRect.width;
      cachedCanvasHeight = entry.contentRect.height;
    }
  });
  canvasResizeObserver.observe(canvas);

  const initRect = canvas.getBoundingClientRect();
  cachedCanvasWidth = initRect.width;
  cachedCanvasHeight = initRect.height;
}

// ============================================================
// RENDER
// ============================================================

export function updateVisualization(state: GameState, canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Sync canvas buffer to display size with DPI scaling
  const rawW = cachedCanvasWidth || canvas.getBoundingClientRect().width;
  const rawH = cachedCanvasHeight || canvas.getBoundingClientRect().height;
  const displayW = Math.floor(rawW);
  const displayH = Math.floor(rawH);
  const dpr = window.devicePixelRatio || 1;
  const bufferW = Math.floor(displayW * dpr);
  const bufferH = Math.floor(displayH * dpr);
  if (bufferW > 0 && bufferH > 0 && (canvas.width !== bufferW || canvas.height !== bufferH)) {
    canvas.width = bufferW;
    canvas.height = bufferH;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  frameCounter++;

  // Update scroll offset (frame-rate-independent)
  const now = performance.now();
  if (lastRenderTime > 0) {
    const dt = Math.min((now - lastRenderTime) / 1000, 0.5); // cap at 0.5s to prevent jumps
    scrollOffset += state.player.speed * SPEED_TO_PX * dt;
    // Wrap at LCM of dash and tick periods to prevent float drift
    if (scrollOffset > DASH_PERIOD * TICK_PERIOD) {
      scrollOffset -= DASH_PERIOD * TICK_PERIOD;
    }
  }
  lastRenderTime = now;

  const W = displayW;
  const H = displayH;
  const mx = (canvas as any)._mouseX ?? -1;
  const my = (canvas as any)._mouseY ?? -1;

  const roadLeft = W * 0.3;
  const roadRight = W * 0.7;
  const roadCenter = W * 0.5;
  const roadWidth = roadRight - roadLeft;

  // Track new eliminations for flash + X marks
  const currentElimCount = state.eliminationCount;
  if (currentElimCount > lastEliminationCount) {
    eliminationFlashFrames = 5;
    // Find newly eliminated walkers and record their positions
    for (const w of state.walkers) {
      if (!w.alive && w.eliminatedAtMile !== null) {
        const milesSince = state.world.milesWalked - w.eliminatedAtMile;
        if (milesSince < 0.1) {
          const pos = walkerScreenPos(w, H, roadLeft, roadWidth, frameCounter);
          eliminationMarks.push({ x: pos.x, y: pos.y, mile: w.eliminatedAtMile, birthFrame: frameCounter });
        }
      }
    }
  }
  lastEliminationCount = currentElimCount;

  // Clean old marks (>4 miles ago)
  while (eliminationMarks.length > 0 && state.world.milesWalked - eliminationMarks[0].mile > 4) {
    eliminationMarks.shift();
  }

  // ==========================================================
  // LAYER 1: BLACK BACKGROUND
  // ==========================================================

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, W, H);

  // Night: dim everything slightly (applied to base)
  if (state.world.isNight) {
    // Night is already black — we'll dim the green elements below via alpha
  }

  // Elimination flash: brief red wash
  if (eliminationFlashFrames > 0) {
    ctx.fillStyle = `rgba(255, 0, 0, ${0.15 * (eliminationFlashFrames / 5)})`;
    ctx.fillRect(0, 0, W, H);
    eliminationFlashFrames--;
  }

  // ==========================================================
  // LAYER 2: ROAD LINES (scrolling green phosphor strokes)
  // ==========================================================

  const nightDim = state.world.isNight ? 0.7 : 1.0;

  // Road shoulder lines (solid — don't scroll, they're the road edge)
  ctx.strokeStyle = `rgba(64, 255, 96, ${0.2 * nightDim})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(roadLeft, 0);
  ctx.lineTo(roadLeft, H);
  ctx.moveTo(roadRight, 0);
  ctx.lineTo(roadRight, H);
  ctx.stroke();

  // Shoulder tick marks (scroll with road — perpendicular dashes)
  ctx.strokeStyle = `rgba(64, 255, 96, ${0.12 * nightDim})`;
  ctx.lineWidth = 0.6;
  const tickStart = (scrollOffset % TICK_PERIOD) - TICK_PERIOD;
  for (let ty = tickStart; ty < H; ty += TICK_PERIOD) {
    // Left shoulder tick
    ctx.beginPath();
    ctx.moveTo(roadLeft - 4, ty);
    ctx.lineTo(roadLeft, ty);
    ctx.stroke();
    // Right shoulder tick
    ctx.beginPath();
    ctx.moveTo(roadRight, ty);
    ctx.lineTo(roadRight + 4, ty);
    ctx.stroke();
  }

  // Road center dashes (scroll with road — moves downward as walkers advance)
  ctx.strokeStyle = `rgba(64, 255, 96, ${0.25 * nightDim})`;
  ctx.lineWidth = 1;
  const dashLen = 6;
  const dashGap = 12;
  const dashStart = (scrollOffset % DASH_PERIOD) - DASH_PERIOD;
  for (let dy = dashStart; dy < H; dy += DASH_PERIOD) {
    ctx.beginPath();
    ctx.moveTo(roadCenter, dy);
    ctx.lineTo(roadCenter, dy + dashLen);
    ctx.stroke();
  }

  // Faint horizontal zone dividers (fixed — these mark pack zones)
  ctx.strokeStyle = `rgba(64, 255, 96, ${0.08 * nightDim})`;
  ctx.lineWidth = 0.5;
  ctx.setLineDash([2, 6]);
  ctx.beginPath();
  ctx.moveTo(roadLeft, H * 0.33);
  ctx.lineTo(roadRight, H * 0.33);
  ctx.moveTo(roadLeft, H * 0.63);
  ctx.lineTo(roadRight, H * 0.63);
  ctx.stroke();
  ctx.setLineDash([]);

  // --- Procedural terrain on margins (scroll with road) ---
  {
    const currentMile = state.world.milesWalked;
    const marginWidthL = roadLeft - 8;   // left margin usable width
    const marginWidthR = W - roadRight - 8; // right margin usable width
    // Render terrain for ~3 miles around current position
    const mileStart = Math.floor(currentMile) - 1;
    const mileEnd = Math.floor(currentMile) + 2;
    const milesOnScreen = 3;
    const pixPerMile = H / milesOnScreen;

    for (let m = mileStart; m <= mileEnd; m++) {
      if (m < 0 || m > 400) continue;
      const mSeg = getRouteSegment(m);
      const objs = getCachedTerrain(m, mSeg.location);
      // Y position: miles ahead appear above center (top=front), miles behind below
      const mileDelta = m - currentMile;
      const baseYForMile = H * 0.5 - mileDelta * pixPerMile;

      for (const obj of objs) {
        const objY = baseYForMile + obj.yFrac * pixPerMile;
        if (objY < -10 || objY > H + 10) continue;
        // Distance from road = brightness (closer = brighter)
        const distAlpha = 0.12 + (1 - obj.xFrac) * 0.15;

        // Left margin
        const lx = 8 + obj.xFrac * marginWidthL;
        drawTerrainSymbol(ctx, obj.type, lx, objY, distAlpha * nightDim);

        // Right margin (mirrored)
        const rx = roadRight + 8 + (1 - obj.xFrac) * marginWidthR;
        drawTerrainSymbol(ctx, obj.type, rx, objY, distAlpha * nightDim);
      }
    }
  }

  // ==========================================================
  // LAYER 3: WALKERS (green phosphor dots with glow)
  // ==========================================================

  const seg = getRouteSegment(state.world.milesWalked);

  // --- Crowd stick figures on margins (scroll with road) ---
  const numCrowd = crowdCount(seg.crowdDensity);
  if (numCrowd > 0) {
    const crowdSpacing = H / numCrowd;
    const crowdScrollStart = (scrollOffset % crowdSpacing) - crowdSpacing;
    for (let i = 0; i < numCrowd + 2; i++) {
      const baseIdx = i + Math.floor(scrollOffset / crowdSpacing);
      const jy = seededJitter(baseIdx + 700, 0) * 2;
      const ly = crowdScrollStart + i * crowdSpacing + jy;
      if (ly < -10 || ly > H + 10) continue;

      // Left side figure
      const lx = roadLeft - 12 - Math.abs(seededJitter(baseIdx, 0)) * (W * 0.12);
      drawStickFigure(ctx, lx, ly, 0.12 * nightDim);

      // Right side figure
      const rx = roadRight + 12 + Math.abs(seededJitter(baseIdx + 300, 0)) * (W * 0.12);
      drawStickFigure(ctx, rx, ly, 0.12 * nightDim);
    }
  }

  // --- Halftrack: green stroke rectangle ---
  const htY = H * 0.92;
  {
    const htW = 16;
    const htH = 8;
    ctx.strokeStyle = `rgba(64, 255, 96, ${0.5 * nightDim})`;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(roadCenter - htW / 2, htY - htH / 2, htW, htH);

    // Headlight wedge (brighter at night, slowly oscillating)
    if (state.world.isNight) {
      const sweep = Math.sin(frameCounter * 0.02) * roadWidth * 0.08;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(roadCenter - 3, htY - htH / 2);
      ctx.lineTo(roadCenter - roadWidth * 0.15 + sweep, htY - H * 0.15);
      ctx.lineTo(roadCenter + roadWidth * 0.15 + sweep, htY - H * 0.15);
      ctx.lineTo(roadCenter + 3, htY - htH / 2);
      ctx.closePath();
      ctx.fillStyle = 'rgba(64, 255, 96, 0.04)';
      ctx.fill();
      ctx.restore();
    }
  }

  // Soldiers flanking halftrack (small dots)
  for (let i = 0; i < 4; i++) {
    const sx = roadCenter - 14 + i * 9;
    const sy = htY + 12;
    ctx.fillStyle = `rgba(64, 255, 96, ${0.3 * nightDim})`;
    ctx.beginPath();
    ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- Elimination X marks + expanding rings ---
  for (const mark of eliminationMarks) {
    const milesSince = state.world.milesWalked - mark.mile;
    const fade = Math.max(0, 1 - milesSince / 4);

    // Expanding ring effect (first ~5 frames after elimination)
    const age = frameCounter - mark.birthFrame;
    if (age < 6) {
      const ringRadius = 5 + age * 8;
      const ringAlpha = Math.max(0, 0.5 - age * 0.08);
      ctx.strokeStyle = `rgba(255, 60, 60, ${ringAlpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(mark.x, mark.y, ringRadius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // X mark (persists, fading)
    ctx.strokeStyle = `rgba(255, 60, 60, ${fade * 0.6})`;
    ctx.lineWidth = 1.5;
    const sz = 4;
    ctx.beginPath();
    ctx.moveTo(mark.x - sz, mark.y - sz);
    ctx.lineTo(mark.x + sz, mark.y + sz);
    ctx.moveTo(mark.x + sz, mark.y - sz);
    ctx.lineTo(mark.x - sz, mark.y + sz);
    ctx.stroke();
  }

  // --- Alive walkers: phosphor dots ---
  tooltipWalker = null;
  walkerPositions.clear();

  // Save/restore shadow state around glow rendering
  ctx.save();

  for (const w of state.walkers) {
    if (!w.alive) continue;
    const data = getWalkerData(state, w.walkerNumber);
    if (!data) continue;

    const pos = walkerScreenPos(w, H, roadLeft, roadWidth, frameCounter);
    walkerPositions.set(w.walkerNumber, pos);
    const alpha = walkerAlpha(w) * nightDim;

    // Tier-based sizing
    let radius: number;
    let glowBlur: number;
    if (data.tier === 1) {
      radius = 4;
      glowBlur = 6;
    } else if (data.tier === 2) {
      radius = 3;
      glowBlur = 4;
    } else {
      radius = 1.5;
      glowBlur = 0;
    }

    // Breaking down: rapid blink (6Hz)
    if (w.behavioralState === 'breaking_down') {
      const blink = Math.sin(frameCounter * 0.38 + w.walkerNumber) > 0;
      if (!blink) continue; // skip this frame = blink off
    }

    // Struggling: slow alpha pulse
    let renderAlpha = alpha;
    if (w.behavioralState === 'struggling') {
      renderAlpha = alpha * (0.5 + 0.3 * Math.sin(frameCounter * 0.08 + w.walkerNumber));
    }

    // Draw phosphor dot
    ctx.fillStyle = `rgba(64, 255, 96, ${renderAlpha})`;
    ctx.shadowColor = PHOSPHOR;
    ctx.shadowBlur = glowBlur * renderAlpha;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Warning pips: RED dots (the only red on screen)
    if (w.warnings > 0) {
      ctx.shadowColor = 'rgba(255, 60, 60, 0.8)';
      ctx.shadowBlur = 3;
      ctx.fillStyle = DANGER_RED;
      for (let i = 0; i < w.warnings; i++) {
        ctx.beginPath();
        ctx.arc(pos.x + (i - 1) * 5, pos.y - radius - 4, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Hit test for tooltip (Tier 1 & 2 only)
    if (mx >= 0 && data.tier <= 2) {
      const dist = Math.sqrt((mx - pos.x) ** 2 + (my - pos.y) ** 2);
      if (dist < radius + glowBlur + 3) {
        const statusStr = w.behavioralState === 'steady'
          ? `${STAT_LABELS.stamina} ${w.stamina.toFixed(0)}%`
          : w.behavioralState.toUpperCase();
        tooltipWalker = {
          name: `${data.name} #${w.walkerNumber}`,
          status: `${statusStr} | WARN ${w.warnings}/3`,
          x: pos.x, y: pos.y,
        };
      }
    }
  }

  ctx.restore(); // Clear shadow state

  // --- Player dot (brightest, largest) ---
  {
    const trans = getPositionTransition();
    let py: number;
    if (trans) {
      const fromBand = positionBand(trans.from);
      const toBand = positionBand(trans.to);
      const fromY = (fromBand[0] + fromBand[1]) / 2;
      const toY = (toBand[0] + toBand[1]) / 2 + playerSpeedOffset(state.player.speed, toBand);
      const t = trans.progress < 0.5
        ? 2 * trans.progress * trans.progress
        : 1 - Math.pow(-2 * trans.progress + 2, 2) / 2;
      py = H * (fromY + (toY - fromY) * t);
    } else {
      const band = positionBand(state.player.position);
      py = H * ((band[0] + band[1]) / 2 + playerSpeedOffset(state.player.speed, band));
    }
    const px = roadCenter;

    // Store for proximity calculations
    playerScreenX = px;
    playerScreenY = py;

    // Proximity rings (whisper / talk / shout)
    const whisperPulse = 0.2 + 0.1 * Math.sin(frameCounter * 0.06);
    const talkPulse = 0.15 + 0.08 * Math.sin(frameCounter * 0.04);
    const shoutPulse = 0.08 + 0.05 * Math.sin(frameCounter * 0.025);

    // Shout ring (dotted, dimmest)
    ctx.strokeStyle = `rgba(64, 255, 96, ${shoutPulse * nightDim})`;
    ctx.lineWidth = 0.5;
    ctx.setLineDash([1, 3]);
    ctx.beginPath();
    ctx.arc(px, py, SHOUT_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Talk ring (dashed)
    ctx.strokeStyle = `rgba(64, 255, 96, ${talkPulse * nightDim})`;
    ctx.lineWidth = 0.6;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.arc(px, py, TALK_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Whisper ring (solid, brightest)
    ctx.strokeStyle = `rgba(64, 255, 96, ${whisperPulse * nightDim})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(px, py, WHISPER_RADIUS, 0, Math.PI * 2);
    ctx.stroke();

    // Player phosphor dot with strong glow
    ctx.save();
    ctx.fillStyle = PHOSPHOR;
    ctx.shadowColor = PHOSPHOR;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Speed danger: pulsing red ring when below 4.0
    if (state.player.speed < 4) {
      const pulse = 0.3 + 0.2 * Math.sin(frameCounter * 0.15);
      ctx.strokeStyle = `rgba(255, 60, 60, ${pulse})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(px, py, 10, 0, Math.PI * 2);
      ctx.stroke();
    }

    // --- Player label + targeting brackets ---
    ctx.fillStyle = PHOSPHOR_BRIGHT;
    ctx.font = 'bold 12px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('YOU', px, py - 16);

    // Targeting brackets
    ctx.strokeStyle = `rgba(64, 255, 96, ${0.5 * nightDim})`;
    ctx.lineWidth = 0.8;
    const s = 9;
    const c = 3;
    ctx.beginPath();
    ctx.moveTo(px - s, py - s + c); ctx.lineTo(px - s, py - s); ctx.lineTo(px - s + c, py - s);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(px + s - c, py - s); ctx.lineTo(px + s, py - s); ctx.lineTo(px + s, py - s + c);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(px - s, py + s - c); ctx.lineTo(px - s, py + s); ctx.lineTo(px - s + c, py + s);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(px + s - c, py + s); ctx.lineTo(px + s, py + s); ctx.lineTo(px + s, py + s - c);
    ctx.stroke();

    // --- Alliance connection lines ---
    ctx.strokeStyle = `rgba(64, 255, 96, ${0.15 * nightDim})`;
    ctx.lineWidth = 0.5;
    ctx.setLineDash([2, 4]);
    for (const w of state.walkers) {
      if (!w.alive || !w.isAlliedWithPlayer) continue;
      const wPos = walkerScreenPos(w, H, roadLeft, roadWidth, frameCounter);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(wPos.x, wPos.y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  // --- Allied walker rings (green) ---
  for (const w of state.walkers) {
    if (!w.alive || !w.isAlliedWithPlayer) continue;
    const pos = walkerScreenPos(w, H, roadLeft, roadWidth, frameCounter);
    ctx.strokeStyle = `rgba(64, 255, 96, ${0.4 * nightDim})`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 8, 0, Math.PI * 2);
    ctx.stroke();
  }

  // --- Enemy walker rings (red pulsing) ---
  for (const w of state.walkers) {
    if (!w.alive || !w.isEnemy) continue;
    const pos = walkerScreenPos(w, H, roadLeft, roadWidth, frameCounter);
    const pulse = 0.3 + 0.15 * Math.sin(frameCounter * 0.05);
    ctx.strokeStyle = `rgba(255, 60, 60, ${pulse})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 8, 0, Math.PI * 2);
    ctx.stroke();
  }

  // --- Bonded ally ring (bright double green, replaces gold) ---
  for (const w of state.walkers) {
    if (!w.alive || !w.isBonded) continue;
    const pos = walkerScreenPos(w, H, roadLeft, roadWidth, frameCounter);
    ctx.strokeStyle = `rgba(64, 255, 96, ${0.7 * nightDim})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 7, 0, Math.PI * 2);
    ctx.stroke();
  }

  // --- Cupid match connection lines (pink) ---
  for (const match of state.cupidMatches) {
    if (match.heartbroken) continue;
    const wA = getWalkerState(state, match.walkerA);
    const wB = getWalkerState(state, match.walkerB);
    if (!wA || !wB || !wA.alive || !wB.alive) continue;

    const posA = walkerScreenPos(wA, H, roadLeft, roadWidth, frameCounter);
    const posB = walkerScreenPos(wB, H, roadLeft, roadWidth, frameCounter);

    // Pink dashed line with gentle pulse
    const pulse = 0.3 + 0.2 * Math.sin(frameCounter * 0.03);
    ctx.strokeStyle = `rgba(255, 100, 180, ${pulse * nightDim})`;
    ctx.lineWidth = 0.8;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(posA.x, posA.y);
    ctx.lineTo(posB.x, posB.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Heart icon at midpoint for crush/love stages
    if (match.stage !== 'spark') {
      const mx = (posA.x + posB.x) / 2;
      const my = (posA.y + posB.y) / 2;
      const hs = match.stage === 'love' ? 4 : 3;
      ctx.fillStyle = `rgba(255, 100, 180, ${(match.stage === 'love' ? 0.6 : 0.4) * nightDim})`;
      ctx.beginPath();
      ctx.moveTo(mx, my + hs * 0.4);
      ctx.bezierCurveTo(mx - hs, my - hs * 0.3, mx - hs * 0.5, my - hs, mx, my - hs * 0.3);
      ctx.bezierCurveTo(mx + hs * 0.5, my - hs, mx + hs, my - hs * 0.3, mx, my + hs * 0.4);
      ctx.fill();
    }
  }

  // --- Tier 1 walker name labels ---
  for (const w of state.walkers) {
    if (!w.alive) continue;
    const data = getWalkerData(state, w.walkerNumber);
    if (!data || data.tier !== 1) continue;
    const pos = walkerScreenPos(w, H, roadLeft, roadWidth, frameCounter);
    ctx.fillStyle = `rgba(64, 255, 96, ${0.6 * nightDim})`;
    ctx.font = '9px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${data.name.split(' ')[0]} #${w.walkerNumber}`, pos.x, pos.y - 14);
  }

  // ==========================================================
  // LAYER 4: WEATHER (green-tinted)
  // ==========================================================

  // Rain: green diagonal streaks
  if (state.world.weather === 'rain' || state.world.weather === 'heavy_rain') {
    const streakCount = state.world.weather === 'heavy_rain' ? 80 : 35;
    ctx.strokeStyle = `rgba(64, 255, 96, ${0.08 * nightDim})`;
    ctx.lineWidth = 0.5;
    for (let i = 0; i < streakCount; i++) {
      const sx = seededJitter(i + 2000, 0) * 0.5 + 0.5;
      const sy = seededJitter(i + 3000, 0) * 0.5 + 0.5;
      const rx = sx * W;
      const ry = ((sy * H) + frameCounter * (2 + seededJitter(i + 4000, 0) * 0.5)) % H;
      const len = 8 + seededJitter(i + 5000, 0) * 4;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 2, ry + len);
      ctx.stroke();
    }
  }

  // Fog: green-tinted wash
  if (state.world.weather === 'fog') {
    ctx.fillStyle = `rgba(64, 255, 96, 0.03)`;
    ctx.fillRect(0, 0, W, H);
  }

  // Cold: dim everything 20% (green overlay that darkens)
  if (state.world.weather === 'cold') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, W, H);
  }

  // Night radar sweep: faint rotating line from center (oscilloscope aesthetic)
  if (state.world.isNight) {
    const sweepAngle = (frameCounter * 0.015) % (Math.PI * 2);
    const sweepLen = Math.max(W, H) * 0.5;
    const cx = W / 2;
    const cy = H / 2;
    const grad = ctx.createLinearGradient(
      cx, cy,
      cx + Math.cos(sweepAngle) * sweepLen,
      cy + Math.sin(sweepAngle) * sweepLen
    );
    grad.addColorStop(0, 'rgba(64, 255, 96, 0.06)');
    grad.addColorStop(0.4, 'rgba(64, 255, 96, 0.02)');
    grad.addColorStop(1, 'rgba(64, 255, 96, 0)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(
      cx + Math.cos(sweepAngle) * sweepLen,
      cy + Math.sin(sweepAngle) * sweepLen
    );
    ctx.stroke();
  }

  // ==========================================================
  // LAYER 5: SCANLINES + EDGE FADE + HUD
  // ==========================================================

  // Scanlines (pre-rendered, green tint)
  if (!scanlineCanvas || scanlineW !== W || scanlineH !== H) {
    scanlineCanvas = document.createElement('canvas');
    scanlineCanvas.width = W;
    scanlineCanvas.height = H;
    scanlineW = W;
    scanlineH = H;
    const slCtx = scanlineCanvas.getContext('2d')!;
    slCtx.fillStyle = 'rgba(0, 255, 0, 0.03)';
    for (let sy = 0; sy < H; sy += 2) {
      slCtx.fillRect(0, sy, W, 1);
    }
  }
  ctx.drawImage(scanlineCanvas, 0, 0, W, H);

  // Edge fade (simple linear gradients at top and bottom)
  const topFade = ctx.createLinearGradient(0, 0, 0, H * 0.08);
  topFade.addColorStop(0, 'rgba(0, 0, 0, 0.6)');
  topFade.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = topFade;
  ctx.fillRect(0, 0, W, H * 0.08);

  const bottomFade = ctx.createLinearGradient(0, H * 0.92, 0, H);
  bottomFade.addColorStop(0, 'rgba(0, 0, 0, 0)');
  bottomFade.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
  ctx.fillStyle = bottomFade;
  ctx.fillRect(0, H * 0.92, W, H * 0.08);

  // --- Compass rose (top-right corner) ---
  {
    const cx = W - 22;
    const cy = 22;
    const r = 14;

    // Circle
    ctx.strokeStyle = `rgba(64, 255, 96, ${0.25 * nightDim})`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    // Cardinal labels
    ctx.fillStyle = `rgba(64, 255, 96, ${0.5 * nightDim})`;
    ctx.font = 'bold 7px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', cx, cy - r + 4);
    ctx.fillText('S', cx, cy + r - 4);
    ctx.fillStyle = `rgba(64, 255, 96, ${0.3 * nightDim})`;
    ctx.fillText('E', cx + r - 4, cy);
    ctx.fillText('W', cx - r + 4, cy);
    ctx.textBaseline = 'alphabetic'; // reset

    // Needle pointing south (route runs south)
    ctx.strokeStyle = `rgba(64, 255, 96, ${0.6 * nightDim})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 3);
    ctx.lineTo(cx, cy + r - 7);
    ctx.stroke();
    // Arrowhead
    ctx.beginPath();
    ctx.moveTo(cx - 2, cy + r - 9);
    ctx.lineTo(cx, cy + r - 6);
    ctx.lineTo(cx + 2, cy + r - 9);
    ctx.stroke();
  }

  // --- Grade inclinometer (vertical, below miles/time, left side) ---
  {
    const currentSeg = getRouteSegment(state.world.milesWalked);
    const gx = 4;
    const gy = 54;
    const gw = 12;
    const gh = 66;
    const centerY = gy + gh / 2;

    // Bar background
    ctx.fillStyle = 'rgba(0, 20, 0, 0.5)';
    ctx.fillRect(gx, gy, gw, gh);
    ctx.strokeStyle = `rgba(64, 255, 96, ${0.2 * nightDim})`;
    ctx.lineWidth = 0.5;
    ctx.strokeRect(gx, gy, gw, gh);

    // Center mark (0° line)
    ctx.fillStyle = `rgba(64, 255, 96, ${0.2 * nightDim})`;
    ctx.fillRect(gx, centerY, gw, 0.5);

    // End labels
    ctx.fillStyle = `rgba(64, 255, 96, ${0.35 * nightDim})`;
    ctx.font = '7px "IBM Plex Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('UP', gx + gw + 3, gy + 7);
    ctx.fillText('DN', gx + gw + 3, gy + gh - 2);

    // Bubble position based on terrain: -1 (top/uphill) to +1 (bottom/downhill)
    let bubbleOffset: number;
    let gradeText: string;
    let gradeAlpha: number;
    let jitterX = 0;

    switch (currentSeg.terrain) {
      case 'uphill':
        bubbleOffset = -0.55;
        gradeText = '+6°';
        gradeAlpha = 0.8;
        break;
      case 'downhill':
        bubbleOffset = 0.45;
        gradeText = '-3°';
        gradeAlpha = 0.6;
        break;
      case 'rough':
        bubbleOffset = seededJitter(frameCounter, frameCounter * 0.3) * 0.3;
        jitterX = seededJitter(frameCounter + 50, frameCounter * 0.2) * 1;
        gradeText = '~0°';
        gradeAlpha = 0.7;
        break;
      default:
        bubbleOffset = 0;
        gradeText = '0°';
        gradeAlpha = 0.4;
        break;
    }

    // Draw bubble (filled circle on vertical axis)
    const bubbleX = gx + gw / 2 + jitterX;
    const bubbleY = centerY + bubbleOffset * (gh / 2 - 4);
    ctx.fillStyle = `rgba(64, 255, 96, ${0.7 * nightDim})`;
    ctx.beginPath();
    ctx.arc(bubbleX, bubbleY, 3, 0, Math.PI * 2);
    ctx.fill();

    // Degree label next to bubble
    ctx.fillStyle = `rgba(64, 255, 96, ${gradeAlpha * nightDim})`;
    ctx.font = 'bold 8px "IBM Plex Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(gradeText, gx + gw + 3, bubbleY + 3);
  }

  // --- HUD TEXT (green monospace) ---

  // Mode indicator (top-left)
  ctx.fillStyle = PHOSPHOR_DIM;
  ctx.font = '10px "IBM Plex Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText('RADAR', 4, 14);
  ctx.fillText(`MI ${state.world.milesWalked.toFixed(1)}`, 4, 27);
  ctx.fillText(`${state.world.currentTime}`, 4, 40);

  // Position labels (right edge)
  ctx.fillStyle = PHOSPHOR_DIM;
  ctx.font = '10px "IBM Plex Mono", monospace';
  ctx.textAlign = 'right';
  ctx.fillText('FRONT', W - 4, H * 0.2);
  ctx.fillText('MIDDLE', W - 4, H * 0.49);
  ctx.fillText('BACK', W - 4, H * 0.76);

  // Mile markers (right edge — scroll with progress)
  {
    const currentMile = state.world.milesWalked;
    const markerX = roadRight + 6;
    const baseMile = Math.floor(currentMile);
    const frac = currentMile - baseMile;
    const mileSpacing = 0.2; // 20% of screen height per mile
    ctx.font = '9px "IBM Plex Mono", monospace';
    ctx.textAlign = 'left';
    for (let offset = -3; offset <= 3; offset++) {
      const m = baseMile + offset;
      if (m < 0 || m > 400) continue;
      // Miles ahead (positive offset) appear above center (top=front)
      const yFrac = 0.5 + (frac - offset) * mileSpacing;
      if (yFrac < 0.05 || yFrac > 0.95) continue;
      const my2 = H * yFrac;
      ctx.fillStyle = PHOSPHOR_DIM;
      ctx.fillRect(markerX, my2 - 0.5, 4, 1);
      ctx.fillText(`mi${m}`, markerX + 6, my2 + 3);
    }
  }

  // Walker count (bottom-left)
  const aliveCount = state.walkers.reduce((n, w) => n + (w.alive ? 1 : 0), 0);
  const remaining = aliveCount + (state.player.alive ? 1 : 0);
  ctx.fillStyle = PHOSPHOR_MID;
  ctx.font = '11px "IBM Plex Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`${remaining} ALIVE`, 4, H - 8);

  // --- Tooltip ---
  if (tooltipWalker) {
    const tw = tooltipWalker;
    ctx.font = '11px "IBM Plex Mono", monospace';
    const nameW = ctx.measureText(tw.name).width;
    const statW = ctx.measureText(tw.status).width;
    const boxW = Math.max(nameW, statW) + 14;
    const boxH = 32;
    const bx = Math.min(tw.x + 14, W - boxW - 4);
    const by = Math.max(tw.y - boxH - 8, 4);

    ctx.fillStyle = 'rgba(0, 10, 0, 0.88)';
    ctx.fillRect(bx, by, boxW, boxH);
    ctx.strokeStyle = `rgba(64, 255, 96, ${0.25 * nightDim})`;
    ctx.lineWidth = 0.5;
    ctx.strokeRect(bx, by, boxW, boxH);

    ctx.fillStyle = PHOSPHOR;
    ctx.textAlign = 'left';
    ctx.fillText(tw.name, bx + 7, by + 13);
    ctx.fillStyle = `rgba(64, 255, 96, ${0.6 * nightDim})`;
    ctx.fillText(tw.status, bx + 7, by + 26);
  }
}

// ============================================================
// CROWD STICK FIGURE (tiny green stroke)
// ============================================================

function drawStickFigure(ctx: CanvasRenderingContext2D, x: number, y: number, alpha: number) {
  ctx.strokeStyle = `rgba(64, 255, 96, ${alpha})`;
  ctx.lineWidth = 0.6;
  // Head (dot)
  ctx.beginPath();
  ctx.arc(x, y - 4, 1, 0, Math.PI * 2);
  ctx.stroke();
  // Body
  ctx.beginPath();
  ctx.moveTo(x, y - 3);
  ctx.lineTo(x, y + 1);
  ctx.stroke();
  // Legs
  ctx.beginPath();
  ctx.moveTo(x, y + 1);
  ctx.lineTo(x - 1.5, y + 4);
  ctx.moveTo(x, y + 1);
  ctx.lineTo(x + 1.5, y + 4);
  ctx.stroke();
}
