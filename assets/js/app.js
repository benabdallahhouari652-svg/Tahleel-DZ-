/**
 * تحليل DZ — Core Application Logic
 * Navigation, State Management, Toasts, Modal, Shortcuts
 */

'use strict';

function readStoredValue(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function readStoredArray(key) {
  const value = readStoredValue(key, []);
  return Array.isArray(value) ? value.filter(item => item && typeof item === 'object') : [];
}

function writeStoredValue(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    showToast('تعذّر الحفظ في المتصفح؛ التغييرات متاحة في هذه الصفحة فقط', 'error');
  }
}

function getStoredTheme() {
  try { return localStorage.getItem('spa-theme') || 'dark'; }
  catch { return 'dark'; }
}

// ── Global App State ──────────────────────────────────────
window.AppState = {
  currentView: 'dashboard',
  theme: getStoredTheme(),
  tags: readStoredArray('spa-tags'),
  sessions: readStoredArray('spa-sessions'),
  tagTypes: readStoredValue('spa-tagTypes', null) || getDefaultTagTypes(),
  stats: {
    matches: 0,
    totalTags: 0,
    clips: 0
  }
};

// ── Default Tag Types (Sport configs) ────────────────────
function getDefaultTagTypes() {
  return {
    soccer: [
      { id: 'attack',   label: 'هجمة',       color: '#00D4FF', hotkey: 'A', category: 'attack' },
      { id: 'counter',  label: 'هجمة مضادة', color: '#0099BB', hotkey: 'C', category: 'attack' },
      { id: 'pass',     label: 'تمريرة',      color: '#4ECDC4', hotkey: 'P', category: 'attack' },
      { id: 'shot',     label: 'تسديدة',      color: '#45B7D1', hotkey: 'S', category: 'attack' },
      { id: 'goal',     label: 'هدف',         color: '#06D6A0', hotkey: 'G', category: 'goal' },
      { id: 'defend',   label: 'دفاع',        color: '#FF6B6B', hotkey: 'D', category: 'defense' },
      { id: 'press',    label: 'ضغط',         color: '#FF4444', hotkey: 'X', category: 'defense' },
      { id: 'intercept',label: 'اعتراض',      color: '#FF8C42', hotkey: 'I', category: 'defense' },
      { id: 'foul',     label: 'خطأ',         color: '#FFD166', hotkey: 'F', category: 'foul' },
      { id: 'yellow',   label: 'بطاقة صفراء', color: '#FFC300', hotkey: 'Y', category: 'foul' },
      { id: 'corner',   label: 'ركنية',       color: '#BD93F9', hotkey: 'R', category: 'set' },
      { id: 'freekick', label: 'ركلة حرة',    color: '#9B59B6', hotkey: 'K', category: 'set' },
    ],
    basketball: [
      { id: '2pt',      label: 'سلة 2',       color: '#00D4FF', hotkey: 'T', category: 'attack' },
      { id: '3pt',      label: 'سلة 3',       color: '#06D6A0', hotkey: 'H', category: 'attack' },
      { id: 'assist',   label: 'تمريرة حاسمة',color: '#45B7D1', hotkey: 'A', category: 'attack' },
      { id: 'rebound',  label: 'ارتداد',      color: '#FF8C42', hotkey: 'R', category: 'defense' },
      { id: 'block',    label: 'حجب',         color: '#FF6B6B', hotkey: 'B', category: 'defense' },
      { id: 'steal',    label: 'سرقة',        color: '#FFD166', hotkey: 'S', category: 'defense' },
      { id: 'turnover', label: 'خسارة كرة',   color: '#BD93F9', hotkey: 'V', category: 'foul' },
      { id: 'foul',     label: 'خطأ',         color: '#FF4444', hotkey: 'F', category: 'foul' },
    ],
    handball: [
      { id: 'goal',     label: 'هدف',         color: '#06D6A0', hotkey: 'G', category: 'goal' },
      { id: 'shot',     label: 'تسديدة',      color: '#00D4FF', hotkey: 'S', category: 'attack' },
      { id: 'penalty',  label: 'ضربة جزاء',   color: '#FF6B6B', hotkey: 'P', category: 'set' },
      { id: 'save',     label: 'إنقاذ حارس',  color: '#45B7D1', hotkey: 'V', category: 'defense' },
      { id: 'foul',     label: 'خطأ',         color: '#FFD166', hotkey: 'F', category: 'foul' },
      { id: '7m',       label: 'سبعة أمتار',  color: '#FF8C42', hotkey: 'M', category: 'set' },
    ],
    volleyball: [
      { id: 'spike',    label: 'سمش',         color: '#00D4FF', hotkey: 'K', category: 'attack' },
      { id: 'serve',    label: 'إرسال',       color: '#06D6A0', hotkey: 'S', category: 'attack' },
      { id: 'block',    label: 'حجب',         color: '#FF6B6B', hotkey: 'B', category: 'defense' },
      { id: 'dig',      label: 'استقبال',     color: '#45B7D1', hotkey: 'D', category: 'defense' },
      { id: 'set',      label: 'إعداد',       color: '#BD93F9', hotkey: 'E', category: 'attack' },
      { id: 'error',    label: 'خطأ',         color: '#FFD166', hotkey: 'F', category: 'foul' },
    ],
    rugby: [
      { id: 'try',      label: 'تري',         color: '#06D6A0', hotkey: 'T', category: 'goal' },
      { id: 'kick',     label: 'ركلة',        color: '#00D4FF', hotkey: 'K', category: 'attack' },
      { id: 'scrum',    label: 'سكرم',        color: '#FF8C42', hotkey: 'S', category: 'set' },
      { id: 'lineout',  label: 'لاين آوت',    color: '#BD93F9', hotkey: 'L', category: 'set' },
      { id: 'tackle',   label: 'تاكل',        color: '#FF6B6B', hotkey: 'X', category: 'defense' },
      { id: 'penalty',  label: 'عقوبة',       color: '#FFD166', hotkey: 'P', category: 'foul' },
    ]
  };
}

