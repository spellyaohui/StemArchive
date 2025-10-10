/**
 * 报告查看页面脚本
 * 负责生成和查看各类医疗报告
 */

class ReportsManager {
  constructor() {
    this.reports = [];
    this.selectedReportType = 'comparison';
    this.selectedCustomer = null;
    this.customerSearchTimeout = null;
    this.availableExams = [];
    this.selectedComparisonExams = [];
    this.maxComparisonSelections = 3;
    this.isGeneratingReport = false; // 防止重复提交
    this.eventsBound = false; // 防止重复绑定事件监听器
  }

  init() {
    this.bindEvents();
    // 异步加载关键数据，不阻塞页面渲染
    setTimeout(() => {
      this.loadReports();
    }, 100);
  }

  // 搜索检客
  async searchCustomers(query) {
    if (!query || query.length < 2) {
      this.hideCustomerSearchResults();
      return;
    }

    try {
      const loadingNotification = NotificationHelper.loading('正在搜索检客...');

      // 获取所有检客数据，然后在客户端进行搜索过滤
      const response = await window.API.customer.getAll();

      if (loadingNotification) {
        loadingNotification.remove();
      }

      if (response.status === 'Success') {
        // 客户端搜索过滤
        const filteredCustomers = response.data.filter(customer => {
          const searchTerm = query.toLowerCase();
          return customer.Name.toLowerCase().includes(searchTerm) ||
                           customer.IdentityCard.includes(searchTerm) ||
                           (customer.Phone && customer.Phone.includes(searchTerm));
        });

        this.showCustomerSearchResults(filteredCustomers);
      } else {
        NotificationHelper.error('获取检客数据失败');
      }
    } catch (error) {
      console.error('搜索检客失败:', error);
      NotificationHelper.error('搜索检客失败');
    }
  }

