// ============================================================
// The Long Walk — Route Data (terrain, crowds, landmarks)
// Based on US Route 1 from Maine/Canada border heading south
// ============================================================

import { RouteSegment, CrowdPhase } from '../types';

export const ROUTE_SEGMENTS: RouteSegment[] = [
  { startMile: 0, endMile: 10, terrain: 'flat', location: 'Maine/Canada border, rural', crowdDensity: 'sparse', notes: 'Starting area. Cold morning. Open sky.' },
  { startMile: 10, endMile: 30, terrain: 'flat', location: 'Northern Maine woods', crowdDensity: 'sparse', notes: 'Isolated. Dark trees press close on both sides.' },
  { startMile: 30, endMile: 50, terrain: 'flat', location: 'Small Maine towns', crowdDensity: 'moderate', notes: 'First real crowds. Signs and banners. The smell of food from roadside vendors.' },
  { startMile: 50, endMile: 65, terrain: 'uphill', location: 'Coastal Maine hills', crowdDensity: 'moderate', notes: 'Hills begin. Ocean glimpsed between trees. Legs burn.' },
  { startMile: 65, endMile: 80, terrain: 'uphill', location: 'Coastal Maine hills', crowdDensity: 'heavy', notes: 'The gauntlet. Steep grades. Walkers spread out on the inclines.' },
  { startMile: 80, endMile: 100, terrain: 'flat', location: 'Larger town', crowdDensity: 'heavy', notes: 'Through a town. Spectacle. Noise. Confetti falls like snow.' },
  { startMile: 100, endMile: 130, terrain: 'flat', location: 'Southern Maine', crowdDensity: 'moderate', notes: 'Rain belt. Weather deteriorates. The road darkens.' },
  { startMile: 130, endMile: 150, terrain: 'flat', location: 'Freeport/Portland area', crowdDensity: 'heavy', notes: 'Major population center. Jan sighting zone for Garraty.' },
  { startMile: 150, endMile: 200, terrain: 'flat', location: 'Continuing south', crowdDensity: 'moderate', notes: 'Day 2 begins. Fatigue is real. The road feels endless.' },
  { startMile: 200, endMile: 250, terrain: 'uphill', location: 'New Hampshire border area', crowdDensity: 'sparse', notes: 'Hills return. Fewer walkers, fewer crowds. The world shrinks.' },
  { startMile: 250, endMile: 300, terrain: 'flat', location: 'Through smaller towns', crowdDensity: 'sparse', notes: 'Late game. Surreal quiet. Empty storefronts. Faces in windows.' },
  { startMile: 300, endMile: 350, terrain: 'flat', location: 'Open road', crowdDensity: 'none', notes: 'Almost empty. The road narrows to just the walkers and the halftrack.' },
  { startMile: 350, endMile: 400, terrain: 'flat', location: 'The final stretch', crowdDensity: 'massive', notes: 'Crowds return for the finale. Enormous. Terrifying. A force.' },
];

export const CROWD_PHASES: CrowdPhase[] = [
  { startMile: 0, endMile: 50, mood: 'excited', description: 'Festival atmosphere. Cheering, signs, confetti. Children wave. It feels like a parade.' },
  { startMile: 50, endMile: 120, mood: 'cheering', description: 'Passionate and partisan. Crowds have favorites. Signs with walker names. Some boo walkers they dislike.' },
  { startMile: 120, endMile: 200, mood: 'subdued', description: 'Quieter. They watch more intently. Some are clearly hoping to witness an elimination. Voyeuristic.' },
  { startMile: 200, endMile: 300, mood: 'uneasy', description: 'Some spectators stand in complete silence. Others stare blankly. Occasional signs with text that doesn\'t make sense.' },
  { startMile: 300, endMile: 400, mood: 'surreal', description: 'No longer individual people. An entity. Hands reach. Faces blur. The crowd wants blood, or revelation, or both.' },
];

export function getRouteSegment(mile: number): RouteSegment {
  return ROUTE_SEGMENTS.find(s => mile >= s.startMile && mile < s.endMile)
    ?? ROUTE_SEGMENTS[ROUTE_SEGMENTS.length - 1];
}

export function getCrowdPhase(mile: number): CrowdPhase {
  return CROWD_PHASES.find(p => mile >= p.startMile && mile < p.endMile)
    ?? CROWD_PHASES[CROWD_PHASES.length - 1];
}

// Ambient narrative descriptions keyed by environment conditions
export const AMBIENT_DESCRIPTIONS = {
  terrain: {
    flat: [
      'The road stretches flat and featureless ahead.',
      'Flat ground. Your legs are grateful.',
      'The road runs straight as a ruler through flat country.',
    ],
    uphill: [
      'The road tilts upward. Your calves burn immediately.',
      'Another hill. The incline is gentle but relentless.',
      'Uphill. Every step costs twice what it should.',
    ],
    downhill: [
      'Downhill. Your knees take the punishment now.',
      'The road slopes down. Gravity pulls you forward.',
      'Downhill stretch. Your joints protest with every step.',
    ],
    rough: [
      'The road surface is cracked and uneven.',
      'Potholes and broken asphalt. Watch your footing.',
      'Rough ground. Every step requires attention.',
    ],
  },
  weather: {
    clear: ['Clear sky overhead. The sun tracks across the horizon.', 'Blue sky. A beautiful day for a walk. If only it were just a walk.'],
    cloudy: ['Overcast. The clouds press low like a ceiling.', 'Gray sky. Neither warm nor cold. Just gray.'],
    rain: ['Rain. Steady and cold. It finds every gap in your clothes.', 'The rain falls without mercy. The road glistens.'],
    heavy_rain: ['Driving rain. You can barely see the walker ahead of you.', 'The rain hammers down. The world dissolves into gray noise.'],
    fog: ['Fog rolls in. The walkers ahead become ghosts.', 'Thick fog. The halftrack is just a rumbling shadow behind you.'],
    cold: ['The cold seeps into your bones. Your fingers are numb.', 'Bitter cold. Each breath comes out as a white plume.'],
  },
  timeOfDay: {
    dawn: 'Dawn breaks. The sky turns the color of a bruise healing.',
    morning: 'Morning light. Shadows stretch long behind you.',
    afternoon: 'Afternoon sun. The road shimmers in the heat.',
    evening: 'The sun sinks. Shadows grow. The temperature drops.',
    night: 'Night. The road is lit by the halftrack\'s headlights and the dim glow of distant towns.',
    'late night': 'Deep night. The darkest hours. Your body screams for sleep that will never come.',
  },
} as const;
