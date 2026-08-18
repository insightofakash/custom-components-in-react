import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, animate } from "framer-motion";
import sounds from "../../lib/sounds.js";
import ChartTooltip from "../ChartTooltip/ChartTooltip.jsx";
import { computeTooltipPosition } from "../ChartTooltip/tooltipPosition.js";
import "./ModelUsage.css";

const Y_MAX = 30;
const LIMIT = 25;
const TOOLTIP_W = 278;
const TOOLTIP_H = 210;
const HIT_HALF = 24;

const SLOTS = [
    0.10244,
    0.2439,
    0.38537,
    0.52683,
    0.66829,
    0.80976,
    0.95122,
];

const MODELS = [
    { key: "flash", label: "Deepseek v4 Flash", color: "var(--t-accent-blue)" },
    { key: "fable", label: "Claude Fable", color: "var(--t-accent-orange)" },
    { key: "pro", label: "Deepseek v4 Pro", color: "var(--t-accent-red)" },
    { key: "other", label: "Other", color: "#fff" },
];

const DAYS = [
    { label: "Aug 12", full: "Aug 12, 2026", flash: 11.24, fable: 8.2, pro: 2.34, other: 0.7 },
    { label: "Aug 13", full: "Aug 13, 2026", flash: 11.29, fable: 4.94, pro: 2.36, other: 0.71 },
    { label: "Aug 14", full: "Aug 14, 2026", flash: 7.6, fable: 4.98, pro: 2.38, other: 0.71 },
    { label: "Aug 15", full: "Aug 15, 2026", flash: 7.56, fable: 4.97, pro: 4.02, other: 0.71 },
    { label: "Aug 16", full: "Aug 16, 2026", flash: 2.59, fable: 1.56, pro: 0.78, other: 0.52 },
    { label: "Aug 17", full: "Aug 17, 2026", flash: 5.77, fable: 1.92, pro: 4.08, other: 0.72 },
    { label: "Aug 18", full: "Aug 18, 2026", flash: 11.24, fable: 8.94, pro: 3.16, other: 0.27 },
].map((d) => {
    const total = d.flash + d.fable + d.pro + d.other;
    return { ...d, total };
});

const Y_TICKS = [30, 25, 20, 15, 10, 5, 0];

const usd = (v) => `$${v.toFixed(2)}`;

function PillValue({ to, format }) {
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
            duration: 0.32,
            ease: [0.22, 1, 0.36, 1],
            onUpdate: (v) => {
                prevRef.current = v;
                if (ref.current) {
                    ref.current.textContent = format(v);
                }
            },
            onComplete: () => setRolling(false),
        });
        prevRef.current = to;
        return () => controls.stop();
    }, [to, format]);
    return (
        <span ref={ref} className={`mu-value-pill-num ${rolling ? "rolling" : ""}`}>
            {format(to)}
        </span>
    );
}

const gridTop = (value) => `${((1 - value / Y_MAX) * 100).toFixed(3)}%`;