// ── DOM Ready ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initNavigation();
  initDashboardStats();
  initImportModal();
  initKeyboardShortcuts();
  renderTagPanel(document.getElementById('sportSelect')?.value || 'soccer');
  AppState.tags.filter(tag => !tag.live && Number.isFinite(tag.time)).forEach(addTagToLog);
  refreshTagCount();
  updateDashboardCounters();
});

// ── Theme ─────────────────────────────────────────────────
function initTheme() {
  if (AppState.theme === 'light') {
    document.body.classList.add('light-theme');
  }
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
}

function toggleTheme() {
  const isLight = document.body.classList.toggle('light-theme');
  AppState.theme = isLight ? 'light' : 'dark';
  localStorage.setItem('spa-theme', AppState.theme);
  showToast('تم تبديل الثيم', 'info');
}

// ── Navigation ────────────────────────────────────────────
function initNavigation() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchView(btn.dataset.view);
    });
  });
}

window.switchView = function(viewId) {
  // Update tabs
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.view === viewId);
  });

  // Update views
  document.querySelectorAll('.view').forEach(v => {
    v.classList.toggle('active', v.id === `view-${viewId}`);
  });

  AppState.currentView = viewId;

  // Trigger view-specific init
  if (viewId === 'dashboard') updateDashboardCounters();
  if (viewId === 'reports') initReports();
  if (viewId === 'tagging') initTaggingView();
  if (viewId === 'heatmap' && window.HeatmapStudio) {
    window.HeatmapStudio.populatePlayerSelect();
    window.HeatmapStudio.render();
  }
  if (viewId === 'ai' && window.AiAssistant) {
    window.AiAssistant.renderQuickScorecards();
  }
};

// ── Dashboard Counters ────────────────────────────────────
function updateDashboardCounters() {
  const tags = AppState.tags;
  document.getElementById('statMatches').textContent = AppState.sessions.length || 3;
  document.getElementById('statTags').textContent = tags.length + 247;
  document.getElementById('statClips').textContent = Math.floor((tags.length + 247) / 20);
}

// ── Tag Panel Renderer ────────────────────────────────────
function renderTagPanel(sport) {
  const types = AppState.tagTypes[sport] || AppState.tagTypes.soccer;
  const grid = document.getElementById('tagGrid');
  if (!grid) return;

  renderTagButtons(grid, types, recordTag);
}

function renderTagButtons(container, types, handler) {
  container.replaceChildren(...types.map(tag => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tag-btn';
    button.dataset.id = tag.id;
    button.style.background = tag.color;
    const key = document.createElement('span');
    key.className = 'hotkey';
    key.textContent = tag.hotkey;
    button.append(key, document.createTextNode(tag.label));
    button.addEventListener('click', () => handler(tag.id, tag.label, tag.color));
    return button;
  }));
}

