import { useAppStore } from '../state/store';
import { ENGINES, enginesForStage } from '../domain/engines';
import { SliderField } from '../ui/SliderField';

export function EnginesPanel() {
  const rocket = useAppStore((s) => s.rocket);
  const updateRocket = useAppStore((s) => s.updateRocket);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-nasa">Engines & recovery</h3>

      {Array.from({ length: rocket.numStages }).map((_, idx) => {
        const isBooster = idx < rocket.numStages - 1;
        const options = enginesForStage({
          bodyDiameterCm: rocket.body.diameter,
          isBoosterStage: isBooster,
        });
        const fallback = options.length ? options[0].id : ENGINES[0].id;
        const current = rocket.engineIds[idx] ?? fallback;
        return (
          <div key={idx} className="space-y-1">
            <label className="text-xs font-medium text-ink/70">
              Stage {idx + 1} engine{isBooster ? ' (booster)' : ''}
            </label>
            <select
              value={current}
              onChange={(e) =>
                updateRocket((r) => {
                  const ids = r.engineIds.slice() as [string, string?, string?];
                  ids[idx] = e.target.value;
                  return { ...r, engineIds: ids };
                })
              }
              className="w-full text-sm bg-paper border border-nasa/15 rounded px-2 py-1 focus:outline-none focus:border-nasa"
            >
              {options.map((eng) => (
                <option key={eng.id} value={eng.id}>
                  {eng.name} — {eng.avThrust1}N peak, {eng.totalBurnTime}s burn
                </option>
              ))}
              {options.length === 0 && (
                <option value="">no compatible engine (body too narrow)</option>
              )}
            </select>
          </div>
        );
      })}

      <SliderField
        label="Recovery payload mass"
        value={rocket.recoveryPayloadMass}
        min={0}
        max={500}
        step={1}
        unit="g"
        onChange={(v) => updateRocket((r) => ({ ...r, recoveryPayloadMass: v }))}
      />

      <div className="space-y-1">
        <label className="text-xs font-medium text-ink/70">Parachute diameter</label>
        <div className="inline-flex rounded-full border border-nasa/20 p-0.5 bg-paper">
          {[0.3, 0.6, 0.9].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => updateRocket((r) => ({ ...r, parachuteDiameter: d as 0.3 | 0.6 | 0.9 }))}
              className={
                'px-3 py-0.5 rounded-full text-xs font-medium transition-colors ' +
                (rocket.parachuteDiameter === d
                  ? 'bg-nasa text-white'
                  : 'text-nasa hover:bg-nasa/10')
              }
            >
              {Math.round(d * 100)} cm
            </button>
          ))}
        </div>
      </div>

      <SliderField
        label="Drag coefficient"
        value={rocket.dragCoefficient}
        min={0.1}
        max={1.5}
        step={0.05}
        onChange={(v) => updateRocket((r) => ({ ...r, dragCoefficient: v }))}
      />
    </div>
  );
}
