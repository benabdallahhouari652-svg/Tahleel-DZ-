/**
 * تحليل DZ — Charts Module
 * Pure Canvas charts: bar, pie, radar, comparison bar
 */

'use strict';

window.initCharts = function() {
  drawWeekChart();
  drawTagPieChart();
  drawHalfChart();
  drawRadarChart();
  drawCompareChart();
};

document.addEventListener('DOMContentLoaded', () => {
  // Draw dashboard charts on load
  setTimeout(() => {
    drawWeekChart();
    drawTagPieChart();
  }, 100);
});

// ── Helper ────────────────────────────────────────────────
function isDarkTheme() {
  return !document.body.classList.contains('light-theme');
}
function textColor() { return isDarkTheme() ? '#E6EDF3' : '#0D1117'; }
function mutedColor() { return isDarkTheme() ? '#8B949E' : '#57606A'; }
function gridColor() { return isDarkTheme() ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)'; }
function cardColor() { return isDarkTheme() ? '#1C2230' : '#FFFFFF'; }

// ── Week Bar Chart ────────────────────────────────────────
function drawWeekChart() {
  const canvas = document.getElementById('weekChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const data = [32, 47, 18, 65, 42, 88, 54];
  const labels = ['الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت','الأحد'];
  const pad = { top: 20, right: 10, bottom: 30, left: 30 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;
  const max = Math.max(...data) * 1.15;
  const barW = (chartW / data.length) * 0.6;
  const barGap = (chartW / data.length) * 0.4;

  ctx.clearRect(0, 0, W, H);

  // Grid lines
  ctx.strokeStyle = gridColor();
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + chartH - (i / 4) * chartH;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
    ctx.fillStyle = mutedColor();
    ctx.font = '9px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(Math.round((i / 4) * max), pad.left - 4, y + 3);
  }

  data.forEach((val, i) => {
    const x = pad.left + i * (barW + barGap) + barGap/2;
    const barH = (val / max) * chartH;
    const y = pad.top + chartH - barH;

    // Bar gradient
    const grad = ctx.createLinearGradient(0, y, 0, pad.top + chartH);
    grad.addColorStop(0, '#00D4FF');
    grad.addColorStop(1, 'rgba(0,212,255,.2)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x, y, barW, barH, [4, 4, 0, 0]) : ctx.rect(x, y, barW, barH);
    ctx.fill();

    // Value
    ctx.fillStyle = '#00D4FF';
    ctx.font = 'bold 9px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(val, x + barW/2, y - 4);

    // Label
    ctx.fillStyle = mutedColor();
    ctx.font = '8px Cairo, sans-serif';
    ctx.fillText(labels[i], x + barW/2, pad.top + chartH + 14);
  });
}

// ── Tag Pie Chart ─────────────────────────────────────────
function drawTagPieChart() {
  const canvas = document.getElementById('tagPieChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  const segments = [
    { label: 'هجوم', value: 38, color: '#00D4FF' },
    { label: 'دفاع', value: 29, color: '#FF6B6B' },
    { label: 'أخطاء', value: 18, color: '#FFD166' },
    { label: 'أهداف', value: 8, color: '#06D6A0' },
    { label: 'كرات ثابتة', value: 7, color: '#BD93F9' },
  ];

  const total = segments.reduce((s, d) => s + d.value, 0);
  const cx = W/2, cy = H/2 - 10, r = Math.min(W, H) * 0.36;

  ctx.clearRect(0, 0, W, H);

  let angle = -Math.PI / 2;
  segments.forEach(seg => {
    const slice = (seg.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, angle, angle + slice);
    ctx.closePath();
    ctx.fillStyle = seg.color;
    ctx.fill();
    ctx.strokeStyle = cardColor();
    ctx.lineWidth = 2;
    ctx.stroke();
    angle += slice;
  });

  // Center donut hole
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.55, 0, Math.PI*2);
  ctx.fillStyle = cardColor();
  ctx.fill();

  // Center label
  ctx.fillStyle = textColor();
  ctx.font = 'bold 16px Inter';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(total + '%', cx, cy - 4);
  ctx.font = '9px Cairo';
  ctx.fillStyle = mutedColor();
  ctx.fillText('توزيع', cx, cy + 12);

  // Legend
  const legend = document.getElementById('pieLegend');
  if (legend) {
    legend.innerHTML = segments.map(s => `
      <div style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--text-muted)">
        <span style="width:9px;height:9px;border-radius:2px;background:${s.color};flex-shrink:0"></span>
        ${s.label} <strong style="color:var(--text);margin-right:auto">${s.value}%</strong>
      </div>
    `).join('');
    legend.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:8px;';
  }
}

// ── Half-by-Half Bar Chart ────────────────────────────────
function drawHalfChart() {
  const canvas = document.getElementById('halfChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  const categories = ['هجوم', 'دفاع', 'تمرير', 'أخطاء', 'أهداف'];
  const first = [34, 47, 82, 10, 2];
  const second = [28, 52, 76, 8, 1];
  const colors = ['#00D4FF', '#FF6B6B', '#4ECDC4', '#FFD166', '#06D6A0'];

  const pad = { top: 20, right: 15, bottom: 40, left: 35 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;
  const max = Math.max(...first, ...second) * 1.2;
  const groupW = chartW / categories.length;
  const barW = groupW * 0.3;

  ctx.clearRect(0, 0, W, H);

  // Grid
  ctx.strokeStyle = gridColor();
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + chartH - (i/4) * chartH;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
    ctx.fillStyle = mutedColor();
    ctx.font = '9px Inter';
    ctx.textAlign = 'right';
    ctx.fillText(Math.round((i/4) * max), pad.left - 4, y + 3);
  }

  categories.forEach((cat, i) => {
    const groupX = pad.left + i * groupW + groupW * 0.1;

    // First half
    const h1 = (first[i] / max) * chartH;
    const y1 = pad.top + chartH - h1;
    ctx.fillStyle = colors[i];
    ctx.fillRect(groupX, y1, barW, h1);

    // Second half (lighter)
    const h2 = (second[i] / max) * chartH;
    const y2 = pad.top + chartH - h2;
    ctx.fillStyle = colors[i] + '88';
    ctx.fillRect(groupX + barW + 3, y2, barW, h2);

    // Label
    ctx.fillStyle = mutedColor();
    ctx.font = '9px Cairo';
    ctx.textAlign = 'center';
    ctx.fillText(cat, groupX + barW, pad.top + chartH + 14);
  });

  // Legend
  ctx.font = '9px Cairo';
  ctx.fillStyle = '#00D4FF';
  ctx.fillRect(pad.left, pad.top + chartH + 26, 8, 8);
  ctx.fillStyle = textColor();
  ctx.fillText('الشوط الأول', pad.left + 12, pad.top + chartH + 33);

  ctx.fillStyle = 'rgba(0,212,255,.5)';
  ctx.fillRect(pad.left + 80, pad.top + chartH + 26, 8, 8);
  ctx.fillStyle = textColor();
  ctx.fillText('الشوط الثاني', pad.left + 92, pad.top + chartH + 33);
}

// ── Radar Chart ───────────────────────────────────────────
function drawRadarChart() {
  const canvas = document.getElementById('radarChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  const metrics = [
    { label: 'الهجوم', value: 0.78 },
    { label: 'الدفاع', value: 0.65 },
    { label: 'التمرير', value: 0.84 },
    { label: 'التحكم', value: 0.70 },
    { label: 'الضغط', value: 0.72 },
    { label: 'الإنهاء', value: 0.60 },
  ];

  const n = metrics.length;
  const cx = W/2, cy = H/2 + 5;
  const r = Math.min(W, H) * 0.33;

  ctx.clearRect(0, 0, W, H);

  // Grid rings
  for (let ring = 1; ring <= 5; ring++) {
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      const x = cx + (r * ring/5) * Math.cos(angle);
      const y = cy + (r * ring/5) * Math.sin(angle);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = gridColor();
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Axes
  metrics.forEach((_, i) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
    ctx.strokeStyle = gridColor();
    ctx.lineWidth = 1;
    ctx.stroke();
  });

  // Data polygon
  ctx.beginPath();
  metrics.forEach((m, i) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    const x = cx + r * m.value * Math.cos(angle);
    const y = cy + r * m.value * Math.sin(angle);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = 'rgba(0,212,255,.2)';
  ctx.fill();
  ctx.strokeStyle = '#00D4FF';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Labels
  metrics.forEach((m, i) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    const labelR = r + 20;
    const x = cx + labelR * Math.cos(angle);
    const y = cy + labelR * Math.sin(angle);
    ctx.fillStyle = textColor();
    ctx.font = '10px Cairo';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(m.label, x, y);
  });
}

// ── Compare Chart ─────────────────────────────────────────
function drawCompareChart() {
  const canvas = document.getElementById('compareChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  const labels = ['هجمات', 'دقة التمرير', 'أهداف', 'الاستحواذ'];
  const A = [34, 84, 3, 62];
  const B = [27, 88, 1, 38];
  const maxVals = [50, 100, 5, 100];

  const pad = { top: 20, right: 15, bottom: 40, left: 35 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;
  const groupW = chartW / labels.length;
  const barW = groupW * 0.28;

  ctx.clearRect(0, 0, W, H);

  // Grid
  ctx.strokeStyle = gridColor();
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + chartH - (i/4) * chartH;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W-pad.right, y); ctx.stroke();
  }

  labels.forEach((label, i) => {
    const gx = pad.left + i * groupW + groupW * 0.07;

    const hA = (A[i] / maxVals[i]) * chartH;
    ctx.fillStyle = '#00D4FF';
    ctx.fillRect(gx, pad.top + chartH - hA, barW, hA);

    const hB = (B[i] / maxVals[i]) * chartH;
    ctx.fillStyle = '#FF6B6B';
    ctx.fillRect(gx + barW + 4, pad.top + chartH - hB, barW, hB);

    // Values
    ctx.font = 'bold 9px Inter';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#00D4FF';
    ctx.fillText(A[i], gx + barW/2, pad.top + chartH - hA - 4);
    ctx.fillStyle = '#FF6B6B';
    ctx.fillText(B[i], gx + barW*1.5 + 4, pad.top + chartH - hB - 4);

    ctx.fillStyle = mutedColor();
    ctx.font = '9px Cairo';
    ctx.fillText(label, gx + barW, pad.top + chartH + 14);
  });
}

// ── Re-render on theme change ──────────────────────────────
document.getElementById('themeToggle')?.addEventListener('click', () => {
  setTimeout(() => window.initCharts?.(), 100);
});
