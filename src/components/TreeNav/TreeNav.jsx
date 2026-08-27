import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    AddIcon as HugeAddIcon,
    MinusSignIcon as HugeMinusSignIcon,
} from "@hugeicons/core-free-icons";
import sounds from "../../lib/sounds.js";
import "./TreeNav.css";

const NAV_DATA = [
    {
        key: "foundations",
        label: "Foundations",
        children: [
            { key: "principles", label: "Principles" },
            {
                key: "tokens",
                label: "Design Tokens",
                children: [
                    { key: "color", label: "Color" },
                    { key: "typography", label: "Typography" },
                    { key: "spacing", label: "Spacing & Grid" },
                    { key: "elevation", label: "Elevation" },
                ],
            },
            {
                key: "motion",
                label: "Motion",
                children: [
                    { key: "easing", label: "Easing Curves" },
                    { key: "durations", label: "Durations" },
                ],
            },
        ],
    },
    {
        key: "components",
        label: "Components",
        children: [
            {
                key: "token-usage",
                label: "Token Usage",
                children: [
                    { key: "meter", label: "Meter" },
                    { key: "inspector", label: "Inspector" },
                ],
            },
            {
                key: "pill-nav",
                label: "Pill Nav",
                children: [
                    { key: "trigger", label: "Trigger" },
                    { key: "menu", label: "Menu" },
                ],
            },
            {
                key: "revenue-card",
                label: "Revenue Card",
                children: [
                    { key: "chart-toggle", label: "Chart Toggle" },
                    { key: "compare-row", label: "Compare Row" },
                ],
            },
            {
                key: "model-usage",
                label: "Model Usage",
                children: [
                    { key: "stacked-bars", label: "Stacked Bars" },
                    { key: "limit-badge", label: "Limit Badge" },
                ],
            },
        ],
    },
    {
        key: "patterns",
        label: "Patterns",
        children: [
            {
                key: "forms",
                label: "Forms",
                children: [
                    { key: "inputs", label: "Inputs" },
                    { key: "validation", label: "Validation" },
                ],
            },
            {
                key: "feedback",
                label: "Feedback",
                children: [
                    { key: "toasts", label: "Toasts" },
                    { key: "empty-states", label: "Empty States" },
                ],
            },
        ],
    },
];

/* Must match .tn-wires inset/size in TreeNav.css */
const ROPE_POINTS = 18;
const ROPE_SLACK = 1.08;
const GRAVITY = 0.28;
const DRAG = 0.988;
const ITERATIONS = 3;
const MAX_SPEED = 14;
const MIN_SEG_LEN = 4;
const MOUSE_RADIUS = 35;
const MOUSE_PUSH = 3;
const WIRE_WIDTH = 2;
const SUB_WIRE_WIDTH = 1.5;
const WIRE_OPACITY = 1;
const SUB_WIRE_OPACITY = 0.42;
const FADE_SPEED = 0.18;
const WIRE_PAD = 40;

function flatten(nodes, trail = [], depth = 0, acc = []) {
    nodes.forEach((node) => {
        acc.push({ ...node, trail, depth });
        if (node.children?.length) {
            flatten(node.children, [...trail, node.key], depth + 1, acc);
        }
    });
    return acc;
}

