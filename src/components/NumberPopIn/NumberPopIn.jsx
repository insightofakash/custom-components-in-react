import "./NumberPopIn.css";

// Transitions.dev — Number pop-in (per-digit pop for any changing number).
// Replay by remounting with a new `key={value}` (see DraggableChart) — the
// ::both fill-mode + stagger on the last two digits replays on every change.
function NumberPopIn({ value = "" }) {
    const chars = String(value).split("");
    return (
        <span className="t-digit-group is-animating">
            {chars.map((ch, i) => (
                <span
                    key={`${value}-${i}`}
                    className="t-digit"
                    data-stagger={i > 0 ? i : undefined}
                >
                    {ch}
                </span>
            ))}
        </span>
    );
}

export default NumberPopIn;