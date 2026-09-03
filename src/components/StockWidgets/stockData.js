export const LARGE_PRICES = [
    205.0, 206.8, 205.4, 211.2, 216.8, 219.6, 215.4, 209.1, 202.8, 206.4, 204.1, 205.9, 209.4, 208.2, 211.1, 218.3, 217.6, 224.1, 222.8, 216.9, 221.5,
    219.3, 217.8, 223.4, 216.7, 209.6, 209.8, 209.1, 208.6, 207.2, 207.8, 206.4, 209.3, 216.2, 213.8, 221.7, 227.6, 233.4, 235.8,
];
export const UP_PRICES = LARGE_PRICES;
export const DOWN_PRICES = [
    1610.0, 1607.3, 1609.4, 1600.7, 1592.3, 1588.1, 1594.4, 1603.85, 1613.3, 1607.9, 1611.35, 1608.65, 1603.4, 1605.2, 1600.85, 1590.05, 1591.1, 1581.35, 1583.3, 1592.15, 1585.25,
    1588.55, 1590.8, 1582.4, 1592.45, 1603.1, 1602.8, 1603.85, 1604.6, 1606.7, 1605.8, 1607.9, 1603.55, 1593.2, 1596.8, 1584.95, 1576.1, 1567.4, 1563.8,
];

function ohlc(prices) {
    const open = prices[0];
    const high = Math.max(...prices);
    const low = Math.min(...prices);
    const current = prices[prices.length - 1];
    const change = Math.round((current - open) * 100) / 100;
    const pct = Math.round((change / open) * 10000) / 100;
    return { open, high, low, current, change, pct };
}

export const LARGE_OHLC = ohlc(LARGE_PRICES);
export const UP_OHLC = ohlc(UP_PRICES);
export const DOWN_OHLC = ohlc(DOWN_PRICES);
export const fmt = (v) => v.toFixed(2);
