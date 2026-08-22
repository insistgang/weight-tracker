/**
 * WeightTracker - Hardcore Wolf-Pack AI Coach Diagnosis Engine
 */

class WolfCoachEngine {
  static getDiagnosis(userId, sessionType, currentWeight, dateStr) {
    const storage = window.trackerStorage;
    const user = storage.getUser(userId);
    if (!user) return null;

    const stats = storage.getUserStats(userId);
    const todayRec = storage.getRecord(dateStr, userId) || {};

    let level = 'normal';
    let badge = '⚡';
    let title = '铁血自律，保持节奏！';
    let quote = '把减重视为责任与理想，每一克脂肪的消融都在重塑你的意志！';

    // 1. Evening check-in analysis (Comparing with today morning)
    if (sessionType === 'evening') {
      const morningWeight = todayRec.morning ? todayRec.morning.weight : null;
      if (morningWeight !== null) {
        const delta = +(currentWeight - morningWeight).toFixed(1);
        if (delta <= 0) {
          level = 'fire';
          badge = '🔥';
          title = '代谢彻底爆发！今晚居然没涨！';
          quote = `今晚(${currentWeight}kg)比今早(${morningWeight}kg)还低了 ${Math.abs(delta)}kg！饮食极度干净，代谢完全拉满，明早必见历史新低！`;
        } else if (delta <= 0.8) {
          level = 'fire';
          badge = '💪';
          title = '极度自律的黄金控制区间！';
          quote = `日间温差仅涨 ${delta}kg（极佳状态），属于极干净的饮食控制。今晚十一点前入睡，明天早秤稳稳下探！`;
        } else if (delta > 1.5) {
          level = 'warning';
          badge = '⚠️';
          title = '水分与钠超标警报！';
          quote = `晚秤比早秤高出 ${delta}kg，说明今日碳水或重口味调料较多导致锁水。不必焦虑，今晚严禁加餐、少喝水早睡，明天恢复纯净饮食！`;
        } else {
          level = 'normal';
          badge = '🛡️';
          title = '正常生理波动，稳扎稳打！';
          quote = `晚秤波动 ${delta}kg 处于标准代谢范围，今晚做好恢复，明日早秤见分晓！`;
        }
        return { level, badge, title, quote, delta };
      }
    }

    // 2. Morning check-in analysis (Comparing with yesterday morning or baseline)
    if (sessionType === 'morning') {
      const totalLost = +(user.initialWeight - currentWeight).toFixed(1);
      
      if (totalLost >= 5.0) {
        level = 'trophy';
        badge = '🏆';
        title = `狂砍 ${totalLost}kg！战神级表现！`;
        quote = `从初始 ${user.initialWeight}kg 杀到 ${currentWeight}kg！你正在用铁一般的数据践行誓言，兄弟们都在看你领跑！`;
      } else if (totalLost >= 2.0) {
        level = 'fire';
        badge = '🔥';
        title = `累计减重突破 ${totalLost}kg！`;
        quote = `基准稳步下移，减脂飞轮已经高速转动，保持高水准执行，彻底甩开过去的自己！`;
      } else {
        level = 'fire';
        badge = '🚀';
        title = '晨秤打卡成功，开启自律一天！';
        quote = `今日基准 ${currentWeight}kg 已锁定！今日目标：吃得干净、水分充足、恪守底线，绝不给晚秤留借口！`;
      }
    }

    return { level, badge, title, quote };
  }
}

window.WolfCoachEngine = WolfCoachEngine;