function refreshTagCount() {
  const badge = document.getElementById('tagCount');
  if (badge) badge.textContent = AppState.tags.length;
}

// ── Record Tag ────────────────────────────────────────────
window.recordTag = function(id, label, color) {
  const video = document.getElementById('mainVideo');
  const time = video && video.readyState >= 1 ? video.currentTime : 0;
  const timeStr = formatTime(time);

  const tag = { id, label, color, time, timeStr, ts: Date.now() };
  AppState.tags.push(tag);
  writeStoredValue('spa-tags', AppState.tags);

  // Update log
  addTagToLog(tag);

  refreshTagCount();

  // Add to timeline if video is loaded
  addTagToTimeline(tag, time, video?.duration);

  // Feedback
  flashTagButton(id);
  showToast(`✓ ${label} — ${timeStr}`, 'success');
};

function addTagToLog(tag) {
  const list = document.getElementById('tagLogList');
  if (!list) return;
  const empty = list.querySelector('.tag-log__empty');
  if (empty) empty.remove();

  const item = document.createElement('div');
  item.className = 'tag-log-item';
  item.innerHTML = `
    <span class="tag-log-item__time">${escapeTagText(tag.timeStr)}</span>
    <span class="tag-log-item__label" style="color:${safeTagColor(tag.color)}">${escapeTagText(tag.label)}</span>
    <button class="tag-log-item__del" type="button" aria-label="حذف الوسم">✕</button>
  `;
  item.querySelector('button').addEventListener('click', () => {
    AppState.tags = AppState.tags.filter(entry => entry !== tag);
    writeStoredValue('spa-tags', AppState.tags);
    tagTimelineChips.get(tag)?.remove();
    item.remove();
    refreshTagCount();
    updateDashboardCounters();
  });
  list.insertBefore(item, list.firstChild);
}

const tagTimelineChips = new WeakMap();
function safeTagColor(value) {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : '#00D4FF';
}

function addTagToTimeline(tag, time, duration) {
  const trackMap = {
    attack: 'track-attack', counter: 'track-attack', pass: 'track-attack', shot: 'track-attack',
    goal: 'track-goals',
    defend: 'track-defense', press: 'track-defense', intercept: 'track-defense', block: 'track-defense', save: 'track-defense',
    foul: 'track-fouls', yellow: 'track-fouls'
  };
  const trackId = trackMap[tag.id] || 'track-attack';
  const track = document.getElementById(trackId);
  if (!track || !Number.isFinite(duration) || duration <= 0) return;

  const pct = Math.min((time / duration) * 100, 99.5);
  const chip = document.createElement('div');
  chip.className = 'tl-chip';
  chip.style.right = `${pct}%`;
  chip.style.width = '8px';
  chip.style.background = tag.color;
  chip.title = `${tag.label} — ${tag.timeStr}`;
  track.appendChild(chip);
  tagTimelineChips.set(tag, chip);
}

function flashTagButton(id) {
  const btn = [...document.querySelectorAll('.tag-btn[data-id]')].find(button => button.dataset.id === id);
  if (!btn) return;
  btn.style.transform = 'scale(.92)';
  btn.style.boxShadow = '0 0 20px rgba(255,255,255,.4)';
  setTimeout(() => {
    btn.style.transform = '';
    btn.style.boxShadow = '';
  }, 200);
}

// ── Sport Select ──────────────────────────────────────────
document.addEventListener('change', e => {
  if (e.target.id === 'sportSelect') {
    renderTagPanel(e.target.value);
    showToast(`تم تحميل تاغات: ${e.target.options[e.target.selectedIndex].text}`, 'info');
  }
});

// ── Import Modal ──────────────────────────────────────────
function initImportModal() {
  const modal = document.getElementById('importModal');
  const openBtns = [document.getElementById('importBtn')];
  openBtns.forEach(b => b && b.addEventListener('click', () => { modal.style.display = 'flex'; }));
  document.getElementById('closeImportModal').addEventListener('click', () => { modal.style.display = 'none'; });
  document.getElementById('cancelImportBtn').addEventListener('click', () => { modal.style.display = 'none'; });
  modal.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });
}

