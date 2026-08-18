import { useState } from "react";
import ShowcaseChrome from "../ShowcaseChrome/ShowcaseChrome.jsx";

function ComponentPage({ component }) {
    const [playKey, setPlayKey] = useState(0);
    const Cmp = component.Component;

    return (
        <div className="component-shell">
            <ShowcaseChrome onRefresh={() => setPlayKey((k) => k + 1)} />
            <section className="component-stage">
                <Cmp key={playKey} />
            </section>
        </div>
    );
}

export default ComponentPage;
