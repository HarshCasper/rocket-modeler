import type { Engine } from '../domain/types';

interface ThrustCurveProps {
  engine: Engine;
}

const W = 220;
const H = 60;
const PAD_X = 18;
const PAD_Y = 8;

export function ThrustCurve({ engine }: ThrustCurveProps) {
  const peak = Math.max(engine.avThrust1, engine.avThrust2, 0.001);
  const totalImpulse =
    engine.avThrust1 * engine.burnTime1 +
    engine.avThrust2 * Math.max(0, engine.totalBurnTime - engine.burnTime1);
  const scaleX = (W - 2 * PAD_X) / Math.max(0.001, engine.totalBurnTime);
  const scaleY = (H - 2 * PAD_Y) / peak;
  const yFor = (n: number) => H - PAD_Y - n * scaleY;
  const baseline = yFor(0);

  // Step curve: peak from 0 to burnTime1, sustain to totalBurnTime, drop to 0.
  const x0 = PAD_X;
  const x1 = PAD_X + engine.burnTime1 * scaleX;
  const x2 = PAD_X + engine.totalBurnTime * scaleX;
  const peakY = yFor(engine.avThrust1);
  const sustainY = yFor(engine.avThrust2);

  const path =
    `M ${x0} ${baseline} ` +
    `L ${x0} ${peakY} L ${x1} ${peakY} ` +
    `L ${x1} ${sustainY} L ${x2} ${sustainY} ` +
    `L ${x2} ${baseline} Z`;

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-baseline text-[10px] text-ink/50">
        <span className="uppercase tracking-wider">Thrust curve</span>
        <span className="font-mono tabular-nums">
          {totalImpulse.toFixed(1)} N·s
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-16">
        <rect x={0} y={0} width={W} height={H} fill="#F4F7FB" rx={2} />
        <path d={path} fill="#0B3D9133" stroke="#0B3D91" strokeWidth={1.2} />
        <line x1={PAD_X} y1={baseline} x2={W - PAD_X} y2={baseline} stroke="#0B132040" strokeWidth={0.5} />
        <text x={2} y={H - 2} fontSize={8} fill="#0B132080">
          0
        </text>
        <text x={W - 22} y={H - 2} fontSize={8} fill="#0B132080">
          {engine.totalBurnTime.toFixed(2)} s
        </text>
        <text x={2} y={PAD_Y + 3} fontSize={8} fill="#0B132080">
          {engine.avThrust1.toFixed(0)} N
        </text>
      </svg>
    </div>
  );
}
