import React, { useRef } from 'react';
import { Mic, Music, Volume2, VolumeX, Upload, Play, Square, Radio, Activity } from 'lucide-react';
import { AudioSourceType, PluginSettings } from '../types';

interface AudioSourceBarProps {
  currentSource: AudioSourceType;
  onSelectSource: (source: AudioSourceType) => void;
  onFileUpload: (file: File) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  volume: number;
  onChangeVolume: (vol: number) => void;
  settings: PluginSettings;
  onUpdateSettings: (newSettings: Partial<PluginSettings>) => void;
}

export const AudioSourceBar: React.FC<AudioSourceBarProps> = ({
  currentSource,
  onSelectSource,
  onFileUpload,
  isMuted,
  onToggleMute,
  volume,
  onChangeVolume,
  settings,
  onUpdateSettings,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0]);
    }
  };

  return (
    <div className="bg-neutral-900 border-t border-neutral-800 px-4 py-3 select-none">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Audio Input Source Selector */}
        <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
          <span className="text-[11px] font-mono text-neutral-400 mr-1.5 flex items-center">
            <Radio className="w-3.5 h-3.5 text-cyan-400 mr-1" />
            AUDIO SOURCE:
          </span>

          {/* Synth Hero BGM */}
          <button
            type="button"
            onClick={() => onSelectSource('SYNTH_TRACK')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-medium border transition ${
              currentSource === 'SYNTH_TRACK'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm shadow-cyan-500/20'
                : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-neutral-200'
            }`}
          >
            <Music className="w-3.5 h-3.5 text-cyan-400" />
            <span>动感英雄配乐 (Synth BGM)</span>
          </button>

          {/* Live Mic Input */}
          <button
            type="button"
            onClick={() => onSelectSource('MIC')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-medium border transition ${
              currentSource === 'MIC'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm shadow-emerald-500/20'
                : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-neutral-200'
            }`}
          >
            <Mic className="w-3.5 h-3.5 text-emerald-400" />
            <span>实时麦克风 (Live Mic)</span>
          </button>

          {/* 1kHz Sine Reference */}
          <button
            type="button"
            onClick={() => onSelectSource('SINE_1KHZ')}
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded text-xs font-medium border transition ${
              currentSource === 'SINE_1KHZ'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-500/20'
                : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-neutral-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span>1kHz 校准正弦波 (-18dB)</span>
          </button>

          {/* Pink Noise */}
          <button
            type="button"
            onClick={() => onSelectSource('PINK_NOISE')}
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded text-xs font-medium border transition ${
              currentSource === 'PINK_NOISE'
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-sm shadow-purple-500/20'
                : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-neutral-200'
            }`}
          >
            <span>粉红噪声 (Pink Noise)</span>
          </button>

          {/* Upload Custom Audio File */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded text-xs font-medium border transition ${
              currentSource === 'CUSTOM_FILE'
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 shadow-sm'
                : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-neutral-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5 text-sky-400" />
            <span>导入音频文件...</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Output Audition & Channel Mode */}
        <div className="flex items-center space-x-4">
          {/* Channel Mode Toggle */}
          <div className="flex items-center space-x-1.5 bg-neutral-950 border border-neutral-800 rounded p-1">
            <span className="text-[10px] font-mono text-neutral-400 px-1">CH:</span>
            <button
              type="button"
              onClick={() => onUpdateSettings({ channelMode: 'STEREO_LINKED' })}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition ${
                settings.channelMode === 'STEREO_LINKED'
                  ? 'bg-cyan-600 text-white font-bold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Master单波
            </button>
            <button
              type="button"
              onClick={() => onUpdateSettings({ channelMode: 'DUAL_BEAM' })}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition ${
                settings.channelMode === 'DUAL_BEAM'
                  ? 'bg-cyan-600 text-white font-bold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              L/R双光束波
            </button>
          </div>

          {/* Monitor Volume & Mute */}
          <div className="flex items-center space-x-2 bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1">
            <button
              type="button"
              onClick={onToggleMute}
              className="text-neutral-400 hover:text-neutral-200 transition"
              title={isMuted ? '取消静音 (Unmute)' : '静音监听 (Mute Preview)'}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-red-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-neutral-300" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => onChangeVolume(parseFloat(e.target.value))}
              className="w-16 accent-cyan-400 h-1.5 cursor-pointer"
              title="Audition Volume"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
