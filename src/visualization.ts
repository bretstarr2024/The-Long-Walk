// ============================================================
// The Long Walk — Bird's Eye Visualization (Canvas)
// Top-down road view with walker dots, halftrack, crowd
// ============================================================

import { GameState, WalkerState, WalkerData } from './types';
import { getRouteSegment, getCrowdPhase } from './data/route';

// Seeded PRNG for deterministic jitter per walker
function seededJitter(seed: number, frame: number): number {
  const x = Math.sin(seed * 12.9898 + frame * 0.01) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1; // -1 to 1
}

// Color helpers
function relationshipColor(rel: number): string {
  if (rel > 40) return '#40b040';   // friendly green
  if (rel > 10) return '#4080d0';   // curious blue
  if (rel < -10) return '#e04040';  // hostile red
  return '#8a8e9a';                 // neutral gray
}

function behaviorColor(state: string): string {
  switch (state) {
    case 'struggling': return '#d4a020';
    case 'breaking_down': return '#e04040';
    default: return '#5a5e6a';
  }
}

// Crowd density to number of crowd dots
function crowdCount(density: string): number {
  switch (density) {
    case 'none': return 0;
    case 'sparse': return 6;
    case 'moderate': return 14;
    case 'heavy': return 24;
    case 'massive': return 40;
    default: return 0;
  }
}

// Position band: maps 'front'/'middle'/'back' to a Y range (0-1) on canvas
function positionBand(pos: string): [number, number] {
  switch (pos) {
    case 'front': return [0.08, 0.32];
    case 'middle': return [0.35, 0.62];
    case 'back': return [0.65, 0.88];
    default: return [0.35, 0.62];
  }
}

let frameCounter = 0;
let tooltipWalker: { name: string; status: string; x: number; y: number } | null = null;

export function initVisualization(canvas: HTMLCanvasElement) {
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);
    // Store mouse position for hit testing in render
    (canvas as any)._mouseX = mx;
    (canvas as any)._mouseY = my;
  });

  canvas.addEventListener('mouseleave', () => {
    (canvas as any)._mouseX = -1;
    (canvas as any)._mouseY = -1;
    tooltipWalker = null;
  });
}

