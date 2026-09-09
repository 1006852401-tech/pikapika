import React from 'react';
import { MeterReading, PluginSettings } from '../types';

interface MeterRulerProps {
  reading: MeterReading;
  settings: PluginSettings;
  onResetPeakHold: () => void;
}

export const MeterRuler: React.FC<MeterRulerProps> = ({
  reading,
  settings,
  onResetPeakHold,
}) => {
  // Same mapping function to align ticks with canvas beam length
  // -60 to 0 maps to 0 to 0.92, 0 to +3 maps to 0.92 to 1.0
  const dbToPercent = (db: number) => {
    if (db <= -60) return 0;
    if (db >= 3) return 100;
    if (db <= 0) {
      const t = (db + 60) / 60;
      return Math.pow(t, 1.25) * 92;
    } else {
      return 92 + (db / 3) * 8;
    }
  };

  const ticks = [
    { db: -60, label: '-60', major: true },
    { db: -48, label: '-48', major: true },
    { db: -36, label: '-36', major: true },
    { db: -30, label: '', major: false },
    { db: -24, label: '-24', major: true },
    { db: -18, label: '-18', major: true, isVuZero: true },
    { db: -14, label: '', major: false },
    { db: -12, label: '-12', major: true },
    { db: -9, label: '', major: false },
    { db: -6, label: '-6', major: true },
    { db: -4, label: '', major: false },
    { db: -3, label: '-3', major: true },
    { db: -2, label: '', major: false },
    { db: -1, label: '-1', major: false },
    { db: 0, label: '0', major: true, isClipZone: true },
    { db: 1, label: '+1', major: false, isClipZone: true },
    { db: 2, label: '', major: false, isClipZone: true },
    { db: 3, label: '+3', major: true, isClipZone: true },
  ];

  const formatDb = (val: number) => {
    if (val <= -59.5) return '-INF';
    return `${val >= 0 ? '+' : ''}${val.toFixed(1)} dB`;
  };

  const maxPeak = Math.max(reading.leftPeakDb, reading.rightPeakDb);
  const maxHold = Math.max(reading.leftPeakHoldDb, reading.rightPeakHoldDb);
  const headroom = Math.max(0, -maxPeak);

  return (
    <div className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-3 select-none">
      {/* Top Precision Numbers HUD */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 mb-3">
        {/* Left Peak */}
        <div className="bg-neutral-950/80 border border-neutral-800/80 rounded px-2.5 py-1.5 flex flex-col">
          <span className="text-[10px] font-mono text-neutral-400">PEAK L</span>
          <span
            className={`font-mono text-sm font-bold ${
              reading.isClippingLeft ? 'text-red-400 animate-pulse' : 'text-emerald-400'
            }`}
          >
            {formatDb(reading.leftPeakDb)}
          </span>
        </div>

        {/* Right Peak */}
        <div className="bg-neutral-950/80 border border-neutral-800/80 rounded px-2.5 py-1.5 flex flex-col">
          <span className="text-[10px] font-mono text-neutral-400">PEAK R</span>
          <span
            className={`font-mono text-sm font-bold ${
              reading.isClippingRight ? 'text-red-400 animate-pulse' : 'text-emerald-400'
            }`}
          >
            {formatDb(reading.rightPeakDb)}
          </span>
        </div>

        {/* RMS Loudness */}
        <div className="bg-neutral-950/80 border border-neutral-800/80 rounded px-2.5 py-1.5 flex flex-col">
          <span className="text-[10px] font-mono text-neutral-400">RMS AVG</span>
          <span className="font-mono text-sm font-bold text-cyan-400">
            {formatDb((reading.leftRmsDb + reading.rightRmsDb) / 2)}
          </span>
        </div>

        {/* Peak Max Hold */}
        <div
          className="bg-neutral-950/80 border border-neutral-800/80 rounded px-2.5 py-1.5 flex flex-col cursor-pointer hover:border-neutral-600 transition"
          onClick={onResetPeakHold}
          title="Click to reset peak hold"
        >
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-mono text-neutral-400">PEAK HOLD</span>
            <span className="text-[9px] font-mono text-neutral-500">RESET</span>
          </div>
          <span
            className={`font-mono text-sm font-bold ${
              maxHold >= -0.05 ? 'text-red-400' : 'text-amber-400'
            }`}
          >
            {formatDb(maxHold)}
          </span>
        </div>

        {/* LUFS Momentary */}
        <div className="bg-neutral-950/80 border border-neutral-800/80 rounded px-2.5 py-1.5 flex flex-col">
          <span className="text-[10px] font-mono text-neutral-400">LUFS (M)</span>
          <span className="font-mono text-sm font-bold text-violet-400">
            {reading.lufs <= -59.5 ? '-INF' : `${reading.lufs.toFixed(1)} LUFS`}
          </span>
        </div>

        {/* Headroom / Clip status */}
        <div
          className={`border rounded px-2.5 py-1.5 flex flex-col transition ${
            reading.isClippingLeft || reading.isClippingRight
              ? 'bg-red-950/40 border-red-500/80 text-red-300 shadow-md shadow-red-950'
              : 'bg-neutral-950/80 border-neutral-800/80 text-neutral-300'
          }`}
        >
          <span className="text-[10px] font-mono text-neutral-400">CLIP / HEADROOM</span>
          <span
            className={`font-mono text-sm font-bold ${
              reading.isClippingLeft || reading.isClippingRight
                ? 'text-red-400 font-extrabold tracking-wider'
                : 'text-neutral-200'
            }`}
          >
            {reading.isClippingLeft || reading.isClippingRight ? 'OVERLOAD!' : `+${headroom.toFixed(1)} dB`}
          </span>
        </div>
      </div>

      {/* Main dBFS Ruler with Tick Bars */}
      <div className="relative pt-4 pb-2 px-1">
        {/* Horizontal scale gradient track */}
        <div className="relative h-2 w-full bg-neutral-950 rounded overflow-hidden border border-neutral-800">
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to right, #0284c7 0%, #10b981 60%, #eab308 85%, #ef4444 92%, #b91c1c 100%)',
              opacity: 0.85,
            }}
          />
          {/* Active Peak Fill overlay */}
          <div
            className="absolute top-0 right-0 bottom-0 bg-neutral-950/75 transition-all duration-75"
            style={{
              width: `${Math.max(0, 100 - dbToPercent(maxPeak))}%`,
            }}
          />
          {/* Active Peak Hold bar */}
          {maxHold > -59 && (
            <div
              className="absolute top-0 bottom-0 w-1 bg-white shadow-sm shadow-white transition-all duration-100"
              style={{
                left: `${dbToPercent(maxHold)}%`,
              }}
            />
          )}
        </div>

        {/* Ticks & Labels Container */}
        <div className="relative h-6 mt-1 w-full font-mono text-[10px]">
          {ticks.map((t, idx) => {
            const leftPct = dbToPercent(t.db);
            return (
              <div
                key={idx}
                className="absolute transform -translate-x-1/2 flex flex-col items-center"
                style={{ left: `${leftPct}%` }}
              >
                {/* Tick Mark */}
                <div
                  className={`w-[1px] ${
                    t.isClipZone
                      ? 'bg-red-500 h-2'
                      : t.isVuZero
                      ? 'bg-amber-400 h-2'
                      : t.major
                      ? 'bg-neutral-400 h-1.5'
                      : 'bg-neutral-600 h-1'
                  }`}
                />
                {/* Label text */}
                {t.label && (
                  <span
                    className={`mt-0.5 tracking-tight ${
                      t.isClipZone
                        ? 'text-red-400 font-bold'
                        : t.isVuZero
                        ? 'text-amber-400 font-semibold'
                        : 'text-neutral-400'
                    }`}
                  >
                    {t.label}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Range Color Zone Markers */}
        <div className="flex justify-between items-center text-[10px] font-mono text-neutral-500 pt-1 border-t border-neutral-800/80">
          <div className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-sky-500 inline-block" />
            <span>Linear Safe (-60 ~ -18 dB)</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span>Optimal Mix Target (-18 ~ -6 dB)</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
            <span>Mastering Ceiling (-6 ~ 0 dB)</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
            <span>Inter-sample Peak (Clip &gt; 0)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
