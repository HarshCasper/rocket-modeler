import { useMemo } from 'react';
import { useAppStore } from '../state/store';
import { computeStageCg } from '../physics/cg';
import { computeCpForRocket } from '../physics/cp-barrowman';
import { cm, grams } from '../ui/format';
import { StabilityGauge } from './StabilityGauge';
import { StageInspector } from './StageInspector';
import { HelpTip } from '../ui/HelpTip';

const CG_HELP =
  'Center of gravity, measured from the bottom of the rocket. Where the rocket would balance on a fingertip.';
const CP_HELP =
  'Center of pressure, the aerodynamic balance point. For a stable rocket, CP must sit behind CG (closer to the tail).';
const MASS_HELP = 'Total wet mass — airframe, fins, payload, and fully fueled engines.';

export function MetricsReadout() {
  const rocket = useAppStore((s) => s.rocket);
  const stagesShowing = useAppStore((s) => s.stagesShowing);

  const { cg, totalMassG, cp } = useMemo(() => {
    const cgRes = computeStageCg(rocket, stagesShowing);
    const cpRes = computeCpForRocket(rocket);
    return { cg: cgRes.cg, totalMassG: cgRes.totalMassG, cp: cpRes.cp };
  }, [rocket, stagesShowing]);

  return (
    <div className="space-y-3">
      <StageInspector />
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <Metric label="CG" value={cm(cg)} help={CG_HELP} />
        <Metric label="CP" value={cm(cp)} help={CP_HELP} />
        <Metric label="Mass" value={grams(totalMassG)} help={MASS_HELP} />
      </div>
      <StabilityGauge />
    </div>
  );
}

function Metric({ label, value, help }: { label: string; value: string; help?: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-ink/40 flex items-center gap-1">
        {label}
        {help && <HelpTip text={help} />}
      </div>
      <div className="font-mono tabular-nums text-base text-ink">{value}</div>
    </div>
  );
}
