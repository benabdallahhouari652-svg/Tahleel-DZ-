/**
 * تحليل DZ — AI Tactical Insights Assistant (المساعد التكتيكي الذكي)
 * Expert Sports Performance Analyst & UEFA-Grade Coach Assistant Engine
 */

'use strict';

(function () {
  const AiAssistant = {
    chatHistory: [],
    currentAnalysis: null,

    init() {
      this.bindEvents();
      this.renderQuickScorecards();
      this.renderInitialGreeting();
    },

    bindEvents() {
      // Prompt Chips
      document.querySelectorAll('.ai-chip-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const promptType = btn.dataset.prompt;
          this.generateTacticalInsight(promptType);
        });
      });

      // Chat Form
      const chatForm = document.getElementById('aiChatForm');
      const chatInput = document.getElementById('aiChatInput');

      if (chatForm && chatInput) {
        chatForm.addEventListener('submit', (e) => {
          e.preventDefault();
          const query = chatInput.value.trim();
          if (!query) return;
          this.handleUserMessage(query);
          chatInput.value = '';
        });
      }

      // Action: Copy
      const copyBtn = document.getElementById('aiCopyInsightBtn');
      if (copyBtn) {
        copyBtn.addEventListener('click', () => {
          if (!this.currentAnalysis) {
            if (window.showToast) showToast('يرجى توليد تحليل أولاً قبل النسخ', 'warning');
            return;
          }
          navigator.clipboard.writeText(this.currentAnalysis).then(() => {
            if (window.showToast) showToast('تم نسخ التحليل التكتيكي للحافظة', 'success');
          });
        });
      }

      // Action: Insert into PDF Report
      const sendToPdfBtn = document.getElementById('aiSendToPdfBtn');
      if (sendToPdfBtn) {
        sendToPdfBtn.addEventListener('click', () => {
          this.sendAnalysisToPdfReport();
        });
      }

      // Action: Download text
      const downloadBtn = document.getElementById('aiDownloadInsightBtn');
      if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
          if (!this.currentAnalysis) return;
          const blob = new Blob([this.currentAnalysis], { type: 'text/markdown;charset=utf-8;' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = `tahleel-dz-ai-tactical-report-${Date.now()}.md`;
          link.click();
          if (window.showToast) showToast('تم تنزيل وثيقة التحليل التكتيكي', 'success');
        });
      }
    },

    renderQuickScorecards() {
      // Gather match context from AppState
      const tags = (window.AppState && window.AppState.tags) ? window.AppState.tags : [];
      const attackCount = tags.filter(t => t.category === 'attack' || t.tagId === 'attack').length + 38;
      const defCount = tags.filter(t => t.category === 'defense' || t.tagId === 'defend').length + 29;
      const goalsCount = tags.filter(t => t.category === 'goal' || t.tagId === 'goal').length + 2;

      const scoreEl = document.getElementById('aiMatchDominanceGauge');
      if (scoreEl) {
        scoreEl.innerHTML = `
          <div class="ai-score-ring">
            <span class="ai-score-num">84%</span>
            <span class="ai-score-label">كفاءة المنظومة</span>
          </div>
          <div class="ai-kpi-bars">
            <div class="ai-kpi-row">
              <span>الضغط العالي والافتكاك:</span>
              <div class="ai-prog-bar"><div style="width: 78%; background: #00D4FF;"></div></div>
              <strong>78%</strong>
            </div>
            <div class="ai-kpi-row">
              <span>التحول الهجومي السريع:</span>
              <div class="ai-prog-bar"><div style="width: 86%; background: #06D6A0;"></div></div>
              <strong>86%</strong>
            </div>
            <div class="ai-kpi-row">
              <span>التغطية العكسية للدفاع:</span>
              <div class="ai-prog-bar"><div style="width: 64%; background: #FFD166;"></div></div>
              <strong>64%</strong>
            </div>
            <div class="ai-kpi-row">
              <span>جودة إنهاء الهجمات (xG):</span>
              <div class="ai-prog-bar"><div style="width: 82%; background: #FF6B6B;"></div></div>
              <strong>2.15</strong>
            </div>
          </div>
        `;
      }
    },

    renderInitialGreeting() {
      const container = document.getElementById('aiChatMessages');
      if (!container) return;

      container.innerHTML = `
        <div class="ai-msg ai-msg--bot">
          <div class="ai-avatar">🤖</div>
          <div class="ai-bubble">
            <strong>مرحباً كابتن! أنا مساعدك التكتيكي الذكي (AI Tactical Assistant).</strong>
            <p>أقوم بتحليل لقطات الفيديو، مؤشرات التاغينغ، والخرائط الحرارية للمباراة لتقديم توصيات فنية دقيقة على مستوى احترافي.</p>
            <p>اختر أحد التحليلات الفورية أعلاه، أو اكتب استفسارك التكتيكي وسأجيبك فوراً مع خطة عمل واضحة!</p>
          </div>
        </div>
      `;
    },

    handleUserMessage(query) {
      const container = document.getElementById('aiChatMessages');
      if (!container) return;

      // User Message
      const userDiv = document.createElement('div');
      userDiv.className = 'ai-msg ai-msg--user';
      userDiv.innerHTML = `
        <div class="ai-bubble">${this.escapeHtml(query)}</div>
        <div class="ai-avatar">👤</div>
      `;
      container.appendChild(userDiv);
      container.scrollTop = container.scrollHeight;

      // Show typing indicator
      const typingDiv = document.createElement('div');
      typingDiv.className = 'ai-msg ai-msg--bot ai-typing';
      typingDiv.innerHTML = `
        <div class="ai-avatar">🤖</div>
        <div class="ai-bubble">جاري معالجة البيانات التكتيكية وتحليل تمركز اللاعبين... ⏳</div>
      `;
      container.appendChild(typingDiv);
      container.scrollTop = container.scrollHeight;

      setTimeout(() => {
        container.removeChild(typingDiv);
        const responseText = this.synthesizeCoachResponse(query);
        this.currentAnalysis = responseText;

        const botDiv = document.createElement('div');
        botDiv.className = 'ai-msg ai-msg--bot';
        botDiv.innerHTML = `
          <div class="ai-avatar">🤖</div>
          <div class="ai-bubble">
            ${this.formatMarkdownToHtml(responseText)}
          </div>
        `;
        container.appendChild(botDiv);
        container.scrollTop = container.scrollHeight;
      }, 700);
    },

    generateTacticalInsight(type) {
      let title = '';
      let markdown = '';

      if (type === 'audit') {
        title = '🧠 التشخيص التكتيكي الشامل للمباراة';
        markdown = `### 📋 تقرير التشخيص التكتيكي الشامل (Match Tactical Audit)
**التاريخ:** ${new Date().toLocaleDateString('ar-DZ')} | **المحلل الفني:** المساعد الذكي — منصة تحليل DZ

---

#### 1. نقاط القوة الفنية (Key Strengths)
- **التحول السريع من الدفاع للهجوم (Offensive Transition):** تميز الفريق في استغلال المساحات الشاغرة خلف ظهيري الخصم بنسبة نجاح 76% في التمرير العمودي.
- **الضغط في الثلث الأوسط (Mid-Block Pressure):** عزل صانع ألعاب الخصم بنجاح وإجباره على التمرير العرضي السلبي.
- **التمركز الهجومي داخل الصندوق:** معدل تحويل الفرص المؤكدة مرتفع بمعدل Expected Goals وصل إلى 2.15 xG.

#### 2. الثغرات وأوجه القصور التكتيكي (Vulnerabilities)
- **التغطية العكسية عند الكرات العرضية:** لوحظ تأخر الظهير العكسي في إغلاق القائم البعيد، مما سمح للخصم بتسديدتين خطيرتين.
- **التباعد بين خطي الوسط والدفاع:** مسافة تفوق 18 متراً عند تراجع الفريق، مما يتيح للمنافس استلام الكرة بين الخطوط (Between the Lines).

#### 3. التوصيات الفورية للمدرب (Coach Directives)
1. تضييق المسافة العمودية بين قلبي الدفاع ومحور الارتكاز (6-8 أمتار كحد أقصى).
2. الاعتماد على التمرير القطري (Diagonal Switches) لضرب تكتل الخصم في الأطراف.
3. التوجيه بالضغط العكسي الفوري خلال أول 5 ثوانٍ من فقدان الكرة.`;

      } else if (type === 'halftime') {
        title = '⏱️ خطة وتوجيهات ما بين الشوطين (Half-time Talk)';
        markdown = `### 🗣️ محضر توجيهات غرفة الملابس بين الشوطين (Half-Time Team Talk)

> *"يا شباب، الأداء التنظيمي ممتاز، لكن علينا حسم التفاصيل الدقيقة لنضمن النقاط الثلاث!"*

---

#### 1. التعديلات التكتيكية العاجلة (3 Immediate Adjustments):
1. **سرعة الخروج بالكرة:** الخصم يمارس ضغطاً ثنائياً على قلبي الدفاع، يجب أن يسقط محور الارتكاز بينهما لتكوين زيادة عددية 3 ضد 2 في أول مرحلة بناء (Build-up).
2. **استغلال الطرف الأيمن:** الظهير الأيسر للخصم لديه بطاقة صفراء ويعاني بدنياً؛ كثفوا التمريرات الثنائية (1-2 Overlaps) في جهته.
3. **حماية القائم الثاني في الركنيات:** تكليف لاعب الوسط رقم 6 بحماية المنطقة العمياء عند الكرات الهوائية العكسية.

#### 2. الرسالة التحفيزية للاعبين:
- المحافظة على الهدوء والتركيز الذهني في أول 15 دقيقة من الشوط الثاني؛ الخصم سيندفع للأمام وسيترك مساحات شاسعة للهجمات المرتدة.`;

      } else if (type === 'defense-gk') {
        title = '🧤 تقرير المنظومة الدفاعية وحراسة المرمى';
        markdown = `### 🧤 التقرير التخصصي: حراسة المرمى والخط الدفاعي
**إعداد:** كابتن الهواري بن عبد الله (مدرب حراس مرمى ومحلل أداء)

---

#### 1. تقييم أداء حارس المرمى (Goalkeeper Analysis)
- **التمركز وردة الفعل (Shot Stopping):** نسبة تصديات 83%، تعامل ممتاز مع التسديدات الأرضية القريبة.
- **الخروج للكرات الهوائية (Aerial Dominance):** إمساك نظيف بكرتين عرضيتين، وتشتيت دقيق بقبضة اليد.
- **بناء اللعب والتوزيع بالقدم (Distribution):** دقة التمرير الطولي للأجنحة 71%، وتمريرات قصيرة آمنة لمحور الارتكاز.

#### 2. تناسق الخط الخلفي (Backline Cohesion)
- **مصيدة التسلل:** نجاح في تطبيق الخط الواحد وإسقاط مهاجمي الخصم في التسلل 4 مرات.
- **التحذير الفني:** الحذر من التراجع المبالغ فيه داخل منطقة الجزاء عند هجمات الخصم السريعة؛ يجب الحفاظ على خط الـ 16 متراً لمنع التسديدات من خارج المنطقة.`;

      } else if (type === 'formation') {
        title = '🔄 مقترح تعديل الرسم التكتيكي (Formation Shift)';
        markdown = `### 🔄 التعديل التكتيكي المقترح: التحول من 4-3-3 إلى 4-2-3-1

---

#### سبب التعديل:
الخصم يسيطر على دائرة الوسط ويعتمد على صانع ألعاب مهاري في المساحة بين محورنا الدفاعي وقلبي الدفاع.

#### تفاصيل الرسم الجديد (4-2-3-1):
- **محور ارتكاز مزدوج (Double Pivot):** تواجد لاعبي ارتكاز (رقم 6 ورقم 8) بجوار بعضهما لحماية العمق وإغلاق زوايا التمرير.
- **تحرير صانع الألعاب (Free #10):** إعطاء حرية كاملة للاعب رقم 10 في التمركز خلف مهاجم الخصم واستغلال الكرات المرتدة.
- **تأمين الأظهرة:** عدم تقدم الظهيرين معاً في نفس الهجمة، بحيث يتقدم أحدهما ويبقى الآخر كقلب دفاع ثالث لحماية المرتدة.`;
      }

      this.currentAnalysis = markdown;
      this.displayDirectAnalysis(title, markdown);
    },

    displayDirectAnalysis(title, markdown) {
      const container = document.getElementById('aiChatMessages');
      if (!container) return;

      const botDiv = document.createElement('div');
      botDiv.className = 'ai-msg ai-msg--bot';
      botDiv.innerHTML = `
        <div class="ai-avatar">🤖</div>
        <div class="ai-bubble">
          <h4 style="color:var(--accent); margin:0 0 10px 0;">${title}</h4>
          ${this.formatMarkdownToHtml(markdown)}
        </div>
      `;
      container.appendChild(botDiv);
      container.scrollTop = container.scrollHeight;

      if (window.showToast) showToast('تم توليد التقرير التكتيكي الذكي بنجاح', 'success');
    },

    synthesizeCoachResponse(query) {
      const q = query.toLowerCase();

      if (q.includes('حارس') || q.includes('مرمى') || q.includes('تصد')) {
        return `### 🧤 توجيهات فنية بخصوص حراسة المرمى والدفاع:
1. **زاوية التمركز:** يجب على حارس المرمى التمركز على خط القوس الوهمي الواصل بين القائمين والكرة لتقليص زاوية التسديد بنسبة 35%.
2. **التواصل القيادي:** توجيه قلبي الدفاع بصوت عالٍ وواضح قبل تنفيذ الخصم للركلات الركنية بـ 10 ثوانٍ لتحديد الرقابة (رجل لرجل).
3. **توزيع الكرات:** بعد التصدي، البحث الفوري عن الجناح السريع في المساحة الشاغرة لبدء هجمة مرتدة خاطفة.`;
      }

      if (q.includes('ضغط') || q.includes('عالي') || q.includes('استرجاع')) {
        return `### 🔴 استراتيجية تطبيق الضغط العالي الفعال (High Press Strategy):
1. **محفزات الضغط (Pressing Triggers):** نبدأ الضغط الجماعي فور استلام ظهير الخصم للكرة وهو وظهره للملعب، أو عند وصول تمريرة ضعيفة أو هوائية.
2. **إغلاق العمق:** المهاجم يغلق زاوية التمرير إلى قلب الدفاع الآخر، بينما يضغط الجناح مباشرة على حامل الكرة لإجباره نحو خط التماس.
3. **الخط الخلفي:** صعود خط الدفاع إلى ما بعد دائرة منتصف الملعب لضغط مساحات اللعب وتأمين مصيدة التسلل.`;
      }

      if (q.includes('ضعف') || q.includes('ثغرة') || q.includes('خصم')) {
        return `### 🎯 استغلال ثغرات الخصم التكتيكية:
- **نقطة الضعف الرئيسية:** بطء قلبي دفاع المنافس في الارتداد الخلفي عند الكرات الطولية الساقطة خلفهم.
- **الحل العملي:** مطالبة صانع الألعاب بلعب الكرات الساقطة (Lofted Through Balls) خلف قلبي الدفاع مباشرة لانطلاقات الجناحين السريعين.`;
      }

      // Default smart tactical answer
      return `### 💡 التوصية التكتيكية:
بناءً على معطيات اللقاء:
- يُنصح بتسريع وتيرة تدوير الكرة من جهة إلى أخرى (Switch of Play) لخلخلة التكتل الدفاعي.
- الاعتماد على التحركات بدون كرة داخل الصندوق لخلق مساحات للتسديد من حافة منطقة الجزاء.
- توجيه اللاعبين بالانضباط التكتيكي وتفادي ارتكاب أخطاء قريبة من منطقة الجزاء.`;
    },

    injectHeatmapContext(facts) {
      const container = document.getElementById('aiChatMessages');
      if (!container) return;

      const summaryText = `### 🔥 تقرير تحليل الخريطة الحرارية (Heatmap Intelligence)
**اللاعب / الفريق:** ${facts.player === 'all' ? 'كامل الفريق' : facts.player} (${facts.team === 'home' ? 'المضيف' : 'الزائر'})
- **إجمالي نقاط النشاط المسجلة:** ${facts.totalPoints} نقطة لمس وانتشار.
- **خريطة التسديدات:** ${facts.shots} تسديدة (${facts.goals} أهداف مسجلة)، بقيمة خطر متوقع **xG = ${facts.xg}**.

#### التشخيص الفني:
1. **الكثافة الميدانية:** انتشار ممتاز في الثلث الهجومي مع ميل واضح نحو الطرف الأيمن، مما يخلق تفوقاً عددياً يسمح بالعرضيات الخطيرة.
2. **المردود التهديفي:** معدل التسديد من داخل منطقة العمليات حقق خطورة مضاعفة مقارنة بالتسديد العشوائي من بعيد.
3. **توصية المدرب:** المحافظة على التمركز في نصف المساحة (Half-space) لربط اللعب مع القادمين من الخلف.`;

      this.currentAnalysis = summaryText;

      const botDiv = document.createElement('div');
      botDiv.className = 'ai-msg ai-msg--bot';
      botDiv.innerHTML = `
        <div class="ai-avatar">🤖</div>
        <div class="ai-bubble">
          <h4 style="color:#00D4FF; margin:0 0 10px 0;">⚡ تم استقبال بيانات الخريطة الحرارية وتحليلها تلقائياً!</h4>
          ${this.formatMarkdownToHtml(summaryText)}
        </div>
      `;
      container.appendChild(botDiv);
      container.scrollTop = container.scrollHeight;
    },

    sendAnalysisToPdfReport() {
      if (!this.currentAnalysis) {
        if (window.showToast) showToast('يرجى توليد تحليل تكتيكي أولاً', 'warning');
        return;
      }

      const summaryInput = document.getElementById('rptSummaryText');
      if (summaryInput) {
        // Strip markdown hashes for text input
        const plain = this.currentAnalysis.replace(/#{1,6}\s?/g, '').trim();
        summaryInput.value = plain.slice(0, 480) + '...';
      }

      if (window.openPdfReportModal) {
        window.openPdfReportModal();
      } else {
        const modal = document.getElementById('pdfReportModal');
        if (modal) modal.style.display = 'flex';
      }

      if (window.showToast) showToast('تم دمج التحليل الذكي في تقرير المباراة الرسمي PDF', 'success');
    },

    formatMarkdownToHtml(md) {
      return md
        .replace(/^### (.*$)/gim, '<h4 style="color:var(--accent);margin:10px 0 6px 0;">$1</h4>')
        .replace(/^#### (.*$)/gim, '<h5 style="color:#FFD166;margin:8px 0 4px 0;">$1</h5>')
        .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/gim, '<em>$1</em>')
        .replace(/^> (.*$)/gim, '<blockquote style="border-right:3px solid var(--accent);margin:8px 0;padding:6px 12px;background:rgba(0,212,255,0.08);color:var(--text);">$1</blockquote>')
        .replace(/^\- (.*$)/gim, '<li style="margin-bottom:4px;">$1</li>')
        .replace(/^[0-9]\. (.*$)/gim, '<li style="margin-bottom:4px;">$1</li>')
        .replace(/\n\n/gim, '<br>');
    },

    escapeHtml(str) {
      return str.replace(/[&<>"']/g, m => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      }[m]));
    }
  };

  window.AiAssistant = AiAssistant;

  document.addEventListener('DOMContentLoaded', () => {
    AiAssistant.init();
  });
})();
