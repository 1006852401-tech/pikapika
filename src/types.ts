export type MeterMode = 'PEAK' | 'RMS' | 'TRUE_PEAK' | 'VU_HYBRID';

export type ChannelMode = 'STEREO_LINKED' | 'DUAL_BEAM' | 'LEFT_ONLY' | 'RIGHT_ONLY';

export type BeamTheme = 'CLASSIC_CYAN' | 'SUPER_GOLD' | 'CRIMSON_FLAME' | 'EMERALD_HERO' | 'NEON_CYBER';

export type AudioSourceType = 'MIC' | 'SYNTH_TRACK' | 'SINE_1KHZ' | 'PINK_NOISE' | 'CUSTOM_FILE';

export interface MeterReading {
  leftPeakDb: number;
  rightPeakDb: number;
  leftRmsDb: number;
  rightRmsDb: number;
  leftPeakHoldDb: number;
  rightPeakHoldDb: number;
  isClippingLeft: boolean;
  isClippingRight: boolean;
  lufs: number;
  dynamicRangeDb: number;
}

export interface PluginSettings {
  inputGainDb: number; // -24 to +24 dB
  meterMode: MeterMode;
  channelMode: ChannelMode;
  beamTheme: BeamTheme;
  ballisticsSpeed: 'FAST' | 'NORMAL' | 'SLOW' | 'VU';
  peakHoldDurationMs: number; // 1000, 2000, 3000, or 0 (infinite)
  soundFxEnabled: boolean;
  shakeOnClip: boolean;
  beamParticlesEnabled: boolean;
  bypassed: boolean;
}

export interface Preset {
  id: string;
  name: string;
  category: string;
  settings: Partial<PluginSettings>;
}
