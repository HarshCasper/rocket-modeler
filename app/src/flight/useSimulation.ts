import { useEffect, useRef, useState, useCallback } from 'react';
import type { FlightConfig, FlightSample, Rocket } from '../domain/types';
import { createSim, ignite, stepSim, type FlightSim } from '../physics/integrator';
import { FLIGHT_DELTA_T } from '../domain/constants';
import { playCountdownBeep, startThruster, stopThruster } from './audio';

export type RunState = 'idle' | 'countdown' | 'running' | 'paused' | 'ended';

interface UseSimulationArgs {
  rocket: Rocket;
  config: FlightConfig;
}

export interface SimulationHandle {
  sample: FlightSample | null;
  samples: FlightSample[]; // recorded trace, for post-flight charts
  runState: RunState;
  countdown: number; // 3, 2, 1, 0
  maxAlt: number;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
}

export function useSimulation({ rocket, config }: UseSimulationArgs): SimulationHandle {
  const simRef = useRef<FlightSim | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);
  const accumulatedRef = useRef<number>(0);
  const [sample, setSample] = useState<FlightSample | null>(null);
  const samplesRef = useRef<FlightSample[]>([]);
  const [samplesSnapshot, setSamplesSnapshot] = useState<FlightSample[]>([]);
  const [runState, setRunState] = useState<RunState>('idle');
  const [countdown, setCountdown] = useState(0);
  const [maxAlt, setMaxAlt] = useState(0);

  // Re-create sim whenever rocket or initial config changes while idle.
  useEffect(() => {
    if (runState === 'idle' || runState === 'ended') {
      simRef.current = createSim(rocket, config);
      setSample(null);
      setMaxAlt(0);
    }
  }, [rocket, config, runState]);

  const stop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const loop = useCallback(
    (timestamp: number) => {
      const sim = simRef.current;
      if (!sim) return;
      const last = lastTickRef.current || timestamp;
      const realDt = (timestamp - last) / 1000;
      lastTickRef.current = timestamp;

      // Speed up or slow down sim time per timeScale.
      accumulatedRef.current += realDt * config.timeScale;

      let next: FlightSample | null = null;
      while (accumulatedRef.current >= FLIGHT_DELTA_T) {
        next = stepSim(sim);
        samplesRef.current.push(next);
        accumulatedRef.current -= FLIGHT_DELTA_T;
        if (next.altitude > maxAlt) setMaxAlt(next.altitude);
        if (next.phase === 'landed' || next.phase === 'crashed') {
          break;
        }
      }
      if (next) {
        setSample(next);
        if (next.phase !== 'boost') stopThruster();
        if (next.phase === 'landed' || next.phase === 'crashed') {
          setRunState('ended');
          setSamplesSnapshot(samplesRef.current.slice());
          stop();
          stopThruster();
          return;
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    },
    [config.timeScale, maxAlt, stop],
  );

  const start = useCallback(() => {
    if (runState !== 'idle' && runState !== 'ended') return;
    simRef.current = createSim(rocket, config);
    setSample(null);
    setMaxAlt(0);
    samplesRef.current = [];
    setSamplesSnapshot([]);
    accumulatedRef.current = 0;
    setRunState('countdown');
    setCountdown(3);

    let n = 3;
    const tick = () => {
      if (n > 0) {
        setCountdown(n);
        if (config.soundEnabled) playCountdownBeep(false);
        n -= 1;
        setTimeout(tick, 1000);
      } else {
        setCountdown(0);
        if (config.soundEnabled) {
          playCountdownBeep(true);
          startThruster();
        }
        if (simRef.current) ignite(simRef.current);
        setRunState('running');
        lastTickRef.current = 0;
        rafRef.current = requestAnimationFrame(loop);
      }
    };
    tick();
  }, [rocket, config, runState, loop]);

  const pause = useCallback(() => {
    if (runState !== 'running') return;
    setRunState('paused');
    stop();
  }, [runState, stop]);

  const resume = useCallback(() => {
    if (runState !== 'paused') return;
    setRunState('running');
    lastTickRef.current = 0;
    rafRef.current = requestAnimationFrame(loop);
  }, [runState, loop, stop]);

  const reset = useCallback(() => {
    stop();
    stopThruster();
    simRef.current = createSim(rocket, config);
    setSample(null);
    setMaxAlt(0);
    setCountdown(0);
    setRunState('idle');
    samplesRef.current = [];
    setSamplesSnapshot([]);
    accumulatedRef.current = 0;
  }, [rocket, config, stop]);

  useEffect(() => () => stop(), [stop]);

  return {
    sample,
    samples: samplesSnapshot,
    runState,
    countdown,
    maxAlt,
    start,
    pause,
    resume,
    reset,
  };
}
