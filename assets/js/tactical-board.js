/**
 * تحليل DZ — Tactical Board & Training Studio Module (v2.0)
 * Professional Tactical Board with Advanced Training Equipment, Curved & Dribble Arrows,
 * Presets, HD Image Export, Local Library, and Keyframe Animations.
 */

'use strict';

// ── Tactical Board State ──────────────────────────────────────────────────
const TacState = {
  tool: 'select',
  sport: 'soccer',
  pitchView: 'full', // 'full' or 'half'
  elements: [],
  selected: null,
  dragging: false,
  dragOffsetX: 0,
  dragOffsetY: 0,

  // Path drawing state
  arrowStart: null,
  zoneStart: null,
  freehandPoints: [],
  curveDragging: false,

  // History for Undo / Redo
  history: [],
  redoHistory: [],

  // Keyframe Animations
  animFrames: [],
  currentFrame: 0,
  animPlaying: false,
  animTimer: null,

  // Metadata
  planName: 'خطة تدريبية تكتيكية',
  coachName: 'كابتن الفريق',
  coachNotes: '',
};

let tacCanvas, tacCtx, pitchW, pitchH;

// ── Built-in Tactical & Training Presets ──────────────────────────────────
const BUILTIN_DRILLS = [
  {
    id: 'drill_triangle',
    name: 'تمرير مثلثي وتبادل مراكز',
    category: 'تمرير ورشاقة',
    sport: 'soccer',
    pitchView: 'half',
    desc: '3 لاعبين في مثلث - تمرير دوراني سريع مع الجري وتغيير المركز بعد التمرير.',
    notes: 'التركيز على دقة التمريرة من لمسة واحدة (One-Touch) وسرعة فتح زاوية التمرير.',
    elements: [
      { id: 'c1', type: 'equipment', equipType: 'cone', xRel: 0.35, yRel: 0.35, rotation: 0 },
      { id: 'c2', type: 'equipment', equipType: 'cone', xRel: 0.55, yRel: 0.35, rotation: 0 },
      { id: 'c3', type: 'equipment', equipType: 'cone', xRel: 0.45, yRel: 0.65, rotation: 0 },
      { id: 'p1', type: 'player', team: 'home', num: '8', name: 'وسط', xRel: 0.35, yRel: 0.35, color: '#00D4FF' },
      { id: 'p2', type: 'player', team: 'home', num: '10', name: 'صانع', xRel: 0.55, yRel: 0.35, color: '#00D4FF' },
      { id: 'p3', type: 'player', team: 'home', num: '6', name: 'ارتكاز', xRel: 0.45, yRel: 0.65, color: '#00D4FF' },
      { id: 'b1', type: 'ball', xRel: 0.38, yRel: 0.35 },
      { id: 'a1', type: 'arrow-pass', x1Rel: 0.38, y1Rel: 0.35, x2Rel: 0.52, y2Rel: 0.35, color: '#FFD166', dashed: true },
      { id: 'a2', type: 'arrow-pass', x1Rel: 0.55, y1Rel: 0.38, x2Rel: 0.47, y2Rel: 0.62, color: '#FFD166', dashed: true },
      { id: 'a3', type: 'arrow-curve', x1Rel: 0.45, y1Rel: 0.62, x2Rel: 0.37, y2Rel: 0.38, cxRel: 0.38, cyRel: 0.55, color: '#10B981' },
      { id: 'lbl1', type: 'text', xRel: 0.45, yRel: 0.15, text: 'تمرير مثلثي سريع (One-Touch)', color: '#FACC15', fontSize: 13 },
    ]
  },
  {
    id: 'drill_finish_minigoal',
    name: 'مراوغة وإنهاء على المرمى المصغر',
    category: 'إنهاء وتسديد',
    sport: 'soccer',
    pitchView: 'half',
    desc: 'مراوغة بالكرة بين الحواجز والأعمدة ثم تسديد دقيق على مرمى صغير.',
    notes: 'تطوير سرعة تغيير الاتجاه وحسم الهجمة أمام المرمى المصغر.',
    elements: [
      { id: 'mg1', type: 'equipment', equipType: 'minigoal', xRel: 0.82, yRel: 0.50, rotation: 0 },
      { id: 'pol1', type: 'equipment', equipType: 'pole', xRel: 0.35, yRel: 0.45, rotation: 0 },
      { id: 'pol2', type: 'equipment', equipType: 'pole', xRel: 0.45, yRel: 0.55, rotation: 0 },
      { id: 'pol3', type: 'equipment', equipType: 'pole', xRel: 0.55, yRel: 0.45, rotation: 0 },
      { id: 'p1', type: 'player', team: 'home', num: '9', name: 'مهاجم', xRel: 0.20, yRel: 0.50, color: '#00D4FF' },
      { id: 'b1', type: 'ball', xRel: 0.23, yRel: 0.50 },
      { id: 'drib1', type: 'arrow-dribble', x1Rel: 0.24, y1Rel: 0.50, x2Rel: 0.64, y2Rel: 0.50, color: '#FF8C42' },
      { id: 'shot1', type: 'arrow-move', x1Rel: 0.65, y1Rel: 0.50, x2Rel: 0.80, y2Rel: 0.50, color: '#00D4FF' },
      { id: 'lbl2', type: 'text', xRel: 0.50, yRel: 0.18, text: 'إنهاء سريع على المرمى الصغير 🥅', color: '#10B981', fontSize: 13 },
    ]
  },
  {
    id: 'drill_speed_ladder',
    name: 'سلم السرعة والحواجز التوافقية',
    category: 'لياقة وتوافق',
    sport: 'soccer',
    pitchView: 'half',
    desc: 'تمرين الرشاقة بالقدمين عبر سلم السرعة ثم القفز المتتالي فوق الحواجز.',
    notes: 'تحسين التوافق العصبي العضلي وسرعة رد الفعل وسرعة الخطوة.',
    elements: [
      { id: 'lad1', type: 'equipment', equipType: 'ladder', xRel: 0.38, yRel: 0.50, rotation: 0 },
      { id: 'hur1', type: 'equipment', equipType: 'hurdle', xRel: 0.55, yRel: 0.50, rotation: 0 },
      { id: 'hur2', type: 'equipment', equipType: 'hurdle', xRel: 0.63, yRel: 0.50, rotation: 0 },
      { id: 'hur3', type: 'equipment', equipType: 'hurdle', xRel: 0.71, yRel: 0.50, rotation: 0 },
      { id: 'c1', type: 'equipment', equipType: 'cone', xRel: 0.25, yRel: 0.50, rotation: 0 },
      { id: 'c2', type: 'equipment', equipType: 'cone', xRel: 0.80, yRel: 0.50, rotation: 0 },
      { id: 'p1', type: 'player', team: 'home', num: '7', name: 'جناح', xRel: 0.22, yRel: 0.50, color: '#00D4FF' },
      { id: 'run1', type: 'arrow-move', x1Rel: 0.26, y1Rel: 0.50, x2Rel: 0.78, y2Rel: 0.50, color: '#00D4FF' },
      { id: 'lbl3', type: 'text', xRel: 0.50, yRel: 0.20, text: 'تمرين الرشاقة وسلالم السرعة ⚡', color: '#FACC15', fontSize: 13 },
    ]
  },
  {
    id: 'drill_freekick_wall',
    name: 'حائط الصد وركلات ثابتة مقوسة',
    category: 'كرات ثابتة',
    sport: 'soccer',
    pitchView: 'half',
    desc: 'دمى دفاعية تشكل حائط الصد أمام المرمى مع تدريب التسديد المقوس.',
    notes: 'تدريب مسار الكرة اللولبي (Curved Free-Kick) فوق أو حول حائط الصد نحو زاوية المرمى.',
    elements: [
      { id: 'gk1', type: 'player', team: 'gk', num: '1', name: 'GK', xRel: 0.88, yRel: 0.50, color: '#FACC15' },
      { id: 'm1', type: 'equipment', equipType: 'mannequin', xRel: 0.70, yRel: 0.42, rotation: 0 },
      { id: 'm2', type: 'equipment', equipType: 'mannequin', xRel: 0.70, yRel: 0.48, rotation: 0 },
      { id: 'm3', type: 'equipment', equipType: 'mannequin', xRel: 0.70, yRel: 0.54, rotation: 0 },
      { id: 'm4', type: 'equipment', equipType: 'mannequin', xRel: 0.70, yRel: 0.60, rotation: 0 },
      { id: 'p1', type: 'player', team: 'home', num: '10', name: 'المسدد', xRel: 0.48, yRel: 0.52, color: '#00D4FF' },
      { id: 'b1', type: 'ball', xRel: 0.51, yRel: 0.52 },
      { id: 'curve1', type: 'arrow-curve', x1Rel: 0.52, y1Rel: 0.52, x2Rel: 0.88, y2Rel: 0.44, cxRel: 0.68, cyRel: 0.32, color: '#10B981' },
      { id: 'lbl4', type: 'text', xRel: 0.50, yRel: 0.15, text: 'ركلة حرة مقوسة حول حائط الصد ⚽🎯', color: '#00D4FF', fontSize: 13 },
    ]
  },
  {
    id: 'drill_gk_reflex_cross',
    name: 'حراسة المرمى: ردة الفعل والخروج للعرضيات 🧤',
    category: 'تدريب حراس المرمى',
    sport: 'soccer',
    pitchView: 'half',
    desc: 'تمرين حراسة مرمى تخصصي: تصدٍّ سريع لتسديدة أرضية قريبة يعقبه خروج حاسم لالتقاط كرة عرضية عالية.',
    notes: 'إعداد كابتن الهواري بن عبد الله (مدرب حراس مرمى): التركيز على خطوة الصد السريعة والانقضاض بقبضة اليد.',
    elements: [
      { id: 'gk1', type: 'player', team: 'gk', num: '1', name: 'الحارس', xRel: 0.88, yRel: 0.50, color: '#FACC15' },
      { id: 'c1', type: 'equipment', equipType: 'cone', xRel: 0.82, yRel: 0.42, rotation: 0 },
      { id: 'c2', type: 'equipment', equipType: 'cone', xRel: 0.82, yRel: 0.58, rotation: 0 },
      { id: 'hur1', type: 'equipment', equipType: 'hurdle', xRel: 0.85, yRel: 0.49, rotation: 90 },
      { id: 'p_wing', type: 'player', team: 'away', num: '7', name: 'جناح عرضيات', xRel: 0.65, yRel: 0.22, color: '#FF6B6B' },
      { id: 'p_striker', type: 'player', team: 'away', num: '9', name: 'مهاجم', xRel: 0.76, yRel: 0.50, color: '#FF6B6B' },
      { id: 'b_cross', type: 'ball', xRel: 0.67, yRel: 0.22 },
      { id: 'cross_arc', type: 'arrow-curve', x1Rel: 0.68, y1Rel: 0.24, x2Rel: 0.84, y2Rel: 0.46, cxRel: 0.72, cyRel: 0.38, color: '#10B981' },
      { id: 'gk_move', type: 'arrow-move', x1Rel: 0.88, y1Rel: 0.50, x2Rel: 0.84, y2Rel: 0.47, color: '#FACC15' },
      { id: 'lbl_gk', type: 'text', xRel: 0.55, yRel: 0.12, text: '🧤 تمرين حراس المرمى: خروج هوائي وتصدي مزدوج', color: '#FACC15', fontSize: 13 }
    ]
  }
];

