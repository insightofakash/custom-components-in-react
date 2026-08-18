# Custom Components in React

A showcase of reusable, hand-crafted UI components built with React, Vite, and
Framer Motion — each component living on its own page behind a subtle navigation
chrome.

## Included components

Each component has its own route, listed on the **Components** index page
(`/`):

- **Revenue Card** — `/revenue-card` — a revenue dashboard card with a Line/Bar
  chart toggle, a "Compare with" metric row, and an interactive hover tooltip
  with rolling values.
- **Model Usage** — `/model-usage` — a dark stacked bar chart of cumulative
  model usage against a daily limit, with a glowing limit badge, live indicator,
  and an interactive hover tooltip with per-model breakdowns.

More components coming soon — add them in `src/components/registry.jsx` and they
automatically get their own route and index entry.

## Showcase chrome

Component pages float a subtle top chrome (`ShowcaseChrome`):

- **Back** (top-left) — returns to the index.
- **Refresh** (top-right) — replays the component's entrance animations.
- **Hide** (top-right) — fades all three controls away; the same action brings
  them back.

Keyboard shortcuts:

| Shortcut      | Action               |
| ------------- | -------------------- |
| `⌘/` / `Ctrl+/` | Replay animations  |
| `⌘U` / `Ctrl+U` | Toggle the chrome  |

## Generative UI sounds

Interface sounds are synthesized at runtime with the Web Audio API — no audio
files. The library in `src/lib/sounds.js` is a port of Raphael Salaja's
perfected [Sound Lab](https://www.userinterface.wiki/generating-sounds-with-ai)
(9 sounds × 9 "feel" presets, default `aero`), triggered on discrete
interactions (clicks, selects, toggles).

## Getting started

```bash
npm install
npm run dev
```

## Scripts

| Command         | Description               |
| --------------- | ------------------------- |
| `npm run dev`   | Start the Vite dev server |
| `npm run build` | Build for production      |
| `npm run preview` | Preview the production build |
| `npm run lint`  | Lint with Oxlint          |

## Tech stack

- React 19
- Vite 8
- React Router (HashRouter)
- Framer Motion
- Huge Icons
- Web Audio API (generated UI sounds)
