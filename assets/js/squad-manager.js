/**
 * تحليل DZ — Teams & Squad Manager Module
 * Handles:
 * - Home Club & Away Club profiles (Names, Logos, Colors, Stadiums)
 * - Full Squad Roster (Player Photos, Numbers, Positions, Preferred Foot, Age, Notes)
 * - Integration with Tactical Board, Video Badges, and Official PDF Reports
 * - Persistent storage in localStorage
 */

'use strict';

window.SquadState = {
  homeClub: JSON.parse(localStorage.getItem('tahleel-home-club') || 'null') || {
    name: 'مولودية الجزائر',
    shortName: 'MCA',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/MC_Alger_logo.svg/200px-MC_Alger_logo.svg.png',
    color: '#10B981',
    stadium: 'ملعب 5 جويلية 1962'
  },
  awayClub: JSON.parse(localStorage.getItem('tahleel-away-club') || 'null') || {
    name: 'شباب بلوزداد',
    shortName: 'CRB',
    logo: 'https://upload.wikimedia.org/wikipedia/ar/thumb/8/87/CR_Belouizdad_logo.svg/200px-CR_Belouizdad_logo.svg.png',
    color: '#EF4444',
    stadium: 'ملعب 20 أوت 1955'
  },
  currentFilter: 'all',
  editingPlayerId: null,
  players: JSON.parse(localStorage.getItem('tahleel-squad-players') || 'null') || getDefaultSquadPlayers()
};

function getDefaultSquadPlayers() {
  return [
    { id: 'p1', name: 'فريد شعال', num: 1, pos: 'GK', posName: 'حارس مرمى', starter: true, foot: 'يمنى', age: 29, height: 191, photo: '', note: 'رد فعل ممتاز وتوجيه مستمر لخط الدفاع' },
    { id: 'p2', name: 'أيوب عبد اللاوي', num: 4, pos: 'CB', posName: 'قلب دفاع', starter: true, foot: 'يسرى', age: 31, height: 186, photo: '', note: 'قوة في الالتحامات الهوائية وبناء اللعب من الخلف' },
    { id: 'p3', name: 'زين الدين بلعيد', num: 5, pos: 'CB', posName: 'قلب دفاع', starter: true, foot: 'يمنى', age: 25, height: 188, photo: '', note: 'سرعة في استرجاع الكرات والتغطية في العمق' },
    { id: 'p4', name: 'يوسف لعوافي', num: 3, pos: 'LB', posName: 'ظهير أيسر', starter: true, foot: 'يسرى', age: 28, height: 178, photo: '', note: 'مساندة هجومية دائمة ودقة في العرضيات' },
    { id: 'p5', name: 'مختار بلخيتر', num: 22, pos: 'RB', posName: 'ظهير أيمن', starter: true, foot: 'يمنى', age: 32, height: 180, photo: '', note: 'انضباط تكتيكي عالي وسرعة العودة الدفاعية' },
    { id: 'p6', name: 'أسامة شيتة', num: 6, pos: 'CDM', posName: 'وسط ارتكاز', starter: true, foot: 'يمنى', age: 27, height: 182, photo: '', note: 'قطع خطوط التمرير وافتكاك الكرات' },
    { id: 'p7', name: 'سفيان فيغولي', num: 8, pos: 'CM', posName: 'وسط ميدان', starter: true, foot: 'يمنى', age: 34, height: 177, photo: '', note: 'خبرة قيادية وتحكم ممتاز في نسق ورتم المباراة' },
    { id: 'p8', name: 'يوسف بلايلي', num: 10, pos: 'CAM', posName: 'صانع ألعاب', starter: true, foot: 'يمنى', age: 32, height: 181, photo: '', note: 'مهارة فردية عالية في المراوغة وصناعة الفرص الحاسمة' },
    { id: 'p9', name: 'رياض محرز', num: 7, pos: 'RW', posName: 'جناح أيمن', starter: true, foot: 'يسرى', age: 33, height: 179, photo: '', note: 'قدرة فائقة على كسر التكتل الدفاعي والتسديد المقوس' },
    { id: 'p10', name: 'محمد عمورة', num: 18, pos: 'LW', posName: 'جناح أيسر', starter: true, foot: 'يمنى', age: 24, height: 170, photo: '', note: 'سرعة انفجارية في الهجمات المرتدة خلف المدافعين' },
    { id: 'p11', name: 'بغداد بونجاح', num: 11, pos: 'ST', posName: 'رأس حربة', starter: true, foot: 'يمنى', age: 32, height: 184, photo: '', note: 'محطة هجومية قوية وضغط شرس على مدافعي المنافس' },
    { id: 'p12', name: 'ألكسيس قندوز', num: 16, pos: 'GK', posName: 'حارس مرمى', starter: false, foot: 'يمنى', age: 28, height: 190, photo: '', note: 'حارس بديل جاهز' },
    { id: 'p13', name: 'هشام بوداوي', num: 14, pos: 'CM', posName: 'وسط ميدان', starter: false, foot: 'يمنى', age: 25, height: 175, photo: '', note: 'طاقة بدنية عالية وافتكاك للكرة' },
    { id: 'p14', name: 'فارس شعيبي', num: 17, pos: 'CAM', posName: 'صانع ألعاب', starter: false, foot: 'يمنى', age: 21, height: 183, photo: '', note: 'رؤية ممتازة وتمريرات بينية متقنة' },
    { id: 'p15', name: 'إسلام سليماني', num: 9, pos: 'ST', posName: 'رأس حربة', starter: false, foot: 'يمنى', age: 36, height: 188, photo: '', note: 'خبرة دولية وقوة تهديفية بالرأس' }
  ];
}