// ── Lifecycle & Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  tacCanvas = document.getElementById('pitchCanvas');
  if (!tacCanvas) return;
  tacCtx = tacCanvas.getContext('2d');
  initTacticalBoard();
});

function initTacticalBoard() {
  resizePitch();
  window.addEventListener('resize', resizePitch);

  // Hook into view changes if possible
  const origSwitchView = window.switchView;
  if (origSwitchView) {
    window.switchView = function(viewId) {
      origSwitchView(viewId);
      if (viewId === 'tactical') {
        setTimeout(resizePitch, 50);
      }
    };
  }

  setupToolbarButtons();
  setupHeaderControls();
  setupCanvasEvents();
  setupFloatingInspector();
  setupAnimationControls();
  setupModals();
  setupKeyboardShortcuts();

  // Load default formation (4-3-3)
  applyFormation();
}

// ── Pitch Resize & Retina Support ─────────────────────────────────────────
function resizePitch() {
  const wrapper = document.getElementById('pitchWrapper');
  if (!wrapper || !tacCanvas) return;

  const sport = TacState.sport || 'soccer';
  const isHalf = TacState.pitchView === 'half';

  // Base aspect ratios
  const aspects = {
    soccer: isHalf ? 68 / 52.5 : 105 / 68,
    basketball: 28 / 15,
    handball: 40 / 20,
    volleyball: 18 / 9,
    rugby: 100 / 70,
  };
  const aspect = aspects[sport] || (105 / 68);

  const maxW = Math.max(300, wrapper.clientWidth - 40);
  const maxH = Math.max(200, wrapper.clientHeight - 40);
  let w = maxW;
  let h = w / aspect;
  if (h > maxH) { h = maxH; w = h * aspect; }

  const dpr = window.devicePixelRatio || 1;
  pitchW = Math.round(w);
  pitchH = Math.round(h);

  tacCanvas.width = Math.round(pitchW * dpr);
  tacCanvas.height = Math.round(pitchH * dpr);
  tacCanvas.style.width = `${pitchW}px`;
  tacCanvas.style.height = `${pitchH}px`;

  tacCtx.resetTransform();
  tacCtx.scale(dpr, dpr);

  drawEverything();
}

// ── Setup Toolbar Buttons ─────────────────────────────────────────────────
function setupToolbarButtons() {
  document.querySelectorAll('.tac-tool[data-tac-tool], .tac-tool-mini[data-tac-tool]').forEach(btn => {
    btn.addEventListener('click', () => {
      TacState.tool = btn.dataset.tacTool;
      document.querySelectorAll('.tac-tool, .tac-tool-mini').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      if (TacState.tool !== 'select') {
        hideInspector();
        TacState.selected = null;
        drawEverything();
      }
    });
  });

  document.getElementById('applyFormationBtn')?.addEventListener('click', applyFormation);

  document.getElementById('openDrillsPresetBtn')?.addEventListener('click', () => {
    openPlansLibrary('presets');
  });
}

// ── Setup Header Controls ─────────────────────────────────────────────────
function setupHeaderControls() {
  // Sport change
  document.getElementById('pitchSport')?.addEventListener('change', e => {
    TacState.sport = e.target.value;
    pushHistory();
    resizePitch();
    if (window.showToast) window.showToast(`تم تحميل ملعب: ${e.target.options[e.target.selectedIndex].text}`, 'info');
  });

  // Pitch View change (Full vs Half)
  document.getElementById('pitchViewSelect')?.addEventListener('change', e => {
    TacState.pitchView = e.target.value;
    pushHistory();
    resizePitch();
    if (window.showToast) window.showToast(`تم ضبط العرض: ${e.target.options[e.target.selectedIndex].text}`, 'info');
  });

  // Undo / Redo
  document.getElementById('tacUndoBtn')?.addEventListener('click', undo);
  document.getElementById('tacRedoBtn')?.addEventListener('click', redo);

  // Clear
  document.getElementById('clearPitchBtn')?.addEventListener('click', () => {
    if (confirm('هل أنت متأكد من مسح جميع عناصر اللوحة؟')) {
      pushHistory();
      TacState.elements = [];
      TacState.animFrames = [];
      hideInspector();
      drawEverything();
      if (window.showToast) window.showToast('تم مسح اللوحة بالكامل', 'info');
    }
  });

  // Library & Save
  document.getElementById('openLibraryBtn')?.addEventListener('click', () => openPlansLibrary('saved'));
  document.getElementById('savePlanModalBtn')?.addEventListener('click', openSavePlanModal);

  // HD Image Export
  document.getElementById('exportPitchHdBtn')?.addEventListener('click', exportPitchHD);

  // More Menu Dropdown
  const moreBtn = document.getElementById('moreTacMenuBtn');
  const moreMenu = document.getElementById('moreTacMenu');
  if (moreBtn && moreMenu) {
    moreBtn.addEventListener('click', e => {
      e.stopPropagation();
      moreMenu.style.display = moreMenu.style.display === 'none' ? 'flex' : 'none';
    });
    document.addEventListener('click', () => { moreMenu.style.display = 'none'; });
  }

  // JSON Export / Import / Print
  document.getElementById('exportJsonBtn')?.addEventListener('click', exportJSON);
  document.getElementById('importJsonBtn')?.addEventListener('click', () => {
    document.getElementById('tacFileInput')?.click();
  });
  document.getElementById('tacFileInput')?.addEventListener('change', importJSON);
  document.getElementById('printTacBtn')?.addEventListener('click', printTacticalPlan);

  // Quick Notes Input
  const quickNotes = document.getElementById('quickNotesInput');
  if (quickNotes) {
    quickNotes.addEventListener('input', e => {
      TacState.coachNotes = e.target.value;
    });
  }
}

// ── Setup Canvas Events ───────────────────────────────────────────────────
function setupCanvasEvents() {
  tacCanvas.addEventListener('mousedown', onTacMouseDown);
  tacCanvas.addEventListener('mousemove', onTacMouseMove);
  tacCanvas.addEventListener('mouseup', onTacMouseUp);
  tacCanvas.addEventListener('dblclick', onTacDblClick);

  // Touch Support
  tacCanvas.addEventListener('touchstart', e => {
    e.preventDefault();
    onTacMouseDown(toME(e));
  }, { passive: false });

  tacCanvas.addEventListener('touchmove', e => {
    e.preventDefault();
    onTacMouseMove(toME(e));
  }, { passive: false });

  tacCanvas.addEventListener('touchend', e => {
    e.preventDefault();
    onTacMouseUp(toME(e));
  }, { passive: false });
}

function toME(e) {
  const t = e.touches[0] || e.changedTouches[0];
  return { clientX: t.clientX, clientY: t.clientY };
}

function getTacPos(e) {
  const rect = tacCanvas.getBoundingClientRect();
  return {
    x: Math.round(e.clientX - rect.left),
    y: Math.round(e.clientY - rect.top)
  };
}

// ── Canvas Interaction Handlers ───────────────────────────────────────────
function onTacMouseDown(e) {
  const pos = getTacPos(e);
  const tool = TacState.tool;

  if (tool === 'select') {
    const hit = hitTest(pos);
    TacState.selected = hit || null;
    if (hit) {
      pushHistory();
      TacState.dragging = true;
      TacState.dragOffsetX = pos.x - (hit.x !== undefined ? hit.x : (hit.x1 || 0));
      TacState.dragOffsetY = pos.y - (hit.y !== undefined ? hit.y : (hit.y1 || 0));
      showInspector(hit);
    } else {
      hideInspector();
    }
    drawEverything();
  } else if (tool === 'eraser') {
    const hit = hitTest(pos);
    if (hit) {
      pushHistory();
      TacState.elements = TacState.elements.filter(el => el !== hit);
      if (TacState.selected === hit) {
        TacState.selected = null;
        hideInspector();
      }
      drawEverything();
      if (window.showToast) window.showToast('تم حذف العنصر', 'info');
    }
  } else if (tool === 'player-home' || tool === 'player-away' || tool === 'goalkeeper') {
    pushHistory();
    const isGk = tool === 'goalkeeper';
    const team = isGk ? 'gk' : (tool === 'player-home' ? 'home' : 'away');
    const sameTeamCount = TacState.elements.filter(el => el.type === 'player' && el.team === team).length;
    const newPlayer = {
      id: `p_${Date.now()}`,
      type: 'player',
      team,
      x: pos.x,
      y: pos.y,
      num: isGk ? '1' : `${sameTeamCount + 1}`,
      name: isGk ? 'GK' : '',
      color: isGk ? '#FACC15' : (team === 'home' ? '#00D4FF' : '#FF6B6B')
    };
    TacState.elements.push(newPlayer);
    TacState.selected = newPlayer;
    showInspector(newPlayer);
    drawEverything();
  } else if (tool === 'ball') {
    pushHistory();
    const newBall = { id: `b_${Date.now()}`, type: 'ball', x: pos.x, y: pos.y };
    TacState.elements.push(newBall);
    TacState.selected = newBall;
    showInspector(newBall);
    drawEverything();
  } else if (tool.startsWith('equip-')) {
    pushHistory();
    const equipType = tool.replace('equip-', '');
    const newEquip = {
      id: `eq_${Date.now()}`,
      type: 'equipment',
      equipType,
      x: pos.x,
      y: pos.y,
      rotation: 0,
      scale: 1,
      label: ''
    };
    TacState.elements.push(newEquip);
    TacState.selected = newEquip;
    showInspector(newEquip);
    drawEverything();
  } else if (tool === 'arrow-move' || tool === 'arrow-pass' || tool === 'arrow-curve' || tool === 'arrow-dribble') {
    TacState.arrowStart = pos;
  } else if (tool === 'zone') {
    TacState.zoneStart = pos;
  } else if (tool === 'freehand') {
    TacState.freehandPoints = [pos];
  } else if (tool === 'text') {
    const text = prompt('أدخل النص التكتيكي / الملاحظة:', 'ضغط عالي');
    if (text && text.trim()) {
      pushHistory();
      const newText = {
        id: `txt_${Date.now()}`,
        type: 'text',
        x: pos.x,
        y: pos.y,
        text: text.trim(),
        color: '#FACC15',
        fontSize: 13
      };
      TacState.elements.push(newText);
      TacState.selected = newText;
      showInspector(newText);
      drawEverything();
    }
  }
}

