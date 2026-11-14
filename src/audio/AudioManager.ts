import { SETTINGS } from '../config/settings';

/**
 * Procedural Web Audio API sound engine modeling acoustic transmission
 * through physical spacesuit conduction and equipment in the lunar vacuum.
 * Zero external mp3 dependencies (100% synthesized in real time).
 */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private isInitialized: boolean = false;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;

  // Spacesuit PLSS life support fan loop
  private plssGain: GainNode | null = null;
  private plssNoiseNode: AudioBufferSourceNode | null = null;

  // Rover electric motor harmonic sound
  private roverMotorOsc1: OscillatorNode | null = null;
  private roverMotorOsc2: OscillatorNode | null = null;
  private roverGain: GainNode | null = null;
  private roverCurrentPitch: number = 220;

  constructor() {
    this.isMuted = !SETTINGS.audio.enabled;
  }

  /**
   * Initializes AudioContext upon first user interaction (browser autoplay policy)
   */
  public init(): void {
    if (this.isInitialized) return;

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : SETTINGS.audio.masterVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.setupSuitLifeSupport();
      this.setupRoverMotor();

      this.isInitialized = true;
    } catch (e) {
      console.warn('AudioContext not supported or blocked:', e);
    }
  }

  /**
   * Resumes AudioContext if suspended by browser
   */
  public resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * Continuous gentle PLSS (Portable Life Support System) oxygen airflow and suit blower fan
   */
  private setupSuitLifeSupport(): void {
    if (!this.ctx || !this.masterGain) return;

    // Generate 2 seconds of looping filtered pink noise
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      output[i] = (b0 + b1 + b2) * 0.12;
    }

    this.plssNoiseNode = this.ctx.createBufferSource();
    this.plssNoiseNode.buffer = noiseBuffer;
    this.plssNoiseNode.loop = true;

    // Lowpass filter modeling transmission inside helmet
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(420, this.ctx.currentTime);

    this.plssGain = this.ctx.createGain();
    this.plssGain.gain.setValueAtTime(SETTINGS.audio.suitAirflowVolume, this.ctx.currentTime);

    this.plssNoiseNode.connect(filter);
    filter.connect(this.plssGain);
    this.plssGain.connect(this.masterGain);

    this.plssNoiseNode.start();
  }

  /**
   * Continuous dual-oscillator electric motor sound for Apollo LRV harmonic drives
   */
  private setupRoverMotor(): void {
    if (!this.ctx || !this.masterGain) return;

    this.roverGain = this.ctx.createGain();
    this.roverGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.roverMotorOsc1 = this.ctx.createOscillator();
    this.roverMotorOsc1.type = 'sawtooth';
    this.roverMotorOsc1.frequency.setValueAtTime(220, this.ctx.currentTime);

    this.roverMotorOsc2 = this.ctx.createOscillator();
    this.roverMotorOsc2.type = 'triangle';
    this.roverMotorOsc2.frequency.setValueAtTime(440, this.ctx.currentTime);

    const motorFilter = this.ctx.createBiquadFilter();
    motorFilter.type = 'bandpass';
    motorFilter.frequency.setValueAtTime(600, this.ctx.currentTime);
    motorFilter.Q.setValueAtTime(2.5, this.ctx.currentTime);

    this.roverMotorOsc1.connect(motorFilter);
    this.roverMotorOsc2.connect(motorFilter);
    motorFilter.connect(this.roverGain);
    this.roverGain.connect(this.masterGain);

    this.roverMotorOsc1.start();
    this.roverMotorOsc2.start();
  }

  /**
   * Updates rover electric motor pitch and volume based on speed (0 to 1)
   */
  public updateRoverAudio(speedNorm: number, isDriving: boolean): void {
    if (!this.ctx || !this.roverGain || !this.roverMotorOsc1 || !this.roverMotorOsc2) return;

    if (!isDriving || speedNorm < 0.02) {
      this.roverGain.gain.setTargetAtTime(0.001, this.ctx.currentTime, 0.1);
      return;
    }

    const targetGain = Math.min(SETTINGS.audio.roverVolume, 0.15 + speedNorm * 0.45);
    this.roverGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.08);

    // Rover electric motors whine up to ~1400Hz at max speed
    const baseFreq = 220 + speedNorm * 900;
    this.roverMotorOsc1.frequency.setTargetAtTime(baseFreq, this.ctx.currentTime, 0.05);
    this.roverMotorOsc2.frequency.setTargetAtTime(baseFreq * 2.1, this.ctx.currentTime, 0.05);
  }

  /**
   * Synthesizes boot crunch sound physically transmitted through spacesuit
   */
  public playFootstep(): void {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;

    // 1. Low sub-bass thud (transferred through bones / suit frame)
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.14);

    oscGain.gain.setValueAtTime(SETTINGS.audio.footstepVolume * 0.6, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.15);

    // 2. Porous regolith soil crunch (bandpassed noise)
    const node = this.ctx.createBufferSource();
    const buffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.12), this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    node.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(650, t);
    filter.Q.setValueAtTime(3.0, t);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(SETTINGS.audio.footstepVolume * 0.35, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    node.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    node.start(t);
    node.stop(t + 0.13);
  }

  /**
   * NASA Apollo Quindar Tone (Classic 2525 Hz / 2475 Hz radio squelch burst)
   */
  public playQuindarTone(isIntro: boolean = true): void {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    // Intro Quindar: 2525 Hz, Outro: 2475 Hz
    osc.frequency.setValueAtTime(isIntro ? 2525 : 2475, t);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.12, t + 0.015);
    gain.gain.setValueAtTime(0.12, t + 0.22);
    gain.gain.linearRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.26);
  }

  /**
   * Mechanical suit toggle click (for headlight or visor toggle)
   */
  public playClick(): void {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.03);

    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.04);
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        muted ? 0 : SETTINGS.audio.masterVolume,
        this.ctx.currentTime,
        0.05
      );
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }
}
