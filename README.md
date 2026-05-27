# RocketModeler

A modern web rebuild of NASA Glenn Research Center's RocketModeler Java applet (Eric Bishop, OSU / NASA GRC, c. 2002).

The original applet ran in browsers via the Java Plugin, which has been gone for years. This is an independent reimplementation in TypeScript + React, targeting the same pedagogical experience — design a model rocket, see its CG and CP shift in real time, then launch it and watch the altitude tick up — with quietly upgraded physics underneath.

This project is **not** affiliated with or endorsed by NASA. The original applet is in the public domain as US government work.

## Features

- **Design mode** with body, nose-cone and fin geometry sliders, materials picker (balsa / plastic / hollow plastic / custom), 1–3 stages, 3 or 4 fins.
- **Curated engine catalog** (Estes 1/2A through D, including booster variants).
- **Live CG / CP / mass readout** with stability caliber gauge — green / yellow / red zones.
- **Multi-stage CG inspector** — view CG/CP for the full rocket, top N stages, or just the top stage (the original applet's sneakiest pedagogical feature).
- **Flight mode** with Canvas2D viewer: real-time integrator at 100 sub-steps per frame, ISA atmosphere, parachute deploy, particle exhaust, sky gradient that deepens with altitude.
- **Post-flight summary** with altitude + speed mini-charts and key stats.
- **Share-by-URL** — every design edit gzips into the URL hash, so the address bar is always a shareable snapshot.
- **Opt-in audio** — synthesized 3-2-1 countdown beep and thruster rumble via Web Audio (no .au files needed).

## Repo layout

```
/
├── RocketModeler/   ← legacy applet, kept for reference (untouched)
├── SPEC.md          ← design spec for the modern rebuild
├── app/             ← the new web app (Vite + React + TS)
└── README.md
```

## Run it

```bash
cd app
npm install
npm run dev      # vite dev server on http://localhost:5173
npm test         # vitest physics suite (16 tests)
npm run build    # production static bundle in app/dist
```

## Physics

CG follows the original applet's mass-weighted port (cone, body tube, fins, engines, payload). CP uses simplified Barrowman (cone nose + triangular fin terms, with body-fin interference). Atmosphere is ISA troposphere. Flight integration is semi-Euler with 100 sub-steps per Δt of 0.045 s. See `app/src/physics/` and the `SPEC.md` for details and reference formulae.

## Credits

- Original RocketModeler applet: Eric Bishop, Ohio State University / NASA Glenn Research Center.
- Modern rebuild: Harsh Mishra.
- License: MIT (see LICENSE).
