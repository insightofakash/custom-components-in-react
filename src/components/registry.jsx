import RevenueCard from "./RevenueCard/RevenueCard.jsx";
import ModelUsage from "./ModelUsage/ModelUsage.jsx";
import PillNav from "./PillNav/PillNav.jsx";
import TokenUsage from "./TokenUsage/TokenUsage.jsx";
import TreeNav from "./TreeNav/index.js";
import ClusteringChart from "./ClusteringChart/ClusteringChart.jsx";
import UserSearch from "./UserSearch/UserSearch.jsx";
import StockWidgets from "./StockWidgets/StockWidgets.jsx";

export const COMPONENTS = [
    { id: "revenue-card", title: "Revenue Card", path: "/revenue-card", Component: RevenueCard },
    { id: "model-usage", title: "Model Usage", path: "/model-usage", Component: ModelUsage },
    { id: "pill-nav", title: "Pill Nav", path: "/pill-nav", Component: PillNav },
    { id: "token-usage", title: "Token Usage", path: "/token-usage", Component: TokenUsage },
    {
        id: "tree-nav",
        title: "Tree Nav",
        path: "/tree-nav",
        Component: TreeNav,
    },
    {
        id: "clustering-chart",
        title: "Customer Clusters",
        path: "/clustering-chart",
        Component: ClusteringChart,
    },
    {
        id: "user-search",
        title: "User Search",
        path: "/user-search",
        Component: UserSearch,
    },
    {
        id: "stock-widgets",
        title: "Stock Widgets",
        path: "/stock-widgets",
        Component: StockWidgets,
    },
];
