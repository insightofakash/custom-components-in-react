import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { COMPONENTS } from "../registry.jsx";
import sounds from "../../lib/sounds.js";
import "./ComponentIndex.css";

const num = (i) => String(i + 1).padStart(2, "0");

function ComponentIndex() {
    return (
        <motion.div
            className="component-index"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
            <div className="component-index-inner">
                <div className="component-index-heading">
                    <h1 className="component-index-title type-title-2">
                        Components
                    </h1>
                    <p className="component-index-subtitle type-body-large">
                        A collection of custom components by Akash Dey
                    </p>
                </div>
                <div className="component-index-divider" />
                <ul className="component-index-list">
                    {COMPONENTS.map((c, i) => (
                        <motion.li
                            key={c.id}
                            className="component-index-item"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                                delay: 0.15 + i * 0.08,
                                duration: 0.4,
                                ease: [0.22, 1, 0.36, 1],
                            }}
                        >
                            <Link
                                className="component-index-link"
                                to={c.path}
                                onMouseEnter={() => sounds.hover()}
                                onClick={() => sounds.click()}
                            >
                                <span className="component-index-num type-body-large">
                                    {num(i)}
                                </span>
                                <span className="component-index-name type-body-large">
                                    {c.title}
                                </span>
                            </Link>
                        </motion.li>
                    ))}
                </ul>
            </div>
        </motion.div>
    );
}

export default ComponentIndex;
