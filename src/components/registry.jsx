import RevenueCard from "./RevenueCard/RevenueCard.jsx";
import ModelUsage from "./ModelUsage/ModelUsage.jsx";
import PillNav from "./PillNav/PillNav.jsx";
import TokenUsage from "./TokenUsage/TokenUsage.jsx";

export const COMPONENTS = [
    { id: "revenue-card", title: "Revenue Card", path: "/revenue-card", Component: RevenueCard },
    { id: "model-usage", title: "Model Usage", path: "/model-usage", Component: ModelUsage },
    { id: "pill-nav", title: "Pill Nav", path: "/pill-nav", Component: PillNav },
    { id: "token-usage", title: "Token Usage", path: "/token-usage", Component: TokenUsage },
];
