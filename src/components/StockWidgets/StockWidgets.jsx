import { motion, animate } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    ArrowUp01Icon,
    ArrowDown01Icon,
    Refresh01Icon,
    PlayIcon,
    PauseIcon,
    StopIcon,
} from "@hugeicons/core-free-icons";
import amzn from "./assets/amzn.png";
import msft from "./assets/msft.png";
import "./StockWidgets.css";

const EASE_OUT = [0.22, 1, 0.36, 1];
const GREEN = "#00DE98";
const RED = "#DE0043";

const cardShadow =
    "0 8px 17.33px rgba(0,0,0,0.05), 0 32px 32px rgba(0,0,0,0.05), 0 73.34px 44px rgba(0,0,0,0.03), 0 129.34px 52px rgba(0,0,0,0.01), 0 202.68px 56px rgba(0,0,0,0)";

import { LARGE_PRICES, UP_PRICES, DOWN_PRICES, LARGE_OHLC, UP_OHLC, DOWN_OHLC, fmt } from "./stockData.js";

const TOTAL_TICKS = LARGE_PRICES.length;
const INITIAL_TICK = Math.max(3, Math.round(TOTAL_TICKS * 0.5));

const VIEWBOX = {
    large: "0 0 357 66",
    up: "0 0 187 50",
    down: "-20 0 186 50",
};

function buildPaths(prices, viewBoxStr, visibleCount) {
    const [vx, vy, vw, vh] = viewBoxStr.split(" ").map(Number);
    const n = prices.length;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    const pad = vh * 0.15;
    const usable = vh * 0.7;
    const pts = prices.map((p, i) => ({
        x: vx + (i / (n - 1)) * vw,
        y: vy + pad + (1 - (p - min) / range) * usable,
    }));
    // Draw only the first `visibleCount` points — positions stay fixed on the
    // full-array timeline so the line grows one tick at a time.
    const k = Math.min(Math.max(visibleCount, 1), n);
    const vis = pts.slice(0, k);
    const line = vis.map((pt, i) => `${i === 0 ? "M" : "L"}${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`).join("");
    const first = vis[0];
    const last = vis[vis.length - 1];
    // Fill: line → bottom-right → bottom-left → close
    const bottomY = vy + vh;
    const fill = `${line} L${last.x.toFixed(2)} ${bottomY.toFixed(2)} L${vx.toFixed(2)} ${bottomY.toFixed(2)} Z`;
    return { line, fill, first, last, viewBox: viewBoxStr };
}

function deriveOHLC(prices, tick) {
    const k = Math.min(Math.max(tick, 1), prices.length);
    const visible = prices.slice(0, k);
    const open = prices[0];
    const current = visible[visible.length - 1];
    const high = Math.max(...visible);
    const low = Math.min(...visible);
    const change = Math.round((current - open) * 100) / 100;
    const pct = Math.round((change / open) * 10000) / 100;
    return { open, high, low, current, change, pct };
}

function StockChart({ color, kind, tick }) {
    const prices = kind === "large" ? LARGE_PRICES : kind === "down" ? DOWN_PRICES : UP_PRICES;
    const viewBox = VIEWBOX[kind];
    const { line, fill, last } = buildPaths(prices, viewBox, tick);
    const [dotReady, setDotReady] = useState(false);
    const gradId = `sw-grad-${color.replace("#", "")}-${kind}`;
    const preserve = "xMinYMid meet";
    return (
        <svg className="sw-chart" viewBox={viewBox} preserveAspectRatio={preserve} aria-hidden="true">
            <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
                    <stop offset="0%" stopColor={color} stopOpacity="0.42" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <motion.path d={fill} fill={`url(#${gradId})`} fillOpacity={0.4} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.2 }} />
            <motion.path d={line} fill="none" stroke={color} strokeWidth={2.67} strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1] }} onAnimationComplete={() => setDotReady(true)} />
            {/* Pulsing end dot — mounted only after the line draw finishes, then pulses forever */}
            {dotReady && (
                <>
                    <motion.circle cx={last.x} cy={last.y} r={3} fill={color} initial={{ opacity: 0, r: 0 }} animate={{ opacity: [1, 0.5, 1], r: [3, 3.6, 3] }} transition={{ duration: 1.6, repeat: Infinity, ease: EASE_OUT }} />
                    <motion.circle cx={last.x} cy={last.y} r={4.6} fill={color} initial={{ opacity: 0, r: 0 }} animate={{ opacity: [0.55, 0, 0.55], r: [4.6, 10, 4.6] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }} />
                </>
            )}
        </svg>
    );
}

