// Flight integrator. Semi-Euler with sub-steps, matching the original applet's
// pattern (RocketParams + LaunchCanvas.calcdistance/calcaltitude).

import type { Engine, FlightConfig, FlightPhase, FlightSample, Rocket } from '../domain/types';
import { airDensity } from './atmosphere-isa';
import {
  FLIGHT_DELTA_T,
  GRAVITY,
  LAUNCH_ROD_LENGTH_CM,
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
  onRod: boolean; // true while the rocket is still constrained to the launch rod
}

export interface FlightSim {
  rocket: Rocket;
  config: FlightConfig;
  state: InternalState;
  engines: Engine[]; // resolved bottom-up
  dryMassByStage: number[]; // grams of "everything still attached" per stage active
  initialMargin: number;
  cgM: number; // initial CG from base, in meters
  cpM: number; // initial CP from base, in meters
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
    cgM: cg / 100,
    cpM: cp / 100,
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
      onRod: true,
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
  let burnFraction = elapsed / engine.totalBurnTime;
  if (burnFraction < 0) burnFraction = 0;
  if (burnFraction > 1) burnFraction = 1;
  const fuelLeft = engine.fuelMass * (1 - burnFraction);
  const grams = dry - engine.fuelMass + fuelLeft;
  return grams / 1000; // kg
}

function dragArea(rocket: Rocket, underChute: boolean): number {
  if (underChute) {
    const r = rocket.parachuteDiameter / 2;
    return Math.PI * r * r;
  }
  // Body diameter is cm; we want radius in m, so divide by 200.
  const radiusM = rocket.body.diameter / 200;
  return Math.PI * radiusM * radiusM;
}

export function stepSim(sim: FlightSim): FlightSample {
  const s = sim.state;
  const rocket = sim.rocket;

  if (s.phase === 'landed' || s.phase === 'crashed') {
    return toSample(sim, currentMass(sim), 0, 0);
  }

  // Tipoff: if at-ignition margin was negative, tip over progressively once
  // the rocket has cleared the launch rod (the rod itself holds it straight).
  if (s.unstable && s.phase !== 'pad' && !s.onRod) {
    s.tiltDeg -= 1;
    if (s.tiltDeg < 0) s.tiltDeg += 360;
  }

  if (s.phase === 'pad') {
    // Hold until launch is triggered externally.
    return toSample(sim, currentMass(sim), 0, 0);
  }

  const stepDt = FLIGHT_DELTA_T / SUB_STEPS_PER_FRAME;
  let appliedThrust = 0;
  let lastAx = 0;
  let lastAy = 0;

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
    lastAx = ax;
    lastAy = ay;

    s.vx += ax * stepDt;
    s.vy += ay * stepDt;
    s.xDist += s.vx * stepDt;
    s.altitude += s.vy * stepDt;

    // After clearing the rod, stable rockets gradually align their heading
    // with the relative-wind direction (gravity turn + weathercocking). The
    // alignment stiffness is proportional to dynamic pressure and stability
    // margin, mirroring restoring aerodynamic torque without paying the full
    // moment-of-inertia integration price.
    if (!s.onRod && !s.unstable && s.phase !== 'descent') {
      const windVx = sim.config.windSpeed;
      const vrelX = s.vx - windVx;
      const vrelY = s.vy;
      const vrelMag = Math.sqrt(vrelX * vrelX + vrelY * vrelY);
      if (vrelMag > 0.5) {
        const phi = Math.atan2(vrelY, vrelX);
        const theta = (s.tiltDeg * Math.PI) / 180;
        let dphi = phi - theta;
        while (dphi > Math.PI) dphi -= 2 * Math.PI;
        while (dphi < -Math.PI) dphi += 2 * Math.PI;
        const stabM = Math.abs(sim.cgM - sim.cpM);
        const rho = airDensity(s.altitude);
        const K = 0.18 * rho * vrelMag * stabM;
        const dTheta = K * dphi * stepDt;
        s.tiltDeg += (dTheta * 180) / Math.PI;
        if (s.tiltDeg < 0) s.tiltDeg += 360;
        if (s.tiltDeg >= 360) s.tiltDeg -= 360;
      }
    }

    // Launch rod constraint: while the rocket has not yet cleared the rod
    // length, project velocity and position back onto the rod axis so motion
    // is purely axial. This mirrors how a real launch rod prevents off-axis
    // motion until the rocket flies free.
    if (s.onRod) {
      const rodRad = (sim.config.launchAngle * Math.PI) / 180;
      const cosR = Math.cos(rodRad);
      const sinR = Math.sin(rodRad);
      const vAxial = Math.max(0, s.vx * cosR + s.vy * sinR);
      s.vx = vAxial * cosR;
      s.vy = vAxial * sinR;
      const rodDist = Math.sqrt(s.xDist * s.xDist + s.altitude * s.altitude);
      if (rodDist >= LAUNCH_ROD_LENGTH_CM / 100) {
        s.onRod = false;
      } else {
        // Keep position exactly on the rod axis.
        s.xDist = rodDist * cosR;
        s.altitude = rodDist * sinR;
      }
    }

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

  const accelMag = Math.sqrt(lastAx * lastAx + lastAy * lastAy);
  return toSample(sim, currentMass(sim), appliedThrust, accelMag);
}

export function ignite(sim: FlightSim) {
  if (sim.state.phase !== 'pad') return;
  sim.state.phase = 'boost';
  sim.state.stageStartT = sim.state.t;
}

function toSample(
  sim: FlightSim,
  mass: number,
  thrust: number,
  acceleration: number,
): FlightSample {
  const s = sim.state;
  return {
    t: s.t,
    altitude: s.altitude,
    xDistance: s.xDist,
    vy: s.vy,
    vx: s.vx,
    speed: Math.sqrt(s.vx * s.vx + s.vy * s.vy),
    acceleration,
    mass: mass * 1000, // back to g for display
    thrust,
    phase: s.phase,
    activeStage: s.activeStage,
  };
}
