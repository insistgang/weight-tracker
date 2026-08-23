/**
 * WeightTracker - Local cache and Supabase REST data layer
 */

const STORAGE_KEY = 'WT_WEIGHT_TRACKER_DATA_V2';
const SUPABASE_TABLE_PATH = '/rest/v1/';
const FIXED_USER_IDS = ['liugang', 'zhangtinglei', 'luxuan'];

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

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function getLocalDateKey(date = new Date()) {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return '';
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

function getLocalTimeKey(date = new Date()) {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return '';
  return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
}

function asFiniteNumber(value, fallback = null) {
  const number = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(number) ? number : fallback;
}

function asDateKey(value, fallback = '') {
  const text = String(value || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : fallback;
}

function asErrorMessage(error) {
  if (error instanceof Error && error.message) return error.message;
  return String(error || '未知网络错误');
}

class TrackerStorage {
  constructor() {
    this.data = this.load();
    this.syncStatus = {
      state: 'local',
      lastError: '',
      lastSyncAt: null
    };
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return this.normalizeLocalState(JSON.parse(raw));
    } catch (error) {
      console.error('Failed to load local cache:', error);
    }
    return this.getInitialState();
  }

  getInitialState() {
    return {
      version: 2,
      startDate: START_DATE,
      endDate: END_DATE,
      users: cloneValue(DEFAULT_USERS),
      records: {},
      penalties: [],
      badges: {}
    };
  }

  normalizeLocalState(input) {
    const initial = this.getInitialState();
    const source = input && typeof input === 'object' ? input : {};
    const users = {};

    FIXED_USER_IDS.forEach((userId) => {
      const fallback = initial.users[userId];
      const stored = source.users && source.users[userId] ? source.users[userId] : {};
      users[userId] = {
        ...fallback,
        ...stored,
        id: userId,
        initialWeight: asFiniteNumber(stored.initialWeight, fallback.initialWeight),
        targetWeight: asFiniteNumber(stored.targetWeight, fallback.targetWeight),
        name: String(stored.name ?? fallback.name),
        role: String(stored.role ?? fallback.role),
        avatarBg: String(stored.avatarBg ?? fallback.avatarBg),
        motto: String(stored.motto ?? fallback.motto)
      };
    });

    return {
      version: 2,
      startDate: START_DATE,
      endDate: END_DATE,
      users,
      records: source.records && typeof source.records === 'object' ? source.records : {},
      penalties: Array.isArray(source.penalties) ? source.penalties : [],
      badges: source.badges && typeof source.badges === 'object' ? source.badges : {}
    };
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      return true;
    } catch (error) {
      console.error('Failed to save local cache:', error);
      return false;
    }
  }

  getSyncStatus() {
    return { ...this.syncStatus };
  }

  markSyncing() {
    this.syncStatus = { ...this.syncStatus, state: 'syncing', lastError: '' };
  }

  markSynced() {
    this.syncStatus = {
      state: 'synced',
      lastError: '',
      lastSyncAt: Date.now()
    };
  }

  markSyncError(error) {
    this.syncStatus = {
      ...this.syncStatus,
      state: 'error',
      lastError: asErrorMessage(error)
    };
  }

  getSupabaseConfig() {
    const config = window.WEIGHT_TRACKER_CONFIG || {};
    return {
      url: String(config.supabaseUrl || '').replace(/\/$/, ''),
      key: String(config.supabasePublishableKey || '')
    };
  }

  async request(tableQuery, options = {}) {
    const config = this.getSupabaseConfig();
    if (!config.url || !config.key) {
      throw new Error('云端配置缺失，当前仅使用本地缓存');
    }

    const headers = {
      ...(options.headers || {}),
      apikey: config.key
    };
    if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';

    let response;
    try {
      response = await fetch(`${config.url}${SUPABASE_TABLE_PATH}${tableQuery}`, {
        ...options,
        headers
      });
    } catch (error) {
      throw new Error(`云端网络不可用：${asErrorMessage(error)}`);
    }

    const bodyText = await response.text();
    if (!response.ok) {
      let detail = bodyText;
      try {
        const parsed = JSON.parse(bodyText);
        detail = parsed.message || parsed.error_description || parsed.error || bodyText;
      } catch (_error) {
        // Keep the raw response when Supabase did not return JSON.
      }
      throw new Error(`云端请求失败（${response.status}）：${detail || response.statusText}`);
    }

    if (!bodyText) return [];
    try {
      return JSON.parse(bodyText);
    } catch (_error) {
      return [];
    }
  }

  async initialize() {
    return this.refresh();
  }

  async refresh() {
    this.markSyncing();
    const userFilter = `user_id=in.(${FIXED_USER_IDS.join(',')})`;
    try {
      const [remoteUsers, remoteEntries, remotePenalties] = await Promise.all([
        this.request('tracker_users?select=id,name,role,avatar_bg,initial_weight,target_weight,motto,updated_at&id=in.(' + FIXED_USER_IDS.join(',') + ')'),
        this.request(`weight_entries?select=id,user_id,entry_date,session,weight,note,is_retroactive,recorded_at,updated_at&${userFilter}`),
        this.request(`penalties?select=id,user_id,penalty_date,type,count,reason,settled,created_at,updated_at&${userFilter}`)
      ]);

      const users = this.buildUsersFromRemote(Array.isArray(remoteUsers) ? remoteUsers : []);
      const records = this.buildRecordsFromRemote(Array.isArray(remoteEntries) ? remoteEntries : []);
      const penalties = this.buildPenaltiesFromRemote(Array.isArray(remotePenalties) ? remotePenalties : [], users);

      this.data = {
        version: 2,
        startDate: START_DATE,
        endDate: END_DATE,
        users,
        records,
        penalties,
        badges: this.data.badges || {}
      };
      this.save();
      this.markSynced();
      return true;
    } catch (error) {
      this.markSyncError(error);
      throw error;
    }
  }

  buildUsersFromRemote(rows) {
    const users = {};
    FIXED_USER_IDS.forEach((userId) => {
      const fallback = this.data.users[userId] || DEFAULT_USERS[userId];
      const row = rows.find((item) => item && item.id === userId) || {};
      users[userId] = {
        ...fallback,
        id: userId,
        name: String(row.name ?? fallback.name),
        role: String(row.role ?? fallback.role),
        avatarBg: String(row.avatar_bg ?? fallback.avatarBg),
        initialWeight: asFiniteNumber(row.initial_weight, fallback.initialWeight),
        targetWeight: asFiniteNumber(row.target_weight, fallback.targetWeight),
        motto: String(row.motto ?? fallback.motto),
        updatedAt: row.updated_at || fallback.updatedAt || null
      };
    });
    return users;
  }

  buildRecordsFromRemote(rows) {
    const records = {};
    rows.forEach((row) => {
      if (!row || !FIXED_USER_IDS.includes(row.user_id)) return;
      const date = asDateKey(row.entry_date);
      const session = row.session === 'evening' ? 'evening' : row.session === 'morning' ? 'morning' : '';
      const weight = asFiniteNumber(row.weight);
      if (!date || !session || weight === null) return;

      if (!records[date]) records[date] = {};
      if (!records[date][row.user_id]) records[date][row.user_id] = {};
      records[date][row.user_id][session] = this.localRecordFromRemote(row, weight);
    });
    return records;
  }

  localRecordFromRemote(row, weight = asFiniteNumber(row.weight, 0)) {
    const recordedAt = row.recorded_at || row.updated_at || null;
    const recordedDate = recordedAt ? new Date(recordedAt) : new Date();
    return {
      id: row.id || null,
      weight,
      time: getLocalTimeKey(recordedDate) || getLocalTimeKey(),
      note: String(row.note || '').trim(),
      isRetroactive: Boolean(row.is_retroactive),
      timestamp: Date.parse(recordedAt) || Date.now(),
      recordedAt,
      updatedAt: row.updated_at || null
    };
  }

  buildPenaltiesFromRemote(rows, users = this.data.users) {
    return rows
      .filter((row) => row && FIXED_USER_IDS.includes(row.user_id))
      .map((row) => ({
        id: row.id,
        date: asDateKey(row.penalty_date, getLocalDateKey()),
        userId: row.user_id,
        userName: users[row.user_id]?.name || row.user_id,
        type: String(row.type || '俯卧撑'),
        count: asFiniteNumber(row.count, 0),
        reason: String(row.reason || ''),
        settled: Boolean(row.settled),
        timestamp: Date.parse(row.created_at) || Date.now(),
        createdAt: row.created_at || null,
        updatedAt: row.updated_at || null
      }))
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  applyRemoteUser(row) {
    if (!row || !FIXED_USER_IDS.includes(row.id)) return;
    const current = this.data.users[row.id] || DEFAULT_USERS[row.id];
    this.data.users[row.id] = {
      ...current,
      id: row.id,
      name: String(row.name ?? current.name),
      role: String(row.role ?? current.role),
      avatarBg: String(row.avatar_bg ?? current.avatarBg),
      initialWeight: asFiniteNumber(row.initial_weight, current.initialWeight),
      targetWeight: asFiniteNumber(row.target_weight, current.targetWeight),
      motto: String(row.motto ?? current.motto),
      updatedAt: row.updated_at || current.updatedAt || null
    };
  }

  applyRemoteEntry(row, fallback = {}) {
    if (!row || !FIXED_USER_IDS.includes(row.user_id)) return null;
    const date = asDateKey(row.entry_date, fallback.entry_date);
    const session = row.session || fallback.session;
    const weight = asFiniteNumber(row.weight, fallback.weight);
    if (!date || !['morning', 'evening'].includes(session) || weight === null) return null;

    if (!this.data.records[date]) this.data.records[date] = {};
    if (!this.data.records[date][row.user_id]) this.data.records[date][row.user_id] = {};
    this.data.records[date][row.user_id][session] = this.localRecordFromRemote({ ...fallback, ...row }, weight);
    return this.data.records[date][row.user_id][session];
  }

  applyRemotePenalty(row, fallback = {}) {
    if (!row || !FIXED_USER_IDS.includes(row.user_id)) return null;
    const penalty = this.buildPenaltiesFromRemote([{ ...fallback, ...row }])[0];
    if (!penalty) return null;
    const existingIndex = this.data.penalties.findIndex((item) => String(item.id) === String(penalty.id));
    if (existingIndex >= 0) this.data.penalties[existingIndex] = penalty;
    else this.data.penalties.unshift(penalty);
    return penalty;
  }

  getUser(userId) {
    return this.data.users[userId] || null;
  }

  getAllUsers() {
    return FIXED_USER_IDS.map((userId) => this.data.users[userId]).filter(Boolean);
  }

  async updateUserProfile(userId, values = {}) {
    if (!FIXED_USER_IDS.includes(userId) || !this.data.users[userId]) {
      throw new Error('无效的用户');
    }

    const payload = { updated_at: new Date().toISOString() };
    if (values.initialWeight !== undefined && values.initialWeight !== '') {
      const value = asFiniteNumber(values.initialWeight);
      if (value === null) throw new Error('初始体重格式无效');
      payload.initial_weight = value;
    }
    if (values.targetWeight !== undefined && values.targetWeight !== '') {
      const value = asFiniteNumber(values.targetWeight);
      if (value === null) throw new Error('目标体重格式无效');
      payload.target_weight = value;
    }
    if (values.motto !== undefined) payload.motto = String(values.motto).trim();

    const nextInitialWeight = payload.initial_weight ?? this.data.users[userId].initialWeight;
    const nextTargetWeight = payload.target_weight ?? this.data.users[userId].targetWeight;
    if (nextInitialWeight < 45 || nextInitialWeight > 140 || nextTargetWeight < 45 || nextTargetWeight > 140) {
      throw new Error('初始体重和目标体重必须在 45 至 140kg 之间');
    }
    if (nextTargetWeight >= nextInitialWeight) {
      throw new Error('目标体重必须小于初始体重');
    }
    if (payload.motto !== undefined && payload.motto.length > 120) {
      throw new Error('誓言不能超过 120 个字符');
    }

    try {
      const rows = await this.request(`tracker_users?id=eq.${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(payload)
      });
      const row = Array.isArray(rows) ? rows[0] : rows;
      if (!row) throw new Error('云端未返回更新后的用户资料');
      this.applyRemoteUser(row);
      this.save();
      this.markSynced();
      return this.getUser(userId);
    } catch (error) {
      this.markSyncError(error);
      throw error;
    }
  }

  getRecord(dateStr, userId) {
    if (!this.data.records[dateStr]) return null;
    return this.data.records[dateStr][userId] || null;
  }

  getAllDateStrings() {
    const dates = [];
    const current = new Date(`${START_DATE}T00:00:00`);
    const end = new Date(`${END_DATE}T00:00:00`);
    while (current <= end) {
      dates.push(getLocalDateKey(current));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }

  async saveCheckIn(dateStr, userId, sessionType, weight, note = '', isRetroactive = false) {
    const cleanDate = asDateKey(dateStr);
    const cleanWeight = asFiniteNumber(weight);
    if (!cleanDate || !FIXED_USER_IDS.includes(userId) || !['morning', 'evening'].includes(sessionType)) {
      throw new Error('打卡信息无效');
    }
    if (cleanDate < START_DATE || cleanDate > END_DATE) {
      throw new Error(`打卡日期必须在 ${START_DATE} 至 ${END_DATE} 之间`);
    }
    if (cleanWeight === null || cleanWeight < 45 || cleanWeight > 140) {
      throw new Error('体重必须是 45 至 140kg 之间的数字');
    }

    const cleanNote = String(note || '').trim();
    if (cleanNote.length > 200) throw new Error('备注不能超过 200 个字符');

    const now = new Date().toISOString();
    const payload = {
      user_id: userId,
      entry_date: cleanDate,
      session: sessionType,
      weight: +cleanWeight.toFixed(1),
      note: cleanNote,
      is_retroactive: Boolean(isRetroactive),
      recorded_at: now,
      updated_at: now
    };

    try {
      const rows = await this.request('weight_entries?on_conflict=user_id,entry_date,session', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify(payload)
      });
      const row = Array.isArray(rows) ? rows[0] : rows;
      if (!row) throw new Error('云端未返回已保存的打卡记录');
      const record = this.applyRemoteEntry(row, payload);
      if (!record) throw new Error('云端返回的打卡记录无效');
      this.save();
      this.markSynced();
      return record;
    } catch (error) {
      this.markSyncError(error);
      throw error;
    }
  }

  getLatestWeight(userId) {
    const user = this.getUser(userId);
    if (!user) return null;
    const dates = this.getAllDateStrings();
    for (let index = dates.length - 1; index >= 0; index -= 1) {
      const date = dates[index];
      const record = this.getRecord(date, userId);
      if (!record) continue;
      if (record.evening && asFiniteNumber(record.evening.weight) !== null) {
        return { weight: record.evening.weight, date, session: 'evening' };
      }
      if (record.morning && asFiniteNumber(record.morning.weight) !== null) {
        return { weight: record.morning.weight, date, session: 'morning' };
      }
    }
    return { weight: user.initialWeight, date: START_DATE, session: 'init' };
  }

  getUserStats(userId) {
    const user = this.getUser(userId);
    if (!user) return null;

    const latest = this.getLatestWeight(userId);
    const totalLost = Math.max(0, +(user.initialWeight - latest.weight).toFixed(2));
    const targetDiff = +(latest.weight - user.targetWeight).toFixed(2);
    const denominator = user.initialWeight - user.targetWeight;
    const rawProgress = denominator === 0 ? 0 : ((user.initialWeight - latest.weight) / denominator) * 100;
    const progressPct = Math.min(100, Math.max(0, +rawProgress.toFixed(1)));

    let totalCheckins = 0;
    this.getAllDateStrings().forEach((date) => {
      const record = this.getRecord(date, userId);
      if (record && record.morning) totalCheckins += 1;
      if (record && record.evening) totalCheckins += 1;
    });

    return {
      currentWeight: latest.weight,
      initialWeight: user.initialWeight,
      targetWeight: user.targetWeight,
      totalLost,
      targetDiff,
      progressPct: Number.isNaN(progressPct) ? 0 : progressPct,
      totalCheckins,
      motto: user.motto
    };
  }

  getTeamStats() {
    let teamTotalLost = 0;
    let teamTotalCheckins = 0;
    this.getAllUsers().forEach((user) => {
      const stats = this.getUserStats(user.id);
      if (stats) {
        teamTotalLost += stats.totalLost;
        teamTotalCheckins += stats.totalCheckins;
      }
    });

    const end = new Date(`${END_DATE}T23:59:59`);
    const remainingDays = Math.max(0, Math.ceil((end - new Date()) / (1000 * 60 * 60 * 24)));
    return {
      teamTotalLost: +teamTotalLost.toFixed(2),
      teamTotalCheckins,
      remainingDays,
      totalDays: DURATION_DAYS
    };
  }

  async addPenalty(userId, reason, count = 50, type = '俯卧撑') {
    if (!FIXED_USER_IDS.includes(userId)) throw new Error('无效的用户');
    const payload = {
      user_id: userId,
      penalty_date: getLocalDateKey(),
      type: String(type || '俯卧撑'),
      count: asFiniteNumber(count, 50),
      reason: String(reason || '').trim(),
      settled: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      const rows = await this.request('penalties', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(payload)
      });
      const row = Array.isArray(rows) ? rows[0] : rows;
      if (!row) throw new Error('云端未返回已保存的惩罚记录');
      const penalty = this.applyRemotePenalty(row, payload);
      if (!penalty) throw new Error('云端返回的惩罚记录无效');
      this.save();
      this.markSynced();
      return penalty;
    } catch (error) {
      this.markSyncError(error);
      throw error;
    }
  }

  async togglePenaltySettled(penaltyId) {
    const penalty = this.data.penalties.find((item) => String(item.id) === String(penaltyId));
    if (!penalty) throw new Error('找不到该惩罚记录');
    const nextSettled = !penalty.settled;

    try {
      const rows = await this.request(`penalties?id=eq.${encodeURIComponent(penaltyId)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ settled: nextSettled, updated_at: new Date().toISOString() })
      });
      const row = Array.isArray(rows) ? rows[0] : rows;
      if (!row) throw new Error('云端未返回已更新的惩罚记录');
      const updated = this.applyRemotePenalty(row);
      if (!updated) throw new Error('云端返回的惩罚记录无效');
      this.save();
      this.markSynced();
      return updated;
    } catch (error) {
      this.markSyncError(error);
      throw error;
    }
  }

  exportDataJSON() {
    return JSON.stringify(this.data, null, 2);
  }

  importDataJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed && parsed.users && parsed.records) {
        this.data = this.normalizeLocalState(parsed);
        this.save();
        return true;
      }
    } catch (error) {
      console.error('Import failed:', error);
    }
    return false;
  }
}

window.getLocalDateKey = getLocalDateKey;
window.trackerStorage = new TrackerStorage();