function ModelUsage() {
    const plotRef = useRef(null);
    const activeRef = useRef(null);
    const [active, setActive] = useState(null);
    const [hoverModel, setHoverModel] = useState(null);
    const [legendHover, setLegendHover] = useState(null);
    const [cursorX, setCursorX] = useState(0);
    const [cursorY, setCursorY] = useState(0);
    const [plotSize, setPlotSize] = useState({ w: 0, h: 0 });

    useEffect(() => {
        const el = plotRef.current;
        if (!el) return undefined;
        const ro = new ResizeObserver((entries) => {
            const { width, height } = entries[0].contentRect;
            setPlotSize({ w: width, h: height });
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const handleMouseMove = (e) => {
        const rect = plotRef.current?.getBoundingClientRect();
        if (!rect) return;
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        let idx = null;
        SLOTS.forEach((f, i) => {
            const slotPx = f * rect.width;
            if (Math.abs(px - slotPx) <= HIT_HALF) {
                idx = i;
            }
        });
        if (idx !== activeRef.current) {
            activeRef.current = idx;
            if (idx != null) {
                sounds.hover();
            }
        }
        if (idx == null) {
            setHoverModel(null);
        }
        setActive(idx);
        setCursorX(px);
        setCursorY(py);
    };

    const handleMouseLeave = () => {
        activeRef.current = null;
        setActive(null);
        setHoverModel(null);
        setCursorX(0);
        setCursorY(0);
    };

    const tooltipPosition =
        active != null && legendHover == null && plotSize.w > 0
            ? computeTooltipPosition({
                  cursorX,
                  cursorY,
                  chartW: plotSize.w,
                  chartH: plotSize.h,
                  tooltipW: TOOLTIP_W,
                  tooltipH: TOOLTIP_H,
              })
            : null;

    const highlightIndex =
        hoverModel != null ? MODELS.findIndex((m) => m.key === hoverModel) : null;

    const handleLegendEnter = (key) => {
        if (key !== legendHover) {
            sounds.hover();
        }
        setLegendHover(key);
    };

    const handleUsageEnter = () => {
        const last = DAYS.length - 1;
        if (activeRef.current !== last) {
            activeRef.current = last;
            sounds.hover();
        }
        setActive(last);
        if (plotSize.w > 0) {
            setCursorX(SLOTS[last] * plotSize.w);
            setCursorY(plotSize.h / 2);
        }
    };

    const handleUsageLeave = () => {
        activeRef.current = null;
        setActive(null);
        setCursorX(0);
        setCursorY(0);
    };

    return (
        <motion.section
            className="model-usage-card"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
            <div className="mu-chart-group">
                <header className="mu-header">
                <h2 className="mu-title">
                    Model Usage
                    <span className="mu-live" aria-hidden="true">
                        <span className="mu-live-dot" />
                        <span className="mu-live-ring" />
                    </span>
                </h2>
                <span className="mu-subtitle">Cumulative usage against your daily limit</span>
            </header>

            <div className="mu-chart">
                <div className="mu-chart-body">
                    <div className="mu-yaxis">
                        {Y_TICKS.map((v) => (
                            <span
                                key={v}
                                className="mu-y-label"
                                style={{ "--v": v }}
                            >
                                {v === 0 ? "0" : `$${v}`}
                            </span>
                        ))}
                    </div>

                    <div
                        className="mu-plot"
                        ref={plotRef}
                        onMouseMove={handleMouseMove}
                        onMouseLeave={handleMouseLeave}
                    >
                        <div className="mu-plot-inner">
                            {Y_TICKS.map((v) => (
                                <span
                                    key={`h${v}`}
                                    className="mu-grid-h"
                                    style={{ top: gridTop(v) }}
                                />
                            ))}
                            {SLOTS.map((f, i) => (
                                <span
                                    key={`v${i}`}
                                    className="mu-grid-v"
                                    style={{ left: `${(f * 100).toFixed(3)}%` }}
                                />
                            ))}

                            {SLOTS.map((f, i) => (
                                <span
                                    key={`backdrop${i}`}
                                    className={`mu-bar-backdrop ${active === i ? "active" : ""}`}
                                    style={{ left: `${(f * 100).toFixed(3)}%` }}
                                />
                            ))}

                            <motion.div
                                className="mu-limit"
                                style={{ top: gridTop(LIMIT) }}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.7, duration: 0.5 }}
                            >
                                <span className="mu-limit-line" />
                                <span className="mu-limit-badge">
                                    <span>Limit</span>
                                    <span>$25.00</span>
                                </span>
                            </motion.div>

                            {DAYS.map((d, i) => (
                                <motion.div
                                    key={d.label}
                                    className={`mu-bar ${active === i ? "active" : ""} ${
                                        active != null && active !== i ? "dimmed" : ""
                                    }`}
                                    style={{
                                        left: `${(SLOTS[i] * 100).toFixed(3)}%`,
                                        height: `${(d.total / Y_MAX) * 100}%`,
                                    }}
                                    initial={{ height: 0 }}
                                    animate={{ height: `${(d.total / Y_MAX) * 100}%` }}
                                    transition={{
                                        delay: 0.25 + i * 0.06,
                                        duration: 0.7,
                                        ease: [0.22, 1, 0.36, 1],
                                    }}
                                    onMouseLeave={() => setHoverModel(null)}
                                >
                                    {MODELS.map((m) => (
                                        <span
                                            key={m.key}
                                            className={`mu-seg ${
                                                hoverModel === m.key || legendHover === m.key
                                                    ? "hovered"
                                                    : ""
                                            } ${
                                                legendHover != null && legendHover !== m.key
                                                    ? "dimmed"
                                                    : ""
                                            }`}
                                            style={{
                                                height: `${(d[m.key] / d.total) * 100}%`,
                                                background: m.color,
                                                "--seg-color": m.color,
                                            }}
                                            onMouseEnter={() => setHoverModel(m.key)}
                                        />
                                    ))}
                                </motion.div>
                            ))}

                            <AnimatePresence>
                                {legendHover != null &&
                                    DAYS.map((d, i) => {
                                        const topPct = (1 - d.total / Y_MAX) * 100;
                                        return (
                                            <motion.span
                                                key={`pill${i}`}
                                                className="mu-value-pill"
                                                style={{
                                                    left: `${(SLOTS[i] * 100).toFixed(3)}%`,
                                                    top: `${topPct.toFixed(3)}%`,
                                                    x: "-50%",
                                                    y: "-100%",
                                                }}
                                                initial={{ opacity: 0, scale: 0.92 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{
                                                    opacity: 0,
                                                    scale: 0.97,
                                                    transition: { duration: 0.15, ease: "easeOut" },
                                                }}
                                                transition={{
                                                    delay: i * 0.03,
                                                    duration: 0.18,
                                                    ease: "easeOut",
                                                }}
                                            >
                                                <PillValue to={d[legendHover]} format={usd} />
                                            </motion.span>
                                        );
                                    })}
                            </AnimatePresence>
                        </div>

                        <ChartTooltip
                            position={tooltipPosition}
                            title={active != null ? DAYS[active].full : ""}
                            highlightIndex={highlightIndex}
                            total={
                                active != null
                                    ? { label: "Total", value: DAYS[active].total, format: usd }
                                    : null
                            }
                            rows={
                                active != null
                                    ? MODELS.map((m) => ({
                                          dotColor: m.color,
                                          label: m.label,
                                          value: DAYS[active][m.key],
                                          format: usd,
                                      }))
                                    : []
                            }
                        />
                    </div>
                </div>

                <div className="mu-xaxis-row">
                    <div className="mu-xaxis-spacer" />
                    <div className="mu-xaxis">
                        {DAYS.map((d, i) => (
                            <span
                                key={d.label}
                                className={`mu-x-label ${i === DAYS.length - 1 ? "today" : ""}`}
                                style={{ left: `${(SLOTS[i] * 100).toFixed(3)}%` }}
                            >
                                {d.label}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
            </div>

            <div className="mu-divider" />

            <footer className="mu-footer">
                <div className="mu-legend" onMouseLeave={() => setLegendHover(null)}>
                    {MODELS.map((m) => (
                        <span
                            key={m.key}
                            className={`mu-legend-item ${
                                hoverModel === m.key || legendHover === m.key ? "active" : ""
                            } ${
                                (hoverModel != null || legendHover != null) &&
                                hoverModel !== m.key &&
                                legendHover !== m.key
                                    ? "dimmed"
                                    : ""
                            }`}
                            onMouseEnter={() => handleLegendEnter(m.key)}
                        >
                            <span
                                className="mu-legend-swatch"
                                style={{ background: m.color }}
                            />
                            <span className="mu-legend-label">{m.label}</span>
                        </span>
                    ))}
                </div>
                <div
                    className="mu-usage"
                    onMouseEnter={handleUsageEnter}
                    onMouseLeave={handleUsageLeave}
                >
                    <span className="mu-usage-label">Usage Today</span>
                    <span className="mu-usage-value">{usd(DAYS[DAYS.length - 1].total)}</span>
                </div>
            </footer>
        </motion.section>
    );
}

export default ModelUsage;
