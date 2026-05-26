// Tiny synth-based audio for countdown beep + thruster rumble. No external
// .au/.mp3 files — we generate everything with the WebAudio API.

let ctx: AudioContext | null = null;
let thrusterNode: { stop: () => void } | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') {
    // resume requires a user gesture; calling here is safe inside one.
    void ctx.resume();
  }
  return ctx;
}

export function playCountdownBeep(final: boolean = false) {
  const a = audio();
  if (!a) return;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.connect(gain);
  gain.connect(a.destination);
  osc.frequency.value = final ? 880 : 440;
  osc.type = 'sine';
  gain.gain.setValueAtTime(0, a.currentTime);
  gain.gain.linearRampToValueAtTime(0.18, a.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, a.currentTime + (final ? 0.45 : 0.2));
  osc.start();
  osc.stop(a.currentTime + (final ? 0.5 : 0.25));
}

export function startThruster() {
  const a = audio();
  if (!a) return;
  stopThruster();
  // White noise buffer.
  const bufferSize = a.sampleRate * 1.5;
  const noiseBuf = a.createBuffer(1, bufferSize, a.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const noise = a.createBufferSource();
  noise.buffer = noiseBuf;
  noise.loop = true;

  // Low-pass filter for rumble.
  const filter = a.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 380;
  filter.Q.value = 0.8;

  const gain = a.createGain();
  gain.gain.value = 0;

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(a.destination);
  noise.start();
  gain.gain.linearRampToValueAtTime(0.18, a.currentTime + 0.15);

  thrusterNode = {
    stop: () => {
      try {
        gain.gain.cancelScheduledValues(a.currentTime);
        gain.gain.linearRampToValueAtTime(0, a.currentTime + 0.2);
        setTimeout(() => {
          try {
            noise.stop();
          } catch {
            // already stopped
          }
        }, 220);
      } catch {
        // ignore
      }
    },
  };
}

export function stopThruster() {
  if (thrusterNode) {
    thrusterNode.stop();
    thrusterNode = null;
  }
}
