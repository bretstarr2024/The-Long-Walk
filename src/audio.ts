// ============================================================
// The Long Walk — Audio System (Web Audio API)
// Generative ambient music + warning/elimination sound effects
// ============================================================

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let musicGain: GainNode | null = null;
let isPlaying = false;
let isMuted = false;

// Music system references
let chordInterval: ReturnType<typeof setInterval> | null = null;
let pulseInterval: ReturnType<typeof setInterval> | null = null;
let activeVoices: { osc: OscillatorNode; gain: GainNode }[] = [];
let noiseSource: AudioBufferSourceNode | null = null;
let noiseGain: GainNode | null = null;
let noiseFilter: BiquadFilterNode | null = null;
let currentChordIndex = 0;
let currentIntensity = 0;

// ============================================================
// INITIALIZATION — must be called from a user gesture
// ============================================================

export function initAudio(): boolean {
  if (ctx) return true;
  try {
    ctx = new AudioContext();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.7;
    masterGain.connect(ctx.destination);

    musicGain = ctx.createGain();
    musicGain.gain.value = 0.4;
    musicGain.connect(masterGain);

    // Prime speech synthesis voices cache
    if (typeof speechSynthesis !== 'undefined') {
      speechSynthesis.getVoices();
      speechSynthesis.addEventListener('voiceschanged', () => {
        speechSynthesis.getVoices();
      });
    }

    console.log('[Audio] Initialized');
    return true;
  } catch (e) {
    console.warn('[Audio] Failed to initialize:', e);
    return false;
  }
}

export function ensureResumed(): Promise<void> {
  if (ctx && ctx.state === 'suspended') {
    return ctx.resume();
  }
  return Promise.resolve();
}

// ============================================================
// GENERATIVE AMBIENT MUSIC
// Minor key chord pads with slow progression, filtered noise,
// and a subtle rhythmic pulse like distant footsteps
// ============================================================

// Chord progression in A minor — dark, cinematic
// Each chord is an array of frequencies (Hz)
const CHORDS = [
  // Am (A2, C3, E3, A3) — home, dread
  [110, 130.81, 164.81, 220],
  // Dm (D3, F3, A3, D4) — sorrow
  [146.83, 174.61, 220, 293.66],
  // Em (E3, G3, B3, E4) — tension
  [164.81, 196, 246.94, 329.63],
  // Am (A2, C3, E3, A3) — return
  [110, 130.81, 164.81, 220],
  // F (F2, A2, C3, F3) — weight, gravity
  [87.31, 110, 130.81, 174.61],
  // Dm (D3, F3, A3, D4) — descent
  [146.83, 174.61, 220, 293.66],
  // E (E2, G#2, B2, E3) — unease (major V of Am)
  [82.41, 103.83, 123.47, 164.81],
  // Am (A2, C3, E3, A3) — inexorable return
  [110, 130.81, 164.81, 220],
];

// Chord change interval in ms (slow, evolving — ~8 seconds per chord)
const CHORD_DURATION = 8000;

export function startAmbientDrone() {
  if (!ctx || !musicGain || isPlaying) return;
  isPlaying = true;

  // --- Filtered noise layer (wind/atmosphere) ---
  startNoiseLayer();

  // --- Start chord progression ---
  currentChordIndex = 0;
  playChord(CHORDS[0]);
  chordInterval = setInterval(() => {
    currentChordIndex = (currentChordIndex + 1) % CHORDS.length;
    crossfadeToChord(CHORDS[currentChordIndex]);
  }, CHORD_DURATION);

  // --- Rhythmic pulse (distant footsteps / heartbeat) ---
  startPulse();

  console.log('[Audio] Ambient music started');
}

