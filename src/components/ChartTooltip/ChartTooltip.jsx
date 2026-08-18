import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, animate } from "framer-motion";
import "./ChartTooltip.css";

function RollValue({ to, format }) {
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
            className={`chart-tooltip-num ${rolling ? "rolling" : ""}`}
        >
            {format(to)}
        </strong>
    );
}

function ChartTooltip({ position, title, rows, width = 278, highlightIndex = null, total = null }) {
    return (
        <AnimatePresence>
            {position && (
                <motion.div
                    key="chart-tooltip"
                    className="chart-tooltip"
                    style={{ width }}
                    initial={{ left: position.left, top: position.top, opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ left: position.left, top: position.top, opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.97 }}
                    transition={{
                        left: { type: "spring", stiffness: 400, damping: 34, mass: 0.6 },
                        top: { type: "spring", stiffness: 400, damping: 34, mass: 0.6 },
                        opacity: { duration: 0.18, ease: "easeOut" },
                        y: { duration: 0.18, ease: "easeOut" },
                        scale: { duration: 0.18, ease: "easeOut" },
                    }}
                >
                    {title && <div className="chart-tooltip-title">{title}</div>}
                    <div className="chart-tooltip-rows">
                        {rows.map((row, i) => {
                            const isHighlighted = highlightIndex === i;
                            const isDimmed = highlightIndex !== null && !isHighlighted;
                            return (
                                <div
                                    key={i}
                                    className={`chart-tooltip-row ${row.muted ? "muted" : ""} ${
                                        isHighlighted ? "highlighted" : ""
                                    } ${isDimmed ? "dimmed" : ""}`}
                                    style={
                                        isHighlighted
                                            ? {
                                                  backgroundColor: `color-mix(in srgb, ${row.dotColor} 14%, transparent)`,
                                              }
                                            : undefined
                                    }
                                >
                                    <span className="chart-tooltip-key">
                                        <span
                                            className="chart-tooltip-dot"
                                            style={{ background: row.dotColor }}
                                        />
                                        <span className="chart-tooltip-label">{row.label}</span>
                                    </span>
                                    <RollValue to={row.value} format={row.format} />
                                </div>
                            );
                        })}
                    </div>
                    {total && (
                        <>
                            <div className="chart-tooltip-divider" />
                            <div className="chart-tooltip-row chart-tooltip-total">
                                <span className="chart-tooltip-key">
                                    <span className="chart-tooltip-label">{total.label}</span>
                                </span>
                                <RollValue to={total.value} format={total.format} />
                            </div>
                        </>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default ChartTooltip;