function onTacMouseMove(e) {
  const pos = getTacPos(e);
  const tool = TacState.tool;

  if (TacState.dragging && TacState.selected) {
    const el = TacState.selected;
    if (el.x !== undefined) {
      el.x = pos.x - TacState.dragOffsetX;
      el.y = pos.y - TacState.dragOffsetY;
    } else if (el.x1 !== undefined && el.x2 !== undefined) {
      const dx = el.x2 - el.x1;
      const dy = el.y2 - el.y1;
      el.x1 = pos.x - TacState.dragOffsetX;
      el.y1 = pos.y - TacState.dragOffsetY;
      el.x2 = el.x1 + dx;
      el.y2 = el.y1 + dy;
      if (el.cx !== undefined) {
        el.cx = (el.x1 + el.x2) / 2;
        el.cy = (el.y1 + el.y2) / 2;
      }
    }
    drawEverything();
  } else if (TacState.arrowStart) {
    drawEverything();
    const start = TacState.arrowStart;
    if (tool === 'arrow-move') {
      drawArrow(tacCtx, start.x, start.y, pos.x, pos.y, '#00D4FF', false);
    } else if (tool === 'arrow-pass') {
      drawArrow(tacCtx, start.x, start.y, pos.x, pos.y, '#FFD166', true);
    } else if (tool === 'arrow-curve') {
      const mx = (start.x + pos.x) / 2;
      const my = (start.y + pos.y) / 2;
      const dx = pos.x - start.x;
      const dy = pos.y - start.y;
      const cx = mx - dy * 0.3;
      const cy = my + dx * 0.3;
      drawCurvedArrow(tacCtx, start.x, start.y, pos.x, pos.y, cx, cy, '#10B981');
    } else if (tool === 'arrow-dribble') {
      drawDribbleArrow(tacCtx, start.x, start.y, pos.x, pos.y, '#FF8C42');
    }
  } else if (TacState.zoneStart) {
    drawEverything();
    const start = TacState.zoneStart;
    drawZone(tacCtx, start.x, start.y, pos.x, pos.y, 'rgba(0, 212, 255, 0.25)');
  } else if (TacState.freehandPoints.length > 0) {
    TacState.freehandPoints.push(pos);
    drawEverything();
    drawFreehand(tacCtx, TacState.freehandPoints, '#A78BFA', 3);
  }
}

function onTacMouseUp(e) {
  const pos = getTacPos(e);
  TacState.dragging = false;

  if (TacState.arrowStart) {
    const start = TacState.arrowStart;
    const dist = Math.hypot(pos.x - start.x, pos.y - start.y);
    if (dist > 10) {
      pushHistory();
      const tool = TacState.tool;
      let newElement;
      if (tool === 'arrow-curve') {
        const mx = (start.x + pos.x) / 2;
        const my = (start.y + pos.y) / 2;
        const dx = pos.x - start.x;
        const dy = pos.y - start.y;
        const cx = mx - dy * 0.3;
        const cy = my + dx * 0.3;
        newElement = {
          id: `arr_${Date.now()}`,
          type: 'arrow-curve',
          x1: start.x, y1: start.y,
          x2: pos.x, y2: pos.y,
          cx, cy,
          color: '#10B981',
          strokeWidth: 3
        };
      } else if (tool === 'arrow-dribble') {
        newElement = {
          id: `drib_${Date.now()}`,
          type: 'arrow-dribble',
          x1: start.x, y1: start.y,
          x2: pos.x, y2: pos.y,
          color: '#FF8C42',
          strokeWidth: 2.5
        };
      } else {
        newElement = {
          id: `arr_${Date.now()}`,
          type: tool,
          x1: start.x, y1: start.y,
          x2: pos.x, y2: pos.y,
          color: tool === 'arrow-pass' ? '#FFD166' : '#00D4FF',
          strokeWidth: tool === 'arrow-pass' ? 2.5 : 3,
          dashed: tool === 'arrow-pass'
        };
      }
      TacState.elements.push(newElement);
      TacState.selected = newElement;
      showInspector(newElement);
    }
    TacState.arrowStart = null;
    drawEverything();
  } else if (TacState.zoneStart) {
    const start = TacState.zoneStart;
    if (Math.abs(pos.x - start.x) > 10 && Math.abs(pos.y - start.y) > 10) {
      pushHistory();
      const newZone = {
        id: `zn_${Date.now()}`,
        type: 'zone',
        x1: start.x, y1: start.y,
        x2: pos.x, y2: pos.y,
        color: 'rgba(0, 212, 255, 0.22)'
      };
      TacState.elements.push(newZone);
      TacState.selected = newZone;
      showInspector(newZone);
    }
    TacState.zoneStart = null;
    drawEverything();
  } else if (TacState.freehandPoints.length > 1) {
    pushHistory();
    const newFreehand = {
      id: `fh_${Date.now()}`,
      type: 'freehand',
      points: [...TacState.freehandPoints],
      color: '#A78BFA',
      strokeWidth: 3
    };
    TacState.elements.push(newFreehand);
    TacState.freehandPoints = [];
    TacState.selected = newFreehand;
    showInspector(newFreehand);
    drawEverything();
  }
}

function onTacDblClick(e) {
  const pos = getTacPos(e);
  const hit = hitTest(pos);
  if (hit) {
    if (hit.type === 'player') {
      const newNum = prompt('تعديل رقم اللاعب:', hit.num || '10');
      if (newNum !== null) {
        pushHistory();
        hit.num = newNum.trim();
        drawEverything();
        showInspector(hit);
      }
    } else if (hit.type === 'equipment') {
      pushHistory();
      hit.rotation = ((hit.rotation || 0) + Math.PI / 4) % (Math.PI * 2);
      drawEverything();
      showInspector(hit);
    } else if (hit.type === 'text') {
      const newTxt = prompt('تعديل النص:', hit.text || '');
      if (newTxt !== null) {
        pushHistory();
        hit.text = newTxt.trim();
        drawEverything();
        showInspector(hit);
      }
    }
  }
}

// ── Hit-Testing ───────────────────────────────────────────────────────────
function hitTest(pos) {
  // Check from topmost element downwards
  return TacState.elements.slice().reverse().find(el => {
    if (el.type === 'player') {
      return Math.hypot(pos.x - el.x, pos.y - el.y) <= 20;
    }
    if (el.type === 'ball') {
      return Math.hypot(pos.x - el.x, pos.y - el.y) <= 14;
    }
    if (el.type === 'equipment') {
      const bounds = {
        cone: 16, 'cone-yellow': 16, pole: 18, hurdle: 24,
        mannequin: 22, ladder: 35, minigoal: 28, ring: 18, marker: 14
      };
      const radius = bounds[el.equipType] || 20;
      return Math.hypot(pos.x - el.x, pos.y - el.y) <= radius;
    }
    if (el.type === 'text') {
      return Math.hypot(pos.x - el.x, pos.y - el.y) <= 30;
    }
    if (el.type === 'zone') {
      const minX = Math.min(el.x1, el.x2), maxX = Math.max(el.x1, el.x2);
      const minY = Math.min(el.y1, el.y2), maxY = Math.max(el.y1, el.y2);
      return pos.x >= minX && pos.x <= maxX && pos.y >= minY && pos.y <= maxY;
    }
    if (el.type.startsWith('arrow')) {
      const distStart = Math.hypot(pos.x - el.x1, pos.y - el.y1);
      const distEnd = Math.hypot(pos.x - el.x2, pos.y - el.y2);
      const distMid = el.cx ? Math.hypot(pos.x - el.cx, pos.y - el.cy) : 999;
      return distStart <= 15 || distEnd <= 15 || distMid <= 15;
    }
    return false;
  });
}

// ── Floating Inspector Controller ─────────────────────────────────────────
function setupFloatingInspector() {
  const inspector = document.getElementById('tacInspector');
  const numInput = document.getElementById('inspNumInput');
  const nameInput = document.getElementById('inspNameInput');
  const rotateBtn = document.getElementById('inspRotateBtn');
  const deleteBtn = document.getElementById('inspDeleteBtn');
  const closeBtn = document.getElementById('inspCloseBtn');

  numInput?.addEventListener('input', e => {
    if (TacState.selected && TacState.selected.type === 'player') {
      TacState.selected.num = e.target.value;
      drawEverything();
    }
  });

  nameInput?.addEventListener('input', e => {
    if (TacState.selected && TacState.selected.type === 'player') {
      TacState.selected.name = e.target.value;
      drawEverything();
    } else if (TacState.selected && TacState.selected.type === 'text') {
      TacState.selected.text = e.target.value;
      drawEverything();
    }
  });

  rotateBtn?.addEventListener('click', () => {
    if (TacState.selected && TacState.selected.type === 'equipment') {
      pushHistory();
      TacState.selected.rotation = ((TacState.selected.rotation || 0) + Math.PI / 4) % (Math.PI * 2);
      drawEverything();
    }
  });

  deleteBtn?.addEventListener('click', () => {
    if (TacState.selected) {
      pushHistory();
      TacState.elements = TacState.elements.filter(el => el !== TacState.selected);
      TacState.selected = null;
      hideInspector();
      drawEverything();
      if (window.showToast) window.showToast('تم حذف العنصر المحدد', 'info');
    }
  });

  closeBtn?.addEventListener('click', hideInspector);

  // Color picker dots
  document.querySelectorAll('.insp-colors .color-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      if (!TacState.selected) return;
      pushHistory();
      const color = dot.dataset.color;
      TacState.selected.color = color;
      drawEverything();
    });
  });
}

