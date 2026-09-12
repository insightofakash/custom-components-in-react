import { useEffect, useRef, useState } from "react";
import {
    AnimatePresence,
    motion,
    useMotionValue,
    useMotionValueEvent,
    useSpring,
    useTransform,
} from "framer-motion";
import NumberPopIn from "../NumberPopIn/NumberPopIn.jsx";
import SlidingTabs from "../SlidingTabs/SlidingTabs.jsx";
import sounds from "../../lib/sounds.js";
import { CHART } from "./chartData.js";
import "./DraggableChart.css";

// ── Geometry (all from the Figma frame) ─────────────────────────────────
const PLOT_W = 790;   // width of the plot content area
const PLOT_H = 238;   // plot frame height (pill sits inside the top)
const PAD = 36;       // left/right inset of the plot inside the frame
const FRAME_W = PLOT_W + PAD * 2;
const TOP_Y = 34.8;   // curve top
const BASE_Y = 203;   // curve baseline
const PILL_BOTTOM = 28; // pill 0..28
const DOT = 18;        // marker dot size
const RULER_SPEED = 3.2;   // px of chart pan per 1px of ruler drag
const RULER_RATIO = 1.5;   // chart moves 1.5× the ruler ticks (ruler 1× → chart 1.5×)
const CHASE_TAU = 70;      // ms — target/current chase smoothness (cluster-style)
const MOMENTUM_TIME = 0.4; // s — projected glide past the release point
const TICK_GAP = 40;       // ms — min gap between trrrr ticks

const { values, dates, todayIdx, windowSize } = CHART;
const N = values.length;

const PITCH = PLOT_W / (windowSize - 1); // px per data point
const STRIP_W = PITCH * (N - 1);
const minV = Math.min(...values);
const maxV = Math.max(...values);
const range = maxV - minV || 1;

const yFor = (v) => BASE_Y - ((v - minV) / range) * (BASE_Y - TOP_Y);

const DEFAULT_PAN = PAD + todayIdx * PITCH - 425.8;
// Full-range pan: from the very first data point to the absolute last.
const PAN_MIN = 0;
const PAN_MAX = STRIP_W - PLOT_W;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

const fmt = (v) => v.toLocaleString("en-US");
const ordinal = (n) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
};
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmtDate = (d) => `${ordinal(d.getDate())} ${MONTHS[d.getMonth()]}, ${d.getFullYear()}`;

// ── Paths (depend only on the split index — fractionally, so the blue/gray
// boundary travels exactly with the eased marker dot, never ahead of it)
const pts = values.map((v, i) => ({ x: i * PITCH, y: yFor(v) }));
const toPath = (a, b) =>
    pts
        .slice(a, b + 1)
        .map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
        .join("");
