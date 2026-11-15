/**
 * تحليل DZ — Video Player Module
 * Handles: video loading, playback controls, speed, timeline, drawing overlay
 */

'use strict';

// ── State ─────────────────────────────────────────────────
const VideoState = {
  duration: 0,
  isDrawing: false,
  currentTool: 'arrow',
  drawColor: '#00D4FF',
  drawLineWidth: 4,
  drawings: [],
  currentPath: null,
  isMouseDown: false,
  startX: 0, startY: 0,
  undoStack: [],
  redoStack: [],
  currentText: ''
};

const TrimmerState = {
  inTime: 0,
  outTime: 10,
  isLooping: false,
  presentationMode: false,
  currentPresIndex: 0,
  presTimer: null,
  clips: JSON.parse(localStorage.getItem('tahleel-clips') || 'null') || [
    { id: 'c1', title: 'هجمة مضادة سريعة ومنظمة', start: 0, end: 12, tag: 'هجوم', note: 'تحول هجومي سريع واستغلال الفراغات بين الخطوط', rating: 5 },
    { id: 'c2', title: 'تغطية دفاعية وضغط عالي', start: 15, end: 27, tag: 'دفاع', note: 'تضييق المساحات على حامل الكرة ومنع التمرير البيني', rating: 4 },
    { id: 'c3', title: 'تسديدة مباشرة على المرمى', start: 32, end: 42, tag: 'تسديدة', note: 'متابعة الكرة المرتدة والتسديد المباشر في الزاوية البعيدة', rating: 5 },
    { id: 'c4', title: 'تحليل حالة التسلل (VAR)', start: 45, end: 58, tag: 'تسلل', note: 'وضعية المدافع الأخير وتوقيت انطلاق المهاجم', rating: 4 }
  ]
};

// ── Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initVideoLoader();
  initDrawingTools();
  initSpeedControls();
  initTimelineInteraction();
  initClipList();
  initClipExportEngine();
  initTrimmerEngine();
  initPresentationEngine();
  renderClipList();
});

// ── Video Loading ─────────────────────────────────────────
function initVideoLoader() {
  const fileInput = document.getElementById('videoFileInput');
  const uploadZone = document.getElementById('uploadZone');
  const placeholder = document.getElementById('videoPlaceholder');
  const video = document.getElementById('mainVideo');
  const overlayControls = document.getElementById('videoOverlayControls');
  const canvas = document.getElementById('drawCanvas');

  if (!fileInput) return;

  fileInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    loadVideoFile(file, video, placeholder, overlayControls, canvas);
  });

  // Demo Video Loader
  document.getElementById('loadDemoVideoBtn')?.addEventListener('click', () => {
    const demoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
    video.src = demoUrl;
    video.style.display = 'block';
    if (placeholder) placeholder.style.display = 'none';
    if (overlayControls) overlayControls.style.display = 'block';

    video.addEventListener('loadedmetadata', () => {
      VideoState.duration = video.duration;
      const durEl = document.getElementById('tlDuration');
      if (durEl) durEl.textContent = formatTime(video.duration);
      buildTimelineRuler(video.duration);
      resizeCanvas(canvas, video);
      TrimmerState.inTime = 0;
      TrimmerState.outTime = Math.min(video.duration, 12);
      updateTrimmerUI();
      showToast('⚡ تم تشغيل الفيديو التجريبي بنجاح! يمكنك الآن تجربة الرسم والتقطيع', 'success');
    }, { once: true });
  });

  // Drag & Drop
  if (uploadZone) {
    uploadZone.addEventListener('dragover', e => {
      e.preventDefault();
      uploadZone.style.borderColor = 'var(--accent)';
    });
    uploadZone.addEventListener('dragleave', () => {
      uploadZone.style.borderColor = '';
    });
    uploadZone.addEventListener('drop', e => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('video/')) {
        loadVideoFile(file, video, placeholder, overlayControls, canvas);
      }
    });
  }
}

function loadVideoFile(file, video, placeholder, overlayControls, canvas) {
  const url = URL.createObjectURL(file);
  video.src = url;
  video.style.display = 'block';
  if (placeholder) placeholder.style.display = 'none';
  if (overlayControls) overlayControls.style.display = 'block';

  video.addEventListener('loadedmetadata', () => {
    VideoState.duration = video.duration;
    document.getElementById('tlDuration').textContent = formatTime(video.duration);
    buildTimelineRuler(video.duration);
    resizeCanvas(canvas, video);
    TrimmerState.inTime = 0;
    TrimmerState.outTime = Math.min(video.duration, 12);
    updateTrimmerUI();
    showToast(`تم تحميل: ${file.name}`, 'success');
  });

  video.addEventListener('timeupdate', () => {
    const pct = (video.currentTime / video.duration) * 100;
    const playhead = document.getElementById('tlPlayhead');
    if (playhead) playhead.style.right = `${pct}%`;
    document.getElementById('tlCurrentTime').textContent = formatPreciseTime(video.currentTime);

    // Trimmer Loop range check
    if (TrimmerState.isLooping && video.currentTime >= TrimmerState.outTime) {
      video.currentTime = TrimmerState.inTime;
      video.play();
    }

    // Presentation Mode check
    if (TrimmerState.presentationMode) {
      handlePresentationStep(video.currentTime);
    }

    // Live redraw if magnifier exists in undoStack to keep magnified feed live
    if (VideoState.undoStack.some(s => s.tool === 'magnifier')) {
      const cv = document.getElementById('drawCanvas');
      if (cv) redrawCanvas(cv.getContext('2d'), cv);
    }
  });
}

function resizeCanvas(canvas, video) {
  if (!canvas || !video) return;
  const rect = video.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
}

// ── Speed Controls ────────────────────────────────────────
function initSpeedControls() {
  document.querySelectorAll('.vc-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const speed = parseFloat(btn.dataset.speed);
      const video = document.getElementById('mainVideo');
      if (video) video.playbackRate = speed;
      document.querySelectorAll('.vc-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      showToast(`سرعة التشغيل: ${speed}x`, 'info');
    });
  });
}

// ── Timeline Ruler ────────────────────────────────────────
function buildTimelineRuler(duration) {
  const ruler = document.getElementById('tlRuler');
  if (!ruler) return;
  ruler.innerHTML = '';
  const tickCount = Math.min(20, Math.floor(duration / 60));
  for (let i = 0; i <= tickCount; i++) {
    const pct = (i / tickCount) * 100;
    const t = (i / tickCount) * duration;
    const tick = document.createElement('span');
    tick.style.cssText = `position:absolute;right:${pct}%;font-size:9px;color:var(--text-subtle);transform:translateX(50%);top:4px`;
    tick.textContent = formatTime(t);
    ruler.appendChild(tick);
  }
}

