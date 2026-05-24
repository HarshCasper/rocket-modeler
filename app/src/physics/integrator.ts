// Flight integrator. Semi-Euler with sub-steps, matching the original applet's
// pattern (RocketParams + LaunchCanvas.calcdistance/calcaltitude).

import type { Engine, FlightConfig, FlightPhase, FlightSample, Rocket } from '../domain/types';
import { airDensity } from './atmosphere-isa';
import {
  FLIGHT_DELTA_T,
  GRAVITY,
  PARACHUTE_DRAG_COEFFICIENT,
  SUB_STEPS_PER_FRAME,
} from '../domain/constants';
import { getEngine } from '../domain/engines';
import { computeStageCg } from './cg';
import { computeCpForRocket } from './cp-barrowman';

interface InternalState {
  t: number;
  altitude: number; // m above pad
  xDist: number; // m horizontal from pad
  vy: number; // m/s
  vx: number;
  tiltDeg: number; // 0..360, measured CCW from +x (90 = straight up)
  activeStage: 0 | 1 | 2;
  stageStartT: number; // time when current stage ignited
  phase: FlightPhase;
  maxAlt: number;
  unstable: boolean;
}

export interface FlightSim {
  rocket: Rocket;
  config: FlightConfig;
  state: InternalState;
  engines: Engine[]; // resolved bottom-up
  dryMassByStage: number[]; // grams of "everything still attached" per stage active
  initialMargin: number;
}

function dryMassForStage(rocket: Rocket, stageIdx: number): number {
  // Mass of everything that will still be attached when stage `stageIdx` is firing.
  // We compute by summing engine masses (including this one) plus the structure
  // from computeStageCg using stagesShowing = numStages - stageIdx.
  const stagesShowing = (rocket.numStages - stageIdx) as 1 | 2 | 3;
  return computeStageCg(rocket, stagesShowing).totalMassG;
}

export function createSim(rocket: Rocket, config: FlightConfig): FlightSim {
  const engines: Engine[] = [];
  for (let i = 0; i < rocket.numStages; i++) {
    const id = rocket.engineIds[i];
    if (id) engines.push(getEngine(id));
  }
  const dryMassByStage = engines.map((_, i) => dryMassForStage(rocket, i));

  const { cg } = computeStageCg(rocket, rocket.numStages);
  const { cp } = computeCpForRocket(rocket);
  const margin = (cg - cp) / rocket.body.diameter;

  return {
    rocket,
    config,
    engines,
    dryMassByStage,
    initialMargin: margin,
    state: {
      t: 0,
      altitude: 0,
      xDist: 0,
      vy: 0,
      vx: 0,
      tiltDeg: config.launchAngle,
      activeStage: 0,
      stageStartT: 0,
      phase: 'pad',
      maxAlt: 0,
      unstable: margin < 0,
    },
  };
}

function thrustNow(engine: Engine, elapsed: number): number {
  if (elapsed < 0) return 0;
  if (elapsed < engine.burnTime1) return engine.avThrust1;
  if (elapsed < engine.totalBurnTime) return engine.avThrust2;
  return 0;
}

function currentMass(sim: FlightSim): number {
  const s = sim.state;
  const stageIdx = s.activeStage;
  const dry = sim.dryMassByStage[stageIdx];
  const engine = sim.engines[stageIdx];
  if (!engine) return dry / 1000;
  const elapsed = s.t - s.stageStartT;
  // Fuel burns linearly through totalBurnTime.
  const fuelLeft = engine.fuelMass * (1 - elapsed / engine.totalBurnTime);
  return (dry - engine.fuelMass + fuelLeft) / 1000; // kg
}

function dragArea(rocket: Rocket, underChute: boolean): number {
  if (underChute) {
    const r = rocket.parachuteDiameter / 2;
    return Math.PI * r * r;
  }
  const rough = rocket.body.diameter / 100; // cm to m
  return Math.PI * rough * rough;
}