function showInspector(el) {
  const inspector = document.getElementById('tacInspector');
  if (!inspector || !el) return;

  const iconEl = document.getElementById('inspIcon');
  const numBox = document.getElementById('inspNumBox');
  const nameBox = document.getElementById('inspNameBox');
  const rotateBox = document.getElementById('inspRotateBox');
  const colorBox = document.getElementById('inspColorBox');

  const numInput = document.getElementById('inspNumInput');
  const nameInput = document.getElementById('inspNameInput');

  // Reset visibility
  numBox.style.display = 'none';
  nameBox.style.display = 'none';
  rotateBox.style.display = 'none';
  colorBox.style.display = 'flex';

  if (el.type === 'player') {
    iconEl.textContent = el.team === 'gk' ? '🧤' : (el.team === 'home' ? '🔵' : '🔴');
    numBox.style.display = 'flex';
    nameBox.style.display = 'flex';
    numInput.value = el.num || '';
    nameInput.value = el.name || '';
  } else if (el.type === 'ball') {
    iconEl.textContent = '⚽';
    colorBox.style.display = 'none';
  } else if (el.type === 'equipment') {
    const icons = {
      cone: '🔺', 'cone-yellow': '🟡', pole: '💈', hurdle: '🚧',
      mannequin: '🧍', ladder: '🪜', minigoal: '🥅', ring: '⭕', marker: '🔘'
    };
    iconEl.textContent = icons[el.equipType] || '🏋️';
    rotateBox.style.display = 'flex';
  } else if (el.type === 'text') {
    iconEl.textContent = '💬';
    nameBox.style.display = 'flex';
    nameInput.value = el.text || '';
  } else if (el.type.startsWith('arrow')) {
    iconEl.textContent = '➡️';
  } else if (el.type === 'zone') {
    iconEl.textContent = '🔲';
  } else {
    iconEl.textContent = '✏️';
  }

  inspector.style.display = 'flex';
}

function hideInspector() {
  const inspector = document.getElementById('tacInspector');
  if (inspector) inspector.style.display = 'none';
}

// ── Undo & Redo System ────────────────────────────────────────────────────
function pushHistory() {
  TacState.history.push(JSON.stringify(TacState.elements));
  if (TacState.history.length > 30) TacState.history.shift();
  TacState.redoHistory = [];
}

function undo() {
  if (TacState.history.length === 0) {
    if (window.showToast) window.showToast('لا توجد خطوات للتراجع', 'info');
    return;
  }
  TacState.redoHistory.push(JSON.stringify(TacState.elements));
  const prevState = TacState.history.pop();
  TacState.elements = JSON.parse(prevState);
  TacState.selected = null;
  hideInspector();
  drawEverything();
  if (window.showToast) window.showToast('تم التراجع ↩️', 'info');
}

function redo() {
  if (TacState.redoHistory.length === 0) {
    if (window.showToast) window.showToast('لا توجد خطوات للإعادة', 'info');
    return;
  }
  TacState.history.push(JSON.stringify(TacState.elements));
  const nextState = TacState.redoHistory.pop();
  TacState.elements = JSON.parse(nextState);
  TacState.selected = null;
  hideInspector();
  drawEverything();
  if (window.showToast) window.showToast('تمت الإعادة ↪️', 'info');
}

// ── Keyboard Shortcuts ────────────────────────────────────────────────────
function setupKeyboardShortcuts() {
  window.addEventListener('keydown', e => {
    // Only capture when active view is tactical and not typing inside an input
    const isTacticalView = document.getElementById('view-tactical')?.classList.contains('active');
    if (!isTacticalView) return;

    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
      e.preventDefault();
      e.shiftKey ? redo() : undo();
    } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
      e.preventDefault();
      redo();
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      if (TacState.selected) {
        e.preventDefault();
        pushHistory();
        TacState.elements = TacState.elements.filter(el => el !== TacState.selected);
        TacState.selected = null;
        hideInspector();
        drawEverything();
        if (window.showToast) window.showToast('تم حذف العنصر', 'info');
      }
    } else if (e.key === 'Escape') {
      TacState.selected = null;
      hideInspector();
      drawEverything();
    } else if (e.key === 'r' || e.key === 'R') {
      if (TacState.selected && TacState.selected.type === 'equipment') {
        pushHistory();
        TacState.selected.rotation = ((TacState.selected.rotation || 0) + Math.PI / 4) % (Math.PI * 2);
        drawEverything();
      }
    } else if (e.key === ' ' && e.ctrlKey) {
      e.preventDefault();
      toggleAnimation();
    }
  });
}

// ── Main Draw Dispatcher ──────────────────────────────────────────────────
function drawEverything() {
  if (!tacCtx || !pitchW || !pitchH) return;
  drawPitch();
  drawElements();
}

// ── Pitch Drawing Routines ────────────────────────────────────────────────
function drawPitch() {
  const sport = TacState.sport || 'soccer';
  const drawFns = {
    soccer: drawSoccerPitch,
    basketball: drawBasketballPitch,
    handball: drawHandballPitch,
    volleyball: drawVolleyballPitch,
    rugby: drawRugbyPitch
  };
  const fn = drawFns[sport] || drawSoccerPitch;
  fn();
}

function drawStripes() {
  const stripeW = pitchW / 10;
  for (let i = 0; i < 10; i++) {
    if (i % 2 === 0) {
      tacCtx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      tacCtx.fillRect(i * stripeW, 0, stripeW, pitchH);
    }
  }
}

function drawSoccerPitch() {
  const ctx = tacCtx, W = pitchW, H = pitchH;
  const isHalf = TacState.pitchView === 'half';

  // Base grass
  ctx.fillStyle = '#1e6827';
  ctx.fillRect(0, 0, W, H);
  drawStripes();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.88)';
  ctx.lineWidth = 2;

  const m = W * 0.04;

  if (!isHalf) {
    // ── Full Pitch ──
    ctx.strokeRect(m, m, W - 2*m, H - 2*m);

    // Halfway line
    ctx.beginPath(); ctx.moveTo(W/2, m); ctx.lineTo(W/2, H - m); ctx.stroke();

    // Center circle & spot
    ctx.beginPath(); ctx.arc(W/2, H/2, H * 0.15, 0, Math.PI * 2); ctx.stroke();
    dot(ctx, W/2, H/2, 3.5, '#ffffff');

    // Penalty areas (18y)
    const paW = W * 0.15, paH = H * 0.50;
    ctx.strokeRect(m, (H - paH)/2, paW, paH);
    ctx.strokeRect(W - m - paW, (H - paH)/2, paW, paH);

    // Goal areas (6y)
    const gaW = W * 0.055, gaH = H * 0.24;
    ctx.strokeRect(m, (H - gaH)/2, gaW, gaH);
    ctx.strokeRect(W - m - gaW, (H - gaH)/2, gaW, gaH);

    // Penalty spots
    dot(ctx, m + W * 0.105, H/2, 3, '#ffffff');
    dot(ctx, W - m - W * 0.105, H/2, 3, '#ffffff');

    // Penalty arcs (D)
    ctx.beginPath(); ctx.arc(m + W * 0.105, H/2, H * 0.14, -Math.PI*0.35, Math.PI*0.35); ctx.stroke();
    ctx.beginPath(); ctx.arc(W - m - W * 0.105, H/2, H * 0.14, Math.PI*0.65, Math.PI*1.35); ctx.stroke();

    // Goals with net pattern
    const gW = W * 0.02, gH = H * 0.12;
    drawGoalBox(ctx, m - gW, (H - gH)/2, gW, gH, true);
    drawGoalBox(ctx, W - m, (H - gH)/2, gW, gH, false);

    // Corner arcs
    const ca = W * 0.02;
    [[m, m], [W - m, m], [m, H - m], [W - m, H - m]].forEach(([cx, cy]) => {
      ctx.beginPath(); ctx.arc(cx, cy, ca, 0, Math.PI * 2); ctx.stroke();
    });
  } else {
    // ── Half Pitch (Attacking/Defending Zoom) ──
    ctx.strokeRect(m, m, W - 2*m, H - 2*m);

    // Halfway line at left
    ctx.beginPath(); ctx.moveTo(m, m); ctx.lineTo(m, H - m); ctx.stroke();
    // Center circle arc at left
    ctx.beginPath(); ctx.arc(m, H/2, H * 0.28, -Math.PI*0.5, Math.PI*0.5); ctx.stroke();
    dot(ctx, m, H/2, 4, '#ffffff');

    // Penalty area (18y) on right
    const paW = W * 0.45, paH = H * 0.62;
    ctx.strokeRect(W - m - paW, (H - paH)/2, paW, paH);

    // Goal area (6y)
    const gaW = W * 0.16, gaH = H * 0.30;
    ctx.strokeRect(W - m - gaW, (H - gaH)/2, gaW, gaH);

    // Penalty spot & arc
    const penX = W - m - W * 0.28;
    dot(ctx, penX, H/2, 3.5, '#ffffff');
    ctx.beginPath();
    ctx.arc(penX, H/2, H * 0.20, Math.PI * 0.62, Math.PI * 1.38);
    ctx.stroke();

    // Goal
    const gW = W * 0.035, gH = H * 0.18;
    drawGoalBox(ctx, W - m, (H - gH)/2, gW, gH, false);

    // Right Corner arcs
    const ca = W * 0.035;
    ctx.beginPath(); ctx.arc(W - m, m, ca, Math.PI*0.5, Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.arc(W - m, H - m, ca, Math.PI, Math.PI*1.5); ctx.stroke();
  }
}

function drawGoalBox(ctx, x, y, w, h, isLeft) {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);

  // Mesh lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 1;
  const step = 4;
  for (let ly = y; ly <= y + h; ly += step) {
    ctx.beginPath(); ctx.moveTo(x, ly); ctx.lineTo(x + w, ly); ctx.stroke();
  }
}

function drawBasketballPitch() {
  tacCtx.fillStyle = '#b8773b';
  tacCtx.fillRect(0, 0, pitchW, pitchH);
  drawStripes();

  const ctx = tacCtx, W = pitchW, H = pitchH, m = W * 0.04;
  ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2;

  ctx.strokeRect(m, m, W - 2*m, H - 2*m);
  ctx.beginPath(); ctx.moveTo(W/2, m); ctx.lineTo(W/2, H - m); ctx.stroke();
  ctx.beginPath(); ctx.arc(W/2, H/2, H * 0.15, 0, Math.PI * 2); ctx.stroke();

  // Keys
  const kW = W * 0.13, kH = H * 0.48;
  ctx.strokeRect(m, (H - kH)/2, kW, kH);
  ctx.strokeRect(W - m - kW, (H - kH)/2, kW, kH);

  // 3-point arcs
  [m + W*0.02, W - m - W*0.02].forEach((cx, i) => {
    ctx.beginPath();
    ctx.arc(cx, H/2, H * 0.38, -Math.PI*0.65 + i*Math.PI, Math.PI*0.65 + i*Math.PI);
    ctx.stroke();
  });

  // Hoops
  [[m + W*0.015, H/2], [W - m - W*0.015, H/2]].forEach(([bx, by]) => {
    ctx.fillStyle = 'white'; ctx.fillRect(bx - 2, by - H*0.08, 4, H*0.16);
    ctx.beginPath(); ctx.arc(bx, by, H*0.032, 0, Math.PI*2);
    ctx.strokeStyle = '#FF6B6B'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2;
  });
}

