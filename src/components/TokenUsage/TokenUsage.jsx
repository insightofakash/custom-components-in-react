import { useEffect, useRef, useState } from "react";
import {
    AnimatePresence,
    animate,
    motion,
    useMotionValue,
    useSpring,
    useTransform,
} from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    Alert02Icon as HugeAlertIcon,
    ArrowRight01Icon as HugeArrowRightIcon,
    BrushCleaningIcon as HugeBroomIcon,
    TickIcon as HugeTickIcon,
} from "@hugeicons/core-free-icons";
import sounds from "../../lib/sounds.js";
import "./TokenUsage.css";

const EASE_OUT = [0.22, 1, 0.36, 1];
const COMPRESS_EASE = [0.65, 0, 0.35, 1];

const LIMIT = 1000000;
const PILL_COUNT = 47;
const PILL_GAP = 5;
const PILL_VALUE = LIMIT / PILL_COUNT;
/* Widest possible tooltip content ("Deepseek v4 Flash" + value) — used only
   for the edge clamp; the pill itself is centered via a 0-width flex anchor,
   so its position never depends on its own measured width. */
const PILL_MAX_W = 232;
const PILL_HALF = PILL_MAX_W / 2;

const MODELS = [
    { key: "fable", label: "Claude Fable", color: "var(--t-accent-orange)" },
    { key: "flash", label: "Deepseek v4 Flash", color: "var(--t-accent-blue)" },
    { key: "mimo", label: "Mimo 3", color: "var(--t-accent-red)" },
];

const INITIAL_USAGE = { fable: 980020, flash: 191490, mimo: 595750 };
const COMPRESS_RATIO = 560580 / 980020;
const COMPRESSED_USAGE = { fable: 560580 };

const TODAY = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
});

const compressedValue = (value, key) =>
    COMPRESSED_USAGE[key] ?? Math.round(value * COMPRESS_RATIO);

const fmtK = (v) => `${(v / 1000).toFixed(2)}K`;
const filledPills = (v) => Math.round(v / PILL_VALUE);
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

function PopNumber({ value }) {
    const chars = String(value).split("");
    return (
        <span className="tu-digits" key={value}>
            {chars.map((ch, i) => (
                <span
                    key={`${value}-${i}`}
                    className="tu-digit"
                    data-stagger={
                        i === chars.length - 2
                            ? "1"
                            : i === chars.length - 1
                                ? "2"
                                : undefined
                    }
                >
                    {ch}
                </span>
            ))}
        </span>
    );
}

function RollingValue({ from, to, duration = 1.4 }) {
    const ref = useRef(null);
    const [rolling, setRolling] = useState(true);
    useEffect(() => {
        setRolling(true);
        const controls = animate(from, to, {
            duration,
            ease: COMPRESS_EASE,
            onUpdate: (v) => {
                if (ref.current) {
                    ref.current.textContent = fmtK(v);
                }
            },
            onComplete: () => setRolling(false),
        });
        return () => controls.stop();
    }, [from, to, duration]);
    return (
        <span
            ref={ref}
            className={`tu-tooltip-value type-mono-label ${rolling ? "rolling" : ""}`}
        >
            {fmtK(from)}
        </span>
    );
}

const MATRIX_CYCLE = 1200;
const MATRIX_RING = [1, 2, 7, 11, 14, 13, 8, 4];
const MATRIX_TWINKLE = [7, 2, 11, 5, 14, 9, 0, 12, 3, 15, 6, 10, 13, 1, 8, 4];

function MatrixLoader({ variant = "orbit" }) {
    return (
        <span className="tu-matrix" aria-hidden="true">
            {Array.from({ length: 16 }, (_, idx) => {
                let delay = 0;
                let steady = false;
                if (variant === "scan") {
                    delay = Math.round((idx % 4) * (MATRIX_CYCLE / 10));
                } else if (variant === "twinkle") {
                    delay = Math.round(MATRIX_TWINKLE[idx] * (MATRIX_CYCLE / 16));
                } else if (variant === "orbit") {
                    const k = MATRIX_RING.indexOf(idx);
                    if (k === -1) {
                        steady = true;
                    } else {
                        delay = Math.round(k * (MATRIX_CYCLE / 8));
                    }
                }
                return (
                    <i
                        key={idx}
                        style={{
                            "--d": delay,
                            ...(steady ? { animation: "none" } : {}),
                        }}
                    />
                );
            })}
        </span>
    );
}