export function updateVisualization(state: GameState, canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  frameCounter++;
  const W = canvas.width;
  const H = canvas.height;
  const mx = (canvas as any)._mouseX ?? -1;
  const my = (canvas as any)._mouseY ?? -1;

  // Clear
  ctx.fillStyle = '#0a0b0d';
  ctx.fillRect(0, 0, W, H);

  const roadLeft = W * 0.3;
  const roadRight = W * 0.7;
  const roadCenter = W * 0.5;
  const roadWidth = roadRight - roadLeft;

  // --- Draw terrain tint ---
  const seg = getRouteSegment(state.world.milesWalked);
  if (seg.terrain === 'uphill') {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, 'rgba(40, 30, 20, 0.3)');
    grad.addColorStop(1, 'rgba(40, 30, 20, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  // --- Night overlay ---
  if (state.world.isNight) {
    ctx.fillStyle = 'rgba(0, 0, 20, 0.3)';
    ctx.fillRect(0, 0, W, H);
  }

  // --- Road ---
  // Road surface
  ctx.fillStyle = '#1a1c22';
  ctx.fillRect(roadLeft, 0, roadWidth, H);

  // Road edges (white lines)
  ctx.strokeStyle = '#3a3e4a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(roadLeft, 0);
  ctx.lineTo(roadLeft, H);
  ctx.moveTo(roadRight, 0);
  ctx.lineTo(roadRight, H);
  ctx.stroke();

  // Center dashes (scrolling based on miles)
  ctx.strokeStyle = '#2a2e3a';
  ctx.lineWidth = 1;
  ctx.setLineDash([8, 12]);
  const dashOffset = (state.world.milesWalked * 200) % 20;
  ctx.lineDashOffset = -dashOffset;
  ctx.beginPath();
  ctx.moveTo(roadCenter, 0);
  ctx.lineTo(roadCenter, H);
  ctx.stroke();
  ctx.setLineDash([]);

  // --- Crowd along edges ---
  const phase = getCrowdPhase(state.world.milesWalked);
  const numCrowd = crowdCount(seg.crowdDensity);
  if (numCrowd > 0) {
    ctx.fillStyle = phase.mood === 'surreal' ? '#8060c0'
      : phase.mood === 'hostile' ? '#e04040'
      : phase.mood === 'uneasy' ? '#d4a020'
      : '#5a5e6a';

    for (let i = 0; i < numCrowd; i++) {
      const jx = seededJitter(i + 500, frameCounter * 0.3);
      const jy = seededJitter(i + 700, frameCounter * 0.2);
      // Left side crowd
      const lx = roadLeft - 8 - Math.abs(seededJitter(i, 0)) * (W * 0.2) + jx * 0.5;
      const ly = (i / numCrowd) * H + jy * 2;
      ctx.beginPath();
      ctx.arc(lx, ly, 1.5, 0, Math.PI * 2);
      ctx.fill();
      // Right side crowd
      const rx = roadRight + 8 + Math.abs(seededJitter(i + 300, 0)) * (W * 0.2) + jx * 0.5;
      ctx.beginPath();
      ctx.arc(rx, ly, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- Halftrack (dark rectangle at back of pack) ---
  const htY = H * 0.92;
  const htW = roadWidth * 0.5;
  const htH = 12;
  ctx.fillStyle = '#2a1a1a';
  ctx.fillRect(roadCenter - htW / 2, htY - htH / 2, htW, htH);
  ctx.strokeStyle = '#e04040';
  ctx.lineWidth = 1;
  ctx.strokeRect(roadCenter - htW / 2, htY - htH / 2, htW, htH);

  // Soldiers near halftrack
  for (let i = 0; i < 4; i++) {
    const sx = roadCenter - 15 + i * 10;
    const sy = htY + 10;
    ctx.fillStyle = '#e04040';
    ctx.beginPath();
    ctx.arc(sx, sy, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- Walker dots ---
  tooltipWalker = null;
  const alive = state.walkers.filter(w => w.alive);
  const eliminated = state.walkers.filter(w => !w.alive);

  // Draw eliminated walkers as faded X marks
  for (const w of eliminated) {
    if (w.eliminatedAtMile === null) continue;
    const data = state.walkerData.find(d => d.walkerNumber === w.walkerNumber);
    const band = positionBand(w.position);
    const seed = w.walkerNumber;
    const xPos = roadLeft + roadWidth * (0.2 + seededJitter(seed, 0) * 0.3 + 0.3);
    const yPos = H * (band[0] + (band[1] - band[0]) * ((seed % 17) / 17));

    ctx.strokeStyle = 'rgba(224, 64, 64, 0.25)';
    ctx.lineWidth = 1;
    const s = 3;
    ctx.beginPath();
    ctx.moveTo(xPos - s, yPos - s);
    ctx.lineTo(xPos + s, yPos + s);
    ctx.moveTo(xPos + s, yPos - s);
    ctx.lineTo(xPos - s, yPos + s);
    ctx.stroke();
  }

  // Draw alive walkers
  for (const w of alive) {
    const data = state.walkerData.find(d => d.walkerNumber === w.walkerNumber);
    if (!data) continue;

    const band = positionBand(w.position);
    const seed = w.walkerNumber;

    // Spread walkers across the road width and within their position band
    const jx = seededJitter(seed, frameCounter * 0.15) * 0.5;
    const jy = seededJitter(seed + 100, frameCounter * 0.12) * 0.5;
    const baseX = roadLeft + roadWidth * (0.15 + (seededJitter(seed * 3, 0) * 0.5 + 0.5) * 0.7);
    const baseY = H * (band[0] + (band[1] - band[0]) * ((seed % 23) / 23));
    const x = baseX + jx;
    const y = baseY + jy;

    // Size and color by tier
    let radius: number;
    let color: string;

    if (data.tier === 1) {
      radius = 4;
      color = relationshipColor(w.relationship);
    } else if (data.tier === 2) {
      radius = 2.5;
      color = w.behavioralState === 'steady' ? '#6a6e7a' : behaviorColor(w.behavioralState);
    } else {
      radius = 1.5;
      color = '#3a3e4a';
    }

    // Struggling walkers pulse
    if (w.behavioralState === 'struggling' || w.behavioralState === 'breaking_down') {
      const pulse = Math.sin(frameCounter * 0.1 + seed) * 0.3 + 0.7;
      ctx.globalAlpha = pulse;
    }

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Warning pips for walkers with warnings
    if (w.warnings > 0) {
      ctx.fillStyle = '#e04040';
      for (let i = 0; i < w.warnings; i++) {
        ctx.beginPath();
        ctx.arc(x + (i - 1) * 3, y - radius - 3, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Tier 1 name labels
    if (data.tier === 1) {
      ctx.fillStyle = color;
      ctx.font = '7px "IBM Plex Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(data.name.split(' ')[0], x, y - radius - 4);
    }

    // Allied indicator
    if (w.isAlliedWithPlayer) {
      ctx.strokeStyle = '#40b040';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, radius + 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Hit test for tooltip
    if (mx >= 0 && data.tier <= 2) {
      const dist = Math.sqrt((mx - x) ** 2 + (my - y) ** 2);
      if (dist < radius + 5) {
        const status = w.behavioralState === 'steady' ? `${w.stamina.toFixed(0)}% stamina`
          : w.behavioralState;
        tooltipWalker = {
          name: `${data.name} #${w.walkerNumber}`,
          status: `${status} | ${w.warnings} warnings`,
          x, y
        };
      }
    }
  }

  // --- Player dot (always visible, green, larger) ---
  {
    const band = positionBand(state.player.position);
    const px = roadCenter;
    const py = H * ((band[0] + band[1]) / 2);

    // Glow
    ctx.shadowColor = '#40b040';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#40b040';
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Label
    ctx.fillStyle = '#40b040';
    ctx.font = 'bold 8px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('YOU', px, py - 8);

    // Speed warning ring
    if (state.player.speed < 4) {
      const pulse = Math.sin(frameCounter * 0.15) * 0.4 + 0.6;
      ctx.strokeStyle = `rgba(224, 64, 64, ${pulse})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(px, py, 8, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // --- Tooltip ---
  if (tooltipWalker) {
    const tw = tooltipWalker;
    ctx.fillStyle = 'rgba(20, 23, 32, 0.9)';
    const textWidth = Math.max(
      ctx.measureText(tw.name).width,
      ctx.measureText(tw.status).width
    );
    const boxW = textWidth + 12;
    const boxH = 26;
    const bx = Math.min(tw.x + 10, W - boxW - 4);
    const by = Math.max(tw.y - boxH - 5, 4);
    ctx.fillRect(bx, by, boxW, boxH);
    ctx.strokeStyle = '#3a3e4a';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, boxW, boxH);

    ctx.fillStyle = '#c8ccd8';
    ctx.font = '7px "IBM Plex Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(tw.name, bx + 6, by + 10);
    ctx.fillStyle = '#8a8e9a';
    ctx.fillText(tw.status, bx + 6, by + 20);
  }

  // --- Position labels on right edge ---
  ctx.fillStyle = '#3a3e4a';
  ctx.font = '7px "IBM Plex Mono", monospace';
  ctx.textAlign = 'right';
  ctx.fillText('FRONT', W - 4, H * 0.2);
  ctx.fillText('MIDDLE', W - 4, H * 0.48);
  ctx.fillText('BACK', W - 4, H * 0.76);

  // --- Walker count ---
  ctx.fillStyle = '#5a5e6a';
  ctx.font = '8px "IBM Plex Mono", monospace';
  ctx.textAlign = 'left';
  const remaining = alive.length + (state.player.alive ? 1 : 0);
  ctx.fillText(`${remaining} alive`, 4, H - 6);
}
