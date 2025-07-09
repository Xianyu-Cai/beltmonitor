/**
 * 
 * @returns {String} Random color in hex format
 */
function GenerateRandomColor() {
    function hslToRgb(h, s, l) {
        let r, g, b;

        if (s === 0) {
            r = g = b = l; // achromatic
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1 / 6) return p + (q - p) * 6 * t;
                if (t < 1 / 2) return q;
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            };

            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
        }

        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }
    const h = Math.floor(Math.random() * 360); // Random hue
    const s = 90 + Math.random() * 10; // Saturation between 70% and 90%
    const l = 70 + Math.random() * 10; // Lightness between 50% and 60%
    const rgb = hslToRgb(h / 360, s / 100, l / 100);
    return `#${rgb.map(x => x.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * @param {HTMLElement} chartCanvas
 * @param {String[]} labels 
 * @param {{data: Array, label: String}[]} datasets
 */
function ThisChart(chartCanvas, labels, datasets) {
    const ctx = chartCanvas.getContext('2d');
    var chartDatasets = [];
    datasets.forEach(dataset => {
        const color = GenerateRandomColor();
        let gradientStroke = ctx.createLinearGradient(0, chartCanvas.height, 0, 0);
        gradientStroke.addColorStop(1, `${color}32`);
        gradientStroke.addColorStop(0.2, `${color}16`);
        gradientStroke.addColorStop(0, `${color}00`);
        chartDatasets.push({
            label: dataset.label,
            tension: 0.4,
            borderWidth: 0,
            pointRadius: 0,
            borderColor: color,
            borderWidth: 3,
            backgroundColor: gradientStroke,
            fill: true,
            data: dataset.data,
            maxBarThickness: 6,
        });
    });

    new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: chartDatasets,
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false,
                },
            },
            interaction: {
                intersect: false,
                mode: "index",
            },
            scales: {
                y: {
                    grid: {
                        drawBorder: false,
                        display: true,
                        drawOnChartArea: true,
                        drawTicks: false,
                        borderDash: [5, 5],
                    },
                    ticks: {
                        display: true,
                        padding: 10,
                        color: "#b2b9bf",
                        font: {
                            size: 11,
                            family: "Open Sans",
                            style: "normal",
                            lineHeight: 2,
                        },
                    },
                },
                x: {
                    grid: {
                        drawBorder: false,
                        display: false,
                        drawOnChartArea: false,
                        drawTicks: false,
                        borderDash: [5, 5],
                    },
                    ticks: {
                        display: true,
                        color: "#b2b9bf",
                        padding: 20,
                        font: {
                            size: 11,
                            family: "Open Sans",
                            style: "normal",
                            lineHeight: 2,
                        },
                    },
                },
            },
        },
    });
}