import "./App.css";
import RevenueCard from "./components/RevenueCard/RevenueCard.jsx";
import KpiScoreCard from "./components/KpiScoreCard/KpiScoreCard.jsx";

function App() {
    return (
        <div className="component-shell">
            <section className="component-stage">
                <RevenueCard />
            </section>
            <section className="component-stage">
                <KpiScoreCard />
            </section>
        </div>
    );
}

export default App;
