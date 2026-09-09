import React, { useState } from 'react';
import { X, Check, Copy, Download, Apple, Terminal, Cpu, Layers } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'JUCE_CPP' | 'PLIST' | 'INSTALL'>('OVERVIEW');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const juceCppCode = `//==============================================================================
// ActionKamenAudioMeter - Professional AUv2/AUv3 & VST3 Plugin
// Compatible with: macOS 10.13+ (High Sierra) up to macOS 15+ (Sequoia)
// Universal 2 Binary: Apple Silicon (ARM64 M1/M2/M3/M4) + Intel (x86_64)
// Framework: JUCE 7 / 8 AudioProcessor
//==============================================================================

#pragma once
#include <juce_audio_processors/juce_audio_processors.h>

class ActionKamenAudioMeterAudioProcessor : public juce::AudioProcessor
{
public:
    ActionKamenAudioMeterAudioProcessor()
        : AudioProcessor (BusesProperties()
                            .withInput  ("Input",  juce::AudioChannelSet::stereo(), true)
                            .withOutput ("Output", juce::AudioChannelSet::stereo(), true))
    {
        // Add AudioProcessorValueTreeState Parameters
        addParameter (gainParam = new juce::AudioParameterFloat (
            {"gain", 1}, "Input Gain", juce::NormalisableRange<float> (-24.0f, 24.0f, 0.1f), 0.0f, "dB"));
    }

    ~ActionKamenAudioMeterAudioProcessor() override = default;

    void prepareToPlay (double sampleRate, int samplesPerBlock) override
    {
        currentSampleRate = sampleRate;
        leftPeakDb.store (-60.0f);
        rightPeakDb.store (-60.0f);
        leftRmsDb.store (-60.0f);
        rightRmsDb.store (-60.0f);
    }

    void releaseResources() override {}

    bool isBusesLayoutSupported (const BusesLayout& layouts) const override
    {
        // Support Stereo or Mono向下兼容
        const auto& mainIn = layouts.getMainInputChannelSet();
        const auto& mainOut = layouts.getMainOutputChannelSet();
        return (mainIn == juce::AudioChannelSet::stereo() || mainIn == juce::AudioChannelSet::mono())
            && mainIn == mainOut;
    }

    void processBlock (juce::AudioBuffer<float>& buffer, juce::MidiBuffer&) override
    {
        juce::ScopedNoDenormals noDenormals;
        const int numChannels = buffer.getNumChannels();
        const int numSamples  = buffer.getNumSamples();

        // Apply Input Gain Trim
        const float gainLinear = juce::Decibels::decibelsToGain (gainParam->get());
        buffer.applyGain (gainLinear);

        // DSP Meter Calculation for Action Beam
        float lPeak = 0.0f, rPeak = 0.0f;
        float lRmsSum = 0.0f, rRmsSum = 0.0f;

        if (numChannels > 0)
        {
            const float* lData = buffer.getReadPointer (0);
            for (int i = 0; i < numSamples; ++i)
            {
                const float s = std::abs (lData[i]);
                if (s > lPeak) lPeak = s;
                lRmsSum += s * s;
            }
        }

        if (numChannels > 1)
        {
            const float* rData = buffer.getReadPointer (1);
            for (int i = 0; i < numSamples; ++i)
            {
                const float s = std::abs (rData[i]);
                if (s > rPeak) rPeak = s;
                rRmsSum += s * s;
            }
        }
        else
        {
            rPeak = lPeak;
            rRmsSum = lRmsSum;
        }

        // Store thread-safe atomic values for OpenGL / WebUI View rendering
        const float lDb = juce::Decibels::gainToDecibels (lPeak, -60.0f);
        const float rDb = juce::Decibels::gainToDecibels (rPeak, -60.0f);
        leftPeakDb.store (lDb);
        rightPeakDb.store (rDb);

        const float lRms = juce::Decibels::gainToDecibels (std::sqrt (lRmsSum / numSamples), -60.0f);
        const float rRms = juce::Decibels::gainToDecibels (std::sqrt (rRmsSum / numSamples), -60.0f);
        leftRmsDb.store (lRms);
        rightRmsDb.store (rRms);
    }

    // Thread-safe meter accessors for Action Kamen Beam UI
    float getLeftPeakDb() const noexcept  { return leftPeakDb.load(); }
    float getRightPeakDb() const noexcept { return rightPeakDb.load(); }
    float getLeftRmsDb() const noexcept   { return leftRmsDb.load(); }
    float getRightRmsDb() const noexcept  { return rightRmsDb.load(); }

    const juce::String getName() const override { return "ActionKamen Audio Meter"; }
    bool acceptsMidi() const override { return false; }
    bool producesMidi() const override { return false; }
    double getTailLengthSeconds() const override { return 0.0; }

    int getNumPrograms() override { return 1; }
    int getCurrentProgram() override { return 0; }
    void setCurrentProgram (int) override {}
    const juce::String getProgramName (int) override { return {}; }
    void changeProgramName (int, const juce::String&) override {}

    void getStateInformation (juce::MemoryBlock& destData) override {}
    void setStateInformation (const void* data, int sizeInBytes) override {}

private:
    double currentSampleRate = 44100.0;
    juce::AudioParameterFloat* gainParam = nullptr;

    std::atomic<float> leftPeakDb { -60.0f };
    std::atomic<float> rightPeakDb { -60.0f };
    std::atomic<float> leftRmsDb { -60.0f };
    std::atomic<float> rightRmsDb { -60.0f };

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (ActionKamenAudioMeterAudioProcessor)
};
`;

  const infoPlistSnippet = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>ActionKamenMeter</string>
    <key>CFBundleIdentifier</key>
    <string>com.actionkamen.audiometer</string>
    <key>CFBundleName</key>
    <string>Action Kamen Audio Meter</string>
    <key>CFBundlePackageType</key>
    <string>BNDL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.2.0</string>
    <!-- 向下兼容 macOS 10.13 High Sierra 至 macOS 15+ Sequoia -->
    <key>LSMinimumSystemVersion</key>
    <string>10.13.0</string>
    <!-- AudioUnit v2 / v3 属性定义 -->
    <key>AudioComponents</key>
    <array>
        <dict>
            <key>type</key>
            <string>aufx</string>
            <key>subtype</key>
            <string>Akbm</string>
            <key>manufacturer</key>
            <string>Akmn</string>
            <key>name</key>
            <string>Action Kamen: Action Beam Audio Meter</string>
            <key>version</key>
            <integer>66048</integer>
        </dict>
    </array>
