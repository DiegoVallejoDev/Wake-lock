/**
 * Fake DOOM theme: an original dark synth loop sequenced on the Web Audio
 * clock. Pure data lives at the top so the song is easy to read and test;
 * `createDoomLoop` turns it into a start/stop engine on an AudioContext.
 */

export const BPM = 132;
export const STEPS_PER_BAR = 8;
export const BARS = 4;

export type Instrument = "bass" | "stab" | "hat";

export interface NoteEvent {
  step: number;
  /** MIDI note number; hats ignore it. */
  midi: number;
  instrument: Instrument;
}

const E2 = 40;

/**
 * Driving chug in E minor with a chromatic lift each bar and dissonant
 * stabs at bar transitions. Length: BARS * STEPS_PER_BAR eighth notes.
 */
export const PATTERN: NoteEvent[] = [
  // --- bar 1: pedal chug ---
  ...[0, 1, 2, 3, 4, 5, 6, 7].map((step) => ({
    step,
    midi: E2,
    instrument: "bass" as const,
  })),
  // --- bar 2: chug, then a flat-2 walk-up ---
  ...[8, 9, 10, 11].map((step) => ({
    step,
    midi: E2,
    instrument: "bass" as const,
  })),
  { step: 12, midi: E2, instrument: "bass" },
  { step: 13, midi: 41 /* F2 */, instrument: "bass" },
  { step: 14, midi: E2, instrument: "bass" },
  { step: 15, midi: 41, instrument: "bass" },
  // --- bar 3: chug, then G-A climb ---
  ...[16, 17, 18, 19, 20, 21].map((step) => ({
    step,
    midi: E2,
    instrument: "bass" as const,
  })),
  { step: 22, midi: 43 /* G2 */, instrument: "bass" },
  { step: 23, midi: 45 /* A2 */, instrument: "bass" },
  // --- bar 4: A pedal, flat-5 grind, resolve ---
  { step: 24, midi: 45, instrument: "bass" },
  { step: 25, midi: 45, instrument: "bass" },
  { step: 26, midi: 45, instrument: "bass" },
  { step: 27, midi: 45, instrument: "bass" },
  { step: 28, midi: 46 /* Bb2 */, instrument: "bass" },
  { step: 29, midi: 46, instrument: "bass" },
  { step: 30, midi: 45, instrument: "bass" },
  { step: 31, midi: 43, instrument: "bass" },
  // power-chord stabs at the bar boundaries
  { step: 0, midi: 52 /* E3 */, instrument: "stab" },
  { step: 0, midi: 59 /* B3 */, instrument: "stab" },
  { step: 16, midi: 55 /* G3 */, instrument: "stab" },
  { step: 16, midi: 62 /* D4 */, instrument: "stab" },
  { step: 24, midi: 57 /* A3 */, instrument: "stab" },
  { step: 24, midi: 64 /* E4 */, instrument: "stab" },
  // noise hats on every eighth
  ...Array.from({ length: BARS * STEPS_PER_BAR }, (_, step) => ({
    step,
    midi: 0,
    instrument: "hat" as const,
  })),
];

export const LOOP_STEPS = BARS * STEPS_PER_BAR;

export function midiToFreq(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

export interface DoomLoop {
  start(): void;
  stop(): void;
  readonly playing: boolean;
}

/**
 * Lookahead scheduler: every TICK_MS it queues any note due inside the
 * AHEAD_S horizon on the audio clock, so timing survives a busy UI thread.
 */
export function createDoomLoop(ctx: AudioContext): DoomLoop {
  const TICK_MS = 40;
  const AHEAD_S = 0.15;
  const stepDur = 60 / BPM / 2; // eighth notes

  const master = ctx.createGain();
  master.gain.value = 0.3;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.ratio.value = 6;
  master.connect(comp).connect(ctx.destination);

  const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
  const noiseData = noiseBuf.getChannelData(0);
  for (let i = 0; i < noiseData.length; i++) noiseData[i] = Math.random() * 2 - 1;

  let nextTime = 0;
  let nextStep = 0;
  let timer: ReturnType<typeof setInterval> | null = null;
  let active = false;

  function playBass(midi: number, at: number) {
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = midiToFreq(midi);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 750;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.5, at);
    g.gain.exponentialRampToValueAtTime(0.001, at + stepDur * 0.95);
    osc.connect(lp).connect(g).connect(master);
    osc.start(at);
    osc.stop(at + stepDur);
  }

  function playStab(midi: number, at: number) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.25, at);
    g.gain.exponentialRampToValueAtTime(0.001, at + stepDur * 4);
    g.connect(master);
    for (const detune of [-8, 8]) {
      const osc = ctx.createOscillator();
      osc.type = "square";
      osc.frequency.value = midiToFreq(midi);
      osc.detune.value = detune;
      osc.connect(g);
      osc.start(at);
      osc.stop(at + stepDur * 4);
    }
  }

  function playHat(at: number) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 6000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.12, at);
    g.gain.exponentialRampToValueAtTime(0.001, at + 0.05);
    src.connect(hp).connect(g).connect(master);
    src.start(at);
    src.stop(at + 0.05);
  }

  function schedule() {
    while (nextTime < ctx.currentTime + AHEAD_S) {
      for (const note of PATTERN) {
        if (note.step !== nextStep) continue;
        if (note.instrument === "bass") playBass(note.midi, nextTime);
        else if (note.instrument === "stab") playStab(note.midi, nextTime);
        else playHat(nextTime);
      }
      nextStep = (nextStep + 1) % LOOP_STEPS;
      nextTime += stepDur;
    }
  }

  return {
    start() {
      if (timer) return;
      nextTime = ctx.currentTime + 0.05;
      nextStep = 0;
      active = true;
      master.gain.setTargetAtTime(0.3, ctx.currentTime, 0.001);
      schedule();
      timer = setInterval(schedule, TICK_MS);
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
      active = false;
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.02);
    },
    get playing() {
      return active;
    },
  };
}
