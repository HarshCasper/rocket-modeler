// Barrowman center-of-pressure calculation, simplified for a single-segment
// body tube + cone nose + triangular fins (matching the applet's geometry).
// All inputs in cm; outputs in cm from the bottom of the rocket stack.

import type { Rocket } from '../domain/types';

export interface CpInputs {
  bodyLength: number; // cm
  bodyDiameter: number; // cm
  noseLength: number; // cm
  finLength: number; // root chord, cm
  finWidth: number; // semi-span, cm
  finHeight: number; // axial offset from rocket base to fin trailing edge, cm
  finCount: number;
}

export interface CpResult {
  cp: number; // cm from bottom of rocket
  cpFromNose: number; // cm from nose tip
  cnaTotal: number;
  cnaNose: number;
  cnaFins: number;
}

export function computeCp(input: CpInputs): CpResult {
  const { bodyLength, bodyDiameter, noseLength, finLength, finWidth, finHeight, finCount } = input;
  const totalLen = bodyLength + noseLength;

  // Nose cone — right cone: Cnα = 2, CP at 2/3 of nose length from tip.
  const cnaNose = 2;
  const xNose = (2 / 3) * noseLength;

  // Fins — triangular delta with apex at top: c_r = finLength, c_t = 0,
  // semi-span s = finWidth, sweep length m = finLength.
  const R = bodyDiameter / 2;
  const s = finWidth;
  const cr = finLength;
  const ct = 0;
  const m = finLength;
  const midChord = Math.sqrt(s * s + (m + ct / 2 - cr / 2) ** 2);

  // Body-fin interference factor. The body funnels more flow around the fin
  // root, so the factor is greater than 1, not less.
  const Kfb = s + R > 0 ? 1 + R / (s + R) : 1;

  // Aspect-ratio dependent slope term.
  const denomBase = 2 * midChord / (cr + ct || 1);
  const arTerm = (4 * finCount * (s / bodyDiameter) ** 2) / (1 + Math.sqrt(1 + denomBase * denomBase));
  const cnaFins = Kfb * arTerm;

  // Fin CP — for c_t = 0, XR collapses to c_r/2 measured from leading-edge
  // root. The leading edge root is at the top of the fin (apex up).
  const finXR = cr / 2; // since c_t = 0
  // Fin leading-edge root axial distance from nose tip:
  const xFinLeadingFromNose = noseLength + (bodyLength - (finHeight + finLength));
  const xFin = xFinLeadingFromNose + finXR;

  const cnaTotal = cnaNose + cnaFins;
  const cpFromNose = cnaTotal > 0 ? (cnaNose * xNose + cnaFins * xFin) / cnaTotal : totalLen;
  const cp = totalLen - cpFromNose;

  return { cp, cpFromNose, cnaTotal, cnaNose, cnaFins };
}

export function computeCpForRocket(rocket: Rocket): CpResult {
  return computeCp({
    bodyLength: rocket.body.length,
    bodyDiameter: rocket.body.diameter,
    noseLength: rocket.noseCone.length,
    finLength: rocket.fins.length,
    finWidth: rocket.fins.width,
    finHeight: rocket.fins.height,
    finCount: rocket.finCount,
  });
}
