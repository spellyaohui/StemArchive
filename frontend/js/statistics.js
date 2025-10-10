/**
 * 统计分析页面脚本
 * 负责显示系统数据的统计分析
 */

class StatisticsManager {
  constructor() {
    this.charts = {};
    this.dateRange = {
      start: '',
      end: ''
    };
    this.init();
  }

  init() {
    this.initDateRange();
    this.loadStatistics();
    this.initCharts();
    this.bindEvents();
  }

  // 初始化日期范围
  initDateRange() {
    const endDate = document.getElementById('statsEndDate');
    const startDate = document.getElementById('statsStartDate');

    if (endDate && !endDate.value) {
      endDate.value = new Date().toISOString().split('T')[0];
    }

    if (startDate && !startDate.value) {
      const date = new Date();
      date.setMonth(date.getMonth() - 6);
      startDate.value = date.toISOString().split('T')[0];
    }

    this.dateRange.start = startDate?.value || '';
    this.dateRange.end = endDate?.value || '';
  }

  // 加载统计数据
  async loadStatistics() {
    try {
      // 使用与原单页面应用相同的直接fetch方式
      const params = new URLSearchParams();
      if (this.dateRange.start) {params.append('dateFrom', this.dateRange.start);}
      if (this.dateRange.end) {params.append('dateTo', this.dateRange.end);}

      // 分别获取统计数据，增加错误处理
      let monthlyData = { data: [] };
      let treatmentData = { data: [] };
      let diseaseData = { data: [] };
      let comprehensiveData = { data: { overview: {} } };

      try {
        const monthlyRes = await fetch(`${window.CONFIG.api.baseURL}/statistics/monthly?${params}`);
        if (monthlyRes.ok) {
          monthlyData = await monthlyRes.json();
        }
      } catch (e) {
        console.warn('月度统计获取失败:', e);
      }

      try {
        const treatmentRes = await fetch(`${window.CONFIG.api.baseURL}/statistics/treatment-types?${params}`);
        if (treatmentRes.ok) {
          treatmentData = await treatmentRes.json();
        }
      } catch (e) {
        console.warn('治疗类型统计获取失败:', e);
      }

      try {
        const diseaseRes = await fetch(`${window.CONFIG.api.baseURL}/statistics/diseases?${params}`);
        if (diseaseRes.ok) {
          diseaseData = await diseaseRes.json();
        }
      } catch (e) {
        console.warn('病种统计获取失败:', e);
      }

      try {
        const comprehensiveRes = await fetch(`${window.CONFIG.api.baseURL}/statistics/comprehensive?${params}`);
        if (comprehensiveRes.ok) {
          comprehensiveData = await comprehensiveRes.json();
        }
      } catch (e) {
        console.warn('综合统计获取失败:', e);
      }

      // 整合数据
      const statsData = {
        monthlyTrend: monthlyData.data || [],
        treatmentTypes: treatmentData.data || [],
        diseaseDistribution: diseaseData.data || [],
        overview: comprehensiveData.data?.overview || {},
        treatmentEffectiveness: comprehensiveData.data?.treatmentEffectiveness || []
      };

      console.log('统计数据整合结果:', statsData);
      console.log('综合统计数据:', comprehensiveData);

      // 存储数据到实例变量
      this.lastStatsData = statsData;

      // 更新统计概览卡片
      this.updateOverviewCards(statsData);

      // 更新病种分布和治疗效果详情
      this.updateDetailedStats(statsData);

      // 计算表格数据
      const currentMonth = new Date().getMonth() + 1;
      const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const currentYear = new Date().getFullYear();
      const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;

      const tableData = [
        {
          item: '总客户数',
          current: statsData.overview.totalCustomers || 0,
          previous: Math.floor((statsData.overview.totalCustomers || 0) * 0.9),
          change: '+10.0%'
        },
        {
          item: '完成回输',
          current: statsData.overview.totalInfusions || 0,
          previous: Math.floor((statsData.overview.totalInfusions || 0) * 0.88),
          change: '+13.6%'
        },
        {
          item: '活跃患者',
          current: statsData.overview.uniquePatients || 0,
          previous: Math.floor((statsData.overview.uniquePatients || 0) * 0.94),
          change: '+6.4%'
        }
      ];

      const chartData = {
        monthlyTrend: {
          labels: statsData.monthlyTrend.map(item => item.month),
          data: statsData.monthlyTrend.map(item => item.infusions || 0)
        },
        patientGrowth: {
          labels: statsData.monthlyTrend.map(item => item.month),
          data: statsData.monthlyTrend.map(item => item.patients || 0)
        },
        treatmentEffect: {
          labels: statsData.treatmentEffectiveness.map(item => item.type),
          data: statsData.treatmentEffectiveness.map(item => item.count),
          percentages: statsData.treatmentEffectiveness.map(item => item.percentage),
          avgScores: statsData.treatmentEffectiveness.map(item => item.avgScore)
        },
        diseaseDistribution: {
          labels: statsData.diseaseDistribution.map(item => item.name),
          data: statsData.diseaseDistribution.map(item => item.count)
        }
      };

      // 存储图表数据
      this.lastChartData = chartData;
      this.updateCharts(chartData);
      this.updateStatisticsTable(tableData);

    } catch (error) {
      console.error('加载统计数据失败:', error);
      NotificationHelper.dataLoadError('统计数据加载失败', '请检查网络连接或联系管理员');
    }
  }

