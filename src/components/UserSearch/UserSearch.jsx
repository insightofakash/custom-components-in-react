import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useAnimationControls } from "framer-motion";
import { Liquid } from "liquid-gooey";
import { HugeiconsIcon } from "@hugeicons/react";
import { ChevronDownIcon, Cancel01Icon } from "@hugeicons/core-free-icons";
import sounds from "../../lib/sounds.js";
import liam from "./avatars/liam.png";
import sophia from "./avatars/sophia.png";
import noah from "./avatars/noah.png";
import emma from "./avatars/emma.png";
import oliver from "./avatars/oliver.png";
import ava from "./avatars/ava.png";
import "./UserSearch.css";

const EASE_OUT = [0.22, 1, 0.36, 1];

const USERS = [
    { id: "liam", name: "Liam Anderson", avatar: liam, pastel: "#C8F1FF" },
    { id: "sophia", name: "Sophia Martinez", avatar: sophia, pastel: "#D1FFF4" },
    { id: "noah", name: "Noah Johnson", avatar: noah, pastel: "#FFDBB8" },
    { id: "emma", name: "Emma Thompson", avatar: emma, pastel: "#EDBBD6" },
    { id: "oliver", name: "Oliver Brown", avatar: oliver, pastel: "#EDD6A1" },
    { id: "ava", name: "Ava Wilson", avatar: ava, pastel: "#C8F1FF" },
];

const PANEL_CLOSED = { scale: 0.1, y: -6 };
const PANEL_OPEN = { x: 0, y: 0, scale: 1 };
const PANEL_TRANSITION = {
    duration: 0.5,
    ease: [0.16, 1, 0.3, 1],
};
const ROW_DELAY_BASE = 0.5;

const ROW_H = 40;
const ROW_GAP = 2;
const ROW_PITCH = ROW_H + ROW_GAP;
const PANEL_MAX_H = 200;