document.addEventListener('DOMContentLoaded', () => {
  initSquadManager();
});

function initSquadManager() {
  initClubCards();
  initRosterFilters();
  initPlayerModal();
  renderSquadGrid();
}

// ── Club Profiles Management (Home & Away) ────────────────
function initClubCards() {
  // Update inputs with saved state
  const homeNameInput = document.getElementById('homeClubName');
  const homeStadiumInput = document.getElementById('homeClubStadium');
  const homeColorInput = document.getElementById('homeClubColor');
  const awayNameInput = document.getElementById('awayClubName');
  const awayStadiumInput = document.getElementById('awayClubStadium');
  const awayColorInput = document.getElementById('awayClubColor');

  if (homeNameInput) homeNameInput.value = SquadState.homeClub.name;
  if (homeStadiumInput) homeStadiumInput.value = SquadState.homeClub.stadium || '';
  if (homeColorInput) homeColorInput.value = SquadState.homeClub.color;

  if (awayNameInput) awayNameInput.value = SquadState.awayClub.name;
  if (awayStadiumInput) awayStadiumInput.value = SquadState.awayClub.stadium || '';
  if (awayColorInput) awayColorInput.value = SquadState.awayClub.color;

  updateClubLogoUI('home', SquadState.homeClub.logo);
  updateClubLogoUI('away', SquadState.awayClub.logo);

  // Logo upload listeners
  document.getElementById('homeLogoUpload')?.addEventListener('change', e => {
    handleLogoFile(e.target.files[0], 'home');
  });

  document.getElementById('awayLogoUpload')?.addEventListener('change', e => {
    handleLogoFile(e.target.files[0], 'away');
  });

  // Inputs change listeners
  homeNameInput?.addEventListener('input', e => {
    SquadState.homeClub.name = e.target.value.trim();
    saveSquadState();
  });
  homeStadiumInput?.addEventListener('input', e => {
    SquadState.homeClub.stadium = e.target.value.trim();
    saveSquadState();
  });
  homeColorInput?.addEventListener('input', e => {
    SquadState.homeClub.color = e.target.value;
    saveSquadState();
  });

  awayNameInput?.addEventListener('input', e => {
    SquadState.awayClub.name = e.target.value.trim();
    saveSquadState();
  });
  awayStadiumInput?.addEventListener('input', e => {
    SquadState.awayClub.stadium = e.target.value.trim();
    saveSquadState();
  });
  awayColorInput?.addEventListener('input', e => {
    SquadState.awayClub.color = e.target.value;
    saveSquadState();
  });

  // Club Presets Dropdowns
  document.getElementById('homeClubPresets')?.addEventListener('change', e => {
    applyClubPreset('home', e.target.value);
  });
  document.getElementById('awayClubPresets')?.addEventListener('change', e => {
    applyClubPreset('away', e.target.value);
  });
}

