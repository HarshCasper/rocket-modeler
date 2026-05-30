import type { FlightSample } from '../domain/types';
import { num } from '../ui/format';
import { GRAVITY } from '../domain/constants';

interface FlightHUDProps {
  sample: FlightSample | null;
  maxAlt: number;
}

export function FlightHUD({ sample, maxAlt }: FlightHUDProps) {
  const accelG = sample ? sample.acceleration / GRAVITY : 0;
  return (
    <div className="grid grid-cols-2 gap-3">
      <Cell label="Time" value={`${num(sample?.t ?? 0, 2)} s`} />
      <Cell label="Phase" value={(sample?.phase ?? 'idle').toUpperCase()} accent />
      <Cell label="Altitude" value={`${num(sample?.altitude ?? 0, 1)} m`} />
      <Cell label="Speed" value={`${num(sample?.speed ?? 0, 1)} m/s`} />
      <Cell label="Max alt" value={`${num(maxAlt, 1)} m`} accent />
      <Cell label="Accel" value={`${num(accelG, 1)} g`} />
      <Cell
        label="Stage"
        value={sample ? `${sample.activeStage + 1}` : '—'}
      />
      <Cell
        label="Mass"
        value={sample ? `${num(sample.mass, 1)} g` : '—'}
      />
    </div>
  );
}

function Cell({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={
        'rounded border px-2 py-1.5 ' +
        (accent ? 'bg-nasa text-white border-nasa' : 'bg-paper border-nasa/15 text-ink')
      }
    >
      <div
        className={
          'text-[10px] uppercase tracking-wider ' + (accent ? 'text-white/70' : 'text-ink/40')
        }
      >
        {label}
      </div>
      <div className="font-mono tabular-nums text-base">{value}</div>
    </div>
  );
}
