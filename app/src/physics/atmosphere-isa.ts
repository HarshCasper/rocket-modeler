// International Standard Atmosphere — troposphere only (0 to 11 km).
// Plenty for Estes-class flights, which rarely leave the boundary layer.
//
// Reference: ISA 1976. https://en.wikipedia.org/wiki/International_Standard_Atmosphere
//
// rho(h) = rho0 * (1 - L*h/T0)^(g*M/(R*L) - 1)
//
// All units SI: meters, kelvin, Pa, kg/m^3.

const RHO_0 = 1.225; // kg/m^3
const T_0 = 288.15; // K
const L = 0.0065; // K/m (temperature lapse rate in troposphere)
const G = 9.80665; // m/s^2
const M_AIR = 0.0289644; // kg/mol
const R_UNIVERSAL = 8.31446; // J/(mol·K)

const EXPONENT = (G * M_AIR) / (R_UNIVERSAL * L) - 1;

export function airDensity(altitudeM: number): number {
  if (altitudeM <= 0) return RHO_0;
  if (altitudeM >= 11000) {
    // Above troposphere: hand off to constant tropopause density.
    // ~0.3639 kg/m^3 at 11 km.
    return 0.3639;
  }
  const base = 1 - (L * altitudeM) / T_0;
  return RHO_0 * Math.pow(base, EXPONENT);
}

export function airTemperatureK(altitudeM: number): number {
  if (altitudeM <= 0) return T_0;
  if (altitudeM >= 11000) return T_0 - L * 11000;
  return T_0 - L * altitudeM;
}