export function stepSim(sim: FlightSim): FlightSample {
  const s = sim.state;
  const rocket = sim.rocket;

  if (s.phase === 'landed' || s.phase === 'crashed') {
    return toSample(sim, currentMass(sim), 0);
  }

  // Tipoff: if at-ignition margin was negative, tip over progressively.
  if (s.unstable && s.phase !== 'pad') {
    s.tiltDeg -= 1;
    if (s.tiltDeg < 0) s.tiltDeg += 360;
  }

  if (s.phase === 'pad') {
    // Hold until launch is triggered externally.
    return toSample(sim, currentMass(sim), 0);
  }

  const stepDt = FLIGHT_DELTA_T / SUB_STEPS_PER_FRAME;
  let appliedThrust = 0;

  for (let i = 0; i < SUB_STEPS_PER_FRAME; i++) {
    s.t += stepDt;
    const elapsed = s.t - s.stageStartT;
    const engine = sim.engines[s.activeStage];

    // Phase transitions inside the sub-step loop.
    if (s.phase === 'boost' && engine && elapsed >= engine.totalBurnTime) {
      if (s.activeStage + 1 < sim.engines.length) {
        // Stage transition: drop booster, ignite next stage.
        const droppedEngine = engine;
        s.activeStage = (s.activeStage + 1) as 0 | 1 | 2;
        s.stageStartT = s.t;
        // Re-compute dry mass for new active stage (already in array).
        // No instantaneous velocity change in our simplified model.
        void droppedEngine;
      } else {
        s.phase = 'coast';
      }
    } else if (s.phase === 'coast' && engine && elapsed >= engine.totalBurnTime + engine.delayTime) {
      s.phase = 'descent';
      // Parachute opens — slow horizontal motion too.
    }

    const mass = currentMass(sim);
    const thrust =
      s.phase === 'boost' && engine ? thrustNow(engine, elapsed) : 0;
    appliedThrust = thrust;

    // Direction of thrust = current tilt.
    const tiltRad = (s.tiltDeg * Math.PI) / 180;
    const thrustVx = thrust * Math.cos(tiltRad);
    const thrustVy = thrust * Math.sin(tiltRad);

    // Drag — opposes airspeed vector (velocity minus wind).
    const windVx = sim.config.windSpeed; // m/s, horizontal
    const airVx = s.vx - windVx;
    const airVy = s.vy;
    const airSpeed = Math.sqrt(airVx * airVx + airVy * airVy);
    const rho = airDensity(s.altitude);
    const cd =
      s.phase === 'descent' ? PARACHUTE_DRAG_COEFFICIENT : rocket.dragCoefficient;
    const A = dragArea(rocket, s.phase === 'descent');
    const dragForce = 0.5 * rho * airSpeed * airSpeed * cd * A;
    const dragVx = airSpeed > 0 ? -dragForce * (airVx / airSpeed) : 0;
    const dragVy = airSpeed > 0 ? -dragForce * (airVy / airSpeed) : 0;

    const fx = thrustVx + dragVx;
    const fy = thrustVy + dragVy - mass * GRAVITY;

    const ax = fx / mass;
    const ay = fy / mass;

    s.vx += ax * stepDt;
    s.vy += ay * stepDt;
    s.xDist += s.vx * stepDt;
    s.altitude += s.vy * stepDt;

    if (s.altitude < 0) {
      s.altitude = 0;
      if (s.unstable) {
        s.phase = 'crashed';
      } else {
        s.phase = 'landed';
      }
      break;
    }
    if (s.altitude > s.maxAlt) s.maxAlt = s.altitude;
  }

  return toSample(sim, currentMass(sim), appliedThrust);
}

export function ignite(sim: FlightSim) {
  if (sim.state.phase !== 'pad') return;
  sim.state.phase = 'boost';
  sim.state.stageStartT = sim.state.t;
}

function toSample(sim: FlightSim, mass: number, thrust: number): FlightSample {
  const s = sim.state;
  return {
    t: s.t,
    altitude: s.altitude,
    xDistance: s.xDist,
    vy: s.vy,
    vx: s.vx,
    speed: Math.sqrt(s.vx * s.vx + s.vy * s.vy),
    acceleration: 0, // we don't track instantaneous acceleration directly yet
    mass: mass * 1000, // back to g for display
    thrust,
    phase: s.phase,
    activeStage: s.activeStage,
  };
}
