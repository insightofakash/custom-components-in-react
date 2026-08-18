# Developer Notes — Custom Components in React

Long-term project reference for the component-showcase app. Covers setup,
architecture, conventions, and maintenance. This file is committed to git — keep
it accurate as the project evolves, and add a section whenever you learn
something you'll need again later.

---

## Project overview

A showcase of reusable, hand-crafted UI components built with React and Vite.
Each component lives on its **own page** behind a floating navigation chrome,
and is listed on a "Components" index page. Components are meant to be real,
pixel-perfect ports of a connected Figma file ("X Posts"), not toy demos.

### Tech stack

| Piece              | Choice                                                       |
| ------------------ | ------------------------------------------------------------ |
| Framework          | React 19 (StrictMode)                                        |
| Build tool         | Vite 8                                                       |
| Router             | react-router-dom v7, **HashRouter** (refresh-safe, no server config) |
| Animation          | Framer Motion 12                                             |
| Icons              | Huge Icons (`@hugeicons/react` + `@hugeicons/core-free-icons`) |
| UI sounds          | Web Audio API (runtime synthesis, `src/lib/sounds.js`)       |
| Lint               | oxlint                                                       |

### Scripts (`npm run …`)

| Command         | Description                       |
| --------------- | --------------------------------- |
| `dev`           | Vite dev server (`:5173`, strict) |
| `build`         | Production build to `dist/`       |
| `preview`       | Serve the production build        |
| `lint`          | oxlint                           |

---

## Setup & maintenance

1. `npm install`
2. `npm run dev` → http://localhost:5173
3. `npm run lint` and `npm run build` before pushing — keep both green.

### Dev server — pinned config (`vite.config.js`)

`vite.config.js` pins the dev server to **port 5173 with `strictPort: true`**
and ignores `dist/**`, `node_modules/**`, `.git/**` in the file watcher.

Why: earlier the dev server silently hopped to a new port (`:5174`) when `:5173`
was taken, and a stray browser tab left on the old port pointed at a dead
server — symptoms read as "the code keeps getting undeployed." With
`strictPort`, a port conflict now **fails loudly** instead of hiding. Keep this
config; never run a second `npm run dev` against the same port.

**Troubleshooting "nothing on 5173":** check `pgrep -fl vite`. If none, the
server isn't running — start it (`nohup npm run dev > /tmp/dev-run.log 2>&1 &`).
Do **not** use `pkill -f vite` casually while the user has `npm run dev` open —
it kills their server.

### Long-term gotchas

- **`dist/` is gitignored** but lives in the project root. It's excluded from
  the dev watcher, so running `npm run build` alongside `npm run dev` won't
  trigger reloads.
- If the Vite dep cache (`node_modules/.vite`) ever misbehaves (stale errors
  after switching branches/versions), delete it and restart: `rm -rf node_modules/.vite`.
- React 19 StrictMode double-invokes effects/renderers in dev — guard side
  effects (sound calls, DOM writes) so they're idempotent.

---

## Deployment & GitHub Pages

Production site: **https://components.akashdey.com** (custom domain on GitHub Pages).

### How it's wired

- `.github/workflows/deploy.yml` — on push to `main` (or `workflow_dispatch`):
  `npm ci` → `npm run build` → `actions/configure-pages@v5` →
  `upload-pages-artifact` (uploads `dist/`) → `deploy-pages@v4`.
  Permissions: `pages: write`, `id-token: write`.
- `vite.config.js` has `base: '/'` — the subdomain serves at the root, so no
  `/repo/` prefix on asset URLs.
- `public/CNAME` = `components.akashdey.com` — **must ship in `dist/`** for
  Actions-based deploys, otherwise GitHub drops the custom domain on the next
  deploy.
- DNS (Namecheap): CNAME `components` → `insightofakash.github.io.`
- Routing stays HashRouter — deep-links like
  `components.akashdey.com/#/revenue-card` work with zero server config.

### Gotchas (learned the hard way)

- `actions/configure-pages` fails with **"Get Pages site failed: Not Found"**
  when Pages was never enabled on the repo. Fix from the CLI (no UI needed):

  ```
  gh api --method POST repos/<owner>/<repo>/pages -f build_type=workflow
  ```

