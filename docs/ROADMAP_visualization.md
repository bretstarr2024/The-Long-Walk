# Road Visualization Overhaul — Roadmap

**Status**: Planned
**Priority**: High (gameplay feel)
**Flagged**: v0.8.0 playtest

## Current State

The visualization (`src/visualization.ts`, ~850 lines) uses an infrared thermal satellite aesthetic:
- Walker dots: heat blobs with tier-based sizing (Tier 1 = 7px, Tier 2 = 5px, Tier 3 = 3px)
- Position bands: front (8-32%), middle (35-62%), back (65-88%) of canvas height
- Thermal color palette: black -> indigo -> purple -> magenta -> orange -> yellow -> white-hot
- Weather FX: rain streaks, fog layer, cold tint
- Halftrack: rectangular body with engine heat glow and exhaust plume

## Problems

1. **No visible zone division**: The 5 pack zones (front/middle/back + road shoulders) are implicit position bands with no visual boundary — players can't see where they are or where others are
2. **Not scrollable**: Fixed viewport, can't look ahead or behind the pack
3. **General readability**: "A complete mess" — too abstract for gameplay comprehension

## Overhaul Vision

### Must-Have
- Divide the road into clearly labeled zones (Front / Middle / Back) with visible boundaries
- Scrollable view — pan up/down to see ahead of or behind the pack
- Player position clearly highlighted
- Tier 1/2 walker labels readable at all zoom levels

### Should-Have
- Top-down road perspective with lane markings and shoulders
- Walker silhouettes or sprites instead of heat blobs (animated stride)
- Terrain rendering (hills, curves, roadside scenery)
- Dynamic camera following the pack with zoom control

### Nice-to-Have
- Elimination animations (flash, fall, fade)
- Day/night lighting transitions
- Crowd figures along roadside with density visualization
- Click walkers on the road to open dossier
- WebGL renderer for complex scenes

### Constraints
- Must maintain 30fps on mobile
- Canvas-based (no framework dependency)
- Preserve ARIA/accessibility: provide text-only alternative view
- Keep the infrared palette as an option/toggle (it's atmospheric)