// ── Keyboard Shortcuts ────────────────────────────────────
function initKeyboardShortcuts() {
  document.addEventListener('keydown', e => {
    // Don't fire inside inputs
    if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;

    const sport = document.getElementById('sportSelect')?.value || 'soccer';
    const types = AppState.tagTypes[sport] || [];
    const found = types.find(t => t.hotkey && t.hotkey.toUpperCase() === e.key.toUpperCase());
    if (found && AppState.currentView === 'analyzer') {
      e.preventDefault();
      recordTag(found.id, found.label, found.color);
    }

    // Space = play/pause
    if (e.key === ' ' && AppState.currentView === 'analyzer') {
      e.preventDefault();
      const v = document.getElementById('mainVideo');
      if (v && v.src) v.paused ? v.play() : v.pause();
    }

    // Navigation shortcuts
    const viewKeys = { '1': 'dashboard', '2': 'analyzer', '3': 'tagging', '4': 'tactical', '5': 'reports', '6': 'compare' };
    if (e.altKey && viewKeys[e.key]) {
      e.preventDefault();
      switchView(viewKeys[e.key]);
    }
  });
}

// ── Toast Notifications ───────────────────────────────────
window.showToast = function(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  toast.innerHTML = `<span>${icons[type] || '•'}</span> ${escapeTagText(msg)}`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-20px)';
    toast.style.transition = '.3s';
    setTimeout(() => toast.remove(), 300);
  }, 2800);
};

