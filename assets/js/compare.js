/**
 * تحليل DZ — Video Comparison Module
 * Side-by-side synchronized video playback with offset control
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  initCompareModule();
});

function initCompareModule() {
  const videoA = document.getElementById('videoA');
  const videoB = document.getElementById('videoB');
  const uploadA = document.getElementById('compareUploadA');
  const uploadB = document.getElementById('compareUploadB');
  const fileA = document.getElementById('compareFileA');
  const fileB = document.getElementById('compareFileB');

  if (!videoA || !videoB) return;

  // File Loading
  fileA?.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    videoA.src = URL.createObjectURL(file);
    videoA.style.display = 'block';
    if (uploadA) uploadA.style.display = 'none';
    showToast(`تم تحميل الفيديو A: ${file.name}`, 'success');
  });

  fileB?.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    videoB.src = URL.createObjectURL(file);
    videoB.style.display = 'block';
    if (uploadB) uploadB.style.display = 'none';
    showToast(`تم تحميل الفيديو B: ${file.name}`, 'success');
  });

  // Demo Videos for Comparison
  document.getElementById('loadDemoCompareBtn')?.addEventListener('click', () => {
    videoA.src = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
    videoA.style.display = 'block';
    if (uploadA) uploadA.style.display = 'none';

    videoB.src = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4';
    videoB.style.display = 'block';
    if (uploadB) uploadB.style.display = 'none';

    showToast('⚡ تم تحميل فيديوهين تجريبيين بنجاح! اضغط على "تشغيل المزامن" لمشاهدتهما معاً', 'success');
  });

  // Sync Play/Pause
  document.getElementById('syncPlayPause')?.addEventListener('click', () => {
    const offset = parseFloat(document.getElementById('syncOffset')?.value || 0);
    const btn = document.getElementById('syncPlayPause');

    if (videoA.paused) {
      videoA.play();
      if (videoB.src) {
        setTimeout(() => videoB.play(), Math.max(0, offset * 1000));
      }
      btn.textContent = '⏸ إيقاف المزامنة';
    } else {
      videoA.pause();
      videoB.pause();
      btn.textContent = '▶ تشغيل المزامن';
    }
  });

  // Sync Reset
  document.getElementById('syncReset')?.addEventListener('click', () => {
    videoA.currentTime = 0;
    videoB.currentTime = 0;
    videoA.pause();
    videoB.pause();
    document.getElementById('syncPlayPause').textContent = '▶ تشغيل المزامن';
    showToast('تم إعادة ضبط المزامنة', 'info');
  });

  // Sync B with A during playback
  videoA.addEventListener('timeupdate', () => {
    if (!videoB.src || videoA.paused) return;
    const offset = parseFloat(document.getElementById('syncOffset')?.value || 0);
    const diff = Math.abs(videoA.currentTime - videoB.currentTime - offset);
    if (diff > 0.3) {
      videoB.currentTime = Math.max(0, videoA.currentTime - offset);
    }
  });

  // Mode toggle
  document.getElementById('sideBySideBtn')?.addEventListener('click', () => {
    setSyncMode('side');
  });
  document.getElementById('overlayBtn')?.addEventListener('click', () => {
    setSyncMode('overlay');
  });
}

function setSyncMode(mode) {
  const container = document.getElementById('compareVideos');
  const sideBySideBtn = document.getElementById('sideBySideBtn');
  const overlayBtn = document.getElementById('overlayBtn');

  if (mode === 'overlay') {
    container.style.gridTemplateColumns = '1fr';
    document.getElementById('compareSlotB').style.display = 'none';
    document.getElementById('compareSlotA').style.opacity = '0.6';
    overlayBtn.classList.add('btn--primary');
    overlayBtn.classList.remove('btn--ghost');
    sideBySideBtn.classList.remove('btn--primary');
    sideBySideBtn.classList.add('btn--ghost');
    showToast('وضع التراكب — قريباً', 'info');
  } else {
    container.style.gridTemplateColumns = '1fr 40px 1fr';
    document.getElementById('compareSlotB').style.display = '';
    document.getElementById('compareSlotA').style.opacity = '1';
    sideBySideBtn.classList.add('btn--primary');
    sideBySideBtn.classList.remove('btn--ghost');
    overlayBtn.classList.remove('btn--primary');
    overlayBtn.classList.add('btn--ghost');
  }
}