- Set the custom domain via the API too:

  ```
  gh api --method PUT repos/<owner>/<repo>/pages -f cname=components.akashdey.com
  ```

  HTTPS cert provisioning is async — wait, then re-check with
  `gh api repos/<owner>/<repo>/pages` (look at `https_certificate.state`).
- Re-run a failed deploy with `gh run rerun <run-id>`; poll with
  `gh run watch <run-id> --exit-status`.
- Action versions currently print a Node 20 deprecation warning — harmless.
- Verify a deploy: `curl -sI https://components.akashdey.com/` (expect HTTP 200),
  then `curl -s https://components.akashdey.com/social-image.png`.

### Social image & favicons (scoped to components.akashdey.com)

- `public/social-image.png` (1200×630) + OG/Twitter meta tags in `index.html`
  (`og:image`, `og:url`, `twitter:card = summary_large_image`, all absolute URLs
  on the custom domain). Social platforms cache old previews — use the LinkedIn /
  Twitter / Facebook debuggers to refresh after changing it.
- Favicons: `public/favicon-black.png` (light scheme) and
  `public/favicon-white.png` (dark scheme), switched via
  `media="(prefers-color-scheme: …)"` link tags. Replaced the old purple
  `favicon.svg`.

---

## Project structure

```
src/
  main.jsx                     # StrictMode + HashRouter + tokens/index css + App
  App.jsx                      # <Routes> from registry
  App.css / index.css          # shell + stage layout
  components/
    registry.jsx               # SINGLE source of truth: [ {id,title,path,Component} ]
    ComponentIndex/            # "Components" index page (from Figma Frame 387)
    ComponentPage/             # chrome + centered stage + playKey (refresh)
    ShowcaseChrome/            # floating Back / Refresh / Hide chrome + shortcuts
    ChartTooltip/              # shared chart tooltip + computeTooltipPosition
    RevenueCard/               # light revenue dashboard card
    ModelUsage/                # dark stacked-bar usage-vs-limit card
  lib/
    sounds.js                  # Web Audio generative UI sounds
  styles/
    tokens.css                 # Figma palette + type system as CSS variables
```

---

## How to add a new component (long-term flow)

1. **Port from Figma** — ground every value from `get_design_context` (sizes,
   colours, fonts, spacing), never measure off a screenshot.
2. **Reuse before writing** — check `component_map` / `token_map` / `icon_map`
   and the existing `ChartTooltip` / `sounds` before building equivalents.
3. Create `src/components/<Name>/<Name>.jsx` + `<Name>.css`. Entrance animation:
   `motion.section initial={{opacity:0,y:24}} animate={{opacity:1,y:0}}`.
4. Register it in `src/components/registry.jsx` (`{ id, title, path, Component }`)
   — that auto-creates its route + index link. Route = `/<id>`.
