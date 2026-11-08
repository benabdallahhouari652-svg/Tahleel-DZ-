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

