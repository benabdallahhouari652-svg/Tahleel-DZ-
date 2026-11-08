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
  undoStack: []
};

// ── Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initVideoLoader();
  initDrawingTools();
  initSpeedControls();
  initTimelineInteraction();
  initClipList();
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
      showToast('⚡ تم تشغيل الفيديو التجريبي بنجاح! يمكنك الآن تجربة الرسم والتنقل', 'success');
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
    showToast(`تم تحميل: ${file.name}`, 'success');
  });

  video.addEventListener('timeupdate', () => {
    const pct = (video.currentTime / video.duration) * 100;
    const playhead = document.getElementById('tlPlayhead');
    if (playhead) playhead.style.right = `${pct}%`;
    document.getElementById('tlCurrentTime').textContent = formatTime(video.currentTime);
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

// ── Clip List ─────────────────────────────────────────────
function initClipList() {
  document.querySelectorAll('.clip-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.clip-item').forEach(c => c.classList.remove('active'));
      item.classList.add('active');
      const video = document.getElementById('mainVideo');
      if (video && !video.paused) {
        const time = parseFloat(item.dataset.time || 0);
        video.currentTime = time;
      }
    });
  });

  document.getElementById('addClipBtn')?.addEventListener('click', () => {
    document.getElementById('videoFileInput')?.click();
  });
}

// ── Drawing Tools ─────────────────────────────────────────
function initDrawingTools() {
  const canvas = document.getElementById('drawCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Tool selection
  document.querySelectorAll('.draw-tool[data-tool]').forEach(btn => {
    btn.addEventListener('click', () => {
      VideoState.currentTool = btn.dataset.tool;
      document.querySelectorAll('.draw-tool[data-tool]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
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

  // Color & line width
  document.getElementById('drawColor')?.addEventListener('input', e => {
    VideoState.drawColor = e.target.value;
  });
  document.getElementById('drawLineWidth')?.addEventListener('change', e => {
    VideoState.drawLineWidth = parseInt(e.target.value);
  });

  // Undo
  document.getElementById('undoBtn')?.addEventListener('click', () => {
    VideoState.undoStack.pop();
    redrawCanvas(ctx, canvas);
  });

  // Clear
  document.getElementById('clearCanvasBtn')?.addEventListener('click', () => {
    VideoState.undoStack = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    showToast('تم مسح الرسم', 'info');
  });

  // Mouse events
  canvas.addEventListener('mousedown', e => onDrawStart(e, canvas, ctx));
  canvas.addEventListener('mousemove', e => onDrawMove(e, canvas, ctx));
  canvas.addEventListener('mouseup', e => onDrawEnd(e, canvas, ctx));
  canvas.addEventListener('mouseleave', () => { VideoState.isMouseDown = false; });

  // Touch events
  canvas.addEventListener('touchstart', e => { e.preventDefault(); onDrawStart(toMouseEv(e), canvas, ctx); }, { passive: false });
  canvas.addEventListener('touchmove', e => { e.preventDefault(); onDrawMove(toMouseEv(e), canvas, ctx); }, { passive: false });
  canvas.addEventListener('touchend', e => { e.preventDefault(); onDrawEnd(toMouseEv(e), canvas, ctx); }, { passive: false });
}

function toMouseEv(e) {
  const t = e.touches[0] || e.changedTouches[0];
  return { clientX: t.clientX, clientY: t.clientY };
}

function getPos(e, canvas) {
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function onDrawStart(e, canvas, ctx) {
  if (!VideoState.isDrawing) return;
  VideoState.isMouseDown = true;
  const { x, y } = getPos(e, canvas);
  VideoState.startX = x;
  VideoState.startY = y;

  if (VideoState.currentTool === 'freehand') {
    VideoState.currentPath = [{ x, y }];
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

  if (VideoState.currentTool === 'freehand') {
    VideoState.currentPath.push({ x, y });
    ctx.beginPath();
    ctx.moveTo(VideoState.currentPath[0].x, VideoState.currentPath[0].y);
    VideoState.currentPath.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.stroke();
  } else {
    drawShape(ctx, VideoState.currentTool, VideoState.startX, VideoState.startY, x, y);
  }
}

function onDrawEnd(e, canvas, ctx) {
  if (!VideoState.isDrawing || !VideoState.isMouseDown) return;
  VideoState.isMouseDown = false;
  const { x, y } = getPos(e, canvas);

  const shape = {
    tool: VideoState.currentTool,
    color: VideoState.drawColor,
    lineWidth: VideoState.drawLineWidth,
    x1: VideoState.startX, y1: VideoState.startY,
    x2: x, y2: y,
    path: VideoState.currentPath ? [...VideoState.currentPath] : null
  };

  VideoState.undoStack.push(shape);
  VideoState.currentPath = null;
  redrawCanvas(ctx, canvas);
}

function redrawCanvas(ctx, canvas) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  VideoState.undoStack.forEach(shape => {
    ctx.strokeStyle = shape.color;
    ctx.lineWidth = shape.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (shape.tool === 'freehand' && shape.path) {
      ctx.beginPath();
      ctx.moveTo(shape.path[0].x, shape.path[0].y);
      shape.path.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke();
    } else {
      drawShape(ctx, shape.tool, shape.x1, shape.y1, shape.x2, shape.y2);
    }
  });
}

function drawShape(ctx, tool, x1, y1, x2, y2) {
  ctx.beginPath();
  switch (tool) {
    case 'line':
      ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); break;

    case 'arrow': {
      const dx = x2 - x1, dy = y2 - y1;
      const angle = Math.atan2(dy, dx);
      const headLen = 16;
      ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI/6), y2 - headLen * Math.sin(angle - Math.PI/6));
      ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI/6), y2 - headLen * Math.sin(angle + Math.PI/6));
      ctx.closePath();
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fill();
      break;
    }

    case 'circle': {
      const rx = Math.abs(x2 - x1) / 2, ry = Math.abs(y2 - y1) / 2;
      const cx = x1 + (x2 - x1) / 2, cy = y1 + (y2 - y1) / 2;
      ctx.ellipse(cx, cy, rx || 1, ry || 1, 0, 0, 2 * Math.PI);
      ctx.stroke(); break;
    }

    case 'rect':
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1); break;

    case 'text': {
      ctx.font = `bold ${ctx.lineWidth * 4}px Cairo, sans-serif`;
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fillText('نص', x1, y1);
      break;
    }
  }
}
