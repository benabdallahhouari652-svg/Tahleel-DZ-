/**
 * تحليل DZ — Tagging Module
 * Tag types management, export, filtering
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  initTaggingExport();
});

function initTaggingExport() {
  // Handled in app.js - just ensure sport change updates both views
  document.addEventListener('change', e => {
    if (e.target.id === 'sportSelect' || e.target.id === 'pitchSport') {
      if (AppState.currentView === 'tagging') {
        renderLiveTagButtons && renderLiveTagButtons();
        renderHotkeyMap && renderHotkeyMap();
        renderTagBuilderGrid && renderTagBuilderGrid();
      }
    }
  });
}
