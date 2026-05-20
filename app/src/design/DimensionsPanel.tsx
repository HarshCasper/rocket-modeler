import { useAppStore } from '../state/store';
import { SliderField } from '../ui/SliderField';

export function DimensionsPanel() {
  const rocket = useAppStore((s) => s.rocket);
  const updateRocket = useAppStore((s) => s.updateRocket);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-nasa">Geometry</h3>

      <SliderField
        label="Body length"
        value={rocket.body.length}
        min={10}
        max={100}
        step={0.5}
        unit="cm"
        onChange={(v) =>
          updateRocket((r) => ({ ...r, body: { ...r.body, length: v } }))
        }
      />
      <SliderField
        label="Body diameter"
        value={rocket.body.diameter}
        min={1.4}
        max={6.0}
        step={0.1}
        unit="cm"
        onChange={(v) =>
          updateRocket((r) => ({ ...r, body: { ...r.body, diameter: v } }))
        }
      />
      <SliderField
        label="Nose cone length"
        value={rocket.noseCone.length}
        min={4.0}
        max={30.0}
        step={0.5}
        unit="cm"
        onChange={(v) =>
          updateRocket((r) => ({ ...r, noseCone: { ...r.noseCone, length: v } }))
        }
      />
      <SliderField
        label="Fin length"
        value={rocket.fins.length}
        min={4.0}
        max={50.0}
        step={0.5}
        unit="cm"
        onChange={(v) =>
          updateRocket((r) => ({ ...r, fins: { ...r.fins, length: v } }))
        }
      />
      <SliderField
        label="Fin width"
        value={rocket.fins.width}
        min={2.0}
        max={20.0}
        step={0.5}
        unit="cm"
        onChange={(v) =>
          updateRocket((r) => ({ ...r, fins: { ...r.fins, width: v } }))
        }
      />
      <SliderField
        label="Fin height (offset)"
        value={rocket.fins.height}
        min={0}
        max={50.0}
        step={0.5}
        unit="cm"
        onChange={(v) =>
          updateRocket((r) => ({ ...r, fins: { ...r.fins, height: v } }))
        }
      />

      <div className="pt-2 space-y-2">
        <div className="text-xs font-medium text-ink/70">Fin count</div>
        <div className="inline-flex rounded-full border border-nasa/20 p-0.5 bg-paper">
          {[3, 4].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => updateRocket((r) => ({ ...r, finCount: n as 3 | 4 }))}
              className={
                'px-3 py-0.5 rounded-full text-xs font-medium transition-colors ' +
                (rocket.finCount === n
                  ? 'bg-nasa text-white'
                  : 'text-nasa hover:bg-nasa/10')
              }
            >
              {n} fins
            </button>
          ))}
        </div>
      </div>

      <div className="pt-2 space-y-2">
        <div className="text-xs font-medium text-ink/70">Stages</div>
        <div className="inline-flex rounded-full border border-nasa/20 p-0.5 bg-paper">
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() =>
                updateRocket((r) => {
                  const next = { ...r, numStages: n as 1 | 2 | 3 };
                  // Ensure we have enough engine slots (booster engines for lower stages).
                  const ids = r.engineIds.slice() as [string, string?, string?];
                  while (ids.length < n) ids.push('B6-0');
                  ids.length = n;
                  next.engineIds = ids as [string, string?, string?];
                  return next;
                })
              }
              className={
                'px-3 py-0.5 rounded-full text-xs font-medium transition-colors ' +
                (rocket.numStages === n
                  ? 'bg-nasa text-white'
                  : 'text-nasa hover:bg-nasa/10')
              }
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
