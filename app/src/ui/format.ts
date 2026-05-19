export function num(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return '—';
  return value.toFixed(digits);
}

export function cm(value: number, digits = 1): string {
  return `${num(value, digits)} cm`;
}

export function grams(value: number, digits = 1): string {
  return `${num(value, digits)} g`;
}

export function meters(value: number, digits = 1): string {
  return `${num(value, digits)} m`;
}

export function mps(value: number, digits = 1): string {
  return `${num(value, digits)} m/s`;
}