// ── Timeline Click to Seek ────────────────────────────────
function initTimelineInteraction() {
  const trackArea = document.getElementById('tlTrackArea');
  const video = document.getElementById('mainVideo');
  if (!trackArea || !video) return;

  trackArea.addEventListener('click', e => {
    if (!VideoState.duration) return;
    const rect = trackArea.getBoundingClientRect();
    const x = rect.right - e.clientX;
    const pct = x / rect.width;
    video.currentTime = pct * VideoState.duration;
  });

  // Zoom
  document.getElementById('tlZoomIn')?.addEventListener('click', () => showToast('تكبير الجدول الزمني', 'info'));
  document.getElementById('tlZoomOut')?.addEventListener('click', () => showToast('تصغير الجدول الزمني', 'info'));
}

// ── Precise Time Formatter ────────────────────────────────
function formatPreciseTime(sec) {
  if (isNaN(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.floor((sec % 1) * 10);
  return `${m}:${s.toString().padStart(2, '0')}.${ms}`;
}

// ── Enhanced Clip Management & Playlist ───────────────────
function initClipList() {
  const searchInput = document.getElementById('searchClipsInput');
  searchInput?.addEventListener('input', e => {
    renderClipList(e.target.value.trim());
  });

  document.getElementById('addClipBtn')?.addEventListener('click', () => {
    openSaveClipModal();
  });
}

function renderClipList(filterText = '') {
  const container = document.getElementById('clipList');
  if (!container) return;

  let clips = TrimmerState.clips;
  if (filterText) {
    const q = filterText.toLowerCase();
    clips = clips.filter(c => c.title.toLowerCase().includes(q) || (c.tag && c.tag.toLowerCase().includes(q)) || (c.note && c.note.toLowerCase().includes(q)));
  }

  if (clips.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:24px 12px; color:var(--text-muted); font-size:0.82rem;">
        ${filterText ? 'لا توجد لقطات مطابقة للبحث' : '📭 لا توجد لقطات في القائمة بعد.<br>حدد نطاق اللقطة ثم اضغط "✂️ حفظ اللقطة"'}
      </div>
    `;
    return;
  }

  container.innerHTML = clips.map((c, idx) => {
    const dur = (c.end - c.start).toFixed(1);
    const tagColor = c.tag === 'هدف' ? '#10b981' : (c.tag === 'دفاع' ? '#ef4444' : (c.tag === 'تسلل' ? '#f59e0b' : '#00d4ff'));
    return `
      <div class="clip-item ${idx === 0 ? 'active' : ''}" data-id="${c.id}" data-start="${c.start}" data-end="${c.end}">
        <div class="clip-thumb" title="تشغيل اللقطة">
          <span>▶</span>
        </div>
        <div class="clip-meta">
          <strong>${escapeHtml(c.title)}</strong>
          <span>${formatPreciseTime(c.start)} ➔ ${formatPreciseTime(c.end)} (${dur}ث)</span>
          <div style="display:flex; align-items:center; gap:6px; margin-top:2px;">
            <span style="font-size:0.68rem; background:${tagColor}22; color:${tagColor}; border:1px solid ${tagColor}44; border-radius:3px; padding:1px 5px;">${c.tag || 'لقطة'}</span>
            ${c.note ? `<span style="font-size:0.68rem; color:var(--text-muted); text-overflow:ellipsis; overflow:hidden; white-space:nowrap; max-width:110px;" title="${escapeHtml(c.note)}">📝 ${escapeHtml(c.note)}</span>` : ''}
          </div>
        </div>
        <div class="clip-actions">
          <button class="clip-act-btn clip-act-btn--dl" title="تصدير وتنزيل اللقطة مباشرة MP4" onclick="event.stopPropagation(); exportTrimmedSegment(${c.start}, ${c.end}, '${escapeJsString(c.title)}')">💾</button>
          <button class="clip-act-btn clip-act-btn--del" title="حذف اللقطة" onclick="event.stopPropagation(); deleteClipItem('${c.id}')">🗑️</button>
        </div>
      </div>
    `;
  }).join('');

  // Click on clip item to play range
  container.querySelectorAll('.clip-item').forEach(item => {
    item.addEventListener('click', () => {
      container.querySelectorAll('.clip-item').forEach(el => el.classList.remove('active'));
      item.classList.add('active');
      const start = parseFloat(item.dataset.start || 0);
      const end = parseFloat(item.dataset.end || 10);
      playClipRange(start, end);
    });
  });
}

function playClipRange(start, end) {
  const video = document.getElementById('mainVideo');
  if (!video) return;
  TrimmerState.inTime = start;
  TrimmerState.outTime = end;
  updateTrimmerUI();
  video.currentTime = start;
  video.play();
  showToast(`تشغيل اللقطة: ${formatPreciseTime(start)} ➔ ${formatPreciseTime(end)}`, 'info');
}

function deleteClipItem(id) {
  TrimmerState.clips = TrimmerState.clips.filter(c => c.id !== id);
  localStorage.setItem('tahleel-clips', JSON.stringify(TrimmerState.clips));
  renderClipList();
  showToast('تم حذف اللقطة من القائمة', 'info');
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeJsString(str) {
  if (!str) return 'clip';
  return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

// ── Video Trimmer & Jog-Shuttle Engine ────────────────────
function initTrimmerEngine() {
  const markInBtn = document.getElementById('markInBtn');
  const markOutBtn = document.getElementById('markOutBtn');
  const quick10sBtn = document.getElementById('quick10sClipBtn');
  const stepBackBtn = document.getElementById('stepBackFrameBtn');
  const stepFwdBtn = document.getElementById('stepFwdFrameBtn');
  const jumpBackBtn = document.getElementById('jumpBack5sBtn');
  const jumpFwdBtn = document.getElementById('jumpFwd5sBtn');
  const playPauseBtn = document.getElementById('trimmerPlayPauseBtn');
  const loopRangeBtn = document.getElementById('loopRangeBtn');
  const saveClipBtn = document.getElementById('saveTrimmedClipBtn');
  const exportClipBtn = document.getElementById('exportTrimmedClipBtn');
  const video = document.getElementById('mainVideo');

  markInBtn?.addEventListener('click', () => {
    if (!video) return;
    setInPoint(video.currentTime);
  });

  markOutBtn?.addEventListener('click', () => {
    if (!video) return;
    setOutPoint(video.currentTime);
  });

  quick10sBtn?.addEventListener('click', () => {
    if (!video) return;
    const cur = video.currentTime || 0;
    const dur = VideoState.duration || 100;
    TrimmerState.inTime = Math.max(0, cur - 5);
    TrimmerState.outTime = Math.min(dur, cur + 5);
    updateTrimmerUI();
    showToast('⚡ تم تحديد لقطة 10 ثوانٍ حول المشهد الحالي', 'success');
  });

  stepBackBtn?.addEventListener('click', () => stepFrame(-1));
  stepFwdBtn?.addEventListener('click', () => stepFrame(1));
  jumpBackBtn?.addEventListener('click', () => jumpSeconds(-5));
  jumpFwdBtn?.addEventListener('click', () => jumpSeconds(5));

  playPauseBtn?.addEventListener('click', () => {
    if (!video) return;
    if (video.paused) {
      video.play();
      playPauseBtn.textContent = '⏸';
    } else {
      video.pause();
      playPauseBtn.textContent = '▶';
    }
  });

  video?.addEventListener('play', () => { if (playPauseBtn) playPauseBtn.textContent = '⏸'; });
  video?.addEventListener('pause', () => { if (playPauseBtn) playPauseBtn.textContent = '▶'; });

  loopRangeBtn?.addEventListener('click', () => {
    TrimmerState.isLooping = !TrimmerState.isLooping;
    loopRangeBtn.classList.toggle('active', TrimmerState.isLooping);
    if (TrimmerState.isLooping) {
      if (video) {
        video.currentTime = TrimmerState.inTime;
        video.play();
      }
      showToast('🔁 تم تفعيل تكرار اللقطة المحددة باستمرار', 'info');
    } else {
      showToast('تم إيقاف تكرار اللقطة', 'info');
    }
  });

  saveClipBtn?.addEventListener('click', openSaveClipModal);
  exportClipBtn?.addEventListener('click', () => {
    exportTrimmedSegment(TrimmerState.inTime, TrimmerState.outTime, 'Tactical_Clip');
  });

  initSaveClipModal();
  initTimelineRangeDrag();
  initTrimmerShortcuts();
}

function setInPoint(time) {
  TrimmerState.inTime = Math.max(0, Math.min(time, TrimmerState.outTime - 0.2));
  updateTrimmerUI();
  showToast(`[In] بداية اللقطة: ${formatPreciseTime(TrimmerState.inTime)}`, 'info');
}

function setOutPoint(time) {
  const maxDur = VideoState.duration || 9999;
  TrimmerState.outTime = Math.min(maxDur, Math.max(time, TrimmerState.inTime + 0.2));
  updateTrimmerUI();
  showToast(`]Out[ نهاية اللقطة: ${formatPreciseTime(TrimmerState.outTime)}`, 'info');
}

function stepFrame(deltaFrames) {
  const video = document.getElementById('mainVideo');
  if (!video) return;
  const frameDur = 0.04; // 25 fps
  video.currentTime = Math.max(0, Math.min(video.duration || 9999, video.currentTime + deltaFrames * frameDur));
}

function jumpSeconds(deltaSec) {
  const video = document.getElementById('mainVideo');
  if (!video) return;
  video.currentTime = Math.max(0, Math.min(video.duration || 9999, video.currentTime + deltaSec));
}

function updateTrimmerUI() {
  const valEl = document.getElementById('vtbRangeVal');
  const durEl = document.getElementById('vtbRangeDur');
  const highlight = document.getElementById('tlRangeHighlight');
  const rangeLabel = document.getElementById('tlRangeLabel');
  const dur = Math.max(0, TrimmerState.outTime - TrimmerState.inTime).toFixed(1);

  if (valEl) valEl.textContent = `${formatPreciseTime(TrimmerState.inTime)} ➔ ${formatPreciseTime(TrimmerState.outTime)}`;
  if (durEl) durEl.textContent = `(${dur} ث)`;

  if (highlight && VideoState.duration > 0) {
    const startPct = (TrimmerState.inTime / VideoState.duration) * 100;
    const endPct = (TrimmerState.outTime / VideoState.duration) * 100;
    const widthPct = Math.max(0.5, endPct - startPct);

    // RTL layout: right is start
    highlight.style.display = 'flex';
    highlight.style.right = `${startPct}%`;
    highlight.style.width = `${widthPct}%`;
    if (rangeLabel) rangeLabel.textContent = `${formatPreciseTime(TrimmerState.inTime)} - ${formatPreciseTime(TrimmerState.outTime)}`;
  }
}

function initTimelineRangeDrag() {
  const handleIn = document.getElementById('tlRangeHandleIn');
  const handleOut = document.getElementById('tlRangeHandleOut');
  const trackArea = document.getElementById('tlTrackArea');
  if (!trackArea) return;

  let draggingHandle = null;

  handleIn?.addEventListener('mousedown', e => {
    e.stopPropagation();
    draggingHandle = 'in';
  });

  handleOut?.addEventListener('mousedown', e => {
    e.stopPropagation();
    draggingHandle = 'out';
  });

  window.addEventListener('mousemove', e => {
    if (!draggingHandle || !VideoState.duration) return;
    const rect = trackArea.getBoundingClientRect();
    const x = rect.right - e.clientX;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    const t = pct * VideoState.duration;

    if (draggingHandle === 'in') {
      TrimmerState.inTime = Math.min(t, TrimmerState.outTime - 0.2);
    } else if (draggingHandle === 'out') {
      TrimmerState.outTime = Math.max(t, TrimmerState.inTime + 0.2);
    }
    updateTrimmerUI();
  });

  window.addEventListener('mouseup', () => {
    draggingHandle = null;
  });
}

function initTrimmerShortcuts() {
  window.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (!document.getElementById('view-analyzer')?.classList.contains('active')) return;

    if (e.key === 'i' || e.key === 'I') {
      const v = document.getElementById('mainVideo');
      if (v) setInPoint(v.currentTime);
    } else if (e.key === 'o' || e.key === 'O') {
      const v = document.getElementById('mainVideo');
      if (v) setOutPoint(v.currentTime);
    } else if (e.key === ',' || e.key === '<') {
      stepFrame(-1);
    } else if (e.key === '.' || e.key === '>') {
      stepFrame(1);
    } else if (e.key === 'l' || e.key === 'L') {
      document.getElementById('loopRangeBtn')?.click();
    }
  });
}

// ── Save Clip Modal ───────────────────────────────────────
function initSaveClipModal() {
  const modal = document.getElementById('saveClipModal');
  const closeBtn = document.getElementById('closeSaveClipModal');
  const cancelBtn = document.getElementById('cancelSaveClipBtn');
  const confirmBtn = document.getElementById('confirmSaveClipBtn');

  [closeBtn, cancelBtn].forEach(b => {
    b?.addEventListener('click', () => {
      if (modal) modal.style.display = 'none';
    });
  });

  confirmBtn?.addEventListener('click', () => {
    const titleInput = document.getElementById('newClipTitleInput');
    const catSelect = document.getElementById('newClipCategorySelect');
    const noteInput = document.getElementById('newClipNoteInput');

    const title = titleInput?.value.trim() || `لقطة تكتيكية #${TrimmerState.clips.length + 1}`;
    const tag = catSelect?.value || 'هجوم';
    const note = noteInput?.value.trim() || '';

    const newClip = {
      id: 'c_' + Date.now(),
      title,
      start: parseFloat(TrimmerState.inTime.toFixed(2)),
      end: parseFloat(TrimmerState.outTime.toFixed(2)),
      tag,
      note,
      rating: 5
    };

    TrimmerState.clips.unshift(newClip);
    localStorage.setItem('tahleel-clips', JSON.stringify(TrimmerState.clips));

    if (titleInput) titleInput.value = '';
    if (noteInput) noteInput.value = '';
    if (modal) modal.style.display = 'none';

    renderClipList();
    showToast('✂️ تم حفظ اللقطة المقصوصة بنجاح في قائمة المقاطع!', 'success');
  });
}

function openSaveClipModal() {
  const modal = document.getElementById('saveClipModal');
  const preview = document.getElementById('newClipTimeRangePreview');
  const dur = (TrimmerState.outTime - TrimmerState.inTime).toFixed(1);

  if (preview) {
    preview.textContent = `${formatPreciseTime(TrimmerState.inTime)} ➔ ${formatPreciseTime(TrimmerState.outTime)} (المدة: ${dur} ثانية)`;
  }
  if (modal) modal.style.display = 'flex';
}

// ── Coach Presentation Mode Engine ───────────────────────
function initPresentationEngine() {
  const presBtn = document.getElementById('presentationModeBtn');
  const prevBtn = document.getElementById('presPrevBtn');
  const nextBtn = document.getElementById('presNextBtn');
  const playPauseBtn = document.getElementById('presPlayPauseBtn');
  const exitBtn = document.getElementById('presExitBtn');
  const video = document.getElementById('mainVideo');

  presBtn?.addEventListener('click', () => {
    if (TrimmerState.clips.length === 0) {
      showToast('لا توجد لقطات في القائمة لعرضها في المحاضرة', 'info');
      return;
    }
    startPresentationMode();
  });

  exitBtn?.addEventListener('click', stopPresentationMode);

  prevBtn?.addEventListener('click', () => {
    if (TrimmerState.currentPresIndex > 0) {
      playPresentationClip(TrimmerState.currentPresIndex - 1);
    }
  });

  nextBtn?.addEventListener('click', () => {
    if (TrimmerState.currentPresIndex < TrimmerState.clips.length - 1) {
      playPresentationClip(TrimmerState.currentPresIndex + 1);
    } else {
      showToast('🎉 انتهى عرض جميع اللقطات في المحاضرة الفنية!', 'success');
      stopPresentationMode();
    }
  });

  playPauseBtn?.addEventListener('click', () => {
    if (!video) return;
    if (video.paused) {
      video.play();
      playPauseBtn.textContent = '⏸ إيقاف للشرح';
    } else {
      video.pause();
      playPauseBtn.textContent = '▶ مواصلة الشرح';
    }
  });
}

function startPresentationMode() {
  TrimmerState.presentationMode = true;
  const overlay = document.getElementById('presentationOverlay');
  if (overlay) overlay.style.display = 'flex';
  playPresentationClip(0);
  showToast('🎬 بدأ وضع المحاضرة الفنية للمدرب — عرض اللقطات بالتسلسل', 'success');
}

function stopPresentationMode() {
  TrimmerState.presentationMode = false;
  const overlay = document.getElementById('presentationOverlay');
  if (overlay) overlay.style.display = 'none';
  if (TrimmerState.presTimer) clearTimeout(TrimmerState.presTimer);
}

function playPresentationClip(index) {
  TrimmerState.currentPresIndex = index;
  const clip = TrimmerState.clips[index];
  if (!clip) return;

  const titleEl = document.getElementById('presClipTitle');
  const progEl = document.getElementById('presClipProgress');
  const video = document.getElementById('mainVideo');

  if (titleEl) titleEl.textContent = `${clip.title} ${clip.note ? '— ' + clip.note : ''}`;
  if (progEl) progEl.textContent = `لقطة ${index + 1} من ${TrimmerState.clips.length} (${clip.tag || 'تحليل'})`;

  if (video) {
    TrimmerState.inTime = clip.start;
    TrimmerState.outTime = clip.end;
    updateTrimmerUI();
    video.currentTime = clip.start;
    video.play();
  }
}

function handlePresentationStep(currentTime) {
  const clip = TrimmerState.clips[TrimmerState.currentPresIndex];
  if (!clip) return;

  if (currentTime >= clip.end) {
    const video = document.getElementById('mainVideo');
    if (video) video.pause();

    // Pause briefly for explanation then advance
    if (TrimmerState.presTimer) clearTimeout(TrimmerState.presTimer);
    TrimmerState.presTimer = setTimeout(() => {
      if (!TrimmerState.presentationMode) return;
      if (TrimmerState.currentPresIndex < TrimmerState.clips.length - 1) {
        playPresentationClip(TrimmerState.currentPresIndex + 1);
      } else {
        showToast('🎉 انتهى عرض جميع لقطات المحاضرة التكتيكية بنجاح!', 'success');
        stopPresentationMode();
      }
    }, 2500);
  }
}

// ── Export Trimmed Segment Direct Function ────────────────
function exportTrimmedSegment(inTime, outTime, title) {
  const video = document.getElementById('mainVideo');
  if (!video || !video.src || video.style.display === 'none') {
    showToast('يرجى تشغيل فيديو أولاً (أو اضغط "⚡ تشغيل فيديو تجريبي")', 'info');
    return;
  }
  const dur = Math.max(1, Math.round(outTime - inTime));
  video.currentTime = inTime;
  startVideoClipExport(dur, title || 'Tactical_Clip', true);
}

// ── Advanced Drawing & Telestration Engine ────────────────
function initDrawingTools() {
  const canvas = document.getElementById('drawCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Activate drawing mode by default when tools are selected
  VideoState.isDrawing = true;
  canvas.classList.add('drawing');

  // Tool selection
  document.querySelectorAll('.draw-tool[data-tool]').forEach(btn => {
    btn.addEventListener('click', () => {
      VideoState.currentTool = btn.dataset.tool;
      VideoState.isDrawing = true;
      canvas.classList.add('drawing');

      document.querySelectorAll('.draw-tool[data-tool]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      document.getElementById('tlDrawMode')?.classList.add('active');
      document.getElementById('tlTagMode')?.classList.remove('active');
    });
  });

  // Mode toggle
  document.getElementById('tlDrawMode')?.addEventListener('click', function() {
    VideoState.isDrawing = !VideoState.isDrawing;
    canvas.classList.toggle('drawing', VideoState.isDrawing);
    this.classList.toggle('active', VideoState.isDrawing);
    document.getElementById('tlTagMode')?.classList.toggle('active', !VideoState.isDrawing);
  });

  document.getElementById('tlTagMode')?.addEventListener('click', function() {
    VideoState.isDrawing = false;
    canvas.classList.remove('drawing');
    this.classList.add('active');
    document.getElementById('tlDrawMode')?.classList.remove('active');
  });

  // Quick Colors
  document.querySelectorAll('.draw-color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      VideoState.drawColor = btn.dataset.color;
      document.querySelectorAll('.draw-color-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const pick = document.getElementById('drawColor');
      if (pick) pick.value = VideoState.drawColor;
    });
  });

  // Custom Color & line width
  document.getElementById('drawColor')?.addEventListener('input', e => {
    VideoState.drawColor = e.target.value;
  });
  document.getElementById('drawLineWidth')?.addEventListener('change', e => {
    VideoState.drawLineWidth = parseInt(e.target.value);
  });

  // Undo & Redo
  document.getElementById('undoBtn')?.addEventListener('click', undoVideoDraw);
  document.getElementById('redoBtn')?.addEventListener('click', redoVideoDraw);

  // Clear
  document.getElementById('clearCanvasBtn')?.addEventListener('click', () => {
    if (VideoState.undoStack.length === 0) return;
    VideoState.redoStack.push([...VideoState.undoStack]);
    VideoState.undoStack = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    showToast('تم مسح جميع الرسومات عن الفيديو', 'info');
  });

  // Frame Capture / Snapshot
  document.getElementById('captureFrameBtn')?.addEventListener('click', captureFrameWithDrawings);

  // Mouse events
  canvas.addEventListener('mousedown', e => onDrawStart(e, canvas, ctx));
  canvas.addEventListener('mousemove', e => onDrawMove(e, canvas, ctx));
  canvas.addEventListener('mouseup', e => onDrawEnd(e, canvas, ctx));
  canvas.addEventListener('mouseleave', () => { VideoState.isMouseDown = false; });

  // Touch events
  canvas.addEventListener('touchstart', e => { e.preventDefault(); onDrawStart(toMouseEv(e), canvas, ctx); }, { passive: false });
  canvas.addEventListener('touchmove', e => { e.preventDefault(); onDrawMove(toMouseEv(e), canvas, ctx); }, { passive: false });
  canvas.addEventListener('touchend', e => { e.preventDefault(); onDrawEnd(toMouseEv(e), canvas, ctx); }, { passive: false });

  // Keyboard shortcuts
  window.addEventListener('keydown', e => {
    if (document.getElementById('view-analyzer')?.classList.contains('active')) {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        e.shiftKey ? redoVideoDraw() : undoVideoDraw();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        redoVideoDraw();
      }
    }
  });
}

