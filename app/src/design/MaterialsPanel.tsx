import { useAppStore } from '../state/store';
import { FIN_MATERIALS, MATERIALS, NOSE_CONE_MATERIALS } from '../domain/materials';
import type { MaterialId } from '../domain/types';
import { SliderField } from '../ui/SliderField';

export function MaterialsPanel() {
  const rocket = useAppStore((s) => s.rocket);
  const updateRocket = useAppStore((s) => s.updateRocket);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-nasa">Materials</h3>

      <div className="space-y-2">
        <label className="text-xs font-medium text-ink/70">Nose cone</label>
        <div className="flex flex-wrap gap-1.5">
          {NOSE_CONE_MATERIALS.map((id) => (
            <Chip
              key={id}
              active={rocket.noseCone.materialId === id}
              label={MATERIALS[id].label}
              onClick={() =>
                updateRocket((r) => ({
                  ...r,
                  noseCone: { ...r.noseCone, materialId: id as MaterialId },
                }))
              }
            />
          ))}
        </div>
        {rocket.noseCone.materialId === 'custom' && (
          <SliderField
            label="Custom nose density"
            value={rocket.noseCone.customDensity ?? MATERIALS.custom.density}
            min={0.05}
            max={5.0}
            step={0.01}
            unit="g/cm³"
            onChange={(v) =>
              updateRocket((r) => ({
                ...r,
                noseCone: { ...r.noseCone, customDensity: v },
              }))
            }
          />
        )}
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-ink/70">Fins</label>
        <div className="flex flex-wrap gap-1.5">
          {FIN_MATERIALS.map((id) => (
            <Chip
              key={id}
              active={rocket.fins.materialId === id}
              label={MATERIALS[id].label}
              onClick={() =>
                updateRocket((r) => ({
                  ...r,
                  fins: { ...r.fins, materialId: id as MaterialId },
                }))
              }
            />
          ))}
        </div>
        <div className="space-y-1">
          <label className="text-xs text-ink/50">Thickness</label>
          <div className="inline-flex rounded-full border border-nasa/20 p-0.5 bg-paper">
            {([0.125, 0.25] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() =>
                  updateRocket((r) => ({
                    ...r,
                    fins: { ...r.fins, thicknessInches: t },
                  }))
                }
                className={
                  'px-3 py-0.5 rounded-full text-xs font-medium transition-colors ' +
                  (rocket.fins.thicknessInches === t
                    ? 'bg-nasa text-white'
                    : 'text-nasa hover:bg-nasa/10')
                }
              >
                {t === 0.125 ? '1/8″' : '1/4″'}
              </button>
            ))}
          </div>
        </div>
        {rocket.fins.materialId === 'custom' && (
          <SliderField
            label="Custom fin density"
            value={rocket.fins.customDensity ?? MATERIALS.custom.density}
            min={0.05}
            max={5.0}
            step={0.01}
            unit="g/cm³"
            onChange={(v) =>
              updateRocket((r) => ({
                ...r,
                fins: { ...r.fins, customDensity: v },
              }))
            }
          />
        )}
      </div>
    </div>
  );
}

function Chip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors border ' +
        (active
          ? 'bg-nasa text-white border-nasa'
          : 'text-ink/70 bg-paper border-nasa/15 hover:border-nasa/40')
      }
    >
      {label}
    </button>
  );
}
