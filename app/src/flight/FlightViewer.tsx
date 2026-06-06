import { useEffect, useRef } from 'react';
import type { FlightSample, NoseConeShape, Rocket } from '../domain/types';

interface FlightViewerProps {
  rocket: Rocket;
  sample: FlightSample | null;
  launchAngle: number;
  countdown: number; // 0 = hidden, else 3,2,1
  windSpeed: number; // m/s, positive = wind blows toward +x
}

const CANVAS_W = 800;
const CANVAS_H = 520;

const TRAIL_MAX = 300; // points

export function FlightViewer({ rocket, sample, launchAngle, countdown, windSpeed }: FlightViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trailRef = useRef<{ x: number; altitude: number }[]>([]);
  const lastStageRef = useRef<number | null>(null);
  const stageFlashRef = useRef<number>(0); // 0..1 fade

  useEffect(() => {
    const cnv = canvasRef.current;
    if (!cnv) return;
    const ctx = cnv.getContext('2d');
    if (!ctx) return;
    if (!sample || sample.phase === 'pad') {
      trailRef.current = [];
      lastStageRef.current = null;
      stageFlashRef.current = 0;
    } else {
      trailRef.current.push({ x: sample.xDistance, altitude: sample.altitude });
      if (trailRef.current.length > TRAIL_MAX) {
        trailRef.current.splice(0, trailRef.current.length - TRAIL_MAX);
      }
      if (lastStageRef.current !== null && lastStageRef.current !== sample.activeStage) {
        stageFlashRef.current = 1;
      }
      lastStageRef.current = sample.activeStage;
      stageFlashRef.current = Math.max(0, stageFlashRef.current - 0.04);
    }
    draw(ctx, rocket, sample, launchAngle, countdown, windSpeed, trailRef.current, stageFlashRef.current);
  }, [rocket, sample, launchAngle, countdown, windSpeed]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      className="w-full h-full max-h-[600px] rounded"
      role="img"
      aria-label="Flight visualization"
    />
  );
}