function undoVideoDraw() {
  const canvas = document.getElementById('drawCanvas');
  if (!canvas || VideoState.undoStack.length === 0) return;
  const ctx = canvas.getContext('2d');
  if (!VideoState.redoStack) VideoState.redoStack = [];
  VideoState.redoStack.push(VideoState.undoStack.pop());
  redrawCanvas(ctx, canvas);
  showToast('تراجع ↩', 'info');
}

function redoVideoDraw() {
  const canvas = document.getElementById('drawCanvas');
  if (!canvas || !VideoState.redoStack || VideoState.redoStack.length === 0) return;
  const ctx = canvas.getContext('2d');
  VideoState.undoStack.push(VideoState.redoStack.pop());
  redrawCanvas(ctx, canvas);
  showToast('إعادة ↪', 'info');
}

function toMouseEv(e) {
  const t = e.touches[0] || e.changedTouches[0];
  return { clientX: t.clientX, clientY: t.clientY };
}

function getPos(e, canvas) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: Math.round(e.clientX - rect.left),
    y: Math.round(e.clientY - rect.top)
  };
}

function onDrawStart(e, canvas, ctx) {
  if (!VideoState.isDrawing) return;
  VideoState.isMouseDown = true;
  const { x, y } = getPos(e, canvas);
  VideoState.startX = x;
  VideoState.startY = y;

  if (VideoState.currentTool === 'freehand' || VideoState.currentTool === 'laser') {
    VideoState.currentPath = [{ x, y }];
  } else if (VideoState.currentTool === 'player-badge') {
    const text = prompt('أدخل رقم واسم وتوجيه اللاعب (مثال: #10 محرز — ضغط عالي):', '#10 لاعب تكتيكي');
    VideoState.currentText = text && text.trim() ? text.trim() : '#10 لاعب تكتيكي';
  } else if (VideoState.currentTool === 'text') {
    const text = prompt('أدخل نص التوجيه / اسم اللاعب:', 'تغطية تكتيكية');
    if (text && text.trim()) {
      if (!VideoState.redoStack) VideoState.redoStack = [];
      VideoState.redoStack = [];
      VideoState.undoStack.push({
        tool: 'text',
        color: VideoState.drawColor,
        lineWidth: VideoState.drawLineWidth,
        x1: x, y1: y,
        text: text.trim()
      });
      redrawCanvas(ctx, canvas);
    }
    VideoState.isMouseDown = false;
  }
}

