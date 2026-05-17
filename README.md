# RocketModeler

A modern web rebuild of NASA Glenn Research Center's RocketModeler Java applet (Eric Bishop, OSU / NASA GRC, c. 2002).

The original applet ran in browsers via the Java Plugin, which has been gone for years. This is an independent reimplementation in TypeScript + React, targeting the same pedagogical experience — design a model rocket, see its CG and CP shift in real time, then launch it and watch the altitude tick up — with quietly upgraded physics underneath.

This project is **not** affiliated with or endorsed by NASA. The original applet is in the public domain as US government work.

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
npm run dev
```

## Status

Work in progress — see SPEC.md for the full design and milestone plan.

## Credits

- Original RocketModeler applet: Eric Bishop, Ohio State University / NASA Glenn Research Center.
- Modern rebuild: Harsh Mishra.
- License: MIT (see LICENSE).
