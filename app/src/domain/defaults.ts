import type { FlightConfig, Rocket } from './types';

// Defaults mirror the original applet's startup state (Test0014.java).
export const DEFAULT_ROCKET: Rocket = {
  schemaVersion: 1,
  numStages: 1,
  finCount: 4,
  noseCone: {
    length: 8.0,
    materialId: 'balsa',
  },
  body: {
    length: 33.0,
    diameter: 2.5,
  },
  fins: {
    length: 10.0,
    width: 4.0,
    height: 0.0,
    materialId: 'balsa',
    thicknessInches: 0.125,
  },
  engineIds: ['A8-3'],
  recoveryPayloadMass: 15,
  parachuteDiameter: 0.3,
  dragCoefficient: 0.7,
};

export const DEFAULT_FLIGHT_CONFIG: FlightConfig = {
  launchAngle: 90,
  windSpeed: 0,
  timeScale: 1.0,
  soundEnabled: false,
};