function drawHandballPitch() {
  tacCtx.fillStyle = '#b5925a';
  tacCtx.fillRect(0, 0, pitchW, pitchH);
  drawStripes();

  const ctx = tacCtx, W = pitchW, H = pitchH, m = W * 0.04;
  ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2;
  ctx.strokeRect(m, m, W - 2*m, H - 2*m);
  ctx.beginPath(); ctx.moveTo(W/2, m); ctx.lineTo(W/2, H - m); ctx.stroke();

  const r6 = H * 0.38;
  [m, W - m].forEach(gx => {
    ctx.beginPath();
    ctx.arc(gx, H/2, r6, -Math.PI*0.5, Math.PI*0.5, gx > W/2);
    ctx.stroke();
  });

  const r9 = H * 0.54;
  [m, W - m].forEach(gx => {
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.arc(gx, H/2, r9, -Math.PI*0.5, Math.PI*0.5, gx > W/2);
    ctx.stroke();
    ctx.setLineDash([]);
  });

  const gH = H * 0.2;
  drawGoalBox(ctx, m - W*0.02, (H - gH)/2, W*0.02, gH, true);
  drawGoalBox(ctx, W - m, (H - gH)/2, W*0.02, gH, false);
}

function drawVolleyballPitch() {
  tacCtx.fillStyle = '#825633';
  tacCtx.fillRect(0, 0, pitchW, pitchH);
  const ctx = tacCtx, W = pitchW, H = pitchH, m = W * 0.06;
  ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2;
  ctx.strokeRect(m, m, W - 2*m, H - 2*m);

  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(W/2, m); ctx.lineTo(W/2, H - m); ctx.stroke();

  ctx.lineWidth = 1.5; ctx.setLineDash([6, 4]);
  const al = W * 0.17;
  ctx.beginPath(); ctx.moveTo(m + al, m); ctx.lineTo(m + al, H - m); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W - m - al, m); ctx.lineTo(W - m - al, H - m); ctx.stroke();
  ctx.setLineDash([]);
}

function drawRugbyPitch() {
  tacCtx.fillStyle = '#1c5e24';
  tacCtx.fillRect(0, 0, pitchW, pitchH);
  drawStripes();

  const ctx = tacCtx, W = pitchW, H = pitchH, m = W * 0.04;
  ctx.strokeStyle = 'rgba(255,255,255,.88)'; ctx.lineWidth = 2;

  // In-goal areas
  const inGoalW = W * 0.08;
  ctx.strokeRect(m, m, inGoalW, H - 2*m);
  ctx.strokeRect(W - m - inGoalW, m, inGoalW, H - 2*m);
  ctx.strokeRect(m + inGoalW, m, W - 2*m - 2*inGoalW, H - 2*m);

  // Halfway & 22m lines
  ctx.beginPath(); ctx.moveTo(W/2, m); ctx.lineTo(W/2, H - m); ctx.stroke();
  const line22 = W * 0.22;
  ctx.beginPath(); ctx.moveTo(m + inGoalW + line22, m); ctx.lineTo(m + inGoalW + line22, H - m); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W - m - inGoalW - line22, m); ctx.lineTo(W - m - inGoalW - line22, H - m); ctx.stroke();

  // H Posts
  [[m + inGoalW, H/2], [W - m - inGoalW, H/2]].forEach(([px, py]) => {
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(px, py - 20); ctx.lineTo(px, py + 20); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px - 6, py); ctx.lineTo(px + 6, py); ctx.stroke();
  });
}

function dot(ctx, x, y, r, color = '#ffffff') {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
}

// ── Draw All Elements ─────────────────────────────────────────────────────
function drawElements() {
  TacState.elements.forEach(el => drawElement(el));
}

function drawElement(el) {
  const ctx = tacCtx;
  const isSelected = el === TacState.selected;

  switch (el.type) {
    case 'player':
      drawPlayerToken(ctx, el, isSelected);
      break;
    case 'ball':
      drawBall(ctx, el, isSelected);
      break;
    case 'equipment':
      drawEquipment(ctx, el, isSelected);
      break;
    case 'arrow-move':
      drawArrow(ctx, el.x1, el.y1, el.x2, el.y2, el.color || '#00D4FF', false, el.strokeWidth || 3, isSelected);
      break;
    case 'arrow-pass':
      drawArrow(ctx, el.x1, el.y1, el.x2, el.y2, el.color || '#FFD166', true, el.strokeWidth || 2.5, isSelected);
      break;
    case 'arrow-curve':
      drawCurvedArrow(ctx, el.x1, el.y1, el.x2, el.y2, el.cx, el.cy, el.color || '#10B981', el.strokeWidth || 3, isSelected);
      break;
    case 'arrow-dribble':
      drawDribbleArrow(ctx, el.x1, el.y1, el.x2, el.y2, el.color || '#FF8C42', el.strokeWidth || 2.5, isSelected);
      break;
    case 'freehand':
      drawFreehand(ctx, el.points, el.color || '#A78BFA', el.strokeWidth || 3, isSelected);
      break;
    case 'zone':
      drawZone(ctx, el.x1, el.y1, el.x2, el.y2, el.color || 'rgba(0,212,255,.22)', isSelected);
      break;
    case 'text':
      drawTextLabel(ctx, el.text, el.x, el.y, el.color || '#FACC15', el.fontSize || 13, isSelected);
      break;
  }
}

