import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon as HugeArrowLeft01Icon } from "@hugeicons/core-free-icons";
import sounds from "../../lib/sounds.js";
import "./ShowcaseChrome.css";

const BackIcon = () => (
    <HugeiconsIcon
        icon={HugeArrowLeft01Icon}
        size={16}
        strokeWidth={2}
    />
);

const isMac =
    typeof navigator !== "undefined" &&
    /Mac|iP(hone|ad|od)/.test(navigator.userAgent || "");

const HIDE_SHORTCUT = isMac ? "⌘ + U" : "Ctrl + U";
const REFRESH_SHORTCUT = isMac ? "⌘ + /" : "Ctrl + /";

function ShowcaseChrome({ onRefresh }) {
    const [hidden, setHidden] = useState(false);
    const navigate = useNavigate();
    const onRefreshRef = useRef(onRefresh);

    useEffect(() => {
        onRefreshRef.current = onRefresh;
    }, [onRefresh]);

    useEffect(() => {
        const onKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "u") {
                e.preventDefault();
                setHidden((v) => !v);
            } else if ((e.metaKey || e.ctrlKey) && e.key === "/") {
                e.preventDefault();
                onRefreshRef.current();
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

    return (
        <div
            className={`chrome ${hidden ? "chrome-hidden" : ""}`}
            aria-hidden={hidden}
        >
            <button
                type="button"
                className="chrome-btn chrome-back"
                onClick={() => {
                    sounds.click();
                    navigate("/");
                }}
            >
                <span className="chrome-btn-icon">
                    <BackIcon />
                </span>
                <span className="chrome-btn-label type-label">Back</span>
            </button>
            <div className="chrome-actions">
                <button
                    type="button"
                    className="chrome-btn chrome-refresh"
                    onClick={() => {
                        sounds.pop();
                        onRefresh();
                    }}
                    aria-label={`Replay component animations (${REFRESH_SHORTCUT})`}
                    title={`Replay animations (${REFRESH_SHORTCUT})`}
                >
                    <span className="chrome-btn-label type-label">Refresh</span>
                    <span className="chrome-kbd">
                        {isMac ? (
                            <>
                                <span className="chrome-kbd-sym">⌘</span>
                                <span>+</span>
                                <span>/</span>
                            </>
                        ) : (
                            "Ctrl + /"
                        )}
                    </span>
                </button>
                <button
                    type="button"
                    className="chrome-hint type-caption"
                    onClick={() => {
                        sounds.pop();
                        setHidden((v) => !v);
                    }}
                    title={HIDE_SHORTCUT}
                >
                    Hide
                    <span className="chrome-kbd">
                        {isMac ? (
                            <>
                                <span className="chrome-kbd-sym">⌘</span>
                                <span>+</span>
                                <span>U</span>
                            </>
                        ) : (
                            "Ctrl + U"
                        )}
                    </span>
                </button>
            </div>
        </div>
    );
}

export default ShowcaseChrome;
