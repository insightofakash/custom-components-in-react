import { Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import ComponentIndex from "./components/ComponentIndex/ComponentIndex.jsx";
import ComponentPage from "./components/ComponentPage/ComponentPage.jsx";
import { COMPONENTS } from "./components/registry.jsx";

function App() {
    return (
        <Routes>
            <Route path="/" element={<ComponentIndex />} />
            {COMPONENTS.map((c) => (
                <Route
                    key={c.id}
                    path={c.path}
                    element={<ComponentPage component={c} />}
                />
            ))}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default App;
