import { useAppStore } from '../state/store';
import { SliderField } from '../ui/SliderField';
import type { RunState } from './useSimulation';

interface FlightControlsProps {
  runState: RunState;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
}

export function FlightControls({
  runState,
  onStart,
  onPause,
  onResume,
  onReset,
}: FlightControlsProps) {
  const flight = useAppStore((s) => s.flight);
  const updateFlight = useAppStore((s) => s.updateFlight);

  const canLaunch = runState === 'idle' || runState === 'ended';
  const canPause = runState === 'running';
  const canResume = runState === 'paused';

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onStart}
          disabled={!canLaunch}
          className="flex-1 bg-stability-bad text-white text-sm font-semibold px-3 py-2 rounded shadow-sm disabled:opacity-40 hover:brightness-110"
        >
          ▶ Launch
        </button>
        {canPause && (
          <button
            type="button"
            onClick={onPause}
            className="px-3 py-2 rounded border border-stability-warn text-stability-warn font-medium text-sm hover:bg-stability-warn/10"
          >
            ⏸
          </button>
        )}
        {canResume && (
          <button
            type="button"
            onClick={onResume}
            className="px-3 py-2 rounded border border-stability-good text-stability-good font-medium text-sm hover:bg-stability-good/10"
          >
            ▶
          </button>
        )}
        <button
          type="button"
          onClick={onReset}
          className="px-3 py-2 rounded border border-ink/20 text-ink/70 font-medium text-sm hover:bg-ink/5"
        >
          ↺
        </button>
      </div>

      <SliderField
        label="Launch angle"
        value={flight.launchAngle}
        min={60}
        max={90}
        step={1}
        unit="°"
        onChange={(v) => updateFlight((f) => ({ ...f, launchAngle: v }))}
        disabled={!canLaunch}
      />
      <SliderField
        label="Wind speed"
        value={flight.windSpeed}
        min={-10}
        max={10}
        step={0.1}
        unit="m/s"
        onChange={(v) => updateFlight((f) => ({ ...f, windSpeed: v }))}
        disabled={!canLaunch}
      />
      <SliderField
        label="Time scale"
        value={flight.timeScale}
        min={0.1}
        max={4}
        step={0.1}
        unit="×"
        onChange={(v) => updateFlight((f) => ({ ...f, timeScale: v }))}
      />
    </div>
  );
}
