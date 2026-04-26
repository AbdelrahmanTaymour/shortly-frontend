let _cachedChart = null;

export async function loadChartJs() {
    if (_cachedChart) return _cachedChart;

    // We only import what we actually use in the app
    const {
        Chart, LineController, LineElement, PointElement,
        LinearScale, CategoryScale, Filler, Tooltip
    } = await import('chart.js');

    Chart.register(
        LineController, LineElement, PointElement,
        LinearScale, CategoryScale, Filler, Tooltip
    );

    _cachedChart = Chart;
    return Chart;
}