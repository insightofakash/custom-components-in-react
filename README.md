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
- **Pill Nav** — `/pill-nav` — a gooey pill navigation with hover-reactive
  segments and a liquid-morphing dropdown menu.
- **Token Usage** — `/token-usage` — a segmented meter of per-model token usage
  against a 1M limit: rows glow on hover, lock in on select with a brightening
  ramp toward the cursor, and a broom action "compresses" the selected row
  (rolling `980.02K → 560.58K` transition, spinner pill, check to reset).
- **Tree Nav** — `/tree-nav` — a minimal 3-level text navigation whose hierarchy
  links are real rope physics: every parent-child wire is a verlet-simulated
  rope pinned at both ends that dangles, swings on expand/collapse, and bends
  away as the cursor approaches.

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

## Deployment

Live at **https://components.akashdey.com** — GitHub Pages with a custom domain.

- **Auto-deploy** — `.github/workflows/deploy.yml` runs `npm ci` → `npm run build` →
  `deploy-pages` on every push to `main`.
- **Custom domain** — `components.akashdey.com`, via a CNAME record in Namecheap
  (`components` → `insightofakash.github.io.`). `public/CNAME` ships in the build
  so the domain survives Actions-based deploys.
- **Routing** — HashRouter, so routes are `…/#/revenue-card`, `…/#/model-usage`,
  `…/#/pill-nav`, and `…/#/token-usage`
  (no server rewrite needed on Pages).
- **Assets** — `public/` also ships the social preview image (`og:image`, 1200×630),
  the black/white scheme-aware favicons, and `CNAME`. `base` is `'/'` since the
  subdomain serves the site at its root.

## Tech stack

- React 19
- Vite 8
- React Router (HashRouter)
- Framer Motion
- Huge Icons
- Web Audio API (generated UI sounds)
