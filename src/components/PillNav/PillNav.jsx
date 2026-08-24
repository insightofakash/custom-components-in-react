import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Liquid } from "liquid-gooey";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  MenuIcon,
  Cancel01Icon,
  BellIcon,
  BubbleChatIcon,
  File01Icon,
  UserAccountIcon,
  Settings02Icon,
  File02Icon,
} from "@hugeicons/core-free-icons";
import sounds from "../../lib/sounds.js";
import "./PillNav.css";

const MENU_ITEMS = [
  { id: "account", label: "Account Details", Icon: UserAccountIcon },
  { id: "settings", label: "Settings", Icon: Settings02Icon },
  { id: "guide", label: "Guide", Icon: File02Icon },
];

const ROLL_IN = {
  initial: { y: 24, opacity: 0, scale: 0.85, filter: "blur(8px)" },
  animate: { y: 0, opacity: 1, scale: 1, filter: "blur(0px)" },
  exit: { y: -24, opacity: 0, scale: 0.85, filter: "blur(8px)" },
};

const ROLL_TRANSITION = {
  duration: 0.45,
  ease: [0.16, 1, 0.3, 1],
};

const DROPDOWN_CLOSED = { x: -116, y: 119, scale: 0.1 };
const DROPDOWN_OPEN = { x: 0, y: 0, scale: 1 };
const DROPDOWN_TRANSITION = {
  duration: 0.5,
  ease: [0.16, 1, 0.3, 1],
};

function hoverSound() {
  sounds.hover(0.2);
}

const BTN_W = 48;
const BTN_GAP = 4;

const ROW_H = 50;

function PillNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [navHover, setNavHover] = useState(null);
  const [rowHover, setRowHover] = useState(null);
  const wrapperRef = useRef(null);

  const handleNavMouseLeave = (e) => {
    const next = e.relatedTarget;
    if (wrapperRef.current && next && wrapperRef.current.contains(next)) {
      return;
    }
    setNavHover(null);
  };

  const handleMenuClick = () => {
    sounds.click();
    if (selected) {
      setSelected(null);
      setMenuOpen(false);
      return;
    }
    if (!menuOpen) sounds.whoosh();
    setMenuOpen((o) => !o);
  };

  const handleSelect = (id) => {
    sounds.toggle();
    setSelected(id);
    setMenuOpen(false);
  };

  const selectedItem = selected
    ? MENU_ITEMS.find((m) => m.id === selected)
    : null;

  const selectedIndex = selected
    ? MENU_ITEMS.findIndex((m) => m.id === selected)
    : null;

  const navPillIndex =
    navHover ?? (menuOpen || selected ? 3 : null);
  const navPillX = navPillIndex == null ? 0 : 4 + navPillIndex * (BTN_W + BTN_GAP);
  const navPillW =
    navPillIndex === 3 && selected ? 68 : 48;
  const navPillColor =
    navHover === 3 && selected
      ? "rgba(228, 31, 31, 0.9)"
      : navHover == null && (menuOpen || selected)
        ? "var(--t-body)"
        : "var(--t-strong)";
  const pillIndex =
    rowHover ?? (menuOpen && selectedIndex != null ? selectedIndex : null);
  const pillTop = pillIndex == null ? 0 : 4 + pillIndex * ROW_H;
  const pillSelected = rowHover == null && pillIndex != null;

  return (
    <div className="pill-nav-wrapper" ref={wrapperRef}>
      <Liquid
        className="pill-nav-liquid"
        blur={6}
        contrast={18}
        fill="#292929"
        shadow="inset 0 0 0 1px #1a1a1a"
        filterPadding={220}
        style={{ display: "inline-block" }}
      >
        <Liquid.Item>
          <div
            className="pill-nav-inner"
            onMouseLeave={handleNavMouseLeave}
          >
            <AnimatePresence>
              {navPillIndex != null && (
                <motion.div
                  className="pill-nav-hover"
                  layout
                  style={{ left: navPillX, width: navPillW }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, backgroundColor: navPillColor }}
                  exit={{ opacity: 0 }}
                  transition={{
                    layout: { type: "spring", stiffness: 500, damping: 34 },
                    opacity: { duration: 0.12 },
                    backgroundColor: { duration: 0.15 },
                  }}
                />
              )}
            </AnimatePresence>
            <button
              className="pill-nav-btn"
              aria-label="Messages"
              onMouseEnter={() => {
                hoverSound();
                setNavHover(0);
              }}
            >
              <HugeiconsIcon icon={BellIcon} size={20} strokeWidth={1.67} />
              <span className="pill-nav-dot" />
            </button>
            <button
              className="pill-nav-btn"
              aria-label="Chat"
              onMouseEnter={() => {
                hoverSound();
                setNavHover(1);
              }}
            >
              <HugeiconsIcon icon={BubbleChatIcon} size={20} strokeWidth={1.67} />
            </button>
            <button
              className="pill-nav-btn"
              aria-label="Documents"
              onMouseEnter={() => {
                hoverSound();
                setNavHover(2);
              }}
            >
              <HugeiconsIcon icon={File01Icon} size={20} strokeWidth={1.67} />
            </button>

            <motion.button
              className={`pill-nav-btn pill-nav-trigger ${
                menuOpen || selected ? "pill-nav-trigger--active" : ""
              }`}
              onClick={handleMenuClick}
              onMouseEnter={() => {
                hoverSound();
                setNavHover(3);
              }}
              animate={{ width: selected ? 68 : 48 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              aria-label="Menu"
            >
              {selectedItem ? (
                <div className="pill-nav-chip">
                  <div className="pill-nav-icon-mask">
                    <motion.div
                      key="selected"
                      className="pill-nav-icon-roll"
                      {...ROLL_IN}
                      transition={ROLL_TRANSITION}
                    >
                      <HugeiconsIcon
                        icon={selectedItem.Icon}
                        size={20}
                        strokeWidth={1.67}
                      />
                    </motion.div>
                  </div>
                  <motion.div
                    className="pill-nav-cross"
                    initial={{ scale: 1.9, opacity: 0, x: -14 }}
                    animate={{ scale: 1, opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <HugeiconsIcon
                      icon={Cancel01Icon}
                      size={12}
                      strokeWidth={1}
                    />
                  </motion.div>
                </div>
              ) : (
                <div className="pill-nav-icon-mask">
                  <AnimatePresence initial={false}>
                    {menuOpen ? (
                      <motion.div
                        key="close"
                        className="pill-nav-icon-roll"
                        {...ROLL_IN}
                        transition={ROLL_TRANSITION}
                      >
                        <HugeiconsIcon
                          icon={Cancel01Icon}
                          size={20}
                          strokeWidth={1.67}
                        />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="menu"
                        className="pill-nav-icon-roll"
                        {...ROLL_IN}
                        transition={ROLL_TRANSITION}
                      >
                        <HugeiconsIcon
                          icon={MenuIcon}
                          size={20}
                          strokeWidth={1.67}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.button>
          </div>
        </Liquid.Item>

        <AnimatePresence>
          {menuOpen && (
            <Liquid.Item morph={{ shape: true, contentBlur: 8, bounce: 0, speed: 1.2 }}>
              <motion.div
                className="pill-nav-panel"
                initial={{ ...DROPDOWN_CLOSED, transition: DROPDOWN_TRANSITION }}
                animate={{ ...DROPDOWN_OPEN, transition: DROPDOWN_TRANSITION }}
                exit={{
                  ...DROPDOWN_CLOSED,
                  opacity: 0,
                  transition: {
                    x: DROPDOWN_TRANSITION,
                    y: DROPDOWN_TRANSITION,
                    scale: DROPDOWN_TRANSITION,
                    opacity: { duration: 0.06, ease: "easeIn" },
                  },
                }}
              >
                <div
                  className={`pill-nav-rows ${menuOpen ? "" : "pill-nav-rows--closing"}`}
                  onMouseLeave={() => setRowHover(null)}
                >
                  <AnimatePresence>
                    {pillIndex != null && (
                      <motion.div
                        className="pill-nav-row-hover"
                        layout
                        style={{ top: pillTop }}
                        initial={{ opacity: 0 }}
                        animate={{
                          opacity: 1,
                          backgroundColor: pillSelected
                            ? "rgba(26, 26, 26, 0.9)"
                            : "rgba(255, 255, 255, 0.08)",
                        }}
                        exit={{ opacity: 0 }}
                        transition={{
                          layout: {
                            type: "spring",
                            stiffness: 500,
                            damping: 34,
                          },
                          backgroundColor: { duration: 0.2 },
                          opacity: { duration: 0.12 },
                        }}
                      />
                    )}
                  </AnimatePresence>
                  {MENU_ITEMS.map((item, i) => (
                    <motion.div
                      key={item.id}
                      className="pill-nav-row"
                      onClick={() => handleSelect(item.id)}
                      onMouseEnter={() => {
                        sounds.hoverSub(0.2);
                        setRowHover(i);
                      }}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        delay: 0.18 + i * 0.06,
                        duration: 0.3,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                    >
                      <HugeiconsIcon
                        icon={item.Icon}
                        size={20}
                        strokeWidth={1.67}
                      />
                      <span>{item.label}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </Liquid.Item>
          )}
        </AnimatePresence>
      </Liquid>
    </div>
  );
}

export default PillNav;