function Glow({ color, variant, dynamic }) {
    const style =
        variant === "a"
            ? { left: -28, top: 8, opacity: 0.32, mixBlendMode: "color-dodge", transform: "rotate(-51.64deg)" }
            : { left: 22, top: 24, opacity: 0.36, mixBlendMode: "color-dodge", transform: "rotate(51.64deg)" };
    const base = {
        className: "sw-glow",
        style: { width: 190, height: 170, background: `radial-gradient(ellipse at 50% 50%, ${color} 0%, ${color}00 72%)`, filter: "blur(30px)", borderRadius: "50%", ...style },
    };
    if (!dynamic) return <div {...base} />;

    const cfg =
        variant === "a"
            ? { rotate: -51.64, opacity: [0.32, 0.55, 0.2, 0.32], scale: [1, 1.35, 0.9, 1], blur: ["blur(30px)", "blur(40px)", "blur(30px)"], duration: 4.2 }
            : { rotate: 51.64, opacity: [0.36, 0.6, 0.24, 0.36], scale: [1, 1.2, 0.95, 1], blur: ["blur(30px)", "blur(38px)", "blur(30px)"], duration: 5.6 };
    return (
        <motion.div
            {...base}
            style={{ ...base.style, width: 210, height: 185 }}
            initial={{ opacity: cfg.opacity[0], scale: 1, rotate: cfg.rotate, filter: cfg.blur[0] }}
            animate={{ opacity: cfg.opacity, scale: cfg.scale, rotate: cfg.rotate, filter: cfg.blur }}
            transition={{ duration: cfg.duration, repeat: Infinity, ease: "easeInOut" }}
        />
    );
}

function useRoll(to) {
    const [value, setValue] = useState(to);
    const [rolling, setRolling] = useState(false);
    const prevRef = useRef(null);
    useEffect(() => {
        const from = prevRef.current == null ? to : prevRef.current;
        if (from === to) {
            prevRef.current = to;
            setValue(to);
            setRolling(false);
            return undefined;
        }
        setRolling(true);
        const controls = animate(from, to, {
            duration: 0.25,
            ease: EASE_OUT,
            onUpdate: (v) => setValue(v),
            onComplete: () => {
                prevRef.current = to;
                setValue(to);
                setRolling(false);
            },
        });
        prevRef.current = to;
        return () => controls.stop();
    }, [to]);
    return { value, rolling };
}

function RollText({ to, format, className, style }) {
    const { value, rolling } = useRoll(to);
    return (
        <span className={`sw-roll ${className || ""} ${rolling ? "rolling" : ""}`.trim()} style={style}>
            {format(value)}
        </span>
    );
}

function Price({ value, size, tone }) {
    const { value: v, rolling } = useRoll(value);
    const [main, cents] = v.toFixed(2).split(".");
    const toneClass = tone === "high" ? "sw-price--high" : tone === "low" ? "sw-price--low" : "";
    return (
        <div className={`sw-price sw-price--${size} ${toneClass} ${rolling ? "rolling" : ""}`}>
            <span className="sw-price-main">${main}</span>
            <span className="sw-price-cents">.{cents}</span>
        </div>
    );
}

