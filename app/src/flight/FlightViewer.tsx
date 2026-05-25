import { useEffect, useRef } from 'react';
import type { FlightSample, Rocket } from '../domain/types';

interface FlightViewerProps {
  rocket: Rocket;
  sample: FlightSample | null;
  launchAngle: number;
  countdown: number; // 0 = hidden, else 3,2,1
}

const CANVAS_W = 800;
const CANVAS_H = 520;

export function FlightViewer({ rocket, sample, launchAngle, countdown }: FlightViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cnv = canvasRef.current;
    if (!cnv) return;
    const ctx = cnv.getContext('2d');
    if (!ctx) return;
    draw(ctx, rocket, sample, launchAngle, countdown);
  }, [rocket, sample, launchAngle, countdown]);

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
  const rocketX = W / 2;

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

  // Launch rod.
  const rodLengthPx = 60;
  const rodAngleRad = (launchAngle * Math.PI) / 180;
  const rodBaseX = rocketX - 14;
  const rodBaseY = padBaselineY;
  const rodTipX = rodBaseX + rodLengthPx * Math.cos(rodAngleRad);
  const rodTipY = rodBaseY - rodLengthPx * Math.sin(rodAngleRad);
  ctx.strokeStyle = '#1A1A1A';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(rodBaseX, rodBaseY);
  ctx.lineTo(rodTipX, rodTipY);
  ctx.stroke();

  // Rocket sprite.
  drawRocket(ctx, rocketX, rocketY, rocket, launchAngle, sample);

  // Altitude tick marks down the left edge.
  drawAltitudeTicks(ctx, altitude, scale, padBaselineY);

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

  // Tilt: on the pad we follow launch angle; once flying, derive a heading
  // from velocity vector. 90° = straight up.
  let tiltDeg = launchAngleDeg;
  if (sample && (sample.phase === 'boost' || sample.phase === 'coast')) {
    if (Math.abs(sample.vx) + Math.abs(sample.vy) > 0.1) {
      tiltDeg = (Math.atan2(sample.vy, sample.vx) * 180) / Math.PI;
    }
  }
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

  // nose cone (triangle on top)
  ctx.fillStyle = '#D63333';
  ctx.beginPath();
  ctx.moveTo(-bodyW / 2, -bodyLen / 2);
  ctx.lineTo(0, -bodyLen / 2 - noseLen);
  ctx.lineTo(bodyW / 2, -bodyLen / 2);
  ctx.closePath();
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