function UserSearch() {
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState(null);
    const [rowHover, setRowHover] = useState(null);
    const [closeHover, setCloseHover] = useState(false);
    const [canScrollUp, setCanScrollUp] = useState(false);
    const [canScrollDown, setCanScrollDown] = useState(true);
    const inputControls = useAnimationControls();
    const rootRef = useRef(null);
    const fieldRef = useRef(null);
    const scrollRef = useRef(null);

    const results = useMemo(
        () =>
            USERS.filter((u) =>
                u.name.toLowerCase().includes(query.trim().toLowerCase()),
            ),
        [query],
    );

    const selectedUser = selected
        ? USERS.find((u) => u.id === selected)
        : null;

    const openPanel = () => {
        if (!open) sounds.whoosh();
        setOpen(true);
        setCanScrollUp(false);
        setCanScrollDown(true);
    };

    const closePanel = () => {
        setOpen(false);
        setRowHover(null);
    };

    const handleScroll = () => {
        const el = scrollRef.current;
        if (!el) return;
        setCanScrollUp(el.scrollTop > 1);
        setCanScrollDown(
            el.scrollTop + el.clientHeight < el.scrollHeight - 1,
        );
    };

    useEffect(() => {
        if (!open) return undefined;
        const onPointerDown = (e) => {
            if (rootRef.current && !rootRef.current.contains(e.target)) {
                closePanel();
            }
        };
        const onKeyDown = (e) => {
            if (e.key === "Escape") closePanel();
        };
        document.addEventListener("pointerdown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("pointerdown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [open]);

    const selectUser = (id) => {
        sounds.toggle();
        setSelected(id);
        setQuery("");
        closePanel();
    };

    const clearSelection = () => {
        sounds.click();
        inputControls.start({
            x: [0, -3, 3, -2, 2, 0],
            transition: { duration: 0.3, ease: "easeInOut" },
        });
        setSelected(null);
        setCloseHover(false);
        if (fieldRef.current) fieldRef.current.focus();
    };

    const scrollable =
        results.length * ROW_PITCH + 4 > PANEL_MAX_H;
    const panelH =
        results.length === 0
            ? 0
            : Math.min(results.length * ROW_PITCH + 4, PANEL_MAX_H);
    const hoverTop = (rowHover ?? 0) * ROW_PITCH;
    const FADE_PX = 16;
    const scrollMask = scrollable
        ? `linear-gradient(180deg,
            transparent 0,
            #000 ${canScrollUp ? FADE_PX : 0}px,
            #000 calc(100% - ${canScrollDown ? FADE_PX : 0}px),
            transparent 100%)`
        : "none";

    return (
        <section className="user-search-stage">
            <motion.div
                className="user-search-wrap"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: EASE_OUT }}
            >
                <div className="user-search" ref={rootRef}>
                <Liquid
                    className="user-search-liquid"
                    blur={6}
                    contrast={18}
                    fill="#1a1a1a"
                    filterPadding={200}
                    style={{ display: "inline-block" }}
                >
                    <Liquid.Item>
                        <motion.div
                                    className={`us-input ${
                                        selectedUser && closeHover ? "us-input--danger" : ""
                                    }`}
                                    animate={inputControls}
                                    onClick={() => {
                                        if (selectedUser) {
                                            sounds.click();
                                            openPanel();
                                        }
                                    }}
                                >
                            {selectedUser ? (
                                <button
                                    type="button"
                                    className="us-chip"
                                    aria-label={`Selected: ${selectedUser.name}`}
                                >
                                    <span
                                        className="us-avatar"
                                        style={{ background: selectedUser.pastel }}
                                    >
                                        <img
                                            src={selectedUser.avatar}
                                            alt=""
                                            draggable={false}
                                        />
                                    </span>
                                    <span className="us-chip-name">
                                        {selectedUser.name}
                                    </span>
                                </button>
                            ) : (
                                <input
                                    ref={fieldRef}
                                    className="us-field"
                                    type="text"
                                    placeholder="Search user"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onClick={openPanel}
                                    onFocus={openPanel}
                                />
                            )}
                            <motion.button
                                type="button"
                                className="us-trailing"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (selectedUser) {
                                        clearSelection();
                                    } else {
                                        setOpen((o) => {
                                            const next = !o;
                                            if (next) sounds.whoosh();
                                            return next;
                                        });
                                    }
                                }}
                                onMouseEnter={() => {
                                    if (!selectedUser) return;
                                    sounds.hover(0.35);
                                    setCloseHover(true);
                                }}
                                onMouseLeave={() => setCloseHover(false)}
                                aria-label={
                                    selectedUser
                                        ? "Clear selection"
                                        : open
                                            ? "Close list"
                                            : "Open list"
                                }
                            >
                                {selectedUser ? (
                                    <HugeiconsIcon
                                        icon={Cancel01Icon}
                                        size={12}
                                        strokeWidth={1.67}
                                        color={closeHover ? "#fff" : "#A6A6A6"}
                                    />
                                ) : (
                                    <motion.span
                                        className="us-chev"
                                        animate={{ rotate: open ? 180 : 0 }}
                                        transition={{
                                            duration: 0.28,
                                            ease: EASE_OUT,
                                        }}
                                    >
                                        <HugeiconsIcon
                                            icon={ChevronDownIcon}
                                            size={16}
                                            strokeWidth={1.67}
                                            color="#A6A6A6"
                                        />
                                    </motion.span>
                                )}
                            </motion.button>
                        </motion.div>
                    </Liquid.Item>

                    <AnimatePresence>
                        {open && (
                            <Liquid.Item
                                morph={{ shape: true, contentBlur: 8, bounce: 0, speed: 1.2 }}
                            >
                                <motion.div
                                    className="us-panel"
                                    style={{ height: panelH }}
                                    initial={{
                                        ...PANEL_CLOSED,
                                        transition: PANEL_TRANSITION,
                                        transformOrigin: "50% 0%",
                                    }}
                                    animate={{
                                        ...PANEL_OPEN,
                                        transition: PANEL_TRANSITION,
                                        transformOrigin: "50% 0%",
                                    }}
                                    exit={{
                                        ...PANEL_CLOSED,
                                        height: 0,
                                        opacity: 0,
                                        transition: {
                                            scale: PANEL_TRANSITION,
                                            y: PANEL_TRANSITION,
                                            height: PANEL_TRANSITION,
                                            opacity: { duration: 0.2, ease: "easeIn" },
                                        },
                                    }}
                                >
                                    <div
                                        className={`us-scroll ${open ? "" : "us-scroll--closing"}`}
                                        ref={scrollRef}
                                        onScroll={handleScroll}
                                        style={{
                                            WebkitMaskImage: scrollMask,
                                            maskImage: scrollMask,
                                        }}
                                        onMouseLeave={() => setRowHover(null)}
                                    >
                                        <div className="us-rows">
                                        <AnimatePresence>
                                            {rowHover != null &&
                                                results.length > 0 && (
                                                    <motion.div
                                                        className="us-row-hover"
                                                        animate={{ top: hoverTop }}
                                                        transition={{
                                                            type: "spring",
                                                            stiffness: 500,
                                                            damping: 34,
                                                        }}
                                                    />
                                                )}
                                        </AnimatePresence>
                                        {results.map((u, i) => (
                                            <motion.button
                                                key={u.id}
                                                type="button"
                                                className="us-row"
                                                onClick={() => selectUser(u.id)}
                                                onMouseEnter={() => {
                                                    sounds.hoverDeep(0.3);
                                                    setRowHover(i);
                                                }}
                                                initial={{ opacity: 0, y: 4 }}
                                                animate={{ opacity: 1, y: 0 }}
transition={{
                                                        delay: ROW_DELAY_BASE + i * 0.1,
                                                        duration: 0.3,
                                                        ease: EASE_OUT,
                                                    }}
                                            >
                                                <span
                                                    className="us-avatar"
                                                    style={{ background: u.pastel }}
                                                >
                                                    <img
                                                        src={u.avatar}
                                                        alt=""
                                                        draggable={false}
                                                    />
                                                </span>
                                                <span className="us-row-name">
                                                    {u.name}
                                                </span>
                                            </motion.button>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        </Liquid.Item>
                    )}
                </AnimatePresence>
            </Liquid>
            </div>
            </motion.div>
        </section>
    );
}

export default UserSearch;