function playChord(freqs: number[]) {
  if (!ctx || !musicGain) return;

  // Fade out existing voices
  for (const v of activeVoices) {
    v.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.5);
    const osc = v.osc;
    setTimeout(() => { try { osc.stop(); } catch { /* */ } }, 3000);
  }
  activeVoices = [];

  // Create new voices
  for (let i = 0; i < freqs.length; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Mix oscillator types for warmth: lower notes = triangle, higher = sine
    osc.type = i < 2 ? 'triangle' : 'sine';
    osc.frequency.value = freqs[i];

    // Slight detuning for richness
    osc.detune.value = (Math.random() - 0.5) * 8;

    // Stagger volumes: root + fifth louder, upper voices softer
    const vol = i === 0 ? 0.22 : i === 1 ? 0.15 : i === 2 ? 0.12 : 0.08;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.setTargetAtTime(vol, ctx.currentTime, 1.2); // slow fade in

    // Low-pass filter for warmth
    const lpf = ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = 800 + Math.random() * 400;
    lpf.Q.value = 0.5;

    osc.connect(lpf);
    lpf.connect(gain);
    gain.connect(musicGain);
    osc.start();

    activeVoices.push({ osc, gain });
  }

  // Add a sub-bass note (octave below root)
  const sub = ctx.createOscillator();
  const subGain = ctx.createGain();
  sub.type = 'sine';
  sub.frequency.value = freqs[0] / 2;
  subGain.gain.setValueAtTime(0, ctx.currentTime);
  subGain.gain.setTargetAtTime(0.18, ctx.currentTime, 1.5);
  sub.connect(subGain);
  subGain.connect(musicGain);
  sub.start();
  activeVoices.push({ osc: sub, gain: subGain });
}

function crossfadeToChord(freqs: number[]) {
  if (!ctx || !musicGain) return;

  // Smooth crossfade: fade out old voices over 2 seconds
  const oldVoices = [...activeVoices];
  for (const v of oldVoices) {
    v.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.8);
    const osc = v.osc;
    setTimeout(() => { try { osc.stop(); } catch { /* */ } }, 4000);
  }
  activeVoices = [];

  // New voices fade in
  for (let i = 0; i < freqs.length; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = i < 2 ? 'triangle' : 'sine';
    osc.frequency.value = freqs[i];
    osc.detune.value = (Math.random() - 0.5) * 8;

    const vol = i === 0 ? 0.22 : i === 1 ? 0.15 : i === 2 ? 0.12 : 0.08;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.setTargetAtTime(vol, ctx.currentTime, 1.5);

    const lpf = ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = 800 + Math.random() * 400;
    lpf.Q.value = 0.5;

    osc.connect(lpf);
    lpf.connect(gain);
    gain.connect(musicGain);
    osc.start();
    activeVoices.push({ osc, gain });
  }

  // Sub bass
  const sub = ctx.createOscillator();
  const subGain = ctx.createGain();
  sub.type = 'sine';
  sub.frequency.value = freqs[0] / 2;
  subGain.gain.setValueAtTime(0, ctx.currentTime);
  subGain.gain.setTargetAtTime(0.18, ctx.currentTime, 1.5);
  sub.connect(subGain);
  subGain.connect(musicGain);
  sub.start();
  activeVoices.push({ osc: sub, gain: subGain });
}

function startNoiseLayer() {
  if (!ctx || !musicGain) return;

  // Create filtered noise — sounds like wind/air
  const bufferSize = ctx.sampleRate * 4;
  const noiseBuf = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuf;
  noiseSource.loop = true;

  // Band-pass filter — narrow band = wind character
  noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.value = 400;
  noiseFilter.Q.value = 2;

  noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.04; // very subtle

  noiseSource.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(musicGain);
  noiseSource.start();
}

function startPulse() {
  if (!ctx || !musicGain) return;

  // Rhythmic low pulse — like distant footsteps on asphalt
  // ~72 BPM (833ms between beats) — walking cadence
  pulseInterval = setInterval(() => {
    if (!ctx || !musicGain || isMuted) return;

    const now = ctx.currentTime;

    // Soft thump — filtered sine burst
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const lpf = ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);

    lpf.type = 'lowpass';
    lpf.frequency.value = 200;

    // Volume depends on intensity — louder as game gets darker
    const vol = 0.06 + currentIntensity * 0.08;
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(lpf);
    lpf.connect(gain);
    gain.connect(musicGain);
    osc.start(now);
    osc.stop(now + 0.3);
    osc.onended = () => { osc.disconnect(); lpf.disconnect(); gain.disconnect(); };

    // Occasional second lighter step (walking rhythm)
    if (Math.random() < 0.6) {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(60, now + 0.4);
      osc2.frequency.exponentialRampToValueAtTime(35, now + 0.55);
      gain2.gain.setValueAtTime(vol * 0.5, now + 0.4);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc2.connect(gain2);
      gain2.connect(musicGain);
      osc2.start(now + 0.4);
      osc2.stop(now + 0.65);
      osc2.onended = () => { osc2.disconnect(); gain2.disconnect(); };
    }
  }, 833);
}

