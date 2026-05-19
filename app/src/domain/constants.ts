// Physics + simulation constants shared between modules.
// Most mirror the original applet's Constants class so behavior matches.

export const GRAVITY = 9.81; // m/s^2
export const AIR_DENSITY_SEA_LEVEL = 1.225; // kg/m^3 (ISA at sea level)
export const PARACHUTE_DRAG_COEFFICIENT = 1.7;
export const LAUNCH_ROD_LENGTH_CM = 110; // original Constants.lrodlength
export const FLIGHT_DELTA_T = 0.045; // seconds per sim step (original Constants.deltat)
export const SUB_STEPS_PER_FRAME = 100; // original integrated 100 sub-steps per visible frame

export const PA_PER_BAR = 100000;
export const MPH_TO_MS = 0.44704;
