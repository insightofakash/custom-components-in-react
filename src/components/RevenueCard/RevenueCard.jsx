import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, AnimatePresence, animate } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import sounds from "../../lib/sounds.js";
import ChartTooltip from "../ChartTooltip/ChartTooltip.jsx";
import { computeTooltipPosition } from "../ChartTooltip/tooltipPosition.js";
import {
    ArrowUpRight01Icon as HugeTrendUpIcon,
    ChartColumnIcon as HugeChartColumnIcon,
    ChartLineIcon as HugeChartLineIcon,
    ChevronLeftIcon as HugeChevronLeftIcon,
    ChevronRightIcon as HugeChevronRightIcon,
} from "@hugeicons/core-free-icons";
import "./RevenueCard.css";

const EASE_OUT = [0.22, 1, 0.36, 1];

const barGrowTransition = (i) => ({
    duration: 0.275,
    ease: EASE_OUT,
    delay: i * 0.025,
});

const barHoverTransition = (i) => ({
    y: barGrowTransition(i),
    height: barGrowTransition(i),
    opacity: { duration: 0.25, ease: "easeOut" },
});

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

const COMPARE_COLORS = {
    orders: "#F59E0B",
    aov: "#8B5CF6",
    customers: "#EC4899",
    retention: "#14B8A6",
    margin: "#F97316",
};

const COMPARE_DARK = {
    orders: "#B45309",
    aov: "#6D28D9",
    customers: "#BE185D",
    retention: "#0F766E",
    margin: "#C2410C",
};

const COMPARE_OPTIONS = [{ id: "all", label: "All" }, ...COMPARE];

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

const SECONDARY = "#059669";
const SECONDARY_DARK = "#047857";

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

const QUARTER_AGG = {
    orders: "sum",
    aov: "avg",
    customers: "sum",
    retention: "avg",
    margin: "avg",
};

function buildQuarters() {
    const out = [];
    for (let i = 0; i < MONTHS.length; i += 3) {
        const group = MONTHS.slice(i, i + 3);
        const abs = START_MONTH + i;
        const year = START_YEAR + Math.floor(abs / 12);
        const m = abs % 12;
        const qNum = Math.floor(m / 3) + 1;
        const avg = (arr) => Math.round(arr.reduce((s, v) => s + v, 0) / arr.length);
        const metrics = {};
        for (const c of COMPARE) {
            const plots = group.map((d) => d.metrics[c.id].plot);
            const vals = group.map((d) => d.metrics[c.id].val);
            metrics[c.id] = {
                plot: avg(plots),
                val: QUARTER_AGG[c.id] === "sum" ? vals.reduce((s, v) => s + v, 0) : avg(vals),
            };
        }
        const revenueNum = group.reduce((s, d) => s + d.revenueNum, 0);
        out.push({
            label: `Q${qNum}`,
            year,
            fullLabel: `Q${qNum} ${year}`,
            showYear: m < 3,
            value: avg(group.map((d) => d.value)),
            revenueNum,
            revenue: `$${revenueNum.toLocaleString("en-US")}`,
            metrics,
        });
    }
    return out;
}

const QUARTERS = buildQuarters();

const xs = MONTHS.map((_, i) => PLOT_LEFT + (i / (MONTHS.length - 1)) * PLOT_W);
const barXs = QUARTERS.map((_, i) => {
    const n = QUARTERS.length;
    const binW = PLOT_W / n;
    const clusterW = binW - 12;
    return PLOT_LEFT + clusterW / 2 + (i / (n - 1)) * (PLOT_W - clusterW);
});
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
            ease: EASE_OUT,
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

function SegToggle({ mode, onChange }) {
    const options = [
        { id: "line", label: "Line", icon: <LineIcon /> },
        { id: "bar", label: "Bar", icon: <BarIcon /> },
    ];
    const btnRefs = useRef({});
    const [thumb, setThumb] = useState({ x: 0, width: 0 });

    useLayoutEffect(() => {
        const btn = btnRefs.current[mode];
        if (!btn) return;
        const { offsetLeft, offsetWidth } = btn;
        setThumb({ x: offsetLeft, width: offsetWidth });
    }, [mode]);

    return (
        <div className="seg-toggle">
            {options.map((opt) => (
                <button
                    key={opt.id}
                    type="button"
                    ref={(el) => {
                        btnRefs.current[opt.id] = el;
                    }}
                    className={`seg-btn ${mode === opt.id ? "active" : ""}`}
                    onClick={() => {
                        sounds.toggle();
                        onChange(opt.id);
                    }}
                >
                    <span className="seg-icon">{opt.icon}</span>
                    <span className="seg-label">{opt.label}</span>
                </button>
            ))}
            <motion.span
                className="seg-thumb"
                animate={{ x: thumb.x, width: thumb.width }}
                transition={{ type: "tween", duration: 0.28, ease: EASE_OUT }}
            />
        </div>
    );
}

const TOOLTIP_W = 278;
const TOOLTIP_H = 110;

