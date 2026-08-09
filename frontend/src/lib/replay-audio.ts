export type ReplaySound = "play" | "pause" | "seek" | "engagement" | "upgrade" | "base";

type BrowserAudioContext = typeof AudioContext;

export class ReplayAudioEngine {
  private context: AudioContext | null = null;

  private getContext() {
    if (typeof window === "undefined") return null;
    const AudioContextConstructor = window.AudioContext
      ?? (window as typeof window & { webkitAudioContext?: BrowserAudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) return null;
    this.context ??= new AudioContextConstructor();
    if (this.context.state === "suspended") void this.context.resume();
    return this.context;
  }

  private tone(frequency: number, duration: number, offset = 0, destinationFrequency?: number, wave: OscillatorType = "sine") {
    const context = this.getContext();
    if (!context) return;
    const startsAt = context.currentTime + offset;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(frequency, startsAt);
    if (destinationFrequency) oscillator.frequency.exponentialRampToValueAtTime(destinationFrequency, startsAt + duration);
    gain.gain.setValueAtTime(0.0001, startsAt);
    gain.gain.exponentialRampToValueAtTime(0.026, startsAt + Math.min(0.018, duration / 3));
    gain.gain.exponentialRampToValueAtTime(0.0001, startsAt + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(startsAt);
    oscillator.stop(startsAt + duration + 0.02);
  }

  play(sound: ReplaySound) {
    if (sound === "play") {
      this.tone(310, 0.09, 0, 470, "triangle");
      this.tone(620, 0.05, 0.055, 720, "sine");
    } else if (sound === "pause") {
      this.tone(440, 0.1, 0, 245, "triangle");
    } else if (sound === "seek") {
      this.tone(760, 0.035, 0, 580, "square");
    } else if (sound === "engagement") {
      this.tone(115, 0.17, 0, 82, "sawtooth");
      this.tone(172, 0.12, 0.06, 128, "triangle");
    } else if (sound === "upgrade") {
      this.tone(470, 0.12, 0, 650, "sine");
      this.tone(710, 0.16, 0.08, 920, "sine");
    } else {
      this.tone(230, 0.14, 0, 330, "triangle");
      this.tone(345, 0.12, 0.07, 460, "sine");
    }
  }

  dispose() {
    if (this.context) void this.context.close();
    this.context = null;
  }
}