function handleLogoFile(file, team) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const dataUrl = e.target.result;
    if (team === 'home') {
      SquadState.homeClub.logo = dataUrl;
    } else {
      SquadState.awayClub.logo = dataUrl;
    }
    updateClubLogoUI(team, dataUrl);
    saveSquadState();
    showToast(`تم تحديث شعار ${team === 'home' ? 'الفريق المضيف' : 'الفريق الزائر'} بنجاح!`, 'success');
  };
  reader.readAsDataURL(file);
}

function updateClubLogoUI(team, logoUrl) {
  const preview = document.getElementById(`${team}LogoPreview`);
  if (!preview) return;
  if (logoUrl) {
    preview.innerHTML = `<img src="${logoUrl}" alt="شعار النادي" style="width:100%; height:100%; object-fit:contain;">`;
  } else {
    preview.innerHTML = `<span style="font-size:2rem;">🛡️</span>`;
  }
}

function applyClubPreset(team, key) {
  const presets = {
    mca: { name: 'مولودية الجزائر', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/MC_Alger_logo.svg/200px-MC_Alger_logo.svg.png', color: '#10B981', stadium: 'ملعب 5 جويلية 1962' },
    crb: { name: 'شباب بلوزداد', logo: 'https://upload.wikimedia.org/wikipedia/ar/thumb/8/87/CR_Belouizdad_logo.svg/200px-CR_Belouizdad_logo.svg.png', color: '#EF4444', stadium: 'ملعب 20 أوت 1955' },
    usma: { name: 'اتحاد الجزائر', logo: 'https://upload.wikimedia.org/wikipedia/fr/thumb/f/f6/USM_Alger_logo.svg/200px-USM_Alger_logo.svg.png', color: '#EF4444', stadium: 'ملعب عمر حمادي' },
    jsk: { name: 'شبيبة القبائل', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/JS_Kabylie_logo.svg/200px-JS_Kabylie_logo.svg.png', color: '#FACC15', stadium: 'ملعب حسين آيت أحمد' },
    ess: { name: 'وفاق سطيف', logo: 'https://upload.wikimedia.org/wikipedia/fr/thumb/5/52/Entente_Sportive_de_S%C3%A9tif.svg/200px-Entente_Sportive_de_S%C3%A9tif.svg.png', color: '#0F172A', stadium: 'ملعب 8 ماي 1945' },
    csc: { name: 'شباب قسنطينة', logo: 'https://upload.wikimedia.org/wikipedia/fr/thumb/3/36/Logo_Club_Sportif_Constantinois.svg/200px-Logo_Club_Sportif_Constantinois.svg.png', color: '#10B981', stadium: 'ملعب الشهيد حملاوي' },
    algeria: { name: 'المنتخب الجزائري 🇩🇿', logo: 'https://upload.wikimedia.org/wikipedia/fr/thumb/c/c5/Logo_F%C3%A9d%C3%A9ration_Alg%C3%A9rienne_Football.svg/200px-Logo_F%C3%A9d%C3%A9ration_Alg%C3%A9rienne_Football.svg.png', color: '#10B981', stadium: 'ملعب نيلسون مانديلا — براقي' }
  };

  const p = presets[key];
  if (!p) return;

  if (team === 'home') {
    SquadState.homeClub = { ...p };
    document.getElementById('homeClubName').value = p.name;
    document.getElementById('homeClubStadium').value = p.stadium;
    document.getElementById('homeClubColor').value = p.color;
    updateClubLogoUI('home', p.logo);
  } else {
    SquadState.awayClub = { ...p };
    document.getElementById('awayClubName').value = p.name;
    document.getElementById('awayClubStadium').value = p.stadium;
    document.getElementById('awayClubColor').value = p.color;
    updateClubLogoUI('away', p.logo);
  }

  saveSquadState();
  showToast(`تم تطبيق بيانات: ${p.name}`, 'success');
}

// ── Roster Filter Tabs ────────────────────────────────────
function initRosterFilters() {
  const pills = document.querySelectorAll('.roster-tab-btn');
  pills.forEach(btn => {
    btn.addEventListener('click', () => {
      pills.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      SquadState.currentFilter = btn.dataset.filter;
      renderSquadGrid();
    });
  });

  const searchInput = document.getElementById('searchPlayerInput');
  searchInput?.addEventListener('input', () => {
    renderSquadGrid();
  });

  document.getElementById('addNewPlayerBtn')?.addEventListener('click', () => {
    openAddPlayerModal();
  });

  document.getElementById('resetDefaultSquadBtn')?.addEventListener('click', () => {
    if (confirm('هل ترغب في إعادة ضبط قائمة اللاعبين إلى التشكيلة النموذجية الافتراضية؟')) {
      SquadState.players = getDefaultSquadPlayers();
      saveSquadState();
      renderSquadGrid();
      showToast('تمت استعادة التشكيلة النموذجية بنجاح!', 'success');
    }
  });
}

// ── Render Squad Grid ─────────────────────────────────────
function renderSquadGrid() {
  const container = document.getElementById('squadGridContainer');
  if (!container) return;

  const searchQuery = document.getElementById('searchPlayerInput')?.value.trim().toLowerCase() || '';
  const filter = SquadState.currentFilter;

  let list = SquadState.players;

  // Filter by position or status
  if (filter === 'starters') {
    list = list.filter(p => p.starter);
  } else if (filter === 'bench') {
    list = list.filter(p => !p.starter);
  } else if (filter === 'GK') {
    list = list.filter(p => p.pos === 'GK');
  } else if (filter === 'DEF') {
    list = list.filter(p => ['CB', 'LB', 'RB'].includes(p.pos));
  } else if (filter === 'MID') {
    list = list.filter(p => ['CDM', 'CM', 'CAM'].includes(p.pos));
  } else if (filter === 'FWD') {
    list = list.filter(p => ['RW', 'LW', 'ST'].includes(p.pos));
  }

  // Filter by search query
  if (searchQuery) {
    list = list.filter(p => p.name.toLowerCase().includes(searchQuery) || p.num.toString().includes(searchQuery) || (p.posName && p.posName.toLowerCase().includes(searchQuery)));
  }

  // Update counter badges
  const startersCount = SquadState.players.filter(p => p.starter).length;
  const benchCount = SquadState.players.filter(p => !p.starter).length;
  const counterEl = document.getElementById('squadCounterBadge');
  if (counterEl) {
    counterEl.textContent = `الإجمالي: ${SquadState.players.length} لاعب (${startersCount} أساسي · ${benchCount} بديل)`;
  }

  if (list.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align:center; padding:40px; color:var(--text-muted); background:var(--bg-3); border-radius:12px; border:1px dashed var(--card-border);">
        <div style="font-size:2.5rem; margin-bottom:8px;">📭</div>
        <p>لا يوجد لاعبون مطابقون للفلتر أو البحث المحدد.</p>
        <button class="btn btn--primary btn--sm" style="margin-top:10px;" onclick="openAddPlayerModal()">+ إضافة لاعب جديد</button>
      </div>
    `;
    return;
  }

  const teamColor = SquadState.homeClub.color || '#00D4FF';

  container.innerHTML = list.map(p => {
    const posBg = p.pos === 'GK' ? '#F59E0B' : (['CB', 'LB', 'RB'].includes(p.pos) ? '#3B82F6' : (['CDM', 'CM', 'CAM'].includes(p.pos) ? '#10B981' : '#EF4444'));

    return `
      <div class="player-card" data-id="${p.id}">
        <!-- Jersey Number Badge -->
        <div class="player-card__num" style="background:${teamColor}; color:#000;">
          #${p.num}
        </div>

        <!-- Lineup Status Ribbon -->
        <span class="player-card__status ${p.starter ? 'starter' : 'bench'}">
          ${p.starter ? '⭐ أساسي' : 'بديل'}
        </span>

        <!-- Photo Avatar -->
        <div class="player-card__avatar">
          ${p.photo 
            ? `<img src="${p.photo}" alt="${escapeHtml(p.name)}" class="player-avatar-img">`
            : `<div class="player-avatar-fallback" style="border-color:${teamColor}; color:${teamColor};">
                <span>#${p.num}</span>
               </div>`
          }
        </div>

        <!-- Name & Position -->
        <div class="player-card__info">
          <strong class="player-name">${escapeHtml(p.name)}</strong>
          <span class="player-pos-badge" style="background:${posBg}22; color:${posBg}; border:1px solid ${posBg}55;">
            ${p.pos} · ${p.posName || 'لاعب'}
          </span>
        </div>

        <!-- Attributes Grid -->
        <div class="player-card__meta">
          <div class="meta-pill" title="القدم المفضلة">
            <span>👟 ${p.foot || 'يمنى'}</span>
          </div>
          <div class="meta-pill" title="العمر">
            <span>🎂 ${p.age ? p.age + ' سنة' : '--'}</span>
          </div>
          <div class="meta-pill" title="الطول">
            <span>📏 ${p.height ? p.height + ' سم' : '--'}</span>
          </div>
        </div>

        ${p.note ? `<p class="player-card__note" title="${escapeHtml(p.note)}">📝 ${escapeHtml(p.note)}</p>` : ''}

        <!-- Actions -->
        <div class="player-card__actions">
          <button class="btn-card-act" onclick="editPlayer('${p.id}')" title="تعديل بيانات اللاعب">✎ تعديل</button>
          <button class="btn-card-act btn-card-act--del" onclick="deletePlayer('${p.id}')" title="حذف اللاعب من القائمة">🗑️ حذف</button>
        </div>
      </div>
    `;
  }).join('');
}

// ── Add / Edit Player Modal ───────────────────────────────
function initPlayerModal() {
  const modal = document.getElementById('playerModal');
  const closeBtn = document.getElementById('closePlayerModal');
  const cancelBtn = document.getElementById('cancelPlayerBtn');
  const saveBtn = document.getElementById('savePlayerBtn');
  const photoInput = document.getElementById('playerPhotoUpload');

  [closeBtn, cancelBtn].forEach(b => {
    b?.addEventListener('click', () => {
      if (modal) modal.style.display = 'none';
    });
  });

  photoInput?.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      document.getElementById('playerPhotoPreview').src = ev.target.result;
      document.getElementById('playerPhotoPreview').style.display = 'block';
    };
    reader.readAsDataURL(file);
  });

  saveBtn?.addEventListener('click', savePlayer);
}

window.openAddPlayerModal = function() {
  SquadState.editingPlayerId = null;
  const modal = document.getElementById('playerModal');
  if (!modal) return;

  document.getElementById('playerModalTitle').textContent = '➕ إضافة لاعب جديد للقائمة';
  document.getElementById('modalPlayerName').value = '';
  document.getElementById('modalPlayerNum').value = (SquadState.players.length + 1).toString();
  document.getElementById('modalPlayerPos').value = 'CM';
  document.getElementById('modalPlayerFoot').value = 'يمنى';
  document.getElementById('modalPlayerStarter').checked = SquadState.players.filter(p => p.starter).length < 11;
  document.getElementById('modalPlayerAge').value = '24';
  document.getElementById('modalPlayerHeight').value = '180';
  document.getElementById('modalPlayerNote').value = '';
  
  const preview = document.getElementById('playerPhotoPreview');
  preview.src = '';
  preview.style.display = 'none';

  modal.style.display = 'flex';
};

window.editPlayer = function(id) {
  const p = SquadState.players.find(x => x.id === id);
  if (!p) return;

  SquadState.editingPlayerId = id;
  const modal = document.getElementById('playerModal');
  if (!modal) return;

  document.getElementById('playerModalTitle').textContent = `✎ تعديل بيانات اللاعب: ${p.name}`;
  document.getElementById('modalPlayerName').value = p.name;
  document.getElementById('modalPlayerNum').value = p.num;
  document.getElementById('modalPlayerPos').value = p.pos;
  document.getElementById('modalPlayerFoot').value = p.foot || 'يمنى';
  document.getElementById('modalPlayerStarter').checked = p.starter ?? true;
  document.getElementById('modalPlayerAge').value = p.age || '';
  document.getElementById('modalPlayerHeight').value = p.height || '';
  document.getElementById('modalPlayerNote').value = p.note || '';

  const preview = document.getElementById('playerPhotoPreview');
  if (p.photo) {
    preview.src = p.photo;
    preview.style.display = 'block';
  } else {
    preview.src = '';
    preview.style.display = 'none';
  }

  modal.style.display = 'flex';
};

function savePlayer() {
  const name = document.getElementById('modalPlayerName')?.value.trim();
  const num = parseInt(document.getElementById('modalPlayerNum')?.value || '1');
  const pos = document.getElementById('modalPlayerPos')?.value || 'CM';
  const foot = document.getElementById('modalPlayerFoot')?.value || 'يمنى';
  const starter = document.getElementById('modalPlayerStarter')?.checked ?? true;
  const age = parseInt(document.getElementById('modalPlayerAge')?.value || '0');
  const height = parseInt(document.getElementById('modalPlayerHeight')?.value || '0');
  const note = document.getElementById('modalPlayerNote')?.value.trim() || '';
  const photo = document.getElementById('playerPhotoPreview')?.src || '';

  if (!name) {
    showToast('يرجى إدخال اسم اللاعب', 'error');
    return;
  }

  const posNames = {
    GK: 'حارس مرمى', CB: 'قلب دفاع', LB: 'ظهير أيسر', RB: 'ظهير أيمن',
    CDM: 'وسط ارتكاز', CM: 'وسط ميدان', CAM: 'صانع ألعاب',
    RW: 'جناح أيمن', LW: 'جناح أيسر', ST: 'رأس حربة'
  };

  if (SquadState.editingPlayerId) {
    // Update existing
    const idx = SquadState.players.findIndex(x => x.id === SquadState.editingPlayerId);
    if (idx !== -1) {
      SquadState.players[idx] = {
        ...SquadState.players[idx],
        name, num, pos, posName: posNames[pos] || pos, foot, starter, age, height, note,
        photo: photo && !photo.includes('window.location') ? photo : SquadState.players[idx].photo
      };
      showToast(`تم تحديث بيانات اللاعب: ${name}`, 'success');
    }
  } else {
    // Add new
    const newPlayer = {
      id: 'p_' + Date.now(),
      name, num, pos, posName: posNames[pos] || pos, foot, starter, age, height, note,
      photo: photo && !photo.includes('window.location') ? photo : ''
    };
    SquadState.players.push(newPlayer);
    showToast(`تمت إضافة اللاعب: ${name} للقائمة!`, 'success');
  }

  saveSquadState();
  renderSquadGrid();
  document.getElementById('playerModal').style.display = 'none';
}

window.deletePlayer = function(id) {
  const p = SquadState.players.find(x => x.id === id);
  if (!p) return;

  if (confirm(`هل أنت متأكد من حذف اللاعب (${p.name} #${p.num}) من القائمة؟`)) {
    SquadState.players = SquadState.players.filter(x => x.id !== id);
    saveSquadState();
    renderSquadGrid();
    showToast(`تم حذف اللاعب: ${p.name}`, 'info');
  }
};

function saveSquadState() {
  localStorage.setItem('tahleel-home-club', JSON.stringify(SquadState.homeClub));
  localStorage.setItem('tahleel-away-club', JSON.stringify(SquadState.awayClub));
  localStorage.setItem('tahleel-squad-players', JSON.stringify(SquadState.players));
}

function escapeHtml(str) {
  if (!str) return '';
  return str.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
