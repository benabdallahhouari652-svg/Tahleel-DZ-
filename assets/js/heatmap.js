/**
 * تحليل DZ — Heatmap & Touchmap Studio (التحليل الحراري وخريطة اللمسات والتسديدات)
 * Opta / Wyscout / SofaScore inspired interactive pitch heatmap engine
 */

'use strict';

(function () {
  const HeatmapStudio = {
    canvas: null,
    ctx: null,
    points: [],
    mode: 'heatmap', // 'heatmap', 'touchmap', 'shotmap', 'pressure'
    radius: 45,
    intensity: 0.65,
    selectedTeam: 'home',
    selectedPlayer: 'all',
    colorPalette: null,

    init() {
      this.canvas = document.getElementById('heatmapCanvas');
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d');

      this.createColorPalette();
      this.bindEvents();
      this.populatePlayerSelect();
      this.loadSampleData('preset-right-wing');
      this.render();
    },

    createColorPalette() {
      // 256x1 gradient palette for heat visualization
      const pCanvas = document.createElement('canvas');
      pCanvas.width = 1;
      pCanvas.height = 256;
      const pCtx = pCanvas.getContext('2d');

      const grad = pCtx.createLinearGradient(0, 0, 0, 256);
      grad.addColorStop(0.0, 'rgba(0, 0, 255, 0)');
      grad.addColorStop(0.15, 'rgba(0, 212, 255, 0.4)');
      grad.addColorStop(0.35, 'rgba(6, 214, 160, 0.65)');
      grad.addColorStop(0.60, 'rgba(255, 209, 102, 0.85)');
      grad.addColorStop(0.80, 'rgba(255, 107, 107, 0.95)');
      grad.addColorStop(1.0, 'rgba(255, 30, 80, 1.0)');

      pCtx.fillStyle = grad;
      pCtx.fillRect(0, 0, 1, 256);
      this.colorPalette = pCtx.getImageData(0, 0, 1, 256).data;
    },

    bindEvents() {
      if (!this.canvas) return;

      // Click to add points
      let isPainting = false;
      const addPointFromEvent = (e) => {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        let ptType = 'touch';
        let xgVal = 0.08;
        let isGoal = false;

        if (this.mode === 'shotmap') {
          ptType = 'shot';
          // Higher xG closer to goal
          const distToGoal = Math.hypot(this.canvas.width - 25 - x, this.canvas.height / 2 - y);
          xgVal = Math.max(0.04, Math.min(0.85, +( (1 - (distToGoal / (this.canvas.width * 0.4))) * 0.75 ).toFixed(2)));
          isGoal = Math.random() < xgVal;
        } else if (this.mode === 'pressure') {
          ptType = 'pressure';
        }

        this.points.push({
          x,
          y,
          weight: 1,
          type: ptType,
          team: this.selectedTeam,
          player: this.selectedPlayer,
          xg: xgVal,
          isGoal: isGoal,
          success: Math.random() > 0.2
        });

        this.render();
        this.updateStats();
      };

      this.canvas.addEventListener('mousedown', (e) => {
        isPainting = true;
        addPointFromEvent(e);
      });

      this.canvas.addEventListener('mousemove', (e) => {
        if (!isPainting) return;
        if (this.mode === 'heatmap' || this.mode === 'pressure') {
          addPointFromEvent(e);
        }
      });

      window.addEventListener('mouseup', () => { isPainting = false; });

      // Mode buttons
      document.querySelectorAll('.hm-mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.hm-mode-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.mode = btn.dataset.mode;
          this.render();
          this.updateStats();
        });
      });

      // Controls: Radius & Intensity
      const radSlider = document.getElementById('hmRadiusSlider');
      if (radSlider) {
        radSlider.addEventListener('input', (e) => {
          this.radius = parseInt(e.target.value, 10);
          document.getElementById('hmRadiusVal').textContent = `${this.radius}px`;
          this.render();
        });
      }

      const intSlider = document.getElementById('hmIntensitySlider');
      if (intSlider) {
        intSlider.addEventListener('input', (e) => {
          this.intensity = parseFloat(e.target.value);
          document.getElementById('hmIntensityVal').textContent = `${Math.round(this.intensity * 100)}%`;
          this.render();
        });
      }

      // Team / Player Filters
      const teamFilter = document.getElementById('hmTeamSelect');
      if (teamFilter) {
        teamFilter.addEventListener('change', (e) => {
          this.selectedTeam = e.target.value;
          this.populatePlayerSelect();
          this.render();
          this.updateStats();
        });
      }

      const playerFilter = document.getElementById('hmPlayerSelect');
      if (playerFilter) {
        playerFilter.addEventListener('change', (e) => {
          this.selectedPlayer = e.target.value;
          this.render();
          this.updateStats();
        });
      }

      // Presets
      document.querySelectorAll('.hm-preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          this.loadSampleData(btn.dataset.preset);
        });
      });

      // Clear button
      const clearBtn = document.getElementById('hmClearBtn');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          this.points = [];
          this.render();
          this.updateStats();
          if (window.showToast) showToast('تم مسح بيانات الخريطة الحرارية', 'info');
        });
      }

      // Export Image
      const exportBtn = document.getElementById('hmExportBtn');
      if (exportBtn) {
        exportBtn.addEventListener('click', () => this.exportImage());
      }

      // Send to AI Assistant
      const sendToAiBtn = document.getElementById('hmAnalyzeWithAiBtn');
      if (sendToAiBtn) {
        sendToAiBtn.addEventListener('click', () => {
          this.analyzeCurrentHeatmapWithAI();
        });
      }
    },

    populatePlayerSelect() {
      const select = document.getElementById('hmPlayerSelect');
      if (!select) return;

      select.innerHTML = '<option value="all">⭐ كامل الفريق (All Players)</option>';

      // Look up squad data if available from window.SquadState
      let squad = [];
      if (window.SquadState && window.SquadState.teams) {
        const teamObj = window.SquadState.teams[this.selectedTeam] || window.SquadState.teams.home;
        squad = (teamObj && teamObj.players) ? teamObj.players : [];
      }

      if (squad.length === 0) {
        squad = [
          { name: 'يوسف بلايلي', number: 10, position: 'جناح أيسر' },
          { name: 'رياض محرز', number: 7, position: 'جناح أيمن' },
          { name: 'إسماعيل بن ناصر', number: 22, position: 'وسط دفاعي' },
          { name: 'رامي بن سبعيني', number: 21, position: 'مدافع أيسر' },
          { name: 'أنتوني ماندريا', number: 1, position: 'حارس مرمى' }
        ];
      }

      squad.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.name;
        opt.textContent = `#${p.number || ''} ${p.name} (${p.position || 'لاعب'})`;
        select.appendChild(opt);
      });
    },

    loadSampleData(presetKey) {
      this.points = [];
      const W = this.canvas ? this.canvas.width : 840;
      const H = this.canvas ? this.canvas.height : 520;

      const randomGaussian = (mean, stdev) => {
        let u = 1 - Math.random();
        let v = Math.random();
        let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
        return mean + z * stdev;
      };

      if (presetKey === 'preset-right-wing') {
        // Overload on right wing attacking half
        this.mode = 'heatmap';
        for (let i = 0; i < 90; i++) {
          const x = Math.max(W * 0.45, Math.min(W * 0.92, randomGaussian(W * 0.72, W * 0.12)));
          const y = Math.max(H * 0.06, Math.min(H * 0.38, randomGaussian(H * 0.20, H * 0.08)));
          this.points.push({ x, y, weight: 1, type: 'touch', team: 'home', player: 'رياض محرز', success: true });
        }
      } else if (presetKey === 'preset-central-mid') {
        // Deep-lying / central playmaker
        this.mode = 'heatmap';
        for (let i = 0; i < 110; i++) {
          const x = Math.max(W * 0.25, Math.min(W * 0.75, randomGaussian(W * 0.50, W * 0.14)));
          const y = Math.max(H * 0.20, Math.min(H * 0.80, randomGaussian(H * 0.50, H * 0.15)));
          this.points.push({ x, y, weight: 1, type: 'touch', team: 'home', player: 'إسماعيل بن ناصر', success: true });
        }
      } else if (presetKey === 'preset-high-press') {
        // High pressing regains in opponent final third
        this.mode = 'pressure';
        for (let i = 0; i < 70; i++) {
          const x = Math.max(W * 0.60, Math.min(W * 0.94, randomGaussian(W * 0.78, W * 0.09)));
          const y = Math.max(H * 0.12, Math.min(H * 0.88, randomGaussian(H * 0.50, H * 0.22)));
          this.points.push({ x, y, weight: 1.2, type: 'pressure', team: 'home', player: 'all', success: Math.random() > 0.3 });
        }
      } else if (presetKey === 'preset-gk-box') {
        // Goalkeeper coverage inside penalty area
        this.mode = 'heatmap';
        for (let i = 0; i < 50; i++) {
          const x = Math.max(W * 0.03, Math.min(W * 0.19, randomGaussian(W * 0.09, W * 0.04)));
          const y = Math.max(H * 0.28, Math.min(H * 0.72, randomGaussian(H * 0.50, H * 0.11)));
          this.points.push({ x, y, weight: 1, type: 'touch', team: 'home', player: 'أنتوني ماندريا', success: true });
        }
      } else if (presetKey === 'preset-shotmap') {
        // Realistic shot map with goals and various xG
        this.mode = 'shotmap';
        const shots = [
          { x: W * 0.88, y: H * 0.48, xg: 0.72, isGoal: true },
          { x: W * 0.82, y: H * 0.44, xg: 0.38, isGoal: true },
          { x: W * 0.77, y: H * 0.36, xg: 0.14, isGoal: false },
          { x: W * 0.79, y: H * 0.62, xg: 0.18, isGoal: false },
          { x: W * 0.72, y: H * 0.49, xg: 0.08, isGoal: false },
          { x: W * 0.89, y: H * 0.53, xg: 0.65, isGoal: true },
          { x: W * 0.84, y: H * 0.32, xg: 0.12, isGoal: false },
          { x: W * 0.75, y: H * 0.58, xg: 0.09, isGoal: false },
          { x: W * 0.80, y: H * 0.48, xg: 0.24, isGoal: false }
        ];
        shots.forEach(s => {
          this.points.push({
            x: s.x,
            y: s.y,
            weight: 1,
            type: 'shot',
            team: 'home',
            player: 'all',
            xg: s.xg,
            isGoal: s.isGoal,
            success: true
          });
        });
      }

      // Sync active button
      document.querySelectorAll('.hm-mode-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.mode === this.mode);
      });

      this.render();
      this.updateStats();
      if (window.showToast) showToast('تم تحميل النموذج التكتيكي بنجاح', 'success');
    },

    render() {
      if (!this.ctx) return;
      const W = this.canvas.width;
      const H = this.canvas.height;

      // 1. Draw Football Pitch
      this.drawPitch(W, H);

      // Filter points
      const activePoints = this.points.filter(p => {
        if (this.selectedTeam !== 'both' && p.team && p.team !== this.selectedTeam) return false;
        if (this.selectedPlayer !== 'all' && p.player && p.player !== this.selectedPlayer) return false;
        return true;
      });

      if (activePoints.length === 0) return;

      if (this.mode === 'heatmap') {
        this.renderHeatmapPass(activePoints, W, H);
      } else if (this.mode === 'touchmap' || this.mode === 'pressure') {
        this.renderTouchmapPass(activePoints);
      } else if (this.mode === 'shotmap') {
        this.renderShotmapPass(activePoints);
      }
    },

    drawPitch(W, H) {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, W, H);

      // Turf gradient
      const turf = ctx.createLinearGradient(0, 0, 0, H);
      turf.addColorStop(0, '#13281c');
      turf.addColorStop(0.5, '#0e2016');
      turf.addColorStop(1, '#112519');
      ctx.fillStyle = turf;
      ctx.fillRect(0, 0, W, H);

      // Grass mowing cut stripes
      const stripeWidth = W / 14;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
      for (let i = 0; i < 14; i += 2) {
        ctx.fillRect(i * stripeWidth, 0, stripeWidth, H);
      }

      // Lines style
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 2;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';

      const pad = 24;
      const pW = W - pad * 2;
      const pH = H - pad * 2;

      // Outer boundary line
      ctx.strokeRect(pad, pad, pW, pH);

      // Halfway line & Center Circle
      ctx.beginPath();
      ctx.moveTo(W / 2, pad);
      ctx.lineTo(W / 2, H - pad);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(W / 2, H / 2, pH * 0.18, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(W / 2, H / 2, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Left Penalty Box
      const boxW = pW * 0.165;
      const boxH = pH * 0.54;
      const boxY = pad + (pH - boxH) / 2;
      ctx.strokeRect(pad, boxY, boxW, boxH);

      // Left 6-yard Box
      const gBoxW = pW * 0.055;
      const gBoxH = pH * 0.26;
      const gBoxY = pad + (pH - gBoxH) / 2;
      ctx.strokeRect(pad, gBoxY, gBoxW, gBoxH);

      // Left Penalty Spot & Arc
      const pSpotX1 = pad + pW * 0.11;
      ctx.beginPath();
      ctx.arc(pSpotX1, H / 2, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(pSpotX1, H / 2, pH * 0.13, -0.65, 0.65);
      ctx.stroke();

      // Left Goal Net
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.strokeRect(pad - 12, pad + (pH - gBoxH * 0.8) / 2, 12, gBoxH * 0.8);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';

      // Right Penalty Box
      const rBoxX = W - pad - boxW;
      ctx.strokeRect(rBoxX, boxY, boxW, boxH);

      // Right 6-yard Box
      const rgBoxX = W - pad - gBoxW;
      ctx.strokeRect(rgBoxX, gBoxY, gBoxW, gBoxH);

      // Right Penalty Spot & Arc
      const pSpotX2 = W - pad - pW * 0.11;
      ctx.beginPath();
      ctx.arc(pSpotX2, H / 2, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(pSpotX2, H / 2, pH * 0.13, Math.PI - 0.65, Math.PI + 0.65);
      ctx.stroke();

      // Right Goal Net
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.strokeRect(W - pad, pad + (pH - gBoxH * 0.8) / 2, 12, gBoxH * 0.8);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';

      // Corner Arcs
      const cR = 12;
      ctx.beginPath(); ctx.arc(pad, pad, cR, 0, Math.PI / 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(pad, H - pad, cR, -Math.PI / 2, 0); ctx.stroke();
      ctx.beginPath(); ctx.arc(W - pad, pad, cR, Math.PI / 2, Math.PI); ctx.stroke();
      ctx.beginPath(); ctx.arc(W - pad, H - pad, cR, Math.PI, Math.PI * 1.5); ctx.stroke();

      // Direction of attack indicator
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('اتجاه الهجوم ➔', W * 0.80, pad - 8);
      ctx.fillText('⮜ الدفاع', W * 0.20, pad - 8);
    },

    renderHeatmapPass(points, W, H) {
      // 1. Offscreen Alpha Intensity Accumulator
      const alphaCanvas = document.createElement('canvas');
      alphaCanvas.width = W;
      alphaCanvas.height = H;
      const aCtx = alphaCanvas.getContext('2d');

      const rad = this.radius;
      points.forEach(p => {
        const radGrad = aCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad);
        radGrad.addColorStop(0, `rgba(0,0,0,${this.intensity * 0.5})`);
        radGrad.addColorStop(0.5, `rgba(0,0,0,${this.intensity * 0.2})`);
        radGrad.addColorStop(1, 'rgba(0,0,0,0)');

        aCtx.fillStyle = radGrad;
        aCtx.beginPath();
        aCtx.arc(p.x, p.y, rad, 0, Math.PI * 2);
        aCtx.fill();
      });

      // 2. Colorize Alpha values with precomputed palette
      const imgData = aCtx.getImageData(0, 0, W, H);
      const data = imgData.data;
      const palette = this.colorPalette;

      for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3];
        if (alpha > 0) {
          const pIndex = alpha * 4;
          data[i]     = palette[pIndex];     // R
          data[i + 1] = palette[pIndex + 1]; // G
          data[i + 2] = palette[pIndex + 2]; // B
          data[i + 3] = Math.min(235, alpha * 1.6); // smooth alpha
        }
      }

      aCtx.putImageData(imgData, 0, 0);

      // 3. Composite onto Pitch
      this.ctx.save();
      this.ctx.globalCompositeOperation = 'screen';
      this.ctx.drawImage(alphaCanvas, 0, 0);
      this.ctx.restore();
    },

    renderTouchmapPass(points) {
      const ctx = this.ctx;
      points.forEach((p, idx) => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);

        if (p.type === 'pressure') {
          ctx.fillStyle = p.success ? '#FF4444' : '#FF9900';
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1.5;
          ctx.fill();
          ctx.stroke();

          // Outer ripple
          ctx.beginPath();
          ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(255, 68, 68, 0.4)';
          ctx.stroke();
        } else {
          ctx.fillStyle = p.success ? '#00D4FF' : '#FF6B6B';
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1.5;
          ctx.fill();
          ctx.stroke();
        }

        ctx.restore();
      });
    },

    renderShotmapPass(points) {
      const ctx = this.ctx;
      points.filter(p => p.type === 'shot').forEach(p => {
        ctx.save();
        const r = Math.max(6, Math.min(24, Math.round(p.xg * 28)));

        if (p.isGoal) {
          // Goal: Golden Star / Green Burst
          ctx.beginPath();
          ctx.arc(p.x, p.y, r + 4, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(6, 214, 160, 0.25)';
          ctx.fill();

          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.fillStyle = '#06D6A0';
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2.5;
          ctx.fill();
          ctx.stroke();

          // Goal Ball Icon
          ctx.fillStyle = '#0B132B';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('⚽', p.x, p.y);
        } else {
          // Miss or Saved shot
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0, 212, 255, 0.65)';
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1.5;
          ctx.fill();
          ctx.stroke();

          // Display xG label
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(p.xg.toFixed(2), p.x, p.y);
        }

        ctx.restore();
      });
    },

    updateStats() {
      const countEl = document.getElementById('hmPointsCount');
      if (countEl) countEl.textContent = this.points.length;

      const shots = this.points.filter(p => p.type === 'shot');
      const goals = shots.filter(p => p.isGoal);
      const totalXg = shots.reduce((sum, p) => sum + (p.xg || 0), 0);

      const shotStatEl = document.getElementById('hmShotStats');
      if (shotStatEl) {
        shotStatEl.innerHTML = `
          <span>🎯 التسديدات: <strong>${shots.length}</strong></span>
          <span>⚽ الأهداف: <strong>${goals.length}</strong></span>
          <span>📊 مجموع xG: <strong>${totalXg.toFixed(2)}</strong></span>
        `;
      }
    },

    exportImage() {
      if (!this.canvas) return;
      const link = document.createElement('a');
      link.download = `tahleel-heatmap-${this.mode}-${Date.now()}.png`;
      link.href = this.canvas.toDataURL('image/png');
      link.click();
      if (window.showToast) showToast('تم تصدير الخريطة الحرارية بجودة عالية HD', 'success');
    },

    analyzeCurrentHeatmapWithAI() {
      // Switch to AI Assistant view and seed it with Heatmap facts!
      if (window.switchView) window.switchView('ai');
      if (window.AiAssistant && window.AiAssistant.injectHeatmapContext) {
        const facts = {
          totalPoints: this.points.length,
          mode: this.mode,
          shots: this.points.filter(p => p.type === 'shot').length,
          goals: this.points.filter(p => p.isGoal).length,
          xg: this.points.filter(p => p.type === 'shot').reduce((sum, p) => sum + (p.xg || 0), 0).toFixed(2),
          player: this.selectedPlayer,
          team: this.selectedTeam
        };
        window.AiAssistant.injectHeatmapContext(facts);
      }
    }
  };

  window.HeatmapStudio = HeatmapStudio;

  // Initialize when DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    HeatmapStudio.init();
  });
})();