  // 显示搜索结果
  showCustomerSearchResults(customers) {
    const resultsContainer = document.getElementById('customerSearchResults');
    if (!resultsContainer) {return;}

    if (customers.length === 0) {
      resultsContainer.innerHTML = `
                <div class="p-3 text-gray-500 text-center">
                    <i class="fas fa-search mr-2"></i>未找到符合条件的检客
                </div>
            `;
      resultsContainer.classList.remove('hidden');
      return;
    }

    resultsContainer.innerHTML = customers.map(customer => {
      // 创建唯一的容器ID
      const containerId = `customer-${customer.ID}`;

      // 安全处理身份证号
      const idCard = customer.IdentityCard || '';
      const safeIdCard = idCard.replace(/"/g, '&quot;').replace(/'/g, '&#39;');

      return `
            <div class="customer-result-item p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
                 id="${containerId}"
                 data-customer-id="${customer.ID}"
                 data-customer-name="${(customer.Name || '').replace(/"/g, '&quot;')}"
                 data-customer-idcard="${safeIdCard}">
                <div class="flex items-center">
                    <div class="mr-3">
                        <div class="w-4 h-4 border-2 border-gray-300 rounded-full radio-custom ${customer.ID === this.selectedCustomer?.id ? 'bg-blue-600 border-blue-600' : ''}"></div>
                    </div>
                    <div class="flex-1">
                        <div class="font-medium text-gray-900">${customer.Name}</div>
                        <div class="text-sm text-gray-600">身份证号: ${customer.IdentityCard}</div>
                        ${customer.Gender ? `<div class="text-xs text-gray-500">性别: ${customer.Gender}</div>` : ''}
                        ${customer.Phone ? `<div class="text-xs text-gray-500">电话: ${customer.Phone}</div>` : ''}
                    </div>
                    <div class="text-blue-600 opacity-0 hover:opacity-100 transition-opacity">
                        <i class="fas fa-check-circle"></i>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // 添加点击事件监听器
    resultsContainer.querySelectorAll('.customer-result-item').forEach(item => {
      item.addEventListener('click', (e) => {
        // 直接从DOM元素中读取文本内容，避免data属性问题
        const nameElement = item.querySelector('.font-medium');
        const idCardElement = item.querySelector('.text-sm');

        const customerId = item.dataset.customerId;
        const customerName = nameElement ? nameElement.textContent.trim() : '';

        // 从身份证号文本中提取号码（去掉"身份证号: "前缀）
        let customerIdCard = '';
        if (idCardElement) {
          const idCardText = idCardElement.textContent.trim();
          if (idCardText.includes('身份证号:')) {
            customerIdCard = idCardText.replace('身份证号:', '').trim();
          }
        }

        console.log('点击检客:', { customerId, customerName, customerIdCard });
        this.selectCustomer(customerId, customerName, customerIdCard);
      });
    });

    resultsContainer.classList.remove('hidden');
  }

  // 隐藏搜索结果
  hideCustomerSearchResults() {
    const resultsContainer = document.getElementById('customerSearchResults');
    if (resultsContainer) {
      resultsContainer.classList.add('hidden');
      resultsContainer.innerHTML = '';
    }
  }

  // 选择检客
  selectCustomer(id, name, idCard) {
    console.log('selectCustomer 被调用:', { id, name, idCard });

    // 确保id是字符串类型
    const customerId = typeof id === 'string' ? id : String(id);
    const customerName = name || '未知姓名';
    const customerIdCard = idCard || '未知身份证号';

    this.selectedCustomer = {
      id: customerId,
      name: customerName,
      idCard: customerIdCard
    };

    console.log('设置后的 selectedCustomer:', this.selectedCustomer);

    // 更新UI显示选中信息
    const selectedInfo = document.getElementById('selectedCustomerInfo');
    const selectedName = document.getElementById('selectedCustomerName');
    const selectedIdCard = document.getElementById('selectedCustomerIdCard');
    const searchInput = document.getElementById('customerSearchInput');

    if (selectedName) {
      selectedName.textContent = customerName;
      console.log('设置姓名:', customerName);
    }

    if (selectedIdCard) {
      selectedIdCard.textContent = `(${customerIdCard})`;
      console.log('设置身份证号:', customerIdCard);
    }

    if (selectedInfo) {
      selectedInfo.classList.remove('hidden');
    }

    if (searchInput) {
      searchInput.value = '';
    }

    this.hideCustomerSearchResults();
    NotificationHelper.success(`已选择检客: ${customerName}`);

    // 选择客户后重新加载报告列表
    this.loadReports();
  }

  // 清除选中的检客
  clearSelectedCustomer() {
    this.selectedCustomer = null;
    const selectedInfo = document.getElementById('selectedCustomerInfo');
    const searchInput = document.getElementById('customerSearchInput');

    if (selectedInfo) {selectedInfo.classList.add('hidden');}
    if (searchInput) {searchInput.value = '';}
    this.hideCustomerSearchResults();
  }

  // 加载历史报告
  async loadReports() {
    try {
      // 加载传统报告
      const traditionalResult = await window.API.report.getAll();

      // 检查当前激活的选项卡 - 使用selectedReportType而不是class
      const activeTabName = this.selectedReportType || 'comparison';
      console.log('loadReports - 当前选项卡:', activeTabName, '选择的客户:', this.selectedCustomer);

      // 只有选择了客户才加载健康评估和对比报告
      let healthAssessmentResponse = null;
      let comparisonResponse = null;

      if (this.selectedCustomer && this.selectedCustomer.id && this.selectedCustomer.id.trim() !== '') {
        // 加载健康评估报告
        healthAssessmentResponse = await window.API.service.get(`/reports/health-assessment/customer/${this.selectedCustomer.id}`);
        console.log('健康评估API响应:', healthAssessmentResponse);

        // 加载对比报告
        comparisonResponse = await window.API.service.get(`/reports/comparison/customer/${this.selectedCustomer.id}`);
        console.log('对比报告API响应:', comparisonResponse);
      }

      const reportsData = [];

      // 处理传统报告（在非对比报告模块显示）
      if (activeTabName !== 'comparison' && traditionalResult.status === 'Success' && traditionalResult.data) {
        traditionalResult.data.forEach(report => {
          reportsData.push({
            id: report.ID,
            name: report.ReportName,
            title: report.ReportName,
            type: report.ReportType,
            date: report.ReportDate,
            created_date: report.ReportDate,
            customer_name: report.CustomerName,
            size: report.FileSize || 'N/A',
            content: report.ReportContent || '暂无内容',
            summary: report.Summary || '',
            aiAnalysis: report.AIAnalysis || ''
          });
        });
      }

      // 处理健康评估报告（在非对比报告模块显示）
      if (activeTabName !== 'comparison' && healthAssessmentResponse && healthAssessmentResponse.status === 'Success' && healthAssessmentResponse.data) {
        healthAssessmentResponse.data.forEach(report => {
          reportsData.push({
            id: report.ID,
            name: `${report.CustomerName}-健康评估报告`,
            title: `${report.CustomerName}-健康评估报告`,
            type: 'health_assessment',
            date: report.CreatedAt,
            created_date: report.CreatedAt,
            customer_name: report.CustomerName,
            size: 'N/A',
            content: report.MarkdownContent || '暂无内容',
            summary: 'AI健康评估报告',
            aiAnalysis: report.AIAnalysis || ''
          });
        });
      }

      // 处理对比报告（在对比报告模块显示）
      if (activeTabName === 'comparison' && comparisonResponse && comparisonResponse.status === 'Success' && comparisonResponse.data) {
        comparisonResponse.data.forEach(report => {
          const examCount = report.MedicalExamIDs ? report.MedicalExamIDs.split(',').length : 0;
          reportsData.push({
            id: report.ID,
            name: `${report.CustomerName}-健康对比分析报告(${examCount}次对比)`,
            title: `${report.CustomerName}-健康对比分析报告`,
            type: 'comparison_report',
            date: report.CreatedAt,
            created_date: report.CreatedAt,
            customer_name: report.CustomerName,
            size: 'N/A',
            content: report.MarkdownContent || '暂无内容',
            summary: `AI健康对比分析报告，包含${examCount}次体检对比`,
            aiAnalysis: report.AIAnalysis || ''
          });
        });
      }

      // 按创建时间排序
      reportsData.sort((a, b) => new Date(b.created_date || b.date) - new Date(a.created_date || a.date));

      this.reports = reportsData;
      this.renderReportsList();
    } catch (error) {
      console.error('加载报告列表失败:', error);
      NotificationHelper.error('加载报告列表失败');
    }
  }

  // 渲染报告列表
  renderReportsList() {
    const container = document.getElementById('reportsList');
    if (!container) {return;}

    if (this.reports.length === 0) {
      container.innerHTML = `
                <div class="text-center text-gray-500 py-8">
                    <i class="fas fa-file-alt text-3xl mb-2"></i>
                    <p>暂无历史报告</p>
                </div>
            `;
      return;
    }

    container.innerHTML = this.reports.map(report => `
            <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div class="flex items-center space-x-4">
                    <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <i class="fas ${this.getReportIcon(report.type)} text-blue-600"></i>
                    </div>
                    <div>
                        <h4 class="font-medium text-gray-900">${report.name || report.title || '未命名报告'}</h4>
                        <div class="flex items-center space-x-4 text-sm text-gray-600">
                            <span><i class="fas fa-user mr-1"></i>${report.customer_name || '未知客户'}</span>
                            <span><i class="fas fa-calendar mr-1"></i>${this.formatDateTime(report.created_date || report.date || '未知日期')}</span>
                            <span><i class="fas fa-tag mr-1"></i>${this.getReportTypeText(report.type)}</span>
                        </div>
                    </div>
                </div>
                <div class="flex space-x-2">
                    <button onclick="reportsManager.downloadOriginalMarkdown('${report.id}')"
                            class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                        <i class="fas fa-file-alt mr-1"></i>下载原始文档
                    </button>
                    <button onclick="reportsManager.convertToPdf('${report.id}')"
                            class="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700">
                        <i class="fas fa-file-pdf mr-1"></i>转换PDF
                    </button>
                    <button onclick="reportsManager.deleteReport('${report.id}')"
                            class="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700">
                        <i class="fas fa-trash mr-1"></i>删除
                    </button>
                </div>
            </div>
        `).join('');
  }

  // 获取报告图标
  getReportIcon(type) {
    const icons = {
      'comparison': 'fa-file-medical',
      'comparison_report': 'fa-chart-line',
      'treatment': 'fa-chart-line',
      'health': 'fa-file-alt',
      'health_assessment': 'fa-heartbeat',
      'single': 'fa-file-download'
    };
    return icons[type] || 'fa-file';
  }

  // 获取报告类型文本
  getReportTypeText(type) {
    const texts = {
      'comparison': '对比报告',
      'comparison_report': '健康对比分析',
      'treatment': '治疗总结',
      'health': '健康评估',
      'health_assessment': 'AI健康评估',
      'single': '单次报告'
    };
    return texts[type] || '未知类型';
  }

  // 格式化日期时间 - 将UTC时间转换为本地时间
  formatDateTime(dateString) {
    if (!dateString || dateString === '未知日期') {
      return '未知日期';
    }

    try {
      // 处理ISO时间字符串
      let date;
      if (typeof dateString === 'string') {
        // 如果是UTC时间字符串（以Z结尾），转换为Date对象
        date = new Date(dateString);
      } else if (dateString instanceof Date) {
        date = dateString;
      } else {
        return '未知日期';
      }

      // 检查日期是否有效
      if (isNaN(date.getTime())) {
        return '未知日期';
      }

      // 转换为本地时间
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');

      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    } catch (error) {
      console.error('日期格式化错误:', error);
      return '未知日期';
    }
  }

  // 查看报告
  async viewReport(id) {
    try {
      // 先从本地数据中查找
      const report = this.reports.find(r => r.id === id);
      if (report) {
        // 根据报告类型调用不同的查看方法
        if (report.type === 'health_assessment') {
          await this.viewHealthAssessmentReport(id);
        } else if (report.type === 'comparison_report') {
          await this.viewComparisonReport(id);
        } else {
          this.showReportModal(report);
        }
      } else {
        NotificationHelper.error('报告不存在');
      }
    } catch (error) {
      console.error('查看报告失败:', error);
      NotificationHelper.error('查看报告失败');
    }
  }

  // 下载报告
  async downloadReport(id) {
    try {
      // 模拟下载功能
      const report = this.reports.find(r => r.id === id);
      if (report) {
        // 创建一个文本文件作为示例下载
        const content = `报告名称: ${report.name}\n客户: ${report.customer_name}\n生成日期: ${this.formatDateTime(report.created_date)}\n\n${report.content}`;
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `${report.name}.txt`;
        link.click();

        window.URL.revokeObjectURL(url);
        showNotification('报告下载成功', 'success');
      } else {
        showNotification('报告不存在', 'error');
      }
    } catch (error) {
      console.error('下载报告失败:', error);
      showNotification('下载报告失败', 'error');
    }
  }

  // 删除报告
  async deleteReport(id) {
    NotificationHelper.confirm(
      '确定要删除这个报告吗？',
      async () => {
        try {
          // 先从本地数据中查找报告类型
          const report = this.reports.find(r => r.id === id);
          if (!report) {
            NotificationHelper.error('报告不存在');
            return;
          }

          let response;

          // 根据报告类型调用不同的删除API
          if (report.type === 'health_assessment') {
            response = await window.API.service.delete(`/reports/health-assessment/${id}`);
          } else if (report.type === 'comparison_report') {
            response = await window.API.service.delete(`/reports/comparison/${id}`);
          } else {
            // 传统报告使用通用删除API
            response = await window.API.service.delete(`/reports/${id}`);
          }

          if (response.status === 'Success') {
            NotificationHelper.success('报告删除成功');
            this.loadReports();
          } else {
            NotificationHelper.error(response.message || '删除失败');
          }
        } catch (error) {
          console.error('删除报告失败:', error);
          NotificationHelper.error('删除报告失败');
        }
      }
    );
  }

  // 下载原始Markdown文档
  async downloadOriginalMarkdown(id) {
    try {
      const report = this.reports.find(r => r.id === id);
      console.log('下载Markdown - 报告信息:', report);
      if (!report) {
        NotificationHelper.error('报告不存在');
        return;
      }

      let markdownContent = '';
      let filename = '';

      // 根据报告类型获取AIAnalysis字段内容
      if (report.type === 'health_assessment') {
        // 调用健康评估API获取完整数据
        console.log('下载Markdown - 调用健康评估API');
        const response = await window.API.service.get(`/reports/health-assessment/${id}`);
        console.log('下载Markdown - 健康评估API响应:', response);
        if (response.status === 'Success' && response.data.AIAnalysis) {
          markdownContent = response.data.AIAnalysis;
          filename = `${report.customer_name}-健康评估报告-${new Date(report.date).toISOString().split('T')[0]}.md`;
        }
      } else if (report.type === 'comparison_report') {
        // 调用对比报告API获取完整数据
        console.log('下载Markdown - 调用对比报告API');
        const response = await window.API.service.get(`/reports/comparison/${id}`);
        console.log('下载Markdown - 对比报告API响应:', response);
        if (response.status === 'Success' && response.data.AIAnalysis) {
          markdownContent = response.data.AIAnalysis;
          filename = `${report.customer_name}-健康对比分析报告-${new Date(report.date).toISOString().split('T')[0]}.md`;
        }
      }

      if (!markdownContent) {
        NotificationHelper.error('无法获取报告内容');
        return;
      }

      // 创建并下载Markdown文件
      const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      NotificationHelper.success('原始文档下载成功');
    } catch (error) {
      console.error('下载原始文档失败:', error);
      NotificationHelper.error('下载原始文档失败');
    }
  }

  // 转换为PDF并下载
  async convertToPdf(id) {
    try {
      const report = this.reports.find(r => r.id === id);
      console.log('转换PDF - 报告信息:', report);
      if (!report) {
        NotificationHelper.error('报告不存在');
        return;
      }

      const loadingNotification = NotificationHelper.loading('正在转换PDF...');

      let response;

      // 根据报告类型调用不同的转换API
      if (report.type === 'health_assessment') {
        console.log('转换PDF - 调用健康评估API');
        response = await window.API.service.post(`/reports/health-assessment/${id}/convert-pdf`);
        console.log('转换PDF - 健康评估API响应:', response);
      } else if (report.type === 'comparison_report') {
        console.log('转换PDF - 调用对比报告API');
        response = await window.API.service.post(`/reports/comparison/${id}/convert-pdf`);
        console.log('转换PDF - 对比报告API响应:', response);
      }

      if (loadingNotification) {
        loadingNotification.remove();
      }

      if (response.status === 'Success' && response.data.pdfData) {
        // 解码Base64 PDF数据
        const base64Data = response.data.pdfData;
        const binaryData = atob(base64Data);
        const bytes = new Uint8Array(binaryData.length);
        for (let i = 0; i < binaryData.length; i++) {
          bytes[i] = binaryData.charCodeAt(i);
        }

        // 创建PDF Blob并下载
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${report.customer_name}-${report.name}-${new Date(report.date).toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        NotificationHelper.success('PDF转换并下载成功');
      } else {
        NotificationHelper.error(response.message || 'PDF转换失败');
      }
    } catch (error) {
      console.error('转换PDF失败:', error);
      NotificationHelper.error('转换PDF失败，请稍后重试');
    }
  }

  // 显示报告模态框
  showReportModal(report) {
    const modalContainer = document.getElementById('modalContainer');
    if (!modalContainer) {return;}

    modalContainer.innerHTML = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                    <div class="p-6 border-b border-gray-200">
                        <div class="flex justify-between items-center">
                            <h3 class="text-lg font-medium text-gray-900">${report.name || report.title || '未命名报告'}</h3>
                            <button onclick="reportsManager.closeModal()" class="text-gray-400 hover:text-gray-600">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    <div class="p-6">
                        <!-- 报告信息 -->
                        <div class="bg-gray-50 rounded-lg p-4 mb-6">
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                    <span class="text-gray-600">检客:</span>
                                    <span class="font-medium ml-2">${report.customer_name || '未知客户'}</span>
                                </div>
                                <div>
                                    <span class="text-gray-600">类型:</span>
                                    <span class="font-medium ml-2">${this.getReportTypeText(report.type)}</span>
                                </div>
                                <div>
                                    <span class="text-gray-600">生成时间:</span>
                                    <span class="font-medium ml-2">${this.formatDateTime(report.created_date || report.date || '未知日期')}</span>
                                </div>
                            </div>
                        </div>

                        <!-- 报告内容 -->
                        <div class="prose max-w-none">
                            <div class="whitespace-pre-wrap">${report.content}</div>
                        </div>

                        <!-- 操作按钮 -->
                        <div class="flex justify-end space-x-3 mt-6">
                            <button onclick="reportsManager.downloadReport('${report.id}')"
                                    class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                                <i class="fas fa-download mr-2"></i>下载报告
                            </button>
                            <button onclick="reportsManager.closeModal()"
                                    class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                                关闭
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
  }

  // 生成报告
  async generateReport() {
    const reportType = document.getElementById('reportTypeSelect').value;

    // 基础验证
    if (!this.selectedCustomer || !reportType) {
      NotificationHelper.error('请选择检客和报告类型');
      return;
    }

    const customerId = this.selectedCustomer.id;

    try {
      // 处理对比报告
      if (reportType === 'comparison') {
        await this.generateComparisonReport();
        return;
      }

      // 处理健康评估报告
      if (reportType === 'health') {
        await this.generateHealthAssessment();
        return;
      }

      // 处理单次报告
      if (reportType === 'single') {
        await this.generateSingleReport();
        return;
      }

      // 处理其他类型报告
      const startDate = document.getElementById('dateRangeStart').value;
      const endDate = document.getElementById('dateRangeEnd').value;

      if (!startDate || !endDate) {
        NotificationHelper.error('请选择日期范围');
        return;
      }

      // 构建报告数据
      const customerName = this.selectedCustomer.name;
      const reportName = `${customerName}-${this.getReportTypeText(reportType)}`;
      const dataRange = `${startDate} 至 ${endDate}`;

      const generateData = {
        customerId: customerId,
        reportName: reportName,
        reportType: reportType,
        reportDate: new Date().toISOString().split('T')[0],
        dataRange: dataRange,
        reportContent: this.generateReportContent(reportType, customerName),
        summary: this.generateReportSummary(reportType)
      };

      const response = await window.API.service.post('/reports/generate', generateData);

      if (response.status === 'Success') {
        NotificationHelper.success('报告生成成功');
        this.loadReports();
        this.viewReport(response.data.ID);
      } else {
        NotificationHelper.error(response.message || '生成失败');
      }
    } catch (error) {
      console.error('生成报告失败:', error);
      NotificationHelper.error('生成报告失败');
    }
  }

  // 生成健康评估
  async generateHealthAssessment() {
    if (!this.selectedCustomer) {
      NotificationHelper.error('请选择检客');
      return;
    }

    const customerId = this.selectedCustomer.id;
    const medicalExamId = document.getElementById('healthExamSelect').value;

    if (!medicalExamId) {
      NotificationHelper.error('请选择体检报告');
      return;
    }

    let loadingNotification = null;
    try {
      // 检查是否已存在健康评估
      const checkResponse = await window.API.service.get(`/reports/health-assessment/check?medicalExamId=${medicalExamId}`);

      if (checkResponse.status === 'Success' && checkResponse.hasReport) {
        // 已存在健康评估，直接显示
        NotificationHelper.success('健康评估已存在');
        this.viewHealthAssessmentReport(checkResponse.report.ID);
        return;
      }

      // 生成新的健康评估
      loadingNotification = NotificationHelper.loading('正在生成健康评估...');

      const generateData = {
        customerId: customerId,
        medicalExamId: medicalExamId
      };

      const response = await window.API.service.post('/reports/health-assessment/generate', generateData);

      if (loadingNotification) {
        loadingNotification.remove();
      }

      if (response.status === 'Success') {
        if (response.data.status === 'processing') {
          NotificationHelper.info('健康评估正在生成中，请稍后查看结果');
          // 开始轮询状态
          this.pollHealthAssessmentStatus(response.data.reportId);
        } else if (response.data.status === 'completed') {
          NotificationHelper.success('健康评估生成成功');
          this.viewHealthAssessmentReport(response.data.reportId);
        }
      } else {
        NotificationHelper.error(response.message || '生成健康评估失败');
      }
    } catch (error) {
      console.error('生成健康评估失败:', error);
      if (loadingNotification) {
        loadingNotification.remove();
      }
      NotificationHelper.error('生成健康评估失败');
    }
  }

  // 轮询健康评估状态
  pollHealthAssessmentStatus(reportId) {
    let statusNotification = NotificationHelper.processing('健康评估正在生成中，请稍候...', '处理中');

    const pollInterval = setInterval(async () => {
      try {
        const response = await window.API.service.get(`/reports/health-assessment/${reportId}`);

        if (response.status === 'Success' && response.data) {
          const report = response.data;

          if (report.GenerationStatus === 'completed') {
            clearInterval(pollInterval);
            NotificationHelper.clearProcessing();
            NotificationHelper.success('健康评估生成完成', '生成成功');
            this.viewHealthAssessmentReport(reportId);
          } else if (report.GenerationStatus === 'failed') {
            clearInterval(pollInterval);
            NotificationHelper.clearProcessing();
            NotificationHelper.error('健康评估生成失败，请重试', '生成失败');
          }
          // 如果还是processing状态，继续轮询
        }
      } catch (error) {
        clearInterval(pollInterval);
        NotificationHelper.clearProcessing();
        console.error('轮询健康评估状态失败:', error);
        NotificationHelper.error('轮询状态失败，请刷新页面查看结果', '轮询错误');
      }
    }, 3000); // 每3秒轮询一次

    // 60秒后自动停止轮询
    setTimeout(() => {
      clearInterval(pollInterval);
      NotificationHelper.clearProcessing();
      NotificationHelper.warning('轮询超时，请刷新页面查看生成结果', '处理超时');
    }, 60000);
  }

  // 查看健康评估报告
  async viewHealthAssessmentReport(reportId) {
    try {
      const response = await window.API.service.get(`/reports/health-assessment/${reportId}`);

      if (response.status === 'Success' && response.data) {
        const report = response.data;
        this.showHealthAssessmentModal(report);
      } else {
        NotificationHelper.error('获取健康评估报告失败');
      }
    } catch (error) {
      console.error('查看健康评估报告失败:', error);
      NotificationHelper.error('查看健康评估报告失败');
    }
  }

  // 显示健康评估模态框
  showHealthAssessmentModal(report) {
    const modalContainer = document.getElementById('modalContainer');
    if (!modalContainer) {return;}

    // 格式化处理时间
    const formatProcessingTime = (seconds) => {
      if (!seconds) {return '未知';}
      if (seconds < 60) {return `${seconds}秒`;}
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}分${remainingSeconds}秒`;
    };

    // 获取状态显示
    const getStatusDisplay = (status) => {
      switch (status) {
      case 'completed': return { text: '已完成', color: 'text-green-600 bg-green-50', icon: 'fa-check-circle' };
      case 'processing': return { text: '生成中', color: 'text-blue-600 bg-blue-50', icon: 'fa-spinner fa-spin' };
      case 'failed': return { text: '生成失败', color: 'text-red-600 bg-red-50', icon: 'fa-exclamation-triangle' };
      default: return { text: '未知状态', color: 'text-gray-600 bg-gray-50', icon: 'fa-question-circle' };
      }
    };

    const statusInfo = getStatusDisplay(report.GenerationStatus);

    modalContainer.innerHTML = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div class="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                    <!-- 头部 -->
                    <div class="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
                        <div class="flex justify-between items-center">
                            <div class="flex items-center space-x-3">
                                <i class="fas fa-file-medical text-2xl text-blue-600"></i>
                                <div>
                                    <h3 class="text-xl font-semibold text-gray-900">${report.ReportName}</h3>
                                    <p class="text-sm text-gray-600 mt-1">AI健康评估报告</p>
                                </div>
                            </div>
                            <button onclick="reportsManager.closeModal()" class="text-gray-400 hover:text-gray-600 transition-colors">
                                <i class="fas fa-times text-xl"></i>
                            </button>
                        </div>
                    </div>

                    <!-- 内容区域 -->
                    <div class="flex-1 overflow-y-auto">
                        <div class="p-6">
                            <!-- 报告基本信息卡片 -->
                            <div class="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 mb-6 border border-blue-100">
                                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <!-- 报告ID -->
                                    <div class="text-center">
                                        <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">报告ID</div>
                                        <div class="font-mono text-sm font-semibold text-gray-800">${report.ID.substring(0, 8)}...</div>
                                    </div>

                                    <!-- 体检ID -->
                                    <div class="text-center">
                                        <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">体检ID</div>
                                        <div class="font-mono text-sm font-semibold text-gray-800">${report.MedicalExamID}</div>
                                    </div>

                                    <!-- 生成时间 -->
                                    <div class="text-center">
                                        <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">生成时间</div>
                                        <div class="text-sm font-semibold text-gray-800">${this.formatDateTime(report.CreatedAt)}</div>
                                    </div>

                                    <!-- 状态 -->
                                    <div class="text-center">
                                        <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">状态</div>
                                        <div class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}">
                                            <i class="fas ${statusInfo.icon} mr-1"></i>
                                            ${statusInfo.text}
                                        </div>
                                    </div>
                                </div>

                                <!-- 详细信息行 -->
                                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-blue-100">
                                    <div class="flex items-center">
                                        <i class="fas fa-user text-blue-500 mr-2"></i>
                                        <div>
                                            <div class="text-xs text-gray-500">检客姓名</div>
                                            <div class="font-medium text-gray-800">${report.CustomerName || '未知客户'}</div>
                                        </div>
                                    </div>

                                    <div class="flex items-center">
                                        <i class="fas fa-calendar-alt text-purple-500 mr-2"></i>
                                        <div>
                                            <div class="text-xs text-gray-500">体检日期</div>
                                            <div class="font-medium text-gray-800">${new Date(report.AssessmentDate).toLocaleDateString('zh-CN')}</div>
                                        </div>
                                    </div>

                                    <div class="flex items-center">
                                        <i class="fas fa-robot text-green-500 mr-2"></i>
                                        <div>
                                            <div class="text-xs text-gray-500">AI模型</div>
                                            <div class="font-medium text-gray-800">${report.APIModel || '未知'}</div>
                                        </div>
                                    </div>
                                </div>

                                <!-- 性能指标 -->
                                ${report.APIModel ? `
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-blue-100">
                                    <div class="flex items-center">
                                        <i class="fas fa-coins text-yellow-500 mr-2"></i>
                                        <div>
                                            <div class="text-xs text-gray-500">Token消耗</div>
                                            <div class="font-medium text-gray-800">${report.APITokenCount || '0'} tokens</div>
                                        </div>
                                    </div>

                                    <div class="flex items-center">
                                        <i class="fas fa-clock text-orange-500 mr-2"></i>
                                        <div>
                                            <div class="text-xs text-gray-500">处理时间</div>
                                            <div class="font-medium text-gray-800">${formatProcessingTime(report.ProcessingTime)}</div>
                                        </div>
                                    </div>
                                </div>
                                ` : ''}
                            </div>

                            <!-- 状态说明 -->
                            <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                <div class="bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-4 border-b border-gray-200">
                                    <h4 class="text-lg font-semibold text-gray-800 flex items-center">
                                        <i class="fas fa-info-circle text-blue-600 mr-2"></i>
                                        报告状态说明
                                    </h4>
                                </div>
                                <div class="p-6">
                                    ${report.GenerationStatus === 'completed' ? `
                                    <div class="text-center py-8">
                                        <i class="fas fa-check-circle text-5xl text-green-600 mb-4"></i>
                                        <p class="text-lg text-gray-700 mb-2">健康评估已完成</p>
                                        <p class="text-sm text-gray-500 mb-4">AI已成功分析您的体检数据并生成健康评估报告</p>
                                        <div class="bg-green-50 rounded-lg p-4 border border-green-100">
                                            <p class="text-sm text-green-700">
                                                <i class="fas fa-file-medical mr-2"></i>
                                                报告包含详细的健康状况分析、指标解读、异常提醒和健康建议
                                            </p>
                                        </div>
                                    </div>
                                    ` : report.GenerationStatus === 'processing' ? `
                                    <div class="text-center py-8">
                                        <i class="fas fa-spinner fa-spin text-5xl text-blue-600 mb-4"></i>
                                        <p class="text-lg text-gray-600 mb-2">健康评估正在生成中</p>
                                        <p class="text-sm text-gray-500">AI正在分析您的体检数据，请稍候...</p>
                                    </div>
                                    ` : report.GenerationStatus === 'failed' ? `
                                    <div class="text-center py-8">
                                        <i class="fas fa-exclamation-triangle text-5xl text-red-600 mb-4"></i>
                                        <p class="text-lg text-gray-600 mb-2">健康评估生成失败</p>
                                        <p class="text-sm text-gray-500">请检查网络连接或重新尝试生成</p>
                                    </div>
                                    ` : `
                                    <div class="text-center py-8">
                                        <i class="fas fa-question-circle text-5xl text-gray-400 mb-4"></i>
                                        <p class="text-lg text-gray-600 mb-2">报告状态未知</p>
                                        <p class="text-sm text-gray-500">请联系管理员获取帮助</p>
                                    </div>
                                    `}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 底部操作栏 -->
                    <div class="p-6 border-t border-gray-200 bg-gray-50">
                        <div class="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
                            <div class="text-sm text-gray-500">
                                <i class="fas fa-info-circle mr-1"></i>
                                报告生成时间：${this.formatDateTime(report.CreatedAt)}
                            </div>

                            <div class="flex flex-wrap gap-3">
                                ${report.GenerationStatus === 'completed' && report.MarkdownContent ? `
                                <!-- PDF下载按钮 -->
                                <button onclick="reportsManager.downloadPDF('${report.ID}')"
                                        class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                        title="转换为PDF格式并下载">
                                    <i class="fas fa-file-pdf mr-2"></i>
                                    转换PDF
                                </button>

                                <!-- Markdown下载按钮 -->
                                <button onclick="reportsManager.downloadMarkdown('${report.ID}')"
                                        class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                                    <i class="fas fa-file-alt mr-2"></i>
                                    下载原始文档
                                </button>
                                ` : ''}

                                <!-- 关闭按钮 -->
                                <button onclick="reportsManager.closeModal()"
                                        class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                                    <i class="fas fa-times mr-2"></i>
                                    关闭
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
  }

  // PDF下载功能
  async downloadPDF(reportId) {
    try {
      // 显示转换提示
      const loadingNotification = NotificationHelper.loading('正在转换为PDF格式，请稍候...');

      // 调用后端PDF转换API
      const response = await window.API.service.post(`/reports/health-assessment/${reportId}/convert-pdf`);

      // 关闭加载提示
      if (loadingNotification) {
        loadingNotification.remove();
      }

      if (response.status === 'Success' && response.data) {
        const { pdfData, fileName } = response.data;

        if (!pdfData) {
          NotificationHelper.error('PDF数据为空，转换失败');
          return;
        }

        // 将Base64数据转换为Blob
        const binaryString = atob(pdfData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);

        // 创建下载链接
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName || `健康评估报告_${reportId}.pdf`;

        // 兼容不同浏览器
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // 清理URL对象
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 100);

        NotificationHelper.success(`PDF文件已成功下载：${fileName}`);
      } else {
        NotificationHelper.error(response.message || 'PDF转换失败');
      }
    } catch (error) {
      console.error('PDF转换失败:', error);

      // 关闭加载提示
      if (loadingNotification) {
        loadingNotification.remove();
        loadingNotification = null;
      }

      // 根据错误类型显示不同的提示
      let errorMessage = 'PDF转换失败，请稍后重试';
      if (error.message.includes('503')) {
        errorMessage = 'PDF转换服务不可用，请稍后重试';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'PDF转换超时，请稍后重试';
      } else if (error.message.includes('network')) {
        errorMessage = '网络连接失败，请检查网络设置';
      }

      NotificationHelper.error(errorMessage);
    }
  }

