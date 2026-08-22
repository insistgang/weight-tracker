/**
 * WeightTracker - Main Application Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  const storage = window.trackerStorage;
  const charts = window.trackerCharts;

  let currentActiveUserId = 'liugang';
  let currentActiveSession = 'morning';
  let scaleRuler = null;
  let selectedDate = new Date().toISOString().split('T')[0];

  // DOM Elements
  const teamTotalLostEl = document.getElementById('team-total-lost');
  const remainingDaysEl = document.getElementById('remaining-days');
  const userCardsContainer = document.getElementById('user-cards-container');
  const checkinModal = document.getElementById('checkin-modal');
  const checkinUserNameEl = document.getElementById('checkin-user-name');
  const checkinDateInput = document.getElementById('checkin-date');
  const sessionMorningBtn = document.getElementById('session-morning-btn');
  const sessionEveningBtn = document.getElementById('session-evening-btn');
  const checkinNoteInput = document.getElementById('checkin-note');
  const isRetroCheckbox = document.getElementById('is-retroactive');
  const submitCheckinBtn = document.getElementById('submit-checkin-btn');
  const closeCheckinBtn = document.getElementById('close-checkin-btn');

  // Diagnosis Modal
  const diagnosisModal = document.getElementById('diagnosis-modal');
  const diagTitleEl = document.getElementById('diag-title');
  const diagBadgeEl = document.getElementById('diag-badge');
  const diagQuoteEl = document.getElementById('diag-quote');
  const closeDiagBtn = document.getElementById('close-diag-btn');

  // Poster Modal
  const posterModal = document.getElementById('poster-modal');
  const posterImageEl = document.getElementById('poster-preview-img');
  const downloadPosterBtn = document.getElementById('download-poster-btn');
  const closePosterBtn = document.getElementById('close-poster-btn');

  // Toast
  const toastEl = document.getElementById('toast');

  // --- Utility: Toast Notification ---
  function showToast(msg, duration = 2500) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.remove('hidden', 'opacity-0');
    toastEl.classList.add('opacity-100');
    setTimeout(() => {
      toastEl.classList.add('opacity-0');
      setTimeout(() => toastEl.classList.add('hidden'), 300);
    }, duration);
  }

  // --- Auto Detect Session (Morning vs Evening) ---
  function getSuggestedSession() {
    const hour = new Date().getHours();
    return hour < 14 ? 'morning' : 'evening';
  }

  // --- Update Dashboard Stats ---
  function updateDashboard() {
    const teamStats = storage.getTeamStats();
    if (teamTotalLostEl) teamTotalLostEl.textContent = `-${teamStats.teamTotalLost.toFixed(1)}`;
    if (remainingDaysEl) remainingDaysEl.textContent = teamStats.remainingDays;

    renderUserCards();
    charts.updatePKChart();
    charts.renderHeatmap('heatmap-container', (date) => openDayDetailModal(date));
    renderPenaltyLedger();
    renderLeaderboard();
  }

  // --- Render Top 3 Combat Cards ---
  function renderUserCards() {
    if (!userCardsContainer) return;
    const users = storage.getAllUsers();
    const today = new Date().toISOString().split('T')[0];

    let html = '';
    users.forEach((u, i) => {
      const stats = storage.getUserStats(u.id);
      const rec = storage.getRecord(today, u.id) || {};

      const hasMorning = Boolean(rec.morning && rec.morning.weight);
      const hasEvening = Boolean(rec.evening && rec.evening.weight);

      // Status glow
      let statusDot = 'bg-amber-500 glow-dot-amber';
      let statusText = '今日待打卡';
      if (hasMorning && hasEvening) {
        statusDot = 'bg-emerald-500 glow-dot-green';
        statusText = '今日已全勤';
      } else if (hasMorning || hasEvening) {
        statusDot = 'bg-cyan-500 glow-dot-green';
        statusText = '已完成一打卡';
      }

      html += `
        <div class="glass-card rounded-2xl p-4 md:p-5 relative overflow-hidden transition-all duration-300 hover:border-emerald-500/40">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center space-x-3">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br ${u.avatarBg} flex items-center justify-center font-extrabold text-white text-lg shadow-lg">
                ${u.name.slice(0, 1)}
              </div>
              <div>
                <div class="flex items-center space-x-2">
                  <h3 class="font-extrabold text-white text-base">${u.name}</h3>
                  <span class="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-gray-300 font-medium">${u.role}</span>
                </div>
                <div class="flex items-center space-x-1.5 mt-0.5">
                  <span class="w-2 h-2 rounded-full ${statusDot}"></span>
                  <span class="text-xs text-gray-400 font-medium">${statusText}</span>
                </div>
              </div>
            </div>
            <div class="text-right">
              <span class="text-[10px] text-gray-400 uppercase font-semibold">累计消灭</span>
              <div class="text-xl font-extrabold text-emerald-400 font-mono-num">
                -${stats.totalLost.toFixed(1)} <span class="text-xs font-normal text-gray-400">kg</span>
              </div>
            </div>
          </div>

          <!-- Progress Bar -->
          <div class="w-full bg-gray-800/80 rounded-full h-2 mb-3 overflow-hidden border border-white/5">
            <div class="bg-gradient-to-r from-emerald-500 to-cyan-500 h-full rounded-full transition-all duration-500" style="width: ${stats.progressPct}%"></div>
          </div>

          <div class="grid grid-cols-2 gap-2 text-xs bg-black/30 rounded-xl p-2.5 mb-3 border border-white/5">
            <div>
              <span class="text-gray-400">最新体重:</span>
              <span class="font-bold text-white font-mono-num ml-1">${stats.currentWeight}kg</span>
            </div>
            <div class="text-right">
              <span class="text-gray-400">9/30目标:</span>
              <span class="font-bold text-cyan-400 font-mono-num ml-1">${stats.targetWeight}kg</span>
            </div>
          </div>

          <!-- Morning & Evening Quick Status -->
          <div class="flex items-center justify-between text-xs text-gray-300 mb-3 px-1">
            <div class="flex items-center space-x-1">
              <span>☀️ 早:</span>
              <span class="font-mono-num font-semibold ${hasMorning ? 'text-emerald-400' : 'text-gray-500'}">
                ${hasMorning ? `${rec.morning.weight}kg` : '未上秤'}
              </span>
              ${rec.morning?.isRetroactive ? '<span class="text-[9px] text-amber-400 px-1 bg-amber-400/10 rounded">补</span>' : ''}
            </div>
            <div class="flex items-center space-x-1">
              <span>🌙 晚:</span>
              <span class="font-mono-num font-semibold ${hasEvening ? 'text-emerald-400' : 'text-gray-500'}">
                ${hasEvening ? `${rec.evening.weight}kg` : '未上秤'}
              </span>
              ${rec.evening?.isRetroactive ? '<span class="text-[9px] text-amber-400 px-1 bg-amber-400/10 rounded">补</span>' : ''}
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center space-x-2">
            <button class="btn-checkin flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-black font-extrabold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center space-x-1" data-user-id="${u.id}">
              <span>🔥 我要打卡</span>
            </button>
            <button class="btn-nudge px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 active:scale-95 text-gray-300 font-bold text-xs transition-all" data-user-id="${u.id}" title="复制群内催打卡令">
              <span>📢 催TA</span>
            </button>
          </div>
        </div>
      `;
    });

    userCardsContainer.innerHTML = html;

    // Attach check-in & nudge buttons
    userCardsContainer.querySelectorAll('.btn-checkin').forEach(btn => {
      btn.addEventListener('click', () => {
        const userId = btn.getAttribute('data-user-id');
        openCheckinModal(userId);
      });
    });

    userCardsContainer.querySelectorAll('.btn-nudge').forEach(btn => {
      btn.addEventListener('click', () => {
        const userId = btn.getAttribute('data-user-id');
        copyNudgeText(userId);
      });
    });
  }

  // --- Copy Nudge Text to Clipboard ---
  function copyNudgeText(userId) {
    const user = storage.getUser(userId);
    if (!user) return;

    const session = getSuggestedSession();
    const sessionName = session === 'morning' ? '早间晨秤 (11:00截止)' : '晚间睡前秤 (24:00截止)';
    const text = `【减重铁血盟紧急通报】🚨
@${user.name} 你的${sessionName}尚未打卡！
当前团队正在向 9/30 目标狂飙，50 个俯卧撑惩罚正在加载中！
誓言：“为自己瘦下去，把这件事作为责任，作为理想！”
速速上秤打卡 👉 ${window.location.href}`;

    navigator.clipboard.writeText(text).then(() => {
      showToast(`已复制针对【${user.name}】的催打卡令！去微信群粘贴发送吧 🚀`);
    }).catch(() => {
      showToast(`复制失败，请手动提醒 ${user.name}`);
    });
  }

  // --- Open Check-in Modal ---
  function openCheckinModal(userId) {
    currentActiveUserId = userId;
    const user = storage.getUser(userId);
    if (!user) return;

    checkinUserNameEl.textContent = `${user.name} · 体重打卡`;
    const today = new Date().toISOString().split('T')[0];
    checkinDateInput.value = today;
    checkinNoteInput.value = '';
    isRetroCheckbox.checked = false;

    // Session selection
    setSessionType(getSuggestedSession());

    // Init Scale Ruler
    const latest = storage.getLatestWeight(userId);
    const initialVal = latest ? latest.weight : (user.initialWeight || 80.0);

    if (!scaleRuler) {
      scaleRuler = new MechanicalScaleRuler({
        containerId: 'scale-ruler-container',
        displayId: 'scale-weight-display',
        min: 45.0,
        max: 140.0,
        initialValue: initialVal
      });
    } else {
      scaleRuler.setValue(initialVal, false);
    }

    checkinModal.classList.remove('hidden');
  }

  function setSessionType(session) {
    currentActiveSession = session;
    if (session === 'morning') {
      sessionMorningBtn.className = 'flex-1 py-2 rounded-xl bg-emerald-500 text-black font-extrabold text-xs transition-all shadow-md';
      sessionEveningBtn.className = 'flex-1 py-2 rounded-xl bg-white/5 text-gray-400 font-semibold text-xs transition-all hover:bg-white/10';
    } else {
      sessionMorningBtn.className = 'flex-1 py-2 rounded-xl bg-white/5 text-gray-400 font-semibold text-xs transition-all hover:bg-white/10';
      sessionEveningBtn.className = 'flex-1 py-2 rounded-xl bg-cyan-500 text-black font-extrabold text-xs transition-all shadow-md';
    }
  }

  sessionMorningBtn.addEventListener('click', () => setSessionType('morning'));
  sessionEveningBtn.addEventListener('click', () => setSessionType('evening'));

  // Quick adjust buttons (+0.1, -0.1, +0.5, -0.5)
  document.querySelectorAll('.btn-ruler-step').forEach(btn => {
    btn.addEventListener('click', () => {
      const delta = parseFloat(btn.getAttribute('data-delta'));
      if (scaleRuler) scaleRuler.adjustValue(delta);
    });
  });

  // Submit Check-in
  submitCheckinBtn.addEventListener('click', () => {
    if (!scaleRuler) return;
    const weight = scaleRuler.getValue();
    const dateStr = checkinDateInput.value;
    const note = checkinNoteInput.value;
    const isRetro = isRetroCheckbox.checked;

    storage.saveCheckIn(dateStr, currentActiveUserId, currentActiveSession, weight, note, isRetro);
    checkinModal.classList.add('hidden');

    // Trigger Wolf Coach Diagnosis
    const diagnosis = window.WolfCoachEngine.getDiagnosis(currentActiveUserId, currentActiveSession, weight, dateStr);
    if (diagnosis) {
      diagTitleEl.textContent = diagnosis.title;
      diagBadgeEl.textContent = diagnosis.badge;
      diagQuoteEl.textContent = diagnosis.quote;
      diagnosisModal.classList.remove('hidden');
    } else {
      showToast('🎉 打卡成功！已同步至战况大盘');
    }

    updateDashboard();
  });

  closeCheckinBtn.addEventListener('click', () => checkinModal.classList.add('hidden'));
  closeDiagBtn.addEventListener('click', () => diagnosisModal.classList.add('hidden'));

  // --- Poster Generation ---
  document.getElementById('btn-open-poster').addEventListener('click', async () => {
    showToast('🚀 正在绘制 9:16 高清战报海报...');
    const dataUrl = await window.BattlePosterGenerator.generatePoster();
    posterImageEl.src = dataUrl;
    posterModal.classList.remove('hidden');
  });

  downloadPosterBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = `三人减重战报_${new Date().toISOString().split('T')[0]}.png`;
    link.href = posterImageEl.src;
    link.click();
  });

  closePosterBtn.addEventListener('click', () => posterModal.classList.add('hidden'));

  // --- Day Detail Modal ---
  const dayDetailModal = document.getElementById('day-detail-modal');
  const dayDetailTitle = document.getElementById('day-detail-title');
  const dayDetailContent = document.getElementById('day-detail-content');
  const closeDayDetailBtn = document.getElementById('close-day-detail-btn');

  function openDayDetailModal(dateStr) {
    if (!dayDetailModal) return;
    dayDetailTitle.textContent = `📅 ${dateStr} 战况回顾`;
    const users = storage.getAllUsers();
    let html = '';

    users.forEach(u => {
      const rec = storage.getRecord(dateStr, u.id) || {};
      const mWeight = rec.morning ? `${rec.morning.weight}kg (${rec.morning.time})` : '未打卡';
      const eWeight = rec.evening ? `${rec.evening.weight}kg (${rec.evening.time})` : '未打卡';
      const note = rec.morning?.note || rec.evening?.note || '无备注';

      html += `
        <div class="bg-black/30 rounded-xl p-3 border border-white/5">
          <div class="flex items-center justify-between mb-1.5">
            <span class="font-bold text-white">${u.name}</span>
            <span class="text-xs text-gray-400">${u.role}</span>
          </div>
          <div class="grid grid-cols-2 gap-2 text-xs font-mono-num mb-1 text-gray-300">
            <div>☀️ 早: <span class="${rec.morning ? 'text-emerald-400 font-bold' : 'text-gray-500'}">${mWeight}</span></div>
            <div>🌙 晚: <span class="${rec.evening ? 'text-emerald-400 font-bold' : 'text-gray-500'}">${eWeight}</span></div>
          </div>
          <p class="text-[11px] text-gray-400 italic">“${note}”</p>
        </div>
      `;
    });

    dayDetailContent.innerHTML = html;
    dayDetailModal.classList.remove('hidden');
  }

  closeDayDetailBtn.addEventListener('click', () => dayDetailModal.classList.add('hidden'));

  // --- Penalty Ledger ---
  function renderPenaltyLedger() {
    const container = document.getElementById('penalty-list-container');
    if (!container) return;
    const penalties = storage.data.penalties || [];

    if (penalties.length === 0) {
      container.innerHTML = `
        <div class="text-center py-6 text-gray-500 text-xs">
          🛡️ 暂无违规记录！全员恪守纪律，保持完美执行！
        </div>
      `;
      return;
    }

    let html = '';
    penalties.forEach(p => {
      html += `
        <div class="flex items-center justify-between bg-black/30 rounded-xl p-3 border border-white/5 text-xs">
          <div>
            <div class="flex items-center space-x-2">
              <span class="font-bold text-rose-400">${p.userName}</span>
              <span class="text-gray-400">${p.date}</span>
              <span class="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-300 text-[10px]">${p.reason}</span>
            </div>
            <div class="text-gray-300 mt-1">惩罚：罚 ${p.count} 个${p.type}</div>
          </div>
          <button class="btn-toggle-penalty px-2.5 py-1 rounded-lg text-[11px] font-bold ${p.settled ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}" data-pen-id="${p.id}">
            ${p.settled ? '✅ 已执行' : '⏳ 待执行'}
          </button>
        </div>
      `;
    });

    container.innerHTML = html;
    container.querySelectorAll('.btn-toggle-penalty').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-pen-id');
        storage.togglePenaltySettled(id);
        renderPenaltyLedger();
      });
    });
  }

  // --- Leaderboard ---
  function renderLeaderboard() {
    const container = document.getElementById('leaderboard-container');
    if (!container) return;
    const users = storage.getAllUsers();
    
    // Sort by total lost descending
    const sorted = users.map(u => ({
      user: u,
      stats: storage.getUserStats(u.id)
    })).sort((a, b) => b.stats.totalLost - a.stats.totalLost);

    let html = '';
    const medals = ['🥇', '🥈', '🥉'];

    sorted.forEach((item, idx) => {
      html += `
        <div class="flex items-center justify-between py-2 border-b border-white/5 text-xs last:border-0">
          <div class="flex items-center space-x-2">
            <span class="text-base">${medals[idx]}</span>
            <span class="font-bold text-white">${item.user.name}</span>
          </div>
          <div class="flex items-center space-x-3">
            <span class="text-gray-400">已减: <strong class="text-emerald-400 font-mono-num font-bold">-${item.stats.totalLost.toFixed(1)}kg</strong></span>
            <span class="text-gray-500 text-[11px]">进度: ${item.stats.progressPct}%</span>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  // --- Settings / Initial Oath Modal ---
  const settingsModal = document.getElementById('settings-modal');
  const openSettingsBtn = document.getElementById('btn-open-settings');
  const closeSettingsBtn = document.getElementById('close-settings-btn');
  const saveSettingsBtn = document.getElementById('save-settings-btn');

  if (openSettingsBtn) {
    openSettingsBtn.addEventListener('click', () => {
      const users = storage.getAllUsers();
      document.getElementById('set-lg-init').value = users[0].initialWeight;
      document.getElementById('set-lg-tgt').value = users[0].targetWeight;
      document.getElementById('set-ztl-init').value = users[1].initialWeight;
      document.getElementById('set-ztl-tgt').value = users[1].targetWeight;
      document.getElementById('set-lx-init').value = users[2].initialWeight;
      document.getElementById('set-lx-tgt').value = users[2].targetWeight;
      settingsModal.classList.remove('hidden');
    });
  }

  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', () => {
      storage.updateUserProfile('liugang', {
        initialWeight: document.getElementById('set-lg-init').value,
        targetWeight: document.getElementById('set-lg-tgt').value
      });
      storage.updateUserProfile('zhangtinglei', {
        initialWeight: document.getElementById('set-ztl-init').value,
        targetWeight: document.getElementById('set-ztl-tgt').value
      });
      storage.updateUserProfile('luxuan', {
        initialWeight: document.getElementById('set-lx-init').value,
        targetWeight: document.getElementById('set-lx-tgt').value
      });
      settingsModal.classList.add('hidden');
      showToast('✅ 初始体重与目标已锁定！');
      updateDashboard();
    });
  }

  if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));

  // --- Initial Setup ---
  charts.initPKChart('pk-chart-canvas');
  updateDashboard();
});