function draw(
  ctx: CanvasRenderingContext2D,
  rocket: Rocket,
  sample: FlightSample | null,
  launchAngle: number,
  countdown: number,
  windSpeed: number,
  trail: { x: number; altitude: number }[],
  stageFlash: number,
) {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  ctx.clearRect(0, 0, W, H);

  // Sky gradient (light blue at horizon -> NASA navy higher up; deepens with altitude).
  const altitude = sample?.altitude ?? 0;
  const skyMix = Math.min(1, altitude / 1500);
  const horizon = lerpColor([200, 220, 240], [11, 40, 102], skyMix);
  const high = lerpColor([240, 245, 251], [3, 8, 31], skyMix);
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, `rgb(${high[0]}, ${high[1]}, ${high[2]})`);
  grad.addColorStop(1, `rgb(${horizon[0]}, ${horizon[1]}, ${horizon[2]})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Pick a scale that keeps the rocket on screen as it climbs.
  // While it's near the pad, use a fixed scale; as altitude grows beyond a
  // threshold, the camera tracks the rocket and the scale compresses gently.
  const padBaselineY = H - 60;
  const NEAR_SCALE = 6; // px per meter near the pad
  const farScale = NEAR_SCALE / (1 + altitude / 80);
  const scale = altitude < 30 ? NEAR_SCALE : farScale;

  const rocketY = padBaselineY - altitude * scale;
  const rocketX = W / 2 + (sample?.xDistance ?? 0) * scale;
  const padOriginX = W / 2;

  // Ground band (only visible when rocket is near pad).
  const groundY = padBaselineY + Math.max(0, (altitude - 0) * 0); // ground stays fixed
  ctx.fillStyle = '#2E8B57';
  ctx.fillRect(0, padBaselineY, W, H - padBaselineY);
  // grass blades
  ctx.strokeStyle = '#1E6B40';
  for (let x = 0; x < W; x += 12) {
    ctx.beginPath();
    ctx.moveTo(x, padBaselineY);
    ctx.lineTo(x + 4, padBaselineY - 6);
    ctx.stroke();
  }
  void groundY;

  // Launch rod (rooted at the pad origin, not the moving rocket).
  const rodLengthPx = 60;
  const rodAngleRad = (launchAngle * Math.PI) / 180;
  const rodBaseX = padOriginX - 14;
  const rodBaseY = padBaselineY;
  const rodTipX = rodBaseX + rodLengthPx * Math.cos(rodAngleRad);
  const rodTipY = rodBaseY - rodLengthPx * Math.sin(rodAngleRad);
  ctx.strokeStyle = '#1A1A1A';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(rodBaseX, rodBaseY);
  ctx.lineTo(rodTipX, rodTipY);
  ctx.stroke();

  // Trajectory trail.
  if (trail.length > 1) {
    ctx.strokeStyle = 'rgba(11,61,145,0.45)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i < trail.length; i++) {
      const t = trail[i];
      const tx = padOriginX + t.x * scale;
      const ty = padBaselineY - t.altitude * scale;
      if (i === 0) ctx.moveTo(tx, ty);
      else ctx.lineTo(tx, ty);
    }
    ctx.stroke();
  }

  // Rocket sprite.
  drawRocket(ctx, rocketX, rocketY, rocket, launchAngle, sample);

  // Altitude tick marks down the left edge.
  drawAltitudeTicks(ctx, altitude, scale, padBaselineY);

  // Wind direction indicator in the top right corner.
  drawWindIndicator(ctx, windSpeed);

  // Stage drop flash — a brief, fading "STAGE N" caption above the rocket.
  if (stageFlash > 0 && sample) {
    ctx.fillStyle = `rgba(11,61,145,${stageFlash * 0.85})`;
    ctx.font = 'bold 20px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`STAGE ${sample.activeStage + 1} IGNITED`, W / 2, 60);
  }

  // Countdown overlay.
  if (countdown > 0) {
    ctx.fillStyle = '#D63333';
    ctx.font = 'bold 64px JetBrains Mono, ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`T − ${countdown}`, W / 2, 110);
  }

  // Crash/landed banner.
  if (sample?.phase === 'crashed') {
    ctx.fillStyle = 'rgba(192,57,43,0.92)';
    ctx.fillRect(0, H / 2 - 22, W, 44);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 18px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Your rocket was unstable!', W / 2, H / 2 + 6);
  } else if (sample?.phase === 'landed') {
    ctx.fillStyle = 'rgba(46,139,87,0.92)';
    ctx.fillRect(0, H / 2 - 22, W, 44);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 18px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Touchdown ✓', W / 2, H / 2 + 6);
  }
}

function drawRocket(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rocket: Rocket,
  launchAngleDeg: number,
  sample: FlightSample | null,
) {
  // Convert rocket cm -> px (different from world scale; rocket sprite is fixed size).
  const PX_PER_CM = 2.2;
  const bodyLen = rocket.body.length * PX_PER_CM;
  const bodyW = rocket.body.diameter * PX_PER_CM;
  const noseLen = rocket.noseCone.length * PX_PER_CM;
  const finLen = rocket.fins.length * PX_PER_CM;
  const finW = rocket.fins.width * PX_PER_CM;
  const finH = rocket.fins.height * PX_PER_CM;

  // Tilt: use the simulated heading from the integrator so weathercocking and
  // gravity-turn are visible. Fall back to the launch angle on the pad and
  // straight-up during descent (the chute right itself).
  let tiltDeg = sample?.tiltDeg ?? launchAngleDeg;
  if (!sample || sample.phase === 'pad') tiltDeg = launchAngleDeg;
  if (sample?.phase === 'descent') tiltDeg = 90;

  ctx.save();
  ctx.translate(cx, cy);
  // Rotate so that "up" of the rocket matches the tilt vector.
  // In canvas, +y is down. Tilt 90° means pointing straight up = -y axis.
  // Convert: rotation needed = (90° - tiltDeg) clockwise.
  const rot = ((90 - tiltDeg) * Math.PI) / 180;
  ctx.rotate(rot);

  // Local frame: rocket body axis points up (-y). Origin at center of body tube.
  // body tube
  ctx.fillStyle = '#4A90E2';
  ctx.strokeStyle = '#1A1A1A';
  ctx.lineWidth = 1;
  ctx.fillRect(-bodyW / 2, -bodyLen / 2, bodyW, bodyLen);
  ctx.strokeRect(-bodyW / 2, -bodyLen / 2, bodyW, bodyLen);

  // nose cone — shape selected from rocket.noseCone.shape, rendered in local
  // body frame (body axis along -y, base at -bodyLen/2).
  ctx.fillStyle = '#D63333';
  traceNoseConeShape(ctx, rocket.noseCone.shape ?? 'cone', bodyW, bodyLen, noseLen);
  ctx.fill();
  ctx.stroke();

  // fins (triangular delta with apex up). Anchored at finH from base.
  const finBottomY = bodyLen / 2 - finH;
  const finTopY = finBottomY - finLen;
  ctx.fillStyle = '#1A1A1A';
  // left fin
  ctx.beginPath();
  ctx.moveTo(-bodyW / 2, finBottomY);
  ctx.lineTo(-bodyW / 2 - finW, finBottomY);
  ctx.lineTo(-bodyW / 2, finTopY);
  ctx.closePath();
  ctx.fill();
  // right fin
  ctx.beginPath();
  ctx.moveTo(bodyW / 2, finBottomY);
  ctx.lineTo(bodyW / 2 + finW, finBottomY);
  ctx.lineTo(bodyW / 2, finTopY);
  ctx.closePath();
  ctx.fill();

  // Exhaust flame + sparks during boost.
  if (sample?.phase === 'boost') {
    const baseY = bodyLen / 2;
    const flicker = 0.6 + Math.random() * 0.4;
    const flameLen = (10 + Math.random() * 6) * flicker;
    const flameW = bodyW * 0.6;
    // outer flame (orange)
    ctx.fillStyle = 'rgba(214,51,51,0.9)';
    ctx.beginPath();
    ctx.moveTo(-flameW / 2, baseY);
    ctx.quadraticCurveTo(0, baseY + flameLen * 0.6, flameW / 2, baseY);
    ctx.lineTo(0, baseY + flameLen);
    ctx.closePath();
    ctx.fill();
    // inner flame (yellow)
    ctx.fillStyle = 'rgba(255,204,40,0.95)';
    ctx.beginPath();
    ctx.moveTo(-flameW / 4, baseY);
    ctx.lineTo(0, baseY + flameLen * 0.75);
    ctx.lineTo(flameW / 4, baseY);
    ctx.closePath();
    ctx.fill();
    // sparks
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < 4; i++) {
      const sx = (Math.random() - 0.5) * flameW;
      const sy = baseY + Math.random() * flameLen * 1.2;
      ctx.fillRect(sx, sy, 1.5, 1.5);
    }
  }

  // Parachute during descent.
  if (sample?.phase === 'descent') {
    const chuteR = rocket.parachuteDiameter * 100 * PX_PER_CM * 0.6;
    ctx.fillStyle = 'rgba(74,144,226,0.6)';
    ctx.strokeStyle = '#1A1A1A';
    ctx.beginPath();
    ctx.ellipse(0, -bodyLen / 2 - noseLen - chuteR / 2, chuteR, chuteR / 1.8, 0, Math.PI, 0);
    ctx.fill();
    ctx.stroke();
    // shroud lines
    ctx.beginPath();
    ctx.moveTo(-chuteR * 0.8, -bodyLen / 2 - noseLen - chuteR / 4);
    ctx.lineTo(0, -bodyLen / 2);
    ctx.moveTo(chuteR * 0.8, -bodyLen / 2 - noseLen - chuteR / 4);
    ctx.lineTo(0, -bodyLen / 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawWindIndicator(ctx: CanvasRenderingContext2D, windSpeed: number) {
  const W = ctx.canvas.width;
  const padding = 14;
  const cx = W - 90;
  const cy = padding + 22;
  // backdrop
  ctx.fillStyle = 'rgba(255,255,255,0.78)';
  ctx.strokeStyle = 'rgba(11,61,145,0.25)';
  ctx.lineWidth = 1;
  const boxW = 110;
  const boxH = 40;
  ctx.beginPath();
  ctx.rect(cx - boxW / 2, cy - boxH / 2, boxW, boxH);
  ctx.fill();
  ctx.stroke();
  // label
  ctx.fillStyle = 'rgba(11,19,32,0.55)';
  ctx.font = '9px JetBrains Mono, ui-monospace, monospace';
  ctx.textAlign = 'left';
  ctx.fillText('WIND', cx - boxW / 2 + 6, cy - 7);
  ctx.fillStyle = '#0B1320';
  ctx.font = '11px JetBrains Mono, ui-monospace, monospace';
  ctx.fillText(`${Math.abs(windSpeed).toFixed(1)} m/s`, cx - boxW / 2 + 6, cy + 9);
  // arrow
  const maxMag = 10;
  const mag = Math.min(Math.abs(windSpeed) / maxMag, 1);
  const arrowLen = 26 * mag;
  const arrowX = cx + 28;
  const arrowY = cy + 1;
  const dir = windSpeed >= 0 ? 1 : -1;
  ctx.strokeStyle = windSpeed === 0 ? 'rgba(11,19,32,0.25)' : '#0B3D91';
  ctx.fillStyle = ctx.strokeStyle;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(arrowX, arrowY);
  ctx.lineTo(arrowX + dir * arrowLen, arrowY);
  ctx.stroke();
  if (arrowLen > 2) {
    const tipX = arrowX + dir * arrowLen;
    ctx.beginPath();
    ctx.moveTo(tipX, arrowY);
    ctx.lineTo(tipX - dir * 5, arrowY - 3);
    ctx.lineTo(tipX - dir * 5, arrowY + 3);
    ctx.closePath();
    ctx.fill();
  }
}

function traceNoseConeShape(
  ctx: CanvasRenderingContext2D,
  shape: NoseConeShape,
  bodyW: number,
  bodyLen: number,
  noseLen: number,
) {
  const baseY = -bodyLen / 2;
  const tipY = baseY - noseLen;
  const halfW = bodyW / 2;
  ctx.beginPath();
  switch (shape) {
    case 'ogive': {
      // Cubic Bezier approximation of a tangent ogive — vertical tangent at
      // base, horizontal tangent at tip, mirrored about the rocket axis.
      const K = 0.55;
      const baseCtrlY = baseY - K * noseLen;
      const tipCtrlOffset = K * halfW;
      ctx.moveTo(-halfW, baseY);
      ctx.bezierCurveTo(-halfW, baseCtrlY, -tipCtrlOffset, tipY, 0, tipY);
      ctx.bezierCurveTo(tipCtrlOffset, tipY, halfW, baseCtrlY, halfW, baseY);
      break;
    }
    case 'parabolic': {
      ctx.moveTo(-halfW, baseY);
      ctx.quadraticCurveTo(0, baseY - 2 * noseLen, halfW, baseY);
      break;
    }
    case 'elliptical': {
      // Top half (counter-clockwise from left to right keeps the curve above
      // the base line where the tip lives).
      ctx.moveTo(-halfW, baseY);
      ctx.ellipse(0, baseY, halfW, noseLen, 0, Math.PI, 0, true);
      break;
    }
    case 'cone':
    default:
      ctx.moveTo(-halfW, baseY);
      ctx.lineTo(0, tipY);
      ctx.lineTo(halfW, baseY);
      break;
  }
  ctx.closePath();
}

function drawAltitudeTicks(
  ctx: CanvasRenderingContext2D,
  altitude: number,
  scale: number,
  baselineY: number,
) {
  ctx.fillStyle = 'rgba(11,19,32,0.55)';
  ctx.strokeStyle = 'rgba(11,19,32,0.18)';
  ctx.lineWidth = 1;
  ctx.font = '11px JetBrains Mono, ui-monospace, monospace';
  ctx.textAlign = 'left';

  // Choose a tick interval that makes 4-8 ticks visible.
  const visibleRange = ctx.canvas.height / scale;
  let tickEvery = 10;
  if (visibleRange > 80) tickEvery = 25;
  if (visibleRange > 200) tickEvery = 50;
  if (visibleRange > 500) tickEvery = 100;

  const camAltitude = altitude < 30 ? 0 : altitude - ctx.canvas.height / (3 * scale);
  const startAlt = Math.floor(camAltitude / tickEvery) * tickEvery;
  for (let h = startAlt; h < camAltitude + visibleRange; h += tickEvery) {
    const y = baselineY - (h - camAltitude) * scale;
    if (y < 0 || y > ctx.canvas.height) continue;
    ctx.beginPath();
    ctx.moveTo(4, y);
    ctx.lineTo(28, y);
    ctx.stroke();
    ctx.fillText(`${h} m`, 32, y + 3);
  }
}

function lerpColor(a: [number, number, number], b: [number, number, number], t: number) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ] as [number, number, number];
}