// ── Element Renderers ─────────────────────────────────────────────────────
function drawPlayerToken(ctx, el, isSelected) {
  const r = 15;
  ctx.save();
  ctx.translate(el.x, el.y);

  // Drop shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 3;

  // Outer Token Circle
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = el.color || (el.team === 'home' ? '#00D4FF' : (el.team === 'gk' ? '#FACC15' : '#FF6B6B'));
  ctx.fill();

  ctx.shadowColor = 'transparent';

  // Selection ring
  ctx.strokeStyle = isSelected ? '#FACC15' : 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = isSelected ? 3 : 1.5;
  ctx.stroke();

  // Highlight arc
  ctx.beginPath();
  ctx.arc(0, 0, r - 2, -Math.PI*0.8, -Math.PI*0.2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Number / Text
  ctx.fillStyle = (el.team === 'home' || el.team === 'gk') ? '#0b1120' : '#ffffff';
  ctx.font = 'bold 11px Cairo, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(el.num || '?', 0, 1);

  // Optional Name badge underneath
  if (el.name) {
    ctx.font = 'bold 9px Cairo, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 4;
    ctx.fillText(el.name, 0, r + 11);
  }

  ctx.restore();
}

function drawBall(ctx, el, isSelected) {
  const r = 9;
  ctx.save();
  ctx.translate(el.x, el.y);

  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 2;

  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.shadowColor = 'transparent';

  ctx.strokeStyle = isSelected ? '#FACC15' : '#222222';
  ctx.lineWidth = isSelected ? 2.5 : 1.2;
  ctx.stroke();

  // Ball black pentagon center
  ctx.beginPath();
  ctx.arc(0, 0, 3, 0, Math.PI * 2);
  ctx.fillStyle = '#222222';
  ctx.fill();

  ctx.restore();
}

function drawEquipment(ctx, el, isSelected) {
  ctx.save();
  ctx.translate(el.x, el.y);
  if (el.rotation) ctx.rotate(el.rotation);

  if (isSelected) {
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(-22, -22, 44, 44);
    ctx.setLineDash([]);
  }

  switch (el.equipType) {
    case 'cone':
      drawCone(ctx, '#FF6B00');
      break;
    case 'cone-yellow':
      drawCone(ctx, '#FACC15');
      break;
    case 'pole':
      drawPole(ctx);
      break;
    case 'hurdle':
      drawHurdle(ctx);
      break;
    case 'mannequin':
      drawMannequin(ctx);
      break;
    case 'ladder':
      drawSpeedLadder(ctx);
      break;
    case 'minigoal':
      drawMiniGoal(ctx);
      break;
    case 'ring':
      drawAgilityRing(ctx);
      break;
    case 'marker':
      drawMarkerDisc(ctx);
      break;
    default:
      drawCone(ctx, '#FF6B00');
  }

  ctx.restore();
}

// ── Specific Equipment Vector Drawings ───────────────────────────────────
function drawCone(ctx, color) {
  // Base ellipse
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, 6, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Cone body
  ctx.beginPath();
  ctx.moveTo(-10, 6);
  ctx.lineTo(0, -14);
  ctx.lineTo(10, 6);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();

  // White stripe on cone
  ctx.beginPath();
  ctx.moveTo(-5, 0);
  ctx.lineTo(0, -6);
  ctx.lineTo(5, 0);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawPole(ctx) {
  // Base stand
  ctx.fillStyle = '#334155';
  ctx.beginPath(); ctx.arc(0, 8, 8, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#64748B'; ctx.stroke();

  // Pole stick
  ctx.strokeStyle = '#FACC15';
  ctx.lineWidth = 3.5;
  ctx.beginPath(); ctx.moveTo(0, 8); ctx.lineTo(0, -18); ctx.stroke();

  // Tip flag
  ctx.fillStyle = '#EF4444';
  ctx.beginPath();
  ctx.moveTo(0, -18); ctx.lineTo(10, -14); ctx.lineTo(0, -10);
  ctx.closePath(); ctx.fill();
}

function drawHurdle(ctx) {
  // Horizontal hurdle
  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(18, 0); ctx.stroke();

  // Stripes on bar
  ctx.strokeStyle = '#FACC15';
  ctx.lineWidth = 3.5;
  ctx.setLineDash([6, 5]);
  ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(16, 0); ctx.stroke();
  ctx.setLineDash([]);

  // Feet
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(-20, -5, 4, 10);
  ctx.fillRect(16, -5, 4, 10);
}

function drawMannequin(ctx) {
  // Head
  ctx.fillStyle = '#F59E0B';
  ctx.beginPath(); ctx.arc(0, -14, 5, 0, Math.PI * 2); ctx.fill();

  // Shoulders & Chest
  ctx.fillStyle = '#0284C7';
  ctx.beginPath();
  ctx.roundRect(-12, -8, 24, 16, 4);
  ctx.fill();
  ctx.strokeStyle = '#38BDF8'; ctx.lineWidth = 1.2; ctx.stroke();

  // Stand legs
  ctx.strokeStyle = '#64748B'; ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-6, 8); ctx.lineTo(-8, 18);
  ctx.moveTo(6, 8); ctx.lineTo(8, 18);
  ctx.stroke();
}

function drawSpeedLadder(ctx) {
  const w = 48, h = 18;
  // Side rails
  ctx.strokeStyle = '#FACC15';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-w/2, -h/2); ctx.lineTo(w/2, -h/2);
  ctx.moveTo(-w/2, h/2); ctx.lineTo(w/2, h/2);
  ctx.stroke();

  // 6 Rungs
  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 2;
  const count = 6;
  const step = w / (count - 1);
  for (let i = 0; i < count; i++) {
    const rx = -w/2 + i * step;
    ctx.beginPath(); ctx.moveTo(rx, -h/2); ctx.lineTo(rx, h/2); ctx.stroke();
  }
}

function drawMiniGoal(ctx) {
  const w = 32, h = 18;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.fillRect(-w/2, -h/2, w, h);

  // Mesh lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 1;
  for (let x = -w/2 + 5; x < w/2; x += 6) {
    ctx.beginPath(); ctx.moveTo(x, -h/2); ctx.lineTo(x, h/2); ctx.stroke();
  }

  // Posts & Crossbar
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(-w/2, -h/2, w, h);
}

function drawAgilityRing(ctx) {
  ctx.strokeStyle = '#00D4FF';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.ellipse(0, 0, 14, 9, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function drawMarkerDisc(ctx) {
  ctx.fillStyle = '#EF4444';
  ctx.beginPath();
  ctx.ellipse(0, 0, 11, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#B91C1C';
  ctx.stroke();
  // Center hole
  ctx.fillStyle = '#1e6827';
  ctx.beginPath();
  ctx.ellipse(0, 0, 3, 1.5, 0, 0, Math.PI * 2);
  ctx.fill();
}

// ── Arrows, Curves, Dribbles & Zones ──────────────────────────────────────
function drawArrow(ctx, x1, y1, x2, y2, color, dashed, width = 3, isSelected = false) {
  ctx.save();
  if (dashed) ctx.setLineDash([8, 5]);

  ctx.strokeStyle = isSelected ? '#FACC15' : color;
  ctx.fillStyle = isSelected ? '#FACC15' : color;
  ctx.lineWidth = width;

  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.setLineDash([]);

  // Arrowhead
  const angle = Math.atan2(y2 - y1, x2 - x1);
  drawArrowHead(ctx, x2, y2, angle, width);

  ctx.restore();
}

function drawCurvedArrow(ctx, x1, y1, x2, y2, cx, cy, color, width = 3, isSelected = false) {
  ctx.save();
  ctx.strokeStyle = isSelected ? '#FACC15' : color;
  ctx.fillStyle = isSelected ? '#FACC15' : color;
  ctx.lineWidth = width;

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo(cx, cy, x2, y2);
  ctx.stroke();

  // Tangent angle at (x2, y2)
  const angle = Math.atan2(y2 - cy, x2 - cx);
  drawArrowHead(ctx, x2, y2, angle, width);

  // If selected, show control handle
  if (isSelected) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(cx, cy); ctx.lineTo(x2, y2); ctx.stroke();
    dot(ctx, cx, cy, 4, '#FACC15');
  }

  ctx.restore();
}

function drawDribbleArrow(ctx, x1, y1, x2, y2, color, width = 2.5, isSelected = false) {
  ctx.save();
  ctx.strokeStyle = isSelected ? '#FACC15' : color;
  ctx.fillStyle = isSelected ? '#FACC15' : color;
  ctx.lineWidth = width;

  const dist = Math.hypot(x2 - x1, y2 - y1);
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const waves = Math.max(3, Math.round(dist / 22));
  const step = dist / waves;
  const amp = 7;

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

  drawArrowHead(ctx, x2, y2, angle, width);
  ctx.restore();
}

function drawArrowHead(ctx, x, y, angle, width) {
  const h = Math.max(12, width * 4);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - h * Math.cos(angle - Math.PI / 6), y - h * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x - h * Math.cos(angle + Math.PI / 6), y - h * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
}

function drawFreehand(ctx, points, color, width = 3, isSelected = false) {
  if (!points || points.length < 2) return;
  ctx.save();
  ctx.strokeStyle = isSelected ? '#FACC15' : color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawZone(ctx, x1, y1, x2, y2, color, isSelected = false) {
  const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
  const w = maxX - minX, h = maxY - minY;

  ctx.save();
  ctx.fillStyle = color || 'rgba(0, 212, 255, 0.2)';
  ctx.fillRect(minX, minY, w, h);

  ctx.strokeStyle = isSelected ? '#FACC15' : 'rgba(0, 212, 255, 0.7)';
  ctx.lineWidth = isSelected ? 2.5 : 1.5;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(minX, minY, w, h);
  ctx.restore();
}

function drawTextLabel(ctx, text, x, y, color = '#FACC15', fontSize = 13, isSelected = false) {
  ctx.save();
  ctx.font = `bold ${fontSize}px Cairo, sans-serif`;
  const metrics = ctx.measureText(text);
  const padX = 8, padY = 4;
  const w = metrics.width + padX * 2;
  const h = fontSize + padY * 2;

  // Badge background
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.strokeStyle = isSelected ? '#FACC15' : color;
  ctx.lineWidth = isSelected ? 2 : 1;
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - h / 2, w, h, 6);
  ctx.fill();
  ctx.stroke();

  // Text
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + 1);

  ctx.restore();
}

// ── Formations Loader ─────────────────────────────────────────────────────
const FORMATIONS = {
  '4-3-3': [
    { num: '1', name: 'GK', team: 'gk', rel: [0.06, 0.50] },
    { num: '2', name: 'RB', team: 'home', rel: [0.22, 0.16] },
    { num: '4', name: 'CB', team: 'home', rel: [0.18, 0.38] },
    { num: '5', name: 'CB', team: 'home', rel: [0.18, 0.62] },
    { num: '3', name: 'LB', team: 'home', rel: [0.22, 0.84] },
    { num: '6', name: 'DM', team: 'home', rel: [0.32, 0.50] },
    { num: '8', name: 'CM', team: 'home', rel: [0.42, 0.30] },
    { num: '10', name: 'CM', team: 'home', rel: [0.42, 0.70] },
    { num: '7', name: 'RW', team: 'home', rel: [0.65, 0.18] },
    { num: '9', name: 'ST', team: 'home', rel: [0.70, 0.50] },
    { num: '11', name: 'LW', team: 'home', rel: [0.65, 0.82] },
  ],
  '4-2-3-1': [
    { num: '1', name: 'GK', team: 'gk', rel: [0.06, 0.50] },
    { num: '2', name: 'RB', team: 'home', rel: [0.22, 0.16] },
    { num: '4', name: 'CB', team: 'home', rel: [0.18, 0.38] },
    { num: '5', name: 'CB', team: 'home', rel: [0.18, 0.62] },
    { num: '3', name: 'LB', team: 'home', rel: [0.22, 0.84] },
    { num: '6', name: 'DM', team: 'home', rel: [0.34, 0.36] },
    { num: '8', name: 'DM', team: 'home', rel: [0.34, 0.64] },
    { num: '10', name: 'AM', team: 'home', rel: [0.52, 0.50] },
    { num: '7', name: 'RM', team: 'home', rel: [0.52, 0.18] },
    { num: '11', name: 'LM', team: 'home', rel: [0.52, 0.82] },
    { num: '9', name: 'ST', team: 'home', rel: [0.72, 0.50] },
  ],
  '4-4-2': [
    { num: '1', name: 'GK', team: 'gk', rel: [0.06, 0.50] },
    { num: '2', name: 'RB', team: 'home', rel: [0.20, 0.18] },
    { num: '4', name: 'CB', team: 'home', rel: [0.18, 0.38] },
    { num: '5', name: 'CB', team: 'home', rel: [0.18, 0.62] },
    { num: '3', name: 'LB', team: 'home', rel: [0.20, 0.82] },
    { num: '7', name: 'RM', team: 'home', rel: [0.45, 0.18] },
    { num: '6', name: 'CM', team: 'home', rel: [0.42, 0.38] },
    { num: '8', name: 'CM', team: 'home', rel: [0.42, 0.62] },
    { num: '11', name: 'LM', team: 'home', rel: [0.45, 0.82] },
    { num: '9', name: 'ST', team: 'home', rel: [0.68, 0.36] },
    { num: '10', name: 'ST', team: 'home', rel: [0.68, 0.64] },
  ],
  '3-5-2': [
    { num: '1', name: 'GK', team: 'gk', rel: [0.06, 0.50] },
    { num: '4', name: 'CB', team: 'home', rel: [0.18, 0.28] },
    { num: '5', name: 'CB', team: 'home', rel: [0.18, 0.50] },
    { num: '6', name: 'CB', team: 'home', rel: [0.18, 0.72] },
    { num: '2', name: 'RWB', team: 'home', rel: [0.40, 0.12] },
    { num: '8', name: 'CM', team: 'home', rel: [0.38, 0.32] },
    { num: '10', name: 'CM', team: 'home', rel: [0.44, 0.50] },
    { num: '3', name: 'CM', team: 'home', rel: [0.38, 0.68] },
    { num: '11', name: 'LWB', team: 'home', rel: [0.40, 0.88] },
    { num: '9', name: 'ST', team: 'home', rel: [0.68, 0.38] },
    { num: '7', name: 'ST', team: 'home', rel: [0.68, 0.62] },
  ],
  '5-3-2': [
    { num: '1', name: 'GK', team: 'gk', rel: [0.06, 0.50] },
    { num: '2', name: 'RWB', team: 'home', rel: [0.20, 0.10] },
    { num: '4', name: 'CB', team: 'home', rel: [0.18, 0.30] },
    { num: '5', name: 'CB', team: 'home', rel: [0.18, 0.50] },
    { num: '6', name: 'CB', team: 'home', rel: [0.18, 0.70] },
    { num: '3', name: 'LWB', team: 'home', rel: [0.20, 0.90] },
    { num: '8', name: 'CM', team: 'home', rel: [0.42, 0.30] },
    { num: '10', name: 'CM', team: 'home', rel: [0.42, 0.50] },
    { num: '7', name: 'CM', team: 'home', rel: [0.42, 0.70] },
    { num: '9', name: 'ST', team: 'home', rel: [0.68, 0.38] },
    { num: '11', name: 'ST', team: 'home', rel: [0.68, 0.62] },
  ],
};

function applyFormation() {
  pushHistory();
  const formationKey = document.getElementById('formationSelect')?.value || '4-3-3';
  const formation = FORMATIONS[formationKey] || FORMATIONS['4-3-3'];

  // Keep existing training equipment and drawings, remove existing home/gk players
  TacState.elements = TacState.elements.filter(e => e.type !== 'player' || e.team === 'away');

  formation.forEach(pos => {
    TacState.elements.push({
      id: `p_${Date.now()}_${pos.num}`,
      type: 'player',
      team: pos.team,
      num: pos.num,
      name: pos.name,
      x: Math.round(pos.rel[0] * pitchW),
      y: Math.round(pos.rel[1] * pitchH),
      color: pos.team === 'gk' ? '#FACC15' : '#00D4FF'
    });
  });

  // Ensure there is at least one ball if none exists
  if (!TacState.elements.some(e => e.type === 'ball')) {
    TacState.elements.push({
      id: 'ball_center',
      type: 'ball',
      x: Math.round(pitchW * 0.5),
      y: Math.round(pitchH * 0.5)
    });
  }

  drawEverything();
  if (window.showToast) window.showToast(`تم تطبيق التشكيلة: ${formationKey}`, 'success');
}

// ── Animation & Keyframes System ──────────────────────────────────────────
function setupAnimationControls() {
  document.getElementById('animPlay')?.addEventListener('click', toggleAnimation);
  document.getElementById('animPrev')?.addEventListener('click', prevFrame);
  document.getElementById('animNext')?.addEventListener('click', nextFrame);
  document.getElementById('addFrameBtn')?.addEventListener('click', addAnimFrame);
  document.getElementById('clearFramesBtn')?.addEventListener('click', clearFrames);
}

function addAnimFrame() {
  const snapshot = JSON.parse(JSON.stringify(TacState.elements));
  TacState.animFrames.push(snapshot);
  TacState.currentFrame = TacState.animFrames.length - 1;
  updateFrameInfo();
  if (window.showToast) window.showToast(`تمت إضافة اللقطة ${TacState.animFrames.length} (Keyframe)`, 'success');
}

function updateFrameInfo() {
  const el = document.getElementById('animFrameInfo');
  if (el) {
    el.textContent = `الإطار ${TacState.currentFrame + 1} / ${Math.max(1, TacState.animFrames.length)}`;
  }
}

function prevFrame() {
  if (TacState.animFrames.length === 0) return;
  TacState.currentFrame = Math.max(0, TacState.currentFrame - 1);
  TacState.elements = JSON.parse(JSON.stringify(TacState.animFrames[TacState.currentFrame]));
  drawEverything();
  updateFrameInfo();
}

function nextFrame() {
  if (TacState.animFrames.length === 0) return;
  TacState.currentFrame = (TacState.currentFrame + 1) % TacState.animFrames.length;
  TacState.elements = JSON.parse(JSON.stringify(TacState.animFrames[TacState.currentFrame]));
  drawEverything();
  updateFrameInfo();
}

function clearFrames() {
  TacState.animFrames = [];
  TacState.currentFrame = 0;
  if (TacState.animPlaying) toggleAnimation();
  updateFrameInfo();
  if (window.showToast) window.showToast('تم مسح جميع الإطارات', 'info');
}

function toggleAnimation() {
  const btn = document.getElementById('animPlay');
  if (TacState.animFrames.length < 2) {
    if (window.showToast) window.showToast('يرجى إضافة إطارين على الأقل بالضغط على "+ لقطة جديدة"', 'info');
    return;
  }
  TacState.animPlaying = !TacState.animPlaying;
  if (btn) btn.textContent = TacState.animPlaying ? '⏸' : '▶';

  if (TacState.animPlaying) {
    playAnimationLoop();
  } else if (TacState.animTimer) {
    clearTimeout(TacState.animTimer);
    TacState.animTimer = null;
  }
}

function playAnimationLoop() {
  if (!TacState.animPlaying) return;
  nextFrame();
  TacState.animTimer = setTimeout(playAnimationLoop, 900);
}

// ── Modals & Library System ───────────────────────────────────────────────
function setupModals() {
  // Save Modal
  const saveModal = document.getElementById('savePlanModal');
  const closeSaveModal = document.getElementById('closeSavePlanModal');
  const cancelSaveBtn = document.getElementById('cancelSavePlanBtn');
  const confirmSaveBtn = document.getElementById('confirmSavePlanBtn');

  [closeSaveModal, cancelSaveBtn].forEach(b => {
    b?.addEventListener('click', () => { if (saveModal) saveModal.style.display = 'none'; });
  });

  confirmSaveBtn?.addEventListener('click', savePlanToLocalStorage);

  // Library Modal
  const libModal = document.getElementById('tacticalPlansModal');
  const closeLibModal = document.getElementById('closePlansLibraryModal');
  const closeLibFooter = document.getElementById('closeLibraryFooterBtn');

  [closeLibModal, closeLibFooter].forEach(b => {
    b?.addEventListener('click', () => { if (libModal) libModal.style.display = 'none'; });
  });

  // Library Tabs
  document.getElementById('tabSavedPlansBtn')?.addEventListener('click', () => switchLibTab('saved'));
  document.getElementById('tabPresetDrillsBtn')?.addEventListener('click', () => switchLibTab('presets'));
}

function openSavePlanModal() {
  const modal = document.getElementById('savePlanModal');
  if (!modal) return;
  const nameInput = document.getElementById('modalPlanName');
  const coachInput = document.getElementById('modalCoachName');
  const notesInput = document.getElementById('modalPlanNotes');

  if (nameInput) nameInput.value = TacState.planName || 'خطة تدريبية تكتيكية';
  if (coachInput) coachInput.value = TacState.coachName || 'كابتن الفريق';
  if (notesInput) notesInput.value = TacState.coachNotes || '';

  modal.style.display = 'flex';
}

function savePlanToLocalStorage() {
  const name = document.getElementById('modalPlanName')?.value.trim() || 'خطة تكتيكية';
  const coach = document.getElementById('modalCoachName')?.value.trim() || 'كابتن الفريق';
  const notes = document.getElementById('modalPlanNotes')?.value.trim() || '';

  TacState.planName = name;
  TacState.coachName = coach;
  TacState.coachNotes = notes;

  const currentPlanNameEl = document.getElementById('tacCurrentPlanName');
  if (currentPlanNameEl) currentPlanNameEl.textContent = name;

  const planData = {
    id: `plan_${Date.now()}`,
    name,
    coach,
    notes,
    sport: TacState.sport,
    pitchView: TacState.pitchView,
    date: new Date().toLocaleDateString('ar-DZ', { year: 'numeric', month: 'short', day: 'numeric' }),
    elements: JSON.parse(JSON.stringify(TacState.elements)),
    animFrames: JSON.parse(JSON.stringify(TacState.animFrames))
  };

  const saved = getStoredPlans();
  saved.unshift(planData);
  localStorage.setItem('tahleel_saved_tactical_plans', JSON.stringify(saved));

  document.getElementById('savePlanModal').style.display = 'none';
  if (window.showToast) window.showToast('✅ تم حفظ الخطة بنجاح في المكتبة!', 'success');
}

function getStoredPlans() {
  try {
    return JSON.parse(localStorage.getItem('tahleel_saved_tactical_plans') || '[]');
  } catch (_) {
    return [];
  }
}

function openPlansLibrary(tab = 'saved') {
  const modal = document.getElementById('tacticalPlansModal');
  if (!modal) return;
  modal.style.display = 'flex';
  renderSavedPlansList();
  renderPresetDrillsList();
  switchLibTab(tab);
}

function switchLibTab(tab) {
  const savedContainer = document.getElementById('savedPlansContainer');
  const presetContainer = document.getElementById('presetDrillsContainer');
  const tabSavedBtn = document.getElementById('tabSavedPlansBtn');
  const tabPresetBtn = document.getElementById('tabPresetDrillsBtn');

  if (tab === 'saved') {
    if (savedContainer) savedContainer.style.display = 'block';
    if (presetContainer) presetContainer.style.display = 'none';
    tabSavedBtn?.classList.replace('btn--ghost', 'btn--primary');
    tabPresetBtn?.classList.replace('btn--primary', 'btn--ghost');
  } else {
    if (savedContainer) savedContainer.style.display = 'none';
    if (presetContainer) presetContainer.style.display = 'block';
    tabSavedBtn?.classList.replace('btn--primary', 'btn--ghost');
    tabPresetBtn?.classList.replace('btn--ghost', 'btn--primary');
  }
}

function renderSavedPlansList() {
  const container = document.getElementById('savedPlansList');
  const noPlans = document.getElementById('noSavedPlansMsg');
  const countEl = document.getElementById('savedPlansCount');
  if (!container) return;

  const plans = getStoredPlans();
  if (countEl) countEl.textContent = plans.length;

  if (plans.length === 0) {
    container.innerHTML = '';
    if (noPlans) noPlans.style.display = 'block';
    return;
  }
  if (noPlans) noPlans.style.display = 'none';

  container.innerHTML = plans.map(p => `
    <div class="plan-card">
      <div class="plan-card__header">
        <span class="plan-card__title">⚽ ${escapeHtml(p.name)}</span>
        <span class="badge badge--accent">${escapeHtml(p.sport || 'كرة القدم')}</span>
      </div>
      <div class="plan-card__meta">
        <span>📅 ${p.date || 'اليوم'}</span>
        <span>👤 ${escapeHtml(p.coach || 'مدرب')}</span>
      </div>
      <p class="plan-card__desc">${escapeHtml(p.notes || 'لا توجد ملاحظات')}</p>
      <div class="plan-card__actions">
        <button class="btn btn--sm btn--primary" onclick="loadSavedPlanById('${p.id}')">📂 تحميل الخطة</button>
        <button class="btn btn--sm btn--ghost" onclick="downloadSinglePlanJson('${p.id}')">📄 JSON</button>
        <button class="btn btn--sm btn--danger" onclick="deleteSavedPlanById('${p.id}')">🗑️ حذف</button>
      </div>
    </div>
  `).join('');
}

function renderPresetDrillsList() {
  const container = document.getElementById('presetDrillsList');
  if (!container) return;

  container.innerHTML = BUILTIN_DRILLS.map(d => `
    <div class="plan-card" style="border-left: 3px solid #10B981;">
      <div class="plan-card__header">
        <span class="plan-card__title">⚡ ${escapeHtml(d.name)}</span>
        <span class="badge" style="background:#10B981; color:#fff;">${escapeHtml(d.category)}</span>
      </div>
      <p class="plan-card__desc">${escapeHtml(d.desc)}</p>
      <div class="plan-card__actions">
        <button class="btn btn--sm btn--primary" onclick="loadBuiltinDrillById('${d.id}')">🎯 تطبيق التمرين فوراً</button>
      </div>
    </div>
  `).join('');
}

window.loadSavedPlanById = function(id) {
  const plans = getStoredPlans();
  const plan = plans.find(p => p.id === id);
  if (!plan) return;

  pushHistory();
  TacState.planName = plan.name;
  TacState.coachName = plan.coach || '';
  TacState.coachNotes = plan.notes || '';
  TacState.sport = plan.sport || 'soccer';
  TacState.pitchView = plan.pitchView || 'full';
  TacState.elements = JSON.parse(JSON.stringify(plan.elements || []));
  TacState.animFrames = JSON.parse(JSON.stringify(plan.animFrames || []));

  document.getElementById('tacticalPlansModal').style.display = 'none';
  document.getElementById('tacCurrentPlanName').textContent = plan.name;
  document.getElementById('pitchSport').value = TacState.sport;
  document.getElementById('pitchViewSelect').value = TacState.pitchView;

  resizePitch();
  if (window.showToast) window.showToast(`✅ تم تحميل الخطة: ${plan.name}`, 'success');
};

window.deleteSavedPlanById = function(id) {
  if (!confirm('هل تريد بالتأكيد حذف هذه الخطة من المكتبة؟')) return;
  let plans = getStoredPlans();
  plans = plans.filter(p => p.id !== id);
  localStorage.setItem('tahleel_saved_tactical_plans', JSON.stringify(plans));
  renderSavedPlansList();
  if (window.showToast) window.showToast('تم حذف الخطة من المكتبة', 'info');
};

window.downloadSinglePlanJson = function(id) {
  const plans = getStoredPlans();
  const plan = plans.find(p => p.id === id);
  if (!plan) return;
  const blob = new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${plan.name.replace(/\s+/g, '_')}.json`;
  a.click();
};

window.loadBuiltinDrillById = function(id) {
  const drill = BUILTIN_DRILLS.find(d => d.id === id);
  if (!drill) return;

  pushHistory();
  TacState.planName = drill.name;
  TacState.coachNotes = drill.notes || '';
  TacState.sport = drill.sport || 'soccer';
  TacState.pitchView = drill.pitchView || 'half';

  // Scale relative coords to actual canvas dimensions
  resizePitch();

  TacState.elements = drill.elements.map(el => {
    const copy = { ...el };
    if (copy.xRel !== undefined) {
      copy.x = Math.round(copy.xRel * pitchW);
      copy.y = Math.round(copy.yRel * pitchH);
    }
    if (copy.x1Rel !== undefined) {
      copy.x1 = Math.round(copy.x1Rel * pitchW);
      copy.y1 = Math.round(copy.y1Rel * pitchH);
      copy.x2 = Math.round(copy.x2Rel * pitchW);
      copy.y2 = Math.round(copy.y2Rel * pitchH);
    }
    if (copy.cxRel !== undefined) {
      copy.cx = Math.round(copy.cxRel * pitchW);
      copy.cy = Math.round(copy.cyRel * pitchH);
    }
    return copy;
  });

  document.getElementById('tacticalPlansModal').style.display = 'none';
  document.getElementById('tacCurrentPlanName').textContent = drill.name;
  document.getElementById('pitchSport').value = TacState.sport;
  document.getElementById('pitchViewSelect').value = TacState.pitchView;

  drawEverything();
  if (window.showToast) window.showToast(`🎯 تم تحميل تمرين: ${drill.name}`, 'success');
};

// ── Export HD Image (PNG) ─────────────────────────────────────────────────
function exportPitchHD() {
  if (!tacCanvas) return;

  const exportW = 1920;
  const exportH = 1080;
  const offCanvas = document.createElement('canvas');
  offCanvas.width = exportW;
  offCanvas.height = exportH;
  const offCtx = offCanvas.getContext('2d');

  // Background
  offCtx.fillStyle = '#0b1120';
  offCtx.fillRect(0, 0, exportW, exportH);

  // Top Title Banner
  offCtx.fillStyle = '#0f172a';
  offCtx.fillRect(0, 0, exportW, 90);
  offCtx.strokeStyle = 'rgba(0, 212, 255, 0.3)';
  offCtx.lineWidth = 2;
  offCtx.strokeRect(0, 0, exportW, 90);

  // Logo & Title
  offCtx.fillStyle = '#00D4FF';
  offCtx.font = 'bold 30px Cairo, sans-serif';
  offCtx.textAlign = 'right';
  offCtx.fillText('🎯 تحليل DZ — اللوحة التكتيكية والتدريبية', exportW - 40, 48);

  offCtx.fillStyle = '#ffffff';
  offCtx.font = '22px Cairo, sans-serif';
  offCtx.fillText(TacState.planName || 'خطة تكتيكية', exportW - 40, 78);

  // Meta Left
  offCtx.textAlign = 'left';
  offCtx.fillStyle = '#94a3b8';
  offCtx.font = '18px Cairo, sans-serif';
  const dateStr = new Date().toLocaleDateString('ar-DZ', { year: 'numeric', month: 'long', day: 'numeric' });
  offCtx.fillText(`📅 ${dateStr}  |  👤 ${TacState.coachName || 'كابتن'}`, 40, 56);

  // Draw scaled pitch in center
  const pitchMargin = 40;
  const maxPitchW = exportW - pitchMargin * 2;
  const maxPitchH = exportH - 120 - pitchMargin;
  const scale = Math.min(maxPitchW / pitchW, maxPitchH / pitchH);

  const drawW = pitchW * scale;
  const drawH = pitchH * scale;
  const drawX = (exportW - drawW) / 2;
  const drawY = 110 + (maxPitchH - drawH) / 2;

  offCtx.drawImage(tacCanvas, drawX, drawY, drawW, drawH);

  // Subtle border around pitch
  offCtx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  offCtx.lineWidth = 3;
  offCtx.strokeRect(drawX, drawY, drawW, drawH);

  // Bottom watermark
  offCtx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  offCtx.font = '14px Cairo, sans-serif';
  offCtx.textAlign = 'center';
  offCtx.fillText('Tahleel DZ Pro Football Tactical Studio 🇩🇿', exportW / 2, exportH - 12);

  // Download Image
  const link = document.createElement('a');
  link.download = `Tactical_DZ_${(TacState.planName || 'Plan').replace(/\s+/g, '_')}_HD.png`;
  link.href = offCanvas.toDataURL('image/png');
  link.click();

  if (window.showToast) window.showToast('📥 تم تصدير اللوحة كصورة HD فائقة الدقة!', 'success');
}

// ── JSON Export & Import ──────────────────────────────────────────────────
function exportJSON() {
  const data = {
    app: 'Tahleel-DZ',
    version: '2.0',
    planName: TacState.planName,
    coachName: TacState.coachName,
    coachNotes: TacState.coachNotes,
    sport: TacState.sport,
    pitchView: TacState.pitchView,
    exportedAt: new Date().toISOString(),
    elements: TacState.elements,
    animFrames: TacState.animFrames
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Tahleel_Plan_${(TacState.planName || 'Tactics').replace(/\s+/g, '_')}.json`;
  a.click();
  if (window.showToast) window.showToast('📄 تم تصدير ملف الخطة JSON بنجاح', 'success');
}

function importJSON(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      if (!data.elements) throw new Error('تنسيق الملف غير صالح');

      pushHistory();
      TacState.planName = data.planName || file.name.replace('.json', '');
      TacState.coachName = data.coachName || '';
      TacState.coachNotes = data.coachNotes || '';
      TacState.sport = data.sport || 'soccer';
      TacState.pitchView = data.pitchView || 'full';
      TacState.elements = data.elements || [];
      TacState.animFrames = data.animFrames || [];

      document.getElementById('tacCurrentPlanName').textContent = TacState.planName;
      document.getElementById('pitchSport').value = TacState.sport;
      document.getElementById('pitchViewSelect').value = TacState.pitchView;

      resizePitch();
      if (window.showToast) window.showToast(`✅ تم استيراد الخطة: ${TacState.planName}`, 'success');
    } catch (err) {
      alert('خطأ أثناء قراءة ملف JSON: ' + err.message);
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

// ── Print / PDF Layout ────────────────────────────────────────────────────
function printTacticalPlan() {
  const imgUrl = tacCanvas.toDataURL('image/png');
  const printWin = window.open('', '_blank');
  if (!printWin) {
    alert('يرجى السماح بالنوافذ المنبثقة للطباعة');
    return;
  }

  printWin.document.write(`
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="utf-8">
      <title>${escapeHtml(TacState.planName)} — تحليل DZ</title>
      <style>
        body { font-family: 'Cairo', Arial, sans-serif; margin: 30px; color: #111; direction: rtl; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #222; padding-bottom: 12px; margin-bottom: 20px; }
        h1 { margin: 0; font-size: 22px; color: #0284c7; }
        .meta { font-size: 14px; color: #555; }
        .pitch-img { width: 100%; max-height: 520px; object-fit: contain; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,.1); }
        .notes-box { margin-top: 20px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; }
        .notes-box h3 { margin-top: 0; font-size: 16px; color: #334155; }
        @media print {
          body { margin: 10px; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1>🎯 تحليل DZ — السبورة التكتيكية والتدريبية</h1>
          <div style="font-size:18px; font-weight:bold; margin-top:4px;">${escapeHtml(TacState.planName)}</div>
        </div>
        <div class="meta">
          <div>المدرب: ${escapeHtml(TacState.coachName || 'كابتن')}</div>
          <div>التاريخ: ${new Date().toLocaleDateString('ar-DZ')}</div>
          <div>الرياضة: ${escapeHtml(TacState.sport)}</div>
        </div>
      </div>

      <img src="${imgUrl}" class="pitch-img" alt="Tactical Board">

      <div class="notes-box">
        <h3>📝 ملاحظات وتوجيهات الحصة التدريبية:</h3>
        <p>${escapeHtml(TacState.coachNotes || 'لا توجد ملاحظات مسجلة لهذه الخطة.')}</p>
      </div>

      <script>
        window.onload = function() { window.print(); };
      </script>
    </body>
    </html>
  `);
  printWin.document.close();
}

// ── Utility ───────────────────────────────────────────────────────────────
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}
