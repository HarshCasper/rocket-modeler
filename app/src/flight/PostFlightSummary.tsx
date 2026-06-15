import { motion } from 'framer-motion';
import type { FlightSample } from '../domain/types';
import { FlightChart } from './FlightChart';
import { GRAVITY } from '../domain/constants';
import { copyShareLink } from '../url/useUrlSync';
import { pushToast } from '../ui/Toast';

interface PostFlightSummaryProps {
  samples: FlightSample[];
  onClose: () => void;
  onShare?: () => void;
  onReplay?: () => void;
}

async function defaultShare() {
  const ok = await copyShareLink();
  if (ok) pushToast('Share link copied to clipboard', 'success');
  else pushToast('Could not access clipboard', 'error');
}

export function PostFlightSummary({
  samples,
  onClose,
  onShare,
  onReplay,
}: PostFlightSummaryProps) {
  if (samples.length === 0) return null;

  const last = samples[samples.length - 1];
  const maxAlt = samples.reduce((m, s) => Math.max(m, s.altitude), 0);
  const peakSpeed = samples.reduce((m, s) => Math.max(m, s.speed), 0);
  const peakAccelG = samples.reduce((m, s) => Math.max(m, s.acceleration), 0) / GRAVITY;
  const tToApogee = (() => {
    let bestT = 0;
    let bestAlt = 0;
    for (const s of samples) {
      if (s.altitude > bestAlt) {
        bestAlt = s.altitude;
        bestT = s.t;
      }
    }
    return bestT;
  })();
  const totalTime = last.t;

  const crashed = last.phase === 'crashed';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
      className="absolute inset-0 z-10 grid place-items-center bg-ink/30 p-4"
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.24, ease: 'easeOut' }}
        className="bg-white dark:bg-ink rounded-lg shadow-xl border border-nasa/20 dark:border-white/10 w-full max-w-xl p-6 space-y-4 text-ink dark:text-paper"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-nasa dark:text-rocket-tube">
            {crashed ? 'Flight failed' : 'Flight complete'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-ink/40 dark:text-paper/50 hover:text-ink dark:hover:text-paper text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-sm">
          <Stat label="Apogee" value={`${maxAlt.toFixed(1)} m`} highlight />
          <Stat label="Peak speed" value={`${peakSpeed.toFixed(1)} m/s`} />
          <Stat label="Peak g" value={`${peakAccelG.toFixed(1)} g`} />
          <Stat label="To apogee" value={`${tToApogee.toFixed(1)} s`} />
          <Stat label="Flight time" value={`${totalTime.toFixed(1)} s`} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FlightChart samples={samples} field="altitude" label="Altitude" unit="m" color="#0B3D91" />
          <FlightChart samples={samples} field="speed" label="Speed" unit="m/s" color="#D63333" />
          <FlightChart
            samples={samples}
            field="acceleration"
            label="Accel"
            unit="g"
            color="#2E8B57"
            divisor={GRAVITY}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 flex-wrap">
          {onReplay && (
            <button
              type="button"
              onClick={onReplay}
              className="px-4 py-1.5 rounded text-sm font-medium border border-nasa/30 dark:border-rocket-tube/40 text-nasa dark:text-rocket-tube hover:bg-nasa/10 dark:hover:bg-rocket-tube/15"
            >
              ↺ Replay
            </button>
          )}
          <button
            type="button"
            onClick={onShare ?? defaultShare}
            className="px-4 py-1.5 rounded text-sm font-medium border border-nasa/30 dark:border-rocket-tube/40 text-nasa dark:text-rocket-tube hover:bg-nasa/10 dark:hover:bg-rocket-tube/15"
          >
            Copy share link
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded text-sm font-medium bg-nasa text-white hover:bg-nasa-light"
          >
            Done
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        'rounded border px-2.5 py-1.5 min-w-0 ' +
        (highlight
          ? 'bg-nasa text-white border-nasa'
          : 'bg-paper dark:bg-ink/40 border-nasa/15 dark:border-white/10 text-ink dark:text-paper')
      }
    >
      <div
        className={
          'text-[10px] uppercase tracking-wider whitespace-nowrap ' +
          (highlight ? 'text-white/70' : 'text-ink/40 dark:text-paper/50')
        }
      >
        {label}
      </div>
      <div className="font-mono tabular-nums text-sm sm:text-base">{value}</div>
    </div>
  );
}
