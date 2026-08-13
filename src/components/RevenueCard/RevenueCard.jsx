import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, animate } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    ArrowUpRight01Icon as HugeTrendUpIcon,
    ChartColumnIcon as HugeChartColumnIcon,
    ChartLineIcon as HugeChartLineIcon,
    ChevronLeftIcon as HugeChevronLeftIcon,
    ChevronRightIcon as HugeChevronRightIcon,
} from "@hugeicons/core-free-icons";
import "./RevenueCard.css";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];
const START_YEAR = 2022;
const START_MONTH = 6;
const YEAR_COUNT = 3;

const COMPARE = [
    { id: "orders", label: "Total Orders" },
    { id: "aov", label: "Average Order Value" },
    { id: "customers", label: "New Customers" },
    { id: "retention", label: "Customer Retention" },
    { id: "margin", label: "Gross Margin" },
];

function metricNoise(id, i) {
    let seed = 97;
    for (let k = 0; k < id.length; k++) {
        seed = (seed * 131 + id.charCodeAt(k)) % 2147483647;
    }
    seed = ((seed * 16807) % 2147483647 + i * 7919 + 17) % 2147483647;
    return ((seed % 2000) / 2000) - 0.5;
}

function buildMetrics(i, t, m, value) {
    const clamp = (v) => Math.max(6, Math.min(114, Math.round(v)));
    const out = {};

    const ordersPlot = clamp(value * 0.92 + metricNoise("orders", i) * 10);
    out.orders = { plot: ordersPlot, val: Math.round(ordersPlot * 96) };

    const aovPlot = clamp(
        value * 0.45 + 42 + metricNoise("aov", i) * 6 + 7 * Math.sin(((m - 8) / 12) * Math.PI * 2),
    );
    out.aov = { plot: aovPlot, val: 88 + Math.round((aovPlot - 18) * 0.9) };

    const customersPlot = clamp(
        i < 12 ? 18 + i * 4 + metricNoise("customers", i) * 10 : value * 0.7 + metricNoise("customers", i) * 14,
    );
    out.customers = { plot: customersPlot, val: Math.round(customersPlot * 8.5) };

    const retentionPlot = clamp(68 + (value - 40) * 0.24 + metricNoise("retention", i) * 5);
    out.retention = { plot: retentionPlot, val: Math.round((retentionPlot / 114) * 100) };

    const marginPlot = clamp(40 + (value - 40) * 0.15 + metricNoise("margin", i) * 4);
    out.margin = { plot: marginPlot, val: Math.round((marginPlot / 114) * 100) };

    return out;
}

const round2 = (v) => Math.round(v * 100) / 100;

const METRIC_FORMAT = {
    orders: (v) => Math.round(v).toLocaleString("en-US"),
    aov: (v) => `$${Math.round(v).toLocaleString("en-US")}`,
    customers: (v) => Math.round(v).toLocaleString("en-US"),
    retention: (v) => `${round2(v)}%`,
    margin: (v) => `${round2(v)}%`,
};

const SECONDARY = "#8A97A6";
const SECONDARY_DARK = "#5D6A78";

function buildMonths() {
    const out = [];
    let seed = 42;
    const rand = () => {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
    };
    const total = YEAR_COUNT * 12;
    for (let i = 0; i < total; i++) {
        const abs = START_MONTH + i;
        const year = START_YEAR + Math.floor(abs / 12);
        const m = abs % 12;
        const t = i / (total - 1);
        const season = 7 * Math.sin(((m - 8) / 12) * Math.PI * 2);
        const noise = (rand() - 0.5) * 13;
        const value = Math.max(18, Math.min(108, Math.round(30 + t * 62 + season + noise)));
        const revenueNum = value * 1020;
        const revenue = `$${revenueNum.toLocaleString("en-US")}`;
        out.push({
            label: MONTH_LABELS[m],
            year,
            fullLabel: `${MONTH_LABELS[m]} ${year}`,
            showYear: m === 0,
            value,
            revenueNum,
            revenue,
            metrics: buildMetrics(i, t, m, value),
        });
    }
    return out;
}