  // 下载Markdown原始文档
  async downloadMarkdown(reportId) {
    try {
      // 显示下载提示
      NotificationHelper.info('正在准备下载健康评估报告...', '下载中');

      // 获取报告详情
      const response = await window.API.service.get(`/reports/health-assessment/${reportId}`);

      if (response.status === 'Success' && response.data) {
        const report = response.data;
        const content = report.AIAnalysis || '';
        const medicalExamId = report.MedicalExamId || reportId;

        if (!content) {
          NotificationHelper.error('报告内容为空，无法下载');
          return;
        }

        // 使用原始JS方式创建和下载文件
        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `${medicalExamId}.md`;

        // 兼容不同浏览器
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // 清理URL对象
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 100);

        NotificationHelper.success(`健康评估报告已成功下载：${medicalExamId}.md`);
      } else {
        NotificationHelper.error('获取报告数据失败');
      }
    } catch (error) {
      console.error('下载健康评估报告失败:', error);
      NotificationHelper.error('下载失败，请稍后重试');
    }
  }

  // 保留原有的下载方法以兼容旧代码
  async downloadHealthAssessment(reportId) {
    await this.downloadMarkdown(reportId);
  }

  // 生成单次报告
  async generateSingleReport() {
    if (!this.selectedCustomer) {
      NotificationHelper.error('请选择检客');
      return;
    }

    const customerId = this.selectedCustomer.id;
    const examId = document.getElementById('examSelect').value;

    if (!examId) {
      NotificationHelper.error('请选择体检报告');
      return;
    }

    let loadingNotification = null;
    try {
      loadingNotification = NotificationHelper.loading('正在生成单次报告...');

      // 获取体检详细信息
      const response = await window.API.service.get(`/reports/exam-detail?customerId=${customerId}&examId=${examId}`);

      if (response.status === 'Success') {
        const examData = response.data;

        // 生成Markdown报告
        const markdownContent = this.generateSingleReportMarkdown(examData);

        // 直接下载Markdown文件
        const customerName = examData.customerName || '未知检客';
        const fileName = `${customerName}-体检报告-${examId}.md`;

        this.downloadMarkdownFile(markdownContent, fileName);

        // 隐藏loading通知
        if (loadingNotification) {
          loadingNotification.remove();
        }

        NotificationHelper.success('单次报告下载成功');
      } else {
        // 隐藏loading通知
        if (loadingNotification) {
          loadingNotification.remove();
        }
        NotificationHelper.error(response.message || '获取体检详情失败');
      }
    } catch (error) {
      console.error('生成单次报告失败:', error);
      // 隐藏loading通知
      if (loadingNotification) {
        loadingNotification.remove();
      }
      NotificationHelper.error('生成单次报告失败');
    }
  }

  // 下载Markdown文件
  downloadMarkdownFile(content, fileName) {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    window.URL.revokeObjectURL(url);
  }

  // 保存单次报告到历史记录
  async saveSingleReportToHistory(examData, markdownContent) {
    try {
      const reportData = {
        customerId: examData.customerId,
        reportName: `${this.selectedCustomer.name}-单次体检报告`,
        reportType: 'single',
        reportDate: new Date().toISOString().split('T')[0],
        dataRange: examData.examDate,
        reportContent: markdownContent,
        summary: `体检ID: ${examData.medicalExamId} 的完整体检报告，包含${examData.departments?.length || 0}个科室的检查结果`
      };

      await window.API.service.post('/reports/generate', reportData);
      this.loadReports();
    } catch (error) {
      console.error('保存报告历史失败:', error);
    }
  }

  // 生成报告内容
  generateReportContent(type, customerName) {
    const currentDate = new Date().toLocaleDateString('zh-CN');

    switch (type) {
    case 'comparison':
      return `${customerName} 健康对比报告

生成日期: ${currentDate}

报告概述:
本报告对比分析了 ${customerName} 在指定时间段内的健康指标变化情况。

主要指标对比:
1. 生化指标对比分析
2. 免疫功能评估
3. 炎症因子水平变化
4. 生活质量改善情况

分析结论:
基于数据对比分析，患者的整体健康状况呈现积极变化趋势。

建议:
1. 继续保持当前治疗方案
2. 定期进行健康监测
3. 保持健康的生活方式

注: 本报告基于系统数据自动生成，仅供参考。`;

    case 'treatment':
      return `${customerName} 治疗总结报告

生成日期: ${currentDate}

治疗概述:
本报告总结了 ${customerName} 的干细胞治疗方案和效果。

治疗方案:
- 治疗周期: 根据实际情况填写
- 治疗方式: 干细胞治疗
- 治疗频率: 根据医嘱执行

治疗效果评估:
1. 症状改善情况
2. 生活质量提升
3. 并发症情况
4. 治疗耐受性

总结:
干细胞治疗对患者产生了积极的治疗效果，症状得到明显改善。

后续建议:
1. 继续巩固治疗
2. 定期复查评估
3. 遵医嘱进行后续治疗`;

    case 'health':
      return `${customerName} 健康评估报告

生成日期: ${currentDate}

健康评估概述:
本报告对 ${customerName} 的整体健康状况进行了全面评估。

体检结果:
1. 生命体征: 正常范围内
2. 生化指标: 基本正常
3. 免疫功能: 需要关注
4. 其他检查: 根据实际情况填写

健康状况评估:
整体健康状况良好，无明显异常发现。

健康建议:
1. 保持规律作息时间
2. 坚持适量运动锻炼
3. 保持均衡饮食习惯
4. 定期进行健康体检
5. 保持良好的心理状态

结论:
患者目前健康状况稳定，建议继续保持健康的生活方式。`;

    default:
      return '报告内容生成中...';
    }
  }

  // 生成报告摘要
  generateReportSummary(type) {
    switch (type) {
    case 'comparison':
      return '健康指标对比分析显示整体状况良好，各项指标呈现积极变化趋势。';
    case 'treatment':
      return '干细胞治疗效果显著，患者症状得到明显改善，生活质量有所提升。';
    case 'health':
      return '整体健康状况良好，无明显异常发现，建议继续保持健康的生活方式。';
    default:
      return '报告摘要生成中...';
    }
  }

  // 清空表单
  clearForm() {
    const form = document.getElementById('reportForm');
    if (form) {
      form.reset();
    }
  }

  // 关闭模态框
  closeModal() {
    const modalContainer = document.getElementById('modalContainer');
    if (modalContainer) {
      modalContainer.innerHTML = '';
    }
  }

  // 绑定事件
  bindEvents() {
    // 防止重复绑定事件监听器
    if (this.eventsBound) {
      return;
    }
    this.eventsBound = true;

    // 检客搜索功能
    const customerSearchInput = document.getElementById('customerSearchInput');
    const customerSearchBtn = document.getElementById('customerSearchBtn');
    const clearCustomerBtn = document.getElementById('clearCustomerBtn');

    // 搜索输入框事件（实时搜索）
    if (customerSearchInput) {
      customerSearchInput.addEventListener('input', (e) => {
        clearTimeout(this.customerSearchTimeout);
        const query = e.target.value.trim();

        if (query.length >= 2) {
          this.customerSearchTimeout = setTimeout(() => {
            this.searchCustomers(query);
          }, 500); // 延迟500ms搜索
        } else {
          this.hideCustomerSearchResults();
        }
      });

      // 获得焦点时如果有内容则搜索
      customerSearchInput.addEventListener('focus', (e) => {
        const query = e.target.value.trim();
        if (query.length >= 2) {
          this.searchCustomers(query);
        }
      });
    }

    // 搜索按钮点击
    if (customerSearchBtn) {
      customerSearchBtn.addEventListener('click', () => {
        const query = customerSearchInput.value.trim();
        if (query.length >= 2) {
          this.searchCustomers(query);
        } else {
          NotificationHelper.warning('请输入至少2个字符进行搜索');
        }
      });
    }

    // 清除选中检客
    if (clearCustomerBtn) {
      clearCustomerBtn.addEventListener('click', () => {
        this.clearSelectedCustomer();
      });
    }

    // 点击其他地方隐藏搜索结果
    document.addEventListener('click', (e) => {
      const searchContainer = document.getElementById('customerSearchInput');
      const resultsContainer = document.getElementById('customerSearchResults');

      if (!searchContainer.contains(e.target) && !resultsContainer.contains(e.target)) {
        this.hideCustomerSearchResults();
      }
    });

    // 报告类型按钮点击
    document.querySelectorAll('.report-type-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        // 移除所有按钮的active状态
        document.querySelectorAll('.report-type-btn').forEach(b => {
          b.classList.remove('ring-2', 'ring-blue-500', 'bg-blue-200');
        });

        // 给当前按钮添加active状态
        btn.classList.add('ring-2', 'ring-blue-500', 'bg-blue-200');

        const type = btn.getAttribute('data-tab');
        this.selectReportType(type);

        // 控制历史报告部分的显示/隐藏
        const historySection = document.getElementById('historyReportsSection');
        if (historySection) {
          if (type === 'comparison') {
            historySection.style.display = 'block';
          } else {
            historySection.style.display = 'none';
          }
        }

        // 重新加载报告列表
        this.loadReports();
      });
    });

    // 默认选中第一个按钮（对比报告）
    const firstReportBtn = document.querySelector('.report-type-btn[data-tab="comparison"]');
    if (firstReportBtn) {
      firstReportBtn.classList.add('ring-2', 'ring-blue-500', 'bg-blue-200');
    }

    // 默认只显示对比报告的历史报告部分
    const historySection = document.getElementById('historyReportsSection');
    if (historySection) {
      historySection.style.display = 'block';
    }

    // 报告类型选择变化
    const reportTypeSelect = document.getElementById('reportTypeSelect');
    if (reportTypeSelect) {
      reportTypeSelect.addEventListener('change', (e) => {
        this.selectReportType(e.target.value);
      });
    }

    // 日期范围搜索按钮
    const dateRangeSearchBtn = document.getElementById('dateRangeSearchBtn');
    if (dateRangeSearchBtn) {
      dateRangeSearchBtn.addEventListener('click', () => {
        if (this.selectedReportType === 'comparison') {
          this.searchComparisonExams();
        } else if (this.selectedReportType === 'single') {
          this.searchExams();
        } else if (this.selectedReportType === 'health') {
          this.searchHealthAssessmentExams();
        } else {
          // 其他报告类型可以在这里添加相应的搜索逻辑
          NotificationHelper.info(`已设置${this.getReportTypeText(this.selectedReportType)}的日期范围`);
        }
      });
    }

    // 报告生成表单提交
    const reportForm = document.getElementById('reportForm');
    if (reportForm) {
      reportForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.generateReport();
      });
    }

    // 清空表单按钮
    const clearBtn = document.getElementById('clearReportForm');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.clearForm();
      });
    }

    // 对比报告相关事件
    const clearComparisonSelectionsBtn = document.getElementById('clearComparisonSelections');
    if (clearComparisonSelectionsBtn) {
      clearComparisonSelectionsBtn.addEventListener('click', () => {
        this.clearComparisonSelections();
      });
    }

    // 初始化默认报告类型（对比报告）
    this.selectReportType('comparison');

    // 确保日期框格式一致
    this.ensureDateInputConsistency();
  }

  // 确保日期输入框一致性
  ensureDateInputConsistency() {
    const startDateInput = document.getElementById('dateRangeStart');
    const endDateInput = document.getElementById('dateRangeEnd');

    if (startDateInput && endDateInput) {
      // 确保两个输入框的type都是date
      startDateInput.type = 'date';
      endDateInput.type = 'date';

      // 确保CSS类一致
      const commonClasses = 'flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500';
      startDateInput.className = commonClasses;
      endDateInput.className = commonClasses;

      // 确保样式一致
      const commonStyle = 'font-family: inherit; font-size: inherit;';
      startDateInput.style.cssText = commonStyle;
      endDateInput.style.cssText = commonStyle;

      // 计算默认值
      const today = new Date();
      const lastMonth = new Date(today);
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const lastMonthStr = formatDate(lastMonth);
      const todayStr = formatDate(today);

      // 使用多种方法设置值，确保在所有浏览器中都生效
      startDateInput.value = lastMonthStr;
      startDateInput.setAttribute('value', lastMonthStr);

      endDateInput.value = todayStr;
      endDateInput.setAttribute('value', todayStr);

      // 强制触发change事件
      startDateInput.dispatchEvent(new Event('change', { bubbles: true }));
      endDateInput.dispatchEvent(new Event('change', { bubbles: true }));

      console.log('日期输入框一致性已确保，设置默认值:', {
        start: lastMonthStr,
        end: todayStr,
        startValue: startDateInput.value,
        endValue: endDateInput.value
      });
    }
  }

  // 选择报告类型
  selectReportType(type) {
    this.selectedReportType = type;

    // 更新按钮样式
    document.querySelectorAll('.report-type-btn').forEach((btn, index) => {
      const types = ['comparison', 'treatment', 'health', 'single'];
      if (types[index] === type) {
        btn.classList.add('ring-2', 'ring-blue-500');
      } else {
        btn.classList.remove('ring-2', 'ring-blue-500');
      }
    });

    // 自动选择下拉框
    const reportTypeSelect = document.getElementById('reportTypeSelect');
    if (reportTypeSelect) {
      reportTypeSelect.value = type;
    }

    // 更新报告标题
    const reportTitle = document.getElementById('reportTitle');
    const titles = {
      'comparison': '生成对比报告',
      'treatment': '生成治疗总结',
      'health': '生成健康评估',
      'single': '生成单次报告'
    };
    if (reportTitle) {
      reportTitle.textContent = titles[type] || '生成报告';
    }

    // 根据报告类型更新日期标签和功能
    this.updateDateRangeForType(type);

    // 显示/隐藏专用区域
    const singleReportSection = document.getElementById('singleReportSection');
    const healthAssessmentSection = document.getElementById('healthAssessmentSection');
    const comparisonReportSection = document.getElementById('comparisonReportSection');

    // 隐藏所有专用区域
    if (singleReportSection) {
      singleReportSection.classList.add('hidden');
    }
    if (healthAssessmentSection) {
      healthAssessmentSection.classList.add('hidden');
    }
    if (comparisonReportSection) {
      comparisonReportSection.classList.add('hidden');
    }

    if (type === 'comparison') {
      // 显示对比报告区域
      if (comparisonReportSection) {
        comparisonReportSection.classList.remove('hidden');
      }
      this.setDefaultDateRangeForType(type);
    } else if (type === 'single') {
      // 显示单次报告区域
      if (singleReportSection) {
        singleReportSection.classList.remove('hidden');
      }
      this.setDefaultDateRangeForType(type);
    } else if (type === 'health') {
      // 显示健康评估区域
      if (healthAssessmentSection) {
        healthAssessmentSection.classList.remove('hidden');
      }
      this.setDefaultDateRangeForType(type);
    } else {
      // 其他类型
      this.setDefaultDateRangeForType(type);
    }
  }

  // 根据报告类型更新日期范围标签
  updateDateRangeForType(type) {
    const dateRangeLabel = document.getElementById('dateRangeLabel');
    const dateRangeSearchBtn = document.getElementById('dateRangeSearchBtn');

    const labels = {
      'comparison': '对比数据日期范围',
      'treatment': '治疗数据日期范围',
      'health': '健康数据日期范围',
      'single': '体检日期范围'
    };

    const buttonLabels = {
      'comparison': '搜索对比数据',
      'treatment': '搜索治疗数据',
      'health': '搜索健康数据',
      'single': '搜索体检报告'
    };

    if (dateRangeLabel) {
      dateRangeLabel.textContent = labels[type] || '数据日期范围';
    }

    if (dateRangeSearchBtn) {
      const buttonHtml = `<i class="fas fa-search mr-2"></i>${buttonLabels[type] || '搜索'}`;
      dateRangeSearchBtn.innerHTML = buttonHtml;
    }
  }

  // 根据报告类型设置默认日期范围
  setDefaultDateRangeForType(type) {
    const startDateInput = document.getElementById('dateRangeStart');
    const endDateInput = document.getElementById('dateRangeEnd');

    const endDateStr = new Date().toISOString().split('T')[0];
    const startDate = new Date();

    // 根据报告类型设置不同的默认开始日期
    switch (type) {
    case 'single':
      // 单次报告：默认搜索最近6个月的体检报告
      startDate.setMonth(startDate.getMonth() - 6);
      break;
    case 'comparison':
      // 对比报告：默认搜索最近3个月的数据
      startDate.setMonth(startDate.getMonth() - 3);
      break;
    case 'treatment':
      // 治疗总结：默认搜索最近6个月的治疗数据
      startDate.setMonth(startDate.getMonth() - 6);
      break;
    case 'health':
      // 健康评估：默认搜索最近1年的健康数据
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    default:
      // 默认最近1个月
      startDate.setMonth(startDate.getMonth() - 1);
    }

    const startDateStr = startDate.toISOString().split('T')[0];

    if (startDateInput && !startDateInput.value) {
      startDateInput.value = startDateStr;
    }

    if (endDateInput && !endDateInput.value) {
      endDateInput.value = endDateStr;
    }
  }

  // 搜索体检报告
  async searchExams() {
    if (!this.selectedCustomer) {
      NotificationHelper.warning('请先选择检客');
      return;
    }

    const customerId = this.selectedCustomer.id;
    const startDate = document.getElementById('dateRangeStart').value;
    const endDate = document.getElementById('dateRangeEnd').value;

    if (!startDate || !endDate) {
      NotificationHelper.warning('请选择日期范围');
      return;
    }

    let loadingNotification = null;
    try {
      loadingNotification = NotificationHelper.loading('正在搜索体检报告...');

      const response = await window.API.service.get(`/reports/exams?customerId=${customerId}&startDate=${startDate}&endDate=${endDate}`);

      if (response.status === 'Success') {
        this.populateExamSelect(response.data);
        // 隐藏loading通知
        if (loadingNotification) {
          loadingNotification.remove();
        }
        NotificationHelper.success(`找到 ${response.data.length} 个体检报告`);
      } else {
        // 隐藏loading通知
        if (loadingNotification) {
          loadingNotification.remove();
        }
        NotificationHelper.error(response.message || '搜索体检报告失败');
      }
    } catch (error) {
      console.error('搜索体检报告失败:', error);
      // 隐藏loading通知
      if (loadingNotification) {
        loadingNotification.remove();
      }
      NotificationHelper.error('搜索体检报告失败');
    }
  }

  // 搜索健康评估的体检报告
  async searchHealthAssessmentExams() {
    if (!this.selectedCustomer) {
      NotificationHelper.warning('请先选择检客');
      return;
    }

    const customerId = this.selectedCustomer.id;
    const startDate = document.getElementById('dateRangeStart').value;
    const endDate = document.getElementById('dateRangeEnd').value;

    if (!startDate || !endDate) {
      NotificationHelper.warning('请选择日期范围');
      return;
    }

    let loadingNotification = null;
    try {
      loadingNotification = NotificationHelper.loading('正在搜索体检报告...');

      const response = await window.API.service.get(`/reports/exams?customerId=${customerId}&startDate=${startDate}&endDate=${endDate}`);

      if (response.status === 'Success') {
        this.populateHealthExamSelect(response.data);
        // 隐藏loading通知
        if (loadingNotification) {
          loadingNotification.remove();
        }
        NotificationHelper.success(`找到 ${response.data.length} 个体检报告`);
      } else {
        // 隐藏loading通知
        if (loadingNotification) {
          loadingNotification.remove();
        }
        NotificationHelper.error(response.message || '搜索体检报告失败');
      }
    } catch (error) {
      console.error('搜索体检报告失败:', error);
      // 隐藏loading通知
      if (loadingNotification) {
        loadingNotification.remove();
      }
      NotificationHelper.error('搜索体检报告失败');
    }
  }

  // 填充健康评估体检选择框
  populateHealthExamSelect(exams) {
    const examSelect = document.getElementById('healthExamSelect');
    if (!examSelect) {return;}

    if (exams.length === 0) {
      examSelect.innerHTML = '<option value="">未找到体检报告</option>';
      examSelect.disabled = true;
      return;
    }

    examSelect.innerHTML = '<option value="">请选择体检报告</option>' +
            exams.map(exam => {
              // 计算该体检ID包含的科室数量
              const departmentCount = exam.DepartmentCount || 1;
              const examDate = exam.ExamDate ? new Date(exam.ExamDate).toLocaleDateString('zh-CN') : '未知日期';
              const medicalExamId = exam.MedicalExamID || exam.medicalExamId;
              return `<option value="${medicalExamId}">
                    ${medicalExamId} - ${examDate} (${departmentCount}个科室)
                </option>`;
            }).join('');

    examSelect.disabled = false;

    // 添加选择变化事件监听器
    examSelect.addEventListener('change', (e) => {
      if (e.target.value) {
        this.checkHealthAssessmentStatus(e.target.value);
      } else {
        this.hideHealthAssessmentStatus();
      }
    });
  }

  // 检查健康评估状态
  async checkHealthAssessmentStatus(medicalExamId) {
    try {
      const response = await window.API.service.get(`/reports/health-assessment/check?medicalExamId=${medicalExamId}`);

      const statusContainer = document.getElementById('healthAssessmentStatus');
      const statusText = document.getElementById('healthStatusText');
      const generateButton = document.querySelector('#reportForm button[type="submit"]');

      if (statusContainer && statusText) {
        if (response.status === 'Success' && response.hasReport) {
          // 已存在健康评估
          statusContainer.className = 'p-3 bg-green-50 border border-green-200 rounded-lg';
          statusText.textContent = '该体检报告已生成健康评估，点击下方按钮查看';
          statusText.className = 'text-green-800';

          // 更改按钮为查看报告
          if (generateButton) {
            generateButton.innerHTML = '<i class="fas fa-eye mr-2"></i>查看健康评估';
            generateButton.className = 'px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors';
            // 移除原有的点击事件监听器，添加查看功能
            const newButton = generateButton.cloneNode(true);
            generateButton.parentNode.replaceChild(newButton, generateButton);
            newButton.addEventListener('click', (e) => {
              e.preventDefault();
              this.viewHealthAssessmentReport(response.report.ID);
            });
          }
        } else {
          // 未生成健康评估
          statusContainer.className = 'p-3 bg-blue-50 border border-blue-200 rounded-lg';
          statusText.textContent = '该体检报告尚未生成健康评估，点击下方按钮开始生成';
          statusText.className = 'text-blue-800';

          // 恢复按钮为生成报告
          if (generateButton) {
            generateButton.innerHTML = '<i class="fas fa-file-export mr-2"></i>生成健康评估';
            generateButton.className = 'px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors';
          }
        }
        statusContainer.classList.remove('hidden');
      }
    } catch (error) {
      console.error('检查健康评估状态失败:', error);
    }
  }

  // 隐藏健康评估状态
  hideHealthAssessmentStatus() {
    const statusContainer = document.getElementById('healthAssessmentStatus');
    const generateButton = document.querySelector('#reportForm button[type="submit"]');

    if (statusContainer) {
      statusContainer.classList.add('hidden');
    }

    // 恢复按钮为默认状态
    if (generateButton) {
      generateButton.innerHTML = '<i class="fas fa-file-export mr-2"></i>生成报告';
      generateButton.className = 'px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors';
    }
  }

  // 填充体检选择框
  populateExamSelect(exams) {
    const examSelect = document.getElementById('examSelect');
    if (!examSelect) {return;}

    if (exams.length === 0) {
      examSelect.innerHTML = '<option value="">未找到体检报告</option>';
      examSelect.disabled = true;
      return;
    }

    examSelect.innerHTML = '<option value="">请选择体检报告</option>' +
            exams.map(exam => {
              // 计算该体检ID包含的科室数量
              const departmentCount = exam.DepartmentCount || 1;
              const examDate = exam.ExamDate ? new Date(exam.ExamDate).toLocaleDateString('zh-CN') : '未知日期';
              const medicalExamId = exam.MedicalExamID || exam.medicalExamId;
              return `<option value="${medicalExamId}">
                    ${medicalExamId} - ${examDate} (${departmentCount}个科室)
                </option>`;
            }).join('');

    examSelect.disabled = false;
  }

  // 生成Markdown格式的单次报告
  generateSingleReportMarkdown(examData) {
    const customerName = examData.customerName || '未知检客';
    const medicalExamId = examData.medicalExamId || '未知ID';
    const examDate = examData.examDate || '未知日期';
    const departments = examData.departments || [];

    let markdown = `# ${customerName} 体检报告\n\n`;
    markdown += '## 基本信息\n\n';
    markdown += `- **检客姓名**: ${customerName}\n`;
    markdown += `- **体检ID**: ${medicalExamId}\n`;
    markdown += `- **体检日期**: ${this.formatDateTime(examDate)}\n`;
    markdown += `- **生成时间**: ${this.formatDateTime(new Date())}\n\n`;

    if (departments.length > 0) {
      markdown += '## 检查结果\n\n';

      // 按科室排序
      departments.sort((a, b) => {
        const order = ['检验科', '彩超室', '心电图室', '放射科', '内科', '外科', '眼科', '耳鼻喉科', '口腔科'];
        const aIndex = order.indexOf(a.department);
        const bIndex = order.indexOf(b.department);
        if (aIndex === -1 && bIndex === -1) {return a.department.localeCompare(b.department);}
        if (aIndex === -1) {return 1;}
        if (bIndex === -1) {return -1;}
        return aIndex - bIndex;
      });

      departments.forEach((dept, index) => {
        markdown += `### ${index + 1}. ${dept.department}\n\n`;

        if (dept.assessmentDate) {
          markdown += `**检查日期**: ${dept.assessmentDate}\n\n`;
        }

        if (dept.doctor) {
          markdown += `**检查医生**: ${dept.doctor}\n\n`;
        }

        // 解析AssessmentData JSON数据
        if (dept.assessmentData) {
          try {
            const assessmentData = JSON.parse(dept.assessmentData);
            if (Array.isArray(assessmentData)) {
              assessmentData.forEach(item => {
                if (item.itemName && item.itemResult) {
                  markdown += `**${item.itemName}**:\n\n`;
                  markdown += `${item.itemResult}\n\n`;
                }
              });
            }
          } catch (e) {
            console.error('解析评估数据失败:', e);
          }
        }

        // 添加摘要信息
        if (dept.summary) {
          markdown += `**科室小结**: ${dept.summary}\n\n`;
        }

        markdown += '---\n\n';
      });
    }

    markdown += '## 报告说明\n\n';
    markdown += '本报告基于医院信息系统中的体检数据自动生成，仅供参考。\n';
    markdown += '如有疑问，请咨询主治医生或相关科室。\n\n';
    markdown += '---\n\n';
    markdown += `*报告生成时间: ${this.formatDateTime(new Date())}*\n`;
    markdown += '*系统自动生成，请勿作为唯一诊断依据*\n';

    return markdown;
  }

  // ========== 对比报告相关方法 ==========

  // 搜索对比报告的体检数据
  async searchComparisonExams() {
    if (!this.selectedCustomer) {
      NotificationHelper.warning('请先选择检客');
      return;
    }

    const startDate = document.getElementById('dateRangeStart').value;
    const endDate = document.getElementById('dateRangeEnd').value;

    if (!startDate || !endDate) {
      NotificationHelper.warning('请选择日期范围');
      return;
    }

    try {
      const loadingNotification = NotificationHelper.loading('正在搜索体检数据...');

      // 获取体检详情数据
      const haResponse = await window.API.service.get(`/reports/exams?customerId=${this.selectedCustomer.id}&startDate=${startDate}&endDate=${endDate}`);

      if (loadingNotification) {
        loadingNotification.remove();
      }

      const exams = [];

      // 处理体检数据
      if (haResponse.status === 'Success' && haResponse.data && Array.isArray(haResponse.data)) {
        haResponse.data.forEach(exam => {
          exams.push({
            id: exam.MedicalExamID,
            date: exam.ExamDate,
            departmentCount: exam.DepartmentCount,
            customerName: exam.CustomerName
          });
        });
      }

      // 去重并排序
      const uniqueExams = exams.filter((exam, index, self) =>
        index === self.findIndex(e => e.id === exam.id)
      ).sort((a, b) => new Date(b.date) - new Date(a.date));

      this.availableExams = uniqueExams;
      this.renderComparisonExamList();

      if (uniqueExams.length === 0) {
        NotificationHelper.info('在指定日期范围内未找到体检数据');
      } else {
        NotificationHelper.success(`找到 ${uniqueExams.length} 个体检记录`);
      }

    } catch (error) {
      console.error('搜索对比体检数据失败:', error);
      NotificationHelper.error('搜索体检数据失败');
    }
  }

  // 渲染对比报告体检列表
  renderComparisonExamList() {
    const container = document.getElementById('comparisonExamList');
    if (!container) {return;}

    if (this.availableExams.length === 0) {
      container.innerHTML = `
                <div class="text-center text-gray-500 py-4">
                    <i class="fas fa-search text-2xl mb-2"></i>
                    <p>请先搜索体检报告</p>
                </div>
            `;
      return;
    }

    container.innerHTML = this.availableExams.map(exam => {
      const isSelected = this.selectedComparisonExams.some(e => e.id === exam.id);

      return `
                <div class="comparison-exam-item p-3 border border-gray-200 rounded-lg mb-2 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'}"
                     data-exam-id="${exam.id}"
                     onclick="reportsManager.toggleComparisonExam('${exam.id}')">
                    <div class="flex items-center">
                        <div class="mr-3">
                            <div class="w-4 h-4 border-2 border-blue-300 rounded ${isSelected ? 'bg-blue-600' : ''} flex items-center justify-center">
                                ${isSelected ? '<i class="fas fa-check text-white text-xs"></i>' : ''}
                            </div>
                        </div>
                        <div class="flex-1">
                            <div class="font-medium text-gray-900">体检ID: ${exam.id}</div>
                            <div class="text-sm text-gray-600">体检日期: ${exam.date}</div>
                            <div class="text-xs text-gray-500">包含科室数量: ${exam.departmentCount || 0} 个</div>
                        </div>
                    </div>
                </div>
            `;
    }).join('');
  }

  // 切换对比报告体检选择
  toggleComparisonExam(examId) {
    const exam = this.availableExams.find(e => e.id === examId);
    if (!exam) {return;}

    const selectedIndex = this.selectedComparisonExams.findIndex(e => e.id === examId);

    if (selectedIndex > -1) {
      // 取消选择
      this.selectedComparisonExams.splice(selectedIndex, 1);
    } else {
      // 检查是否超过最大选择数量
      if (this.selectedComparisonExams.length >= this.maxComparisonSelections) {
        NotificationHelper.warning(`最多只能选择${this.maxComparisonSelections}个体检报告进行对比`);
        return;
      }
      // 添加选择
      this.selectedComparisonExams.push(exam);
    }

    this.renderComparisonExamList();
    this.updateSelectedComparisonDisplay();
  }

  // 更新已选择的对比报告显示
  updateSelectedComparisonDisplay() {
    const container = document.getElementById('selectedComparisonExams');
    const listContainer = document.getElementById('selectedComparisonList');

    if (!container || !listContainer) {return;}

    if (this.selectedComparisonExams.length === 0) {
      container.classList.add('hidden');
      return;
    }

    container.classList.remove('hidden');

    listContainer.innerHTML = this.selectedComparisonExams.map((exam, index) => `
            <div class="flex items-center justify-between p-2 bg-white rounded border">
                <div class="flex-1">
                    <span class="font-medium text-gray-800">${index + 1}. 体检ID: ${exam.id}</span>
                    <span class="text-gray-600 text-sm ml-2">(${exam.date})</span>
                </div>
                <button type="button" onclick="reportsManager.removeComparisonExam('${exam.id}')"
                        class="text-red-500 hover:text-red-700 ml-2">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
  }

  // 移除对比报告选择
  removeComparisonExam(examId) {
    this.selectedComparisonExams = this.selectedComparisonExams.filter(e => e.id !== examId);
    this.renderComparisonExamList();
    this.updateSelectedComparisonDisplay();
  }

  // 清空对比报告选择
  clearComparisonSelections() {
    this.selectedComparisonExams = [];
    this.renderComparisonExamList();
    this.updateSelectedComparisonDisplay();
    NotificationHelper.info('已清空选择');
  }

  // 禁用生成按钮
  disableGenerateButton() {
    const generateButton = document.querySelector('#reportForm button[type="submit"]');
    if (generateButton) {
      generateButton.disabled = true;
      generateButton.classList.add('opacity-50', 'cursor-not-allowed');
      generateButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>生成中...';
    }
  }

  // 启用生成按钮
  enableGenerateButton() {
    const generateButton = document.querySelector('#reportForm button[type="submit"]');
    if (generateButton) {
      generateButton.disabled = false;
      generateButton.classList.remove('opacity-50', 'cursor-not-allowed');
      generateButton.innerHTML = '<i class="fas fa-file-export mr-2"></i>生成报告';
    }
  }

  // 生成对比报告
  async generateComparisonReport() {
    // 防止重复提交
    if (this.isGeneratingReport) {
      NotificationHelper.info('对比报告正在生成中，请耐心等待AI处理完成', '处理中');
      return;
    }

    if (!this.selectedCustomer) {
      NotificationHelper.error('请选择检客');
      return;
    }

    if (this.selectedComparisonExams.length < 2) {
      NotificationHelper.error('请至少选择2个体检报告进行对比');
      return;
    }

    // 设置生成状态标志
    this.isGeneratingReport = true;
    this.disableGenerateButton();

    try {
      let loadingNotification = NotificationHelper.loading('正在生成对比报告...');

      const medicalExamIds = this.selectedComparisonExams.map(exam => exam.id);
      const generateData = {
        customerId: this.selectedCustomer.id,
        medicalExamIds: medicalExamIds
      };

      const response = await window.API.service.post('/reports/comparison/generate', generateData);

      if (loadingNotification) {
        loadingNotification.remove();
        loadingNotification = null;
      }

      if (response.status === 'Success') {
        NotificationHelper.success('对比报告生成已启动，AI正在分析数据，请耐心等待...', '生成启动');

        // 开始轮询生成状态
        this.pollComparisonReportStatus(response.data.reportId);
      } else if (response.status === 'Error' && response.existingReportId) {
        // 处理重复提交的情况
        NotificationHelper.warning(response.message || '已有相同的对比报告正在处理中，请等待当前报告生成完成', '重复请求');
        // 轮询已存在的报告状态
        this.pollComparisonReportStatus(response.existingReportId);
      } else {
        NotificationHelper.error(response.message || '生成对比报告失败，请检查网络连接后重试', '生成失败');
      }

    } catch (error) {
      console.error('生成对比报告失败:', error);

      // 处理409冲突状态码（重复提交）
      if (error.message.includes('409') || error.message.includes('已存在相同的对比报告')) {
        const errorData = JSON.parse(error.message.split(':').slice(1).join(':').trim() || '{}');
        if (errorData.existingReportId) {
          NotificationHelper.warning(errorData.message || '已有相同的对比报告正在AI处理中，请勿重复提交', '处理中');
          // 轮询已存在的报告状态
          this.pollComparisonReportStatus(errorData.existingReportId);
          return;
        }
      }

      NotificationHelper.error('网络连接异常或AI服务暂时不可用，请稍后重试', '服务异常');
    } finally {
      // 恢复生成状态标志
      this.isGeneratingReport = false;
      this.enableGenerateButton();
    }
  }

  // 轮询对比报告生成状态
  async pollComparisonReportStatus(reportId) {
    const maxAttempts = 60; // 最多轮询60次（约10分钟）
    let attempts = 0;
    let statusNotification = null;

    const poll = async () => {
      try {
        const response = await window.API.service.get(`/reports/comparison/${reportId}`);

        if (response.status === 'Success' && response.data) {
          const report = response.data;

          if (report.Status === 'completed') {
            // 移除状态通知
            NotificationHelper.clearProcessing();
            NotificationHelper.success('对比报告生成完成！AI分析已完成，可以查看报告', '生成完成');
            this.loadReports(); // 刷新报告列表
            return;
          } else if (report.Status === 'failed') {
            // 移除状态通知
            NotificationHelper.clearProcessing();
            NotificationHelper.error(`对比报告生成失败: ${report.ErrorMessage || 'AI分析遇到问题，请重试'}`, '生成失败');
            return;
          }
          // 继续轮询 - 更新进度提示
          if (attempts % 3 === 0 && statusNotification) { // 每30秒更新一次提示
            const timeElapsed = Math.floor(attempts * 10 / 60); // 分钟
            // 使用新的通知更新功能
            if (window.EnhancedNotificationHelper && statusNotification.update) {
              statusNotification.update(`AI正在分析对比数据，已处理 ${timeElapsed} 分钟，请继续等待...`);
            } else if (statusNotification.textContent) {
              statusNotification.textContent = `AI正在分析对比数据，已处理 ${timeElapsed} 分钟，请继续等待...`;
            }
          }
        } else {
          // 移除状态通知
          if (statusNotification) {
            statusNotification.remove();
            statusNotification = null;
          }
          NotificationHelper.error('获取对比报告状态失败，请刷新页面查看', '状态查询失败');
          return;
        }
      } catch (error) {
        console.error('轮询对比报告状态失败:', error);
        // 移除状态通知
        if (statusNotification) {
          statusNotification.remove();
          statusNotification = null;
        }
        NotificationHelper.error('网络连接异常，无法获取报告状态', '连接异常');
        return;
      }

      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(poll, 10000); // 每10秒轮询一次
      } else {
        // 移除状态通知
        if (statusNotification) {
          statusNotification.remove();
          statusNotification = null;
        }
        NotificationHelper.error('报告生成时间较长，请稍后手动查看或联系管理员', '处理超时');
      }
    };

    // 显示初始状态通知
    statusNotification = NotificationHelper.processing('AI正在分析对比数据，这可能需要几分钟时间，请耐心等待...', 'AI处理中');

    // 开始轮询
    setTimeout(poll, 2000); // 2秒后开始第一次轮询
  }

  // 显示对比报告模态框
  showComparisonReportModal(report) {
    const modalContainer = document.getElementById('modalContainer');
    if (!modalContainer) {return;}

    // 格式化处理时间
    const formatProcessingTime = (seconds) => {
      if (!seconds) {return '未知';}
      if (seconds < 60) {return `${seconds}秒`;}
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}分${remainingSeconds}秒`;
    };

    // 获取状态显示
    const getStatusDisplay = (status) => {
      switch (status) {
      case 'completed': return { text: '已完成', color: 'text-green-600 bg-green-50', icon: 'fa-check-circle' };
      case 'processing': return { text: '生成中', color: 'text-blue-600 bg-blue-50', icon: 'fa-spinner fa-spin' };
      case 'failed': return { text: '生成失败', color: 'text-red-600 bg-red-50', icon: 'fa-exclamation-triangle' };
      default: return { text: '未知状态', color: 'text-gray-600 bg-gray-50', icon: 'fa-question-circle' };
      }
    };

    const statusInfo = getStatusDisplay(report.Status);

    modalContainer.innerHTML = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div class="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                    <!-- 头部 -->
                    <div class="p-6 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-orange-50">
                        <div class="flex justify-between items-center">
                            <div class="flex items-center space-x-3">
                                <i class="fas fa-chart-line text-2xl text-amber-600"></i>
                                <div>
                                    <h3 class="text-xl font-semibold text-gray-900">${report.CustomerName} - 健康对比分析报告</h3>
                                    <p class="text-sm text-gray-600 mt-1">AI智能对比分析报告</p>
                                </div>
                            </div>
                            <button onclick="reportsManager.closeModal()" class="text-gray-400 hover:text-gray-600 transition-colors">
                                <i class="fas fa-times text-xl"></i>
                            </button>
                        </div>
                    </div>

                    <!-- 内容区域 -->
                    <div class="flex-1 overflow-y-auto">
                        <div class="p-6">
                            <!-- 报告基本信息卡片 -->
                            <div class="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 mb-6 border border-amber-100">
                                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <!-- 报告ID -->
                                    <div class="text-center">
                                        <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">报告ID</div>
                                        <div class="font-mono text-sm font-semibold text-gray-800">${report.ID.substring(0, 8)}...</div>
                                    </div>

                                    <!-- 对比体检数量 -->
                                    <div class="text-center">
                                        <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">对比体检</div>
                                        <div class="font-semibold text-gray-800">${report.MedicalExamIDs.split(',').length} 个</div>
                                    </div>

                                    <!-- 生成时间 -->
                                    <div class="text-center">
                                        <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">生成时间</div>
                                        <div class="text-sm font-semibold text-gray-800">${this.formatDateTime(report.CreatedAt)}</div>
                                    </div>

                                    <!-- 状态 -->
                                    <div class="text-center">
                                        <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">状态</div>
                                        <div class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}">
                                            <i class="fas ${statusInfo.icon} mr-1"></i>
                                            ${statusInfo.text}
                                        </div>
                                    </div>
                                </div>

                                <!-- 对比的体检ID列表 -->
                                <div class="mt-4 pt-4 border-t border-amber-200">
                                    <div class="text-xs text-gray-500 uppercase tracking-wide mb-2">对比体检ID</div>
                                    <div class="flex flex-wrap gap-2">
                                        ${report.MedicalExamIDs.split(',').map((examId, index) => `
                                            <span class="inline-flex items-center px-2 py-1 bg-white rounded text-xs font-medium text-amber-800 border border-amber-200">
                                                <i class="fas fa-file-medical mr-1"></i>
                                                第${index + 1}次: ${examId.trim()}
                                            </span>
                                        `).join('')}
                                    </div>
                                </div>
                            </div>

                            <!-- AI分析结果 -->
                            ${report.MarkdownContent ? `
                                <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                    <div class="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-4">
                                        <h4 class="font-semibold flex items-center">
                                            <i class="fas fa-brain mr-2"></i>
                                            AI健康对比分析
                                        </h4>
                                    </div>
                                    <div class="p-6">
                                        <div class="prose max-w-none">
                                            <div class="whitespace-pre-wrap text-gray-800 leading-relaxed">
                                                ${report.MarkdownContent}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ` : ''}

                            <!-- 技术信息 -->
                            <div class="mt-6 p-4 bg-gray-50 rounded-lg border">
                                <h5 class="font-medium text-gray-700 mb-3 flex items-center">
                                    <i class="fas fa-info-circle mr-2"></i>
                                    技术信息
                                </h5>
                                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                    <div>
                                        <span class="text-gray-500">AI模型:</span>
                                        <span class="ml-2 font-medium">${report.APIModel || 'DeepSeek'}</span>
                                    </div>
                                    <div>
                                        <span class="text-gray-500">处理时间:</span>
                                        <span class="ml-2 font-medium">${formatProcessingTime(report.ProcessingTime)}</span>
                                    </div>
                                    <div>
                                        <span class="text-gray-500">Token消耗:</span>
                                        <span class="ml-2 font-medium">${report.APITokenCount || 0}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 操作按钮 -->
                    <div class="p-6 border-t border-gray-200 bg-gray-50">
                        <div class="flex justify-end space-x-3">
                            <button onclick="reportsManager.downloadComparisonReport('${report.ID}')"
                                    class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                                <i class="fas fa-download mr-2"></i>下载Markdown
                            </button>
                            <button onclick="reportsManager.downloadComparisonPDF('${report.ID}')"
                                    class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                                <i class="fas fa-file-pdf mr-2"></i>下载PDF
                            </button>
                            <button onclick="reportsManager.closeModal()"
                                    class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                                关闭
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
  }

  // 下载对比报告
  async downloadComparisonReport(reportId) {
    try {
      const response = await window.API.service.get(`/reports/comparison/${reportId}/download`);

      if (response.status === 'Success') {
        // 创建下载链接
        const blob = new Blob([response.data], { type: 'text/markdown;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `健康对比分析报告_${new Date().toISOString().split('T')[0]}.md`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        NotificationHelper.success('报告下载成功');
      } else {
        NotificationHelper.error('下载失败');
      }
    } catch (error) {
      console.error('下载对比报告失败:', error);
      NotificationHelper.error('下载失败');
    }
  }

  // 下载对比报告PDF
  async downloadComparisonPDF(reportId) {
    try {
      let loadingNotification = NotificationHelper.loading('正在转换为PDF格式，请稍候...');

      const response = await window.API.service.post(`/reports/comparison/${reportId}/convert-pdf`);

      if (loadingNotification) {
        loadingNotification.remove();
        loadingNotification = null;
      }

      if (response.status === 'Success' && response.data) {
        // 使用PDFService的下载方法
        if (window.PDFService && window.PDFService.downloadPDF) {
          window.PDFService.downloadPDF(response.data.pdfData, response.data.fileName);
        } else {
          // 备用下载方法
          const binaryString = atob(response.data.pdfData);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = response.data.fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }

        NotificationHelper.success('PDF下载成功');
      } else {
        NotificationHelper.error(response.message || 'PDF转换失败');
      }
    } catch (error) {
      console.error('下载PDF失败:', error);

      // 关闭loading通知
      const loadingNotifications = document.querySelectorAll('.notification-loading');
      loadingNotifications.forEach(notification => {
        if (notification.remove) {
          notification.remove();
        }
      });

      NotificationHelper.error('PDF转换失败，请稍后重试');
    }
  }

  // 查看对比报告
  async viewComparisonReport(reportId) {
    try {
      const response = await window.API.service.get(`/reports/comparison/${reportId}`);

      if (response.status === 'Success' && response.data) {
        const report = response.data;
        this.showComparisonReportModal(report);
      } else {
        NotificationHelper.error('获取对比报告失败');
      }
    } catch (error) {
      console.error('查看对比报告失败:', error);
      NotificationHelper.error('查看对比报告失败');
    }
  }
}

// 创建全局实例
const reportsManager = new ReportsManager();

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  reportsManager.init();
});

// 确保全局对象可以访问
window.reportsManager = reportsManager;