function onDrawMove(e, canvas, ctx) {
  if (!VideoState.isDrawing || !VideoState.isMouseDown) return;
  const { x, y } = getPos(e, canvas);

  redrawCanvas(ctx, canvas);

  ctx.strokeStyle = VideoState.drawColor;
  ctx.lineWidth = VideoState.drawLineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (VideoState.currentTool === 'freehand' || VideoState.currentTool === 'laser') {
    VideoState.currentPath.push({ x, y });
    drawShape(ctx, VideoState.currentTool, 0, 0, 0, 0, VideoState.drawColor, VideoState.drawLineWidth, '', VideoState.currentPath, canvas);
  } else {
    drawShape(ctx, VideoState.currentTool, VideoState.startX, VideoState.startY, x, y, VideoState.drawColor, VideoState.drawLineWidth, '', null, canvas);
  }
}

function onDrawEnd(e, canvas, ctx) {
  if (!VideoState.isDrawing || !VideoState.isMouseDown) return;
  VideoState.isMouseDown = false;
  const { x, y } = getPos(e, canvas);

  if (!VideoState.redoStack) VideoState.redoStack = [];
  VideoState.redoStack = [];

  const shape = {
    tool: VideoState.currentTool,
    color: VideoState.drawColor,
    lineWidth: VideoState.drawLineWidth,
    x1: VideoState.startX, y1: VideoState.startY,
    x2: x, y2: y,
    path: VideoState.currentPath ? [...VideoState.currentPath] : null,
    text: VideoState.currentText || ''
  };

  VideoState.undoStack.push(shape);
  VideoState.currentPath = null;
  redrawCanvas(ctx, canvas);
}

