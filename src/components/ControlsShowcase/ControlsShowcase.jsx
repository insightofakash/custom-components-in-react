import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    MinusSignIcon,
    PlusSignIcon,
    WifiIcon,
    BluetoothIcon,
    Moon01Icon,
    CheckIcon,
} from "@hugeicons/core-free-icons";
import sounds from "../../lib/sounds.js";
import "./ControlsShowcase.css";

const MIN = 0;
const MAX = 100;
const DEFAULT = 50;

const SLIDER_MIN = 0;
const SLIDER_MAX = 20;
const SLIDER_DEFAULT = 8;

function Digits({ value, pad }) {
    const chars = pad ? String(value).padStart(pad, "0") : String(value);
    return (
        <span key={value} className="t-digit-group is-animating" aria-live="polite">
            {chars.split("").map((ch, i) => (
                <span
                    key={i}
                    className="t-digit"
                    data-stagger={i > 0 ? String(i) : undefined}
                >
                    {ch}
                </span>
            ))}
        </span>
    );
}

function Stepper() {
    const [value, setValue] = useState(DEFAULT);

    const step = (delta) => {
        setValue((v) => {
            const next = Math.min(MAX, Math.max(MIN, v + delta));
            if (next !== v) sounds.tock(0.8);
            return next;
        });
    };

    return (
        <div className="ctrl-card">
            <h2 className="ctrl-heading">Stepper</h2>
            <div className="ctrl-main">
                <div className="stepper">
                    <button
                        type="button"
                        className="glass-btn stepper-btn"
                        aria-label="Decrease"
                        onClick={() => step(-1)}
                        onMouseEnter={() => sounds.tock(0.45)}
                    >
                        <HugeiconsIcon icon={MinusSignIcon} size={18} strokeWidth={1.5} />
                    </button>
                    <span className="stepper-value">
                        <Digits value={value} pad={2} />
                    </span>
                    <button
                        type="button"
                        className="glass-btn stepper-btn"
                        aria-label="Increase"
                        onClick={() => step(1)}
                        onMouseEnter={() => sounds.tock(0.45)}
                    >
                        <HugeiconsIcon icon={PlusSignIcon} size={18} strokeWidth={1.5} />
                    </button>
                </div>
            </div>
        </div>
    );
}

