export type MaterialId = 'balsa' | 'plastic' | 'hollow-plastic' | 'custom';

export interface Material {
  id: MaterialId;
  label: string;
  density: number; // g/cm^3
}

export interface Engine {
  id: string;
  name: string;
  manufacturer: 'Estes';
  classLetter: '1/2A' | 'A' | 'B' | 'C' | 'D';
  width: number; // mm
  length: number; // mm
  mass: number; // g, total wet
  fuelMass: number; // g
  avThrust1: number; // N, peak / launch phase
  avThrust2: number; // N, sustainer phase (0 if not applicable)
  burnTime1: number; // s
  totalBurnTime: number; // s
  delayTime: number; // s
  isBooster: boolean;
}

export type FinCount = 3 | 4;
export type StageCount = 1 | 2 | 3;
export type ParachuteDiameter = 0.3 | 0.6 | 0.9; // meters
export type FinThicknessIn = 0.125 | 0.25;

export type NoseConeShape = 'cone' | 'ogive' | 'parabolic' | 'elliptical';

export interface NoseCone {
  length: number; // cm
  materialId: MaterialId;
  customDensity?: number;
  shape?: NoseConeShape;
}

export interface Body {
  length: number; // cm (longest stage's body)
  diameter: number; // cm
}

export interface Fins {
  length: number; // cm (root chord)
  width: number; // cm (semi-span)
  height: number; // cm (offset from base of body to fin root)
  materialId: MaterialId;
  thicknessInches: FinThicknessIn;
  customDensity?: number;
}

export interface Rocket {
  schemaVersion: 1;
  numStages: StageCount;
  finCount: FinCount;
  noseCone: NoseCone;
  body: Body;
  fins: Fins;
  engineIds: [string, string?, string?];
  recoveryPayloadMass: number; // g
  parachuteDiameter: ParachuteDiameter;
  dragCoefficient: number;
}

export interface FlightConfig {
  launchAngle: number; // degrees, 60-90
  windSpeed: number; // m/s, constant horizontal
  timeScale: number; // 0.1 - 4.0
  soundEnabled: boolean;
}

export type FlightPhase = 'pad' | 'boost' | 'coast' | 'descent' | 'landed' | 'crashed';

export interface FlightSample {
  t: number;
  altitude: number;
  xDistance: number;
  vy: number;
  vx: number;
  speed: number;
  acceleration: number;
  mass: number;
  thrust: number;
  phase: FlightPhase;
  activeStage: 0 | 1 | 2;
  tiltDeg: number; // heading angle in degrees (90 = straight up)
  onRod: boolean;
  cg: number; // cm from base of current active rocket
  cp: number; // cm from base of current active rocket
  marginCal: number; // (cg - cp) / body diameter — current stability caliber
}

export interface StageMetrics {
  cg: number; // cm from bottom of full rocket
  cp: number; // cm from bottom of full rocket
  mass: number; // grams
  marginCal: number; // (cp - cg) / body diameter; positive = stable
}