export function stopAmbientDrone() {
  if (chordInterval) { clearInterval(chordInterval); chordInterval = null; }
  if (pulseInterval) { clearInterval(pulseInterval); pulseInterval = null; }

  for (const v of activeVoices) {
    try { v.osc.stop(); } catch { /* */ }
  }
  activeVoices = [];

  if (noiseSource) {
    try { noiseSource.stop(); } catch { /* */ }
    noiseSource = null;
  }
  noiseGain = null;
  noiseFilter = null;

  isPlaying = false;
}

// Shift music character based on game intensity (0.0 = calm, 1.0 = peak horror)
export function updateDroneIntensity(intensity: number) {
  if (!musicGain || !ctx) return;
  currentIntensity = intensity;

  // Volume: rises with intensity
  const targetVol = 0.3 + intensity * 0.25;
  musicGain.gain.setTargetAtTime(targetVol, ctx.currentTime, 1.0);

  // Noise layer: gets louder and higher (more wind/chaos)
  if (noiseGain) {
    noiseGain.gain.setTargetAtTime(0.03 + intensity * 0.08, ctx.currentTime, 2);
  }
  if (noiseFilter) {
    noiseFilter.frequency.setTargetAtTime(400 + intensity * 800, ctx.currentTime, 3);
    noiseFilter.Q.setTargetAtTime(2 - intensity * 1.2, ctx.currentTime, 3);
  }

  // Detune chord voices slightly more at higher intensity (unease)
  for (let i = 0; i < activeVoices.length; i++) {
    const detune = (Math.random() - 0.5) * (6 + intensity * 20);
    activeVoices[i].osc.detune.setTargetAtTime(detune, ctx.currentTime, 4);
  }
}

// ============================================================
// GUNSHOT — piercing, startling, like a jump scare
// Layered: initial click + broadband blast + low concussion +
// supersonic crack + outdoor echo tail
// ============================================================

