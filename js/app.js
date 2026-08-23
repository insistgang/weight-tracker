/**
 * WeightTracker - Main Application Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  const storage = window.trackerStorage;
  const charts = window.trackerCharts;

  let currentActiveUserId = 'liugang';
  let currentActiveSession = 'morning';
  let scaleRuler = null;

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
  const syncStatusEl = document.getElementById('sync-status');

  function localDateKey() {
    return typeof window.getLocalDateKey === 'function'
      ? window.getLocalDateKey()
      : `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
  }

  function campaignDateKey(dateKey = localDateKey()) {
    const startDate = storage.data.startDate || '2026-08-24';
    const endDate = storage.data.endDate || '2026-09-30';
    return dateKey < startDate ? startDate : dateKey > endDate ? endDate : dateKey;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[character]));
  }

  function safeAvatarBg(value, userId) {
    const fallback = {
      liugang: 'from-emerald-500 to-teal-700',
      zhangtinglei: 'from-cyan-500 to-blue-700',
      luxuan: 'from-amber-500 to-orange-700'
    }[userId] || 'from-gray-500 to-gray-700';
    const candidate = String(value || '');
    return /^[a-z0-9-]+(?:\s+[a-z0-9-]+)*$/i.test(candidate) ? candidate : fallback;
  }

  function displayWeight(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number.toFixed(1) : '—';
  }

  function updateSyncStatus() {
    if (!syncStatusEl || !storage.getSyncStatus) return;
    const status = storage.getSyncStatus();
    const labels = {
      local: '本地缓存 · 等待云端',
      syncing: '正在同步云端…',
      synced: '云端已同步',
      error: `云端同步失败 · ${status.lastError || '请检查网络'}`
    };
    syncStatusEl.textContent = labels[status.state] || labels.local;
    syncStatusEl.className = `inline-flex mt-1 text-[10px] ${status.state === 'error' ? 'text-rose-400' : status.state === 'synced' ? 'text-emerald-400' : 'text-gray-500'}`;
  }

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
    updateSyncStatus();
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
    const today = localDateKey();

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

      const userId = escapeHtml(u.id);
      const userName = escapeHtml(u.name);
      const role = escapeHtml(u.role);
      const avatarBg = escapeHtml(safeAvatarBg(u.avatarBg, u.id));
      const targetWeight = escapeHtml(displayWeight(stats.targetWeight));
      const currentWeight = escapeHtml(displayWeight(stats.currentWeight));
      const totalLost = escapeHtml(displayWeight(stats.totalLost));
      const progressPct = escapeHtml(String(stats.progressPct));
      const morningWeight = hasMorning ? escapeHtml(displayWeight(rec.morning.weight)) : '未上秤';
      const eveningWeight = hasEvening ? escapeHtml(displayWeight(rec.evening.weight)) : '未上秤';

      html += `
        <div class="glass-card rounded-2xl p-4 md:p-5 relative overflow-hidden transition-all duration-300 hover:border-emerald-500/40">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center space-x-3">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br ${avatarBg} flex items-center justify-center font-extrabold text-white text-lg shadow-lg">
                ${escapeHtml(String(u.name || '').slice(0, 1))}
              </div>
              <div>
                <div class="flex items-center space-x-2">
                  <h3 class="font-extrabold text-white text-base">${userName}</h3>
                  <span class="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-gray-300 font-medium">${role}</span>
                </div>
                <div class="flex items-center space-x-1.5 mt-0.5">
                  <span class="w-2 h-2 rounded-full ${statusDot}"></span>
                  <span class="text-xs text-gray-400 font-medium">${escapeHtml(statusText)}</span>
                </div>
              </div>
            </div>
            <div class="text-right">
              <span class="text-[10px] text-gray-400 uppercase font-semibold">累计消灭</span>
              <div class="text-xl font-extrabold text-emerald-400 font-mono-num">
                -${totalLost} <span class="text-xs font-normal text-gray-400">kg</span>
              </div>
            </div>
          </div>

          <!-- Progress Bar -->
          <div class="w-full bg-gray-800/80 rounded-full h-2 mb-3 overflow-hidden border border-white/5">
            <div class="bg-gradient-to-r from-emerald-500 to-cyan-500 h-full rounded-full transition-all duration-500" style="width: ${progressPct}%"></div>
          </div>

          <div class="grid grid-cols-2 gap-2 text-xs bg-black/30 rounded-xl p-2.5 mb-3 border border-white/5">
            <div>
              <span class="text-gray-400">最新体重:</span>
              <span class="font-bold text-white font-mono-num ml-1">${currentWeight}kg</span>
            </div>
            <div class="text-right">
              <span class="text-gray-400">9/30目标:</span>
              <span class="font-bold text-cyan-400 font-mono-num ml-1">${targetWeight}kg</span>
            </div>
          </div>

          <!-- Morning & Evening Quick Status -->
          <div class="flex items-center justify-between text-xs text-gray-300 mb-3 px-1">
            <div class="flex items-center space-x-1">
              <span>☀️ 早:</span>
              <span class="font-mono-num font-semibold ${hasMorning ? 'text-emerald-400' : 'text-gray-500'}">
                ${morningWeight}${hasMorning ? 'kg' : ''}
              </span>
              ${rec.morning?.isRetroactive ? '<span class="text-[9px] text-amber-400 px-1 bg-amber-400/10 rounded">补</span>' : ''}
            </div>
            <div class="flex items-center space-x-1">
              <span>🌙 晚:</span>
              <span class="font-mono-num font-semibold ${hasEvening ? 'text-emerald-400' : 'text-gray-500'}">
                ${eveningWeight}${hasEvening ? 'kg' : ''}
              </span>
              ${rec.evening?.isRetroactive ? '<span class="text-[9px] text-amber-400 px-1 bg-amber-400/10 rounded">补</span>' : ''}
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center space-x-2">
            <button class="btn-checkin flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-black font-extrabold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center space-x-1" data-user-id="${userId}">
              <span>🔥 我要打卡</span>
            </button>
            <button class="btn-nudge px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 active:scale-95 text-gray-300 font-bold text-xs transition-all" data-user-id="${userId}" title="复制群内催打卡令">
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
    checkinDateInput.value = campaignDateKey();
    checkinNoteInput.value = '';
    isRetroCheckbox.checked = false;

    // Session selection
    setSessionType(getSuggestedSession());

    // Reveal before measuring the ruler; hidden modals report a zero-width viewport.
    const latest = storage.getLatestWeight(userId);
    const initialVal = latest ? latest.weight : (user.initialWeight || 80.0);

    checkinModal.classList.remove('hidden');

    requestAnimationFrame(() => {
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
        if (typeof scaleRuler.refreshLayout === 'function') scaleRuler.refreshLayout();
      }
    });
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
  submitCheckinBtn.addEventListener('click', async () => {
    if (!scaleRuler) return;
    const weight = scaleRuler.getValue();
    const dateStr = checkinDateInput.value;
    const note = checkinNoteInput.value;
    const isRetro = isRetroCheckbox.checked;

    submitCheckinBtn.disabled = true;
    submitCheckinBtn.classList.add('opacity-60', 'cursor-wait');
    submitCheckinBtn.textContent = '⏳ 正在同步打卡…';
    try {
      await storage.saveCheckIn(dateStr, currentActiveUserId, currentActiveSession, weight, note, isRetro);
      checkinModal.classList.add('hidden');

      // Trigger Wolf Coach Diagnosis only after the cloud write succeeds.
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
    } catch (error) {
      updateDashboard();
      showToast(`❌ 打卡未同步：${error.message || '请检查网络后重试'}`, 5000);
    } finally {
      submitCheckinBtn.disabled = false;
      submitCheckinBtn.classList.remove('opacity-60', 'cursor-wait');
      submitCheckinBtn.textContent = '⚡ 确认提交打卡';
    }
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
    link.download = `三人减重战报_${localDateKey()}.png`;
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
      const mWeight = rec.morning ? `${displayWeight(rec.morning.weight)}kg (${escapeHtml(rec.morning.time || '')})` : '未打卡';
      const eWeight = rec.evening ? `${displayWeight(rec.evening.weight)}kg (${escapeHtml(rec.evening.time || '')})` : '未打卡';
      const note = escapeHtml(rec.morning?.note || rec.evening?.note || '无备注');

      html += `
        <div class="bg-black/30 rounded-xl p-3 border border-white/5">
          <div class="flex items-center justify-between mb-1.5">
            <span class="font-bold text-white">${escapeHtml(u.name)}</span>
            <span class="text-xs text-gray-400">${escapeHtml(u.role)}</span>
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
      const penaltyId = escapeHtml(p.id);
      html += `
        <div class="flex items-center justify-between bg-black/30 rounded-xl p-3 border border-white/5 text-xs">
          <div>
            <div class="flex items-center space-x-2">
              <span class="font-bold text-rose-400">${escapeHtml(p.userName)}</span>
              <span class="text-gray-400">${escapeHtml(p.date)}</span>
              <span class="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-300 text-[10px]">${escapeHtml(p.reason)}</span>
            </div>
            <div class="text-gray-300 mt-1">惩罚：罚 ${escapeHtml(p.count)} 个${escapeHtml(p.type)}</div>
          </div>
          <button class="btn-toggle-penalty px-2.5 py-1 rounded-lg text-[11px] font-bold ${p.settled ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}" data-pen-id="${penaltyId}">
            ${p.settled ? '✅ 已执行' : '⏳ 待执行'}
          </button>
        </div>
      `;
    });

    container.innerHTML = html;
    container.querySelectorAll('.btn-toggle-penalty').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-pen-id');
        btn.disabled = true;
        try {
          await storage.togglePenaltySettled(id);
          renderPenaltyLedger();
          updateSyncStatus();
        } catch (error) {
          btn.disabled = false;
          updateDashboard();
          showToast(`❌ 惩罚状态未同步：${error.message || '请检查网络后重试'}`, 5000);
        }
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
            <span class="font-bold text-white">${escapeHtml(item.user.name)}</span>
          </div>
          <div class="flex items-center space-x-3">
            <span class="text-gray-400">已减: <strong class="text-emerald-400 font-mono-num font-bold">-${escapeHtml(displayWeight(item.stats.totalLost))}kg</strong></span>
            <span class="text-gray-500 text-[11px]">进度: ${escapeHtml(item.stats.progressPct)}%</span>
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
    saveSettingsBtn.addEventListener('click', async () => {
      saveSettingsBtn.disabled = true;
      saveSettingsBtn.classList.add('opacity-60', 'cursor-wait');
      saveSettingsBtn.textContent = '⏳ 正在同步基准…';
      try {
        await storage.updateUserProfile('liugang', {
          initialWeight: document.getElementById('set-lg-init').value,
          targetWeight: document.getElementById('set-lg-tgt').value
        });
        await storage.updateUserProfile('zhangtinglei', {
          initialWeight: document.getElementById('set-ztl-init').value,
          targetWeight: document.getElementById('set-ztl-tgt').value
        });
        await storage.updateUserProfile('luxuan', {
          initialWeight: document.getElementById('set-lx-init').value,
          targetWeight: document.getElementById('set-lx-tgt').value
        });
        settingsModal.classList.add('hidden');
        showToast('✅ 初始体重与目标已同步锁定！');
        updateDashboard();
      } catch (error) {
        updateDashboard();
        showToast(`❌ 基准未完全同步：${error.message || '请检查网络后重试'}`, 5000);
      } finally {
        saveSettingsBtn.disabled = false;
        saveSettingsBtn.classList.remove('opacity-60', 'cursor-wait');
        saveSettingsBtn.textContent = '💾 保存并锁定基准';
      }
    });
  }

  if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));

  // --- Initial Setup ---
  charts.initPKChart('pk-chart-canvas');
  updateDashboard();

  let refreshPromise = null;
  async function refreshDashboard(showFailureToast = false) {
    if (refreshPromise) return refreshPromise;
    refreshPromise = (async () => {
      updateSyncStatus();
      try {
        await storage.refresh();
        updateDashboard();
      } catch (error) {
        updateDashboard();
        if (showFailureToast) {
          showToast(`⚠️ 云端读取失败，已使用本地缓存：${error.message || '请稍后重试'}`, 5000);
        }
      } finally {
        refreshPromise = null;
      }
    })();
    return refreshPromise;
  }

  // Keep the cache-rendered dashboard usable while the first cloud read is in flight.
  refreshDashboard(true);
  window.setInterval(() => refreshDashboard(false), 60 * 1000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refreshDashboard(false);
  });
  window.addEventListener('online', () => refreshDashboard(false));
});
