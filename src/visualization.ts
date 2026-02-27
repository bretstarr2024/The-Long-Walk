// ============================================================
// The Long Walk — Infrared Thermal Satellite Visualization
// False-color thermal imaging of the march from above
// ============================================================

import { GameState, WalkerState } from './types';
import { getRouteSegment, getCrowdPhase } from './data/route';
import { getPositionTransition } from './engine';
import { getWalkerData } from './state';

// ============================================================
// THERMAL COLOR PALETTE (ironbow)
// Maps heat 0.0 (cold/black) → 1.0 (white-hot)
// ============================================================

const THERMAL_STOPS: [number, number, number, number][] = [
  // [heat, R, G, B]
  [0.00,   2,   2,  12],  // near-black
  [0.12,  20,   0,  50],  // deep indigo
  [0.25,  75,   0,  90],  // purple
  [0.37, 150,  15,  60],  // magenta
  [0.50, 215,  50,  12],  // red-orange
  [0.62, 238, 125,   8],  // orange
  [0.75, 250, 205,  25],  // yellow
  [0.87, 255, 240, 115],  // pale yellow
  [1.00, 255, 255, 255],  // white-hot
];

function thermalColor(heat: number, alpha = 1): string {
  heat = Math.max(0, Math.min(1, heat));
  let i = 0;
  while (i < THERMAL_STOPS.length - 1 && THERMAL_STOPS[i + 1][0] <= heat) i++;
  if (i >= THERMAL_STOPS.length - 1) {
    const s = THERMAL_STOPS[THERMAL_STOPS.length - 1];
    return `rgba(${s[1]},${s[2]},${s[3]},${alpha})`;
  }
  const [t0, r0, g0, b0] = THERMAL_STOPS[i];
  const [t1, r1, g1, b1] = THERMAL_STOPS[i + 1];
  const t = (heat - t0) / (t1 - t0);
  const r = Math.floor(r0 + (r1 - r0) * t);
  const g = Math.floor(g0 + (g1 - g0) * t);
  const b = Math.floor(b0 + (b1 - b0) * t);
  return `rgba(${r},${g},${b},${alpha})`;
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

// Walker heat: maps condition + tier to thermal intensity
function walkerHeat(w: WalkerState, tier: number): number {
  // Health score combines stamina, inverse pain, and morale
  const health = (w.stamina + (100 - w.pain) + w.morale) / 300;
  let heat: number;
  if (health > 0.7) heat = 0.75;       // bright, healthy
  else if (health > 0.4) heat = 0.55;  // amber, struggling
  else if (health > 0.2) heat = 0.35;  // dim red, critical
  else heat = 0.18;                     // nearly gone

  // Tier adjustments
  if (tier === 1) heat += 0.05;
  else if (tier === 3) heat -= 0.05;

  // Warning pip reduction
  if (w.warnings > 0) heat -= w.warnings * 0.05;

  return Math.max(0.12, heat);
}

// Draw a soft radial heat blob (used with additive blending)
// Note: Gradients are intentionally not cached — canvas radial gradients are
// position-dependent (x, y, radius), so caching by heat bucket alone is not
// possible without decoupling position from gradient creation.
function drawHeatBlob(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  coreRadius: number,
  heat: number,
  spread = 3,
) {
  const outerR = coreRadius * spread;
  const grad = ctx.createRadialGradient(x, y, 0, x, y, outerR);
  grad.addColorStop(0, thermalColor(heat, 0.7));
  grad.addColorStop(0.2, thermalColor(heat * 0.88, 0.5));
  grad.addColorStop(0.45, thermalColor(heat * 0.6, 0.25));
  grad.addColorStop(0.7, thermalColor(heat * 0.3, 0.08));
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, outerR, 0, Math.PI * 2);
  ctx.fill();
}

// ============================================================
// NOISE TEXTURE (generated once, reused)
// ============================================================

let noiseCanvas: HTMLCanvasElement | null = null;
let noiseFrame = 0;

