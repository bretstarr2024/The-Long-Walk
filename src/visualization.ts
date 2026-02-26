// ============================================================
// The Long Walk — Infrared Thermal Satellite Visualization
// False-color thermal imaging of the march from above
// ============================================================

import { GameState, WalkerState } from './types';
import { getRouteSegment, getCrowdPhase } from './data/route';
import { getPositionTransition } from './engine';

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

// Walker heat: maps tier + behavioral state to thermal intensity
function walkerHeat(w: WalkerState, tier: number): number {
  let heat = tier === 1 ? 0.72 : tier === 2 ? 0.55 : 0.38;
  if (w.behavioralState === 'struggling') heat -= 0.08;
  if (w.behavioralState === 'breaking_down') heat -= 0.18;
  if (w.warnings >= 2) heat -= 0.05;
  return Math.max(0.15, heat);
}

// Draw a soft radial heat blob (used with additive blending)
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

function getNoiseTexture(w: number, h: number): HTMLCanvasElement {
  // Regenerate every ~90 frames for animated grain
  if (noiseCanvas && noiseCanvas.width === w && noiseCanvas.height === h && frameCounter - noiseFrame < 90) {
    return noiseCanvas;
  }
  noiseCanvas = document.createElement('canvas');
  noiseCanvas.width = w;
  noiseCanvas.height = h;
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

// ============================================================
// INIT
// ============================================================

export function initVisualization(canvas: HTMLCanvasElement) {
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);
    (canvas as any)._mouseX = mx;
    (canvas as any)._mouseY = my;
  });

  canvas.addEventListener('mouseleave', () => {
    (canvas as any)._mouseX = -1;
    (canvas as any)._mouseY = -1;
    tooltipWalker = null;
  });
}

// ============================================================
// RENDER
// ============================================================

export function updateVisualization(state: GameState, canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Sync canvas buffer to display size (prevents aspect ratio distortion)
  const rect = canvas.getBoundingClientRect();
  const displayW = Math.floor(rect.width);
  const displayH = Math.floor(rect.height);
  if (displayW > 0 && displayH > 0 && (canvas.width !== displayW || canvas.height !== displayH)) {
    canvas.width = displayW;
    canvas.height = displayH;
  }

  frameCounter++;
  const W = canvas.width;
  const H = canvas.height;
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

  // --- Halftrack: engine heat signature (hottest non-human) ---
  const htY = H * 0.92;
  // Engine core
  drawHeatBlob(ctx, roadCenter, htY, 7, 0.82, 3);
  // Exhaust plume trailing behind
  drawHeatBlob(ctx, roadCenter, htY + 8, 4, 0.4, 4);
  drawHeatBlob(ctx, roadCenter, htY + 16, 3, 0.2, 3);

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
  const alive = state.walkers.filter(w => w.alive);

  for (const w of alive) {
    const data = state.walkerData.find(d => d.walkerNumber === w.walkerNumber);
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
  // LAYER 3: OVERLAYS (normal blending)
  // Scan lines, noise, vignette, HUD text
  // ==========================================================

  ctx.globalCompositeOperation = 'source-over';

  // --- Noise grain ---
  const noise = getNoiseTexture(W, H);
  ctx.drawImage(noise, 0, 0);

  // --- Scan lines ---
  ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
  for (let sy = 0; sy < H; sy += 3) {
    ctx.fillRect(0, sy, W, 1);
  }

  // --- Vignette (darker edges) ---
  const vigGrad = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.7);
  vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
  vigGrad.addColorStop(1, 'rgba(0,0,6,0.45)');
  ctx.fillStyle = vigGrad;
  ctx.fillRect(0, 0, W, H);

  // --- Thin road edge indicators (very faint, like map overlay) ---
  ctx.strokeStyle = 'rgba(64, 255, 96, 0.08)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(roadLeft, 0);
  ctx.lineTo(roadLeft, H);
  ctx.moveTo(roadRight, 0);
  ctx.lineTo(roadRight, H);
  ctx.stroke();

  // ==========================================================
  // LAYER 4: HUD TEXT (green monospace, like military overlay)
  // ==========================================================

  const hudColor = 'rgba(64, 255, 96, 0.55)';
  const hudDim = 'rgba(64, 255, 96, 0.3)';

  // --- Mode indicator (top-left) ---
  ctx.fillStyle = hudDim;
  ctx.font = '6px "IBM Plex Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText('IR THERMAL', 4, 10);
  ctx.fillText(`MI ${state.world.milesWalked.toFixed(1)}`, 4, 19);
  ctx.fillText(`${state.world.currentTime}`, 4, 28);

  // --- Position labels (right edge) ---
  ctx.fillStyle = hudDim;
  ctx.font = '6px "IBM Plex Mono", monospace';
  ctx.textAlign = 'right';
  ctx.fillText('FRONT', W - 4, H * 0.2);
  ctx.fillText('MIDDLE', W - 4, H * 0.49);
  ctx.fillText('BACK', W - 4, H * 0.76);

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
  const remaining = alive.length + (state.player.alive ? 1 : 0);
  ctx.fillStyle = hudColor;
  ctx.font = '7px "IBM Plex Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`${remaining} ALIVE`, 4, H - 6);

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
    ctx.font = 'bold 7px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('YOU', px, py - 14);

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
  for (const w of alive) {
    const data = state.walkerData.find(d => d.walkerNumber === w.walkerNumber);
    if (!data || data.tier !== 1) continue;

    const band = positionBand(w.position);
    const seed = w.walkerNumber;
    const jx = seededJitter(seed, frameCounter * 0.12) * 0.5;
    const baseX = roadLeft + roadWidth * (0.15 + (seededJitter(seed * 3, 0) * 0.5 + 0.5) * 0.7);
    const baseY = H * (band[0] + (band[1] - band[0]) * ((seed % 23) / 23));
    const x = baseX + jx;

    ctx.fillStyle = 'rgba(100, 220, 140, 0.6)';
    ctx.font = '6px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(data.name.split(' ')[0], x, baseY - 12);
  }

  // --- Allied walker rings ---
  for (const w of alive) {
    if (!w.isAlliedWithPlayer) continue;

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

  // --- Tooltip ---
  if (tooltipWalker) {
    const tw = tooltipWalker;
    ctx.font = '7px "IBM Plex Mono", monospace';
    const nameW = ctx.measureText(tw.name).width;
    const statW = ctx.measureText(tw.status).width;
    const boxW = Math.max(nameW, statW) + 12;
    const boxH = 26;
    const bx = Math.min(tw.x + 12, W - boxW - 4);
    const by = Math.max(tw.y - boxH - 6, 4);

    ctx.fillStyle = 'rgba(0, 10, 5, 0.88)';
    ctx.fillRect(bx, by, boxW, boxH);
    ctx.strokeStyle = 'rgba(64, 255, 96, 0.25)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(bx, by, boxW, boxH);

    ctx.fillStyle = '#40ff60';
    ctx.textAlign = 'left';
    ctx.fillText(tw.name, bx + 6, by + 10);
    ctx.fillStyle = 'rgba(64, 255, 96, 0.6)';
    ctx.fillText(tw.status, bx + 6, by + 20);
  }
}