export function playGunshot() {
  if (!ctx || !masterGain || isMuted) return;

  const now = ctx.currentTime;

  // Kill the music completely for maximum shock, slow return
  if (musicGain) {
    const vol = musicGain.gain.value;
    musicGain.gain.setValueAtTime(vol, now);
    musicGain.gain.linearRampToValueAtTime(0, now + 0.015);
    musicGain.gain.setTargetAtTime(vol, now + 0.8, 1.5);
  }

  // Temporarily boost master for the shot (jump scare volume)
  masterGain.gain.setValueAtTime(0.7, now);
  masterGain.gain.linearRampToValueAtTime(1.0, now + 0.005);
  masterGain.gain.setTargetAtTime(0.7, now + 0.4, 0.5);

  // --- Initial transient click (firing pin, ~3ms) ---
  const clickLen = Math.floor(ctx.sampleRate * 0.004);
  const clickBuf = ctx.createBuffer(1, clickLen, ctx.sampleRate);
  const clickData = clickBuf.getChannelData(0);
  for (let i = 0; i < clickLen; i++) {
    clickData[i] = (Math.random() * 2 - 1) * (1 - i / clickLen);
  }
  const click = ctx.createBufferSource();
  click.buffer = clickBuf;
  const clickGain = ctx.createGain();
  clickGain.gain.value = 1.2;
  click.connect(clickGain);
  clickGain.connect(masterGain);
  click.start(now);

  // --- Main blast: broadband noise, heavy distortion ---
  const blastLen = Math.floor(ctx.sampleRate * 0.5);
  const blastBuf = ctx.createBuffer(1, blastLen, ctx.sampleRate);
  const blastData = blastBuf.getChannelData(0);
  for (let i = 0; i < blastLen; i++) {
    const t = i / ctx.sampleRate;
    // Ultra-fast attack, aggressive decay
    const env = (t < 0.002 ? t / 0.002 : 1) * Math.exp(-t * 12);
    blastData[i] = (Math.random() * 2 - 1) * env * 1.5;
  }
  const blast = ctx.createBufferSource();
  blast.buffer = blastBuf;

  // Heavy distortion (hard clipping)
  const distortion = ctx.createWaveShaper();
  const curve = new Float32Array(512);
  for (let i = 0; i < 512; i++) {
    const x = (i * 2) / 512 - 1;
    curve[i] = Math.tanh(x * 10);
  }
  distortion.curve = curve;
  distortion.oversample = '4x';

  // Wide bandwidth — only cut sub-bass rumble
  const hipass = ctx.createBiquadFilter();
  hipass.type = 'highpass';
  hipass.frequency.value = 80;

  const blastGain = ctx.createGain();
  blastGain.gain.setValueAtTime(1.5, now);
  blastGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

  blast.connect(hipass);
  hipass.connect(distortion);
  distortion.connect(blastGain);
  blastGain.connect(masterGain);
  blast.start(now);
  blast.stop(now + 0.6);

  // --- Low concussion (chest-punch feel) ---
  const thump = ctx.createOscillator();
  const thumpGain = ctx.createGain();
  thump.type = 'sine';
  thump.frequency.setValueAtTime(200, now);
  thump.frequency.exponentialRampToValueAtTime(18, now + 0.25);
  thumpGain.gain.setValueAtTime(1.4, now);
  thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
  thump.connect(thumpGain);
  thumpGain.connect(masterGain);
  thump.start(now);
  thump.stop(now + 0.45);

  // --- Supersonic crack (sharp, piercing) ---
  const crack = ctx.createOscillator();
  const crackGain = ctx.createGain();
  crack.type = 'square';
  crack.frequency.setValueAtTime(6000, now);
  crack.frequency.exponentialRampToValueAtTime(200, now + 0.025);
  crackGain.gain.setValueAtTime(0.7, now);
  crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
  crack.connect(crackGain);
  crackGain.connect(masterGain);
  crack.start(now);
  crack.stop(now + 0.06);

  // --- Outdoor echo (delayed filtered copies of the blast) ---
  const echoDelays = [0.12, 0.28, 0.5];
  const echoVols = [0.2, 0.1, 0.04];
  const echoCutoffs = [1800, 1200, 600];
  for (let i = 0; i < echoDelays.length; i++) {
    const delay = ctx.createDelay(1);
    delay.delayTime.value = echoDelays[i];
    const echoGain = ctx.createGain();
    echoGain.gain.value = echoVols[i];
    const lpf = ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = echoCutoffs[i];

    blastGain.connect(delay);
    delay.connect(lpf);
    lpf.connect(echoGain);
    echoGain.connect(masterGain);

    // Disconnect echo chain after last echo fades (~1.5s total)
    setTimeout(() => { delay.disconnect(); lpf.disconnect(); echoGain.disconnect(); }, 2000);
  }

  // Disconnect one-shot gunshot nodes after they finish
  setTimeout(() => {
    try { clickGain.disconnect(); } catch { /* */ }
    try { blastGain.disconnect(); } catch { /* */ }
    try { thumpGain.disconnect(); } catch { /* */ }
    try { crackGain.disconnect(); } catch { /* */ }
  }, 2000);
}

// ============================================================
// WARNING BUZZER — harsh, military, mechanical
// Two short pulses of dissonant square waves
// ============================================================