function redrawCanvas(ctx, canvas) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  VideoState.undoStack.forEach(shape => {
    drawShape(ctx, shape.tool, shape.x1, shape.y1, shape.x2, shape.y2, shape.color, shape.lineWidth, shape.text, shape.path, canvas);
  });
}

function drawShape(ctx, tool, x1, y1, x2, y2, color, lineWidth, text, path, canvas) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (tool) {
    case 'line':
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      break;

    case 'arrow': {
      const dx = x2 - x1, dy = y2 - y1;
      const angle = Math.atan2(dy, dx);
      const headLen = Math.max(14, lineWidth * 3.5);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      drawHead(ctx, x2, y2, angle, headLen);
      break;
    }

    case 'curved-arrow': {
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      const dx = x2 - x1, dy = y2 - y1;
      const cx = mx - dy * 0.28, cy = my + dx * 0.28;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(cx, cy, x2, y2); ctx.stroke();
      const angle = Math.atan2(y2 - cy, x2 - cx);
      const headLen = Math.max(14, lineWidth * 3.5);
      drawHead(ctx, x2, y2, angle, headLen);
      break;
    }

    case 'dribble': {
      const dist = Math.hypot(x2 - x1, y2 - y1);
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const waves = Math.max(3, Math.round(dist / 24));
      const step = dist / waves;
      const amp = 8;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      for (let i = 1; i <= waves; i++) {
        const d = i * step;
        const side = (i % 2 === 1) ? 1 : -1;
        const px = x1 + Math.cos(angle) * d + Math.cos(angle + Math.PI/2) * (amp * side);
        const py = y1 + Math.sin(angle) * d + Math.sin(angle + Math.PI/2) * (amp * side);
        ctx.lineTo(px, py);
      }
      ctx.stroke();
      const headLen = Math.max(14, lineWidth * 3.5);
      drawHead(ctx, x2, y2, angle, headLen);
      break;
    }

    case 'spotlight': {
      // Dims background and shines a spotlight beam on the player
      const r = Math.max(25, Math.hypot(x2 - x1, y2 - y1));
      const w = canvas ? canvas.width : 1280;
      const h = canvas ? canvas.height : 720;

      // Dark translucent mask with hole
      ctx.fillStyle = 'rgba(0, 0, 0, 0.58)';
      ctx.beginPath();
      ctx.rect(0, 0, w, h);
      ctx.arc(x1, y1, r, 0, Math.PI * 2, true);
      ctx.fill();

      // Glowing spotlight border ring
      ctx.shadowColor = color;
      ctx.shadowBlur = 18;
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(3, lineWidth);
      ctx.beginPath(); ctx.arc(x1, y1, r, 0, Math.PI * 2); ctx.stroke();
      break;
    }

    case 'magnifier': {
      // High-precision VAR Magnifier / Zoom Loupe
      const r = Math.max(38, Math.hypot(x2 - x1, y2 - y1));
      ctx.save();
      ctx.beginPath();
      ctx.arc(x1, y1, r, 0, Math.PI * 2);
      ctx.clip();

      // Draw magnified video frame directly from underlying video
      try {
        const vid = document.getElementById('mainVideo');
        if (vid && vid.videoWidth && canvas) {
          const sx = (x1 / canvas.width) * vid.videoWidth;
          const sy = (y1 / canvas.height) * vid.videoHeight;
          const zoom = 2.4;
          const sw = (r * 2 / zoom) * (vid.videoWidth / canvas.width);
          const sh = (r * 2 / zoom) * (vid.videoHeight / canvas.height);
          ctx.drawImage(vid, sx - sw/2, sy - sh/2, sw, sh, x1 - r, y1 - r, r * 2, r * 2);
        } else {
          ctx.fillStyle = 'rgba(0, 212, 255, 0.15)';
          ctx.fillRect(x1 - r, y1 - r, r * 2, r * 2);
        }
      } catch (_) {
        ctx.fillStyle = 'rgba(0, 212, 255, 0.15)';
        ctx.fillRect(x1 - r, y1 - r, r * 2, r * 2);
      }

      // Tactical crosshair inside loupe
      ctx.strokeStyle = hexToRgba(color, 0.45);
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(x1 - r, y1); ctx.lineTo(x1 + r, y1);
      ctx.moveTo(x1, y1 - r); ctx.lineTo(x1, y1 + r);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Glowing lens bezel
      ctx.shadowColor = color;
      ctx.shadowBlur = 16;
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(3, lineWidth);
      ctx.beginPath();
      ctx.arc(x1, y1, r, 0, Math.PI * 2);
      ctx.stroke();

      // Lens Badge: VAR ZOOM 2.5x
      ctx.shadowBlur = 0;
      const bText = '🔍 VAR 2.5x';
      ctx.font = 'bold 11px Cairo, sans-serif';
      const bw = ctx.measureText(bText).width + 14;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(x1 - bw/2, y1 + r - 9, bw, 20, 5);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(bText, x1, y1 + r + 2);
      break;
    }

    case 'offside-line': {
      // 3D Perspective Offside Line & Virtual Wall
      const wallHeight = 65;
      const grad = ctx.createLinearGradient(0, y1 - wallHeight, 0, y1);
      grad.addColorStop(0, 'rgba(239, 68, 68, 0)');
      grad.addColorStop(1, hexToRgba(color, 0.4));

      // Draw vertical wall
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x2, y2 - wallHeight);
      ctx.lineTo(x1, y1 - wallHeight);
      ctx.closePath();
      ctx.fill();

      // Ground reference line with luminous glow
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(3, lineWidth);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Top wall guide line
      ctx.shadowBlur = 0;
      ctx.strokeStyle = hexToRgba(color, 0.6);
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(x1, y1 - wallHeight);
      ctx.lineTo(x2, y2 - wallHeight);
      ctx.stroke();
      ctx.setLineDash([]);

      // Tactical Offside Marker
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      const lbl = '📐 خط التسلل والعمق التكتيكي';
      ctx.font = 'bold 11px Cairo, sans-serif';
      const lw = ctx.measureText(lbl).width + 14;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(mx - lw/2, my - 24, lw, 22, 5);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(lbl, mx, my - 13);
      break;
    }

    case 'space-polygon': {
      // Tactical Free Space / Pocket of Space
      const rx = Math.min(x1, x2), ry = Math.min(y1, y2);
      const rw = Math.abs(x2 - x1), rh = Math.abs(y2 - y1);
      ctx.fillStyle = hexToRgba(color, 0.28);
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(2.5, lineWidth);
      ctx.beginPath();
      ctx.roundRect(rx, ry, rw, rh, 8);
      ctx.fill(); ctx.stroke();

      // Free Space Badge
      ctx.shadowBlur = 0;
      const sLbl = '🔷 مساحة شاغرة (Free Space)';
      ctx.font = 'bold 11px Cairo, sans-serif';
      const slw = ctx.measureText(sLbl).width + 12;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(rx + rw/2 - slw/2, ry + rh/2 - 11, slw, 22, 4);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(sLbl, rx + rw/2, ry + rh/2);
      break;
    }

    case 'aerial-pass': {
      // Parabolic Arc for Aerial / Lofted Pass with Ground Shadow
      const mx = (x1 + x2) / 2;
      const dist = Math.hypot(x2 - x1, y2 - y1);
      const arcHeight = Math.min(130, Math.max(45, dist * 0.42));
      const cy = Math.min(y1, y2) - arcHeight;

      // Ground shadow along pitch
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Flight trajectory arc
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(3, lineWidth);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo(mx, cy, x2, y2);
      ctx.stroke();

      // Target landing ring
      ctx.shadowBlur = 0;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x2, y2, 9, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(x2, y2, 4, 0, Math.PI * 2); ctx.fill();

      // Landing arrow
      const angle = Math.atan2(y2 - cy, x2 - mx);
      drawHead(ctx, x2, y2, angle, Math.max(14, lineWidth * 3.5));
      break;
    }

    case 'player-badge': {
      // 3D perspective ring at feet
      const rx = Math.max(18, Math.abs(x2 - x1) * 0.4);
      const ry = rx * 0.45;
      ctx.beginPath();
      ctx.ellipse(x1, y1, rx, ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba(color, 0.28);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Stem pole
      const poleHeight = 65;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1, y1 - poleHeight);
      ctx.stroke();

      // Player badge
      const pLabel = text || 'لاعب تكتيكي';
      const numMatch = pLabel.match(/#\d+/);
      const pNum = numMatch ? numMatch[0] : '#10';
      const pName = pLabel.replace(pNum, '').trim() || 'لاعب تكتيكي';

      ctx.font = 'bold 12px Cairo, sans-serif';
      const ptw = ctx.measureText(pName).width + 42;
      const bx = x1 - ptw / 2;
      const by = y1 - poleHeight - 26;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.roundRect(bx, by, ptw, 26, 6);
      ctx.fill(); ctx.stroke();

      // Number box
      ctx.shadowBlur = 0;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(bx + 4, by + 4, 24, 18, 4);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pNum.replace('#', ''), bx + 16, by + 13);

      // Name
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Cairo, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(pName, bx + ptw - 8, by + 13);
      break;
    }

    case 'player-ring': {
      // 3D perspective pitch ring at feet
      const rx = Math.max(18, Math.abs(x2 - x1));
      const ry = rx * 0.45;
      ctx.beginPath();
      ctx.ellipse(x1, y1, rx, ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba(color, 0.25);
      ctx.fill();
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.stroke();

      // Inner ring
      ctx.beginPath();
      ctx.ellipse(x1, y1, rx * 0.65, ry * 0.65, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }

    case 'player-link': {
      // Tactical connection line with distance measurement
      ctx.setLineDash([6, 5]);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.setLineDash([]);

      // End anchor dots
      ctx.beginPath(); ctx.arc(x1, y1, 5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x2, y2, 5, 0, Math.PI * 2); ctx.fill();

      // Distance estimation badge
      const distPx = Math.hypot(x2 - x1, y2 - y1);
      const estMeters = (distPx * 0.08).toFixed(1);
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      const label = `${estMeters} m`;
      ctx.font = 'bold 12px Cairo, sans-serif';
      const tw = ctx.measureText(label).width + 12;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(mx - tw/2, my - 12, tw, 22, 5);
      ctx.fill(); ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, mx, my);
      break;
    }

    case 'circle': {
      const rx = Math.abs(x2 - x1) / 2, ry = Math.abs(y2 - y1) / 2;
      const cx = x1 + (x2 - x1) / 2, cy = y1 + (y2 - y1) / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx || 1, ry || 1, 0, 0, 2 * Math.PI);
      ctx.stroke();
      break;
    }

    case 'rect': {
      const rx = Math.min(x1, x2), ry = Math.min(y1, y2);
      const rw = Math.abs(x2 - x1), rh = Math.abs(y2 - y1);
      ctx.fillStyle = hexToRgba(color, 0.22);
      ctx.fillRect(rx, ry, rw, rh);
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(rx, ry, rw, rh);
      ctx.setLineDash([]);
      break;
    }

    case 'angle': {
      // Angle measurement tool
      const dx = x2 - x1, dy = y2 - y1;
      const angleRad = Math.atan2(dy, dx);
      let deg = Math.round(Math.abs(angleRad * 180 / Math.PI));

      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 + dx, y1); ctx.stroke();

      const r = Math.min(30, Math.hypot(dx, dy) / 2);
      ctx.beginPath();
      ctx.arc(x1, y1, r, 0, angleRad, angleRad < 0);
      ctx.stroke();

      const badge = `${deg}°`;
      ctx.font = 'bold 12px Cairo, sans-serif';
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.beginPath(); ctx.roundRect(x1 + 10, y1 - 20, 36, 20, 4); ctx.fill();
      ctx.fillStyle = color;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(badge, x1 + 28, y1 - 10);
      break;
    }

    case 'laser': {
      if (path && path.length > 1) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        path.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1.5, lineWidth / 2);
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        path.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.stroke();
      }
      break;
    }

    case 'freehand': {
      if (path && path.length > 1) {
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        path.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.stroke();
      }
      break;
    }

    case 'text': {
      const lbl = text || 'توجيه تكتيكي';
      ctx.font = 'bold 13px Cairo, sans-serif';
      const tw = ctx.measureText(lbl).width + 16;
      const th = 26;

      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 8;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.roundRect(x1 - tw/2, y1 - th/2, tw, th, 6);
      ctx.fill(); ctx.stroke();

      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(lbl, x1, y1 + 1);
      break;
    }
  }
  ctx.restore();
}

