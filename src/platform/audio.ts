import type { ToolId } from '../types';

export class GameAudio {
  private context: AudioContext | null = null;
  private enabled: boolean;
  private lastToolSound = 0;

  constructor(enabled: boolean) {
    this.enabled = enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  private getContext(): AudioContext | null {
    if (!this.enabled) return null;
    this.context ??= new AudioContext();
    if (this.context.state === 'suspended') void this.context.resume();
    return this.context;
  }

  playTool(tool: ToolId, amount: number): void {
    const now = performance.now();
    if (amount <= 0.002 || now - this.lastToolSound < 105) return;
    this.lastToolSound = now;
    const context = this.getContext();
    if (!context) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    const frequencies: Record<ToolId, number> = {
      water: 340,
      vacuum: 92,
      foam: 510,
      brush: 165,
    };
    oscillator.type = tool === 'vacuum' ? 'sawtooth' : tool === 'brush' ? 'triangle' : 'sine';
    oscillator.frequency.setValueAtTime(frequencies[tool] + Math.random() * 24, context.currentTime);
    filter.type = 'lowpass';
    filter.frequency.value = tool === 'water' ? 1100 : 620;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.018, context.currentTime + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.075);
    oscillator.connect(filter).connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.08);
  }

  playCollect(): void {
    this.playNotes([620, 830], 0.075);
  }

  playComplete(): void {
    this.playNotes([392, 523, 659, 784], 0.12);
  }

  private playNotes(notes: number[], spacing: number): void {
    const context = this.getContext();
    if (!context) return;
    notes.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = context.currentTime + index * spacing;
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.08, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.24);
    });
  }
}
