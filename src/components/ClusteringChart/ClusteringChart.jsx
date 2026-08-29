import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import { ThreeDRotateIcon as HugeThreeDRotateIcon } from "@hugeicons/core-free-icons";
import sounds from "../../lib/sounds.js";
import "./ClusteringChart.css";

const EASE_OUT = [0.22, 1, 0.36, 1];

/* Canvas colors can't read CSS variables, so these mirror the accent tokens
   from styles/tokens.css (`--t-accent-*`) for the cluster hierarchy. The green
   is a slightly softened variant of the neon token so it reads better at scale. */
const ACCENTS = {
    blue: [56, 172, 255],
    orange: [255, 103, 26],
    red: [255, 56, 96],
    amber: [254, 188, 46],
    green: [0, 208, 98],
};

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const round1 = (v) => Math.round(v * 10) / 10;

/* Deterministic PRNG + Box–Muller gaussian so the ~250-point field is stable
   across renders and drags. */
function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function gaussian(rand) {
    const u = Math.max(rand(), 1e-9);
    const v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const CLUSTER_SEEDS = [
    { id: "A", label: "Enterprise", color: ACCENTS.blue, center: [0.68, 0.56, 0.61], sigma: 0.07, count: 52, revenue: 24000, ltv: 2.4, churn: 3.0 },
    { id: "B", label: "Mid-Market", color: ACCENTS.orange, center: [0.32, 0.3, 0.38], sigma: 0.07, count: 50, revenue: 17000, ltv: 1.6, churn: 5.0 },
    { id: "C", label: "SMB", color: ACCENTS.amber, center: [0.5, 0.76, 0.26], sigma: 0.065, count: 50, revenue: 12000, ltv: 0.9, churn: 8.5 },
    { id: "D", label: "Startup", color: ACCENTS.red, center: [0.24, 0.62, 0.72], sigma: 0.07, count: 48, revenue: 9000, ltv: 0.8, churn: 12 },
    { id: "E", label: "Agency", color: ACCENTS.green, center: [0.8, 0.26, 0.34], sigma: 0.06, count: 50, revenue: 14000, ltv: 1.5, churn: 6.0 },
];

const rand = mulberry32(20240814);
const clusters = CLUSTER_SEEDS.map((s) => ({
    id: s.id,
    label: s.label,
    color: s.color,
    points: Array.from({ length: s.count }, () => {
        const noise = gaussian(rand);
        const t = rand();
        return {
            x: clamp(s.center[0] + gaussian(rand) * s.sigma, 0.06, 0.94),
            y: clamp(s.center[1] + gaussian(rand) * s.sigma, 0.06, 0.94),
            z: clamp(s.center[2] + gaussian(rand) * s.sigma, 0.06, 0.94),
            r: 2 + rand() * 3,
            revenue: Math.round(s.revenue * (0.55 + t) + noise * s.revenue * 0.15),
            ltv: round1(clamp(s.ltv * (0.8 + t * 0.4) + noise * 0.08, 0.4, 4)),
            churn: round1(clamp(s.churn * (0.85 + t * 0.3) + noise * 0.3, 1, 16)),
        };
    }),
}));

const TOTAL_SEGMENTS = clusters.reduce((s, c) => s + c.points.length, 0);

const stats = [
    { label: "Total Revenue", value: "$3.61M", change: "+14.2%", positive: true },
    { label: "Active Segments", value: TOTAL_SEGMENTS.toLocaleString("en-US"), change: "+4", positive: true },
    { label: "Avg. LTV", value: "1.62×", change: "+0.18", positive: true },
    { label: "Avg. Churn", value: "5.9%", change: "-0.6%", positive: true },
    { label: "Clusters", value: "5", change: "+1", positive: true },
    { label: "Outlier Rate", value: "3.8%", change: "-0.9%", positive: true },
];

const regionData = [
    { region: "Enterprise", arr: "68.2K", ltv: "2.2×", churn: "2.8%", pct: 42 },
    { region: "Mid-Market", arr: "44.1K", ltv: "1.8×", churn: "4.3%", pct: 35 },
    { region: "Agency", arr: "22.8K", ltv: "1.6×", churn: "5.3%", pct: 18 },
    { region: "SMB", arr: "28.7K", ltv: "0.9×", churn: "8.3%", pct: 25 },
    { region: "Startup", arr: "14.2K", ltv: "1.0×", churn: "11.2%", pct: 15 },
];

function project3D(x, y, z, rotX, rotY, w, h) {
    const cx = x - 0.5;
    const cy = y - 0.5;
    const cz = z - 0.5;
    const cosY = Math.cos(rotY);
    const sinY = Math.sin(rotY);
    const rx = cx * cosY - cz * sinY;
    const rz = cx * sinY + cz * cosY;
    const cosX = Math.cos(rotX);
    const sinX = Math.sin(rotX);
    const ry = cy * cosX - rz * sinX;
    const rz2 = cy * sinX + rz * cosX;
    const fov = 2.2;
    const scale = fov / (fov + rz2);
    const sx = (rx * scale + 0.5) * w;
    const sy = (ry * scale + 0.5) * h;
    return { sx, sy, scale, depth: rz2 };
}

const DOT_FIELD = [
    [0.1, 0.15, 0.2], [0.85, 0.1, 0.3], [0.5, 0.05, 0.8], [0.2, 0.9, 0.1], [0.9, 0.85, 0.7],
    [0.15, 0.5, 0.9], [0.75, 0.5, 0.05], [0.4, 0.2, 0.6], [0.6, 0.8, 0.4], [0.3, 0.7, 0.7],
    [0.8, 0.3, 0.5], [0.05, 0.4, 0.5], [0.5, 0.5, 0.02], [0.5, 0.5, 0.98], [0.02, 0.5, 0.5],
    [0.98, 0.5, 0.5], [0.5, 0.02, 0.5], [0.5, 0.98, 0.5], [0.25, 0.25, 0.75], [0.75, 0.75, 0.25],
    [0.25, 0.75, 0.25], [0.75, 0.25, 0.75], [0.1, 0.85, 0.5], [0.9, 0.15, 0.5], [0.5, 0.1, 0.1],
    [0.35, 0.6, 0.15], [0.65, 0.4, 0.85], [0.1, 0.3, 0.7], [0.9, 0.7, 0.3], [0.4, 0.9, 0.6],
];

const CAGE_EDGES = [
    [0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7],
];

function ClusteringChart() {
    const canvasRef = useRef(null);
    const rotRef = useRef({ x: 0.38, y: 0.52 });
    const targetRotRef = useRef({ x: 0.38, y: 0.52 });
    const dragRef = useRef(null);
    const hoveredRef = useRef(null);
    const prevHoveredRef = useRef(null);
    const zoomRef = useRef(1);
    const zoomVelRef = useRef(0);
    const [hovered, setHovered] = useState(null);
    const [hoveredCluster, setHoveredCluster] = useState(null);
    const [tooltip, setTooltip] = useState(null);
    const [autoRotate, setAutoRotate] = useState(true);
    const autoRotRef = useRef(true);

    useEffect(() => {
        autoRotRef.current = autoRotate;
    }, [autoRotate]);

    const project = useCallback((x, y, z, rotX, rotY, w, h) => {
        const p = project3D(x, y, z, rotX, rotY, w, h);
        const zNow = zoomRef.current;
        return {
            sx: w / 2 + (p.sx - w / 2) * zNow,
            sy: h / 2 + (p.sy - h / 2) * zNow,
            scale: p.scale * zNow,
            depth: p.depth,
        };
    }, []);

    useEffect(() => {
        const el = canvasRef.current;
        if (!el) return undefined;
        const onWheel = (e) => {
            e.preventDefault();
            const sens = 0.00002;
            zoomVelRef.current = clamp(zoomVelRef.current - e.deltaY * sens, -0.01, 0.01);
        };
        el.addEventListener("wheel", onWheel, { passive: false });
        return () => el.removeEventListener("wheel", onWheel);
    }, []);

    const draw = useCallback(
        () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext("2d");
            const W = canvas.width;
            const H = canvas.height;
            ctx.clearRect(0, 0, W, H);

            const rx = rotRef.current.x;
            const ry = rotRef.current.y;
            const gridSteps = 5;

            DOT_FIELD.forEach((pos) => {
                const p = project(pos[0], pos[1], pos[2], rx, ry, W, H);
                const dimming = Math.max(0.3, 1 - Math.abs(p.depth) * 0.6);
                ctx.beginPath();
                ctx.arc(p.sx, p.sy, 1.1 * dimming, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255,255,255,${0.1 * dimming})`;
                ctx.fill();
            });

            ctx.setLineDash([1, 6]);
            ctx.lineWidth = 0.5;
            ctx.strokeStyle = "rgba(255,255,255,0.04)";
            [
                [0.5, 0, 0.5, 0.5, 1, 0.5],
                [0, 0.5, 0.5, 1, 0.5, 0.5],
                [0.5, 0.5, 0, 0.5, 0.5, 1],
            ].forEach((seg) => {
                const a = project(seg[0], seg[1], seg[2], rx, ry, W, H);
                const b = project(seg[3], seg[4], seg[5], rx, ry, W, H);
                ctx.beginPath();
                ctx.moveTo(a.sx, a.sy);
                ctx.lineTo(b.sx, b.sy);
                ctx.stroke();
            });
            ctx.setLineDash([]);

            const corners = [
                [0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0],
                [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1],
            ];
            const proj = corners.map((c) => project(c[0], c[1], c[2], rx, ry, W, H));

            ctx.strokeStyle = "rgba(255,255,255,0.07)";
            ctx.lineWidth = 0.8;
            ctx.setLineDash([]);
            CAGE_EDGES.forEach((e) => {
                ctx.beginPath();
                ctx.moveTo(proj[e[0]].sx, proj[e[0]].sy);
                ctx.lineTo(proj[e[1]].sx, proj[e[1]].sy);
                ctx.stroke();
            });

            ctx.lineWidth = 0.65;
            ctx.setLineDash([2, 5]);

            ctx.strokeStyle = "rgba(255,255,255,0.06)";
            for (let i = 1; i < gridSteps; i++) {
                const t = i / gridSteps;
                const pa = project(t, 1, 0, rx, ry, W, H);
                const pb = project(t, 1, 1, rx, ry, W, H);
                const pc = project(0, 1, t, rx, ry, W, H);
                const pd = project(1, 1, t, rx, ry, W, H);
                ctx.beginPath();
                ctx.moveTo(pa.sx, pa.sy);
                ctx.lineTo(pb.sx, pb.sy);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(pc.sx, pc.sy);
                ctx.lineTo(pd.sx, pd.sy);
                ctx.stroke();
            }

            ctx.strokeStyle = "rgba(255,255,255,0.032)";
            for (let i = 1; i < gridSteps; i++) {
                const t = i / gridSteps;
                const pa = project(t, 0, 0, rx, ry, W, H);
                const pb = project(t, 1, 0, rx, ry, W, H);
                const pc = project(0, t, 0, rx, ry, W, H);
                const pd = project(1, t, 0, rx, ry, W, H);
                ctx.beginPath();
                ctx.moveTo(pa.sx, pa.sy);
                ctx.lineTo(pb.sx, pb.sy);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(pc.sx, pc.sy);
                ctx.lineTo(pd.sx, pd.sy);
                ctx.stroke();
            }

            ctx.strokeStyle = "rgba(255,255,255,0.025)";
            for (let i = 1; i < gridSteps; i++) {
                const t = i / gridSteps;
                const pa = project(0, t, 0, rx, ry, W, H);
                const pb = project(0, t, 1, rx, ry, W, H);
                const pc = project(0, 0, t, rx, ry, W, H);
                const pd = project(0, 1, t, rx, ry, W, H);
                ctx.beginPath();
                ctx.moveTo(pa.sx, pa.sy);
                ctx.lineTo(pb.sx, pb.sy);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(pc.sx, pc.sy);
                ctx.lineTo(pd.sx, pd.sy);
                ctx.stroke();
            }
            ctx.setLineDash([]);

            const allPoints = [];
            clusters.forEach((cluster) => {
                cluster.points.forEach((pt) => {
                    const p = project(pt.x, pt.y, pt.z, rx, ry, W, H);
                    allPoints.push({ ...pt, sx: p.sx, sy: p.sy, scale: p.scale, depth: p.depth, cluster });
                });
            });
            allPoints.sort((a, b) => a.depth - b.depth);

            clusters.forEach((cluster) => {
                const pts = cluster.points.map((pt) => {
                    const p = project(pt.x, pt.y, pt.z, rx, ry, W, H);
                    return { sx: p.sx, sy: p.sy };
                });
                const c = cluster.color;
                const active = hoveredCluster == null || cluster.id === hoveredCluster;
                const alpha = hoveredCluster == null ? 0.08 : active ? 0.22 : 0.03;
                ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
                ctx.lineWidth = 0.6;
                ctx.setLineDash([2, 4]);
                for (let i = 1; i < pts.length; i++) {
                    ctx.beginPath();
                    ctx.moveTo(pts[0].sx, pts[0].sy);
                    ctx.lineTo(pts[i].sx, pts[i].sy);
                    ctx.stroke();
                }
            });
            ctx.setLineDash([]);

            allPoints.forEach((pt) => {
                const { sx, sy, scale, cluster, depth } = pt;
                const radius = pt.r * scale * (W / 440);
                const c = cluster.color;
                const r = c[0];
                const g = c[1];
                const b = c[2];
                const isHov = hovered && hovered.cluster.id === cluster.id && hovered.revenue === pt.revenue;
                const clusterActive = hoveredCluster != null && cluster.id === hoveredCluster;
                const dimmed = hoveredCluster != null && !clusterActive;
                const depthFade = Math.max(0.35, 1 - Math.abs(depth) * 0.55);
                const rad = radius * 1.15 * (clusterActive ? 1.12 : 1);

                const centerA = isHov ? 0.95 : clusterActive ? 0.9 : 0.8;
                const dotGrd = ctx.createRadialGradient(sx, sy, 0, sx, sy, rad);
                const alpha = centerA * depthFade * (dimmed ? 0.28 : 1);
                const hiR = isHov ? Math.min(r + 90, 255) : r;
                const hiG = isHov ? Math.min(g + 90, 255) : g;
                const hiB = isHov ? Math.min(b + 90, 255) : b;
                dotGrd.addColorStop(0, `rgba(${hiR},${hiG},${hiB},${alpha})`);
                dotGrd.addColorStop(0.45, `rgba(${r},${g},${b},${alpha * 0.85})`);
                dotGrd.addColorStop(1, `rgba(${r},${g},${b},0)`);
                ctx.beginPath();
                ctx.arc(sx, sy, rad, 0, Math.PI * 2);
                ctx.fillStyle = dotGrd;
                ctx.fill();

                if (isHov) {
                    const coreGrd = ctx.createRadialGradient(sx, sy, 0, sx, sy, rad * 0.5);
                    coreGrd.addColorStop(0, "rgba(255,255,255,0.5)");
                    coreGrd.addColorStop(1, "rgba(255,255,255,0)");
                    ctx.beginPath();
                    ctx.arc(sx, sy, rad * 0.5, 0, Math.PI * 2);
                    ctx.fillStyle = coreGrd;
                    ctx.fill();
                }
            });
        },
        [hovered, hoveredCluster, project],
    );

    useEffect(() => {
        let lastTime = 0;
        const LERP = 0.12;
        let frame;
        const loop = (t) => {
            const dt = Math.min(t - lastTime, 50);
            lastTime = t;
            if (!dragRef.current && !hoveredRef.current && autoRotRef.current) {
                targetRotRef.current.y += dt * 0.00018;
            }
            rotRef.current.x += (targetRotRef.current.x - rotRef.current.x) * LERP;
            rotRef.current.y += (targetRotRef.current.y - rotRef.current.y) * LERP;
            zoomVelRef.current *= Math.exp(-dt / 160);
            const nextZoom = clamp(zoomRef.current + zoomVelRef.current * dt, 0.6, 2.8);
            if (nextZoom <= 0.6001 || nextZoom >= 2.7999) {
                zoomVelRef.current = 0;
            }
            zoomRef.current = nextZoom;
            draw();
            frame = requestAnimationFrame(loop);
        };
        frame = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(frame);
    }, [draw]);

    const getPos = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const source = e.touches ? e.touches[0] : e;
        return {
            x: (source.clientX - rect.left) * scaleX,
            y: (source.clientY - rect.top) * scaleY,
        };
    };

    const setCanvasCursor = (mode) => {
        const el = canvasRef.current;
        if (el) el.style.cursor = mode;
    };

    const onMouseDown = (e) => {
        const pos = getPos(e);
        dragRef.current = {
            startX: pos.x,
            startY: pos.y,
            rotX: targetRotRef.current.x,
            rotY: targetRotRef.current.y,
        };
        setCanvasCursor("grabbing");
        setAutoRotate(false);
    };

    const onMouseMove = (e) => {
        if (dragRef.current) {
            setCanvasCursor("grabbing");
            const pos = getPos(e);
            targetRotRef.current.y = dragRef.current.rotY + (pos.x - dragRef.current.startX) * 0.008;
            targetRotRef.current.x = Math.max(
                -1.2,
                Math.min(1.2, dragRef.current.rotX + (pos.y - dragRef.current.startY) * 0.008),
            );
            return;
        }
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
        const my = (e.clientY - rect.top) * (canvas.height / rect.height);
        let found = null;
        let minDist = Infinity;
        clusters.forEach((cluster) => {
            cluster.points.forEach((pt) => {
                const p = project(pt.x, pt.y, pt.z, rotRef.current.x, rotRef.current.y, canvas.width, canvas.height);
                const rad = pt.r * p.scale * (canvas.width / 440);
                const d = Math.hypot(mx - p.sx, my - p.sy);
                if (d < rad && d < minDist) {
                    minDist = d;
                    found = { ...pt, cluster };
                }
            });
        });
        setCanvasCursor(found ? "pointer" : "grab");
        if (found) {
            setAutoRotate(false);
        }
        const foundKey = found ? `${found.cluster.id}:${found.revenue}` : null;
        if (foundKey !== prevHoveredRef.current) {
            prevHoveredRef.current = foundKey;
            if (foundKey) sounds.hover(0.35);
        }
        hoveredRef.current = found;
        setHovered(found);
        setHoveredCluster(found ? found.cluster.id : null);
        if (found) {
            setTooltip({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
                cluster: found.cluster,
                pt: found,
            });
        } else {
            setTooltip(null);
        }
    };

    const onMouseUp = () => {
        dragRef.current = null;
        setCanvasCursor(hoveredRef.current ? "pointer" : "grab");
    };

    const onMouseLeave = () => {
        dragRef.current = null;
        hoveredRef.current = null;
        prevHoveredRef.current = null;
        setCanvasCursor("grab");
        setHovered(null);
        setHoveredCluster(null);
        setTooltip(null);
    };

    const toggleRotate = () => {
        sounds.toggle();
        setAutoRotate((v) => !v);
    };

    const enterCluster = (id) => {
        if (hoveredCluster !== id) {
            sounds.hoverSub(0.4);
            setHoveredCluster(id);
        }
    };

    const rgbOf = (color) => `rgb(${color[0]},${color[1]},${color[2]})`;

    return (
        <motion.section
            className="cc-card"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE_OUT }}
        >
            <header className="cc-header">
                <div className="cc-header-main">
                    <h2 className="cc-title">Customer Clusters</h2>
                    <span className="cc-subtitle">Q4 2024 · {TOTAL_SEGMENTS} segments · 5 clusters</span>
                </div>
                <motion.button
                    type="button"
                    className={`cc-rotate-btn ${autoRotate ? "active" : ""}`}
                    onClick={toggleRotate}
                    whileTap={{ scale: 0.94 }}
                    aria-pressed={autoRotate}
                    aria-label={autoRotate ? "Pause auto-rotation" : "Resume auto-rotation"}
                >
                    <HugeiconsIcon
                        icon={HugeThreeDRotateIcon}
                        size={14}
                        strokeWidth={1.75}
                    />
                    <span className="cc-rotate-label type-label">Rotate</span>
                    <span className={`cc-rotate-dot ${autoRotate ? "on" : ""}`} />
                </motion.button>
            </header>

            <div
                className="cc-legend"
                onMouseLeave={() => setHoveredCluster(null)}
            >
                {clusters.map((c) => {
                    const isDim = hoveredCluster != null && hoveredCluster !== c.id;
                    return (
                        <span
                            key={c.id}
                            className={`cc-tag type-label ${isDim ? "dimmed" : ""}`}
                            style={{ "--cc-c": rgbOf(c.color) }}
                            onMouseEnter={() => enterCluster(c.id)}
                        >
                            <span className="cc-tag-dot" />
                            {c.label}
                        </span>
                    );
                })}
            </div>

            <div className="cc-canvas">
                <canvas
                    ref={canvasRef}
                    width={800}
                    height={490}
                    className="cc-canvas-el"
                    onMouseDown={onMouseDown}
                    onMouseMove={onMouseMove}
                    onMouseUp={onMouseUp}
                    onMouseLeave={onMouseLeave}
                    onTouchStart={(e) => {
                        e.preventDefault();
                        onMouseDown(e);
                    }}
                    onTouchMove={(e) => {
                        e.preventDefault();
                        onMouseMove(e);
                    }}
                    onTouchEnd={onMouseUp}
                />
                <span className="cc-canvas-hint type-caption">drag to rotate · scroll to zoom</span>
                <AnimatePresence>
                    {tooltip && (
                        <motion.div
                            key="cc-tooltip"
                            className="cc-tooltip"
                            style={{
                                left: Math.min(tooltip.x + 14, 296),
                                top: Math.max(tooltip.y - 84, 8),
                                "--cc-c": rgbOf(tooltip.cluster.color),
                            }}
                            initial={{ opacity: 0, y: 6, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 4 }}
                            transition={{ duration: 0.16, ease: "easeOut" }}
                        >
                            <div className="cc-tt-label">{tooltip.cluster.label}</div>
                            <div className="cc-tt-value type-mono-label">
                                ${tooltip.pt.revenue.toLocaleString("en-US")}
                            </div>
                            <div className="cc-tt-meta">
                                <div>
                                    <div className="cc-tt-meta-label type-caption">LTV</div>
                                    <div className="type-mono-label">{tooltip.pt.ltv}x</div>
                                </div>
                                <div>
                                    <div className="cc-tt-meta-label type-caption">Churn</div>
                                    <div className="type-mono-label">{tooltip.pt.churn}%</div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="cc-stats">
                {stats.map((s) => (
                    <div key={s.label} className="cc-stat">
                        <div className="cc-stat-label type-caption">{s.label}</div>
                        <div className="cc-stat-main">
                            <span className="cc-stat-value type-mono-label">{s.value}</span>
                            <span className={`cc-stat-change type-mono-label ${s.positive ? "positive" : "negative"}`}>
                                {s.change}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="cc-divider" />

            <div className="cc-table">
                <div className={`cc-trow cc-thead ${hoveredCluster ? "muted" : ""}`}>
                    {["Segment", "Share", "ARR", "LTV", "Churn", "%"].map((h) => (
                        <div key={h} className={`cc-cell cc-th type-caption ${h === "Segment" || h === "Share" ? "left" : "right"}`}>
                            {h}
                        </div>
                    ))}
                </div>
                <div className="cc-tbody" onMouseLeave={() => setHoveredCluster(null)}>
                    {regionData.map((row) => {
                        const cluster = clusters.find((c) => c.label === row.region);
                        const isDim = hoveredCluster != null && hoveredCluster !== cluster.id;
                        return (
                            <div
                                key={row.region}
                                className={`cc-trow ${isDim ? "dimmed" : ""}`}
                                style={{ "--cc-c": rgbOf(cluster.color) }}
                                onMouseEnter={() => enterCluster(cluster.id)}
                            >
                                <div className="cc-cell cc-seg left">{row.region}</div>
                                <div className="cc-cell cc-share left">
                                    <div className="cc-bar">
                                        <div className="cc-bar-fill" style={{ width: `${row.pct}%` }} />
                                    </div>
                                </div>
                                <div className="cc-cell cc-num right type-mono-label">{row.arr}</div>
                                <div className="cc-cell cc-num right type-mono-label">{row.ltv}</div>
                                <div className="cc-cell cc-num right type-mono-label">{row.churn}</div>
                                <div className="cc-cell cc-num right cc-pct type-mono-label">{row.pct}%</div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <footer className="cc-footer">
                <span className="type-caption">Updated 2h ago</span>
                <div className="cc-footer-params">
                    <span className="type-mono-label">k-means · k=5</span>
                    <span className="type-mono-label">e=0.15</span>
                </div>
            </footer>
        </motion.section>
    );
}

export default ClusteringChart;