import { AudioSourceType, MeterReading, PluginSettings } from '../types';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private inputGainNode: GainNode | null = null;
  private masterOutputGain: GainNode | null = null;
  private splitter: ChannelSplitterNode | null = null;
  private analyserL: AnalyserNode | null = null;
  private analyserR: AnalyserNode | null = null;

  // Source nodes
  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private testOsc: OscillatorNode | null = null;
  private testNoiseNode: AudioBufferSourceNode | null = null;
  private fileBufferSource: AudioBufferSourceNode | null = null;
  private fileAudioBuffer: AudioBuffer | null = null;

  // Synth Hero BGM sequencer
  private isBgmPlaying = false;
  private bgmTimer: number | null = null;
  private bgmStep = 0;

  // Meter readings state
  private bufferL = new Float32Array(1024);
  private bufferR = new Float32Array(1024);

  private leftPeakHold = -60;
  private rightPeakHold = -60;
  private leftPeakHoldTimer = 0;
  private rightPeakHoldTimer = 0;

  private smoothedLeftPeak = -60;
  private smoothedRightPeak = -60;
  private smoothedLeftRms = -60;
  private smoothedRightRms = -60;

  private currentSource: AudioSourceType = 'SYNTH_TRACK';
  private isMuted = false;

  public init() {
    if (this.ctx) return;
    const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioCtxClass();

    this.inputGainNode = this.ctx.createGain();
    this.masterOutputGain = this.ctx.createGain();
    this.splitter = this.ctx.createChannelSplitter(2);

    this.analyserL = this.ctx.createAnalyser();
    this.analyserR = this.ctx.createAnalyser();

    this.analyserL.fftSize = 2048;
    this.analyserR.fftSize = 2048;
    this.analyserL.smoothingTimeConstant = 0;
    this.analyserR.smoothingTimeConstant = 0;

    // Connect routing:
    // Source -> InputGain -> Splitter -> Analysers (for meter reading)
    // Source -> InputGain -> MasterOutput -> Destination (for hearing the audio)
    this.inputGainNode.connect(this.splitter);
    this.splitter.connect(this.analyserL, 0);
    this.splitter.connect(this.analyserR, 1);

    this.inputGainNode.connect(this.masterOutputGain);
    this.masterOutputGain.connect(this.ctx.destination);
    this.masterOutputGain.gain.value = 0.8; // default comfortable listening volume
  }

  public async resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  public setInputGain(db: number) {
    if (this.inputGainNode && this.ctx) {
      const linear = Math.pow(10, db / 20);
      this.inputGainNode.gain.setTargetAtTime(linear, this.ctx.currentTime, 0.03);
    }
  }

  public setMasterVolume(vol: number) {
    if (this.masterOutputGain && this.ctx) {
      this.masterOutputGain.gain.setTargetAtTime(this.isMuted ? 0 : vol, this.ctx.currentTime, 0.03);
    }
  }

  public toggleMute(mute: boolean) {
    this.isMuted = mute;
    if (this.masterOutputGain && this.ctx) {
      this.masterOutputGain.gain.setTargetAtTime(mute ? 0 : 0.8, this.ctx.currentTime, 0.02);
    }
  }

  public stopAllSources() {
    // Stop Mic
    if (this.micStream) {
      this.micStream.getTracks().forEach(t => t.stop());
      this.micStream = null;
    }
    if (this.micSource) {
      this.micSource.disconnect();
      this.micSource = null;
    }

    // Stop Test Osc
    if (this.testOsc) {
      try { this.testOsc.stop(); } catch { /* ignore */ }
      this.testOsc.disconnect();
      this.testOsc = null;
    }

    // Stop Pink Noise
    if (this.testNoiseNode) {
      try { this.testNoiseNode.stop(); } catch { /* ignore */ }
      this.testNoiseNode.disconnect();
      this.testNoiseNode = null;
    }

    // Stop File
    if (this.fileBufferSource) {
      try { this.fileBufferSource.stop(); } catch { /* ignore */ }
      this.fileBufferSource.disconnect();
      this.fileBufferSource = null;
    }

    // Stop BGM
    this.stopHeroBgm();
  }

  public async setAudioSource(source: AudioSourceType): Promise<boolean> {
    this.init();
    await this.resume();
    this.stopAllSources();
    this.currentSource = source;

    if (!this.ctx || !this.inputGainNode) return false;

    if (source === 'MIC') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            autoGainControl: false,
            noiseSuppression: false,
          }
        });
        this.micStream = stream;
        this.micSource = this.ctx.createMediaStreamSource(stream);
        // Do NOT feed mic directly to destination to prevent feedback howling, feed only to inputGain for metering!
        this.micSource.connect(this.inputGainNode);
        return true;
      } catch (err) {
        console.error('Failed to access microphone:', err);
        return false;
      }
    } else if (source === 'SYNTH_TRACK') {
      this.startHeroBgm();
      return true;
    } else if (source === 'SINE_1KHZ') {
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      // -18 dBFS reference level
      oscGain.gain.value = Math.pow(10, -18 / 20);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1000, this.ctx.currentTime);
      osc.connect(oscGain);
      oscGain.connect(this.inputGainNode);
      osc.start();
      this.testOsc = osc;
      return true;
    } else if (source === 'PINK_NOISE') {
      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(2, bufferSize, this.ctx.sampleRate);
      for (let channel = 0; channel < 2; channel++) {
        const data = buffer.getChannelData(channel);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08;
          b6 = white * 0.115926;
        }
      }
      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = buffer;
      noiseSource.loop = true;
      noiseSource.connect(this.inputGainNode);
      noiseSource.start();
      this.testNoiseNode = noiseSource;
      return true;
    } else if (source === 'CUSTOM_FILE' && this.fileAudioBuffer) {
      this.playCustomBuffer();
      return true;
    }

    return true;
  }

  public async loadAudioFile(file: File): Promise<boolean> {
    this.init();
    await this.resume();
    try {
      const arrayBuffer = await file.arrayBuffer();
      if (!this.ctx) return false;
      const decodedBuffer = await this.ctx.decodeAudioData(arrayBuffer);
      this.fileAudioBuffer = decodedBuffer;
      this.currentSource = 'CUSTOM_FILE';
      this.stopAllSources();
      this.playCustomBuffer();
      return true;
    } catch (err) {
      console.error('Error decoding audio file:', err);
      return false;
    }
  }

  private playCustomBuffer() {
    if (!this.ctx || !this.fileAudioBuffer || !this.inputGainNode) return;
    this.fileBufferSource = this.ctx.createBufferSource();
    this.fileBufferSource.buffer = this.fileAudioBuffer;
    this.fileBufferSource.loop = true;
    this.fileBufferSource.connect(this.inputGainNode);
    this.fileBufferSource.start();
  }

  // Heroic Synth BGM Generator (Action Kamen Theme Style!)
  // Generates upbeat retro synthesizer beats, kick/snare and brass synth arpeggio
  private startHeroBgm() {
    if (this.isBgmPlaying) return;
    this.isBgmPlaying = true;
    this.bgmStep = 0;

    const tempo = 136;
    const stepDuration = 60 / tempo / 4; // 16th note

    const chordProgression = [
      [261.63, 329.63, 392.00], // C
      [220.00, 261.63, 329.63], // Am
      [174.61, 220.00, 261.63], // F
      [196.00, 246.94, 293.66], // G
    ];

    const bassLine = [
      65.41, 65.41, 130.81, 65.41,
      55.00, 55.00, 110.00, 55.00,
      43.65, 43.65, 87.31, 43.65,
      49.00, 49.00, 98.00, 49.00
    ];

    const playStep = () => {
      if (!this.isBgmPlaying || !this.ctx || !this.inputGainNode) return;
      const t = this.ctx.currentTime;
      const step16 = this.bgmStep % 16;
      const bar = Math.floor((this.bgmStep / 16) % 4);

      // Kick Drum on beats 0, 4, 8, 12
      if (step16 % 4 === 0) {
        const kickOsc = this.ctx.createOscillator();
        const kickGain = this.ctx.createGain();
        kickOsc.frequency.setValueAtTime(140, t);
        kickOsc.frequency.exponentialRampToValueAtTime(32, t + 0.12);
        kickGain.gain.setValueAtTime(0.7, t);
        kickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
        kickOsc.connect(kickGain);
        kickGain.connect(this.inputGainNode);
        kickOsc.start(t);
        kickOsc.stop(t + 0.15);
      }

      // Snare Drum on beats 4, 12
      if (step16 === 4 || step16 === 12) {
        // Noise snare
        const bufferSize = this.ctx.sampleRate * 0.1;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.03));
        }
        const snareSource = this.ctx.createBufferSource();
        snareSource.buffer = buffer;
        const snareGain = this.ctx.createGain();
        snareGain.gain.value = 0.45;
        snareSource.connect(snareGain);
        snareGain.connect(this.inputGainNode);
        snareSource.start(t);
        snareSource.stop(t + 0.1);
      }

      // Hi-hat on every off-beat 16th
      if (step16 % 2 === 1) {
        const bufferSize = this.ctx.sampleRate * 0.03;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.008));
        }
        const hatSource = this.ctx.createBufferSource();
        hatSource.buffer = buffer;
        const hatGain = this.ctx.createGain();
        hatGain.gain.value = step16 % 4 === 2 ? 0.25 : 0.15;
        hatSource.connect(hatGain);
        hatGain.connect(this.inputGainNode);
        hatSource.start(t);
        hatSource.stop(t + 0.03);
      }

      // Bass synth
      const bassFreq = bassLine[step16];
      if (bassFreq) {
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bassOsc.type = 'sawtooth';
        bassOsc.frequency.setValueAtTime(bassFreq, t);
        bassGain.gain.setValueAtTime(0.35, t);
        bassGain.gain.exponentialRampToValueAtTime(0.01, t + stepDuration * 0.9);
        bassOsc.connect(bassGain);
        bassGain.connect(this.inputGainNode);
        bassOsc.start(t);
        bassOsc.stop(t + stepDuration);
      }

      // Heroic Synth Brass chord stabs on beat 0, 3, 6, 10
      if ([0, 3, 6, 10].includes(step16)) {
        const chord = chordProgression[bar];
        chord.forEach((freq, idx) => {
          if (!this.ctx || !this.inputGainNode) return;
          const chordOsc = this.ctx.createOscillator();
          const chordGain = this.ctx.createGain();
          chordOsc.type = 'sawtooth';
          chordOsc.frequency.setValueAtTime(freq * (idx === 2 ? 2 : 1), t);
          chordGain.gain.setValueAtTime(0.18, t);
          chordGain.gain.exponentialRampToValueAtTime(0.005, t + stepDuration * 2);
          chordOsc.connect(chordGain);
          chordGain.connect(this.inputGainNode);
          chordOsc.start(t);
          chordOsc.stop(t + stepDuration * 2);
        });
      }

      this.bgmStep++;
    };

    this.bgmTimer = window.setInterval(playStep, stepDuration * 1000);
  }

  private stopHeroBgm() {
    this.isBgmPlaying = false;
    if (this.bgmTimer !== null) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  // Play Action Kamen Beam Sound Effect ("ZAAAP-BOOOM!")
  public playBeamSound(intensity = 1.0) {
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      // Laser zap oscillator
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1400 * intensity, t);
      osc.frequency.exponentialRampToValueAtTime(180, t + 0.35);

      gain.gain.setValueAtTime(0.3 * Math.min(intensity, 1.2), t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.42);
    } catch {
      // Audio context might be restricted
    }
  }

  // Play Pikachu Battle Cry & Thunderbolt Sound Effect ("PIKA-PIKA... CHUUUU! ⚡")
  public playHeroLaugh() {
    this.playPikachuCry();
  }

  public playPikachuCry() {
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;

      // 1. "Pi-" (High cute chirp)
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(680, t);
      osc1.frequency.exponentialRampToValueAtTime(860, t + 0.08);
      gain1.gain.setValueAtTime(0.22, t);
      gain1.gain.exponentialRampToValueAtTime(0.01, t + 0.09);
      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(t);
      osc1.stop(t + 0.1);

      // 2. "-ka-" (Playful second syllable)
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(740, t + 0.12);
      osc2.frequency.exponentialRampToValueAtTime(1020, t + 0.22);
      gain2.gain.setValueAtTime(0.24, t + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.01, t + 0.24);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(t + 0.12);
      osc2.stop(t + 0.25);

      // 3. "...CHUUUUUU! ⚡" (Powerful electric discharge cry)
      const osc3 = this.ctx.createOscillator();
      const gain3 = this.ctx.createGain();
      osc3.type = 'sawtooth';
      osc3.frequency.setValueAtTime(1280, t + 0.28);
      osc3.frequency.linearRampToValueAtTime(920, t + 0.65);
      gain3.gain.setValueAtTime(0.28, t + 0.28);
      gain3.gain.exponentialRampToValueAtTime(0.005, t + 0.68);
      osc3.connect(gain3);
      gain3.connect(this.ctx.destination);
      osc3.start(t + 0.28);
      osc3.stop(t + 0.7);

      // 4. Crackling High-Voltage Electric Arc Noise (Thunderbolt Zap)
      const bufferSize = this.ctx.sampleRate * 0.45;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * (Math.random() > 0.4 ? 1 : 0);
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2800, t + 0.3);
      filter.Q.setValueAtTime(4.0, t + 0.3);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.18, t + 0.3);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.72);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);

      noise.start(t + 0.3);
      noise.stop(t + 0.73);
    } catch {
      // Audio context might be restricted
    }
  }

  // Get real-time audio readings
  public getMeterReading(settings: PluginSettings): MeterReading {
    if (settings.bypassed || !this.analyserL || !this.analyserR) {
      return {
        leftPeakDb: -60,
        rightPeakDb: -60,
        leftRmsDb: -60,
        rightRmsDb: -60,
        leftPeakHoldDb: -60,
        rightPeakHoldDb: -60,
        isClippingLeft: false,
        isClippingRight: false,
        lufs: -60,
        dynamicRangeDb: 0,
      };
    }

    this.analyserL.getFloatTimeDomainData(this.bufferL);
    this.analyserR.getFloatTimeDomainData(this.bufferR);

    // Compute raw Peak & RMS for left & right
    let leftPeak = 0;
    let rightPeak = 0;
    let leftSumSq = 0;
    let rightSumSq = 0;
    const len = this.bufferL.length;

    for (let i = 0; i < len; i++) {
      const sL = Math.abs(this.bufferL[i]);
      const sR = Math.abs(this.bufferR[i]);
      if (sL > leftPeak) leftPeak = sL;
      if (sR > rightPeak) rightPeak = sR;
      leftSumSq += sL * sL;
      rightSumSq += sR * sR;
    }

    const leftRms = Math.sqrt(leftSumSq / len);
    const rightRms = Math.sqrt(rightSumSq / len);

    const minDb = -60;
    const toDb = (val: number) => (val > 0.0001 ? Math.max(minDb, 20 * Math.log10(val)) : minDb);

    const rawLeftPeakDb = toDb(leftPeak);
    const rawRightPeakDb = toDb(rightPeak);
    const rawLeftRmsDb = toDb(leftRms);
    const rawRightRmsDb = toDb(rightRms);

    // Ballistics response coefficients
    let attackCoeff = 0.8;
    let releaseCoeff = 0.15;
    if (settings.ballisticsSpeed === 'FAST') {
      attackCoeff = 0.95;
      releaseCoeff = 0.25;
    } else if (settings.ballisticsSpeed === 'SLOW') {
      attackCoeff = 0.5;
      releaseCoeff = 0.05;
    } else if (settings.ballisticsSpeed === 'VU') {
      attackCoeff = 0.3;
      releaseCoeff = 0.08;
    }

    // Smooth peak
    this.smoothedLeftPeak = rawLeftPeakDb > this.smoothedLeftPeak
      ? this.smoothedLeftPeak + (rawLeftPeakDb - this.smoothedLeftPeak) * attackCoeff
      : this.smoothedLeftPeak + (rawLeftPeakDb - this.smoothedLeftPeak) * releaseCoeff;

    this.smoothedRightPeak = rawRightPeakDb > this.smoothedRightPeak
      ? this.smoothedRightPeak + (rawRightPeakDb - this.smoothedRightPeak) * attackCoeff
      : this.smoothedRightPeak + (rawRightPeakDb - this.smoothedRightPeak) * releaseCoeff;

    // Smooth RMS
    this.smoothedLeftRms = rawLeftRmsDb > this.smoothedLeftRms
      ? this.smoothedLeftRms + (rawLeftRmsDb - this.smoothedLeftRms) * 0.4
      : this.smoothedLeftRms + (rawLeftRmsDb - this.smoothedLeftRms) * 0.1;

    this.smoothedRightRms = rawRightRmsDb > this.smoothedRightRms
      ? this.smoothedRightRms + (rawRightRmsDb - this.smoothedRightRms) * 0.4
      : this.smoothedRightRms + (rawRightRmsDb - this.smoothedRightRms) * 0.1;

    // Peak Hold computation
    const now = performance.now();
    if (this.smoothedLeftPeak >= this.leftPeakHold) {
      this.leftPeakHold = this.smoothedLeftPeak;
      this.leftPeakHoldTimer = now;
    } else if (settings.peakHoldDurationMs > 0 && now - this.leftPeakHoldTimer > settings.peakHoldDurationMs) {
      this.leftPeakHold = Math.max(minDb, this.leftPeakHold - 1.5);
    }

    if (this.smoothedRightPeak >= this.rightPeakHold) {
      this.rightPeakHold = this.smoothedRightPeak;
      this.rightPeakHoldTimer = now;
    } else if (settings.peakHoldDurationMs > 0 && now - this.rightPeakHoldTimer > settings.peakHoldDurationMs) {
      this.rightPeakHold = Math.max(minDb, this.rightPeakHold - 1.5);
    }

    const isClippingLeft = this.smoothedLeftPeak >= -0.05;
    const isClippingRight = this.smoothedRightPeak >= -0.05;

    // Approximate momentary LUFS (K-weighting approximation)
    const avgRms = (this.smoothedLeftRms + this.smoothedRightRms) / 2;
    const approxLufs = Math.max(minDb, avgRms - 0.691);
    const dynamicRange = Math.max(0, Math.max(this.smoothedLeftPeak, this.smoothedRightPeak) - avgRms);

    return {
      leftPeakDb: this.smoothedLeftPeak,
      rightPeakDb: this.smoothedRightPeak,
      leftRmsDb: this.smoothedLeftRms,
      rightRmsDb: this.smoothedRightRms,
      leftPeakHoldDb: this.leftPeakHold,
      rightPeakHoldDb: this.rightPeakHold,
      isClippingLeft,
      isClippingRight,
      lufs: approxLufs,
      dynamicRangeDb: dynamicRange,
    };
  }

  public resetPeakHold() {
    this.leftPeakHold = -60;
    this.rightPeakHold = -60;
  }
}

export const audioEngine = new AudioEngine();
