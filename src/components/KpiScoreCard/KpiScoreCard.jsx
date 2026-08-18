import { useEffect, useRef, useState } from "react";
import { motion, animate } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUpRight01Icon as HugeTrendUpIcon } from "@hugeicons/core-free-icons";
import sounds from "../../lib/sounds.js";
import "./KpiScoreCard.css";

const MONTHS = [
    { label: "Oct", value: "7.85", fraction: 0.667 },
    { label: "Nov", value: "5.20", fraction: 0.561 },
    { label: "Dec", value: "9.30", fraction: 0.901 },
];

const TrendIcon = () => (
    <HugeiconsIcon
        icon={HugeTrendUpIcon}
        size={16}
        strokeWidth={2}
    />
);

function CountUp({ to }) {
    const ref = useRef(null);
    useEffect(() => {
        const controls = animate(0, to, {
            duration: 1.1,
            ease: [0.22, 1, 0.36, 1],
            delay: 0.15,
            onUpdate: (v) => {
                if (ref.current) {
                    ref.current.textContent = v.toFixed(2);
                }
            },
        });
        return () => controls.stop();
    }, [to]);
    return (
        <span
            ref={ref}
            className="kpi-value-num"
        >
            0.00
        </span>
    );
}

function KpiScoreCard() {
    const [selected, setSelected] = useState(2);
    const [hovered, setHovered] = useState(null);

    return (
        <motion.section
            className="kpi-card"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
            <header className="kpi-header">
                <div className="kpi-header-left">
                    <motion.h2
                        className="kpi-title"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1, duration: 0.4 }}
                    >
                        Average KPI Score
                    </motion.h2>
                    <div className="kpi-score-row">
                        <div className="kpi-score">
                            <CountUp to={8.65} />
                            <span className="kpi-value-den">/10</span>
                        </div>
                        <motion.div
                            className="kpi-trend"
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.55, duration: 0.4 }}
                        >
                            <TrendIcon />
                            <span>4.80%</span>
                        </motion.div>
                    </div>
                </div>
            </header>

            <div className="kpi-chart">
                {MONTHS.map((m, i) => {
                    const active = selected === i || hovered === i;
                    return (
                        <div
                            key={m.label}
                            className="kpi-col"
                            onMouseEnter={() => setHovered(i)}
                            onMouseLeave={() => setHovered(null)}
                            onClick={() => {
                                sounds.tick();
                                setSelected(i);
                            }}
                        >
                            <div className="kpi-track">
                                <motion.div
                                    className={`kpi-bar ${active ? "active" : ""}`}
                                    initial={{ height: 0 }}
                                    animate={{ height: `${m.fraction * 100}%` }}
                                    transition={{
                                        duration: 0.55,
                                        ease: [0.22, 1, 0.36, 1],
                                        delay: 0.35 + i * 0.1,
                                    }}
                                >
                                    <span className="kpi-bar-grad" />
                                    <span className="kpi-notch" />
                                    <span className="kpi-bar-value">{m.value}</span>
                                </motion.div>
                            </div>
                            <motion.span
                                className="kpi-month"
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.95 + i * 0.06, duration: 0.35 }}
                            >
                                {m.label}
                            </motion.span>
                        </div>
                    );
                })}
            </div>
        </motion.section>
    );
}

export default KpiScoreCard;
