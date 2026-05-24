// High-level runner — used by tests and by the post-flight summary chart.
// Steps the integrator until the rocket lands or a step budget is reached.

import type { FlightConfig, FlightSample, Rocket } from '../domain/types';
import { createSim, ignite, stepSim } from './integrator';

const MAX_STEPS = 4000; // ~180s of sim time

export function runFullFlight(rocket: Rocket, config: FlightConfig): FlightSample[] {
  const sim = createSim(rocket, config);
  ignite(sim);
  const samples: FlightSample[] = [];
  for (let i = 0; i < MAX_STEPS; i++) {
    const s = stepSim(sim);
    samples.push(s);
    if (s.phase === 'landed' || s.phase === 'crashed') break;
  }
  return samples;
}

export function apogee(samples: FlightSample[]): number {
  let max = 0;
  for (const s of samples) if (s.altitude > max) max = s.altitude;
  return max;
}

export function peakSpeed(samples: FlightSample[]): number {
  let max = 0;
  for (const s of samples) if (s.speed > max) max = s.speed;
  return max;
}