// ── Utility: Format Time ──────────────────────────────────
window.formatTime = function(secs) {
  if (isNaN(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

// ── Dashboard init ────────────────────────────────────────
function initDashboardStats() {
  // Animate stat counters
  animateCounter('statMatches', 3);
  animateCounter('statTags', 247 + AppState.tags.length);
  animateCounter('statClips', Math.floor((247 + AppState.tags.length) / 20));
}

function animateCounter(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let current = 0;
  const step = Math.ceil(target / 40);
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current;
    if (current >= target) clearInterval(timer);
  }, 30);
}

// ── Reports Init ──────────────────────────────────────────
function initReports() {
  // Charts are handled in charts.js
  if (window.initCharts) window.initCharts();
}

// ── Tagging View Init ─────────────────────────────────────
function initTaggingView() {
  renderLiveTagButtons();
  renderHotkeyMap();
  renderTagBuilderGrid();
  initLiveTimer();
}

function renderLiveTagButtons() {
  const sport = document.getElementById('sportSelect')?.value || 'soccer';
  const types = AppState.tagTypes[sport] || [];
  const container = document.getElementById('liveTagButtons');
  if (!container) return;

  renderTagButtons(container, types, recordLiveTag);
  container.querySelectorAll('button').forEach(button => {
    button.style.minHeight = '56px';
    button.style.fontSize = '.95rem';
  });
}

window.recordLiveTag = function(id, label, color) {
  const timerEl = document.getElementById('liveTimer');
  const timeStr = timerEl ? timerEl.textContent : '00:00:00';
  const tag = { id, label, color, timeStr, ts: Date.now(), live: true };

  const feedList = document.getElementById('eventFeedList');
  if (feedList) {
    const item = document.createElement('div');
    item.className = 'event-item';
    item.style.animation = 'slideIn .2s ease';
    const catClass = { goal: 'goal', attack: 'attack', defense: 'attack', foul: 'foul' };
    const cls = catClass[id] || 'attack';
    item.innerHTML = `
      <span class="event-time">${timeStr}</span>
      <span class="event-tag ${cls}" style="background:${safeTagColor(color)}22;color:${safeTagColor(color)}">${escapeTagText(label)}</span>
      <span class="event-player">—</span>
    `;
    feedList.insertBefore(item, feedList.firstChild);
    if (feedList.children.length > 50) feedList.lastChild.remove();
  }

  AppState.tags.push(tag);
  writeStoredValue('spa-tags', AppState.tags);
  showToast(`▶ ${label} — ${timeStr}`, 'success');
  flashTagButton(id);
};

function renderHotkeyMap() {
  const sport = document.getElementById('sportSelect')?.value || 'soccer';
  const types = AppState.tagTypes[sport] || [];
  const grid = document.getElementById('hotkeyGrid');
  if (!grid) return;
  grid.innerHTML = types.map(t => `
    <div class="hotkey-item">
      <div class="hotkey-key">${escapeTagText(t.hotkey)}</div>
      <span style="color:${safeTagColor(t.color)}">${escapeTagText(t.label)}</span>
    </div>
  `).join('');
}

function renderTagBuilderGrid() {
  const sport = document.getElementById('sportSelect')?.value || 'soccer';
  const types = AppState.tagTypes[sport] || [];
  const grid = document.getElementById('tagBuilderGrid');
  if (!grid) return;
  grid.innerHTML = types.map(t => `
    <button class="tag-btn" style="background:${safeTagColor(t.color)}; position:relative">
      ${escapeTagText(t.label)}
      <span class="hotkey">${escapeTagText(t.hotkey)}</span>
    </button>
  `).join('');
}

// ── Live Timer ────────────────────────────────────────────
let liveTimerInterval = null;
let liveTimerStart = null;
let liveTimerRunning = false;

function initLiveTimer() {
  const liveBtn = document.getElementById('liveTagBtn');
  if (!liveBtn) return;

  liveBtn.addEventListener('click', () => {
    if (!liveTimerRunning) {
      liveTimerStart = Date.now() - (liveTimerStart ? (Date.now() - liveTimerStart) : 0);
      liveTimerStart = Date.now();
      liveTimerInterval = setInterval(updateLiveTimer, 1000);
      liveTimerRunning = true;
      liveBtn.innerHTML = '<span class="live-dot"></span> إيقاف';
      liveBtn.classList.add('btn--danger');
      showToast('بدأ تاغينغ مباشر!', 'info');
    } else {
      clearInterval(liveTimerInterval);
      liveTimerRunning = false;
      liveBtn.innerHTML = '<span class="live-dot"></span> بدء تاغينغ مباشر';
      liveBtn.classList.remove('btn--danger');
      showToast('تم إيقاف التاغينغ المباشر', 'info');
    }
  });
}

function updateLiveTimer() {
  const elapsed = Math.floor((Date.now() - liveTimerStart) / 1000);
  const h = Math.floor(elapsed / 3600).toString().padStart(2,'0');
  const m = Math.floor((elapsed % 3600) / 60).toString().padStart(2,'0');
  const s = (elapsed % 60).toString().padStart(2,'0');
  const el = document.getElementById('liveTimer');
  if (el) el.textContent = `${h}:${m}:${s}`;
}

// ── Tag Type Builder ──────────────────────────────────────
document.addEventListener('click', e => {
  if (e.target.id === 'addTagTypeBtn') {
    document.getElementById('tagBuilderForm').style.display = 'flex';
  }
  if (e.target.id === 'cancelTagTypeBtn') {
    document.getElementById('tagBuilderForm').style.display = 'none';
  }
  if (e.target.id === 'saveTagTypeBtn') {
    const name = document.getElementById('newTagName').value.trim();
    const color = document.getElementById('newTagColor').value;
    const category = document.getElementById('newTagCategory').value;
    const hotkey = document.getElementById('newTagHotkey').value.toUpperCase();
    const sport = document.getElementById('sportSelect')?.value || 'soccer';

    if (!name) { showToast('الرجاء إدخال اسم التاغ', 'error'); return; }

    const newTag = { id: `custom_${Date.now()}`, label: name, color, hotkey, category };
    AppState.tagTypes[sport] = [...(AppState.tagTypes[sport] || []), newTag];
    localStorage.setItem('spa-tagTypes', JSON.stringify(AppState.tagTypes));

    document.getElementById('tagBuilderForm').style.display = 'none';
    document.getElementById('newTagName').value = '';
    document.getElementById('newTagHotkey').value = '';
    renderTagBuilderGrid();
    renderHotkeyMap();
    renderTagPanel(sport);
    renderLiveTagButtons();
    showToast(`تم إضافة التاغ: ${name}`, 'success');
  }
});

// ── Export Tags ───────────────────────────────────────────
document.addEventListener('click', e => {
  if (e.target.id === 'exportTagsBtn') exportTagsCSV();
  if (e.target.id === 'exportCsvBtn') exportTagsCSV();
});

function exportTagsCSV() {
  const headers = ['الوقت', 'التاغ', 'الفئة'];
  const rows = AppState.tags.map(t => [t.timeStr || t.time, t.label, t.category || '']);
  const csv = [headers, ...rows].map(row => row.map(encodeCsvCell).join(',')).join('\r\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'Tahleel_DZ_Tags.csv';
  a.click();
  URL.revokeObjectURL(url);
  showToast('تم تصدير التاغات بنجاح', 'success');
}

function encodeCsvCell(value) {
  const text = String(value ?? '');
  const safe = /^[\t\r\n]|^\s*[=+@-]/.test(text) ? "'" + text : text;
  return '"' + safe.replace(/"/g, '""') + '"';
}

function escapeTagText(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}
