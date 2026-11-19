/**
 * تحليل DZ — Official Match PDF Report Generator Module
 * Generates comprehensive multi-page printable & PDF reports with:
 * Cover, Match Metadata, KPI Badges, Charts, Tactical Board Pitch Snapshot,
 * Video Clips Breakdown, Coach Tactical Takeaways & Official Signatures.
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  initReportPdfGenerator();
});

function initReportPdfGenerator() {
  const exportBtn = document.getElementById('exportPdfBtn');
  const modal = document.getElementById('pdfReportModal');
  const closeBtn = document.getElementById('closePdfReportModal');
  const cancelBtn = document.getElementById('cancelPdfReportBtn');
  const printBtn = document.getElementById('generateAndPrintPdfBtn');
  const downloadHtmlBtn = document.getElementById('downloadHtmlReportBtn');

  // Trigger modal from Reports view
  exportBtn?.addEventListener('click', e => {
    e.preventDefault();
    openPdfReportModal();
  });

  // Trigger modal from Video Analyzer view
  document.getElementById('openPdfReportFromAnalyzerBtn')?.addEventListener('click', () => {
    openPdfReportModal();
  });

  [closeBtn, cancelBtn].forEach(b => {
    b?.addEventListener('click', () => {
      if (modal) modal.style.display = 'none';
    });
  });

  printBtn?.addEventListener('click', () => {
    generateAndPrintOfficialReport();
  });

  downloadHtmlBtn?.addEventListener('click', () => {
    downloadStandaloneHtmlReport();
  });
}

function openPdfReportModal() {
  const modal = document.getElementById('pdfReportModal');
  if (!modal) return;

  // Set default current date
  const dateInput = document.getElementById('rptMatchDate');
  if (dateInput && !dateInput.value) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
  }

  // Update clips count info in modal
  const clips = window.TrimmerState?.clips || [];
  const clipCountEl = document.getElementById('rptClipCountBadge');
  if (clipCountEl) {
    clipCountEl.textContent = `${clips.length} لقطة تكتيكية جاهزة للتضمين`;
  }

  modal.style.display = 'flex';
}

function getReportFormData() {
  return {
    compName: document.getElementById('rptCompetition')?.value.trim() || 'نهائي كأس الجزائر — 2026',
    matchDate: document.getElementById('rptMatchDate')?.value || new Date().toLocaleDateString('ar-DZ'),
    venue: document.getElementById('rptVenue')?.value.trim() || 'ملعب 5 جويلية 1962 — الجزائر',
    homeTeam: document.getElementById('rptHomeTeam')?.value.trim() || 'مولودية الجزائر',
    homeScore: document.getElementById('rptHomeScore')?.value.trim() || '2',
    awayTeam: document.getElementById('rptAwayTeam')?.value.trim() || 'شباب بلوزداد',
    awayScore: document.getElementById('rptAwayScore')?.value.trim() || '1',
    coachName: document.getElementById('rptCoachName')?.value.trim() || 'الكوتش: حسام الدين',
    analystName: document.getElementById('rptAnalystName')?.value.trim() || 'المحلل: بن عبد الله هواري',
    execSummary: document.getElementById('rptSummaryText')?.value.trim() || 'أظهر الفريق تنظيماً تكتيكياً عالياً في التحول الهجومي السريع مع ضغط متقدم فعال في الثلث الهجومي. يجب التركيز في الشوط الثاني على تضييق المساحات بين الخطوط وإحكام التغطية العكسية عند الكرات الثابتة.',
    includeCover: document.getElementById('rptIncCover')?.checked ?? true,
    includeKpis: document.getElementById('rptIncKpis')?.checked ?? true,
    includeCharts: document.getElementById('rptIncCharts')?.checked ?? true,
    includeTactical: document.getElementById('rptIncTactical')?.checked ?? true,
    includeHeatmap: document.getElementById('rptIncHeatmap')?.checked ?? true,
    includeClips: document.getElementById('rptIncClips')?.checked ?? true,
    includeRecommendations: document.getElementById('rptIncNotes')?.checked ?? true,
    includeSignatures: document.getElementById('rptIncSignatures')?.checked ?? true
  };
}

function captureCanvasImage(canvasId) {
  try {
    const canvas = document.getElementById(canvasId);
    if (canvas && canvas.width > 0 && canvas.height > 0) {
      return canvas.toDataURL('image/png');
    }
  } catch (err) {
    console.warn(`Could not capture canvas ${canvasId}:`, err);
  }
  return null;
}

function buildOfficialReportHtml(data) {
  const radarImg = captureCanvasImage('radarChart');
  const halfImg = captureCanvasImage('halfChart');
  const pitchImg = captureCanvasImage('pitchCanvas');
  const heatmapImg = captureCanvasImage('heatmapCanvas');
  const clips = window.TrimmerState?.clips || [];
  const homeLogo = window.SquadState?.homeClub?.logo;
  const awayLogo = window.SquadState?.awayClub?.logo;
  const squadPlayers = window.SquadState?.players || [];

  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>تقرير التحليل الفني — ${escapeHtml(data.homeTeam)} vs ${escapeHtml(data.awayTeam)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 10mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
    }
    body {
      background: #ffffff;
      color: #0f172a;
      line-height: 1.5;
      font-size: 11pt;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .report-page {
      page-break-after: always;
      position: relative;
      padding-bottom: 30px;
    }
    .report-page:last-child {
      page-break-after: avoid;
    }

    /* Header Bar */
    .rep-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 3px solid #00D4FF;
      padding-bottom: 10px;
      margin-bottom: 16px;
    }
    .rep-brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .rep-logo-pill {
      background: #0f172a;
      color: #00D4FF;
      font-size: 16pt;
      font-weight: 900;
      padding: 4px 12px;
      border-radius: 6px;
      border: 1px solid #00D4FF;
    }
    .rep-brand-text h1 {
      font-size: 14pt;
      font-weight: 800;
      color: #0f172a;
    }
    .rep-brand-text p {
      font-size: 8.5pt;
      color: #64748b;
      font-weight: 600;
    }
    .rep-doc-meta {
      text-align: left;
      font-size: 8.5pt;
      color: #475569;
    }

    /* Match Hero Scoreboard */
    .match-scoreboard {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #ffffff;
      border-radius: 10px;
      padding: 16px 20px;
      margin-bottom: 18px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: relative;
      overflow: hidden;
    }
    .match-scoreboard::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; height: 3px;
      background: linear-gradient(90deg, #00D4FF, #10B981, #00D4FF);
    }
    .team-block {
      text-align: center;
      flex: 1;
    }
    .team-badge {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: rgba(255,255,255,0.1);
      border: 2px solid #00D4FF;
      margin: 0 auto 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18pt;
    }
    .team-name {
      font-size: 13pt;
      font-weight: 800;
      color: #ffffff;
    }
    .score-block {
      text-align: center;
      padding: 0 20px;
    }
    .score-val {
      font-size: 32pt;
      font-weight: 900;
      color: #00D4FF;
      letter-spacing: 4px;
      line-height: 1;
    }
    .match-comp-pill {
      display: inline-block;
      background: rgba(0, 212, 255, 0.2);
      color: #00D4FF;
      font-size: 8pt;
      font-weight: 700;
      padding: 2px 10px;
      border-radius: 12px;
      margin-top: 6px;
    }
    .match-subtext {
      font-size: 8pt;
      color: #94a3b8;
      margin-top: 4px;
    }

    /* Section Cards */
    .rep-section {
      margin-bottom: 16px;
    }
    .rep-section-title {
      font-size: 11pt;
      font-weight: 800;
      color: #0f172a;
      border-right: 4px solid #00D4FF;
      padding-right: 8px;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* KPI Grid */
    .kpi-row {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 8px;
      margin-bottom: 16px;
    }
    .kpi-item {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 8px;
      text-align: center;
    }
    .kpi-title { font-size: 7.5pt; color: #64748b; font-weight: 600; margin-bottom: 2px; }
    .kpi-num { font-size: 13pt; font-weight: 800; color: #0f172a; }
    .kpi-item.accent .kpi-num { color: #0284c7; }

    /* Summary Box */
    .summary-box {
      background: #f0fdf4;
      border-right: 4px solid #10b981;
      padding: 10px 14px;
      border-radius: 6px;
      font-size: 9.5pt;
      color: #1e293b;
      margin-bottom: 16px;
      line-height: 1.6;
    }

    /* Charts Layout */
    .charts-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 16px;
    }
    .chart-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px;
      text-align: center;
    }
    .chart-box h4 { font-size: 9.5pt; color: #334155; margin-bottom: 8px; font-weight: 700; }
    .chart-box img { max-width: 100%; height: 180px; object-fit: contain; }

    /* Tactical Board Page */
    .tac-pitch-box {
      background: #0f172a;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 8px;
      text-align: center;
      margin-bottom: 12px;
    }
    .tac-pitch-box img {
      max-width: 100%;
      height: 380px;
      object-fit: contain;
      border-radius: 6px;
    }

    /* Clips Breakdown Table */
    .clips-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      font-size: 9pt;
    }
    .clips-table th {
      background: #0f172a;
      color: #ffffff;
      padding: 8px 10px;
      text-align: right;
      font-weight: 700;
      font-size: 8.5pt;
    }
    .clips-table td {
      padding: 8px 10px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: middle;
    }
    .clips-table tr:nth-child(even) td {
      background: #f8fafc;
    }
    .clip-tag-badge {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 7.5pt;
      font-weight: 700;
    }
    .clip-tag-attack { background: #e0f2fe; color: #0284c7; }
    .clip-tag-defense { background: #fee2e2; color: #dc2626; }
    .clip-tag-goal { background: #dcfce7; color: #16a34a; }
    .clip-tag-foul { background: #fef3c7; color: #d97706; }

    /* Recommendations & Takeaways */
    .recom-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 8px;
    }
    .recom-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 12px;
      font-size: 9pt;
    }
    .recom-badge {
      background: #00D4FF;
      color: #0f172a;
      font-size: 8pt;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 4px;
      flex-shrink: 0;
    }

    /* Signatures Section */
    .sig-section {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      margin-top: 24px;
      padding-top: 14px;
      border-top: 2px dashed #cbd5e1;
    }
    .sig-box {
      flex: 1;
      text-align: center;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px;
    }
    .sig-title { font-size: 8.5pt; color: #64748b; font-weight: 700; margin-bottom: 4px; }
    .sig-name { font-size: 10pt; font-weight: 800; color: #0f172a; margin-bottom: 25px; }
    .sig-line { border-bottom: 1px solid #94a3b8; width: 80%; margin: 0 auto 4px; }
    .sig-caption { font-size: 7.5pt; color: #94a3b8; }

    /* Footer */
    .rep-footer {
      position: absolute;
      bottom: 0; left: 0; right: 0;
      display: flex;
      justify-content: space-between;
      font-size: 7.5pt;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      padding-top: 6px;
    }
  </style>
</head>
<body>

  <!-- ==================== PAGE 1: EXECUTIVE & STATS ==================== -->
  <div class="report-page">
    <div class="rep-header">
      <div class="rep-brand">
        <div class="rep-logo-pill">🎯 تحليل DZ</div>
        <div class="rep-brand-text">
          <h1>تقرير التحليل الفني والإحصائي للمباراة</h1>
          <p>منصة تحليل الفيديو الرياضي الاحترافية — الاتحاد الجزائري والأندية المحترفة</p>
        </div>
      </div>
      <div class="rep-doc-meta">
        <div><strong>التاريخ:</strong> ${escapeHtml(data.matchDate)}</div>
        <div><strong>المحلل:</strong> ${escapeHtml(data.analystName)}</div>
      </div>
    </div>

    <!-- Scoreboard Hero -->
    <div class="match-scoreboard">
      <div class="team-block">
        <div class="team-badge" style="overflow:hidden; background:#0f172a;">
          ${homeLogo ? `<img src="${homeLogo}" alt="Logo" style="width:100%; height:100%; object-fit:contain;">` : '⚽'}
        </div>
        <div class="team-name">${escapeHtml(data.homeTeam)}</div>
      </div>
      <div class="score-block">
        <div class="score-val">${escapeHtml(data.homeScore)} - ${escapeHtml(data.awayScore)}</div>
        <div class="match-comp-pill">${escapeHtml(data.compName)}</div>
        <div class="match-subtext">📍 ${escapeHtml(data.venue)}</div>
      </div>
      <div class="team-block">
        <div class="team-badge" style="overflow:hidden; background:#0f172a;">
          ${awayLogo ? `<img src="${awayLogo}" alt="Logo" style="width:100%; height:100%; object-fit:contain;">` : '🛡️'}
        </div>
        <div class="team-name">${escapeHtml(data.awayTeam)}</div>
      </div>
    </div>

    <!-- KPIs -->
    ${data.includeKpis ? `
    <div class="kpi-row">
      <div class="kpi-item accent">
        <div class="kpi-title">إجمالي التاغات</div>
        <div class="kpi-num">247</div>
      </div>
      <div class="kpi-item">
        <div class="kpi-title">نسبة الاستحواذ</div>
        <div class="kpi-num">62%</div>
      </div>
      <div class="kpi-item">
        <div class="kpi-title">دقة التمريرات</div>
        <div class="kpi-num">84%</div>
      </div>
      <div class="kpi-item accent">
        <div class="kpi-title">الأهداف</div>
        <div class="kpi-num">${escapeHtml(data.homeScore)}</div>
      </div>
      <div class="kpi-item">
        <div class="kpi-title">الأخطاء</div>
        <div class="kpi-num">14</div>
      </div>
      <div class="kpi-item accent">
        <div class="kpi-title">الأهداف المتوقعة xG</div>
        <div class="kpi-num">2.35</div>
      </div>
    </div>
    ` : ''}

    <!-- Executive Summary -->
    <div class="rep-section">
      <div class="rep-section-title">📋 الملخص التكتيكي التنفيذي للمدرب</div>
      <div class="summary-box">
        <strong>خلاصة الأداء: </strong>${escapeHtml(data.execSummary)}
      </div>
    </div>

    <!-- Charts Section -->
    ${data.includeCharts && (halfImg || radarImg) ? `
    <div class="rep-section">
      <div class="rep-section-title">📊 الرسوم البيانية ومؤشرات الأداء</div>
      <div class="charts-grid">
        ${halfImg ? `
        <div class="chart-box">
          <h4>توزيع الأحداث والضغط حسب الشوطين</h4>
          <img src="${halfImg}" alt="أحداث الشوطين">
        </div>
        ` : ''}
        ${radarImg ? `
        <div class="chart-box">
          <h4>مخطط رادار الأداء الشامل (Radar Chart)</h4>
          <img src="${radarImg}" alt="رادار الأداء">
        </div>
        ` : ''}
      </div>
    </div>
    ` : ''}

    <div class="rep-footer">
      <span>🎯 تقرير رسمي صادر عن منصة تحليل DZ (Tahleel DZ Pro)</span>
      <span>صفحة 1 من ${data.includeTactical || data.includeClips ? '2' : '1'}</span>
    </div>
  </div>

  <!-- ==================== PAGE 2: TACTICAL & CLIPS ==================== -->
  ${(data.includeTactical || data.includeClips) ? `
  <div class="report-page">
    <div class="rep-header">
      <div class="rep-brand">
        <div class="rep-logo-pill">🎯 تحليل DZ</div>
        <div class="rep-brand-text">
          <h1>التشكيلة التكتيكية وتفاصيل اللقطات المفتاحية</h1>
          <p>${escapeHtml(data.homeTeam)} vs ${escapeHtml(data.awayTeam)} — ${escapeHtml(data.compName)}</p>
        </div>
      </div>
      <div class="rep-doc-meta">
        <div><strong>تاريخ الطباعة:</strong> ${new Date().toLocaleDateString('ar-DZ')}</div>
      </div>
    </div>

    <!-- Tactical Board Snapshot -->
    ${data.includeTactical && pitchImg ? `
    <div class="rep-section">
      <div class="rep-section-title">⚽ الرسم التكتيكي وتمركز اللاعبين والمعدات</div>
      <div class="tac-pitch-box">
        <img src="${pitchImg}" alt="اللوحة التكتيكية">
      </div>
    </div>
    ` : ''}

    <!-- Heatmap & Shotmap Snapshot -->
    ${data.includeHeatmap && heatmapImg ? `
    <div class="rep-section">
      <div class="rep-section-title">🔥 التحليل الحراري ومناطق الانتشار والتسديدات (Heatmap & Shot Analysis)</div>
      <div class="tac-pitch-box">
        <img src="${heatmapImg}" alt="التحليل الحراري">
      </div>
      <div style="font-size:8pt; color:#64748b; margin-top:4px; text-align:center;">
        توزيع النشاط الميداني وكثافة التواجد ومسارات الضغط والتسديد (Opta / Wyscout Analytics Mode)
      </div>
    </div>
    ` : ''}

    <!-- Squad Lineup Section -->
    ${squadPlayers.length > 0 ? `
    <div class="rep-section">
      <div class="rep-section-title">👥 قائمة لاعبي المباراة (${squadPlayers.filter(p => p.starter).length} أساسي · ${squadPlayers.filter(p => !p.starter).length} بديل)</div>
      <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top:6px;">
        ${squadPlayers.map(p => `
          <div style="display:flex; align-items:center; gap:8px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:4px 8px; font-size:8pt;">
            <span style="background:${p.starter ? '#10b981' : '#64748b'}; color:#fff; font-weight:800; font-size:7pt; padding:1px 5px; border-radius:3px;">#${p.num}</span>
            <div style="flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
              <strong style="color:#0f172a;">${escapeHtml(p.name)}</strong>
              <span style="color:#64748b; font-size:7pt; display:block;">${p.posName || p.pos} · ${p.foot || 'يمنى'}</span>
            </div>
            <span style="font-size:6.5pt; font-weight:700; color:${p.starter ? '#10b981' : '#94a3b8'};">${p.starter ? 'أساسي' : 'بديل'}</span>
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}

    <!-- Key Video Clips Breakdown -->
    ${data.includeClips && clips.length > 0 ? `
    <div class="rep-section">
      <div class="rep-section-title">✂️ سجل اللقطات التكتيكية المقصوصة (${clips.length} لقطة)</div>
      <table class="clips-table">
        <thead>
          <tr>
            <th style="width:40px;">#</th>
            <th>عنوان اللقطة التكتيكية</th>
            <th>النوع</th>
            <th>التوقيت</th>
            <th>المدة</th>
            <th>التوجيه الفني للمدرب</th>
            <th>التقييم</th>
          </tr>
        </thead>
        <tbody>
          ${clips.map((c, i) => {
            const dur = (c.end - c.start).toFixed(1);
            const tagCls = c.tag === 'هدف' ? 'clip-tag-goal' : (c.tag === 'دفاع' ? 'clip-tag-defense' : (c.tag === 'أخطاء' ? 'clip-tag-foul' : 'clip-tag-attack'));
            return `
            <tr>
              <td><strong>${i + 1}</strong></td>
              <td><strong>${escapeHtml(c.title)}</strong></td>
              <td><span class="clip-tag-badge ${tagCls}">${escapeHtml(c.tag || 'تحليل')}</span></td>
              <td style="font-family:monospace; color:#0284c7;">${formatSec(c.start)} ➔ ${formatSec(c.end)}</td>
              <td>${dur}ث</td>
              <td style="color:#334155;">${escapeHtml(c.note || 'موقف تكتيكي للمراجعة')}</td>
              <td style="color:#f59e0b;">${'★'.repeat(c.rating || 5)}</td>
            </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    <!-- Recommendations -->
    ${data.includeRecommendations ? `
    <div class="rep-section">
      <div class="rep-section-title">💡 توصيات الطاقم الفني للمباراة القادمة</div>
      <ul class="recom-list">
        <li class="recom-item">
          <span class="recom-badge">توصية 1</span>
          <span>مواصلة الضغط العالي الموجه على قلبي دفاع المنافس لاسترجاع الكرة في مناطق الخطورة.</span>
        </li>
        <li class="recom-item">
          <span class="recom-badge">توصية 2</span>
          <span>تأمين التغطية العكسية للظهيرين عند التحول الدفاعي وسرعة الارتداد خلف خط الكرة.</span>
        </li>
        <li class="recom-item">
          <span class="recom-badge">توصية 3</span>
          <span>استغلال مهارة الجناحين في عزل المدافع (1 ضد 1) ولعب العرضيات الساقطة على القائم الثاني.</span>
        </li>
      </ul>
    </div>
    ` : ''}

    <!-- Official Signatures -->
    ${data.includeSignatures ? `
    <div class="sig-section">
      <div class="sig-box">
        <div class="sig-title">اعتماد المدير الفني (Head Coach)</div>
        <div class="sig-name">${escapeHtml(data.coachName)}</div>
        <div class="sig-line"></div>
        <div class="sig-caption">التوقيع والتاريخ</div>
      </div>
      <div class="sig-box">
        <div class="sig-title">رئيس قسم تحليل الأداء الرياضي</div>
        <div class="sig-name">${escapeHtml(data.analystName)}</div>
        <div class="sig-line"></div>
        <div class="sig-caption">التوقيع والاعتماد</div>
      </div>
      <div class="sig-box">
        <div class="sig-title">ختم النادي / الهيئة الرياضية</div>
        <div class="sig-name" style="color:#94a3b8;">[ الختم الرسمي ]</div>
        <div class="sig-line"></div>
        <div class="sig-caption">تأشيرة الإدارة الفنية</div>
      </div>
    </div>
    ` : ''}

    <div class="rep-footer">
      <span>🎯 تقرير رسمي صادر عن منصة تحليل DZ (Tahleel DZ Pro)</span>
      <span>صفحة 2 من 2</span>
    </div>
  </div>
  ` : ''}

</body>
</html>
  `;
}

function generateAndPrintOfficialReport() {
  const data = getReportFormData();
  const html = buildOfficialReportHtml(data);

  // Open dedicated print window
  const printWin = window.open('', '_blank', 'width=1000,height=800');
  if (!printWin) {
    showToast('يرجى السماح بالنوافذ المنبثقة لطباعة التقرير', 'error');
    return;
  }

  printWin.document.open();
  printWin.document.write(html);
  printWin.document.close();

  // Wait for images and fonts to render then trigger print dialog
  printWin.onload = () => {
    setTimeout(() => {
      printWin.focus();
      printWin.print();
    }, 400);
  };

  showToast('📄 جاري تجهيز تقرير المباراة الرسمي للطباعة وتصدير PDF...', 'success');
  const modal = document.getElementById('pdfReportModal');
  if (modal) modal.style.display = 'none';
}

function downloadStandaloneHtmlReport() {
  const data = getReportFormData();
  const html = buildOfficialReportHtml(data);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const a = document.createElement('a');
  const safeName = `${data.homeTeam}_vs_${data.awayTeam}_Match_Report`.replace(/\s+/g, '_');
  a.download = `Tahleel_${safeName}_${Date.now()}.html`;
  a.href = URL.createObjectURL(blob);
  a.click();
  showToast('📥 تم تنزيل وثيقة التقرير الفني الشاملة بنجاح!', 'success');
  const modal = document.getElementById('pdfReportModal');
  if (modal) modal.style.display = 'none';
}

function formatSec(sec) {
  if (isNaN(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
