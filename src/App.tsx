/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { PluginHeader } from './components/PluginHeader';
import { ActionKamenCanvas } from './components/ActionKamenCanvas';
import { MeterRuler } from './components/MeterRuler';
import { AudioSourceBar } from './components/AudioSourceBar';
import { SettingsModal } from './components/SettingsModal';
import { ExportModal } from './components/ExportModal';
import { audioEngine } from './utils/audioEngine';
import { AudioSourceType, MeterReading, PluginSettings } from './types';

const defaultSettings: PluginSettings = {
  inputGainDb: 0,
  meterMode: 'PEAK',
  channelMode: 'STEREO_LINKED',
  beamTheme: 'SUPER_GOLD',
  ballisticsSpeed: 'NORMAL',
  peakHoldDurationMs: 2000,
  soundFxEnabled: true,
  shakeOnClip: true,
  beamParticlesEnabled: true,
  bypassed: false,
};

export default function App() {
  const [settings, setSettings] = useState<PluginSettings>(defaultSettings);
  const [audioSource, setAudioSource] = useState<AudioSourceType>('SYNTH_TRACK');
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);

  const [reading, setReading] = useState<MeterReading>({
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
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Initialize audio engine on mount
  useEffect(() => {
    // Start with default synth BGM so user sees the beam in action immediately!
    audioEngine.setAudioSource('SYNTH_TRACK');
    audioEngine.setMasterVolume(0.8);

    let rafId: number;
    let isDawDriven = false;

    // Bridge for Native Host (AU/VST C++ WebView Bridge)
    // When embedded in Logic Pro, Ableton, FL Studio, DAW pushes audio levels directly
    (window as any).__onDawMeterUpdate = (lPeak: number, rPeak: number, lRms: number, rRms: number) => {
      isDawDriven = true;
      setReading((prev) => ({
        ...prev,
        leftPeakDb: lPeak,
        rightPeakDb: rPeak,
        leftRmsDb: lRms,
        rightRmsDb: rRms,
        isClippingLeft: lPeak >= -0.05,
        isClippingRight: rPeak >= -0.05,
      }));
    };

    const updateMeter = () => {
      if (!isDawDriven) {
        const current = audioEngine.getMeterReading(settingsRef.current);
        setReading(current);
      }
      rafId = requestAnimationFrame(updateMeter);
    };

    rafId = requestAnimationFrame(updateMeter);

    return () => {
      cancelAnimationFrame(rafId);
      audioEngine.stopAllSources();
      delete (window as any).__onDawMeterUpdate;
    };
  }, []);

  // Update input gain in audio engine when settings change
  useEffect(() => {
    audioEngine.setInputGain(settings.inputGainDb);
  }, [settings.inputGainDb]);

  const handleUpdateSettings = (newSettings: Partial<PluginSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const handleSelectAudioSource = async (source: AudioSourceType) => {
    setAudioSource(source);
    await audioEngine.setAudioSource(source);
  };

  const handleFileUpload = async (file: File) => {
    setAudioSource('CUSTOM_FILE');
    await audioEngine.loadAudioFile(file);
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    audioEngine.toggleMute(nextMuted);
  };

  const handleChangeVolume = (vol: number) => {
    setVolume(vol);
    audioEngine.setMasterVolume(vol);
  };

  const handleResetPeakHold = () => {
    audioEngine.resetPeakHold();
  };

  const handleTriggerLaugh = () => {
    audioEngine.playHeroLaugh();
    audioEngine.playBeamSound(1.3);
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-neutral-100 flex flex-col justify-between select-none">
      {/* DAW Plugin Host Frame Header */}
      <div className="w-full max-w-7xl mx-auto p-2 sm:p-4 flex-1 flex flex-col">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden flex flex-col flex-1">
          {/* Top Plugin Bar */}
          <PluginHeader
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onOpenExportModal={() => setIsExportOpen(true)}
            onOpenSettingsModal={() => setIsSettingsOpen(true)}
            onTriggerLaugh={handleTriggerLaugh}
          />

          {/* Main Visualizer Stage */}
          <div className="flex-1 p-3 sm:p-4 flex flex-col gap-3 min-h-[380px]">
            {/* Action Kamen Crossed-Arms Beam Canvas */}
            <div className="flex-1 min-h-[300px] w-full relative">
              <ActionKamenCanvas
                reading={reading}
                settings={settings}
                onResetPeakHold={handleResetPeakHold}
                onTriggerLaugh={handleTriggerLaugh}
              />
            </div>

            {/* Precision Decibel Ruler & HUD */}
            <div className="w-full">
              <MeterRuler
                reading={reading}
                settings={settings}
                onResetPeakHold={handleResetPeakHold}
              />
            </div>
          </div>

          {/* Bottom Audio Input & Audition Bar */}
          <AudioSourceBar
            currentSource={audioSource}
            onSelectSource={handleSelectAudioSource}
            onFileUpload={handleFileUpload}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            volume={volume}
            onChangeVolume={handleChangeVolume}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
          />
        </div>

        {/* Plugin Status Bar / Host Context Info */}
        <div className="mt-2.5 px-2 flex flex-wrap items-center justify-between text-[11px] font-mono text-neutral-500 gap-2">
          <div className="flex items-center space-x-3">
            <span>DAW HOST: macOS Universal (AUv2 / VST3)</span>
            <span>•</span>
            <span>DSP SAMPLE RATE: 48.0 kHz</span>
            <span>•</span>
            <span>LATENCY: 0 samples (Zero Latency)</span>
          </div>
          <div className="flex items-center space-x-3">
            <span>皮卡丘放电: 十万伏特双爪雷电姿态 (PIKACHU THUNDERBOLT)</span>
            <span>•</span>
            <span>COMPATIBILITY: macOS 10.13 ~ 15+ (M1/M2/M3/M4 & Intel)</span>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />

      {/* AU / VST Architecture & Code Export Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />
    </div>
  );
}