// Pre-rendered scan line overlay (rebuilt only when dimensions change)
let scanlineCanvas: HTMLCanvasElement | null = null;
let scanlineW = 0;
let scanlineH = 0;

function getNoiseTexture(w: number, h: number): HTMLCanvasElement {
  // Regenerate every ~90 frames for animated grain
  if (noiseCanvas && noiseCanvas.width === w && noiseCanvas.height === h && frameCounter - noiseFrame < 90) {
    return noiseCanvas;
  }
  // Reuse existing canvas if dimensions match, only create new one if needed
  if (!noiseCanvas || noiseCanvas.width !== w || noiseCanvas.height !== h) {
    noiseCanvas = document.createElement('canvas');
    noiseCanvas.width = w;
    noiseCanvas.height = h;
  }
  noiseFrame = frameCounter;
  const nctx = noiseCanvas.getContext('2d')!;
  const imgData = nctx.createImageData(w, h);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = Math.floor(Math.random() * 18);
    d[i] = v;
    d[i + 1] = v;
    d[i + 2] = v + Math.floor(Math.random() * 6);
    d[i + 3] = 22;
  }
  nctx.putImageData(imgData, 0, 0);
  return noiseCanvas;
}

// ============================================================
// STATE
// ============================================================

let frameCounter = 0;
let tooltipWalker: { name: string; status: string; x: number; y: number } | null = null;

// Cached canvas dimensions from ResizeObserver (avoids getBoundingClientRect per frame)
let cachedCanvasWidth = 0;
let cachedCanvasHeight = 0;
let canvasResizeObserver: ResizeObserver | null = null;


// ============================================================
// INIT
// ============================================================

