import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { FlightConfig, Rocket } from '../domain/types';
import { DEFAULT_FLIGHT_CONFIG, DEFAULT_ROCKET } from '../domain/defaults';

const LS_KEY = 'rocketmodeler:lastSession';

interface PersistedState {
  rocket: Rocket;
  flight: FlightConfig;
}

function loadSession(): PersistedState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedState;
    if (parsed.rocket?.schemaVersion === 1) return parsed;
    return null;
  } catch {
    return null;
  }
}

function saveSession(state: PersistedState) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

interface AppState {
  rocket: Rocket;
  flight: FlightConfig;
  stagesShowing: 1 | 2 | 3; // CG/CP inspector — how many stages to include
  mode: 'design' | 'flight';
  setRocket: (next: Rocket) => void;
  updateRocket: (patch: (r: Rocket) => Rocket) => void;
  setFlight: (next: FlightConfig) => void;
  updateFlight: (patch: (f: FlightConfig) => FlightConfig) => void;
  setStagesShowing: (n: 1 | 2 | 3) => void;
  setMode: (m: 'design' | 'flight') => void;
  resetAll: () => void;
}

const initialPersist = loadSession();

export const useAppStore = create<AppState>()(
  subscribeWithSelector((set, get) => ({
    rocket: initialPersist?.rocket ?? DEFAULT_ROCKET,
    flight: initialPersist?.flight ?? DEFAULT_FLIGHT_CONFIG,
    stagesShowing: 1,
    mode: 'design',
    setRocket: (next) =>
      set((s) => ({
        rocket: next,
        stagesShowing: Math.min(s.stagesShowing, next.numStages) as 1 | 2 | 3,
      })),
    updateRocket: (patch) => {
      const next = patch(get().rocket);
      set((s) => ({
        rocket: next,
        stagesShowing: Math.min(s.stagesShowing, next.numStages) as 1 | 2 | 3,
      }));
    },
    setFlight: (next) => set({ flight: next }),
    updateFlight: (patch) => set({ flight: patch(get().flight) }),
    setStagesShowing: (n) =>
      set((s) => ({
        stagesShowing: Math.min(n, s.rocket.numStages) as 1 | 2 | 3,
      })),
    setMode: (m) => set({ mode: m }),
    resetAll: () =>
      set({
        rocket: DEFAULT_ROCKET,
        flight: DEFAULT_FLIGHT_CONFIG,
        stagesShowing: 1,
      }),
  })),
);

let saveTimer: ReturnType<typeof setTimeout> | null = null;
useAppStore.subscribe(
  (s) => ({ rocket: s.rocket, flight: s.flight }),
  (state) => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveSession(state), 200);
  },
  {
    equalityFn: (a, b) => a.rocket === b.rocket && a.flight === b.flight,
  },
);