const barGeom = (centerX, n, barCount) => {
    const binW = PLOT_W / n;
    const gap = 4;
    const sidePad = 6;
    const clusterW = binW - sidePad * 2;
    const barW = (clusterW - gap * (barCount - 1)) / barCount;
    const startX = centerX - clusterW / 2;
    const centers = Array.from({ length: barCount }, (_, k) => startX + barW / 2 + k * (barW + gap));
    return { centers, barW };
};

function Chart({ mode, activeCompare }) {
    const ref = useRef(null);
    const [active, setActive] = useState(null);
    const [cursorX, setCursorX] = useState(0);
    const [cursorY, setCursorY] = useState(0);
    const [chartW, setChartW] = useState(0);

    const data = mode === "bar" ? QUARTERS : MONTHS;
    const xPos = mode === "bar" ? barXs : xs;

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
        data.forEach((d, i) => {
            const dist = Math.abs(xSvg - xPos[i]);
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
    const tooltipPosition = active != null
        ? computeTooltipPosition({
              cursorX,
              cursorY,
              chartW: w,
              chartH,
              tooltipW: TOOLTIP_W,
              tooltipH: TOOLTIP_H,
          })
        : null;

const isAll = activeCompare === "all";
    const series = (
        isAll
            ? COMPARE
            : [COMPARE.find((c) => c.id === activeCompare)]
    ).map((c, i) => ({
        key: c.id,
        id: c.id,
        label: c.label,
        color: isAll ? COMPARE_COLORS[c.id] : SECONDARY,
        dark: isAll ? COMPARE_DARK[c.id] : SECONDARY_DARK,
        order: i,
    }));
    const seriesPath = (id) => {
        const pts = MONTHS.map((d, i) => ({ x: xs[i], y: yFor(d.metrics[id].plot) }));
        return smoothPath(pts);
    };

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
                            stopColor="#2563EB"
                        />
                        <stop
                            offset="100%"
                            stopColor="#2563EB"
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
                            stopColor="#60A5FA"
                        />
                        <stop
                            offset="100%"
                            stopColor="#2563EB"
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
                {data.map((d, i) =>
                    d.showYear ? (
                        <line
                            key={`gv-${d.year}`}
                            className="grid-line-v"
                            x1={xPos[i]}
                            x2={xPos[i]}
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
                {data.map((d, i) =>
                    d.showYear ? (
                        <text
                            key={`x-year-${d.year}`}
                            className="axis-label"
                            x={xPos[i]}
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
                            key={`line-${activeCompare}`}
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
                                transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.3 }}
                            />
                            <motion.path
                                d={linePath}
                                fill="none"
                                stroke="#2563EB"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1] }}
                            />
                            {series.map((s) => (
                                <motion.path
                                    key={`cmp-line-${s.key}`}
                                    d={seriesPath(s.id)}
                                    fill="none"
                                    stroke={s.color}
                                    strokeWidth={2}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    initial={{ opacity: 0, pathLength: 0 }}
                                    animate={{ opacity: 1, pathLength: 1 }}
                                    transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1], delay: 0.1 }}
                                />
                            ))}
                            <motion.circle
                                cx={pts[pts.length - 1].x}
                                cy={pts[pts.length - 1].y}
                                r={8}
                                fill="url(#dotGrad)"
                                filter="url(#softBlur)"
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 0.35 }}
                                transition={{ delay: 0.9, duration: 0.4 }}
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
                                transition={{ delay: 0.95, type: "spring", stiffness: 400, damping: 18 }}
                                style={{ transformBox: "fill-box", transformOrigin: "center" }}
                            />
                        </motion.g>
                    ) : (
                        <motion.g
                            key={`bar-${activeCompare}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.25 }}
                        >
                            {data.map((d, i) => {
                            const g = barGeom(xPos[i], data.length, series.length + 1);
                            const rx = Math.min(g.barW / 2, 3);
                            return (
                                <motion.g key={`bar-${i}`} animate={{ opacity: active != null && active !== i ? 0.2 : 1 }} transition={{ duration: 0.2, ease: "easeOut" }}>
                                    {series.map((s, si) => {
                                        const metric = d.metrics[s.id];
                                        return (
                                            <motion.g key={`bar-s-${s.key}-${i}`}>
                                                <motion.rect
                                                    x={g.centers[si] - g.barW / 2}
                                                    width={g.barW}
                                                    rx={rx}
                                                    fill={s.color}
                                                    initial={{ y: PLOT_BOTTOM, height: 0 }}
                                                    animate={{ y: yFor(metric.plot), height: PLOT_BOTTOM - yFor(metric.plot) }}
                                                    transition={barGrowTransition(i)}
                                                />
                                                <motion.rect
                                                    x={g.centers[si] - g.barW / 2}
                                                    width={g.barW}
                                                    rx={rx}
                                                    fill={s.dark}
                                                    initial={{ y: PLOT_BOTTOM, height: 0, opacity: 0 }}
                                                    animate={{
                                                        y: yFor(metric.plot),
                                                        height: PLOT_BOTTOM - yFor(metric.plot),
                                                        opacity: active === i ? 1 : 0,
                                                    }}
                                                    transition={barHoverTransition(i)}
                                                />
                                            </motion.g>
                                        );
                                    })}
                                    <motion.rect
                                        x={g.centers[series.length] - g.barW / 2}
                                        width={g.barW}
                                        rx={rx}
                                        fill="#2563EB"
                                        initial={{ y: PLOT_BOTTOM, height: 0 }}
                                        animate={{
                                            y: yFor(d.value),
                                            height: PLOT_BOTTOM - yFor(d.value),
                                            fill: active === i ? "#1D4ED8" : "#2563EB",
                                        }}
                                        transition={{
                                            y: barGrowTransition(i),
                                            height: barGrowTransition(i),
                                            fill: { duration: 0.2, ease: "easeOut" },
                                        }}
                                    />
                                </motion.g>
                            );
                        })}
                        </motion.g>
                    )}
                </AnimatePresence>

                {data.map((d, i) => (
                    <circle
                        key={`hit-${i}`}
                        className="hit-dot"
                        cx={xPos[i]}
                        cy={yFor(d.value)}
                        r={14}
                    />
                ))}

                <AnimatePresence>
                    {active != null && mode !== "bar" && (
                        <motion.g
                            key={`active-${active}`}
                            initial={{ opacity: 0, y: 3 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 3 }}
                            transition={{ duration: 0.25, ease: EASE_OUT }}
                        >
                            {(() => {
                            const lift = 0;
                            const centers = Array.from({ length: series.length + 1 }, () => xPos[active]);
                            return (
                                <>
                                    <circle
                                        cx={xPos[active]}
                                        cy={yFor(data[active].value) - lift}
                                        r={9}
                                        fill="url(#dotGrad)"
                                        opacity={0.25}
                                    />
                                    <circle
                                        cx={xPos[active]}
                                        cy={yFor(data[active].value) - lift}
                                        r={4.5}
                                        fill="#fff"
                                        stroke="#2563EB"
                                        strokeWidth={2}
                                    />
                                    {series.map((s, si) => (
                                        <g key={`active-s-${s.key}`}>
                                            <circle
                                                cx={centers[si]}
                                                cy={yFor(data[active].metrics[s.id].plot) - lift}
                                                r={9}
                                                fill={s.color}
                                                opacity={0.25}
                                            />
                                            <circle
                                                cx={centers[si]}
                                                cy={yFor(data[active].metrics[s.id].plot) - lift}
                                                r={4.5}
                                                fill="#fff"
                                                stroke={s.color}
                                                strokeWidth={2}
                                            />
                                        </g>
                                    ))}
                                </>
                            );
                        })()}
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
                                x1={xPos[active]}
                                x2={xPos[active]}
                                y1={PLOT_TOP}
                                y2={PLOT_BOTTOM}
                            />
                            <line
                                className="crosshair-line"
                                x1={PLOT_LEFT}
                                x2={PLOT_RIGHT}
                                y1={yFor(data[active].value)}
                                y2={yFor(data[active].value)}
                            />
                            {series.map((s) => (
                                <line
                                    key={`cross-${s.key}`}
                                    className="crosshair-line"
                                    x1={PLOT_LEFT}
                                    x2={PLOT_RIGHT}
                                    y1={yFor(data[active].metrics[s.id].plot)}
                                    y2={yFor(data[active].metrics[s.id].plot)}
                                />
                            ))}
                        </motion.g>
                    )}
                </AnimatePresence>
            </svg>

            <ChartTooltip
                position={tooltipPosition}
                title={active != null ? data[active].fullLabel : ""}
                rows={active != null ? [
                    {
                        dotColor: "#2563EB",
                        label: "Revenue",
                        value: data[active].revenueNum,
                        format: moneyFormat,
                    },
                    ...series.map((s) => ({
                        dotColor: s.color,
                        label: s.label,
                        value: data[active].metrics[s.id].val,
                        format: METRIC_FORMAT[s.id],
                        muted: true,
                    })),
                ] : []}
            />
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

    useEffect(() => {
        const el = pillsRef.current;
        if (!el) return undefined;
        updateScrollState();
        const ro = new ResizeObserver(updateScrollState);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const scrollPillsBy = (delta) => {
        const el = pillsRef.current;
        if (el) {
            el.scrollBy({ left: delta, behavior: "smooth" });
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
            transition={{ duration: 0.6, ease: EASE_OUT }}
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
                        onScroll={updateScrollState}
                        style={{ WebkitMaskImage: maskImage, maskImage }}
                    >
                        {COMPARE_OPTIONS.map((p, i) => (
                            <motion.button
                                key={p.id}
                                type="button"
                                className={`pill ${p.id === "all" ? "pill-all" : ""} ${p.id === activeCompare ? "active" : ""}`}
                                onClick={(e) => {
                                    sounds.tick();
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
                        onClick={() => scrollPillsBy(-180)}
                        aria-label="Scroll to previous options"
                    >
                        <ChevronLeftIcon />
                    </button>
                    <button
                        type="button"
                        className={`scroll-arrow right ${canScrollRight ? "show" : ""}`}
                        onClick={() => scrollPillsBy(180)}
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
