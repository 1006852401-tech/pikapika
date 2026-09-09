import React from 'react';
import { Power, Sliders, Code2, Sparkles, Zap } from 'lucide-react';
import { BeamTheme, ChannelMode, MeterMode, PluginSettings, Preset } from '../types';

interface PluginHeaderProps {
  settings: PluginSettings;
  onUpdateSettings: (newSettings: Partial<PluginSettings>) => void;
  onOpenExportModal: () => void;
  onOpenSettingsModal: () => void;
  onTriggerLaugh: () => void;
}

export const PRESETS: Preset[] = [
  {
    id: 'mastering_default',
    name: '01. 100,000V Master (十万伏特·金黄雷电)',
    category: 'Mastering',
    settings: {
      inputGainDb: 0,
      meterMode: 'PEAK',
      channelMode: 'STEREO_LINKED',
      beamTheme: 'SUPER_GOLD',
      ballisticsSpeed: 'NORMAL',
      peakHoldDurationMs: 2000,
    },
  },
  {
    id: 'dual_stereo_hero',
    name: '02. Dual Stereo Lightning (双声道雷电弧)',
    category: 'Stereo Analysis',
    settings: {
      inputGainDb: 0,
      meterMode: 'PEAK',
      channelMode: 'DUAL_BEAM',
      beamTheme: 'SUPER_GOLD',
      ballisticsSpeed: 'FAST',
      peakHoldDurationMs: 3000,
    },
  },
  {
    id: 'broadcast_lufs',
    name: '03. Broadcast & Streaming (-14 LUFS)',
    category: 'Broadcast',
    settings: {
      inputGainDb: 0,
      meterMode: 'RMS',
      channelMode: 'STEREO_LINKED',
      beamTheme: 'EMERALD_HERO',
      ballisticsSpeed: 'VU',
      peakHoldDurationMs: 0, // infinite hold
    },
  },
  {
    id: 'overload_rock',
    name: '04. Mega Volt Overdrive (百万伏特极限过载)',
    category: 'Aggressive',
    settings: {
      inputGainDb: 4.0,
      meterMode: 'PEAK',
      channelMode: 'DUAL_BEAM',
      beamTheme: 'CRIMSON_FLAME',
      ballisticsSpeed: 'FAST',
      peakHoldDurationMs: 1500,
      shakeOnClip: true,
    },
  },
  {
    id: 'cyber_synthwave',
    name: '05. Neon Cyber Electric (极光霓虹紫电)',
    category: 'Visualizer',
    settings: {
      inputGainDb: 1.5,
      meterMode: 'PEAK',
      channelMode: 'STEREO_LINKED',
      beamTheme: 'NEON_CYBER',
      ballisticsSpeed: 'NORMAL',
      peakHoldDurationMs: 2000,
    },
  },
];

export const PluginHeader: React.FC<PluginHeaderProps> = ({
  settings,
  onUpdateSettings,
  onOpenExportModal,
  onOpenSettingsModal,
  onTriggerLaugh,
}) => {
  const handlePresetSelect = (presetId: string) => {
    const p = PRESETS.find((item) => item.id === presetId);
    if (p && p.settings) {
      onUpdateSettings(p.settings);
    }
  };

  return (
    <header className="bg-neutral-900 border-b border-neutral-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 select-none">
      {/* macOS Window Titlebar Traffic Lights & Title */}
      <div className="flex items-center space-x-3">
        {/* macOS Traffic Lights */}
        <div className="flex items-center space-x-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/90 hover:opacity-80 transition cursor-pointer" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/90 hover:opacity-80 transition cursor-pointer" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/90 hover:opacity-80 transition cursor-pointer" />
        </div>

        {/* Plugin Title & Architecture Badge */}
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-sm tracking-tight text-neutral-200">
            Pikachu Audio Meter
          </span>
          <div className="hidden sm:flex items-center space-x-1 text-[10px] font-mono">
            <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-amber-400 border border-amber-500/20">
              十万伏特 ⚡
            </span>
            <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-sky-400 border border-sky-500/20">
              macOS AUv2
            </span>
            <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-purple-400 border border-purple-500/20">
              VST3
            </span>
            <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
              Universal 2
            </span>
          </div>
        </div>
      </div>

      {/* Preset Selector & Quick Controls */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Preset Dropdown */}
        <div className="flex items-center space-x-1.5">
          <span className="text-[11px] font-mono text-neutral-400 hidden md:inline">PRESET:</span>
          <select
            className="bg-neutral-950 border border-neutral-700 text-neutral-200 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-amber-500"
            onChange={(e) => handlePresetSelect(e.target.value)}
            defaultValue="mastering_default"
          >
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Input Gain Knob/Slider */}
        <div className="flex items-center space-x-1.5 bg-neutral-950 border border-neutral-800 rounded px-2 py-1">
          <span className="text-[11px] font-mono text-neutral-400">GAIN:</span>
          <input
            type="range"
            min="-12"
            max="12"
            step="0.5"
            value={settings.inputGainDb}
            onChange={(e) => onUpdateSettings({ inputGainDb: parseFloat(e.target.value) })}
            className="w-16 sm:w-20 accent-amber-400 h-1.5 cursor-pointer"
            title="Input Trim (-12dB to +12dB)"
          />
          <span
            className="text-[11px] font-mono font-bold text-neutral-200 w-12 text-right cursor-pointer hover:text-amber-400"
            onClick={() => onUpdateSettings({ inputGainDb: 0 })}
            title="Click to reset to 0.0 dB"
          >
            {settings.inputGainDb > 0 ? `+${settings.inputGainDb.toFixed(1)}` : settings.inputGainDb.toFixed(1)} dB
          </span>
        </div>

        {/* Pikachu Thunderbolt Battle Cry Button */}
        <button
          type="button"
          onClick={onTriggerLaugh}
          className="flex items-center space-x-1 px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-medium transition active:scale-95 shadow-sm shadow-amber-500/10"
          title="Play Pikachu's battle cry / thunderbolt ('皮卡-皮卡... 丘~~~~~！⚡')"
        >
          <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span className="hidden lg:inline text-[11px]">十万伏特</span>
        </button>

        {/* AU/VST Native Code & Specs Button */}
        <button
          type="button"
          onClick={onOpenExportModal}
          className="flex items-center space-x-1 px-2.5 py-1 rounded bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-medium transition active:scale-95"
          title="macOS AU / VST3 plugin architecture & C++ JUCE source code"
        >
          <Code2 className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-[11px]">AU / VST 规格</span>
        </button>

        {/* Settings Button */}
        <button
          type="button"
          onClick={onOpenSettingsModal}
          className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 transition active:scale-95"
          title="Plugin Settings & Lightning Customization"
        >
          <Sliders className="w-3.5 h-3.5" />
        </button>

        {/* Bypass Button */}
        <button
          type="button"
          onClick={() => onUpdateSettings({ bypassed: !settings.bypassed })}
          className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-mono font-medium border transition ${
            settings.bypassed
              ? 'bg-amber-500 text-black border-amber-400 font-bold animate-pulse'
              : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-700'
          }`}
          title="Toggle Plugin Bypass"
        >
          <Power className="w-3 h-3" />
          <span>{settings.bypassed ? 'BYPASSED' : 'ACTIVE'}</span>
        </button>
      </div>
    </header>
  );
};

