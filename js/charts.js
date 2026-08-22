/**
 * WeightTracker - Chart.js PK Trajectory & GitHub-Style Heatmap Engine
 */

class TrackerCharts {
  constructor() {
    this.pkChart = null;
  }

  initPKChart(canvasId = 'pk-chart-canvas') {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return;

    const storage = window.trackerStorage;
    const allDates = storage.getAllDateStrings();
    const shortLabels = allDates.map(d => d.slice(5)); // '08-24'

    // Datasets for 3 users
    const users = storage.getAllUsers();
    const colors = {
      liugang: { stroke: '#10b981', fill: 'rgba(16, 185, 129, 0.1)' },
      zhangtinglei: { stroke: '#06b6d4', fill: 'rgba(6, 182, 212, 0.1)' },
      luxuan: { stroke: '#f59e0b', fill: 'rgba(245, 158, 11, 0.1)' }
    };

    const datasets = users.map(u => {
      const dataPoints = allDates.map(d => {
        const rec = storage.getRecord(d, u.id);
        if (!rec) return null;
        if (rec.morning && rec.morning.weight) return rec.morning.weight;
        if (rec.evening && rec.evening.weight) return rec.evening.weight;
        return null;
      });

      return {
        label: u.name,
        data: dataPoints,
        borderColor: colors[u.id]?.stroke || '#9ca3af',
        backgroundColor: colors[u.id]?.fill || 'transparent',
        borderWidth: 3,
        pointBackgroundColor: colors[u.id]?.stroke || '#9ca3af',
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.35,
        spanGaps: true
      };
    });

    if (this.pkChart) {
      this.pkChart.destroy();
    }

    this.pkChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: shortLabels,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: false // Using custom UI legend
          },
          tooltip: {
            backgroundColor: '#1a2234',
            titleColor: '#f3f4f6',
            bodyColor: '#e5e7eb',
            borderColor: 'rgba(255, 255, 255, 0.15)',
            borderWidth: 1,
            padding: 12,
            boxPadding: 6,
            usePointStyle: true,
            callbacks: {
              label: (context) => {
                const val = context.raw;
                return val ? ` ${context.dataset.label}: ${val} kg` : ` ${context.dataset.label}: 未打卡`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(255, 255, 255, 0.05)',
              drawBorder: false
            },
            ticks: {
              color: '#6b7280',
              font: { size: 10, family: 'JetBrains Mono' },
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 10
            }
          },
          y: {
            grid: {
              color: 'rgba(255, 255, 255, 0.07)',
              drawBorder: false
            },
            ticks: {
              color: '#9ca3af',
              font: { size: 10, family: 'JetBrains Mono' },
              callback: (val) => `${val}kg`
            }
          }
        }
      }
    });
  }

  updatePKChart() {
    if (this.pkChart) {
      const storage = window.trackerStorage;
      const allDates = storage.getAllDateStrings();
      const users = storage.getAllUsers();

      users.forEach((u, i) => {
        const dataPoints = allDates.map(d => {
          const rec = storage.getRecord(d, u.id);
          if (!rec) return null;
          if (rec.morning && rec.morning.weight) return rec.morning.weight;
          if (rec.evening && rec.evening.weight) return rec.evening.weight;
          return null;
        });
        if (this.pkChart.data.datasets[i]) {
          this.pkChart.data.datasets[i].data = dataPoints;
        }
      });
      this.pkChart.update();
    }
  }

  renderHeatmap(containerId = 'heatmap-container', onSelectDate = null) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const storage = window.trackerStorage;
    const allDates = storage.getAllDateStrings();
    const today = new Date().toISOString().split('T')[0];

    let html = `
      <div class="heatmap-grid">
    `;

    allDates.forEach((d, idx) => {
      const dateObj = new Date(d + 'T00:00:00');
      const dayNum = dateObj.getDate();
      const monthNum = dateObj.getMonth() + 1;
      const shortStr = `${monthNum}/${dayNum}`;

      // Check attendance of the 3 users
      const users = storage.getAllUsers();
      let fullCount = 0;
      let checkinTotal = 0;

      users.forEach(u => {
        const rec = storage.getRecord(d, u.id);
        if (rec) {
          if (rec.morning && rec.evening) fullCount++;
          if (rec.morning || rec.evening) checkinTotal++;
        }
      });

      let statusClass = 'heatmap-status-empty';
      let icon = '';

      if (fullCount === 3) {
        statusClass = 'heatmap-status-full';
        icon = '✨';
      } else if (checkinTotal > 0) {
        statusClass = 'heatmap-status-half';
        icon = `${checkinTotal}/6`;
      } else if (d < today) {
        statusClass = 'heatmap-status-missed';
        icon = '✕';
      }

      const isToday = d === today;

      html += `
        <div class="heatmap-cell ${statusClass} cursor-pointer ${isToday ? 'ring-2 ring-emerald-400' : ''}" 
             data-date="${d}" title="${d} 打卡情况: ${checkinTotal}/6次">
          <span class="font-mono-num text-[9px] opacity-80">${shortStr}</span>
          <span class="text-[8px] font-bold mt-0.5">${icon || `D${idx + 1}`}</span>
        </div>
      `;
    });

    html += `</div>`;
    container.innerHTML = html;

    // Attach click events
    container.querySelectorAll('.heatmap-cell').forEach(cell => {
      cell.addEventListener('click', () => {
        const date = cell.getAttribute('data-date');
        if (typeof onSelectDate === 'function') {
          onSelectDate(date);
        }
      });
    });
  }
}

window.trackerCharts = new TrackerCharts();