function TreeNav() {
    const [expanded, setExpanded] = useState(() => new Set());
    const [active, setActive] = useState(null);

    const containerRef = useRef(null);
    const canvasRef = useRef(null);
    const itemEls = useRef(new Map());
    const ropeSpecsRef = useRef([]);

    const items = useMemo(() => flatten(NAV_DATA), []);
    const visible = useMemo(
        () => items.filter((it) => it.trail.every((k) => expanded.has(k))),
        [items, expanded],
    );
    const ropeSpecs = useMemo(
        () =>
            visible
                .filter((it) => it.depth > 0)
                .map((it) => ({
                    id: `${it.trail[it.trail.length - 1]}>${it.key}`,
                    parent: it.trail[it.trail.length - 1],
                    child: it.key,
                    depth: it.depth,
                })),
        [visible],
    );
    ropeSpecsRef.current = ropeSpecs;

    const registerEl = useCallback((key, el) => {
        if (el) {
            itemEls.current.set(key, el);
        } else {
            itemEls.current.delete(key);
        }
    }, []);

    const handleSelect = useCallback((node) => {
        sounds.tick();
        setActive(node.key);
        if (node.children?.length) {
            setExpanded((prev) => {
                const next = new Set(prev);
                if (next.has(node.key)) {
                    next.delete(node.key);
                } else {
                    next.add(node.key);
                }
                return next;
            });
        }
    }, []);

    useEffect(() => {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        if (!container || !canvas) return undefined;
        const ctx = canvas.getContext("2d");
        if (!ctx) return undefined;

        const reduceMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        ).matches;

        const accent =
            getComputedStyle(document.documentElement)
                .getPropertyValue("--t-accent-orange")
                .trim() || "#ff671a";

        const ropes = new Map();
        const mouse = { x: 0, y: 0 };
        let hasMouse = false;

        const onPointerMove = (e) => {
            const cr = container.getBoundingClientRect();
            mouse.x = e.clientX - cr.left;
            mouse.y = e.clientY - cr.top;
            hasMouse = true;
        };
        const onPointerLeave = () => {
            hasMouse = false;
        };
        container.addEventListener("pointermove", onPointerMove);
        container.addEventListener("pointerleave", onPointerLeave);

        const anchorOf = (key, cr) => {
            const el = itemEls.current.get(key);
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return { x: r.left - cr.left, y: r.top + r.height / 2 - cr.top };
        };

        let raf = 0;
        let lastW = 0;
        let lastH = 0;
        let dpr = 1;

        const frame = () => {
            raf = requestAnimationFrame(frame);
            const w = container.clientWidth;
            const h = container.clientHeight;
            if (!w || !h) return;

            const nextDpr = Math.min(window.devicePixelRatio || 1, 2);
            if (w !== lastW || h !== lastH || nextDpr !== dpr) {
                lastW = w;
                lastH = h;
                dpr = nextDpr;
                canvas.width = Math.round((w + WIRE_PAD * 2) * dpr);
                canvas.height = Math.round((h + WIRE_PAD * 2) * dpr);
                /* Resizing a canvas resets its context state */
                ctx.lineCap = "round";
                ctx.lineJoin = "round";
                ctx.strokeStyle = accent;
            }
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.setTransform(dpr, 0, 0, dpr, WIRE_PAD * dpr, WIRE_PAD * dpr);

            const specs = ropeSpecsRef.current;
            const wanted = new Set(specs.map((s) => s.id));
            for (const id of [...ropes.keys()]) {
                if (!wanted.has(id)) ropes.delete(id);
            }
            for (const spec of specs) {
                if (!ropes.has(spec.id)) {
                    ropes.set(spec.id, {
                        spec,
                        pts: new Float32Array(ROPE_POINTS * 2),
                        prev: new Float32Array(ROPE_POINTS * 2),
                        segLen: 0,
                        seeded: false,
                        opacity: 0,
                    });
                }
            }

            const cr = container.getBoundingClientRect();

            for (const rope of ropes.values()) {
                const a = anchorOf(rope.spec.parent, cr);
                const b = anchorOf(rope.spec.child, cr);
                if (!a || !b) continue;

                const isSub = rope.spec.depth >= 2;
                ctx.lineWidth = isSub ? SUB_WIRE_WIDTH : WIRE_WIDTH;

                const { pts, prev } = rope;
                const lx = (ROPE_POINTS - 1) * 2;

                if (!rope.seeded) {
                    for (let i = 0; i < ROPE_POINTS; i++) {
                        const t = i / (ROPE_POINTS - 1);
                        pts[i * 2] = a.x + (b.x - a.x) * t;
                        pts[i * 2 + 1] = a.y + (b.y - a.y) * t;
                    }
                    prev.set(pts);
                    rope.segLen = Math.max(
                        MIN_SEG_LEN,
                        (Math.hypot(b.x - a.x, b.y - a.y) * ROPE_SLACK) /
                            (ROPE_POINTS - 1),
                    );
                    rope.seeded = true;
                }

                if (reduceMotion) {
                    for (let i = 0; i < ROPE_POINTS; i++) {
                        const t = i / (ROPE_POINTS - 1);
                        pts[i * 2] = a.x + (b.x - a.x) * t;
                        pts[i * 2 + 1] = a.y + (b.y - a.y) * t;
                    }
                } else {
                    for (let i = 1; i < ROPE_POINTS - 1; i++) {
                        const ix = i * 2;
                        const iy = ix + 1;
                        let vx = (pts[ix] - prev[ix]) * DRAG;
                        let vy = (pts[iy] - prev[iy]) * DRAG;
                        const sp = Math.hypot(vx, vy);
                        if (sp > MAX_SPEED) {
                            vx *= MAX_SPEED / sp;
                            vy *= MAX_SPEED / sp;
                        }
                        prev[ix] = pts[ix];
                        prev[iy] = pts[iy];
                        pts[ix] += vx;
                        pts[iy] += vy + GRAVITY;

                        if (hasMouse) {
                            const dx = pts[ix] - mouse.x;
                            const dy = pts[iy] - mouse.y;
                            const d2 = dx * dx + dy * dy;
                            if (d2 < MOUSE_RADIUS * MOUSE_RADIUS && d2 > 0.01) {
                                const d = Math.sqrt(d2);
                                const f = (1 - d / MOUSE_RADIUS) * MOUSE_PUSH;
                                pts[ix] += (dx / d) * f;
                                pts[iy] += (dy / d) * f;
                            }
                        }
                    }

                    for (let k = 0; k < ITERATIONS; k++) {
                        pts[0] = a.x;
                        pts[1] = a.y;
                        pts[lx] = b.x;
                        pts[lx + 1] = b.y;
                        for (let i = 0; i < ROPE_POINTS - 1; i++) {
                            const ix = i * 2;
                            const iy = ix + 1;
                            const jx = ix + 2;
                            const jy = ix + 3;
                            const dx = pts[jx] - pts[ix];
                            const dy = pts[jy] - pts[iy];
                            const d = Math.hypot(dx, dy) || 0.0001;
                            const diff = (d - rope.segLen) / d;
                            const startPinned = i === 0;
                            const endPinned = i + 1 === ROPE_POINTS - 1;
                            if (startPinned && !endPinned) {
                                pts[jx] -= dx * diff;
                                pts[jy] -= dy * diff;
                            } else if (endPinned && !startPinned) {
                                pts[ix] += dx * diff;
                                pts[iy] += dy * diff;
                            } else if (!startPinned && !endPinned) {
                                const hx = dx * diff * 0.5;
                                const hy = dy * diff * 0.5;
                                pts[ix] += hx;
                                pts[iy] += hy;
                                pts[jx] -= hx;
                                pts[jy] -= hy;
                            }
                        }
                    }

                    pts[0] = a.x;
                    pts[1] = a.y;
                    pts[lx] = b.x;
                    pts[lx + 1] = b.y;
                }

                rope.opacity +=
                    ((isSub ? SUB_WIRE_OPACITY : WIRE_OPACITY) - rope.opacity) *
                    FADE_SPEED;

                ctx.globalAlpha = rope.opacity;
                ctx.beginPath();
                ctx.moveTo(pts[0], pts[1]);
                for (let i = 1; i < ROPE_POINTS - 1; i++) {
                    const x = pts[i * 2];
                    const y = pts[i * 2 + 1];
                    const nx = pts[i * 2 + 2];
                    const ny = pts[i * 2 + 3];
                    ctx.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2);
                }
                ctx.lineTo(pts[lx], pts[lx + 1]);
                ctx.stroke();
            }

            ctx.globalAlpha = 1;
        };

        raf = requestAnimationFrame(frame);

        return () => {
            cancelAnimationFrame(raf);
            container.removeEventListener("pointermove", onPointerMove);
            container.removeEventListener("pointerleave", onPointerLeave);
            ropes.clear();
        };
    }, []);

    const renderLevel = (nodes, depth) => (
        <ul className={`tn-list tn-list--l${depth + 1}`}>
            {nodes.map((node) => {
                const hasKids = !!node.children?.length;
                const open = expanded.has(node.key);
                return (
                    <li key={node.key} className="tn-row">
                        <button
                            type="button"
                            ref={(el) => {
                                registerEl(node.key, el);
                            }}
                            className={[
                                "tn-item",
                                `tn-item--l${depth + 1}`,
                                depth === 0 ? "type-body" : "type-body-small",
                                active === node.key ? "active" : "",
                            ]
                                .join(" ")
                                .trim()}
                            aria-expanded={hasKids ? open : undefined}
                            aria-current={
                                active === node.key ? "true" : undefined
                            }
                            onMouseEnter={() => sounds.hover(0.15)}
                            onClick={() => handleSelect(node)}
                        >
                            <span className="tn-item-label">{node.label}</span>
                            {hasKids && (
                                <span
                                    className={`tn-caret${open ? " open" : ""}`}
                                    aria-hidden="true"
                                >
                                    <span className="tn-caret-icon shown-when-closed">
                                        <HugeiconsIcon
                                            icon={HugeAddIcon}
                                            size={14}
                                            strokeWidth={1.5}
                                        />
                                    </span>
                                    <span className="tn-caret-icon shown-when-open">
                                        <HugeiconsIcon
                                            icon={HugeMinusSignIcon}
                                            size={14}
                                            strokeWidth={1.5}
                                        />
                                    </span>
                                </span>
                            )}
                        </button>
                        {hasKids && (
                            <div
                                className={`tn-collapse${open ? " open" : ""}`}
                            >
                                <div className="tn-collapse-inner">
                                    {renderLevel(node.children, depth + 1)}
                                </div>
                            </div>
                        )}
                    </li>
                );
            })}
        </ul>
    );

    return (
        <div className="tree-nav">
            <nav className="tree-nav-inner" aria-label="Site">
                <div className="tn-tree" ref={containerRef}>
                    <canvas
                        ref={canvasRef}
                        className="tn-wires"
                        aria-hidden="true"
                    />
                    {renderLevel(NAV_DATA, 0)}
                </div>
            </nav>
        </div>
    );
}

export default TreeNav;
