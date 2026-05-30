import { useMemo } from 'react';
import { useAppStore } from '../state/store';
import { computeStageCg } from '../physics/cg';
import { computeCpForRocket } from '../physics/cp-barrowman';
import { HelpTip } from '../ui/HelpTip';

const CALIBER_HELP =
  'Static margin in calibers: (CP − CG) / body diameter. Hobby convention: 1.0–2.5 is comfortable, below 1 is twitchy, above 2.5 weathercocks into wind.';

type Verdict = 'unstable' | 'marginal' | 'stable' | 'overstable';

// Hobby-rocket rule of thumb: 1.0–2.5 caliber is the comfortable band. Below
// 1.0 is twitchy and may tumble in gusts; above 2.5 the rocket weathercocks
// into wind on the way up.
function verdictFor(caliber: number): Verdict {
  if (caliber < 0) return 'unstable';
  if (caliber < 1.0) return 'marginal';
  if (caliber > 2.5) return 'overstable';
  return 'stable';
}

const COLOR: Record<Verdict, string> = {
  unstable: '#C0392B',
  marginal: '#E0A116',
  stable: '#2E8B57',
  overstable: '#E0A116',
};

const LABEL: Record<Verdict, string> = {
  unstable: 'UNSTABLE',
  marginal: 'MARGINAL',
  stable: 'STABLE',
  overstable: 'OVERSTABLE',
};

export function StabilityGauge() {
  const rocket = useAppStore((s) => s.rocket);
  const stagesShowing = useAppStore((s) => s.stagesShowing);

  const { cg, cp, caliber } = useMemo(() => {
    const cgRes = computeStageCg(rocket, stagesShowing);
    const cpRes = computeCpForRocket(rocket);
    const cal = (cgRes.cg - cpRes.cp) / rocket.body.diameter;
    return { cg: cgRes.cg, cp: cpRes.cp, caliber: cal };
  }, [rocket, stagesShowing]);

  const verdict = verdictFor(caliber);
  const rangeLo = Math.min(-1, Math.floor(caliber - 0.3));
  const rangeHi = Math.max(3, Math.ceil(caliber + 0.3));
  const span = rangeHi - rangeLo;
  const fillPercent = ((caliber - rangeLo) / span) * 100;
  const zoneStop = (v: number) => ((v - rangeLo) / span) * 100;
  const stops = {
    unstableEnd: zoneStop(0),
    marginalEnd: zoneStop(1.0),
    stableEnd: zoneStop(2.5),
  };
  const ticks: number[] = [];
  for (let t = rangeLo; t <= rangeHi; t++) ticks.push(t);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-mono tracking-wider"
          style={{
            backgroundColor: COLOR[verdict] + '20',
            color: COLOR[verdict],
            border: `1px solid ${COLOR[verdict]}50`,
          }}
        >
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: COLOR[verdict] }}
          />
          {LABEL[verdict]}
        </span>
        <span className="font-mono tabular-nums text-ink flex items-center gap-1">
          {caliber.toFixed(2)} cal
          <HelpTip text={CALIBER_HELP} align="right" />
        </span>
      </div>
      <div className="relative h-2 rounded-full bg-paper overflow-hidden border border-nasa/10">
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(90deg,
              #C0392B 0%,
              #C0392B ${stops.unstableEnd}%,
              #E0A116 ${stops.unstableEnd}%,
              #E0A116 ${stops.marginalEnd}%,
              #2E8B57 ${stops.marginalEnd}%,
              #2E8B57 ${stops.stableEnd}%,
              #E0A116 ${stops.stableEnd}%,
              #E0A116 100%)`,
            opacity: 0.25,
          }}
        />
        <div
          className="absolute top-0 h-full w-[3px] bg-ink rounded-full transition-all"
          style={{ left: `calc(${fillPercent}% - 1.5px)` }}
        />
      </div>
      <div className="relative h-3 text-[10px] text-ink/40 font-mono tabular-nums">
        {ticks.map((t) => (
          <span
            key={t}
            className="absolute -translate-x-1/2"
            style={{ left: `${zoneStop(t)}%` }}
          >
            {t < 0 ? `−${Math.abs(t)}` : t}
          </span>
        ))}
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-ink/60">
          CG <span className="font-mono tabular-nums text-ink">{cg.toFixed(1)}</span> cm
        </span>
        <span className="text-ink/60">
          CP <span className="font-mono tabular-nums text-ink">{cp.toFixed(1)}</span> cm
        </span>
      </div>
    </div>
  );
}