const toPathFrom = (a, b) =>
    pts
        .slice(a, b + 1)
        .map((p) => `L${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
        .join("");

// Fractional split: interpolate the split point between the two bracketing
// data points so the boundary sits exactly on the eased marker position.
function pathsFor(split) {
    const s = Math.max(0, Math.min(N - 1, split));
    const i0 = Math.floor(s);
    const i1 = Math.min(i0 + 1, N - 1);
    const t = s - i0;
    const px = pts[i0].x + (pts[i1].x - pts[i0].x) * t;
    const py = pts[i0].y + (pts[i1].y - pts[i0].y) * t;
    const bluePath = `${toPath(0, i0)} L${px.toFixed(2)} ${py.toFixed(2)}`;
    const grayPath = `M${px.toFixed(2)} ${py.toFixed(2)}${toPathFrom(i1, N - 1)}`;
    const first = pts[0];
    const areaPath = `${bluePath} L${px.toFixed(2)} ${BASE_Y.toFixed(2)} L${first.x.toFixed(2)} ${BASE_Y.toFixed(2)} Z`;
    return { bluePath, grayPath, areaPath };
}

// ── Column view ────────────────────────────────────────────────────────
// Same data, same pan: one bar per data point, centred on the point, colored
// blue up to the marker (reached) and gray after it — mirroring the line split.
const COL_BAR_W = 5;

const BARS = values.map((v, i) => {
    const y = yFor(v);
    return { i, x: i * PITCH + (PITCH - COL_BAR_W) / 2, y, h: BASE_Y - y };
});

function DraggableChart() {
    const rulerRef = useRef(null);
    const plotRef = useRef(null);
    const dragRef = useRef(null);
    const targetRef = useRef(DEFAULT_PAN);   // where the drag wants to be
    const velSamplesRef = useRef([]);         // { t, p } for release velocity
    const lastIdxRef = useRef(Math.round(DEFAULT_PAN / PITCH));
    const lastTickRef = useRef(0);
    const lastHoverTickRef = useRef(0);
    const lastHoverXRef = useRef(0);
    const edgeStartRef = useRef(-1);
    const [markerIdx, setMarkerIdx] = useState(todayIdx); // hovered data point
    const [edgeIdx, setEdgeIdx] = useState(() => {
        const e = clamp(Math.round(DEFAULT_PAN / PITCH), 0, N - windowSize);
        edgeStartRef.current = e;
        return e;
    });
    const [dragging, setDragging] = useState(false);
    const [mode, setMode] = useState("line"); // "line" | "bar"

    const pan = useMotionValue(DEFAULT_PAN);
    const markerIndex = useMotionValue(todayIdx);
    // Chart moves 1.5× the ruler ticks (RULER_RATIO) — the ruler is the handle
    // (1×), the chart content glides ahead of it.
    const stripX = useTransform(pan, (p) => -p);
    const rulerX = useTransform(pan, (p) => -p / RULER_RATIO);
    // The marker's own index eases; the blue/gray split, the dot and the
    // cursor lines ALL derive from the SAME eased value so the chart stays
    // glued to the dot — it never moves ahead of it.
    const markerIndexSpring = useSpring(markerIndex, { stiffness: 520, damping: 38, mass: 0.6 });
    const markerScreenX = useTransform(
        [pan, markerIndexSpring],
        ([p, i]) => PAD + i * PITCH - p
    );
    const bluePath = useTransform(markerIndexSpring, (s) => pathsFor(s).bluePath);
    const grayPath = useTransform(markerIndexSpring, (s) => pathsFor(s).grayPath);
    const areaPath = useTransform(markerIndexSpring, (s) => pathsFor(s).areaPath);
    const dotY = useTransform(markerIndexSpring, (s) => {
        const k = clamp(s, 0, N - 1);
        const i0 = Math.floor(k);
        const i1 = Math.min(i0 + 1, N - 1);
        const t = k - i0;
        return yFor(values[i0] + (values[i1] - values[i0]) * t);
    });
    const dotTop = useTransform(dotY, (y) => y - DOT / 2);
    const upperH = useTransform(dotY, (y) => Math.max(0, y - DOT / 2 - PILL_BOTTOM));
    const lowerTop = useTransform(dotY, (y) => y + DOT / 2);
    const lowerH = useTransform(dotY, (y) => Math.max(0, BASE_Y - (y + DOT / 2)));

    // ── Target/current chase loop (the clustering momentum) ─────────────
    // The rendered pan eases toward the drag target every frame. Fast drags
    // leave the rendered value behind; on release it keeps gliding toward a
    // projected rest point = natural momentum "moves more than I did".
    useEffect(() => {
        let raf;
        let last = performance.now();
        const loop = (now) => {
            const dt = Math.min(now - last, 50);
            last = now;
            const t = targetRef.current;
            const cur = pan.get();
            const diff = t - cur;
            if (Math.abs(diff) > 0.01) {
                const alpha = 1 - Math.exp(-dt / CHASE_TAU);
                pan.set(cur + diff * alpha);
            }
            // trrrr — one tick per data point crossed (drag + momentum glide)
            const idx = Math.round(pan.get() / PITCH);
            if (idx !== lastIdxRef.current) {
                lastIdxRef.current = idx;
                const ts = performance.now();
                if (ts - lastTickRef.current >= TICK_GAP) {
                    lastTickRef.current = ts;
                    sounds.thock(0.7);
                }
            }
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, [pan]);

    useMotionValueEvent(pan, "change", (p) => {
        const e = clamp(Math.round(p / PITCH), 0, N - windowSize);
        if (e !== edgeStartRef.current) {
            edgeStartRef.current = e;
            setEdgeIdx(e);
        }
    });

    useEffect(() => {
        const el = rulerRef.current;
        if (!el) return;
        // Trackpad / wheel — two-finger swipe pans the chart (non-passive so
        // the browser never turns it into a page scroll). Scoped to the ruler:
        // the chart only handles tooltip hover, never drag.
        const onWheel = (e) => {
            e.preventDefault();
            const delta = Math.abs(e.deltaX) >= Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
            targetRef.current = clamp(targetRef.current - delta, PAN_MIN, PAN_MAX);
            velSamplesRef.current.push({ t: performance.now(), p: targetRef.current });
        };
        el.addEventListener("wheel", onWheel, { passive: false });
        return () => {
            el.removeEventListener("wheel", onWheel);
            dragRef.current?.releasePointerCapture?.(dragRef.current.pointerId);
        };
    }, [pan]);

    const onPlotMove = (e) => {
        if (dragging) return;
        const rect = plotRef.current.getBoundingClientRect();
        const localX = e.clientX - rect.left - PAD;
        const i = clamp(Math.round((pan.get() + localX) / PITCH), 0, N - 1);
        setMarkerIdx(i);
        markerIndex.set(i);
        // Constant "trrrrr" while the tooltip glides over the chart — a
        // whisper tick on fine pointer movement (every ~3px), throttled, so
        // the faster you sweep the denser the continuous crackle reads.
        const ts = performance.now();
        if (
            ts - lastHoverTickRef.current >= 40 &&
            Math.abs(localX - lastHoverXRef.current) >= 3
        ) {
            lastHoverTickRef.current = ts;
            lastHoverXRef.current = localX;
            sounds.tick(0.3);
        }
    };

    // Release velocity: measured from the last ~110ms of movement, so a pause
    // before lifting naturally yields ~0 — no stale-fling jump on release.
    const releaseVelocity = (samples) => {
        const now = performance.now();
        if (samples.length < 2) return 0;
        const last = samples[samples.length - 1];
        let start = samples[0];
        for (let i = samples.length - 1; i >= 0; i--) {
            if (samples[i].t <= last.t - 110) {
                start = samples[i];
                break;
            }
        }
        const dt = (last.t - start.t) || 1;
        if (now - last.t > 120) return 0; // held still before lifting
        return ((last.p - start.p) / dt) * 1000;
    };

    const onRulerDown = (e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        const now = performance.now();
        dragRef.current = {
            id: e.pointerId,
            x: e.clientX,
            target: targetRef.current,
        };
        velSamplesRef.current = [{ t: now, p: targetRef.current }];
        setDragging(true);
    };
    const onRulerMove = (e) => {
        const ref = dragRef.current;
        if (!ref) return;
        const dx = e.clientX - ref.x;
        const next = clamp(ref.target - dx * RULER_SPEED, PAN_MIN, PAN_MAX);
        targetRef.current = next;
        velSamplesRef.current.push({ t: performance.now(), p: next });
        if (velSamplesRef.current.length > 64) velSamplesRef.current.shift();
        // trrrr — immediate feedback on the drag target, not the lagged render
        const idx = Math.round(next / PITCH);
        if (idx !== lastIdxRef.current) {
            lastIdxRef.current = idx;
            const ts = performance.now();
            if (ts - lastTickRef.current >= TICK_GAP) {
                lastTickRef.current = ts;
                sounds.thock(0.7);
            }
        }
    };
    const onRulerUp = (e) => {
        const ref = dragRef.current;
        if (!ref) return;
        e.currentTarget.releasePointerCapture?.(e.pointerId);
        dragRef.current = null;
        setDragging(false);
        // Momentum: glide past the release point, then ease to rest.
        const v = clamp(releaseVelocity(velSamplesRef.current), -6000, 6000);
        if (Math.abs(v) > 60) {
            targetRef.current = clamp(pan.get() + v * MOMENTUM_TIME, PAN_MIN, PAN_MAX);
        }
    };

    const value = values[markerIdx];

    const leftDate = dates[edgeIdx];
    const rightDate = dates[Math.min(edgeIdx + windowSize, N - 1)];

    const onMode = (i) => {
        sounds.toggle();
        setMode(i === 0 ? "line" : "bar");
    };

    return (
        <motion.section
            className="dc-root"
            style={{ "--dc-frame": `${FRAME_W}px`, "--dc-plot": `${PLOT_W}px`, "--dc-pad": `${PAD}px` }}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
            <div className="dc-tabs">
                <SlidingTabs tabs={["Line", "Bar"]} onChange={onMode} />
            </div>

            <div className="dc-plot" ref={plotRef} onPointerMove={onPlotMove}>
                <div className="dc-clip">
                    <AnimatePresence initial={false}>
                        {mode === "line" ? (
                            <motion.div
                                key="line"
                                className="dc-strip"
                                style={{ x: stripX }}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.18 }}
                            >
                                <svg
                                    width={STRIP_W}
                                    height={PLOT_H}
                                    viewBox={`0 0 ${STRIP_W} ${PLOT_H}`}
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <defs>
                                        <linearGradient
                                            id="dc-area"
                                            x1="0"
                                            y1={BASE_Y}
                                            x2="0"
                                            y2={TOP_Y}
                                            gradientUnits="userSpaceOnUse"
                                        >
                                            <stop stopColor="#4171FF" stopOpacity="0" />
                                            <stop offset="1" stopColor="#4171FF" />
                                        </linearGradient>
                                    </defs>
                                    <motion.path d={areaPath} fill="url(#dc-area)" fillOpacity="0.4" />
                                    <motion.path
                                        d={bluePath}
                                        stroke="#4171FF"
                                        strokeWidth={2.4}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                    <motion.path
                                        d={grayPath}
                                        stroke="#A6A6A6"
                                        strokeWidth={2.4}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="bar"
                                className="dc-strip"
                                style={{ x: stripX }}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.18 }}
                            >
                                <svg
                                    width={STRIP_W}
                                    height={PLOT_H}
                                    viewBox={`0 0 ${STRIP_W} ${PLOT_H}`}
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    {BARS.map((b) => (
                                        <rect
                                            key={b.i}
                                            x={b.x.toFixed(2)}
                                            y={b.y.toFixed(2)}
                                            width={COL_BAR_W}
                                            height={b.h.toFixed(2)}
                                            rx={1.5}
                                            fill={b.i <= markerIdx ? "#4171FF" : "#C4C4C4"}
                                        />
                                    ))}
                                </svg>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <motion.div className="dc-marker" style={{ x: markerScreenX }}>
                    <span className="dc-pill type-body">
                        <NumberPopIn key={fmt(value)} value={fmt(value)} />
                    </span>
                    <motion.span className="dc-cursor" style={{ top: PILL_BOTTOM, height: upperH }} />
                    <motion.span className="dc-dot" style={{ top: dotTop }} />
                    <motion.span className="dc-cursor dc-cursor--blue" style={{ top: lowerTop, height: lowerH }} />
                </motion.div>

                <div className="dc-plot-fade dc-plot-fade--l" />
                <div className="dc-plot-fade dc-plot-fade--r" />
            </div>

            <div
                ref={rulerRef}
                className={`dc-ruler ${dragging ? "is-dragging" : ""}`}
                onPointerDown={onRulerDown}
                onPointerMove={onRulerMove}
                onPointerUp={onRulerUp}
                onPointerCancel={onRulerUp}
            >
                <motion.div
                    className="dc-ticks dc-ticks--minor"
                    style={{ x: rulerX, width: STRIP_W }}
                />
                <motion.div
                    className="dc-ticks dc-ticks--major"
                    style={{ x: rulerX, width: STRIP_W }}
                />
                <div className="dc-fade dc-fade--l" />
                <div className="dc-fade dc-fade--r" />
            </div>

            <div className="dc-dates">
                <span className="type-body">{fmtDate(leftDate)}</span>
                <span className="type-body">{fmtDate(rightDate)}</span>
            </div>
        </motion.section>
    );
}

export default DraggableChart;