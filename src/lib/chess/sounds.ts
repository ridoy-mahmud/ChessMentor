// Synthesized chess sound effects using the Web Audio API.
// Client-only. No external assets — short, crisp, non-cartoonish tones.

export type SoundName =
  | "move"
  | "capture"
  | "castle"
  | "check"
  | "promotion"
  | "illegal"
  | "gameStart"
  | "win"
  | "lose"
  | "draw"
  | "lowTime";

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

type Tone = {
  freq: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
  attack?: number;
  release?: number;
  delay?: number;
};

function playTones(tones: Tone[]) {
  const ac = getCtx();
  if (!ac) return;
  const now = ac.currentTime;
  for (const t of tones) {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = t.type ?? "triangle";
    osc.frequency.value = t.freq;
    const start = now + (t.delay ?? 0);
    const attack = t.attack ?? 0.005;
    const release = t.release ?? 0.05;
    const peak = t.gain ?? 0.18;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(peak, start + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, start + attack + t.duration + release);
    osc.connect(g).connect(ac.destination);
    osc.start(start);
    osc.stop(start + attack + t.duration + release + 0.02);
  }
}

const RECIPES: Record<SoundName, Tone[]> = {
  move: [{ freq: 620, duration: 0.04, type: "triangle", gain: 0.14 }],
  capture: [
    { freq: 220, duration: 0.05, type: "sawtooth", gain: 0.16 },
    { freq: 140, duration: 0.08, type: "sine", gain: 0.12, delay: 0.01 },
  ],
  castle: [
    { freq: 520, duration: 0.05, type: "triangle", gain: 0.14 },
    { freq: 520, duration: 0.05, type: "triangle", gain: 0.14, delay: 0.08 },
  ],
  check: [
    { freq: 880, duration: 0.06, type: "triangle", gain: 0.16 },
    { freq: 1175, duration: 0.06, type: "triangle", gain: 0.16, delay: 0.07 },
  ],
  promotion: [
    { freq: 660, duration: 0.06, type: "triangle", gain: 0.14 },
    { freq: 990, duration: 0.06, type: "triangle", gain: 0.14, delay: 0.06 },
    { freq: 1320, duration: 0.08, type: "triangle", gain: 0.14, delay: 0.12 },
  ],
  illegal: [{ freq: 120, duration: 0.1, type: "square", gain: 0.12 }],
  gameStart: [
    { freq: 440, duration: 0.08, type: "sine", gain: 0.14 },
    { freq: 660, duration: 0.1, type: "sine", gain: 0.14, delay: 0.09 },
  ],
  win: [
    { freq: 523, duration: 0.09, type: "triangle", gain: 0.16 },
    { freq: 659, duration: 0.09, type: "triangle", gain: 0.16, delay: 0.1 },
    { freq: 784, duration: 0.14, type: "triangle", gain: 0.16, delay: 0.2 },
  ],
  lose: [
    { freq: 392, duration: 0.12, type: "sine", gain: 0.14 },
    { freq: 294, duration: 0.18, type: "sine", gain: 0.14, delay: 0.13 },
  ],
  draw: [
    { freq: 440, duration: 0.09, type: "sine", gain: 0.13 },
    { freq: 440, duration: 0.11, type: "sine", gain: 0.13, delay: 0.11 },
  ],
  lowTime: [{ freq: 1000, duration: 0.03, type: "square", gain: 0.1 }],
};

let muted = false;
export function setMuted(v: boolean) {
  muted = v;
}
export function isMuted() {
  return muted;
}

export function playSound(name: SoundName) {
  if (muted) return;
  const recipe = RECIPES[name];
  if (recipe) playTones(recipe);
}
