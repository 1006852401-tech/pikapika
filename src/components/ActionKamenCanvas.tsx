import React, { useEffect, useRef } from 'react';
import { BeamTheme, MeterReading, PluginSettings } from '../types';

interface ActionKamenCanvasProps {
  reading: MeterReading;
  settings: PluginSettings;
  onResetPeakHold?: () => void;
  onTriggerLaugh?: () => void;
}

interface SparkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
}

export const ActionKamenCanvas: React.FC<ActionKamenCanvasProps> = ({
  reading,
  settings,
  onResetPeakHold,
  onTriggerLaugh,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animIdRef = useRef<number | null>(null);
  const sparksRef = useRef<SparkParticle[]>([]);
  const shakeRef = useRef({ x: 0, y: 0, duration: 0 });

  const readingRef = useRef(reading);
  const settingsRef = useRef(settings);
  readingRef.current = reading;
  settingsRef.current = settings;

  // Converts dB (-60 to +3 dB) to normalized ratio 0.0 to 1.0 along the meter
  const dbToRatio = (db: number) => {
    if (db <= -60) return 0;
    if (db >= 3) return 1.0;
    if (db <= 0) {
      const normalized = (db + 60) / 60; // 0 to 1
      return Math.pow(normalized, 1.28) * 0.90;
    } else {
      return 0.90 + (db / 3) * 0.10;
    }
  };

  const getThemeColors = (theme: BeamTheme, isClipping: boolean) => {
    if (isClipping) {
      return {
        core: '#ffffff',
        sheath: '#ff4d4f',
        glow: '#ff1a1a',
        sparks: '#ffec3d',
        rings: 'rgba(255, 77, 79, 0.85)',
        flare: '#ff7875',
        lightning: '#fffb8f',
        comicText: '#ff4d4f',
        cheekGlow: '#ff1a1a',
      };
    }
    switch (theme) {
      case 'CLASSIC_CYAN':
        return {
          core: '#ffffff',
          sheath: '#36cfc9',
          glow: '#096dd9',
          sparks: '#e6fffb',
          rings: 'rgba(24, 144, 255, 0.75)',
          flare: '#40a9ff',
          lightning: '#87e8de',
          comicText: '#13c2c2',
          cheekGlow: '#40a9ff',
        };
      case 'CRIMSON_FLAME':
        return {
          core: '#ffffff',
          sheath: '#ff7875',
          glow: '#d4380d',
          sparks: '#fff1f0',
          rings: 'rgba(212, 56, 13, 0.75)',
          flare: '#ff9c6e',
          lightning: '#ffa39e',
          comicText: '#ff4d4f',
          cheekGlow: '#f5222d',
        };
      case 'EMERALD_HERO':
        return {
          core: '#ffffff',
          sheath: '#73d13d',
          glow: '#389e0d',
          sparks: '#f6ffed',
          rings: 'rgba(56, 158, 13, 0.75)',
          flare: '#95de64',
          lightning: '#b7eb8f',
          comicText: '#52c41a',
          cheekGlow: '#52c41a',
        };
      case 'NEON_CYBER':
        return {
          core: '#ffffff',
          sheath: '#f759ab',
          glow: '#9254de',
          sparks: '#fff0f6',
          rings: 'rgba(146, 84, 222, 0.75)',
          flare: '#b37feb',
          lightning: '#d3adf7',
          comicText: '#eb2f96',
          cheekGlow: '#b37feb',
        };
      case 'SUPER_GOLD':
      default:
        // Iconic Pikachu 100,000 Volts (十万伏特) Golden Lightning!
        return {
          core: '#ffffff',
          sheath: '#fadb14',
          glow: '#fa8c16',
          sparks: '#ffffb8',
          rings: 'rgba(250, 173, 20, 0.85)',
          flare: '#ffe58f',
          lightning: '#ffffff',
          comicText: '#faad14',
          cheekGlow: '#ff4d4f',
        };
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animTime = 0;

    const render = () => {
      animTime += 0.045;
      const currentReading = readingRef.current;
      const currentSettings = settingsRef.current;

      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;

      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // Handle clipping screen shake
      const isClipping = currentReading.isClippingLeft || currentReading.isClippingRight;
      if (isClipping && currentSettings.shakeOnClip) {
        shakeRef.current = {
          x: (Math.random() - 0.5) * 9,
          y: (Math.random() - 0.5) * 9,
          duration: 0.16,
        };
      } else if (shakeRef.current.duration > 0) {
        shakeRef.current.duration -= 0.04;
        shakeRef.current.x *= 0.68;
        shakeRef.current.y *= 0.68;
      } else {
        shakeRef.current = { x: 0, y: 0, duration: 0 };
      }

      ctx.translate(shakeRef.current.x, shakeRef.current.y);

      // 1. Dark Electric Studio Arena Background
      ctx.fillStyle = '#07090f';
      ctx.fillRect(0, 0, w, h);

      // Coordinates
      const charAnchorX = Math.min(220, Math.max(165, w * 0.22));
      const beamOriginY = h * 0.50;
      const emitterX = charAnchorX + 46; // Exact discharge launch point from Pikachu's paws
      const emitterY = beamOriginY;

      const maxDb = Math.max(currentReading.leftPeakDb, currentReading.rightPeakDb);
      const electricEnergy = Math.max(0, (maxDb + 60) / 63); // 0 (silent) to 1 (max)

      // Color Palette
      const palette = getThemeColors(currentSettings.beamTheme, isClipping);

      // 2. High-Voltage Background Thunder Radiance
      if (electricEnergy > 0.05) {
        ctx.save();
        ctx.strokeStyle = `rgba(254, 240, 138, ${0.03 + electricEnergy * 0.09})`;
        ctx.lineWidth = 1;
        const lineCount = 24;
        for (let i = 0; i < lineCount; i++) {
          const angle = (i / lineCount) * Math.PI * 2 + animTime * 0.25;
          const rayDist = w * 1.2;
          ctx.beginPath();
          ctx.moveTo(emitterX, emitterY);
          ctx.lineTo(emitterX + Math.cos(angle) * rayDist, emitterY + Math.sin(angle) * rayDist);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Audio Meter Track Boundaries
      const meterStart = emitterX + 5;
      const meterEnd = w - 35;
      const totalMeterLength = meterEnd - meterStart;

      // 3. Draw Pikachu Discharging Electricity (皮卡丘放电姿态)
      drawPikachuDischarge(
        ctx,
        charAnchorX,
        beamOriginY,
        h,
        animTime,
        electricEnergy,
        isClipping,
        palette
      );

      // 4. Electric Lightning Discharge Beam (放电雷电波束)
      const isDualMode = currentSettings.channelMode === 'DUAL_BEAM';
      if (isDualMode) {
        // Dual Channel Lightning: Left (Upper) & Right (Lower)
        const leftDb = currentSettings.meterMode === 'RMS' ? currentReading.leftRmsDb : currentReading.leftPeakDb;
        const rightDb = currentSettings.meterMode === 'RMS' ? currentReading.rightRmsDb : currentReading.rightPeakDb;

        const leftRatio = dbToRatio(leftDb);
        const rightRatio = dbToRatio(rightDb);
        const leftHoldRatio = dbToRatio(currentReading.leftPeakHoldDb);
        const rightHoldRatio = dbToRatio(currentReading.rightPeakHoldDb);

        const beamSpanL = totalMeterLength * leftRatio;
        const beamSpanR = totalMeterLength * rightRatio;
        const holdSpanL = totalMeterLength * leftHoldRatio;
        const holdSpanR = totalMeterLength * rightHoldRatio;

        const upperY = beamOriginY - 26;
        const lowerY = beamOriginY + 26;

        // Upper Left Channel Lightning
        drawElectricDischargeBeam(
          ctx,
          meterStart,
          upperY,
          beamSpanL,
          holdSpanL,
          leftDb,
          currentReading.isClippingLeft,
          palette,
          'L CH (THUNDER)',
          animTime,
          currentSettings.beamParticlesEnabled,
          false
        );

        // Lower Right Channel Lightning
        drawElectricDischargeBeam(
          ctx,
          meterStart,
          lowerY,
          beamSpanR,
          holdSpanR,
          rightDb,
          currentReading.isClippingRight,
          palette,
          'R CH (THUNDER)',
          animTime + 1.7,
          currentSettings.beamParticlesEnabled,
          false
        );
      } else {
        // Single Master Stream (Thick, roaring 100,000 Volts thunder discharge)
        let mainDb = maxDb;
        let mainHold = Math.max(currentReading.leftPeakHoldDb, currentReading.rightPeakHoldDb);
        let channelLabel = '100,000 VOLTS (MASTER)';

        if (currentSettings.channelMode === 'LEFT_ONLY') {
          mainDb = currentReading.leftPeakDb;
          mainHold = currentReading.leftPeakHoldDb;
          channelLabel = 'LEFT CH (VOLT)';
        } else if (currentSettings.channelMode === 'RIGHT_ONLY') {
          mainDb = currentReading.rightPeakDb;
          mainHold = currentReading.rightPeakHoldDb;
          channelLabel = 'RIGHT CH (VOLT)';
        }

        const ratio = dbToRatio(mainDb);
        const holdRatio = dbToRatio(mainHold);
        const beamSpan = totalMeterLength * ratio;
        const holdSpan = totalMeterLength * holdRatio;

        drawElectricDischargeBeam(
          ctx,
          meterStart,
          beamOriginY,
          beamSpan,
          holdSpan,
          mainDb,
          isClipping,
          palette,
          channelLabel,
          animTime,
          currentSettings.beamParticlesEnabled,
          true
        );
      }

      // 5. Overload Comic Thunder Banner & Shouts
      if (isClipping) {
        drawComicThunderShout(ctx, emitterX + 65, emitterY - 95, animTime, palette);
      }

      // 6. Update Electric Spark Particles
      if (currentSettings.beamParticlesEnabled) {
        updateAndDrawSparks(ctx, w, h);
      }

      ctx.restore();
      animIdRef.current = requestAnimationFrame(render);
    };

    animIdRef.current = requestAnimationFrame(render);

    return () => {
      if (animIdRef.current) {
        cancelAnimationFrame(animIdRef.current);
      }
    };
  }, []);

  // --- Draw Pikachu in Full Electric Attack Stance (皮卡丘十万伏特放电) ---
  const drawPikachuDischarge = (
    ctx: CanvasRenderingContext2D,
    bodyX: number,
    beamY: number,
    containerHeight: number,
    time: number,
    energy: number,
    isClipping: boolean,
    palette: ReturnType<typeof getThemeColors>
  ) => {
    ctx.save();

    // High frequency vibration/recoil during heavy electric discharge
    const recoilX = energy * (isClipping ? 6.5 : 3.5) * Math.sin(time * 36);
    const breathe = Math.sin(time * 4) * 2;

    ctx.translate(bodyX - recoilX, beamY + breathe + 5);

    const scale = Math.min(1.02, containerHeight / 330);
    ctx.scale(scale, scale);

    // 0. High-Voltage Electrostatic Aura around Pikachu
    if (energy > 0.03) {
      const auraRadius = 85 + energy * 50;
      const auraGrad = ctx.createRadialGradient(0, 0, 15, 0, 0, auraRadius);
      auraGrad.addColorStop(0, palette.sheath + '66');
      auraGrad.addColorStop(0.4, palette.glow + '33');
      auraGrad.addColorStop(1, 'transparent');

      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(0, 0, auraRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // 1. ZIG-ZAG LIGHTNING TAIL (皮卡丘标志性闪电尾巴)
    // Positioned at back, crackling with electric arcs
    ctx.save();
    // Tail twitch animation based on voltage
    const tailTwitch = Math.sin(time * 16) * (4 + energy * 12);
    ctx.translate(-38, 12);
    ctx.rotate((tailTwitch * Math.PI) / 180);

    // Tail Base Segment (Dark Brown)
    ctx.fillStyle = '#78350f';
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-14, -10);
    ctx.lineTo(-8, -18);
    ctx.lineTo(4, -8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Tail Zig-Zag Mid Segment (Bright Yellow)
    ctx.fillStyle = '#facc15';
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-14, -10);
    ctx.lineTo(-32, -18);
    ctx.lineTo(-24, -32);
    ctx.lineTo(-44, -40);
    ctx.lineTo(-34, -54);
    // Large wide thunderbolt tip
    ctx.lineTo(-68, -66);
    ctx.lineTo(-58, -96);
    ctx.lineTo(-28, -78);
    ctx.lineTo(-36, -64);
    ctx.lineTo(-18, -48);
    ctx.lineTo(-26, -34);
    ctx.lineTo(-8, -18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Tail Tip Electric Sparks
    if (energy > 0.08) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.shadowColor = palette.sparks;
      ctx.shadowBlur = 10;
      for (let s = 0; s < 3; s++) {
        const sx = -58 + (Math.random() - 0.5) * 20;
        const sy = -96 + (Math.random() - 0.5) * 20;
        ctx.beginPath();
        ctx.moveTo(-58, -96);
        ctx.lineTo(sx, sy);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    }
    ctx.restore();

    // 2. PIKACHU BODY & LEGS (Chubby golden yellow body)
    // Left Rear Foot (Braced back)
    ctx.fillStyle = '#facc15';
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(-28, 54, 15, 9, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Claws
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-38, 56, 3, 4);
    ctx.fillRect(-32, 57, 3, 4);

    // Right Front Foot (Firmly planted forward)
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.ellipse(14, 56, 17, 10, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Claws
    ctx.fillStyle = '#78350f';
    ctx.fillRect(18, 59, 3, 4);
    ctx.fillRect(24, 58, 3, 4);

    // Main Chubby Torso
    const bodyGrad = ctx.createRadialGradient(2, 10, 8, 2, 15, 55);
    bodyGrad.addColorStop(0, '#fef08a'); // Highlight tummy
    bodyGrad.addColorStop(0.75, '#facc15'); // Rich golden yellow
    bodyGrad.addColorStop(1, '#eab308'); // Warm shaded contour

    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(-2, 16, 36, 42, 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 2.8;
    ctx.stroke();

    // Two Iconic Brown Stripes on Back
    ctx.fillStyle = '#78350f';
    // Upper Stripe
    ctx.beginPath();
    ctx.moveTo(-36, 0);
    ctx.quadraticCurveTo(-22, 2, -12, 1);
    ctx.quadraticCurveTo(-20, 8, -34, 9);
    ctx.closePath();
    ctx.fill();
    // Lower Stripe
    ctx.beginPath();
    ctx.moveTo(-35, 18);
    ctx.quadraticCurveTo(-18, 21, -8, 20);
    ctx.quadraticCurveTo(-17, 28, -32, 28);
    ctx.closePath();
    ctx.fill();

    // 3. PIKACHU HEAD
    ctx.save();
    // Head bobbing/tilting into the attack
    const headTilt = -0.06 + Math.sin(time * 6) * 0.02;
    ctx.translate(6, -26);
    ctx.rotate(headTilt);

    // Ears (Pointed with Iconic Black Tips)
    // Left Ear (Back ear)
    ctx.save();
    const earTwitchL = Math.sin(time * 20) * (3 + energy * 8);
    ctx.translate(-22, -26);
    ctx.rotate(((-38 + earTwitchL) * Math.PI) / 180);
    ctx.fillStyle = '#facc15';
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, -32, 9, 38, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Black Tip
    ctx.fillStyle = '#18181b';
    ctx.beginPath();
    ctx.moveTo(-8, -48);
    ctx.quadraticCurveTo(0, -70, 8, -48);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Right Ear (Front ear, angled aggressively forward)
    ctx.save();
    const earTwitchR = Math.cos(time * 22) * (3 + energy * 8);
    ctx.translate(14, -28);
    ctx.rotate(((22 + earTwitchR) * Math.PI) / 180);
    ctx.fillStyle = '#facc15';
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, -34, 9, 40, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Black Tip
    ctx.fillStyle = '#18181b';
    ctx.beginPath();
    ctx.moveTo(-8, -50);
    ctx.quadraticCurveTo(0, -74, 8, -50);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Head Base Rounding
    const headGrad = ctx.createRadialGradient(2, -4, 6, 2, -2, 36);
    headGrad.addColorStop(0, '#fef08a');
    headGrad.addColorStop(0.8, '#facc15');
    headGrad.addColorStop(1, '#eab308');

    ctx.fillStyle = headGrad;
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.ellipse(0, 0, 32, 28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Determined Brow & Eyes
    // Eyes: Shiny glossy anime eyes focused intensely on the meter!
    const eyePupilColor = '#18181b';
    // Left Eye
    ctx.fillStyle = eyePupilColor;
    ctx.beginPath();
    ctx.ellipse(-14, -6, 5.5, 7, -0.1, 0, Math.PI * 2);
    ctx.fill();
    // Left Eye White Highlight
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-13, -8, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Right Eye
    ctx.fillStyle = eyePupilColor;
    ctx.beginPath();
    ctx.ellipse(14, -6, 5.5, 7, 0.1, 0, Math.PI * 2);
    ctx.fill();
    // Right Eye White Highlight
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(15, -8, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Determined Angled Eyebrows
    ctx.strokeStyle = '#854d0e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-20, -15);
    ctx.lineTo(-8, -12);
    ctx.moveTo(8, -12);
    ctx.lineTo(20, -15);
    ctx.stroke();

    // Tiny Cute Nose
    ctx.fillStyle = '#18181b';
    ctx.beginPath();
    ctx.moveTo(-1.5, -2);
    ctx.lineTo(1.5, -2);
    ctx.lineTo(0, 0.5);
    ctx.closePath();
    ctx.fill();

    // Mouth: Shouting "PIKA-CHUUUU!" with red inside & pink tongue
    ctx.fillStyle = '#991b1b';
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-7, 5);
    ctx.quadraticCurveTo(0, 3, 7, 5);
    ctx.quadraticCurveTo(6, 17, 0, 18);
    ctx.quadraticCurveTo(-6, 17, -7, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Tongue
    ctx.fillStyle = '#fb7185';
    ctx.beginPath();
    ctx.arc(0, 14, 5, Math.PI, 0, true);
    ctx.fill();

    // 4. ICONIC RED ELECTRIC CHEEK POUCHES (电袋 - The Source of 100,000 Volts!)
    // Left Cheek
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(-22, 6, 8.5, 0, Math.PI * 2);
    ctx.fill();

    // Right Cheek (Directly facing the camera/beam)
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(22, 6, 9, 0, Math.PI * 2);
    ctx.fill();

    // BLINDING ELECTRIC DISCHARGE GLOW FROM CHEEKS!
    if (energy > 0.02) {
      const cheekGlowRadius = 14 + energy * 28;
      // Right cheek intense glow
      const glowR = ctx.createRadialGradient(22, 6, 2, 22, 6, cheekGlowRadius);
      glowR.addColorStop(0, '#ffffff');
      glowR.addColorStop(0.3, palette.sparks);
      glowR.addColorStop(0.6, palette.sheath);
      glowR.addColorStop(1, 'transparent');
      ctx.fillStyle = glowR;
      ctx.beginPath();
      ctx.arc(22, 6, cheekGlowRadius, 0, Math.PI * 2);
      ctx.fill();

      // Left cheek glow
      const glowL = ctx.createRadialGradient(-22, 6, 2, -22, 6, cheekGlowRadius * 0.85);
      glowL.addColorStop(0, '#ffffff');
      glowL.addColorStop(0.3, palette.sparks);
      glowL.addColorStop(0.6, palette.sheath);
      glowL.addColorStop(1, 'transparent');
      ctx.fillStyle = glowL;
      ctx.beginPath();
      ctx.arc(-22, 6, cheekGlowRadius * 0.85, 0, Math.PI * 2);
      ctx.fill();

      // Electric spark arcs leaping off the cheeks
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.8;
      for (let c = 0; c < 3; c++) {
        const sparkAng = (time * 18 + c * 2.1) % (Math.PI * 2);
        const sx = 22 + Math.cos(sparkAng) * (cheekGlowRadius * 0.9);
        const sy = 6 + Math.sin(sparkAng) * (cheekGlowRadius * 0.9);
        ctx.beginPath();
        ctx.moveTo(22, 6);
        ctx.lineTo((22 + sx) / 2 + (Math.random() - 0.5) * 8, (6 + sy) / 2 + (Math.random() - 0.5) * 8);
        ctx.lineTo(sx, sy);
        ctx.stroke();
      }
    }
    ctx.restore(); // end head

    // 5. PIKACHU FRONT PAWS (Outstretched forward firing the electric thunderbolt!)
    // Left Paw (Lower forward)
    ctx.fillStyle = '#facc15';
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(22, 18, 14, 8, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Paw Fingers
    ctx.fillStyle = '#ca8a04';
    ctx.fillRect(32, 16, 2, 3);
    ctx.fillRect(32, 19, 2, 3);

    // Right Paw (Upper forward, aiming the electric beam)
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.ellipse(32, 0, 16, 9, -0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Paw Fingers
    ctx.fillStyle = '#ca8a04';
    ctx.fillRect(44, -3, 2, 3);
    ctx.fillRect(44, 0, 2, 3);
    ctx.fillRect(44, 3, 2, 3);

    // 6. HIGH-VOLTAGE ELECTRO BALL / CONVERGENCE NODE AT PAWS
    // This is the origin emitter node of the audio meter beam!
    const emitterNodeX = 46;
    const emitterNodeY = 0;

    if (energy > 0.02) {
      const chargeRadius = 18 + energy * 30;
      const emitterGlow = ctx.createRadialGradient(emitterNodeX, emitterNodeY, 2, emitterNodeX, emitterNodeY, chargeRadius);
      emitterGlow.addColorStop(0, '#ffffff');
      emitterGlow.addColorStop(0.25, palette.sparks);
      emitterGlow.addColorStop(0.55, palette.sheath);
      emitterGlow.addColorStop(1, 'transparent');

      ctx.fillStyle = emitterGlow;
      ctx.beginPath();
      ctx.arc(emitterNodeX, emitterNodeY, chargeRadius, 0, Math.PI * 2);
      ctx.fill();

      // Sharp 4-Point Star Spark at Paw Tips (十文字电光)
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.8;
      ctx.shadowColor = palette.sheath;
      ctx.shadowBlur = 14;

      const starLen = 22 + energy * 28;
      ctx.beginPath();
      ctx.moveTo(emitterNodeX, emitterNodeY - starLen);
      ctx.lineTo(emitterNodeX, emitterNodeY + starLen);
      ctx.moveTo(emitterNodeX - starLen * 0.6, emitterNodeY);
      ctx.lineTo(emitterNodeX + starLen * 1.4, emitterNodeY);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Crackling lightning arcs leaping between Pikachu's body and paw emitter
      ctx.strokeStyle = palette.lightning;
      ctx.lineWidth = 1.8;
      for (let j = 0; j < 4; j++) {
        const angle = time * 14 + j * (Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(emitterNodeX, emitterNodeY);
        const midX = emitterNodeX + Math.cos(angle) * (chargeRadius * 0.6) + (Math.random() - 0.5) * 6;
        const midY = emitterNodeY + Math.sin(angle) * (chargeRadius * 0.6) + (Math.random() - 0.5) * 6;
        const endX = emitterNodeX + Math.cos(angle) * chargeRadius;
        const endY = emitterNodeY + Math.sin(angle) * chargeRadius;
        ctx.lineTo(midX, midY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }
    }

    ctx.restore();
  };

  // --- Draw Electric Discharge Lightning Beam (放电波束 - 一眼就看出在放电!) ---
  const drawElectricDischargeBeam = (
    ctx: CanvasRenderingContext2D,
    startX: number,
    centerY: number,
    beamLength: number,
    peakHoldLength: number,
    db: number,
    isClip: boolean,
    palette: ReturnType<typeof getThemeColors>,
    label: string,
    time: number,
    allowSparks: boolean,
    isWideMaster: boolean
  ) => {
    const minVisualLen = 8;
    const currentLen = Math.max(minVisualLen, beamLength);
    const endX = startX + currentLen;
    const energy = Math.max(0, (db + 60) / 63); // 0 to 1

    // Height expands dynamically with electric audio intensity
    const baseH = isWideMaster ? 26 : 16;
    const beamH = baseH + energy * (isWideMaster ? 32 : 18);

    ctx.save();

    // 1. Channel Indicator Tag
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(label, startX + 4, centerY - beamH * 0.85 - 6);

    // 2. Translucent Ionized Plasma Corona Envelope (电离等离子体鞘层)
    // Ensures audio meter level is easily readable even with erratic lightning
    if (energy > 0.02) {
      const coronaGrad = ctx.createLinearGradient(startX, centerY - beamH * 2.2, startX, centerY + beamH * 2.2);
      coronaGrad.addColorStop(0, 'transparent');
      coronaGrad.addColorStop(0.3, palette.glow + '44');
      coronaGrad.addColorStop(0.5, palette.sheath + '77');
      coronaGrad.addColorStop(0.7, palette.glow + '44');
      coronaGrad.addColorStop(1, 'transparent');

      ctx.fillStyle = coronaGrad;
      ctx.fillRect(startX, centerY - beamH * 2.2, currentLen, beamH * 4.4);

      // Inner electric sheath tube
      const innerSheath = ctx.createLinearGradient(startX, centerY - beamH * 0.5, startX, centerY + beamH * 0.5);
      innerSheath.addColorStop(0, palette.sheath + '66');
      innerSheath.addColorStop(0.5, palette.sheath + 'cc');
      innerSheath.addColorStop(1, palette.sheath + '66');
      ctx.fillStyle = innerSheath;
      ctx.beginPath();
      ctx.roundRect(startX, centerY - beamH * 0.45, currentLen, beamH * 0.9, [4, 14, 14, 4]);
      ctx.fill();
    }

    // 3. JAGGED ELECTRIC LIGHTNING ARCS (多重折线放电电弧 - Signature Thunderbolt!)
    // Generates high-energy jagged lightning streams shooting from Pikachu to the meter tip
    if (currentLen > 10) {
      const boltCount = isWideMaster ? 3 : 2;

      for (let b = 0; b < boltCount; b++) {
        const phase = time * 20 + b * 2.4;
        const boltAmp = (beamH * 0.45) * (0.6 + energy * 0.5);

        ctx.strokeStyle = b === 0 ? '#ffffff' : palette.lightning;
        ctx.lineWidth = b === 0 ? 3 : 1.8;
        ctx.shadowColor = palette.sheath;
        ctx.shadowBlur = b === 0 ? 12 : 6;

        ctx.beginPath();
        let curX = startX;
        let curY = centerY;
        ctx.moveTo(curX, curY);

        const segmentStep = 18;
        while (curX < endX - 8) {
          curX += segmentStep + (Math.random() - 0.5) * 6;
          // Random erratic jagged offset with sine modulation
          const seed = Math.sin(curX * 0.08 + phase);
          const jitter = (Math.random() - 0.5) * boltAmp * 0.9;
          curY = centerY + seed * (boltAmp * 0.6) + jitter;
          ctx.lineTo(Math.min(curX, endX), curY);

          // Forked branching lightning (分支闪电)
          if (energy > 0.25 && Math.random() < 0.28) {
            const forkLen = 14 + Math.random() * 18;
            const forkAngle = (Math.random() > 0.5 ? 1 : -1) * (0.5 + Math.random() * 0.7);
            const forkEndX = Math.min(curX + Math.cos(forkAngle) * forkLen, endX);
            const forkEndY = curY + Math.sin(forkAngle) * forkLen;
            ctx.moveTo(curX, curY);
            ctx.lineTo(forkEndX, forkEndY);
            ctx.moveTo(curX, curY); // return to main bolt
          }
        }
        ctx.lineTo(endX, centerY);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    }

    // 4. White-Hot Intense Plasma Core Running Through Center
    const coreH = Math.max(3.5, beamH * 0.28);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = palette.sheath;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.roundRect(startX, centerY - coreH * 0.5, currentLen - 2, coreH, [2, 6, 6, 2]);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 5. Traveling Electromagnetic Ionization Rings (放电电磁环)
    if (currentLen > 30) {
      const ringSpacing = 44;
      const travelOffset = (time * 160) % ringSpacing;
      ctx.strokeStyle = palette.rings;
      ctx.lineWidth = 2.8;

      for (let rx = startX + travelOffset; rx < endX - 10; rx += ringSpacing) {
        const ringProgress = (rx - startX) / currentLen;
        const ringRadius = (beamH * 0.75) * (1 + Math.sin(ringProgress * Math.PI) * 0.35);

        ctx.beginPath();
        ctx.ellipse(rx, centerY, 6, ringRadius, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Extra outer pulse when loud
        if (energy > 0.45) {
          ctx.beginPath();
          ctx.ellipse(rx, centerY, 9, ringRadius * 1.35, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }

    // 6. Discharge Tip Electro Ball / Lightning Burst (端部放电雷暴球)
    if (energy > 0.04) {
      const tipRadius = beamH * (isClip ? 1.7 : 1.15);
      const tipGrad = ctx.createRadialGradient(endX, centerY, 2, endX, centerY, tipRadius);
      tipGrad.addColorStop(0, '#ffffff');
      tipGrad.addColorStop(0.35, palette.sparks);
      tipGrad.addColorStop(0.7, palette.sheath);
      tipGrad.addColorStop(1, 'transparent');

      ctx.fillStyle = tipGrad;
      ctx.beginPath();
      ctx.arc(endX, centerY, tipRadius, 0, Math.PI * 2);
      ctx.fill();

      // Radial lightning burst at the tip
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.8;
      const burstRays = isClip ? 8 : 5;
      for (let r = 0; r < burstRays; r++) {
        const rayAngle = time * 12 + r * ((Math.PI * 2) / burstRays);
        const rayDist = tipRadius * (0.8 + Math.random() * 0.6);
        ctx.beginPath();
        ctx.moveTo(endX, centerY);
        ctx.lineTo(endX + Math.cos(rayAngle) * rayDist, centerY + Math.sin(rayAngle) * rayDist);
        ctx.stroke();
      }

      // Spawn electrical sparks
      if (allowSparks && Math.random() < 0.7) {
        spawnSparks(endX, centerY, isClip ? 6 : 3, palette.sparks);
      }
    }

    // 7. PEAK HOLD RETICLE / ELECTRIC MARKER (Precision Audio Metering Indicator)
    if (peakHoldLength > 5) {
      const holdX = startX + peakHoldLength;
      ctx.save();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 10;

      // Vertical hold line
      ctx.beginPath();
      ctx.moveTo(holdX, centerY - beamH * 0.95);
      ctx.lineTo(holdX, centerY + beamH * 0.95);
      ctx.stroke();

      // Hold arrowheads
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(holdX - 5, centerY - beamH * 0.95 - 6);
      ctx.lineTo(holdX + 5, centerY - beamH * 0.95 - 6);
      ctx.lineTo(holdX, centerY - beamH * 0.95);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(holdX - 5, centerY + beamH * 0.95 + 6);
      ctx.lineTo(holdX + 5, centerY + beamH * 0.95 + 6);
      ctx.lineTo(holdX, centerY + beamH * 0.95);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }

    ctx.restore();
  };

  // --- Overload Thunder Shout ("PIKA-CHUUU! ⚡ 100,000V OVERLOAD!") ---
  const drawComicThunderShout = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    time: number,
    palette: ReturnType<typeof getThemeColors>
  ) => {
    ctx.save();
    ctx.translate(x, y);

    // Comic jagged thunder burst polygon
    const points = 16;
    const outerR = 44 + Math.sin(time * 24) * 5;
    const innerR = 28;

    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (i * Math.PI) / points + time * 4;
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3.5;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PIKA-CHUU! ⚡', 0, -8);
    ctx.fillStyle = '#fef08a';
    ctx.font = '900 11px sans-serif';
    ctx.fillText('十万伏特 CLIP!', 0, 8);

    ctx.restore();
  };

  // --- Electrical Sparks Particle System ---
  const spawnSparks = (x: number, y: number, count: number, color: string) => {
    if (sparksRef.current.length > 200) return;
    for (let i = 0; i < count; i++) {
      const angle = (Math.random() - 0.5) * Math.PI * 1.5;
      const speed = Math.random() * 5.5 + 2.5;
      sparksRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 3 + 1,
        alpha: 1.0,
        color,
      });
    }
  };

  const updateAndDrawSparks = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const list = sparksRef.current;
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.09; // slight gravity
      p.alpha -= 0.035;

      if (p.alpha <= 0 || p.x > w || p.y > h || p.x < 0 || p.y < 0) {
        list.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };

  return (
    <div className="relative w-full h-full select-none overflow-hidden rounded-xl bg-neutral-950 border border-neutral-800 shadow-2xl">
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-pointer"
        onClick={() => {
          if (onResetPeakHold) onResetPeakHold();
          if (onTriggerLaugh) onTriggerLaugh();
        }}
        title="点击重置峰值保持 (Peak Hold) 并触发皮卡丘十万伏特叫声！"
      />

      {/* Top Banner Tag: Pikachu Thunderbolt Stance */}
      <div className="absolute top-3 left-4 flex items-center space-x-2 pointer-events-none">
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-neutral-900/90 text-amber-400 border border-amber-500/30 backdrop-blur-md shadow-lg">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse mr-2" />
          皮卡丘·十万伏特放电表头 (PIKACHU THUNDERBOLT METER)
        </span>
        {reading.isClippingLeft || reading.isClippingRight ? (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-mono font-black bg-red-600 text-white animate-bounce shadow-xl shadow-red-500/50">
            ⚡ 百万伏特过载 (0 dBFS OVERLOAD) ⚡
          </span>
        ) : null}
      </div>

      {/* Bottom Hint */}
      <div className="absolute bottom-3 right-4 pointer-events-none text-right">
        <span className="text-[11px] font-mono text-neutral-400/90 bg-neutral-900/80 px-2 py-0.5 rounded border border-neutral-800 backdrop-blur-sm">
          放电闪电长度 = 表头分贝读数 (dB) · 点击重置 Peak Hold
        </span>
      </div>
    </div>
  );
};
