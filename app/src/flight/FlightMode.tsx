import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore } from '../state/store';
import { FlightViewer } from './FlightViewer';
import { FlightHUD } from './FlightHUD';
import { FlightControls } from './FlightControls';
import { PostFlightSummary } from './PostFlightSummary';
import { useSimulation } from './useSimulation';
import { isTypingTarget } from '../ui/keyboard';
import type { FlightSample } from '../domain/types';

interface ReplayState {
  index: number;
  playing: boolean;
  startedAt: number;
  startedAtSimTime: number;
}

const REPLAY_SPEED = 1.0; // 1 second of real time renders 1 second of flight

export function FlightMode() {
  const rocket = useAppStore((s) => s.rocket);
  const flight = useAppStore((s) => s.flight);
  const dark = useAppStore((s) => s.dark);
  const showForces = useAppStore((s) => s.showForces);
  const sim = useSimulation({ rocket, config: flight });

  const [summaryOpen, setSummaryOpen] = useState(false);
  const [replay, setReplay] = useState<ReplayState | null>(null);
  const replayRafRef = useRef<number | null>(null);

  useEffect(() => {
    if (sim.runState === 'ended' && sim.samples.length > 0) {
      setSummaryOpen(true);
    }
  }, [sim.runState, sim.samples.length]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      if (e.key === ' ') {
        e.preventDefault();
        if (replay) {
          setReplay((r) => (r ? { ...r, playing: !r.playing } : r));
          return;
        }
        if (sim.runState === 'idle' || sim.runState === 'ended') {
          setSummaryOpen(false);
          sim.start();
        } else if (sim.runState === 'running') {
          sim.pause();
        } else if (sim.runState === 'paused') {
          sim.resume();
        }
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        setSummaryOpen(false);
        stopReplay();
        sim.reset();
      } else if (e.key === 'Escape' && replay) {
        stopReplay();
        setSummaryOpen(true);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sim, replay]);

  const stopReplay = useCallback(() => {
    if (replayRafRef.current !== null) {
      cancelAnimationFrame(replayRafRef.current);
      replayRafRef.current = null;
    }
    setReplay(null);
  }, []);

  // Replay rAF loop. When `playing` is true, advance the index based on real
  // elapsed time scaled by REPLAY_SPEED.
  useEffect(() => {
    if (!replay || !replay.playing) return;
    function step(now: number) {
      setReplay((current) => {
        if (!current || !current.playing) return current;
        const targetSimT =
          current.startedAtSimTime + (now - current.startedAt) * 0.001 * REPLAY_SPEED;
        let i = current.index;
        while (i < sim.samples.length - 1 && sim.samples[i].t < targetSimT) i++;
        if (i >= sim.samples.length - 1) {
          return { ...current, index: sim.samples.length - 1, playing: false };
        }
        return { ...current, index: i };
      });
      replayRafRef.current = requestAnimationFrame(step);
    }
    replayRafRef.current = requestAnimationFrame(step);
    return () => {
      if (replayRafRef.current !== null) cancelAnimationFrame(replayRafRef.current);
    };
  }, [replay?.playing, sim.samples]);

  function startReplay() {
    setSummaryOpen(false);
    setReplay({
      index: 0,
      playing: true,
      startedAt: performance.now(),
      startedAtSimTime: 0,
    });
  }

  function seekReplay(index: number) {
    setReplay((r) =>
      r
        ? {
            ...r,
            index,
            startedAt: performance.now(),
            startedAtSimTime: sim.samples[index]?.t ?? 0,
          }
        : r,
    );
  }

  const viewerSample: FlightSample | null = replay
    ? (sim.samples[replay.index] ?? null)
    : sim.sample;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 p-4 h-full">
      <section className="relative rounded-lg border border-nasa/15 bg-white shadow-sm overflow-hidden dark:bg-ink dark:border-white/10 min-h-[520px]">
        <FlightViewer
          rocket={rocket}
          sample={viewerSample}
          launchAngle={flight.launchAngle}
          countdown={replay ? 0 : sim.countdown}
          windSpeed={flight.windSpeed}
          showForces={showForces}
          dark={dark}
        />
        {replay && (
          <ReplayBar
            index={replay.index}
            samples={sim.samples}
            playing={replay.playing}
            onTogglePlay={() =>
              setReplay((r) =>
                r ? { ...r, playing: !r.playing, startedAt: performance.now(), startedAtSimTime: sim.samples[r.index]?.t ?? 0 } : r,
              )
            }
            onSeek={seekReplay}
            onExit={() => {
              stopReplay();
              setSummaryOpen(true);
            }}
          />
        )}
        {summaryOpen && !replay && (
          <PostFlightSummary
            samples={sim.samples}
            onClose={() => setSummaryOpen(false)}
            onReplay={startReplay}
          />
        )}
      </section>
      <aside className="rounded-lg border border-nasa/15 bg-white shadow-sm p-4 space-y-4 overflow-y-auto dark:bg-ink/80 dark:border-white/10 dark:text-paper">
        <FlightHUD sample={viewerSample} maxAlt={sim.maxAlt} />
        <FlightControls
          runState={sim.runState}
          phase={sim.sample?.phase}
          onStart={() => {
            setSummaryOpen(false);
            stopReplay();
            sim.start();
          }}
          onPause={sim.pause}
          onResume={sim.resume}
          onReset={() => {
            setSummaryOpen(false);
            stopReplay();
            sim.reset();
          }}
          onSkipToLanding={sim.skipToLanding}
        />
      </aside>
    </div>
  );
}

interface ReplayBarProps {
  index: number;
  samples: FlightSample[];
  playing: boolean;
  onTogglePlay: () => void;
  onSeek: (index: number) => void;
  onExit: () => void;
}

function ReplayBar({ index, samples, playing, onTogglePlay, onSeek, onExit }: ReplayBarProps) {
  const current = samples[index];
  const total = samples[samples.length - 1]?.t ?? 0;
  // Slider is keyed off time so dragging is intuitive even when descent
  // samples vastly outnumber boost samples.
  const currentT = current?.t ?? 0;
  function seekToTime(t: number) {
    let lo = 0;
    let hi = samples.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (samples[mid].t < t) lo = mid + 1;
      else hi = mid;
    }
    onSeek(lo);
  }
  return (
    <div className="absolute left-4 right-4 bottom-4 bg-white/95 dark:bg-ink/90 border border-nasa/20 dark:border-white/15 rounded-lg shadow-md px-3 py-2 flex items-center gap-3 text-xs text-ink dark:text-paper">
      <button
        type="button"
        onClick={onTogglePlay}
        className="w-7 h-7 rounded-full bg-nasa text-white grid place-items-center"
        aria-label={playing ? 'Pause replay' : 'Play replay'}
      >
        {playing ? '❚❚' : '▶'}
      </button>
      <span className="font-mono tabular-nums w-12 text-right">
        {currentT.toFixed(1)}s
      </span>
      <input
        type="range"
        min={0}
        max={total}
        step={0.05}
        value={currentT}
        onChange={(e) => seekToTime(parseFloat(e.target.value))}
        className="flex-1 accent-nasa"
        aria-label="Replay scrub bar"
      />
      <span className="font-mono tabular-nums w-12">
        {total.toFixed(1)}s
      </span>
      <button
        type="button"
        onClick={onExit}
        className="text-ink/50 dark:text-paper/50 hover:text-ink dark:hover:text-paper px-1"
        aria-label="Exit replay"
      >
        ×
      </button>
    </div>
  );
}