function drawHead(ctx, x, y, angle, headLen) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - headLen * Math.cos(angle - Math.PI / 6), y - headLen * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x - headLen * Math.cos(angle + Math.PI / 6), y - headLen * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
}

function hexToRgba(hex, alpha = 0.3) {
  if (!hex || !hex.startsWith('#')) return `rgba(0, 212, 255, ${alpha})`;
  let c = hex.slice(1);
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ── Capture Video Frame with Annotations ──────────────────────────────────
function captureFrameWithDrawings() {
  const video = document.getElementById('mainVideo');
  const canvas = document.getElementById('drawCanvas');
  if (!video || !canvas) return;

  const w = video.videoWidth || canvas.width || 1280;
  const h = video.videoHeight || canvas.height || 720;

  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  const octx = off.getContext('2d');

  // Draw current video frame if available
  try {
    octx.drawImage(video, 0, 0, w, h);
  } catch (_) {
    octx.fillStyle = '#0f172a';
    octx.fillRect(0, 0, w, h);
  }

  // Draw scaled telestration drawings on top
  octx.drawImage(canvas, 0, 0, w, h);

  // Professional Analysis Banner
  octx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  octx.fillRect(0, h - 50, w, 50);

  octx.fillStyle = '#00D4FF';
  octx.font = 'bold 18px Cairo, sans-serif';
  octx.textAlign = 'right';
  octx.fillText('🎯 تحليل DZ — استوديو تحليل الفيديو الرياضي', w - 24, h - 18);

  const curTime = formatTime(video.currentTime || 0);
  octx.fillStyle = '#94a3b8';
  octx.font = '15px Cairo, sans-serif';
  octx.textAlign = 'left';
  octx.fillText(`⏱️ لقطة عند: ${curTime}  |  📅 ${new Date().toLocaleDateString('ar-DZ')}`, 24, h - 18);

  // Download Image
  const a = document.createElement('a');
  a.download = `Tahleel_Analysis_Capture_${curTime.replace(':', 'm')}s.png`;
  a.href = off.toDataURL('image/png');
  a.click();
  showToast('📸 تم حفظ وتصدير لقطة الفيديو مع الرسومات بدقة عالية!', 'success');
}

// ── Video Clip Recording & Export Engine (MP4 / WebM) ─────
let clipMediaRecorder = null;
let clipRecordedChunks = [];
let clipRecordingTimer = null;
let clipRecordingAnimId = null;
let clipSelectedDuration = 10; // Default 10s

function initClipExportEngine() {
  const openModalBtn = document.getElementById('openClipExportModalBtn');
  const modal = document.getElementById('exportClipModal');
  const closeModalBtn = document.getElementById('closeExportClipModal');
  const cancelBtn = document.getElementById('cancelExportClipBtn');
  const startBtn = document.getElementById('startRecordingClipBtn');
  const stopBtn = document.getElementById('stopRecBtn');

  // Open / Close Modal
  openModalBtn?.addEventListener('click', () => {
    const video = document.getElementById('mainVideo');
    if (!video || !video.src || video.style.display === 'none') {
      showToast('يرجى تشغيل فيديو أولاً (أو اضغط على زر "⚡ تشغيل فيديو تجريبي")', 'info');
      return;
    }
    if (modal) modal.style.display = 'flex';
  });

  [closeModalBtn, cancelBtn].forEach(b => {
    b?.addEventListener('click', () => {
      if (modal) modal.style.display = 'none';
    });
  });

  // Duration buttons
  document.querySelectorAll('.clip-dur-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.clip-dur-btn').forEach(b => {
        b.classList.remove('active', 'btn--primary');
        b.classList.add('btn--ghost');
      });
      btn.classList.add('active', 'btn--primary');
      btn.classList.remove('btn--ghost');
      clipSelectedDuration = parseInt(btn.dataset.dur || '10');
    });
  });

  // Start Recording
  startBtn?.addEventListener('click', () => {
    if (modal) modal.style.display = 'none';
    const watermarkText = document.getElementById('clipWatermarkText')?.value.trim() || '';
    const includeWatermark = document.getElementById('includeWatermarkCheck')?.checked ?? true;
    startVideoClipExport(clipSelectedDuration, watermarkText, includeWatermark);
  });

  // Stop Recording
  stopBtn?.addEventListener('click', stopVideoClipExport);
}

