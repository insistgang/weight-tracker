/**
 * WeightTracker - High-Definition Canvas 9:16 Battle Poster Generator
 */

class BattlePosterGenerator {
  static async generatePoster(selectedDate = null) {
    const storage = window.trackerStorage;
    const dateStr = selectedDate || (typeof window.getLocalDateKey === 'function'
      ? window.getLocalDateKey()
      : `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`);
    const teamStats = storage.getTeamStats();
    const users = storage.getAllUsers();

    const canvas = document.createElement('canvas');
    const width = 1080;
    const height = 1920;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // 1. Background Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#090d16');
    bgGrad.addColorStop(0.5, '#111827');
    bgGrad.addColorStop(1, '#090d16');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Decorative ambient circles
    ctx.save();
    const glow1 = ctx.createRadialGradient(200, 300, 0, 200, 300, 500);
    glow1.addColorStop(0, 'rgba(16, 185, 129, 0.18)');
    glow1.addColorStop(1, 'transparent');
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, width, height);

    const glow2 = ctx.createRadialGradient(880, 1300, 0, 880, 1300, 600);
    glow2.addColorStop(0, 'rgba(6, 182, 212, 0.15)');
    glow2.addColorStop(1, 'transparent');
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    // 2. Header Tag
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 34px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🔥 2026 秋季三人减重决战 · 铁血自律战报', width / 2, 140);

    // Date & Day Title
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 76px "Plus Jakarta Sans", sans-serif';
    const allDates = storage.getAllDateStrings();
    const dayIdx = Math.max(1, allDates.indexOf(dateStr) + 1);
    ctx.fillText(`DAY ${dayIdx} / 38`, width / 2, 240);

    ctx.fillStyle = '#9ca3af';
    ctx.font = '500 32px "JetBrains Mono", monospace';
    ctx.fillText(`日期：${dateStr}  |  终局倒计时：${teamStats.remainingDays} 天`, width / 2, 300);

    // 3. Team Total Banner Card
    ctx.save();
    ctx.fillStyle = 'rgba(26, 34, 52, 0.85)';
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
    ctx.lineWidth = 3;
    this.roundRect(ctx, 80, 350, width - 160, 180, 24);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#9ca3af';
    ctx.font = '600 30px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('⚡ 铁三角全员累计消灭脂肪', 130, 420);

    ctx.fillStyle = '#10b981';
    ctx.font = '800 64px "JetBrains Mono", monospace';
    ctx.fillText(`- ${teamStats.teamTotalLost.toFixed(1)} kg`, 130, 490);

    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 32px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`打卡总计 ${teamStats.teamTotalCheckins} 次`, width - 130, 460);
    ctx.restore();

    // 4. Three Combat User Cards
    let startY = 570;
    const cardHeight = 310;
    const gap = 30;

    users.forEach((u, i) => {
      const stats = storage.getUserStats(u.id);
      const rec = storage.getRecord(dateStr, u.id) || {};
      const cardY = startY + i * (cardHeight + gap);

      // Card Box
      ctx.save();
      ctx.fillStyle = 'rgba(18, 24, 38, 0.9)';
      ctx.strokeStyle = i === 0 ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 2;
      this.roundRect(ctx, 80, cardY, width - 160, cardHeight, 20);
      ctx.fill();
      ctx.stroke();

      // Avatar Circle
      const colors = ['#10b981', '#06b6d4', '#f59e0b'];
      ctx.fillStyle = colors[i % 3];
      ctx.beginPath();
      ctx.arc(160, cardY + 80, 42, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(u.name.slice(0, 1), 160, cardY + 92);

      // Name & Role
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 44px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(u.name, 230, cardY + 75);

      ctx.fillStyle = '#9ca3af';
      ctx.font = '500 26px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(u.role, 230, cardY + 115);

      // Total Lost Badge
      ctx.textAlign = 'right';
      ctx.fillStyle = '#10b981';
      ctx.font = '800 48px "JetBrains Mono", monospace';
      ctx.fillText(`-${stats.totalLost.toFixed(1)} kg`, width - 130, cardY + 85);

      ctx.fillStyle = '#6b7280';
      ctx.font = '500 24px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(`较初始 ${stats.initialWeight}kg`, width - 130, cardY + 120);

      // Divider Line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.beginPath();
      ctx.moveTo(130, cardY + 150);
      ctx.lineTo(width - 130, cardY + 150);
      ctx.stroke();

      // Morning & Evening Details
      const mText = rec.morning ? `早: ${rec.morning.weight}kg (${rec.morning.time})` : '早: 待打卡 ⏳';
      const eText = rec.evening ? `晚: ${rec.evening.weight}kg (${rec.evening.time})` : '晚: 待打卡 ⏳';

      ctx.textAlign = 'left';
      ctx.fillStyle = rec.morning ? '#e5e7eb' : '#6b7280';
      ctx.font = '600 30px "JetBrains Mono", monospace';
      ctx.fillText(`☀️ ${mText}`, 130, cardY + 205);

      ctx.fillStyle = rec.evening ? '#e5e7eb' : '#6b7280';
      ctx.fillText(`🌙 ${eText}`, 550, cardY + 205);

      // Note snippet
      const note = (rec.morning?.note || rec.evening?.note || u.motto || '恪守底线，严格自律！').slice(0, 32);
      ctx.fillStyle = '#9ca3af';
      ctx.font = 'italic 26px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(`💬 “${note}”`, 130, cardY + 265);
      ctx.restore();
    });

    // 5. Bottom Motto Box
    const mottoY = 1630;
    ctx.save();
    ctx.fillStyle = 'rgba(239, 68, 68, 0.08)';
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
    ctx.lineWidth = 2;
    this.roundRect(ctx, 80, mottoY, width - 160, 140, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f87171';
    ctx.font = 'bold 32px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('“为自己瘦下去，把这件事作为责任，作为理想。”', width / 2, mottoY + 60);

    ctx.fillStyle = '#9ca3af';
    ctx.font = '500 24px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('不找借口 · 真实记录 · 早晚双测 · 责任捆绑 · 顶峰相见', width / 2, mottoY + 105);
    ctx.restore();

    // 6. Footer Branding
    ctx.fillStyle = '#4b5563';
    ctx.font = '500 24px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Powered by WeightTracker · GitHub Public Open Source', width / 2, 1840);

    return canvas.toDataURL('image/png');
  }

  static roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}

window.BattlePosterGenerator = BattlePosterGenerator;