function Change({ abs, pct, up }) {
    const { value: absV, rolling: absRoll } = useRoll(abs);
    const { value: pctV, rolling: pctRoll } = useRoll(pct);
    const rolling = absRoll || pctRoll;
    const absStr = `${absV >= 0 ? "+" : ""}${absV.toFixed(2)}`;
    return (
        <div className={`sw-change ${up ? "sw-change--up" : "sw-change--down"} ${rolling ? "rolling" : ""}`}>
            <span className="sw-change-abs">({absStr})</span>
            <span className="sw-change-pct">
                <HugeiconsIcon icon={up ? ArrowUp01Icon : ArrowDown01Icon} size={11} strokeWidth={2.8} />
                {pctV.toFixed(2)}%
            </span>
        </div>
    );
}

function Ohlc({ rows }) {
    return (
        <div className="sw-ohlc">
            {rows.map(([label, value, tone]) => (
                <div className="sw-ohlc-row" key={label}>
                    <span className="sw-ohlc-label">{label}</span>
                    <Price value={value} size="sm" tone={tone} />
                </div>
            ))}
        </div>
    );
}

function Avatar({ src, size }) {
    return (
        <div className="sw-avatar" style={{ width: size, height: size }}>
            <img src={src} alt="" draggable={false} />
        </div>
    );
}

function LargeCard({ tick }) {
    const d = deriveOHLC(LARGE_PRICES, tick);
    return (
        <motion.article className="sw-card sw-card--large" style={{ boxShadow: cardShadow }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE_OUT }}>
            <Glow color={GREEN} variant="a" dynamic />
            <Glow color={GREEN} variant="b" dynamic />
            <div className="sw-header">
                <div className="sw-company">
                    <Avatar src={amzn} size={46.67} />
                    <div className="sw-company-text">
                        <span className="sw-ticker sw-ticker--muted">AMZN</span>
                        <span className="sw-name">Amazon Ltd.</span>
                    </div>
                </div>
                <div className="sw-updated">
                    <span className="sw-updated-label">Updated</span>
                    <span className="sw-updated-value">just now</span>
                </div>
            </div>
            <div className="sw-chart-zone sw-chart-zone--large">
                <StockChart color={GREEN} kind="large" tick={tick} />
            </div>
            <span className="sw-divider" style={{ top: "124.8px", color: GREEN }} />
            <div className="sw-bottom">
                <Ohlc rows={[["Open", d.open], ["High", d.high, "high"], ["Low", d.low, "low"]]} />
                <div className="sw-current">
                    <span className="sw-cp-label">Current Price</span>
                    <Price value={d.current} size="lg" />
                    <Change abs={d.change} pct={Math.abs(d.pct)} up />
                </div>
            </div>
        </motion.article>
    );
}