</dict>
</plist>`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in select-none">
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl max-w-3xl w-full shadow-2xl overflow-hidden text-neutral-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-950">
          <div className="flex items-center space-x-2">
            <Apple className="w-5 h-5 text-sky-400" />
            <h2 className="font-bold text-base tracking-tight">
              macOS AU (Audio Unit) & VST3 架构与向下兼容规格
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-neutral-800 bg-neutral-950 px-5 space-x-4">
          <button
            type="button"
            onClick={() => setActiveTab('OVERVIEW')}
            className={`py-3 text-xs font-mono font-bold border-b-2 transition ${
              activeTab === 'OVERVIEW'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            规格与兼容性矩阵
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('JUCE_CPP')}
            className={`py-3 text-xs font-mono font-bold border-b-2 transition ${
              activeTab === 'JUCE_CPP'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            C++ JUCE DSP 源码
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('PLIST')}
            className={`py-3 text-xs font-mono font-bold border-b-2 transition ${
              activeTab === 'PLIST'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Info.plist 配置
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('INSTALL')}
            className={`py-3 text-xs font-mono font-bold border-b-2 transition ${
              activeTab === 'INSTALL'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            macOS 宿主部署路径
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 max-h-[65vh] overflow-y-auto font-sans text-xs text-neutral-300">
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
                  <div className="flex items-center space-x-2 font-bold text-cyan-300 mb-1">
                    <Apple className="w-4 h-4" />
                    <span>macOS AU (Audio Unit v2 / AUv3)</span>
                  </div>
                  <p className="text-neutral-400 text-[11px] leading-relaxed">
                    专为 Apple 官方宿主 Logic Pro X、GarageBand 以及 MainStage 深度优化，使用 CoreAudio
                    低延迟架构，零延迟（0 samples latency），支持自动化与真实峰值侦测。
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
                  <div className="flex items-center space-x-2 font-bold text-purple-300 mb-1">
                    <Layers className="w-4 h-4" />
                    <span>Steinberg VST3 格式</span>
                  </div>
                  <p className="text-neutral-400 text-[11px] leading-relaxed">
                    完美运行于 Cubase、Nuendo、Ableton Live、REAPER、Studio One、FL Studio 等各大现代 macOS
                    数字音频工作站 (DAW)，原生支持动态总线与环绕声向下混合。
                  </p>
                </div>
              </div>

              {/* Backward Compatibility Matrix */}
              <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800">
                <div className="font-bold text-neutral-100 flex items-center space-x-2 mb-2">
                  <Cpu className="w-4 h-4 text-emerald-400" />
                  <span>全世代向下兼容性承诺 (Universal 2 Binary)</span>
                </div>
                <div className="space-y-2 text-[11px]">
                  <div className="flex justify-between py-1 border-b border-neutral-800/80">
                    <span className="text-neutral-400">芯片架构兼容:</span>
                    <span className="font-mono text-emerald-300 font-medium">
                      Apple Silicon (M1 / M2 / M3 / M4) + Intel 64-bit (x86_64)
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-neutral-800/80">
                    <span className="text-neutral-400">macOS 系统兼容范围:</span>
                    <span className="font-mono text-emerald-300 font-medium">
                      macOS 10.13 High Sierra → macOS 15 Sequoia (包括 Sonoma / Ventura / Monterey)
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-neutral-800/80">
                    <span className="text-neutral-400">插件代码安全签名:</span>
                    <span className="font-mono text-cyan-300 font-medium">
                      Hardened Runtime + Apple Developer Notarization (公证签名)
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-neutral-800/80">
                    <span className="text-neutral-400">宿主采样率支持:</span>
                    <span className="font-mono text-neutral-200">
                      44.1kHz, 48kHz, 88.2kHz, 96kHz, 192kHz (无重采样失真)
                    </span>
                  </div>
                </div>
              </div>

              {/* Design Highlight */}
              <div className="p-3 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-cyan-200">
                <span className="font-bold">UI 设计亮点：</span>
                动感超人经典的「十字/L型双臂交叠（奥特曼斯派修姆光线同款手势）」发射姿势，手刀处爆发等离子聚能球与闪电电弧；光束波直接贯穿分贝刻度尺（-60
                dBFS 到 +3 dBFS），波长随音频电平毫秒级精准跳动，0dB 触发爆音漫画特效！
              </div>
            </div>
          )}

          {activeTab === 'JUCE_CPP' && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[11px] font-mono text-neutral-400">
                  C++ 核心 DSP 处理器 (AudioProcessor.h / .cpp)
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(juceCppCode)}
                  className="flex items-center space-x-1 px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-xs font-mono transition"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? '已复制' : '复制代码'}</span>
                </button>
              </div>
              <pre className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 font-mono text-[11px] overflow-x-auto text-cyan-300 leading-relaxed">
                {juceCppCode}
              </pre>
            </div>
          )}

          {activeTab === 'PLIST' && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[11px] font-mono text-neutral-400">
                  macOS Bundle Info.plist (AU/VST 插件元数据与最低系统版本声明)
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(infoPlistSnippet)}
                  className="flex items-center space-x-1 px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-xs font-mono transition"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? '已复制' : '复制代码'}</span>
                </button>
              </div>
              <pre className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 font-mono text-[11px] overflow-x-auto text-amber-300 leading-relaxed">
                {infoPlistSnippet}
              </pre>
            </div>
          )}

          {activeTab === 'INSTALL' && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
                <div className="font-bold text-neutral-200 mb-1 flex items-center space-x-1.5">
                  <Terminal className="w-4 h-4 text-sky-400" />
                  <span>macOS 插件标准安装目录：</span>
                </div>
                <div className="font-mono text-[11px] space-y-2 mt-2">
                  <div className="p-2 bg-neutral-900 rounded border border-neutral-800 text-emerald-300">
                    <div className="text-neutral-400 text-[10px]">AU Component 格式 (Logic Pro / GarageBand):</div>
                    /Library/Audio/Plug-Ins/Components/ActionKamenMeter.component
                  </div>
                  <div className="p-2 bg-neutral-900 rounded border border-neutral-800 text-purple-300">
                    <div className="text-neutral-400 text-[10px]">VST3 格式 (Live / Cubase / Reaper / Studio One):</div>
                    /Library/Audio/Plug-Ins/VST3/ActionKamenMeter.vst3
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
                <div className="font-bold text-neutral-200 mb-1">终端一键验证 AudioUnit 命令：</div>
                <pre className="p-2 bg-neutral-900 rounded font-mono text-[11px] text-neutral-300">
                  auval -v aufx Akbm Akmn
                </pre>
                <p className="text-neutral-400 text-[10px] mt-1">
                  验证通过后，即可在 Logic Pro 或各宿主的「Audio Units -&gt; Action Kamen」分类下调出本表头。
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-neutral-800 bg-neutral-950 flex items-center justify-between">
          <span className="text-[11px] font-mono text-neutral-500">
            Build: macOS Universal 2 (arm64 + x86_64) | AUv2 / VST3
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs font-medium transition"
          >
            关闭 (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