const W = 596;
const H = 396;
const PLOT_LEFT = 34;
const PLOT_RIGHT = 582;
const PLOT_TOP = 28;
const PLOT_BOTTOM = 356;
const PLOT_W = PLOT_RIGHT - PLOT_LEFT;
const PLOT_H = PLOT_BOTTOM - PLOT_TOP;
const Y_MAX = 120;

const MONTHS = buildMonths();
const TOTAL_REVENUE = MONTHS.reduce((s, d) => s + d.revenueNum, 0);

const xs = MONTHS.map((_, i) => PLOT_LEFT + (i / (MONTHS.length - 1)) * PLOT_W);
const yFor = (v) => PLOT_BOTTOM - (v / Y_MAX) * PLOT_H;
const pts = MONTHS.map((d, i) => ({ x: xs[i], y: yFor(d.value) }));

function smoothPath(points) {
    if (points.length < 2) return "";
    let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i - 1] || points[i];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[i + 2] || p2;
        const c1x = p1.x + (p2.x - p0.x) / 6;
        const c1y = p1.y + (p2.y - p0.y) / 6;
        const c2x = p2.x - (p3.x - p1.x) / 6;
        const c2y = p2.y - (p3.y - p1.y) / 6;
        d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
    }
    return d;
}

const linePath = smoothPath(pts);
const areaPath = `${linePath} L ${pts[pts.length - 1].x.toFixed(2)} ${PLOT_BOTTOM} L ${pts[0].x.toFixed(2)} ${PLOT_BOTTOM} Z`;
const GRID_VALUES = [0, 20, 40, 60, 80, 100, 120];

const TrendIcon = () => (
    <HugeiconsIcon
        icon={HugeTrendUpIcon}
        size={16}
        strokeWidth={2}
    />
);

const LineIcon = () => (
    <HugeiconsIcon
        icon={HugeChartLineIcon}
        size={18}
        strokeWidth={2}
    />
);

const BarIcon = () => (
    <HugeiconsIcon
        icon={HugeChartColumnIcon}
        size={18}
        strokeWidth={2}
    />
);

const ChevronRightIcon = () => (
    <HugeiconsIcon
        icon={HugeChevronRightIcon}
        size={16}
        strokeWidth={2.2}
    />
);

const ChevronLeftIcon = () => (
    <HugeiconsIcon
        icon={HugeChevronLeftIcon}
        size={16}
        strokeWidth={2.2}
    />
);

function CountUp({ to }) {
    const ref = useRef(null);
    const [rolling, setRolling] = useState(false);
    useEffect(() => {
        setRolling(true);
        const controls = animate(0, to, {
            duration: 1.1,
            ease: [0.22, 1, 0.36, 1],
            onUpdate: (v) => {
                if (ref.current) {
                    ref.current.textContent = Math.round(v).toLocaleString("en-US");
                }
            },
            onComplete: () => setRolling(false),
        });
        return () => controls.stop();
    }, [to]);
    return (
        <div className="revenue-value">
            <span className="currency">$</span>
            <span
                ref={ref}
                className={`value-num ${rolling ? "rolling" : ""}`}
            >
                0
            </span>
        </div>
    );
}

const moneyFormat = (v) => `$${Math.round(v).toLocaleString("en-US")}`;

function RollValue({ to, format, className }) {
    const ref = useRef(null);
    const prevRef = useRef(null);
    const [rolling, setRolling] = useState(false);
    useEffect(() => {
        const from = prevRef.current == null ? to : prevRef.current;
        if (from === to) {
            prevRef.current = to;
            setRolling(false);
            if (ref.current) {
                ref.current.textContent = format(to);
            }
            return undefined;
        }
        setRolling(true);
        const controls = animate(from, to, {
            duration: 0.45,
            ease: [0.22, 1, 0.36, 1],
            onUpdate: (v) => {
                prevRef.current = v;
                if (ref.current) {
                    ref.current.textContent = format(Math.round(v));
                }
            },
            onComplete: () => setRolling(false),
        });
        prevRef.current = to;
        return () => controls.stop();
    }, [to, format]);
    return (
        <strong
            ref={ref}
            className={`tooltip-num ${rolling ? "rolling" : ""} ${className || ""}`}
        >
            {format(to)}
        </strong>
    );
}