function AmznCard({ tick }) {
    const d = deriveOHLC(UP_PRICES, tick);
    return (
        <motion.article className="sw-card sw-card--small" style={{ boxShadow: cardShadow }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.08 }}>
            <Glow color={GREEN} variant="a" />
            <Glow color={GREEN} variant="b" />
            <div className="sw-header">
                <div className="sw-company">
                    <Avatar src={amzn} size={26.67} />
                    <span className="sw-ticker">AMZN</span>
                </div>
                <div className="sw-time">
                    <HugeiconsIcon icon={Refresh01Icon} size={12} strokeWidth={2.8} />
                    <span>1s</span>
                </div>
            </div>
            <div className="sw-chart-zone sw-chart-zone--small">
                <StockChart color={GREEN} kind="up" tick={tick} />
            </div>
            <div className="sw-bottom sw-bottom--small" style={{ gap: "39.97px", alignItems: "flex-end" }}>
                <div style={{ width: 73.667, height: 58.667, display: "flex", flexDirection: "column", gap: 5.333 }}>
                    <Ohlc rows={[["O", d.open], ["H", d.high, "high"], ["L", d.low, "low"]]} />
                </div>
                <div style={{ width: 74, height: 62.333, display: "flex", flexDirection: "column", gap: 5.333, alignItems: "flex-end" }}>
                    <div style={{ width: 74, height: 41, display: "flex", flexDirection: "column", gap: 0, alignItems: "flex-end" }}>
                        <Price value={d.current} size="md" />
                        <RollText to={d.change} format={(x) => `(+${Math.abs(x).toFixed(2)})`} style={{ height: 16, fontSize: 13.334, fontWeight: 700, color: GREEN, opacity: 0.7, lineHeight: "16px", textAlign: "right", whiteSpace: "nowrap", fontFamily: "var(--t-font-rounded)" }} />
                    </div>
                    <div style={{ width: 53.666, height: 16, display: "flex", gap: 2.666, alignItems: "center", marginLeft: 20.333 }}>
                        <HugeiconsIcon icon={ArrowUp01Icon} size={11} strokeWidth={2.8} color={GREEN} />
                        <RollText to={Math.abs(d.pct)} format={(x) => `${x.toFixed(2)}%`} style={{ fontSize: 13.334, fontWeight: 700, color: GREEN, lineHeight: "16px", fontFamily: "var(--t-font-rounded)" }} />
                    </div>
                </div>
            </div>
        </motion.article>
    );
}

function MsftCard({ tick }) {
    const d = deriveOHLC(DOWN_PRICES, tick);
    return (
        <motion.article className="sw-card sw-card--small" style={{ boxShadow: cardShadow }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.16 }}>
            <Glow color={RED} variant="a" />
            <Glow color={RED} variant="b" />
            <div className="sw-header">
                <div className="sw-company">
                    <Avatar src={msft} size={32} />
                    <div className="sw-company-text">
                        <span className="sw-ticker">MSFT</span>
                        <Change abs={d.change} pct={Math.abs(d.pct)} up={false} />
                    </div>
                </div>
            </div>
            <div className="sw-chart-zone sw-chart-zone--small">
                <StockChart color={RED} kind="down" tick={tick} />
            </div>
            <div className="sw-bottom sw-bottom--small">
                <div className="sw-current sw-current--lg">
                    <span className="sw-cp-label">Current Price</span>
                    <Price value={d.current} size="lg" />
                </div>
            </div>
        </motion.article>
    );
}

function StockWidgets() {
    const [tick, setTick] = useState(INITIAL_TICK);
    const [playing, setPlaying] = useState(true);

    useEffect(() => {
        if (!playing) return undefined;
        const id = setInterval(() => setTick((t) => (t >= TOTAL_TICKS ? t : t + 1)), 2000);
        return () => clearInterval(id);
    }, [playing]);

    useEffect(() => {
        if (tick >= TOTAL_TICKS) setPlaying(false);
    }, [tick]);

    const play = () => {
        setTick((t) => (t >= TOTAL_TICKS ? INITIAL_TICK : t));
        setPlaying(true);
    };
    const pause = () => setPlaying(false);
    const stop = () => {
        setPlaying(false);
        setTick(INITIAL_TICK);
    };

    return (
        <motion.section className="stock-widgets" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE_OUT }}>
            <LargeCard tick={tick} />
            <div className="sw-row">
                <AmznCard tick={tick} />
                <MsftCard tick={tick} />
            </div>
            <div className="sw-controls">
                <button type="button" className="sw-ctl" onClick={playing ? pause : play} aria-label={playing ? "Pause" : "Play"}>
                    <HugeiconsIcon icon={playing ? PauseIcon : PlayIcon} size={17} strokeWidth={2.2} />
                </button>
                <button type="button" className="sw-ctl" onClick={stop} aria-label="Stop">
                    <HugeiconsIcon icon={StopIcon} size={16} strokeWidth={2.2} />
                </button>
            </div>
        </motion.section>
    );
}

export default StockWidgets;
