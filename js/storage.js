/**
 * WeightTracker - Storage & Data Model Layer
 */

const STORAGE_KEY = 'WT_WEIGHT_TRACKER_DATA_V2';

const DEFAULT_USERS = {
  liugang: {
    id: 'liugang',
    name: '刘钢',
    role: '主基准战士',
    avatarBg: 'from-emerald-500 to-teal-700',
    initialWeight: 96.0,
    targetWeight: 90.0,
    motto: '守住底线，早晚如实打卡，绝不放弃！',
    penalties: 0
  },
  zhangtinglei: {
    id: 'zhangtinglei',
    name: '张庭磊',
    role: '铁三角核心',
    avatarBg: 'from-cyan-500 to-blue-700',
    initialWeight: 90.0,
    targetWeight: 86.0,
    motto: '严格自律，执行到底，相互督促！',
    penalties: 0
  },
  luxuan: {
    id: 'luxuan',
    name: '卢轩',
    role: '铁三角先锋',
    avatarBg: 'from-amber-500 to-orange-700',
    initialWeight: 94.0,
    targetWeight: 90.0,
    motto: '兄弟同行，说到做到，共同达成！',
    penalties: 0
  }
};

const DURATION_DAYS = 38;
const START_DATE = '2026-08-24';
const END_DATE = '2026-09-30';

class TrackerStorage {
  constructor() {
    this.data = this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('Failed to load from storage:', e);
    }
    return this.getInitialState();
  }

  getInitialState() {
    return {
      version: 1,
      startDate: START_DATE,
      endDate: END_DATE,
      users: JSON.parse(JSON.stringify(DEFAULT_USERS)),
      records: {}, // Format: { 'YYYY-MM-DD': { liugang: { morning: { weight, time, note, isRetro }, evening: {...} } } }
      penalties: [], // Array of { id, date, userId, type, count, reason, settled }
      badges: {} // Format: { userId: ['streak_7', 'fast_drop', ...] }
    };
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error('Failed to save to storage:', e);
    }
  }

  getUser(userId) {
    return this.data.users[userId] || null;
  }

  getAllUsers() {
    return Object.values(this.data.users);
  }

  updateUserProfile(userId, { initialWeight, targetWeight, motto }) {
    if (this.data.users[userId]) {
      if (initialWeight) this.data.users[userId].initialWeight = parseFloat(initialWeight);
      if (targetWeight) this.data.users[userId].targetWeight = parseFloat(targetWeight);
      if (motto) this.data.users[userId].motto = motto;
      this.save();
    }
  }

  getRecord(dateStr, userId) {
    if (!this.data.records[dateStr]) return null;
    return this.data.records[dateStr][userId] || null;
  }

  getAllDateStrings() {
    const dates = [];
    const curr = new Date(START_DATE + 'T00:00:00');
    const end = new Date(END_DATE + 'T00:00:00');
    while (curr <= end) {
      const yyyy = curr.getFullYear();
      const mm = String(curr.getMonth() + 1).padStart(2, '0');
      const dd = String(curr.getDate()).padStart(2, '0');
      dates.push(`${yyyy}-${mm}-${dd}`);
      curr.setDate(curr.getDate() + 1);
    }
    return dates;
  }

  saveCheckIn(dateStr, userId, sessionType, weight, note = '', isRetroactive = false) {
    if (!this.data.records[dateStr]) {
      this.data.records[dateStr] = {};
    }
    if (!this.data.records[dateStr][userId]) {
      this.data.records[dateStr][userId] = {};
    }

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    this.data.records[dateStr][userId][sessionType] = {
      weight: parseFloat(weight),
      time: timeStr,
      note: note.trim(),
      isRetroactive: Boolean(isRetroactive),
      timestamp: Date.now()
    };

    this.save();
    return this.data.records[dateStr][userId][sessionType];
  }

  getLatestWeight(userId) {
    const dates = this.getAllDateStrings();
    for (let i = dates.length - 1; i >= 0; i--) {
      const d = dates[i];
      const rec = this.getRecord(d, userId);
      if (rec) {
        if (rec.evening && rec.evening.weight) return { weight: rec.evening.weight, date: d, session: 'evening' };
        if (rec.morning && rec.morning.weight) return { weight: rec.morning.weight, date: d, session: 'morning' };
      }
    }
    return { weight: this.data.users[userId].initialWeight, date: START_DATE, session: 'init' };
  }

  getUserStats(userId) {
    const user = this.getUser(userId);
    if (!user) return null;

    const latest = this.getLatestWeight(userId);
    const totalLost = Math.max(0, +(user.initialWeight - latest.weight).toFixed(2));
    const targetDiff = +(latest.weight - user.targetWeight).toFixed(2);
    const progressPct = Math.min(100, Math.max(0, +(((user.initialWeight - latest.weight) / (user.initialWeight - user.targetWeight)) * 100).toFixed(1)));

    // Calculate streaks & total check-ins
    let totalCheckins = 0;
    let currentStreak = 0;
    const allDates = this.getAllDateStrings();
    
    for (const d of allDates) {
      const rec = this.getRecord(d, userId);
      if (rec && (rec.morning || rec.evening)) {
        totalCheckins += (rec.morning ? 1 : 0) + (rec.evening ? 1 : 0);
      }
    }

    return {
      currentWeight: latest.weight,
      initialWeight: user.initialWeight,
      targetWeight: user.targetWeight,
      totalLost: totalLost,
      targetDiff: targetDiff,
      progressPct: isNaN(progressPct) ? 0 : progressPct,
      totalCheckins: totalCheckins,
      motto: user.motto
    };
  }

  getTeamStats() {
    const users = this.getAllUsers();
    let teamTotalLost = 0;
    let teamTotalCheckins = 0;

    users.forEach(u => {
      const stats = this.getUserStats(u.id);
      if (stats) {
        teamTotalLost += stats.totalLost;
        teamTotalCheckins += stats.totalCheckins;
      }
    });

    const now = new Date();
    const end = new Date(END_DATE + 'T23:59:59');
    const diffTime = end - now;
    const remainingDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    return {
      teamTotalLost: +teamTotalLost.toFixed(2),
      teamTotalCheckins: teamTotalCheckins,
      remainingDays: remainingDays,
      totalDays: DURATION_DAYS
    };
  }

  addPenalty(userId, reason, count = 50, type = '俯卧撑') {
    const penalty = {
      id: 'pen_' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      userId: userId,
      userName: this.data.users[userId]?.name || userId,
      type: type,
      count: count,
      reason: reason,
      settled: false,
      timestamp: Date.now()
    };
    this.data.penalties.unshift(penalty);
    this.save();
    return penalty;
  }

  togglePenaltySettled(penaltyId) {
    const p = this.data.penalties.find(item => item.id === penaltyId);
    if (p) {
      p.settled = !p.settled;
      this.save();
    }
  }

  exportDataJSON() {
    return JSON.stringify(this.data, null, 2);
  }

  importDataJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed && parsed.users && parsed.records) {
        this.data = parsed;
        this.save();
        return true;
      }
    } catch (e) {
      console.error('Import failed:', e);
    }
    return false;
  }
}

window.trackerStorage = new TrackerStorage();