function SegToggle({ mode, onChange }) {
    const options = [
        { id: "line", label: "Line", icon: <LineIcon /> },
        { id: "bar", label: "Bar", icon: <BarIcon /> },
    ];
    return (
        <div className="seg-toggle">
            {options.map((opt) => (
                <button
                    key={opt.id}
                    type="button"
                    className={`seg-btn ${mode === opt.id ? "active" : ""}`}
                    onClick={() => onChange(opt.id)}
                >
                    {mode === opt.id && (
                        <motion.span
                            layoutId="seg-thumb"
                            className="seg-thumb"
                            transition={{ type: "tween", duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                        />
                    )}
                    <span className="seg-icon">{opt.icon}</span>
                    <span className="seg-label">{opt.label}</span>
                </button>
            ))}
        </div>
    );
}

const TOOLTIP_W = 236;
const TOOLTIP_H = 100;
const CURSOR_GAP = 64;

function Chart({ mode, activeCompare }) {
    const ref = useRef(null);
    const [active, setActive] = useState(null);
    const [cursorX, setCursorX] = useState(0);
    const [cursorY, setCursorY] = useState(0);
    const [chartW, setChartW] = useState(0);

    useEffect(() => {
        const el = ref.current;
        if (!el) return undefined;
        const ro = new ResizeObserver((entries) => {
            setChartW(entries[0].contentRect.width);
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const nearestIndex = (xSvg) => {
        let idx = 0;
        let best = Infinity;
        MONTHS.forEach((d, i) => {
            const dist = Math.abs(xSvg - xs[i]);
            if (dist < best) {
                best = dist;
                idx = i;
            }
        });
        return idx;
    };

    const handleMouseMove = (e) => {
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        const xSvg = (px / rect.width) * W;
        setActive(nearestIndex(xSvg));
        setCursorX(px);
        setCursorY(py);
    };

    const handleMouseLeave = () => {
        setActive(null);
        setCursorX(0);
        setCursorY(0);
    };

    const w = Math.max(chartW || W, 1);
    const chartH = w * (H / W);
    const ttLeft =
        cursorX < w / 2
            ? Math.min(Math.max(cursorX + CURSOR_GAP, 10), Math.max(10, w - TOOLTIP_W - 10))
            : Math.max(10, cursorX - CURSOR_GAP - TOOLTIP_W);
    let ttTop = cursorY - CURSOR_GAP - TOOLTIP_H;
    if (ttTop < 6) {
        ttTop = cursorY + CURSOR_GAP;
    }
    ttTop = Math.min(ttTop, chartH - TOOLTIP_H - 6);

    const activeMetric = COMPARE.find((c) => c.id === activeCompare);
    const metricPts = MONTHS.map((d, i) => ({ x: xs[i], y: yFor(d.metrics[activeCompare].plot) }));
    const metricPath = smoothPath(metricPts);
    const dotShift = mode === "bar" ? 3 : 0;

    return (
        <div
            className="chart"
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            <svg
                viewBox={`0 0 ${W} ${H}`}
                className="chart-svg"
            >
                <defs>
                    <linearGradient
                        id="areaGrad"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                    >
                        <stop
                            offset="0%"
                            stopColor="#2C836B"
                        />
                        <stop
                            offset="100%"
                            stopColor="#2C836B"
                            stopOpacity="0"
                        />
                    </linearGradient>
                    <linearGradient
                        id="dotGrad"
                        x1="0"
                        y1="0"
                        x2="1"
                        y2="1"
                    >
                        <stop
                            offset="0%"
                            stopColor="#389B80"
                        />
                        <stop
                            offset="100%"
                            stopColor="#2C836B"
                        />
                    </linearGradient>
                    <linearGradient
                        id="barGrad"
                        x1="0"
                        y1="0"
                        x2="1"
                        y2="1"
                    >
                        <stop
                            offset="0%"
                            stopColor="#9EDDC6"
                        />
                        <stop
                            offset="100%"
                            stopColor="#7DC6A8"
                        />
                    </linearGradient>
                    <filter
                        id="softBlur"
                        x="-100%"
                        y="-100%"
                        width="300%"
                        height="300%"
                    >
                        <feGaussianBlur stdDeviation="2.4" />
                    </filter>
                </defs>

                {GRID_VALUES.map((v) => (
                    <line
                        key={`g-${v}`}
                        className="grid-line"
                        x1={PLOT_LEFT}
                        x2={PLOT_RIGHT}
                        y1={yFor(v)}
                        y2={yFor(v)}
                    />
                ))}
                {MONTHS.map((d, i) =>
                    d.showYear ? (
                        <line
                            key={`gv-${d.year}`}
                            className="grid-line-v"
                            x1={xs[i]}
                            x2={xs[i]}
                            y1={PLOT_TOP}
                            y2={PLOT_BOTTOM}
                        />
                    ) : null
                )}

                {GRID_VALUES.map((v) => (
                    <text
                        key={`y-${v}`}
                        className="axis-label"
                        x={PLOT_LEFT - 10}
                        y={yFor(v) + 4}
                        textAnchor="end"
                    >
                        {v}
                    </text>
                ))}
                {MONTHS.map((d, i) =>
                    d.showYear ? (
                        <text
                            key={`x-year-${d.year}`}
                            className="axis-label"
                            x={xs[i]}
                            y={PLOT_BOTTOM + 22}
                            textAnchor="middle"
                        >
                            {d.year}
                        </text>
                    ) : null
                )}

                <AnimatePresence mode="wait">
                    {mode === "line" ? (
                        <motion.g
                            key="line"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.25 }}
                        >
                            <motion.path
                                d={areaPath}
                                fill="url(#areaGrad)"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 0.5 }}
                                transition={{ duration: 0.9, delay: 0.45 }}
                            />
                            <motion.path
                                d={linePath}
                                fill="none"
                                stroke="#2C836B"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1], delay: 0.15 }}
                            />
                            <motion.path
                                key={`cmp-line-${activeCompare}`}
                                d={metricPath}
                                fill="none"
                                stroke={SECONDARY}
                                strokeWidth={2}
                                strokeDasharray="3 5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1], delay: 0.25 }}
                            />
                            <motion.circle
                                cx={pts[pts.length - 1].x}
                                cy={pts[pts.length - 1].y}
                                r={8}
                                fill="url(#dotGrad)"
                                filter="url(#softBlur)"
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 0.35 }}
                                transition={{ delay: 1, duration: 0.5 }}
                                style={{ transformBox: "fill-box", transformOrigin: "center" }}
                            />
                            <motion.circle
                                cx={pts[pts.length - 1].x}
                                cy={pts[pts.length - 1].y}
                                r={4.5}
                                fill="url(#dotGrad)"
                                stroke="#fff"
                                strokeWidth={1.5}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 1.05, type: "spring", stiffness: 400, damping: 18 }}
                                style={{ transformBox: "fill-box", transformOrigin: "center" }}
                            />
                        </motion.g>
                    ) : (
                        <motion.g
                            key="bar"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.25 }}
                        >
                            {MONTHS.map((d, i) => {
                            const metric = d.metrics[activeCompare];
                            return (
                                <motion.g key={`bar-${i}`}>
                                    <motion.rect
                                        x={xs[i] - 5}
                                        width={4}
                                        rx={2}
                                        fill={SECONDARY}
                                        initial={{ y: PLOT_BOTTOM, height: 0 }}
                                        animate={{ y: yFor(metric.plot), height: PLOT_BOTTOM - yFor(metric.plot) }}
                                        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: i * 0.05 }}
                                    />
                                    <motion.rect
                                        x={xs[i] - 5}
                                        width={4}
                                        rx={2}
                                        fill={SECONDARY_DARK}
                                        initial={{ y: PLOT_BOTTOM, height: 0, opacity: 0 }}
                                        animate={{
                                            y: yFor(metric.plot),
                                            height: PLOT_BOTTOM - yFor(metric.plot),
                                            opacity: active === i ? 1 : 0,
                                        }}
                                        transition={{
                                            y: { duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: i * 0.05 },
                                            height: { duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: i * 0.05 },
                                            opacity: { duration: 0.25, ease: "easeOut" },
                                        }}
                                    />
                                    <motion.rect
                                        x={xs[i] + 1}
                                        width={4}
                                        rx={2}
                                        fill="url(#barGrad)"
                                        initial={{ y: PLOT_BOTTOM, height: 0 }}
                                        animate={{ y: yFor(d.value), height: PLOT_BOTTOM - yFor(d.value) }}
                                        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: i * 0.05 }}
                                    />
                                    <motion.rect
                                        x={xs[i] + 1}
                                        width={4}
                                        rx={2}
                                        fill="#03523B"
                                        initial={{ y: PLOT_BOTTOM, height: 0, opacity: 0 }}
                                        animate={{
                                            y: yFor(d.value),
                                            height: PLOT_BOTTOM - yFor(d.value),
                                            opacity: active === i ? 1 : 0,
                                        }}
                                        transition={{
                                            y: { duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: i * 0.05 },
                                            height: { duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: i * 0.05 },
                                            opacity: { duration: 0.25, ease: "easeOut" },
                                        }}
                                    />
                                </motion.g>
                            );
                        })}
                        </motion.g>
                    )}
                </AnimatePresence>

                {MONTHS.map((d, i) => (
                    <circle
                        key={`hit-${i}`}
                        className="hit-dot"
                        cx={xs[i]}
                        cy={yFor(d.value)}
                        r={14}
                    />
                ))}

                <AnimatePresence>
                    {active != null && (
                        <motion.g
                            key={`active-${active}`}
                            initial={{ opacity: 0, y: 3 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 3 }}
                            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                        >
                            <circle
                                cx={xs[active] + dotShift}
                                cy={yFor(MONTHS[active].value)}
                                r={9}
                                fill="url(#dotGrad)"
                                opacity={0.25}
                            />
                            <circle
                                cx={xs[active] + dotShift}
                                cy={yFor(MONTHS[active].value)}
                                r={4.5}
                                fill="#fff"
                                stroke="#2C836B"
                                strokeWidth={2}
                            />
                            <circle
                                cx={xs[active] - dotShift}
                                cy={yFor(MONTHS[active].metrics[activeCompare].plot)}
                                r={9}
                                fill={SECONDARY}
                                opacity={0.25}
                            />
                            <circle
                                cx={xs[active] - dotShift}
                                cy={yFor(MONTHS[active].metrics[activeCompare].plot)}
                                r={4.5}
                                fill="#fff"
                                stroke={SECONDARY}
                                strokeWidth={2}
                            />
                        </motion.g>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {mode === "line" && active != null && (
                        <motion.g
                            key={`crosshair-${active}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.18, ease: "easeOut" }}
                        >
                            <line
                                className="crosshair-line"
                                x1={xs[active]}
                                x2={xs[active]}
                                y1={PLOT_TOP}
                                y2={PLOT_BOTTOM}
                            />
                            <line
                                className="crosshair-line"
                                x1={PLOT_LEFT}
                                x2={PLOT_RIGHT}
                                y1={yFor(MONTHS[active].value)}
                                y2={yFor(MONTHS[active].value)}
                            />
                            <line
                                className="crosshair-line"
                                x1={PLOT_LEFT}
                                x2={PLOT_RIGHT}
                                y1={yFor(MONTHS[active].metrics[activeCompare].plot)}
                                y2={yFor(MONTHS[active].metrics[activeCompare].plot)}
                            />
                        </motion.g>
                    )}
                </AnimatePresence>
            </svg>

            <AnimatePresence>
                {active != null && (
                    <motion.div
                        key="tooltip"
                        className="tooltip"
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ left: ttLeft, top: ttTop, opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.97 }}
                        transition={{
                            left: { type: "spring", stiffness: 400, damping: 34, mass: 0.6 },
                            top: { type: "spring", stiffness: 400, damping: 34, mass: 0.6 },
                            opacity: { duration: 0.18, ease: "easeOut" },
                            y: { duration: 0.18, ease: "easeOut" },
                            scale: { duration: 0.18, ease: "easeOut" },
                        }}
                    >
                        <div className="tooltip-title">{MONTHS[active].fullLabel}</div>
                        <div className="tooltip-row">
                            <span className="tooltip-key">
                                <span className="tooltip-dot primary" />
                                <span className="tooltip-label">Revenue</span>
                            </span>
                            <RollValue
                                to={MONTHS[active].revenueNum}
                                format={moneyFormat}
                            />
                        </div>
                        <div className="tooltip-row compare-row">
                            <span className="tooltip-key">
                                <span className="tooltip-dot compare" />
                                <span className="tooltip-label">{activeMetric.label}</span>
                            </span>
                            <RollValue
                                key={activeCompare}
                                className="tooltip-num-compare"
                                to={MONTHS[active].metrics[activeCompare].val}
                                format={METRIC_FORMAT[activeCompare]}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function RevenueCard() {
    const [mode, setMode] = useState("line");
    const [activeCompare, setActiveCompare] = useState(COMPARE[0].id);
    const pillsRef = useRef(null);
    const [pillsScrolled, setPillsScrolled] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const updateScrollState = () => {
        const el = pillsRef.current;
        if (el) {
            setPillsScrolled(el.scrollLeft > 2);
            setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
        }
    };

    const handlePillsScroll = () => {
        updateScrollState();
    };

    useEffect(() => {
        const el = pillsRef.current;
        if (!el) return undefined;
        updateScrollState();
        const ro = new ResizeObserver(updateScrollState);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const scrollPills = () => {
        const el = pillsRef.current;
        if (el) {
            el.scrollBy({ left: 180, behavior: "smooth" });
        }
    };

    const scrollPillsLeft = () => {
        const el = pillsRef.current;
        if (el) {
            el.scrollBy({ left: -180, behavior: "smooth" });
        }
    };

    const maskImage =
        !pillsScrolled && !canScrollRight
            ? "none"
            : !pillsScrolled
                ? "linear-gradient(to right, #000 0, #000 calc(100% - 36px), transparent 100%)"
                : !canScrollRight
                    ? "linear-gradient(to right, transparent 0, #000 36px, #000 100%)"
                    : "linear-gradient(to right, transparent 0, #000 36px, #000 calc(100% - 36px), transparent 100%)";

    return (
        <motion.section
            className="revenue-card"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
            <header className="card-header">
                <div className="header-left">
                    <div className="title-wrap">
                        <h2 className="card-title">Total Revenue</h2>
                        <span className="card-period">
                            {MONTHS[0].fullLabel} – {MONTHS[MONTHS.length - 1].fullLabel}
                        </span>
                    </div>
                    <div className="revenue-row">
                        <CountUp to={TOTAL_REVENUE} />
                        <motion.div
                            className="trend"
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.55, duration: 0.4 }}
                        >
                            <div className="trend-row">
                                <TrendIcon />
                                <span>14.20%</span>
                            </div>
                            <span className="trend-caption">vs. previous period</span>
                        </motion.div>
                    </div>
                </div>
                <div className="header-right">
                    <SegToggle
                        mode={mode}
                        onChange={setMode}
                    />
                </div>
            </header>

            <div className="divider" />

            <div className="compare">
                <span className="compare-label">Compare with</span>
                <div className="compare-scroll-wrap">
                    <div
                        className="compare-pills"
                        ref={pillsRef}
                        onScroll={handlePillsScroll}
                        style={{ WebkitMaskImage: maskImage, maskImage }}
                    >
                        {COMPARE.map((p, i) => (
                            <motion.button
                                key={p.id}
                                type="button"
                                className={`pill ${p.id === activeCompare ? "active" : ""}`}
                                onClick={(e) => {
                                    setActiveCompare(p.id);
                                    e.currentTarget.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
                                }}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.45 + i * 0.06, duration: 0.35 }}
                            >
                                {p.label}
                            </motion.button>
                        ))}
                    </div>
                    <button
                        type="button"
                        className={`scroll-arrow left ${pillsScrolled ? "show" : ""}`}
                        onClick={scrollPillsLeft}
                        aria-label="Scroll to previous options"
                    >
                        <ChevronLeftIcon />
                    </button>
                    <button
                        type="button"
                        className={`scroll-arrow right ${canScrollRight ? "show" : ""}`}
                        onClick={scrollPills}
                        aria-label="Scroll to more options"
                    >
                        <ChevronRightIcon />
                    </button>
                </div>
            </div>

            <Chart mode={mode} activeCompare={activeCompare} />
        </motion.section>
    );
}

export default RevenueCard;