function TokenUsage() {
    const [hovered, setHovered] = useState(null);
    const [legendHover, setLegendHover] = useState(null);
    const [selected, setSelected] = useState(null);
    const [phase, setPhase] = useState("idle");
    const [usage, setUsage] = useState(INITIAL_USAGE);
    const [fromValue, setFromValue] = useState(null);
    const [compressFrom, setCompressFrom] = useState(0);
    const [errorKey, setErrorKey] = useState(null);
    const [rowW, setRowW] = useState(0);

    const cardRef = useRef(null);
    const chartRef = useRef(null);
    const rowsRef = useRef(null);
    const rowWidthRef = useRef(0);
    const compressTimer = useRef(null);
    const resetTimer = useRef(null);
    const errorTimer = useRef(null);
    const compressAnim = useRef(null);
    const prevInspectorRef = useRef(false);
    const compressedKeysRef = useRef(new Set());

    const cursorSource = useMotionValue(0);
    const cursorX = useSpring(cursorSource, {
        stiffness: 400,
        damping: 34,
        mass: 0.6,
    });
    const tooltipLeft = useTransform(cursorX, (v) =>
        clamp(
            v,
            PILL_HALF + 2,
            Math.max(PILL_HALF + 2, rowWidthRef.current - PILL_HALF - 2),
        ),
    );

    const focusKey = selected ?? legendHover ?? hovered;
    const dimming = focusKey != null && phase !== "compressed";
    const showInspector = focusKey != null && phase !== "compressed";
    const showError = errorKey != null && errorKey === focusKey;
    const stateKey = showError
        ? "error"
        : phase === "compressing"
            ? "compressing"
            : focusKey;

    useEffect(() => {
        const el = rowsRef.current;
        if (!el) return undefined;
        const ro = new ResizeObserver((entries) => {
            rowWidthRef.current = entries[0].contentRect.width;
            setRowW(entries[0].contentRect.width);
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    useEffect(
        () => () => {
            clearTimeout(compressTimer.current);
            clearTimeout(resetTimer.current);
            clearTimeout(errorTimer.current);
            compressAnim.current?.stop();
        },
        [],
    );

    const boundaryForFilled = (filled) => {
        const W = rowWidthRef.current;
        if (!W) return 0;
        const pillW = (W - PILL_GAP * (PILL_COUNT - 1)) / PILL_COUNT;
        const pitch = pillW + PILL_GAP;
        return filled < PILL_COUNT ? filled * pitch - PILL_GAP / 2 : W;
    };

    useEffect(() => {
        if (!showInspector || !focusKey || !rowW || phase === "compressing") return;
        const x = boundaryForFilled(filledPills(usage[focusKey]));
        if (!prevInspectorRef.current) {
            cursorSource.jump(x);
            cursorX.jump(x);
        } else {
            cursorSource.set(x);
        }
        prevInspectorRef.current = true;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [focusKey, rowW, usage, showInspector, phase]);

    useEffect(() => {
        if (!showInspector) {
            prevInspectorRef.current = false;
        }
    }, [showInspector]);

    useEffect(() => {
        if (!selected || phase !== "idle") return undefined;
        const onPointerDown = (e) => {
            if (cardRef.current && !cardRef.current.contains(e.target)) {
                sounds.toggle();
                setSelected(null);
                setHovered(null);
            }
        };
        document.addEventListener("pointerdown", onPointerDown);
        return () => document.removeEventListener("pointerdown", onPointerDown);
    }, [selected, phase]);

    const handleRowEnter = (key) => {
        if (phase !== "idle" || selected) return;
        if (hovered !== key) {
            sounds.hoverDeep();
        }
        setHovered(key);
    };

    const handleRowSelect = (key) => {
        if (phase !== "idle") return;
        sounds.toggle();
        setSelected((prev) => (prev === key ? null : key));
    };

    const handleLegendEnter = (key) => {
        if (phase !== "idle") return;
        if (legendHover !== key) {
            sounds.hoverSub();
        }
        setLegendHover(key);
    };

    const flagCompressError = (key) => {
        sounds.warning();
        setErrorKey(key);
        clearTimeout(errorTimer.current);
        errorTimer.current = setTimeout(() => setErrorKey(null), 1100);
    };

    const startCompress = () => {
        if (phase !== "idle" || !selected) return;
        const key = selected;
        if (compressedKeysRef.current.has(key)) {
            flagCompressError(key);
            return;
        }
        const from = usage[key];
        const to = compressedValue(from, key);
        sounds.whoosh();
        sounds.ratchet();
        setFromValue(from);
        setCompressFrom(filledPills(from));
        setPhase("compressing");
        compressedKeysRef.current.add(key);
        compressAnim.current = animate(
            cursorSource,
            boundaryForFilled(filledPills(to)),
            { duration: 1.4, ease: COMPRESS_EASE },
        );
        setUsage((prev) => ({ ...prev, [key]: to }));
        compressTimer.current = setTimeout(() => {
            setPhase("compressed");
            sounds.success();
            resetTimer.current = setTimeout(() => {
                setPhase("idle");
                setSelected(null);
                setHovered(null);
            }, 1000);
        }, 2100);
    };

    const renderTooltipContent = (key) => {
        if (key === "error") {
            return (
                <>
                    <span className="tu-tooltip-model">
                        <span className="tu-tooltip-swatch tu-tooltip-swatch--error">
                            <HugeiconsIcon
                                icon={HugeAlertIcon}
                                size={12}
                                strokeWidth={1.67}
                                color="#fff"
                            />
                        </span>
                        <span className="tu-tooltip-model-error">Fully compressed</span>
                    </span>
                    <span className="tu-tooltip-value type-mono-label">
                        <PopNumber value={fmtK(usage[focusKey])} />
                    </span>
                </>
            );
        }
        if (key === "compressing") {
            return (
                <>
                    <span className="tu-tooltip-value type-mono-label">
                        <PopNumber value={fmtK(fromValue)} />
                    </span>
                    <HugeiconsIcon
                        icon={HugeArrowRightIcon}
                        size={12}
                        strokeWidth={1.33}
                        color="var(--t-muted)"
                    />
                    <RollingValue from={fromValue} to={usage[focusKey]} />
                </>
            );
        }
        const model = MODELS.find((m) => m.key === key);
        return (
            <>
                <span className="tu-tooltip-model">
                    <span className="tu-tooltip-swatch" style={{ background: model.color }} />
                    {model.label}
                </span>
                <span className="tu-tooltip-value type-mono-label">
                    <PopNumber value={fmtK(usage[key])} />
                </span>
            </>
        );
    };

    return (
        <motion.section
            className="tu-card"
            ref={cardRef}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE_OUT }}
        >
            <motion.header
                className="tu-header"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15, duration: 0.5 }}
            >
                <div>
                    <h2 className="tu-title">
                        Token Usage Overtime
                        <span className="tu-live" aria-hidden="true">
                            <span className="tu-live-dot" />
                            <span className="tu-live-ring" />
                        </span>
                    </h2>
                    <p className="tu-subtitle">
                        Cumulative token usage against your model limit
                    </p>
                </div>
                <span className="tu-date type-mono-body">{TODAY}</span>
            </motion.header>

            <div className="tu-chart" ref={chartRef}>
                <div
                    className={`tu-rows ${phase !== "idle" ? "tu-rows--locked" : ""}`}
                    ref={rowsRef}
                    onMouseLeave={() => setHovered(null)}
                >
                    {MODELS.map((m, rowIdx) => {
                        const filled = filledPills(usage[m.key]);
                        const rampOn = m.key === selected;
                        return (
                            <motion.div
                                key={m.key}
                                className={`tu-row ${focusKey === m.key ? "active" : ""} ${
                                    dimming && focusKey !== m.key ? "dimmed" : ""
                                }`}
                                animate={
                                    errorKey === m.key
                                        ? { x: [0, -2, 2, -2, 2, -1, 1, 0] }
                                        : { x: 0 }
                                }
                                transition={
                                    errorKey === m.key
                                        ? { duration: 0.5, ease: "easeOut" }
                                        : { duration: 0.2 }
                                }
                                onMouseEnter={() => handleRowEnter(m.key)}
                                onClick={() => handleRowSelect(m.key)}
                            >
                                    {Array.from({ length: PILL_COUNT }, (_, i) => {
                                        const isFilled = i < filled;
                                        const d = filled - i;
                                        const rampO =
                                            rampOn && isFilled ? clamp(6 - d, 0, 5) * 0.2 : 0;
                                        const cascadeDelay =
                                            phase === "compressing" && !isFilled
                                                ? Math.max(0, compressFrom - 1 - i) * 0.04
                                                : 0;
                                        return (
                                            <motion.span
                                                key={i}
                                                className={`tu-pill ${isFilled ? "filled" : ""}`}
                                                style={{
                                                    background: isFilled
                                                        ? m.color
                                                        : "var(--t-strong)",
                                                    "--glow-color": m.color,
                                                    transformOrigin: "50% 100%",
                                                    transitionDelay: cascadeDelay
                                                        ? `${cascadeDelay}s`
                                                        : "0s",
                                                }}
                                                initial={{ opacity: 0, scaleY: 0 }}
                                                animate={{ opacity: 1, scaleY: 1 }}
                                                transition={{
                                                    delay:
                                                        0.35 +
                                                        rowIdx * 0.12 +
                                                        (i / PILL_COUNT) * 0.3,
                                                    duration: 0.35,
                                                    ease: EASE_OUT,
                                                }}
                                            >
                                                <motion.span
                                                    className="tu-pill-ramp"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: rampO }}
                                                    transition={{
                                                        duration: 0.3,
                                                        delay:
                                                            rampO > 0
                                                                ? (5 - d) * 0.06
                                                                : cascadeDelay,
                                                    }}
                                                />
                                            </motion.span>
                                        );
                                    })}
                            </motion.div>
                        );
                    })}
                </div>

                <motion.div
                    className="tu-axis"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7, duration: 0.5 }}
                >
                    <span className="tu-axis-label tu-axis-tokens type-mono-label">
                        Tokens
                    </span>
                    <span
                        className="tu-axis-label tu-axis-tick type-mono-label"
                        style={{ left: "25%" }}
                    >
                        250K
                    </span>
                    <span
                        className="tu-axis-label tu-axis-tick type-mono-label"
                        style={{ left: "50%" }}
                    >
                        500K
                    </span>
                    <span
                        className="tu-axis-label tu-axis-tick type-mono-label"
                        style={{ left: "75%" }}
                    >
                        750K
                    </span>
                    <span className="tu-axis-label tu-axis-end type-mono-label">1M</span>
                </motion.div>

                <AnimatePresence>
                    {showInspector && (
                        <motion.div
                            key="cursor"
                            className="tu-cursor"
                            style={{ x: cursorX }}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.18 }}
                        />
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {showInspector && (
                        <motion.div
                            key="tooltip"
                            className="tu-tooltip-anchor"
                            style={{ left: tooltipLeft }}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                        >
                            <motion.div
                                className="tu-tooltip"
                                style={{ width: PILL_MAX_W }}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{
                                    opacity: { duration: 0.18, ease: "easeOut" },
                                    y: { duration: 0.18, ease: "easeOut" },
                                }}
                            >
                                {renderTooltipContent(stateKey)}
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <footer className="tu-footer">
                <div className="tu-divider" />
                <div className="tu-footer-row">
                    <motion.div
                        className="tu-legend"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.85, duration: 0.5 }}
                        onMouseLeave={() => setLegendHover(null)}
                    >
                        {MODELS.map((m) => (
                            <span
                                key={m.key}
                                className={`tu-legend-item ${
                                    dimming && focusKey !== m.key ? "dimmed" : ""
                                }`}
                                onMouseEnter={() => handleLegendEnter(m.key)}
                                onClick={() => handleRowSelect(m.key)}
                            >
                                <span
                                    className="tu-legend-swatch"
                                    style={{ background: m.color }}
                                />
                                <span className="tu-legend-label">{m.label}</span>
                            </span>
                        ))}
                    </motion.div>
                    <AnimatePresence mode="popLayout">
                        {selected && phase === "idle" && (
                            <motion.button
                                key="broom"
                                type="button"
                                className="tu-action"
                                onClick={startCompress}
                                initial={{ opacity: 0, scale: 0.6 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.6 }}
                                whileHover={{ scale: 1.07 }}
                                whileTap={{ scale: 0.93 }}
                                transition={{ type: "spring", stiffness: 400, damping: 22 }}
                                aria-label="Compress token usage"
                                title="Compress token usage"
                            >
                                <HugeiconsIcon
                                    icon={HugeBroomIcon}
                                    size={20}
                                    strokeWidth={1.5}
                                />
                            </motion.button>
                        )}
                        {phase === "compressing" && (
                            <motion.div
                                key="compressing"
                                className="tu-action tu-action-pill"
                                initial={{ opacity: 0, scale: 0.6 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.6 }}
                                transition={{ type: "spring", stiffness: 400, damping: 22 }}
                            >
                                <span className="tu-action-label">Compressing</span>
                                <MatrixLoader variant="orbit" />
                            </motion.div>
                        )}
                        {phase === "compressed" && (
                            <motion.div
                                key="done"
                                className="tu-action"
                                initial={{ opacity: 0, scale: 0.85, filter: "blur(6px)" }}
                                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                                exit={{ opacity: 0, scale: 0.92, filter: "blur(4px)" }}
                                transition={{ duration: 0.45, ease: EASE_OUT }}
                            >
                                <HugeiconsIcon
                                    icon={HugeTickIcon}
                                    size={20}
                                    strokeWidth={1.67}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </footer>
        </motion.section>
    );
}

export default TokenUsage;