function startVideoClipExport(duration, watermarkText, includeWatermark) {
  const video = document.getElementById('mainVideo');
  const drawCanvas = document.getElementById('drawCanvas');
  const indicator = document.getElementById('videoRecIndicator');
  const timerText = document.getElementById('recTimerText');

  if (!video || !drawCanvas) {
    showToast('تعذر الوصول إلى مشغل الفيديو', 'error');
    return;
  }

  // Create recording canvas
  const w = video.videoWidth || drawCanvas.width || 1280;
  const h = video.videoHeight || drawCanvas.height || 720;
  const recCanvas = document.createElement('canvas');
  recCanvas.width = w;
  recCanvas.height = h;
  const rctx = recCanvas.getContext('2d');

  // Stream at 30 fps
  const stream = recCanvas.captureStream(30);

  // Best supported video type
  const candidateTypes = [
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm'
  ];
  let mimeType = '';
  for (const t of candidateTypes) {
    if (MediaRecorder.isTypeSupported(t)) {
      mimeType = t;
      break;
    }
  }

  try {
    clipMediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
  } catch (err) {
    showToast('تعذر بدء التسجيل: ' + err.message, 'error');
    return;
  }

  clipRecordedChunks = [];
  clipMediaRecorder.ondataavailable = e => {
    if (e.data && e.data.size > 0) clipRecordedChunks.push(e.data);
  };

  clipMediaRecorder.onstop = () => {
    cancelAnimationFrame(clipRecordingAnimId);
    if (clipRecordingTimer) clearInterval(clipRecordingTimer);
    if (indicator) indicator.style.display = 'none';

    if (clipRecordedChunks.length === 0) {
      showToast('لم يتم تسجيل بيانات كافية للقطة', 'error');
      return;
    }

    const blobType = clipMediaRecorder.mimeType || 'video/webm';
    const isMp4 = blobType.includes('mp4');
    const ext = isMp4 ? 'mp4' : 'webm';
    const blob = new Blob(clipRecordedChunks, { type: blobType });

    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeTitle = (watermarkText || 'Tactical_Clip').replace(/\s+/g, '_');
    a.download = `Tahleel_${safeTitle}_${Date.now()}.${ext}`;
    a.href = downloadUrl;
    a.click();

    showToast(`🎥 تم تصدير لقطة الفيديو بنجاح بصيغة (${ext.toUpperCase()}) جاهزة للمشاركة!`, 'success');
  };

  // Play video
  video.play();
  clipMediaRecorder.start(250); // Slice every 250ms

  // Show indicator
  if (indicator) indicator.style.display = 'flex';
  let elapsed = 0;

  function renderRecFrame() {
    // 1. Draw video frame
    try {
      rctx.drawImage(video, 0, 0, w, h);
    } catch (_) {
      rctx.fillStyle = '#0f172a';
      rctx.fillRect(0, 0, w, h);
    }

    // 2. Draw overlay telestration drawings
    rctx.drawImage(drawCanvas, 0, 0, w, h);

    // 3. Optional tactical banner
    if (includeWatermark) {
      rctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      rctx.fillRect(0, h - 46, w, 46);

      rctx.fillStyle = '#00D4FF';
      rctx.font = 'bold 16px Cairo, sans-serif';
      rctx.textAlign = 'right';
      rctx.fillText(watermarkText || '🎯 تحليل DZ — لقطة تكتيكية', w - 20, h - 17);

      const tStr = formatTime(video.currentTime || 0);
      rctx.fillStyle = '#94a3b8';
      rctx.font = '14px Cairo, sans-serif';
      rctx.textAlign = 'left';
      rctx.fillText(`⏱️ توقيت اللقطة: ${tStr}`, 20, h - 17);
    }

    clipRecordingAnimId = requestAnimationFrame(renderRecFrame);
  }

  clipRecordingAnimId = requestAnimationFrame(renderRecFrame);

  // Timer countdown
  if (timerText) {
    timerText.textContent = duration > 0
      ? `🔴 جاري تسجيل اللقطة... 00:00 / 00:${duration.toString().padStart(2, '0')}`
      : `🔴 جاري التسجيل المباشر... 00:00`;
  }

  clipRecordingTimer = setInterval(() => {
    elapsed++;
    const elStr = `00:${elapsed.toString().padStart(2, '0')}`;
    if (timerText) {
      timerText.textContent = duration > 0
        ? `🔴 جاري تسجيل اللقطة... ${elStr} / 00:${duration.toString().padStart(2, '0')}`
        : `🔴 جاري التسجيل المباشر... ${elStr}`;
    }

    if (duration > 0 && elapsed >= duration) {
      stopVideoClipExport();
    }
  }, 1000);

  showToast('🔴 بدأ تسجيل لقطة الفيديو مع الرسومات التكتيكية...', 'info');
}

function stopVideoClipExport() {
  if (clipMediaRecorder && clipMediaRecorder.state !== 'inactive') {
    clipMediaRecorder.stop();
  }
}