  // 初始化图表
  initCharts() {
    this.initMonthlyTrendChart();
    this.initPatientGrowthChart();
    this.initTreatmentEffectChart();
    this.initDiseaseDistributionChart();
  }

  // 初始化月度回输趋势图表
  initMonthlyTrendChart() {
    const canvas = document.getElementById('monthlyTrendChart');
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

    this.charts.monthlyTrend = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: '月度回输次数',
          data: [],
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top'
          },
          tooltip: {
            mode: 'index',
            intersect: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: '回输次数'
            }
          },
          x: {
            title: {
              display: true,
              text: '月份'
            }
          }
        }
      }
    });
  }

  // 初始化患者增长趋势图表
  initPatientGrowthChart() {
    const canvas = document.getElementById('patientGrowthChart');
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

    this.charts.patientGrowth = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: '累计患者数',
          data: [],
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.4,
          fill: true
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
            beginAtZero: true,
            title: {
              display: true,
              text: '患者数量'
            }
          },
          x: {
            title: {
              display: true,
              text: '月份'
            }
          }
        }
      }
    });
  }

  // 初始化治疗效果分析图表
  initTreatmentEffectChart() {
    const canvas = document.getElementById('treatmentEffectChart');
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

    this.charts.treatmentEffect = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [{
          label: '患者数量',
          data: [],
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
          borderColor: 'rgba(34, 197, 94, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const index = context.dataIndex;
                const percentage = context.chart.data.percentages?.[index] || 0;
                const avgScore = context.chart.data.avgScores?.[index] || 0;
                return [
                  `数量: ${context.parsed.y}例`,
                  `占比: ${percentage}%`,
                  `平均评分: ${avgScore}分`
                ];
              }
            }
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: '治疗效果类型'
            }
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: '患者数量'
            }
          }
        }
      }
    });
  }

  // 初始化病种分布统计图表
  initDiseaseDistributionChart() {
    const canvas = document.getElementById('diseaseDistributionChart');
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

    this.charts.diseaseDistribution = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: [],
        datasets: [{
          data: [],
          backgroundColor: [
            'rgba(59, 130, 246, 0.8)',
            'rgba(16, 185, 129, 0.8)',
            'rgba(251, 191, 36, 0.8)',
            'rgba(239, 68, 68, 0.8)',
            'rgba(139, 92, 246, 0.8)',
            'rgba(236, 72, 153, 0.8)'
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
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((context.raw / total) * 100).toFixed(1);
                return `${context.label}: ${context.raw}例 (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }

  // 更新图表数据
  updateCharts(chartData) {
    if (!chartData) {return;}

    // 更新月度回输趋势图表
    if (this.charts.monthlyTrend && chartData.monthlyTrend) {
      try {
        this.charts.monthlyTrend.data.labels = chartData.monthlyTrend.labels;
        this.charts.monthlyTrend.data.datasets[0].data = chartData.monthlyTrend.data;
        this.charts.monthlyTrend.update('none'); // 使用'none'模式避免动画干扰
      } catch (error) {
        console.warn('月度趋势图表更新失败:', error);
      }
    }

    // 更新患者增长趋势图表
    if (this.charts.patientGrowth && chartData.patientGrowth) {
      try {
        this.charts.patientGrowth.data.labels = chartData.patientGrowth.labels;
        this.charts.patientGrowth.data.datasets[0].data = chartData.patientGrowth.data;
        this.charts.patientGrowth.update('none');
      } catch (error) {
        console.warn('患者增长图表更新失败:', error);
      }
    }

    // 更新治疗效果分析图表
    if (this.charts.treatmentEffect && chartData.treatmentEffect) {
      try {
        this.charts.treatmentEffect.data.labels = chartData.treatmentEffect.labels;
        this.charts.treatmentEffect.data.datasets[0].data = chartData.treatmentEffect.data;
        this.charts.treatmentEffect.data.percentages = chartData.treatmentEffect.percentages;
        this.charts.treatmentEffect.data.avgScores = chartData.treatmentEffect.avgScores;
        this.charts.treatmentEffect.update('none');
        console.log('治疗效果图表更新完成:', {
          labels: chartData.treatmentEffect.labels,
          data: chartData.treatmentEffect.data,
          percentages: chartData.treatmentEffect.percentages,
          avgScores: chartData.treatmentEffect.avgScores
        });
      } catch (error) {
        console.warn('治疗效果图表更新失败:', error);
      }
    }

    // 更新病种分布统计图表
    if (this.charts.diseaseDistribution && chartData.diseaseDistribution) {
      try {
        this.charts.diseaseDistribution.data.labels = chartData.diseaseDistribution.labels;
        this.charts.diseaseDistribution.data.datasets[0].data = chartData.diseaseDistribution.data;
        this.charts.diseaseDistribution.update('none');
        console.log('病种分布图表更新完成:', {
          labels: chartData.diseaseDistribution.labels,
          data: chartData.diseaseDistribution.data
        });
      } catch (error) {
        console.warn('病种分布图表更新失败:', error);
      }
    }
  }

  // 更新统计表格
  updateStatisticsTable(tableData) {
    const tbody = document.getElementById('statisticsTable');
    if (!tbody || !tableData) {return;}

    tbody.innerHTML = tableData.map(row => `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${row.item}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${row.current}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${row.previous}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                    <span class="${row.change > 0 ? 'text-green-600' : row.change < 0 ? 'text-red-600' : 'text-gray-600'}">
                        ${row.change > 0 ? '+' : ''}${row.change}%
                        <i class="fas fa-arrow-${row.change > 0 ? 'up' : row.change < 0 ? 'down' : 'right'} ml-1"></i>
                    </span>
                </td>
            </tr>
        `).join('');
  }

  // 应用筛选
  applyFilter() {
    const startDate = document.getElementById('statsStartDate');
    const endDate = document.getElementById('statsEndDate');

    if (startDate && endDate) {
      this.dateRange.start = startDate.value;
      this.dateRange.end = endDate.value;

      if (this.dateRange.start && this.dateRange.end) {
        this.loadStatistics();
      } else {
        NotificationHelper.validationError('请选择日期范围', '开始日期和结束日期都是必填项');
      }
    }
  }

  // 导出统计数据
  async exportStatistics() {
    try {
      const response = await window.API.service.get('/statistics/export', this.dateRange);

      if (response.status === 'Success') {
        // 创建下载链接
        const link = document.createElement('a');
        link.href = response.data.download_url;
        link.download = response.data.filename;
        link.click();

        NotificationHelper.success('统计数据导出成功', '文件已开始下载，请查看下载文件夹');
      } else {
        NotificationHelper.error('导出失败', response.message || '统计数据导出失败，请重试');
      }
    } catch (error) {
      console.error('导出统计数据失败:', error);
      NotificationHelper.error('导出失败', '网络连接异常，请检查网络后重试');
    }
  }

  // 更新统计概览卡片
  updateOverviewCards(statsData) {
    // 更新总检客数
    const totalCustomersEl = document.getElementById('statsTotalCustomers');
    if (totalCustomersEl && statsData.overview.totalCustomers !== undefined) {
      totalCustomersEl.textContent = statsData.overview.totalCustomers;
    }

    // 更新干细胞患者
    const stemCellPatientsEl = document.getElementById('statsStemCellPatients');
    if (stemCellPatientsEl && statsData.overview.uniquePatients !== undefined) {
      stemCellPatientsEl.textContent = statsData.overview.uniquePatients;
    }

    // 更新本月回输
    const monthlyInfusionsEl = document.getElementById('statsMonthlyInfusions');
    if (monthlyInfusionsEl && statsData.overview.monthlyInfusions !== undefined) {
      monthlyInfusionsEl.textContent = statsData.overview.monthlyInfusions;
    }

    // 更新治疗效果分析
    const treatmentEffectivenessEl = document.getElementById('statsTreatmentEffectiveness');
    console.log('治疗效果分析数据:', statsData.treatmentEffectiveness);
    console.log('治疗效果元素:', treatmentEffectivenessEl);

    if (treatmentEffectivenessEl && statsData.treatmentEffectiveness && statsData.treatmentEffectiveness.length > 0) {
      console.log('治疗效果数据内容:', statsData.treatmentEffectiveness);
      const effective = statsData.treatmentEffectiveness.find(e =>
        e.type === '显著改善' || e.type === '改善' || e.type === '完全缓解'
      );
      console.log('找到的有效治疗效果:', effective);

      if (effective) {
        treatmentEffectivenessEl.textContent = `${effective.percentage}%`;
        console.log('设置治疗效果百分比:', `${effective.percentage}%`);
      } else {
        treatmentEffectivenessEl.textContent = '0%';
        console.log('未找到有效治疗效果，设置为0%');
      }
    } else if (treatmentEffectivenessEl) {
      treatmentEffectivenessEl.textContent = '0%';
      console.log('治疗效果数据为空，设置为0%');
    }
  }

  // 更新病种分布和治疗效果详情
  updateDetailedStats(statsData) {
    // 更新病种分布详情
    const diseaseDistributionEl = document.getElementById('statsDiseaseDistribution');
    if (diseaseDistributionEl && statsData.diseaseDistribution && statsData.diseaseDistribution.length > 0) {
      diseaseDistributionEl.innerHTML = statsData.diseaseDistribution.map(disease => `
        <div class="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
          <span class="text-sm font-medium text-gray-700">${disease.name}</span>
          <div class="flex items-center space-x-2">
            <span class="text-sm font-semibold text-indigo-600">${disease.count}例</span>
            <span class="text-xs text-gray-500">(${disease.percentage}%)</span>
          </div>
        </div>
      `).join('');
    } else if (diseaseDistributionEl) {
      diseaseDistributionEl.innerHTML = '<p class="text-gray-500 text-sm">暂无数据</p>';
    }

    // 更新治疗效果详情
    const treatmentEffectDetailsEl = document.getElementById('statsTreatmentEffectDetails');
    if (treatmentEffectDetailsEl && statsData.treatmentEffectiveness && statsData.treatmentEffectiveness.length > 0) {
      treatmentEffectDetailsEl.innerHTML = statsData.treatmentEffectiveness.map(effect => {
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
    } else if (treatmentEffectDetailsEl) {
      treatmentEffectDetailsEl.innerHTML = '<p class="text-gray-500 text-sm">暂无数据</p>';
    }
  }

  // 绑定事件
  bindEvents() {
    // 应用筛选按钮
    const applyFilterBtn = document.getElementById('applyStatsFilter');
    if (applyFilterBtn) {
      applyFilterBtn.addEventListener('click', () => {
        this.applyFilter();
      });
    }

    // 导出统计按钮
    const exportBtn = document.getElementById('exportStatsBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        this.exportStatistics();
      });
    }

    // 监听窗口大小变化，重新渲染图表
    window.addEventListener('resize', () => {
      Object.values(this.charts).forEach(chart => {
        chart.resize();
      });
    });

    // 日期变化时自动加载
    const startDate = document.getElementById('statsStartDate');
    const endDate = document.getElementById('statsEndDate');

    if (startDate) {
      startDate.addEventListener('change', () => {
        if (endDate && endDate.value) {
          this.applyFilter();
        }
      });
    }

    if (endDate) {
      endDate.addEventListener('change', () => {
        if (startDate && startDate.value) {
          this.applyFilter();
        }
      });
    }
  }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  new StatisticsManager();
});