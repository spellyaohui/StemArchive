/**
 * 仪表板页面脚本
 * 负责显示系统概览和统计数据
 */

class Dashboard {
  constructor() {
    this.charts = {};
    this.init();
  }

  init() {
    this.loadDashboardData();
    this.initCharts();
    this.bindEvents();
  }

  // 加载仪表板数据
  async loadDashboardData() {
    try {
      // 并行加载仪表板统计数据
      const [dashboardResponse, monthlyResponse, treatmentTypesResponse, diseasesResponse, comprehensiveResponse] = await Promise.all([
        fetchWithAuth('/statistics/dashboard'),
        fetchWithAuth('/statistics/monthly'),
        fetchWithAuth('/statistics/treatment-types'),
        fetchWithAuth('/statistics/diseases'),
        fetchWithAuth('/statistics/comprehensive')
      ]);

      const dashboardData = await dashboardResponse.json();
      const monthlyData = await monthlyResponse.json();
      const treatmentTypesData = await treatmentTypesResponse.json();
      const diseasesData = await diseasesResponse.json();
      const comprehensiveData = await comprehensiveResponse.json();

      // 更新统计卡片
      if (dashboardData.status === 'Success') {
        this.updateStatCards({
          totalCustomers: dashboardData.data.totalCustomers,
          stemCellPatients: dashboardData.data.stemCellPatients,
          monthlyInfusions: dashboardData.data.monthlyInfusions,
          todaySchedules: dashboardData.data.todaySchedules
        });
      }

      // 更新新增的统计卡片
      if (diseasesData.status === 'Success') {
        this.updateDiseaseStats(diseasesData.data);
      }

      if (comprehensiveData.status === 'Success' && comprehensiveData.data.treatmentEffectiveness) {
        this.updateTreatmentEffectStats(comprehensiveData.data.treatmentEffectiveness);
      }

      // 更新图表数据
      if (monthlyData.status === 'Success' && treatmentTypesData.status === 'Success') {
        this.updateCharts({
          monthly: {
            labels: monthlyData.data.map(item => item.month),
            data: monthlyData.data.map(item => item.infusions || item.patients)
          },
          treatmentType: {
            labels: treatmentTypesData.data.map(item => item.name),
            data: treatmentTypesData.data.map(item => item.count)
          }
        });
      }

      // 获取今日排期数据
      await this.loadTodaySchedules();

    } catch (error) {
      console.error('加载仪表板数据失败:', error);
      if (error.message.includes('fetch') || error.message.includes('network')) {
        NotificationHelper.networkError('无法加载仪表板数据，请检查网络连接', () => {
          dashboard.init(); // 重试加载
        });
      } else {
        NotificationHelper.error('加载仪表板数据失败，请刷新页面重试', '数据加载错误');
      }
    }
  }

  // 加载今日排期
  async loadTodaySchedules() {
    try {
      const response = await fetchWithAuth('/stem-cell/schedules/today');
      const result = await response.json();

      if (result.status === 'Success') {
        this.updateTodaySchedules(result.data);
      } else {
        this.updateTodaySchedules([]);
      }
    } catch (error) {
      console.error('加载今日排期失败:', error);
      this.updateTodaySchedules([]);
    }
  }

  // 更新统计卡片
  updateStatCards(stats) {
    const elements = {
      totalCustomers: document.getElementById('totalCustomers'),
      stemCellPatients: document.getElementById('stemCellPatients'),
      monthlyInfusions: document.getElementById('monthlyInfusions'),
      todaySchedules: document.getElementById('todaySchedules')
    };

    Object.keys(elements).forEach(key => {
      if (elements[key] && stats[key] !== undefined) {
        elements[key].textContent = stats[key];
      }
    });
  }