export function playWarningBuzzer() {
  if (!ctx || !masterGain || isMuted) return;

  const now = ctx.currentTime;

  // Two pulses
  for (let pulse = 0; pulse < 2; pulse++) {
    const t = now + pulse * 0.22;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const buzzGain = ctx.createGain();

    osc1.type = 'square';
    osc2.type = 'square';
    osc1.frequency.value = 440;
    osc2.frequency.value = 523; // dissonant minor second-ish

    buzzGain.gain.setValueAtTime(0, t);
    buzzGain.gain.linearRampToValueAtTime(0.12, t + 0.015);
    buzzGain.gain.setValueAtTime(0.12, t + 0.12);
    buzzGain.gain.linearRampToValueAtTime(0, t + 0.16);

    osc1.connect(buzzGain);
    osc2.connect(buzzGain);
    buzzGain.connect(masterGain);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.2);
    osc2.stop(t + 0.2);
    osc1.onended = () => { osc1.disconnect(); osc2.disconnect(); buzzGain.disconnect(); };
  }
}

// ============================================================
// WARNING VOICE — spoken soldier announcement via Web Speech API
// Plays the buzzer as an attention-getter, then speaks the text
// ============================================================

export function playWarningVoice(text: string) {
  if (isMuted) return;

  // Play buzzer first as a brief attention-getter
  playWarningBuzzer();

  // Speak the warning text after a short delay
  if (typeof speechSynthesis !== 'undefined') {
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 0.7;
      utterance.volume = 0.8;

      // Try to find a male English voice
      const voices = speechSynthesis.getVoices();
      const maleEnglish = voices.find(
        (v) => v.lang.startsWith('en') && /male/i.test(v.name),
      );
      if (maleEnglish) {
        utterance.voice = maleEnglish;
      }

      speechSynthesis.speak(utterance);
    }, 400);
  }
}

// ============================================================
// PLEADING — random dying walker begging before gunshot
// ============================================================

const PLEAS = [
  "No, please! I can speed up! I can—",
  "Please, God, no! I'll walk faster! I swear I'll—",
  "Not me! Please, not—",
  "Oh God. Oh God, please, I don't want to—",
  "Wait! Wait, I'm speeding up! Look, I'm—",
];

export function playPleading(age?: number): boolean {
  if (isMuted || typeof speechSynthesis === 'undefined') return false;
  const text = PLEAS[Math.floor(Math.random() * PLEAS.length)];
  const utterance = new SpeechSynthesisUtterance(text);
  // Vary voice by age: young = higher/faster, older = deeper/slower
  if (age !== undefined && age <= 17) {
    utterance.rate = 1.3;
    utterance.pitch = 1.1;
  } else if (age !== undefined && age > 25) {
    utterance.rate = 1.0;
    utterance.pitch = 0.7;
  } else {
    utterance.rate = 1.2;
    utterance.pitch = 0.9;
  }
  utterance.volume = 0.7;
  const voices = speechSynthesis.getVoices();
  const maleEnglish = voices.find(
    v => v.lang.startsWith('en') && /male/i.test(v.name),
  );
  const english = maleEnglish || voices.find(v => v.lang.startsWith('en'));
  if (english) utterance.voice = english;
  speechSynthesis.speak(utterance);
  return true;
}

export function cancelSpeech() {
  if (typeof speechSynthesis !== 'undefined') {
    speechSynthesis.cancel();
  }
}

// ============================================================
// MUTE / VOLUME
// ============================================================

export function toggleMute(): boolean {
  isMuted = !isMuted;
  if (masterGain && ctx) {
    masterGain.gain.setTargetAtTime(isMuted ? 0 : 0.7, ctx.currentTime, 0.05);
  }
  console.log(`[Audio] ${isMuted ? 'Muted' : 'Unmuted'}`);
  return isMuted;
}

export function getIsMuted(): boolean {
  return isMuted;
}

export function isAudioInitialized(): boolean {
  return ctx !== null;
}

// ============================================================
// INTENSITY CALCULATOR — maps game state → 0.0–1.0
// ============================================================

export function calculateIntensity(
  hoursElapsed: number,
  eliminationCount: number,
  horrorTier: number,
  isNight: boolean,
): number {
  let intensity = 0;

  // Time: slow creep over hours
  intensity += Math.min(hoursElapsed / 100, 0.25);

  // Death toll
  intensity += Math.min(eliminationCount / 70, 0.3);

  // Horror tier escalation
  intensity += (horrorTier - 1) * 0.1;

  // Night is worse
  if (isNight) intensity += 0.1;

  return Math.min(1, Math.max(0, intensity));
}
