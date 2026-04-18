const fs = require('fs');
const path = require('path');

function ensureParent(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderBarChart(options) {
  const {
    title,
    labels,
    values,
    color = '#2563eb',
    width = 960,
    height = 420,
    ySuffix = '',
  } = options;

  const maxValue = Math.max(...values, 1);
  const chartHeight = 260;
  const chartWidth = width - 120;
  const barWidth = chartWidth / Math.max(values.length, 1) - 12;
  const originX = 80;
  const originY = 320;

  const bars = values
    .map((value, index) => {
      const x = originX + index * (barWidth + 12);
      const barHeight = (value / maxValue) * chartHeight;
      const y = originY - barHeight;
      const label = escapeXml(labels[index]);
      return `
        <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${color}" rx="6" />
        <text x="${x + barWidth / 2}" y="${originY + 18}" text-anchor="middle" font-size="11" fill="#1f2937">${label}</text>
        <text x="${x + barWidth / 2}" y="${y - 8}" text-anchor="middle" font-size="11" fill="#111827">${value}${ySuffix}</text>
      `;
    })
    .join('\n');

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#ffffff" />
  <text x="40" y="36" font-size="22" font-family="Arial, sans-serif" fill="#111827">${escapeXml(title)}</text>
  <line x1="${originX}" y1="${originY}" x2="${originX + chartWidth}" y2="${originY}" stroke="#9ca3af" stroke-width="1.5" />
  <line x1="${originX}" y1="${originY}" x2="${originX}" y2="${originY - chartHeight}" stroke="#9ca3af" stroke-width="1.5" />
  ${bars}
</svg>`.trim();
}

function renderLineChart(options) {
  const {
    title,
    points,
    color = '#0f766e',
    width = 960,
    height = 420,
    ySuffix = '',
  } = options;

  const values = points.map(point => point.value);
  const maxValue = Math.max(...values, 1);
  const minValue = Math.min(...values, 0);
  const chartHeight = 240;
  const chartWidth = width - 120;
  const originX = 80;
  const originY = 320;
  const scaleX = points.length > 1 ? chartWidth / (points.length - 1) : chartWidth;
  const scaleY = maxValue === minValue ? 1 : chartHeight / (maxValue - minValue);

  const polyline = points
    .map((point, index) => {
      const x = originX + index * scaleX;
      const y = originY - (point.value - minValue) * scaleY;
      return `${x},${y}`;
    })
    .join(' ');

  const labels = points
    .filter((_, index) => index === 0 || index === points.length - 1 || index % Math.max(Math.floor(points.length / 6), 1) === 0)
    .map((point, index) => {
      const pointIndex = points.findIndex(candidate => candidate.label === point.label && candidate.value === point.value);
      const x = originX + pointIndex * scaleX;
      return `<text x="${x}" y="${originY + 20}" text-anchor="middle" font-size="11" fill="#1f2937">${escapeXml(point.label)}</text>`;
    })
    .join('\n');

  const lastPoint = points[points.length - 1] || { value: 0 };

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#ffffff" />
  <text x="40" y="36" font-size="22" font-family="Arial, sans-serif" fill="#111827">${escapeXml(title)}</text>
  <line x1="${originX}" y1="${originY}" x2="${originX + chartWidth}" y2="${originY}" stroke="#9ca3af" stroke-width="1.5" />
  <line x1="${originX}" y1="${originY}" x2="${originX}" y2="${originY - chartHeight}" stroke="#9ca3af" stroke-width="1.5" />
  <polyline fill="none" stroke="${color}" stroke-width="3" points="${polyline}" />
  ${labels}
  <text x="${originX + chartWidth}" y="${originY - (lastPoint.value - minValue) * scaleY - 10}" text-anchor="end" font-size="12" fill="#111827">${lastPoint.value}${ySuffix}</text>
</svg>`.trim();
}

function writeChart(filePath, svg) {
  ensureParent(filePath);
  fs.writeFileSync(filePath, `${svg}\n`, 'utf8');
}

module.exports = {
  renderBarChart,
  renderLineChart,
  writeChart,
};

