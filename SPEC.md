# RocketModeler — Modernization Spec

A modern web rebuild of NASA Glenn's RocketModeler Java applet (Eric Bishop, OSU / NASA GRC, c. 2002–2008). This spec is the design contract; nothing in `RocketModeler/` (the legacy `.java` + `.class` + `.au` files) is being modified or ported file-by-file — we're rewriting from understanding, not transpiling.

Status: **spec drafted, awaiting user approval before implementation.**

---

## 1. Vision

Recreate the *feeling* of designing a paper rocket and watching it fly — the live CG/CP feedback as you tweak fins, the 3-2-1 countdown, the altitude ticker climbing — in a build that is honest to 2026 web standards and a little smarter about the physics underneath. A polished, single-page portfolio piece, not a classroom tool and not a NASA reissue.

## 2. Target user

**Primary:** the author and other adults who remember the original or have casual hobbyist curiosity about model rocketry. No assumed prior knowledge of aerodynamics — the app should teach the CG/CP stability rule by behavior, not by tooltips.

**Explicitly not for:** middle/high school classrooms (no accounts, lessons, or assignments), or serious model rocketeers (OpenRocket exists; we're not competing).

## 3. Scope

**In scope (v1):**
- Design mode with live rocket diagram, CG/CP markers, stability gauge
- Flight mode with 2D animated launch, real-time altitude/velocity HUD, post-flight summary
- 1–3 stage rockets, 3 or 4 fins, 3 stock materials + custom density
- Curated catalog of ~20–30 popular Estes-class engines (static JSON)
- Multi-stage CG/CP inspector (tabs above the rocket view: *Full Rocket / After Stage 1 / After Stage 2*)
- Stability shown as a **caliber gauge** with green/yellow/red zones
- URL-encoded shareable designs + localStorage for last session
- Speaker toggle for countdown + thruster (opt-in, default off)
- Tablet & desktop first-class; phone best-effort
- Pure metric units throughout

**Stretch / v2:**
- Moment-of-inertia tipoff dynamics after launch-rod exit (rocket visibly wobbles when CG/CP margin is marginal)
- Selectable nose cone shapes (cone / ogive / parabolic) with shape-dependent Cd
- Optional Tauri desktop bundle

**Non-goals (do not build, do not relitigate):**
- Side-by-side / race-mode comparison
- Curriculum, lessons, guided tour, or quiz mode
- Accounts, cloud sync, social, leaderboards, public design gallery
- mph / imperial units anywhere in the UI
- Real-time multiplayer / co-design
- A backend of any kind

## 4. Aesthetic direction

**"NASA brochure":** white-on-blue palette, Helvetica/Inter system stack, subtle blueprint grid behind the rocket viewer, crisp technical diagrams. Friendly but serious. The flight animation gets to be *slightly* cinematic (smooth easing, particle exhaust, parallax horizon) without losing the engineering vibe.

Colors (starting point — refine in implementation):
- Background: `#F4F7FB` (paper)
- Accent / primary: `#0B3D91` (NASA blue)
- Body tube fill: `#4A90E2` (echoes original green but cooler)
- Nose cone: `#D63333` (echoes original red)
- Fins: `#1A1A1A`
- CG marker: yin-yang circle (faithful to original)
- CP marker: small filled dot inside outlined circle (faithful)
- Stability green / yellow / red: `#2E8B57` / `#E0A116` / `#C0392B`

Type: **Inter** for UI, **JetBrains Mono** for numeric readouts (so changing digits don't shift width).

## 5. Information architecture

Two top-level modes, toggled by a single primary button (mirrors the applet's `CardLayout`):

```
┌─────────────────────────────────────────────────────────────────┐
│  RocketModeler        [ Design ]    [ Launch ▸ ]    🔊 ⓘ        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│    DESIGN MODE                          [ Geometry | Materials ] │
│  ┌──────────────────┐   ┌───────────────────────────────────┐   │
│  │                  │   │  Body length    [ 33.0 cm  ] ━━●━ │   │
│  │   (Rocket SVG    │   │  Body diameter  [  2.5 cm  ] ━●━━ │   │
│  │    with drag     │   │  Nose length    [  8.0 cm  ] ━●━━ │   │
│  │    handles on    │   │  Fin length     [ 10.0 cm  ] ━━●━ │   │
│  │    hover)        │   │  Fin width      [  4.0 cm  ] ━●━━ │   │
│  │                  │   │  Fin height     [  0.0 cm  ] ●━━━ │   │
│  │   ⊕ CG  ◉ CP     │   │  Fins:  (3) (4)                   │   │
│  │                  │   │  Stages: (1) (2) (3)              │   │
│  └──────────────────┘   └───────────────────────────────────┘   │
│  [Full|After1|After2]                                            │
│  CG 19.1cm  CP 22.3cm  Mass 47.2g   Stability ●●●○ 1.4 cal      │
└─────────────────────────────────────────────────────────────────┘
```

```
┌─────────────────────────────────────────────────────────────────┐
│  RocketModeler        [ Design ]    [ ◂ Launch ]    🔊 ⓘ        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   FLIGHT MODE                                                    │
│  ┌──────────────────────────┐   Angle    ━━━━━●━ 87°            │
│  │                          │   Wind     ━━●━━━ 1.5 m/s         │
│  │     altitude scale       │   Speed    ━━●━━━ 1.0×            │
│  │   100m ─                 │                                    │
│  │    50m ─    🚀           │   ━━━━━━━━━━━━━━━━━━              │
│  │         ╱│╲   exhaust    │   t        12.4 s                  │
│  │   ─────────── grass      │   v        18.2 m/s                │
│  │                          │   alt-max  64.7 m                  │
│  └──────────────────────────┘                                    │
│       [ ▶ Launch ]  [ ⏸ Pause ]  [ ↺ Reset ]                    │
└─────────────────────────────────────────────────────────────────┘
```

After flight ends, a **post-flight summary** overlay slides up: max altitude, peak velocity, time-to-apogee, total flight time, altitude/velocity/acceleration vs. time charts (small multiples), and a "Share this rocket" button (copies URL).

## 6. Domain model

```ts
type Material = {
  id: 'balsa' | 'plastic' | 'hollow-plastic' | 'custom';
  label: string;
  density: number;             // g/cm³
};

type Engine = {
  id: string;                  // 'A8-3'
  name: string;
  manufacturer: 'Estes' | ...;
  classLetter: 'A' | 'B' | 'C' | 'D' | ...;
  width: number;               // mm
  length: number;              // mm
  mass: number;                // g (total wet mass)
  fuelMass: number;            // g
  avThrust1: number;           // N (peak/launch phase)
  avThrust2: number;           // N (sustainer phase, 0 if not applicable)
  burnTime1: number;           // s
  totalBurnTime: number;       // s
  delayTime: number;           // s (ejection delay)
  isBooster: boolean;
};

type Rocket = {
  schemaVersion: 1;
  numStages: 1 | 2 | 3;
  finCount: 3 | 4;
  noseCone: {
    length: number;            // cm
    material: Material;
  };
  body: {
    length: number;            // cm  (top stage's body length)
    diameter: number;          // cm
    tubeDensity: number;       // g/cm³ (Constants.bodytubedensity)
  };
  fins: {
    length: number;            // cm  (root chord, in original terms)
    width: number;             // cm  (semi-span)
    height: number;            // cm  (offset from base of body to fin root)
    material: Material;        // density × thickness baked in
    thicknessInches: 0.125 | 0.25;
  };
  engines: [string, string?, string?]; // engine ids per stage, bottom-up
  recoveryPayloadMass: number; // g (incl. parachute + nose cone payload)
  parachuteDiameter: 0.3 | 0.6 | 0.9; // m
  dragCoefficient: number;     // user-overridable, default 0.7
};

type FlightConfig = {
  launchAngle: number;         // degrees, 60–90
  windSpeed: number;           // m/s (constant horizontal)
  timeScale: number;           // 0.1–4.0
  soundEnabled: boolean;
};

type FlightSample = {
  t: number;                   // s
  altitude: number;            // m
  xDistance: number;           // m
  velocity: number;            // m/s magnitude
  vy: number; vx: number;
  acceleration: number;        // m/s² (computed)
  mass: number;                // kg (decreases during burn)
  thrust: number;              // N
  phase: 'pad' | 'boost' | 'coast' | 'descent' | 'landed' | 'crashed';
  activeStage: 0 | 1 | 2;
};
```

URL share format: gzip + base64url-encoded JSON of `Rocket`, stored in `location.hash` as `#r=…`. Round-trips through `URL.fromHash` / `URL.toHash`. Bumping `schemaVersion` is the migration story; v1 doesn't need migrations yet.

## 7. Physics model

**v1 keeps the original's semi-Euler integrator structure** (a step at flight-`Δt` divided into 100 sub-steps for stability) but with two real upgrades:

### 7.1 Mass + CG (same shape as original)

Per-stage mass-weighted sum across nose cone, body tube, fins (× count), engines, and payload mass. Replicates the original `calccg` exactly. Component centroids:
- Nose cone centroid at `bodyLen + noseLen/3`, mass = `density · ½·π·(d/2)²·L` (faithful — even though this isn't a true cone integral; preserves applet behavior)
- Body tube centroid at `bodyLen/2`, mass = hollow cylinder × `bodytubedensity` (0.516 g/cm³) × `bodytubethickness` (0.1 cm)
- Each fin centroid at `finHeight + finLen/3`, mass = `findensitythickness · ½·finLen·finWidth`
- Engines stack from bottom; each centroid at the midpoint of its slot
- Payload mass placed at the top of the body tube

For multi-stage, the same formulae apply to the upper-stage subset when the booster(s) are dropped (mirrors original `numStages-stagesInComputation` indexing).

### 7.2 CP — **upgraded to Barrowman** (v1 upgrade #1)

Replaces the original's area-centroid approximation with the canonical Barrowman equations:

- **Nose cone:** `Cnα_n = 2`, `Xn = 0.466 · L_nose` (for cone; ogive/parabolic stretch values for v2 nose-cone shape selector).
- **Body taper:** zero in our case (no transitions). Term retained = 0.
- **Fins:** standard Barrowman fin term with `N` fins, semi-span `s`, root chord `Cr`, tip chord `Ct` (= 0 in current geometry; original fins are triangles), sweep angle, and the body-fin interference factor `K_fb = 1 + R/(s+R)`.
- Total CP = `Σ(Cnα_i · Xi) / Σ(Cnα_i)`, measured from nose tip (we'll convert to "from bottom" for UI consistency with original).

We will write a small validation harness (Vitest) that checks our Barrowman implementation against three or four known reference rockets (e.g., Estes Alpha III, Big Bertha) with hand-computed values. Tolerance: ±2% on CP location.

### 7.3 Atmosphere — **ISA (International Standard Atmosphere)** (v1 upgrade #2)

Replaces the original's constant `ρ = 1.22 kg/m³` with a piecewise ISA model (troposphere only is plenty — Estes flights never leave it). `ρ(h) = ρ₀ · (1 - L·h/T₀)^(g·M/(R·L) - 1)` with sea-level defaults. Implementation: ~15 lines + tests checking ρ(0), ρ(1000), ρ(5000) against published tables.

### 7.4 Flight integration

- Forces: thrust (axial, piecewise-constant by burn phase — same as original), gravity (9.81 m/s²), drag `½·ρ(h)·v²·Cd·A`. Cd = rocket's `dragCoefficient` during powered+coast; jumps to 1.7 under parachute. Reference area: `π·(d/2)²` for the rocket, `π·(parachuteDiameter/2)²` under chute.
- Mass varies during burn: `m(t) = m_dry + fuelMass · (1 - t/totalBurnTime)` (linear, same as original's "subtract fuelmass when engine on").
- Wind: constant horizontal velocity added to the airframe-relative velocity used for drag. No weathercocking in v1.
- Tilt: starts at `launchAngle`. **Faithful behavior:** if stability margin ≤ 0 at ignition, rocket tips over (1°/step) and crashes. v2 will replace this with proper moment-of-inertia tipoff dynamics.

### 7.5 Phases (state machine)

```
pad ─[launch]→ boost ─[burnout]→ coast ─[ejection delay]→ descent ─[alt=0]→ landed
                  │
                  ↓ (margin ≤ 0 at ignition)
              crashed
```

For multi-stage: at burnout of a booster, the spent stage detaches (and visually falls at fixed rate, faithful to original) and the next stage's engine ignites immediately. CG/CP recompute on stage drop.

## 8. Persistence

- **localStorage:** key `rocketmodeler:lastSession` stores the most recent `Rocket` and `FlightConfig`. Restored on app load if no `#r=` hash is present.
- **URL hash:** `#r=<base64url(gzip(JSON))>`. Updated debounced (200ms) on every design change so the address bar is always a shareable snapshot. Reading the hash on load overrides localStorage.
- No analytics, no telemetry in v1.

## 9. Tech stack

- **Vite 5** + **React 18** + **TypeScript** (strict mode)
- **Tailwind CSS** + a tiny CSS-variable-driven theme file for the NASA-brochure palette
- **Framer Motion** for UI transitions (mode switch, post-flight overlay)
- **Raw `requestAnimationFrame`** loop for the flight integrator (no animation library — we own the physics tick)
- **Canvas2D** for the flight viewer (lots of dynamic redraws); **SVG** for the design viewer (DOM events + drag handles are easier on SVG)
- **`pako`** for gzip in the URL hash; **`fflate`** as a smaller alternative if bundle size matters
- **Vitest** for unit tests of physics + URL codec
- **ESLint + Prettier**; **`tsx`** for any throwaway scripts
- Deploy: **Cloudflare Pages** or **GitHub Pages** (static build, free, fast)

Folder skeleton:

```
/
├── RocketModeler/         ← legacy applet (untouched, kept for reference)
├── SPEC.md                ← this file
├── app/
│   ├── index.html
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── physics/
│   │   │   ├── cg.ts
│   │   │   ├── cp-barrowman.ts
│   │   │   ├── atmosphere-isa.ts
│   │   │   ├── integrator.ts
│   │   │   └── __tests__/
│   │   ├── domain/
│   │   │   ├── types.ts
│   │   │   ├── defaults.ts
│   │   │   ├── engines.json
│   │   │   └── materials.ts
│   │   ├── state/
│   │   │   └── store.ts        (Zustand)
│   │   ├── design/
│   │   │   ├── DesignViewer.tsx (SVG + drag handles)
│   │   │   ├── DesignPanel.tsx
│   │   │   ├── MaterialsPanel.tsx
│   │   │   └── StabilityGauge.tsx
│   │   ├── flight/
│   │   │   ├── FlightViewer.tsx (Canvas2D)
│   │   │   ├── FlightHUD.tsx
│   │   │   ├── PostFlightSummary.tsx
│   │   │   └── audio.ts         (Web Audio, opt-in)
│   │   ├── url/
│   │   │   └── codec.ts         (Rocket ⇄ #r=…)
│   │   └── ui/
│   │       └── (shared components)
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── package.json
└── README.md
```

State management: **Zustand** with two slices, `rocket` and `flight`. Reasoning: Zustand is the smallest sensible step beyond `useState`/`useReducer` and lets the physics loop subscribe without re-rendering React.

## 10. Implementation milestones

Sized for a 2–4 weekend portfolio piece. Each milestone ends with the app in a demoable state.

### Milestone 1 — "Bones" (weekend 1, ~6–8h)
- Vite + React + TS + Tailwind scaffolded; NASA-brochure theme tokens.
- Domain types (`Rocket`, `Engine`, `Material`).
- `engines.json` populated with ~25 curated Estes engines.
- Zustand store + default `Rocket`.
- DesignPanel (numeric inputs + sliders, no drag handles yet).
- DesignViewer SVG rendering body/nose/fins (no CG/CP yet).
- localStorage round-trip.

### Milestone 2 — "Stability" (weekend 2, ~6–8h)
- CG calculation (faithful port + tests).
- Barrowman CP calculation + reference-rocket validation tests.
- CG/CP markers on the SVG.
- Stability caliber gauge with traffic-light zones.
- Multi-stage support + per-stage inspector tabs.
- Materials panel (stock + custom density).

### Milestone 3 — "Flight" (weekend 3, ~8–10h)
- ISA atmosphere model + tests.
- Flight integrator (semi-Euler, 100 sub-steps, faithful state machine).
- FlightViewer (Canvas2D) with rocket sprite, particle exhaust, parallax ground/sky, launch rod.
- FlightHUD (alt, vel, time).
- Launch / Pause / Reset controls; time-scale slider 0.1×–4×.
- Stage drop animation (faithful falling rate).
- Crash vs. touchdown handling.

### Milestone 4 — "Polish" (weekend 4, ~4–6h)
- Post-flight summary overlay with alt/vel/accel charts.
- Drag handles on the SVG design viewer (hover-reveal).
- URL-hash share encoding + "Copy share link" button.
- Sound (Web Audio, opt-in toggle): 3-2-1 countdown + thruster loop.
- About modal with NASA Glenn attribution.
- Responsive layout pass for tablet.
- README + screenshots + deploy to Cloudflare Pages.

If any single milestone blows past its budget, drop the post-flight charts, drag handles, or sound (in that order — the spec ranks them low-priority).

## 11. Validation strategy

- **Physics regression suite (Vitest):** known-rocket CG/CP/altitude values for 3–4 stock rockets (Estes Alpha III, Big Bertha, a two-stage example), tolerance ±2% on CP, ±5% on apogee altitude.
- **URL codec:** round-trip property test (random `Rocket` → encode → decode = same).
- **No UI snapshot tests** for v1; the visual layer changes too fast.
- **Manual smoke test checklist** in `RocketModeler/MANUAL_QA.md` (to be added in M4): "load defaults, launch, sees countdown, sees flight, sees post-flight summary, copy share link, paste in incognito, see same rocket."

## 12. Attribution & license

- **License:** MIT.
- **Attribution:** visible in the About modal — "Inspired by NASA Glenn Research Center's RocketModeler (Eric Bishop, c. 2002). The original applet is public-domain US government work. This is an independent modern rebuild, not affiliated with or endorsed by NASA."
- Repo README links to the original NASA pages.

## 13. Open questions / decisions deferred to implementation

- **Default rocket on first load.** Probably the original applet defaults (33cm body, 2.5cm diameter, 8cm nose, 10×4cm fin, 4 fins, A8-3 engine, 15g payload) — faithful and known-stable.
- **Charting library for post-flight summary.** Hand-rolled SVG is probably enough for three small line charts. If it gets unwieldy, drop in `recharts` or `visx`.
- **Engine catalog source.** I'll curate by hand from common Estes/Quest motors; if it's a slog, pull a vetted subset from the public ThrustCurve.org data dump.
- **Exact drag-handle UX on the SVG** — needs prototyping. Edge-handle vs. corner-handle vs. midpoint, hit areas on small fins, snapping behavior.
- **Theme refinement** — the palette above is a starting point, not final.

## 14. Anti-relitigation log

These were considered and **explicitly excluded** during interview:

| Decision | Excluded option | Why |
|---|---|---|
| Audience | Classroom / students-first | Building this for me, not for school use. |
| Physics | 4-upgrade set incl. tipoff & nose shapes | Out of timebox; deferred to v2. |
| Comparison | Side-by-side / race-mode | Out of scope — single rocket, single flight. |
| Curriculum | Embedded lessons / quiz mode | Not building an educational app. |
| Backend | Accounts / cloud sync / social | Static SPA only; no backend. |
| Units | mph / imperial | Pure metric; mixed units in original were a bug, not a feature. |
| Stack | Next.js, Svelte, Tauri-from-day-one | Vite + React + TS is the lowest-friction fit. |
| Mobile | Mobile-first design | Tablet+desktop primary; phone best-effort. |
| Visuals | 3D (three.js/R3F), 2.5D parallax, split-screen graph | 2D side-view (faithful but pretty). |
| Time control | 1×–10× speed-up; pause/step only; adaptive | 0.1×–4× slider, default 1×. |
| HUD | Rich live HUD, telemetry scrubber, "why did it fail" panel | Minimal HUD + post-flight summary only. |
| Sound | Default-on; drop entirely | Opt-in speaker toggle. |

---

**Spec status:** ready for review. Implementation starts on explicit user approval. See "Implementation milestones" above for the proposed order.
