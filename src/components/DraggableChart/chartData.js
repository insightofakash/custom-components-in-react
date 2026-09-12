// Generated dataset for the Draggable Chart — a deterministic, topic-neutral
// daily-ish series. Nothing here is hand-drawn: every point, date and value is
// produced below, so the chart (and its marker) is always derived from data.
//
// Built like a market chart, not additive sines. A momentum (autocorrelated)
// random walk creates sustained multi-bar runs both up and down — real
// saw-tooth — with a phase structure:
//   0–101   consolidation   — a low, tight wandering band
//   102–143 breakout        — a sudden sharp climb out of the band
//   144–287 irregular growth — momentum swings, run-downs and one-off pops
// This puts a "sudden increase in the middle" at default pan, growth is uneven.
//
// Layout constants used by the component:
//   PITCH = plotWidth / (windowSize - 1)  → one slot per data point
// The series is intentionally longer than the visible window so the ruler has
// room to pan in both directions.

function mulberry32(seed) {
    return function () {
        seed |= 0;
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const START = new Date(2025, 8, 27); // 27 Sep 2025 — dataset origin
const STEP_DAYS = 1; // daily series
const N = 288;   // 3× more data points
const WINDOW = 90; // points visible at once — 3× denser on screen too
const TODAY_IDX = 147; // fixed "reached" index the marker pins to
const TODAY_VALUE = 30506; // the marker's default value (matches the design)

const rand = mulberry32(20260125);   // per-bar shocks
const rand2 = mulberry32(99887766);  // second stream → pops/runs look decoupled

const CONSOL_BAND = 11800; // mean-reversion centre for the early flat phase
const BREAKOUT_START = 102;
const EXPANSION_START = 144;

const raw = [];
let price = 12100;
let momentum = 0;

// Expansion cadence: every 24 bars, a 3-bar correction leg (14–16); every 16
// bars, a cooldown flat (10–15). Keeps growth irregular and full of pullbacks.
const isDownLeg = (i) => {
    const p = i - EXPANSION_START;
    return p >= 0 && p % 24 >= 14 && p % 24 < 17;
};
const isCooldown = (i) => {
    const p = i - EXPANSION_START;
    return p >= 0 && p % 16 >= 10;
};

for (let i = 0; i < N; i++) {
    let bias = 0;   // phase-specific upward pressure
    let power = 1;  // shock strength multipler

    if (i < BREAKOUT_START) {
        // Consolidation: near-zero drift inside a tight, LIVELY band — enough
        // noise to rattle but strong reversion keeps it flat.
        power = 0.8;
        momentum = 0;
        price += (CONSOL_BAND - price) * 0.14;
    } else if (i < EXPANSION_START) {
        // Breakout: a sharp spike (sudden increase) that immediately pulls
        // back into a V, then grinds up — reads like a real impulse move.
        if (i === BREAKOUT_START) {
            price += 2400;
            momentum = 900;
        } else if (i === BREAKOUT_START + 1) {
            bias = -700; // pullback leg
            power = 0.7;
        } else if (i === BREAKOUT_START + 2) {
            bias = 600; // reclaim
        } else {
            bias = 330 + (rand() - 0.5) * 200;
            power = 1.1;
            if (rand2() < 0.3) bias += 240; // extra leg
        }
    } else {
        // Irregular growth: real multi-bar corrections interrupt the climb, so
        // any 30-point window shows clear ups AND downs, not one smooth ramp.
        const down = isDownLeg(i);
        const cool = isCooldown(i);
        bias = cool ? 20 : 190 + (rand() - 0.5) * 200;
        power = down ? 2.4 : cool ? 0.8 : 1.5;
    }

    // Momentum walk: persist most of last bar's move + a new shock. The high
    // persistence (higher on corrections) lets a down-shock ride several bars.
    const persist = isDownLeg(i) ? 0.9 : 0.82;
    momentum = momentum * persist + (rand() - 0.5) * 720 * power;
    price += bias + momentum;

    // One-off pops / gap-downs — the occasional single-bar surprise.
    if (rand2() < 0.045) price += rand2() * 2600;
    else if (rand2() < 0.05) price -= rand2() * 2400;

    raw.push(Math.round(price));
}

// Normalise so the value at the marker index is exactly 30506.
const scale = TODAY_VALUE / raw[TODAY_IDX];
const values = raw.map((v, i) =>
    i === TODAY_IDX ? TODAY_VALUE : Math.round(v * scale)
);

const dates = raw.map((_, i) => {
    const d = new Date(START);
    d.setDate(d.getDate() + i * STEP_DAYS);
    return d;
});

export const CHART = {
    values,
    dates,
    todayIdx: TODAY_IDX,
    windowSize: WINDOW,
};