function Slider() {
    const [value, setValue] = useState(SLIDER_DEFAULT);
    const [hovered, setHovered] = useState(false);
    const [dragging, setDragging] = useState(false);
    const trackRef = useRef(null);
    const draggingRef = useRef(false);
    const prevTickRef = useRef(SLIDER_DEFAULT);

    const valueFromClientX = (clientX) => {
        const track = trackRef.current;
        if (!track) return value;
        const rect = track.getBoundingClientRect();
        const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
        return Math.round(SLIDER_MIN + ratio * (SLIDER_MAX - SLIDER_MIN));
    };

    const applyValue = (next) => {
        if (next !== prevTickRef.current) {
            prevTickRef.current = next;
            sounds.thock(0.8);
        }
        setValue(next);
    };

    const handleDown = (e) => {
        draggingRef.current = true;
        setDragging(true);
        trackRef.current?.setPointerCapture?.(e.pointerId);
        applyValue(valueFromClientX(e.clientX));
    };

    const handleMove = (e) => {
        if (!draggingRef.current) return;
        applyValue(valueFromClientX(e.clientX));
    };

    const handleUp = (e) => {
        if (!draggingRef.current) return;
        draggingRef.current = false;
        setDragging(false);
        trackRef.current?.releasePointerCapture?.(e.pointerId);
    };

    const handleKey = (e) => {
        let delta = 0;
        if (e.key === "ArrowRight" || e.key === "ArrowUp") delta = 1;
        else if (e.key === "ArrowLeft" || e.key === "ArrowDown") delta = -1;
        if (delta === 0) return;
        e.preventDefault();
        setValue((v) => {
            const next = Math.min(SLIDER_MAX, Math.max(SLIDER_MIN, v + delta));
            if (next !== v) sounds.thock(0.8);
            return next;
        });
    };

    const pct = ((value - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100;

    return (
        <div className="ctrl-card">
            <h2 className="ctrl-heading">Slider</h2>
            <div className="ctrl-main slider-main">
                <div
                    className="slider"
                    ref={trackRef}
                    role="slider"
                    aria-valuemin={SLIDER_MIN}
                    aria-valuemax={SLIDER_MAX}
                    aria-valuenow={value}
                    tabIndex={0}
                    onPointerDown={handleDown}
                    onPointerMove={handleMove}
                    onPointerUp={handleUp}
                    onPointerCancel={handleUp}
                    onKeyDown={handleKey}
                    onMouseEnter={() => setHovered(true)}
                    onMouseLeave={() => {
                        if (!draggingRef.current) setHovered(false);
                    }}
                >
                    <div className="slider-track" />
                    <div className="slider-fill" style={{ width: `${pct}%` }} />
                    <div className="knob-zone" style={{ left: `${pct}%` }}>
                        <div
                            className={`glass-btn knob ${
                                dragging ? "knob--drag" : hovered ? "knob--tint" : ""
                            }`}
                        />
                    </div>
                </div>
                <div className="slider-readout">
                    <span className="slider-limit">{SLIDER_MIN}</span>
                    <span className="slider-value">
                        <Digits value={value} />
                    </span>
                    <span className="slider-limit">{SLIDER_MAX}</span>
                </div>
            </div>
        </div>
    );
}

const SWITCH_ROWS = [
    { id: "wifi", label: "Wi-Fi", Icon: WifiIcon },
    { id: "bluetooth", label: "Bluetooth", Icon: BluetoothIcon },
    { id: "dark", label: "Dark mode", Icon: Moon01Icon },
];

function SwitchRow({ label, Icon, checked, hovered, onToggle, onHover, onLeave }) {
    return (
        <div className="switch-row" onMouseEnter={onHover} onMouseLeave={onLeave}>
            <HugeiconsIcon icon={Icon} size={16} strokeWidth={1.5} />
            <span className="switch-label">{label}</span>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                className={`switch-track ${checked ? "switch-track--on" : ""}`}
                onClick={onToggle}
            >
                <motion.span
                    className={`glass-btn switch-knob ${
                        hovered ? "switch-knob--hover" : ""
                    }`}
                    animate={{ x: checked ? 20 : 0 }}
                    transition={{ type: "spring", stiffness: 600, damping: 32 }}
                />
            </button>
        </div>
    );
}

function SwitchBoard() {
    const [states, setStates] = useState({
        wifi: true,
        bluetooth: false,
        dark: false,
    });
    const [hovered, setHovered] = useState(null);

    const toggle = (id) => {
        setStates((s) => ({ ...s, [id]: !s[id] }));
        sounds.tock(0.8);
    };

    return (
        <div className="ctrl-card">
            <h2 className="ctrl-heading">Switch</h2>
            <div className="ctrl-main">
                <div className="switch-list">
                    {SWITCH_ROWS.map(({ id, label, Icon }) => (
                        <SwitchRow
                            key={id}
                            label={label}
                            Icon={Icon}
                            checked={states[id]}
                            hovered={hovered === id}
                            onToggle={() => toggle(id)}
                            onHover={() => setHovered(id)}
                            onLeave={() => setHovered(null)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

const CHECK_ROWS = [
    { id: "terms", label: "Terms & conditions" },
    { id: "updates", label: "Product updates" },
    { id: "marketing", label: "Marketing emails" },
];

function Checklist() {
    const [checked, setChecked] = useState(() => new Set(["terms"]));

    const toggle = (id) => {
        setChecked((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
        sounds.tock(0.8);
    };

    return (
        <div className="ctrl-card">
            <h2 className="ctrl-heading">Checkboxes</h2>
            <div className="ctrl-main">
                <div className="check-list">
                    {CHECK_ROWS.map(({ id, label }) => {
                        const on = checked.has(id);
                        return (
                            <button
                                type="button"
                                key={id}
                                className="check-row"
                                aria-pressed={on}
                                onClick={() => toggle(id)}
                            >
                                <span
                                    className={`glass-btn check-box ${
                                        on ? "check-box--on" : ""
                                    }`}
                                >
                                    {on && (
                                        <HugeiconsIcon
                                            icon={CheckIcon}
                                            size={13}
                                            strokeWidth={2.5}
                                        />
                                    )}
                                </span>
                                <span className="check-label">{label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function ControlsShowcase() {
    return (
        <motion.div
            className="controls-showcase"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
            <Stepper />
            <Slider />
            <SwitchBoard />
            <Checklist />
        </motion.div>
    );
}

export default ControlsShowcase;