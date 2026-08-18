export function computeTooltipPosition({
    cursorX,
    cursorY,
    chartW,
    chartH,
    tooltipW,
    tooltipH,
    gap = 64,
}) {
    const left =
        cursorX < chartW / 2
            ? Math.min(Math.max(cursorX + gap, 10), Math.max(10, chartW - tooltipW - 10))
            : Math.max(10, cursorX - gap - tooltipW);
    let top = cursorY - gap - tooltipH;
    if (top < 6) {
        top = cursorY + gap;
    }
    top = Math.min(top, chartH - tooltipH - 6);
    return { left, top };
}