  // 更新今日排期列表
  updateTodaySchedules(schedules) {
    const container = document.getElementById('todaySchedulesList');

    if (!container) {return;}

    if (!schedules || schedules.length === 0) {
      container.innerHTML = `
                <div class="text-center text-gray-500 py-4">
                    <i class="fas fa-calendar-times text-2xl mb-2"></i>
                    <p>今日暂无排期</p>
                </div>
            `;
      return;
    }

    container.innerHTML = schedules.map(schedule => {
      const time = schedule.ScheduleDate ?
        new Date(schedule.ScheduleDate).toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit'
        }) : '未知时间';

      return `
                <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div class="flex items-center space-x-3">
                        <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <i class="fas fa-user text-blue-600"></i>
                        </div>
                        <div>
                            <p class="font-medium text-gray-800">${schedule.CustomerName || '未知客户'}</p>
                            <p class="text-sm text-gray-600">${schedule.TreatmentType || '未知类型'}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="text-sm font-medium text-gray-800">${time}</p>
                        <span class="inline-block px-2 py-1 text-xs rounded-full ${this.getStatusClass(schedule.Status)}">
                            ${this.getStatusText(schedule.Status)}
                        </span>
                    </div>
                </div>
            `;
    }).join('');
  }

  // 获取状态样式类
  getStatusClass(status) {
    const statusClasses = {
      'Scheduled': 'bg-blue-100 text-blue-800',
      'In Progress': 'bg-yellow-100 text-yellow-800',
      'Completed': 'bg-green-100 text-green-800',
      'Cancelled': 'bg-red-100 text-red-800',
      '已安排': 'bg-blue-100 text-blue-800',
      '进行中': 'bg-yellow-100 text-yellow-800'  // 统一使用黄色
    };
    return statusClasses[status] || 'bg-gray-100 text-gray-800';
  }

  // 获取状态文本
  getStatusText(status) {
    const statusTexts = {
      'Scheduled': '已排期',
      'In Progress': '进行中',
      'Completed': '已完成',
      'Cancelled': '已取消',
      '已安排': '已排期',
      '进行中': '进行中'
    };
    return statusTexts[status] || '未知';
  }

  // 初始化图表
  initCharts() {
    this.initMonthlyChart();
    this.initTreatmentTypeChart();
  }

  // 初始化月度统计图表
  initMonthlyChart() {
    const canvas = document.getElementById('monthlyChart');
    if (!canvas) {return;}

    // 检查是否是canvas元素，如果是div则创建canvas子元素
    let ctx;
    if (canvas.tagName === 'CANVAS') {
      ctx = canvas.getContext('2d');
    } else {
      // 清空容器并创建canvas
      canvas.innerHTML = '';
      const newCanvas = document.createElement('canvas');
      newCanvas.style.height = '256px';
      canvas.appendChild(newCanvas);
      ctx = newCanvas.getContext('2d');
    }

    if (!ctx) {return;}

    this.charts.monthly = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: '月度回输统计',
          data: [],
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top'
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }

  // 初始化治疗类型分布图表
  initTreatmentTypeChart() {
    const canvas = document.getElementById('treatmentTypeChart');
    if (!canvas) {return;}

    // 检查是否是canvas元素，如果是div则创建canvas子元素
    let ctx;
    if (canvas.tagName === 'CANVAS') {
      ctx = canvas.getContext('2d');
    } else {
      // 清空容器并创建canvas
      canvas.innerHTML = '';
      const newCanvas = document.createElement('canvas');
      newCanvas.style.height = '256px';
      canvas.appendChild(newCanvas);
      ctx = newCanvas.getContext('2d');
    }

    if (!ctx) {return;}

    this.charts.treatmentType = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: [],
        datasets: [{
          label: '治疗类型分布',
          data: [],
          backgroundColor: [
            'rgba(255, 99, 132, 0.8)',
            'rgba(54, 162, 235, 0.8)',
            'rgba(255, 205, 86, 0.8)',
            'rgba(75, 192, 192, 0.8)',
            'rgba(153, 102, 255, 0.8)'
          ]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'right'
          }
        }
      }
    });
  }

  // 更新图表数据
  updateCharts(chartData) {
    if (!chartData) {return;}

    // 更新月度统计图表
    if (this.charts.monthly && chartData.monthly) {
      this.charts.monthly.data.labels = chartData.monthly.labels;
      this.charts.monthly.data.datasets[0].data = chartData.monthly.data;
      this.charts.monthly.update();
    }

    // 更新治疗类型分布图表
    if (this.charts.treatmentType && chartData.treatmentType) {
      this.charts.treatmentType.data.labels = chartData.treatmentType.labels;
      this.charts.treatmentType.data.datasets[0].data = chartData.treatmentType.data;
      this.charts.treatmentType.update();
    }
  }

  // 更新病种分布统计卡片
  updateDiseaseStats(diseases) {
    const container = document.getElementById('diseaseStats');
    if (!container) return;

    if (diseases && diseases.length > 0) {
      container.innerHTML = diseases.map(disease => `
        <div class="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
          <span class="text-sm font-medium text-gray-700">${disease.name}</span>
          <div class="flex items-center space-x-2">
            <span class="text-sm font-semibold text-indigo-600">${disease.count}例</span>
            <span class="text-xs text-gray-500">(${disease.percentage}%)</span>
          </div>
        </div>
      `).join('');
    } else {
      container.innerHTML = '<p class="text-gray-500 text-sm">暂无数据</p>';
    }
  }

  // 更新治疗效果分析统计卡片
  updateTreatmentEffectStats(treatmentEffectiveness) {
    const container = document.getElementById('treatmentEffectStats');
    if (!container) return;

    if (treatmentEffectiveness && treatmentEffectiveness.length > 0) {
      container.innerHTML = treatmentEffectiveness.map(effect => {
        const avgScoreText = effect.avgScore ? ` (平均评分: ${effect.avgScore}分)` : '';
        const scoreColor = effect.avgScore >= 75 ? 'text-green-600' : effect.avgScore >= 50 ? 'text-yellow-600' : 'text-gray-600';

        return `
          <div class="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
            <span class="text-sm font-medium text-gray-700">${effect.type}</span>
            <div class="flex items-center space-x-2">
              <span class="text-sm font-semibold text-teal-600">${effect.count}例</span>
              <span class="text-xs text-gray-500">(${effect.percentage}%)</span>
              <span class="text-xs ${scoreColor}">${avgScoreText}</span>
            </div>
          </div>
        `;
      }).join('');
    } else {
      container.innerHTML = '<p class="text-gray-500 text-sm">暂无数据</p>';
    }
  }

  // 绑定事件
  bindEvents() {
    // 定时刷新数据
    setInterval(() => {
      this.loadDashboardData();
    }, 60000); // 每分钟刷新一次

    // 监听窗口大小变化，重新渲染图表
    window.addEventListener('resize', () => {
      Object.values(this.charts).forEach(chart => {
        chart.resize();
      });
    });
  }
}

// 页面加载完成后初始化仪表板
document.addEventListener('DOMContentLoaded', () => {
  new Dashboard();
});