export function initVisualization(canvas: HTMLCanvasElement) {
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    // Convert to CSS pixel coordinates (not buffer pixels)
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

  // Cache canvas dimensions via ResizeObserver (avoids getBoundingClientRect per frame)
  if (canvasResizeObserver) canvasResizeObserver.disconnect();
  canvasResizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      cachedCanvasWidth = entry.contentRect.width;
      cachedCanvasHeight = entry.contentRect.height;
    }
  });
  canvasResizeObserver.observe(canvas);

  // Seed initial values from getBoundingClientRect (observer callback is async)
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

  // Sync canvas buffer to display size with DPI scaling (sharp on Retina)
  // Use cached dimensions from ResizeObserver; fallback to getBoundingClientRect if not yet set
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
  // Use CSS pixel dimensions for all coordinate math
  const W = displayW;
  const H = displayH;
  const mx = (canvas as any)._mouseX ?? -1;
  const my = (canvas as any)._mouseY ?? -1;

  const roadLeft = W * 0.3;
  const roadRight = W * 0.7;
  const roadCenter = W * 0.5;
  const roadWidth = roadRight - roadLeft;

  // ==========================================================
  // LAYER 1: COLD BACKGROUND (normal blending)
  // ==========================================================

  // Deep blue-black base
  ctx.fillStyle = '#020209';
  ctx.fillRect(0, 0, W, H);

  // Subtle depth gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, 'rgba(5, 2, 22, 0.5)');
  bgGrad.addColorStop(0.5, 'rgba(8, 3, 16, 0.3)');
  bgGrad.addColorStop(1, 'rgba(14, 5, 12, 0.4)');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Road: asphalt retains heat — very subtle warm strip
  const roadGrad = ctx.createLinearGradient(roadLeft - 5, 0, roadRight + 5, 0);
  roadGrad.addColorStop(0, 'rgba(12, 4, 22, 0.5)');
  roadGrad.addColorStop(0.3, 'rgba(22, 8, 28, 0.4)');
  roadGrad.addColorStop(0.5, 'rgba(28, 10, 32, 0.4)');
  roadGrad.addColorStop(0.7, 'rgba(22, 8, 28, 0.4)');
  roadGrad.addColorStop(1, 'rgba(12, 4, 22, 0.5)');
  ctx.fillStyle = roadGrad;
  ctx.fillRect(roadLeft - 5, 0, roadWidth + 10, H);

  // Night: everything slightly cooler
  if (state.world.isNight) {
    ctx.fillStyle = 'rgba(0, 0, 18, 0.15)';
    ctx.fillRect(0, 0, W, H);
  }

  // ==========================================================
  // LAYER 2: HEAT SOURCES (additive blending)
  // Overlapping signatures bloom together naturally
  // ==========================================================

  ctx.globalCompositeOperation = 'lighter';

  // --- Crowd: diffuse body heat along road edges ---
  const seg = getRouteSegment(state.world.milesWalked);
  const numCrowd = crowdCount(seg.crowdDensity);

  if (numCrowd > 0) {
    for (let i = 0; i < numCrowd; i++) {
      const jx = seededJitter(i + 500, frameCounter * 0.18) * 0.3;
      const jy = seededJitter(i + 700, frameCounter * 0.12) * 1.5;
      const ly = (i / numCrowd) * H + jy;

      // Left side
      const lx = roadLeft - 12 - Math.abs(seededJitter(i, 0)) * (W * 0.15) + jx;
      drawHeatBlob(ctx, lx, ly, 1.5, 0.18, 2.5);

      // Right side
      const rx = roadRight + 12 + Math.abs(seededJitter(i + 300, 0)) * (W * 0.15) + jx;
      drawHeatBlob(ctx, rx, ly, 1.5, 0.18, 2.5);
    }
  }

  // --- Halftrack: enhanced rectangular body + engine + exhaust ---
  const htY = H * 0.92;
  {
    const htW = 14;
    const htH = 8;
    // Rectangular body — medium heat
    ctx.fillStyle = thermalColor(0.55, 0.5);
    ctx.fillRect(roadCenter - htW / 2, htY - htH / 2, htW, htH);

    // Hot engine blob at front (top of rectangle, toward walkers)
    drawHeatBlob(ctx, roadCenter, htY - htH / 2, 5, 0.85, 2.5);

    // Exhaust plume trailing at rear (below rectangle)
    drawHeatBlob(ctx, roadCenter, htY + htH / 2 + 4, 4, 0.4, 4);
    drawHeatBlob(ctx, roadCenter, htY + htH / 2 + 12, 3, 0.22, 3);
    drawHeatBlob(ctx, roadCenter, htY + htH / 2 + 20, 2, 0.12, 2.5);
  }

  // --- Night headlight cone ---
  if (state.world.isNight) {
    const coneX = roadCenter;
    const coneY = htY - 4;
    const coneSpread = roadWidth * 0.3;
    const coneReach = H * 0.35;
    const grad = ctx.createRadialGradient(coneX, coneY, 2, coneX, coneY - coneReach * 0.6, coneReach);
    grad.addColorStop(0, 'rgba(255, 240, 180, 0.12)');
    grad.addColorStop(0.5, 'rgba(255, 240, 180, 0.04)');
    grad.addColorStop(1, 'rgba(255, 240, 180, 0)');

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(coneX - 4, coneY);
    ctx.lineTo(coneX - coneSpread, coneY - coneReach);
    ctx.lineTo(coneX + coneSpread, coneY - coneReach);
    ctx.lineTo(coneX + 4, coneY);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();
  }

  // Soldiers flanking halftrack
  for (let i = 0; i < 4; i++) {
    const sx = roadCenter - 14 + i * 9;
    const sy = htY + 14;
    drawHeatBlob(ctx, sx, sy, 2, 0.4, 2.5);
  }

  // --- Eliminated walkers: residual body heat (fading) ---
  for (const w of state.walkers) {
    if (w.alive || w.eliminatedAtMile === null) continue;
    const milesSince = state.world.milesWalked - w.eliminatedAtMile;
    if (milesSince > 4) continue; // heat fully dissipated

    const band = positionBand(w.position);
    const seed = w.walkerNumber;
    const xPos = roadLeft + roadWidth * (0.15 + (seededJitter(seed * 3, 0) * 0.5 + 0.5) * 0.7);
    const yPos = H * (band[0] + (band[1] - band[0]) * ((seed % 17) / 17));

    const fade = 1 - milesSince / 4;
    drawHeatBlob(ctx, xPos, yPos, 2.5, 0.2 * fade, 2);
  }

  // --- Alive walkers: thermal signatures ---
  tooltipWalker = null;

  for (const w of state.walkers) {
    if (!w.alive) continue;
    const data = getWalkerData(state, w.walkerNumber);
    if (!data) continue;

    const band = positionBand(w.position);
    const seed = w.walkerNumber;
    const jx = seededJitter(seed, frameCounter * 0.12) * 0.5;
    const jy = seededJitter(seed + 100, frameCounter * 0.1) * 0.5;
    const baseX = roadLeft + roadWidth * (0.15 + (seededJitter(seed * 3, 0) * 0.5 + 0.5) * 0.7);
    const baseY = H * (band[0] + (band[1] - band[0]) * ((seed % 23) / 23));
    const x = baseX + jx;
    const y = baseY + jy;

    const heat = walkerHeat(w, data.tier);
    const coreR = data.tier === 1 ? 3.5 : data.tier === 2 ? 2.5 : 1.8;
    const spread = data.tier === 1 ? 3.5 : data.tier === 2 ? 3 : 2.5;

    // Breaking down: flicker (heat signature destabilizing)
    if (w.behavioralState === 'breaking_down') {
      ctx.globalAlpha = 0.45 + Math.sin(frameCounter * 0.18 + seed) * 0.35;
    } else if (w.behavioralState === 'struggling') {
      ctx.globalAlpha = 0.65 + Math.sin(frameCounter * 0.08 + seed) * 0.2;
    }

    drawHeatBlob(ctx, x, y, coreR, heat, spread);
    ctx.globalAlpha = 1;

    // Warning indicators: bright hot pips above walker
    if (w.warnings > 0) {
      for (let i = 0; i < w.warnings; i++) {
        drawHeatBlob(ctx, x + (i - 1) * 4, y - coreR * spread - 2, 1, 0.55, 1.8);
      }
    }

    // Hit test for tooltip
    if (mx >= 0 && data.tier <= 2) {
      const dist = Math.sqrt((mx - x) ** 2 + (my - y) ** 2);
      if (dist < coreR * spread + 3) {
        const statusStr = w.behavioralState === 'steady'
          ? `STA ${w.stamina.toFixed(0)}%`
          : w.behavioralState.toUpperCase();
        tooltipWalker = {
          name: `${data.name} #${w.walkerNumber}`,
          status: `${statusStr} | WARN ${w.warnings}/3`,
          x, y,
        };
      }
    }
  }

  // --- Player: hottest signature (smooth position transitions) ---
  {
    const trans = getPositionTransition();
    let py: number;
    if (trans) {
      // Smoothly interpolate between old and new position bands
      const fromBand = positionBand(trans.from);
      const toBand = positionBand(trans.to);
      const fromY = (fromBand[0] + fromBand[1]) / 2;
      const toY = (toBand[0] + toBand[1]) / 2;
      // Ease-in-out curve for natural movement
      const t = trans.progress < 0.5
        ? 2 * trans.progress * trans.progress
        : 1 - Math.pow(-2 * trans.progress + 2, 2) / 2;
      py = H * (fromY + (toY - fromY) * t);
    } else {
      const band = positionBand(state.player.position);
      py = H * ((band[0] + band[1]) / 2);
    }
    const px = roadCenter;

    // Big bright heat blob — the player burns hot
    drawHeatBlob(ctx, px, py, 5, 1.0, 4);

    // Speed warning: pulsing danger glow
    if (state.player.speed < 4) {
      const pulse = Math.sin(frameCounter * 0.15) * 0.3 + 0.4;
      drawHeatBlob(ctx, px, py, 12, 0.35 * pulse, 2);
    }
  }

  // ==========================================================
  // WEATHER EFFECTS (still additive blending from Layer 2)
  // ==========================================================

  // --- Rain: animated diagonal streaks ---
  if (state.world.weather === 'rain' || state.world.weather === 'heavy_rain') {
    const streakCount = state.world.weather === 'heavy_rain' ? 80 : 35;
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = 'rgba(120, 140, 200, 0.15)';
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
    ctx.globalCompositeOperation = 'lighter';
  }

  // --- Fog: semi-transparent wash ---
  if (state.world.weather === 'fog') {
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(180, 190, 200, 0.08)';
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
  }

  // --- Cold: blue tint ---
  if (state.world.weather === 'cold') {
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(80, 100, 180, 0.05)';
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
  }

  // ==========================================================
  // LAYER 3: OVERLAYS (normal blending)
  // Scan lines, noise, vignette, HUD text
  // ==========================================================

  ctx.globalCompositeOperation = 'source-over';

  // --- Noise grain ---
  const noise = getNoiseTexture(W, H);
  ctx.drawImage(noise, 0, 0, W, H);

  // --- Scan lines (pre-rendered offscreen, rebuilt only on resize) ---
  if (!scanlineCanvas || scanlineW !== W || scanlineH !== H) {
    scanlineCanvas = document.createElement('canvas');
    scanlineCanvas.width = W;
    scanlineCanvas.height = H;
    scanlineW = W;
    scanlineH = H;
    const slCtx = scanlineCanvas.getContext('2d')!;
    slCtx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    for (let sy = 0; sy < H; sy += 3) {
      slCtx.fillRect(0, sy, W, 1);
    }
  }
  ctx.drawImage(scanlineCanvas, 0, 0, W, H);

  // --- Terrain elevation strip (left edge, ±10 miles) ---
  {
    const stripX = 4;
    const stripW = 18;
    const stripH = H * 0.6;
    const stripY = H * 0.2;
    const currentMile = state.world.milesWalked;
    const mileRange = 20; // ±10 miles

    // Strip background
    ctx.fillStyle = 'rgba(10, 20, 10, 0.6)';
    ctx.fillRect(stripX, stripY, stripW, stripH);

    // Terrain coloring per pixel row
    for (let row = 0; row < stripH; row++) {
      const mile = currentMile - 10 + (row / stripH) * mileRange;
      if (mile < 0 || mile > 400) continue;
      const rowSeg = getRouteSegment(mile);
      let color: string;
      switch (rowSeg.terrain) {
        case 'flat':     color = 'rgba(64, 255, 96, 0.15)'; break;
        case 'uphill':   color = 'rgba(255, 100, 50, 0.4)'; break;
        case 'downhill': color = 'rgba(50, 150, 255, 0.4)'; break;
        case 'rough':    color = 'rgba(255, 200, 50, 0.3)'; break;
        default:         color = 'rgba(64, 255, 96, 0.15)'; break;
      }
      ctx.fillStyle = color;
      ctx.fillRect(stripX, stripY + row, stripW, 1);
    }

    // White marker line at current position (center of strip)
    const centerRow = stripH / 2;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillRect(stripX, stripY + centerRow - 0.5, stripW, 1);

    // Grade label next to current position marker
    const currentSeg = getRouteSegment(currentMile);
    let gradeText: string;
    let gradeColor: string;
    switch (currentSeg.terrain) {
      case 'uphill':   gradeText = '+6% \u25B2'; gradeColor = 'rgba(255, 120, 60, 0.8)'; break;
      case 'downhill': gradeText = '-3% \u25BC'; gradeColor = 'rgba(80, 170, 255, 0.8)'; break;
      case 'rough':    gradeText = 'ROUGH';  gradeColor = 'rgba(255, 210, 60, 0.7)'; break;
      default:         gradeText = 'FLAT';   gradeColor = 'rgba(64, 255, 96, 0.5)'; break;
    }
    ctx.fillStyle = gradeColor;
    ctx.font = 'bold 9px "IBM Plex Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(gradeText, stripX + stripW + 4, stripY + centerRow + 3);

    // Label above strip
    ctx.fillStyle = 'rgba(64, 255, 96, 0.4)';
    ctx.font = '9px "IBM Plex Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('GRADE', stripX, stripY - 5);
  }

  // --- Vignette (darker edges) ---
  const vigGrad = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.7);
  vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
  vigGrad.addColorStop(1, 'rgba(0,0,6,0.45)');
  ctx.fillStyle = vigGrad;
  ctx.fillRect(0, 0, W, H);

  // --- Road shoulder lines (solid, very faint) ---
  ctx.strokeStyle = 'rgba(64, 255, 96, 0.08)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(roadLeft, 0);
  ctx.lineTo(roadLeft, H);
  ctx.moveTo(roadRight, 0);
  ctx.lineTo(roadRight, H);
  ctx.stroke();

  // --- Road center line dashes ---
  ctx.strokeStyle = 'rgba(64, 255, 96, 0.06)';
  ctx.lineWidth = 0.5;
  ctx.setLineDash([6, 12]);
  ctx.beginPath();
  ctx.moveTo(roadCenter, 0);
  ctx.lineTo(roadCenter, H);
  ctx.stroke();
  ctx.setLineDash([]);

  // ==========================================================
  // LAYER 4: HUD TEXT (green monospace, like military overlay)
  // ==========================================================

  const hudColor = 'rgba(64, 255, 96, 0.55)';
  const hudDim = 'rgba(64, 255, 96, 0.3)';

  // --- Mode indicator (top-left) ---
  ctx.fillStyle = hudDim;
  ctx.font = '10px "IBM Plex Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText('IR THERMAL', 4, 14);
  ctx.fillText(`MI ${state.world.milesWalked.toFixed(1)}`, 4, 27);
  ctx.fillText(`${state.world.currentTime}`, 4, 40);

  // --- Position labels (right edge) ---
  ctx.fillStyle = hudDim;
  ctx.font = '10px "IBM Plex Mono", monospace';
  ctx.textAlign = 'right';
  ctx.fillText('FRONT', W - 4, H * 0.2);
  ctx.fillText('MIDDLE', W - 4, H * 0.49);
  ctx.fillText('BACK', W - 4, H * 0.76);

  // --- Mile markers (right edge, current ±1) ---
  {
    const currentMile = state.world.milesWalked;
    const markerX = roadRight + 6;
    const markerPositions = [
      { mile: Math.floor(currentMile) - 1, yFrac: 0.7 },
      { mile: Math.floor(currentMile),     yFrac: 0.5 },
      { mile: Math.floor(currentMile) + 1, yFrac: 0.3 },
    ];
    ctx.font = '9px "IBM Plex Mono", monospace';
    ctx.textAlign = 'left';
    for (const mp of markerPositions) {
      if (mp.mile < 0 || mp.mile > 400) continue;
      const my2 = H * mp.yFrac;
      // Tick mark
      ctx.fillStyle = hudDim;
      ctx.fillRect(markerX, my2 - 0.5, 6, 1);
      // Mile number
      ctx.fillStyle = hudDim;
      ctx.fillText(`${mp.mile}`, markerX + 8, my2 + 3);
    }
  }

  // --- Faint horizontal zone dividers ---
  ctx.strokeStyle = 'rgba(64, 255, 96, 0.06)';
  ctx.lineWidth = 0.5;
  ctx.setLineDash([2, 6]);
  ctx.beginPath();
  ctx.moveTo(0, H * 0.33);
  ctx.lineTo(W, H * 0.33);
  ctx.moveTo(0, H * 0.63);
  ctx.lineTo(W, H * 0.63);
  ctx.stroke();
  ctx.setLineDash([]);

  // --- Walker count (bottom-left) ---
  const aliveCount = state.walkers.reduce((n, w) => n + (w.alive ? 1 : 0), 0);
  const remaining = aliveCount + (state.player.alive ? 1 : 0);
  ctx.fillStyle = hudColor;
  ctx.font = '11px "IBM Plex Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`${remaining} ALIVE`, 4, H - 8);

  // --- Player label + targeting brackets ---
  {
    const trans = getPositionTransition();
    let py: number;
    if (trans) {
      const fromBand = positionBand(trans.from);
      const toBand = positionBand(trans.to);
      const fromY = (fromBand[0] + fromBand[1]) / 2;
      const toY = (toBand[0] + toBand[1]) / 2;
      const t = trans.progress < 0.5
        ? 2 * trans.progress * trans.progress
        : 1 - Math.pow(-2 * trans.progress + 2, 2) / 2;
      py = H * (fromY + (toY - fromY) * t);
    } else {
      const band = positionBand(state.player.position);
      py = H * ((band[0] + band[1]) / 2);
    }
    const px = roadCenter;

    // Label
    ctx.fillStyle = 'rgba(64, 255, 96, 0.8)';
    ctx.font = 'bold 12px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('YOU', px, py - 16);

    // Targeting brackets
    ctx.strokeStyle = 'rgba(64, 255, 96, 0.5)';
    ctx.lineWidth = 0.8;
    const s = 9;
    const c = 3; // corner length
    // Top-left
    ctx.beginPath();
    ctx.moveTo(px - s, py - s + c); ctx.lineTo(px - s, py - s); ctx.lineTo(px - s + c, py - s);
    ctx.stroke();
    // Top-right
    ctx.beginPath();
    ctx.moveTo(px + s - c, py - s); ctx.lineTo(px + s, py - s); ctx.lineTo(px + s, py - s + c);
    ctx.stroke();
    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(px - s, py + s - c); ctx.lineTo(px - s, py + s); ctx.lineTo(px - s + c, py + s);
    ctx.stroke();
    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(px + s - c, py + s); ctx.lineTo(px + s, py + s); ctx.lineTo(px + s, py + s - c);
    ctx.stroke();
  }

  // --- Tier 1 walker name labels ---
  for (const w of state.walkers) {
    if (!w.alive) continue;
    const data = getWalkerData(state, w.walkerNumber);
    if (!data || data.tier !== 1) continue;

    const band = positionBand(w.position);
    const seed = w.walkerNumber;
    const jx = seededJitter(seed, frameCounter * 0.12) * 0.5;
    const baseX = roadLeft + roadWidth * (0.15 + (seededJitter(seed * 3, 0) * 0.5 + 0.5) * 0.7);
    const baseY = H * (band[0] + (band[1] - band[0]) * ((seed % 23) / 23));
    const x = baseX + jx;

    ctx.fillStyle = 'rgba(100, 220, 140, 0.6)';
    ctx.font = '9px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${data.name.split(' ')[0]} #${w.walkerNumber}`, x, baseY - 14);
  }

  // --- Allied walker rings ---
  for (const w of state.walkers) {
    if (!w.alive || !w.isAlliedWithPlayer) continue;

    const band = positionBand(w.position);
    const seed = w.walkerNumber;
    const jx = seededJitter(seed, frameCounter * 0.12) * 0.5;
    const jy = seededJitter(seed + 100, frameCounter * 0.1) * 0.5;
    const baseX = roadLeft + roadWidth * (0.15 + (seededJitter(seed * 3, 0) * 0.5 + 0.5) * 0.7);
    const baseY = H * (band[0] + (band[1] - band[0]) * ((seed % 23) / 23));

    ctx.strokeStyle = 'rgba(64, 255, 96, 0.4)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(baseX + jx, baseY + jy, 8, 0, Math.PI * 2);
    ctx.stroke();
  }

  // --- Enemy walker rings (red pulsing) ---
  for (const w of state.walkers) {
    if (!w.alive || !w.isEnemy) continue;

    const band = positionBand(w.position);
    const seed = w.walkerNumber;
    const jx = seededJitter(seed, frameCounter * 0.12) * 0.5;
    const jy = seededJitter(seed + 100, frameCounter * 0.1) * 0.5;
    const baseX = roadLeft + roadWidth * (0.15 + (seededJitter(seed * 3, 0) * 0.5 + 0.5) * 0.7);
    const baseY = H * (band[0] + (band[1] - band[0]) * ((seed % 23) / 23));

    const pulse = 0.3 + 0.15 * Math.sin(frameCounter * 0.05);
    ctx.strokeStyle = `rgba(224, 64, 64, ${pulse})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(baseX + jx, baseY + jy, 8, 0, Math.PI * 2);
    ctx.stroke();
  }

  // --- Bonded ally ring (gold inner ring) ---
  for (const w of state.walkers) {
    if (!w.alive || !w.isBonded) continue;

    const band = positionBand(w.position);
    const seed = w.walkerNumber;
    const jx = seededJitter(seed, frameCounter * 0.12) * 0.5;
    const jy = seededJitter(seed + 100, frameCounter * 0.1) * 0.5;
    const baseX = roadLeft + roadWidth * (0.15 + (seededJitter(seed * 3, 0) * 0.5 + 0.5) * 0.7);
    const baseY = H * (band[0] + (band[1] - band[0]) * ((seed % 23) / 23));

    ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(baseX + jx, baseY + jy, 5, 0, Math.PI * 2);
    ctx.stroke();
  }

  // --- Alliance connection lines (dashed green between player and allies) ---
  {
    // Compute player screen Y (same logic as player label)
    const trans = getPositionTransition();
    let allyPy: number;
    if (trans) {
      const fromBand = positionBand(trans.from);
      const toBand = positionBand(trans.to);
      const fromY = (fromBand[0] + fromBand[1]) / 2;
      const toY = (toBand[0] + toBand[1]) / 2;
      const t = trans.progress < 0.5
        ? 2 * trans.progress * trans.progress
        : 1 - Math.pow(-2 * trans.progress + 2, 2) / 2;
      allyPy = H * (fromY + (toY - fromY) * t);
    } else {
      const band = positionBand(state.player.position);
      allyPy = H * ((band[0] + band[1]) / 2);
    }
    const allyPx = roadCenter;

    ctx.strokeStyle = 'rgba(64, 255, 96, 0.15)';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([2, 4]);
    for (const w of state.walkers) {
      if (!w.alive || !w.isAlliedWithPlayer) continue;
      const band = positionBand(w.position);
      const seed = w.walkerNumber;
      const jx = seededJitter(seed, frameCounter * 0.12) * 0.5;
      const jy = seededJitter(seed + 100, frameCounter * 0.1) * 0.5;
      const bx = roadLeft + roadWidth * (0.15 + (seededJitter(seed * 3, 0) * 0.5 + 0.5) * 0.7);
      const by = H * (band[0] + (band[1] - band[0]) * ((seed % 23) / 23));
      ctx.beginPath();
      ctx.moveTo(allyPx, allyPy);
      ctx.lineTo(bx + jx, by + jy);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

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

    ctx.fillStyle = 'rgba(0, 10, 5, 0.88)';
    ctx.fillRect(bx, by, boxW, boxH);
    ctx.strokeStyle = 'rgba(64, 255, 96, 0.25)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(bx, by, boxW, boxH);

    ctx.fillStyle = '#40ff60';
    ctx.textAlign = 'left';
    ctx.fillText(tw.name, bx + 7, by + 13);
    ctx.fillStyle = 'rgba(64, 255, 96, 0.6)';
    ctx.fillText(tw.status, bx + 7, by + 26);
  }
}
