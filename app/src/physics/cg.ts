// Center-of-gravity calculation. Ports the original applet's RocketParams.calccg
// (Test0014.java). CG is measured in cm from the bottom of the rocket stack
// being considered.

import type { Engine, Rocket } from '../domain/types';
import { BODY_TUBE_DENSITY, BODY_TUBE_THICKNESS, finDensityThickness, noseConeDensity } from '../domain/materials';
import { getEngine } from '../domain/engines';

export interface StageInputs {
  bodyLength: number; // cm
  finLength: number;
  finHeight: number;
  engines: Engine[]; // bottom-up, only the engines still attached for this stage view
}

export interface CgResult {
  cg: number; // cm from bottom of this stage stack
  totalMassG: number; // grams
}

interface MaterialSettings {
  noseConeDensity: number; // g/cm^3
  finDensityThickness: number; // g/cm^2 — density × thickness
}

export function materialSettingsFor(rocket: Rocket): MaterialSettings {
  return {
    noseConeDensity: noseConeDensity(rocket.noseCone.materialId, rocket.noseCone.customDensity),
    finDensityThickness: finDensityThickness(
      rocket.fins.materialId,
      rocket.fins.thicknessInches,
      rocket.fins.customDensity,
    ),
  };
}

export function computeCg(
  rocket: Rocket,
  stage: StageInputs,
  mats: MaterialSettings = materialSettingsFor(rocket),
): CgResult {
  const { bodyLength, finLength, finHeight, engines } = stage;
  const bodyDiameter = rocket.body.diameter;
  const noseLen = rocket.noseCone.length;
  const finWidth = rocket.fins.width;
  const finCount = rocket.finCount;
  const recpaymass = rocket.recoveryPayloadMass;

  // Nose cone mass — original used (1/2)*pi*r^2*L (paraboloid-ish, faithful).
  const noseConeMass =
    mats.noseConeDensity * 0.5 * Math.PI * (bodyDiameter / 2) ** 2 * noseLen;

  // Fin mass per fin — right triangle area 1/2 * length * width × density-thickness.
  const finMass = mats.finDensityThickness * 0.5 * finLength * finWidth;

  // Body tube mass — hollow cylinder (thin shell).
  const bodyTubeMass =
    BODY_TUBE_DENSITY * bodyLength * Math.PI * bodyDiameter * BODY_TUBE_THICKNESS;

  // Engines stacked from the bottom. Each engine's centroid sits at the midpoint
  // of its slot, relative to the bottom of the rocket.
  let engineFactor = 0;
  let totalEngineMass = 0;
  let prevTop = 0;
  for (const e of engines) {
    const engineLengthCm = e.length / 10; // mm -> cm
    const centroid = prevTop + engineLengthCm / 2;
    engineFactor += e.mass * centroid;
    totalEngineMass += e.mass;
    prevTop += engineLengthCm;
  }

  // Right-cone centroid sits 1/3 of the height from the base, not the midpoint.
  const noseCentroid = bodyLength + noseLen / 3;
  const finCentroid = finHeight + finLength / 3;
  const bodyTubeCentroid = bodyLength / 2;
  const payloadCentroid = bodyLength;

  const numerator =
    finCount * finMass * finCentroid +
    noseConeMass * noseCentroid +
    bodyTubeMass * bodyTubeCentroid +
    engineFactor +
    recpaymass * payloadCentroid;

  const totalMass =
    finCount * finMass + noseConeMass + bodyTubeMass + totalEngineMass + recpaymass;

  return {
    cg: numerator / totalMass,
    totalMassG: totalMass,
  };
}

// Helper: compute per-stage CG using engines still attached at each stack level.
// stagesShowing = 1 → only upper stage; stagesShowing = numStages → full rocket.
export function computeStageCg(rocket: Rocket, stagesShowing: 1 | 2 | 3): CgResult {
  const mats = materialSettingsFor(rocket);
  const startIdx = rocket.numStages - stagesShowing;
  const engines: Engine[] = [];
  for (let i = startIdx; i < rocket.numStages; i++) {
    const id = rocket.engineIds[i];
    if (id) engines.push(getEngine(id));
  }
  // Reduce body length and fin geometry as lower stages are dropped (faithful to
  // original's updateData stage subtraction).
  let bodyLength = rocket.body.length;
  let finLength = rocket.fins.length;
  let finHeight = rocket.fins.height;
  for (let i = 0; i < startIdx; i++) {
    const id = rocket.engineIds[i];
    if (!id) continue;
    const e = getEngine(id);
    const droppedCm = e.length / 10;
    bodyLength -= droppedCm;
    if (finHeight > 0) {
      finHeight = Math.max(0, finHeight - droppedCm);
    } else {
      finLength = Math.max(0, finLength - droppedCm);
    }
  }
  return computeCg(rocket, { bodyLength, finLength, finHeight, engines }, mats);
}

// Geometry of the active-and-above subset of a rocket given an active stage
// index. Reused by live CG/CP recompute and the CP helper below.
export interface ActiveGeometry {
  bodyLength: number;
  finLength: number;
  finHeight: number;
  engines: Engine[];
}

export function activeGeometry(rocket: Rocket, activeStage: 0 | 1 | 2): ActiveGeometry {
  let bodyLength = rocket.body.length;
  let finLength = rocket.fins.length;
  let finHeight = rocket.fins.height;
  for (let i = 0; i < activeStage; i++) {
    const id = rocket.engineIds[i];
    if (!id) continue;
    const e = getEngine(id);
    const droppedCm = e.length / 10;
    bodyLength -= droppedCm;
    if (finHeight > 0) {
      finHeight = Math.max(0, finHeight - droppedCm);
    } else {
      finLength = Math.max(0, finLength - droppedCm);
    }
  }
  const engines: Engine[] = [];
  for (let i = activeStage; i < rocket.numStages; i++) {
    const id = rocket.engineIds[i];
    if (id) engines.push(getEngine(id));
  }
  return { bodyLength, finLength, finHeight, engines };
}
