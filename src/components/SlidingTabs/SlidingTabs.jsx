import { useEffect, useRef, useState } from "react";

// Transitions.dev — Tabs sliding (React, self-contained)
// Drop into any React project — no extra CSS file needed.
// Local addition: an optional `onChange(index)` callback, fired after the tab
// switches, so the host component can react to the selected tab.

// ── Styles ──────────────────────────────────────────────
// Auto-injected on first import. Idempotent (guarded by
// the element id) and SSR-safe (no-ops without document).
const __TRANSITION_STYLES = `
:root {
  --tabs-dur: 250ms;
  --tabs-ease: cubic-bezier(0.22, 1, 0.36, 1);
  --tabs-text-muted: var(--t-muted);
  --tabs-text-active: var(--t-strong);
  --tabs-bar-bg: color-mix(in srgb, var(--t-strong) 6%, var(--t-bg));
  --tabs-pill-bg: var(--t-bg);
}

/* The bar is just a flex container with padding for the pill
   to sit inside. Tabs sit on z-index: 1, the pill on z-index: 0,
   so labels read above the pill background. */
.t-tabs {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px;
  border-radius: 48px;
  background: var(--tabs-bar-bg);
}
.t-tab {
  position: relative;
  appearance: none;
  border: 0;
  background: transparent;
  height: 30px;
  padding: 4px 12px;
  color: var(--tabs-text-muted);
  cursor: pointer;
  border-radius: 48px;
  z-index: 1;
  transition: color var(--tabs-dur) var(--tabs-ease);
}
.t-tab:not([aria-selected="true"]):hover,
.t-tab[aria-selected="true"] {
  color: var(--tabs-text-active);
}

/* The pill: width + transform are written inline by JS so
   the transition tweens between the previous and next
   measured positions. */
.t-tabs-pill {
  position: absolute;
  top: 3px;
  left: 0;
  height: 30px;
  width: 0;
  box-sizing: border-box;
  background: var(--tabs-pill-bg);
  border: 1px solid var(--t-border);
  border-radius: 48px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  transform: translateX(0);
  transition:
    transform var(--tabs-dur) var(--tabs-ease),
    width     var(--tabs-dur) var(--tabs-ease);
  will-change: transform, width;
  z-index: 0;
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .t-tabs-pill, .t-tab { transition: none !important; }
}
`;
if (typeof document !== "undefined" && !document.getElementById("transitions-p16")) {
  const __style = document.createElement("style");
  __style.id = "transitions-p16";
  __style.textContent = __TRANSITION_STYLES;
  document.head.appendChild(__style);
}

// Pair with the CSS from the CSS tab.
// The pill's transform + width are written inline by JS so the
// CSS transition tweens between the previous and next measured
// positions. We re-snap (no animation) on resize so a viewport
// change doesn't desync the pill from its tab.
export function SlidingTabs({ tabs, onChange }) {
  const rootRef = useRef(null);
  const pillRef = useRef(null);
  const tabRefs = useRef([]);
  const [active, setActive] = useState(0);

  const moveTo = (idx, animate) => {
    const tab = tabRefs.current[idx];
    const pill = pillRef.current;
    if (!tab || !pill) return;
    const left = tab.offsetLeft;
    const width = tab.offsetWidth;
    if (!animate) {
      const prev = pill.style.transition;
      pill.style.transition = "none";
      pill.style.transform = `translateX(${left}px)`;
      pill.style.width = `${width}px`;
      void pill.offsetWidth;
      pill.style.transition = prev;
    } else {
      pill.style.transform = `translateX(${left}px)`;
      pill.style.width = `${width}px`;
    }
  };

  // Snap (no transition) only on first paint and resize. NOT on tab change —
  // re-snapping here would cancel the slide one frame after the click.
  const activeRef = useRef(0);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => moveTo(activeRef.current, false));
    const onResize = () => moveTo(activeRef.current, false);
    window.addEventListener("resize", onResize);
    return () => {
      window.cancelAnimationFrame(id);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div ref={rootRef} className="t-tabs" role="tablist">
      <span ref={pillRef} className="t-tabs-pill" aria-hidden="true" />
      {tabs.map((label, i) => (
        <button
          key={label}
          ref={(el) => { tabRefs.current[i] = el; }}
          type="button"
          className="t-tab"
          role="tab"
          aria-selected={i === active}
          onClick={() => { setActive(i); moveTo(i, true); onChange?.(i); }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export default SlidingTabs;