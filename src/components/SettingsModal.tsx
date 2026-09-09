import React from 'react';
import { X, Sparkles, Zap, Shield, Sliders } from 'lucide-react';
import { BeamTheme, MeterMode, PluginSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: PluginSettings;
  onUpdateSettings: (newSettings: Partial<PluginSettings>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  const beamThemes: { id: BeamTheme; name: string; desc: string; color: string }[] = [
    {
      id: 'SUPER_GOLD',
      name: '皮卡丘·十万伏特金黄 (100,000V Gold)',
      desc: '皮卡丘标志性金黄雷电与白色炽热闪电芯，高亮刺目',
      color: 'bg-amber-400',
    },
    {
      id: 'CLASSIC_CYAN',
      name: '高压等离子苍蓝 (Plasma Blue Spark)',
      desc: '高频击穿电弧青蓝闪电，超清对比度瞬态显示',
      color: 'bg-cyan-500',
    },
    {
      id: 'CRIMSON_FLAME',
      name: '极限过载狂暴赤红 (Overdrive Crimson)',
      desc: '赤红暴烈雷暴闪电，极具冲击力的红热电浆',
      color: 'bg-red-500',
    },
    {
      id: 'EMERALD_HERO',
      name: '静电离子翠绿 (Emerald Electro)',
      desc: '电离静电翡翠流光，护眼且层次分明',
      color: 'bg-emerald-500',
    },
    {
      id: 'NEON_CYBER',
      name: '极光霓虹紫电 (Cyber Violet Lightning)',
      desc: '双相高压紫电与粉红电离气体，赛博合成器氛围',
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in select-none">
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl max-w-xl w-full shadow-2xl overflow-hidden text-neutral-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-950">
          <div className="flex items-center space-x-2">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h2 className="font-bold text-base tracking-tight">插件 DSP 表头与光束视觉设置</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Meter Ballistics / Response Speed */}
          <div>
            <label className="block text-xs font-mono font-bold text-neutral-400 uppercase tracking-wider mb-2">
              表头阻尼动量响应 (BALLISTICS SPEED)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(
                [
                  { id: 'FAST', label: '瞬态极速 (Fast)', desc: '捕捉超短高频峰值' },
                  { id: 'NORMAL', label: '标准响应 (Normal)', desc: '录音混音平衡' },
                  { id: 'SLOW', label: '平缓衰减 (Slow)', desc: '母带整体响度' },
                  { id: 'VU', label: '经典模拟VU (VU)', desc: '300ms 黄金积分' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onUpdateSettings({ ballisticsSpeed: item.id })}
                  className={`p-2.5 rounded-lg border text-left transition ${
                    settings.ballisticsSpeed === item.id
                      ? 'bg-cyan-950/60 border-cyan-500 text-cyan-200 shadow-sm'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  <div className="font-bold text-xs">{item.label}</div>
                  <div className="text-[10px] text-neutral-400 mt-1">{item.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Meter Mode */}
          <div>
            <label className="block text-xs font-mono font-bold text-neutral-400 uppercase tracking-wider mb-2">
              测度模式 (METER DETECTION MODE)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(
                [
                  { id: 'PEAK', label: 'PEAK (峰值)', desc: '严格采样点最大瞬时值' },
                  { id: 'RMS', label: 'RMS (均方根)', desc: '感知响度能量积分' },
                  { id: 'TRUE_PEAK', label: 'TRUE PEAK (真实峰值)', desc: '过采样插值防数码失真' },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onUpdateSettings({ meterMode: m.id as MeterMode })}
                  className={`p-2.5 rounded-lg border text-left transition ${
                    settings.meterMode === m.id
                      ? 'bg-cyan-950/60 border-cyan-500 text-cyan-200'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  <div className="font-bold text-xs">{m.label}</div>
                  <div className="text-[10px] text-neutral-400 mt-1">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Beam Color Theme */}
          <div>
            <label className="block text-xs font-mono font-bold text-neutral-400 uppercase tracking-wider mb-2">
              放电雷电色彩主题 (ELECTRIC LIGHTNING THEME)
            </label>
            <div className="space-y-2">
              {beamThemes.map((theme) => (
                <div
                  key={theme.id}
                  onClick={() => onUpdateSettings({ beamTheme: theme.id })}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition ${
                    settings.beamTheme === theme.id
                      ? 'bg-neutral-800/80 border-cyan-500 text-white shadow-md'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className={`w-4 h-4 rounded-full ${theme.color} shadow-sm`} />
                    <div>
                      <div className="font-semibold text-xs text-neutral-200">{theme.name}</div>
                      <div className="text-[11px] text-neutral-400">{theme.desc}</div>
                    </div>
                  </div>
                  {settings.beamTheme === theme.id && (
                    <span className="text-[11px] font-mono text-cyan-400 font-bold">已应用</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Peak Hold Duration */}
          <div>
            <label className="block text-xs font-mono font-bold text-neutral-400 uppercase tracking-wider mb-2">
              峰值保持时间 (PEAK HOLD TIME)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { val: 1000, label: '1 秒' },
                { val: 2000, label: '2 秒 (默认)' },
                { val: 3000, label: '3 秒' },
                { val: 0, label: '无限保持 (手动重置)' },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => onUpdateSettings({ peakHoldDurationMs: opt.val })}
                  className={`p-2 rounded-lg border text-center text-xs font-mono transition ${
                    settings.peakHoldDurationMs === opt.val
                      ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300 font-bold'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Visual Effects & Toggles */}
          <div className="space-y-3 pt-2 border-t border-neutral-800">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-neutral-200">光束等离子火花与电弧粒子 (Beam Sparks)</div>
                <div className="text-[11px] text-neutral-400">发射光波末端与手刀处喷涌动态动漫电弧火花</div>
              </div>
              <input
                type="checkbox"
                checked={settings.beamParticlesEnabled}
                onChange={(e) => onUpdateSettings({ beamParticlesEnabled: e.target.checked })}
                className="w-4 h-4 accent-cyan-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-neutral-200">0dBFS 爆音震屏冲击 (Screen Shake on Clip)</div>
                <div className="text-[11px] text-neutral-400">达到最大数码满度发生过载失真时触发屏幕微震</div>
              </div>
              <input
                type="checkbox"
                checked={settings.shakeOnClip}
                onChange={(e) => onUpdateSettings({ shakeOnClip: e.target.checked })}
                className="w-4 h-4 accent-cyan-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-neutral-800 bg-neutral-950 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold transition"
          >
            保存并返回 (Done)
          </button>
        </div>
      </div>
    </div>
  );
};