5. Add any new design tokens to `src/styles/tokens.css`.
6. Update this file (and `README.md`'s component list).
7. `npm run lint && npm run build`, verify in dev.

---

## Navigation & page structure

- `react-router-dom` with **HashRouter** (refresh-safe, deep-linkable, no server
  config). Routes live in `src/App.jsx`.
- Components are registered in `src/components/registry.jsx` — the single source
  of truth. Adding a row `{ id, title, path, Component }` automatically creates:
  - its own route `/path` (`ComponentPage` wrapper),
  - a link on the index page.
- `ComponentPage` renders the floating chrome + the centered `.component-stage`
  shell and holds a `playKey`. Bumping it (`key={playKey}` on the card) **re-mounts
  the component so entrance animations replay** — that's what the Refresh control does.

## Showcase chrome (floating UI, "very subtle")

`src/components/ShowcaseChrome/` — `position: fixed`, idle at 50% opacity, brightens
on hover, `pointer-events` only on controls. Three controls:

| Control  | Position | Action |
| -------- | -------- | ------ |
| Back     | top-left | `navigate("/")` |
| Refresh  | top-right | replay entrance animations (re-mount) |
| Hide     | top-right | toggles all three controls away |

### Keyboard shortcuts

- `⌘U` / `Ctrl+U` — toggle the chrome on/off (handler stays alive while hidden).
- `⌘/` (Command-Slash) / `Ctrl+/` — trigger refresh.
- Both live in one `keydown` listener; `preventDefault()` is called so nothing else
  hijacks them. Avoid bare `⌘R` (browser reload) and `⌘H` (macOS hide window).
- Shortcut keycaps render as segmented `⌘ + U` (the cmd glyph is 16px, bigger than
  the 12px key text, via `.chrome-kbd-sym`).

### Spacing rules of thumb

- Control groups (Refresh · Hide) are separated by **28px**; content within a group
  (label → keycap) is tight at **6px**. The keycap must read as part of its own
  control, never as attached to the neighbouring one.

---

## Text & number transitions

### Rule of thumb: keep hot paths lightweight

In-place value changes (e.g. the RevenueCard **tooltip**, which updates on every
hover) use a lightweight Framer Motion `animate()` lerp that writes straight to
`textContent` — `RollValue`. It animates the number in place with a blur "rolling"
state, no DOM churn:

```jsx
function RollValue({ to, format }) {
    // animate(from, to, { onUpdate: (v) => ref.current.textContent = format(Math.round(v)) })
}
```

Mount count-ups (header total revenue) use Framer Motion `animate()` in `CountUp`
— a one-time 0→value entrance, not an in-place change.

### Lesson learned: Calligraph is not for high-frequency paths

We tried `calligraph` (fluid char-diffing text + rolling digits) in the tooltip
(month label, revenue value, compare label/value). In a **hot path that re-renders
on every mouse move**, it caused:
- **Glitchy labels** — LCS char diffing + `drift` on short labels looked janky.
- **Sluggish chart** — nested `AnimatePresence` + `mode="popLayout"` remounting a
  span per character on every hover change dragged the frame rate down.

Calligraph was **fully reverted and removed** (`npm uninstall calligraph`). If you
ever try it again, use it only for **isolated, occasional content swaps** (a static
heading that changes on a button click), never in a path that updates at mouse-move
frequency.

---

## Design tokens (from the connected Figma file)

`src/styles/tokens.css` defines the Figma "X Posts" palette + type system as CSS
custom properties / utility classes.

- Light neutrals: `--t-strong` #292929, `--t-body` #5D5D5D, `--t-muted` #7F7F7F,
  `--t-subtle` #A6A6A6, `--t-border` #EBEBEB, `--t-surface` #F7F7F7, `--t-bg` #FFFFFF.
- Dark (Model Usage card + tooltip): `--t-dark-surface` #151515,
  `--t-dark-card-a` #262626, `--t-dark-card-b` #3F3F3F.
- Accents: `--t-accent-blue` #38ACFF, `--t-accent-orange` #FF671A,
  `--t-accent-red` #FF3860, `--t-accent-amber` #FEBC2E, `--t-live-green` #00FF09.
- Type: `.type-display` (32), `.type-title-1` (24), `.type-title-2` (20),
  `.type-title-3` (18), `.type-body-large` (16), `.type-body` (14),
  `.type-body-small` (13), `.type-caption` (12), `.type-label` (12), `.type-commands` (mono).
- Font: SF Pro (via the system stack). The cards themselves keep Switzer.

## Index page ("Components")

`src/components/ComponentIndex/` mirrors the Figma frame (Frame 387):

- 421px column, centered horizontally, 120px from the top.
- Title **Components** — `Title 2`, `Strong`. Subtitle — `Body Large` (16px), `Subtle`.
- A 1px `Border` divider with 24px breathing room.
- Rows: `Body Large`, 12px apart. Number column (`01`, `02`, …) is a **fixed 36px**
  width with `flex-shrink: 0` — the shrink:0 guarantees the column can't be
  compressed by flex when space is tight, preserving alignment.

## Icons

Always Huge Icons — never hand-write SVGs:

```jsx
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";

<HugeiconsIcon icon={ArrowLeft01Icon} size={16} strokeWidth={2} />
```

---

## Generative UI sounds — `src/lib/sounds.js`

Subtle UI sounds synthesized at runtime with the **Web Audio API** (no audio
files) — the approach from Raphael Salaja's [Generating Sounds with AI](https://www.userinterface.wiki/generating-sounds-with-ai)
guide. This module is a **verbatim port of the author's perfected Sound Lab**
(`content/generating-sounds-with-ai/demos/sound-lab-demo` in
[raphaelsalaja/userinterface-wiki](https://github.com/raphaelsalaja/userinterface-wiki)) —
same frequencies, filter types/Q, durations, gain levels, and sample-level
exponential decay (e.g. click noise is `(rand*2-1) * exp(-i/(50*decayMult))` through
a bandpass at `filterFreq`, not a gain-node envelope).

Usage — call a trigger inside an interaction handler:

```js
import sounds from "../../lib/sounds.js";

sounds.click();    // short bandpass noise click (0.008s)
sounds.tick();     // highpass noise blip (0.004s)
sounds.toggle();   // noise + falling tone
sounds.pop();
sounds.drop();
sounds.success();  // C5-E5-G5 arpeggio
sounds.error();    // detuned saw/square falling through a lowpass
sounds.warning();
sounds.startup();  // rising chord
sounds.hover();    // muffled 620Hz sine through a 900Hz lowpass (0.05s) —
                   // custom, "thocky", kept separate from the author's tick
sounds.setFeel("aero");   // 9 presets: soft/aero/arcade/organic/glass/
                          // industrial/minimal/retro/crisp — default "aero"
sounds.setVolume(1.0);    // master level; 1.0 = exact author reference level
```

Design rules:
- The `AudioContext` is created lazily and resumed on the first user gesture, so
  it always works within autoplay policies.
- Default: only trigger sounds on discrete interactions (clicks / selects), never
  on hover or mouse-move — that path must stay silent for performance.
- **Intentional exceptions** (user asked for these): the index page's
  component-name hover, and the Model Usage **column hover**, **legend hover**,
  and **Usage Today hover** — all use `sounds.hover()`.

Currently wired: RevenueCard line/bar toggle (`toggle`), compare pill (`tick`),
index component names hover (`hover`) + click (`click`), chrome Back (`click`),
Refresh (`pop`), Hide (`pop`), ModelUsage column/legend/Usage-Today hover
(`hover`). Reuse `sounds.*` in new components as the user asks.

---

## Shared chart tooltip — `src/components/ChartTooltip/`

Extracted from RevenueCard into a common component used by every chart card:

- `ChartTooltip.jsx` — `AnimatePresence` + `motion.div` tooltip. Props:
  `position` (`{left, top}` | null — null unmounts it), `title`,
  `rows: [{ dotColor, label, value, format, muted? }]`, optional `total`
  (`{ label, value, format }` → adds a divider + total row at the bottom), and
  optional `highlightIndex` (that row gets a subtle `color-mix` tint, others dim).
  Values roll (the `RollValue` animation: 0.45s cubic-bezier(0.22,1,0.36,1) roll
  with blur-while-rolling) — same logic in every card.
- `tooltipPosition.js` — `computeTooltipPosition()`: the positioning rules all
  charts share (tooltip to the *right* of the cursor on the left half, *above*
  by default, flips *below* when clamped, then clamped to chart bounds).
  `gap` defaults to 64.
- Animation: spring `left/top` (400 / 34 / 0.6), enter `{opacity 0, y 8, scale
  0.96}` (spawned at its target `left/top`, so it never slides across from 0),
  exit `{opacity 0, y 6, scale 0.97}`.
- Styling = the Figma tooltip (71:1177): `#151515` bg, 12px radius, 0.5px
  black@20% stroke, 5-layer elevation shadow, 16px r5 swatches, 12px labels
  `#F7F7F7`, 14px tabular-num values, 16px title. The bottom divider is a very
  subtle hairline (`rgba(255,255,255,0.06)`).
- Kept `computeTooltipPosition` in its own file (`tooltipPosition.js`) so fast
  refresh doesn't warn about mixed exports.

---

## Model Usage card — `src/components/ModelUsage/`

Dark stacked-bar "usage vs daily limit" card, ported from the Figma `Chart`
frame (68:971) in Frame 386.

- Shell: 870 max-width, r24, `#262626→#3F3F3F` gradient, 1px black@10% border.
- Header: "Model Usage" title with the pulsing live dot **beside the heading**
  (`#00FF09` 6px + 12px ring, 2s CSS pulse) + subtitle.
- Chart (HTML/CSS, no SVG): 7 bar slots at fixed % positions
  (0.10244…0.95122 of plot width, from the Figma layout), y-axis `$30→$0`
  right-aligned, 7×7 dashed white@3% grid, bars = 36px stacks bottom-aligned
  (blue/orange/red/white cap = Flash/Fable/Pro/Other), dashed amber limit line
  at the `$25` level with a glowing "Limit · $25.00" pill (vertically centred ON
  the line), footer divider + legend + "Usage Today".
- Bars scale to dollar totals (max `$23.61` on Aug 18, just under the limit);
  Aug 18 per-model values are the exact Figma tooltip numbers
  (11.24 / 8.94 / 3.16 / 0.27). "Usage Today" = the last column's total
  (computed, not hardcoded). The design's duplicated "Aug 14/Aug 15" x labels
  were treated as an error → sequential Aug 12–18.
- **Y-axis correctness**: the plot content lives in `.mu-plot-inner` (8px top/bottom
  inset = half a label) so gridlines, the `$25` limit line, and bar tops share
  one linear value→position scale; y labels are absolutely positioned with
  `top: calc(8px + (1 - var(--v)/30) * (100% - 16px))` so each label's centre
  sits exactly on its gridline at any width. The limit line + horizontal
  gridlines are inset ~12px from the y-axis (like the design).
- **X-axis centring**: the x-axis row mirrors the chart body — a 24px spacer +
  `flex:1` `.mu-xaxis` (same width as the plot) so `slot%` labels centre exactly
  under the columns.
- **Column hover**: hit area is a tight per-column vertical strip — a column
  activates only when the cursor is over the column or the space directly above
  it (48px wide, `HIT_HALF = 24`); gaps select nothing. When a column is active:
  a full-height `.mu-bar-backdrop` column fades in behind it, the other columns
  dim to 0.45 (`.mu-bar.dimmed`), and the active column stays fully colored.
  Hovering a segment additionally shows the segment glow + tooltip row highlight
  (both together). Plays `sounds.hover()` on column change.
- **Segment hover**: the hovered model segment gets a subtle same-colour glow
  (`.mu-seg.hovered`, brightness 1.08 + 8px `color-mix` shadow) and its row is
  highlighted in the tooltip + its legend entry.
- **Legend hover**: hovering a legend item enters a per-model "compare across
  days" mode — that model's segment in EVERY column glows, every other segment
  dims (`.mu-seg.dimmed`, 0.35), and a tooltip-styled `.mu-value-pill` floats
  **above each column's top** showing that day's value (`usd`). The day tooltip
  is hidden while active; the hovered legend item stays bright, others dim; plays
  `sounds.hover()` on item change. Pills sit above each column top
  (`top = (1 − total/Y_MAX)`, framer `x/y` translate), fade/rise in staggered
  0.03s on mount, exit very subtly (0.15s) via `AnimatePresence`, and **persist
  across model switches** — the value rolls with a blur via `PillValue` (the
  `RollValue` pattern), so switching legend items blurs/rolls instead of popping.
  No segment math.
- **Usage Today hover**: hovering the bottom-right "Usage Today" highlights
  today's (last) column — same backdrop + dim + tooltip-over-column behaviour.
- **Hit-area trick**: `.mu-legend` uses `padding: 8px 0; margin: -8px 0;` — the
  padding expands the hover hit area so pills don't drop on a 1px drift, and the
  equal negative margin cancels the layout so the footer/divider sit as before.
- **Cursor / selection**: `.model-usage-card` has `user-select: none` (no I-beam
  over text); legend items, segments, and "Usage Today" are `cursor: pointer`.

### Spacing rule — flex + gap, not margins

Card sections are laid out as flex columns with `gap`, never margins between
siblings:

- `.model-usage-card` is a flex column, `gap: 24px` (sections: chart-group →
  divider → footer).
- `.mu-chart-group` wraps header + chart, `gap: 36px` (the heading breathing
  room is a gap, not a `margin-bottom`).
- `.mu-header` / `.mu-chart` / `.mu-footer` use inner `gap` for their own
  children (e.g. header title↔subtitle `gap: 3px`).
- One-sided offsets between *separate* block sections (or absolutely-positioned
  chart internals, where flex `gap` can't apply) are the only place margins /
  insets are used.

---

## Design-sound/data sanity checklist (before calling a component done)

- Every visible number is **derived from data**, not hardcoded (e.g. "Usage
  Today" = last column total, tooltip Total = sum of rows).
- Tooltip total always equals the sum of its rows; bar heights ∝ their values.
- Axis labels are aligned to gridlines/points on one linear scale.
- Hover sounds only where explicitly requested; keep hot paths lightweight
  (no per-frame DOM churn, no Calligraph).
- `user-select: none` on interactive cards; `cursor: pointer` on hover targets.
