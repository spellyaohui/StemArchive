/**
 * 检客档案查找模块
 * 支持通过身份证号快速查找和验证检客档案
 */

class CustomerLookup {
  constructor() {
    this.currentCustomer = null;
    this.lookupHistory = [];
    this.init();
  }

  init() {
    console.log('✓ 检客档案查找模块已初始化');
  }

  escapeHtml(value) {
    if (window.Utils && typeof window.Utils.escapeHtml === 'function') {
      return window.Utils.escapeHtml(value);
    }

    if (value === null || value === undefined) {return '';}
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
     * 根据身份证号查找检客档案
     * @param {string} identityCard - 身份证号
     * @returns {Promise<Object>} 检客档案信息
     */
  async lookupCustomer(identityCard) {
    try {
      console.log(`🔍 正在查找检客档案: ${identityCard}`);
      const result = await window.API.service.get(`/customers/identity/${encodeURIComponent(identityCard)}`);

      if (result.status === 'Success') {
        this.currentCustomer = result.data;
        this.addToLookupHistory(identityCard, result.data);
        console.log('✓ 检客档案查找成功:', result.data.customerInfo.name);
        return result.data;
      } else {
        console.warn('⚠️ 检客档案查找失败:', result.message);
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('❌ 检客档案查找失败:', error);
      throw error;
    }
  }

  /**
     * 验证检客档案是否可用于特定操作
     * @param {string} identityCard - 身份证号
     * @param {string} operationType - 操作类型：'HealthAssessment', 'StemCell', 'Report'
     * @returns {Promise<Object>} 验证结果
     */
  async validateCustomer(identityCard, operationType = 'General') {
    try {
      console.log(`🔍 正在验证检客档案: ${identityCard} (操作: ${operationType})`);
      const result = await window.API.service.get(
        `/customers/validate/${encodeURIComponent(identityCard)}`,
        { operationType }
      );

      if (result.status === 'Success') {
        console.log('✓ 检客档案验证结果:', result.data.isValid ? '通过' : '失败');
        return result.data;
      } else {
        console.warn('⚠️ 检客档案验证失败:', result.message);
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('❌ 检客档案验证失败:', error);
      throw error;
    }
  }

  /**
     * 检查身份证号是否已存在
     * @param {string} identityCard - 身份证号
     * @returns {Promise<Object>} 检查结果
     */
  async checkDuplicate(identityCard) {
    try {
      console.log(`🔍 正在检查身份证号重复: ${identityCard}`);
      const result = await window.API.service.get(`/customers/check-duplicate/${encodeURIComponent(identityCard)}`);

      if (result.status === 'Success') {
        console.log('✓ 身份证号检查完成, 是否存在:', result.data.exists);
        return result.data;
      } else {
        console.warn('⚠️ 身份证号检查失败:', result.message);
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('❌ 身份证号检查失败:', error);
      throw error;
    }
  }

  /**
     * 获取检客统计信息
     * @param {string} identityCard - 身份证号
     * @returns {Promise<Object>} 统计信息
     */
  async getCustomerStatistics(identityCard) {
    try {
      console.log(`🔍 正在获取检客统计信息: ${identityCard}`);
      const result = await window.API.service.get(`/customers/statistics/${encodeURIComponent(identityCard)}`);

      if (result.status === 'Success') {
        console.log('✓ 检客统计信息获取成功');
        return result.data;
      } else {
        console.warn('⚠️ 检客统计信息获取失败:', result.message);
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('❌ 检客统计信息获取失败:', error);
      throw error;
    }
  }

  /**
     * 显示检客档案查找界面
     * @param {Object} options - 配置选项
     */
  showLookupModal(options = {}) {
    const {
      title = '查找检客档案',
      onSuccess = null,
      onCancel = null,
      operationType = 'General'
    } = options;

    const modalHtml = `
            <div id="customerLookupModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                    <div class="p-6">
                        <div class="flex justify-between items-center mb-6">
                            <h3 class="text-xl font-semibold text-gray-800">
                                <i class="fas fa-search mr-2 text-blue-600"></i>${title}
                            </h3>
                            <button onclick="customerLookup.closeLookupModal()" class="text-gray-400 hover:text-gray-600">
                                <i class="fas fa-times text-xl"></i>
                            </button>
                        </div>

                        <div class="mb-6">
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                身份证号 <span class="text-red-500">*</span>
                            </label>
                            <div class="flex space-x-2">
                                <input
                                    type="text"
                                    id="identityCardInput"
                                    placeholder="请输入身份证号"
                                    class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    maxlength="18"
                                >
                                <button
                                    onclick="customerLookup.performLookup()"
                                    class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    <i class="fas fa-search mr-2"></i>查找
                                </button>
                            </div>
                            <div id="lookupError" class="mt-2 text-red-500 text-sm hidden"></div>
                        </div>

                        <div id="lookupResults" class="hidden">
                            <!-- 查找结果将在这里显示 -->
                        </div>

                        <div id="lookupActions" class="flex justify-end space-x-3 mt-6 hidden">
                            <button
                                onclick="customerLookup.handleCancel()"
                                class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                取消
                            </button>
                            <button
                                onclick="customerLookup.handleSuccess()"
                                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                确认选择
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

    // 添加到页面
    document.getElementById('modalContainer').innerHTML = modalHtml;

    // 设置回调函数
    this.currentOptions = { onSuccess, onCancel, operationType };

    // 绑定回车键事件
    document.getElementById('identityCardInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.performLookup();
      }
    });

    // 自动聚焦到输入框
    document.getElementById('identityCardInput').focus();
  }

  /**
     * 执行查找操作
     */
  async performLookup() {
    const identityCard = document.getElementById('identityCardInput').value.trim();
    const errorDiv = document.getElementById('lookupError');
    const resultsDiv = document.getElementById('lookupResults');
    const actionsDiv = document.getElementById('lookupActions');

    if (!identityCard) {
      errorDiv.textContent = '请输入身份证号';
      errorDiv.classList.remove('hidden');
      return;
    }

    // 简化的身份证号格式验证
    const idCardRegex15 = /^\d{15}$/;
    const idCardRegex18 = /^\d{17}[\dXx]$/;

    if (!idCardRegex15.test(identityCard) && !idCardRegex18.test(identityCard)) {
      errorDiv.textContent = '请输入正确的15~18位身份证号';
      errorDiv.classList.remove('hidden');
      return;
    }

    // 显示加载状态
    errorDiv.classList.add('hidden');
    resultsDiv.innerHTML = `
            <div class="flex justify-center items-center py-8">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span class="ml-3 text-gray-600">正在查找检客档案...</span>
            </div>
        `;
    resultsDiv.classList.remove('hidden');

    try {
      // 先尝试获取完整的检客档案信息（绕过验证步骤）
      let customerData;
      try {
        customerData = await this.lookupCustomer(identityCard);
      } catch (lookupError) {
        console.warn('直接查找失败，尝试验证流程:', lookupError);

        // 如果直接查找失败，再尝试验证流程
        const validation = await this.validateCustomer(identityCard, this.currentOptions.operationType);

        if (!validation.isValid) {
          resultsDiv.innerHTML = `
                      <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                          <div class="flex items-center">
                              <i class="fas fa-exclamation-circle text-red-500 text-xl mr-3"></i>
                              <div>
                                  <h4 class="text-red-800 font-medium">检客档案验证失败</h4>
                                  <p class="text-red-600 text-sm mt-1">${validation.message}</p>
                              </div>
                          </div>
                      </div>
                  `;
          return;
        }

        // 验证通过后再次尝试获取检客档案信息
        customerData = await this.lookupCustomer(identityCard);
      }

      // 显示查找结果
      this.displayLookupResults(customerData);
      actionsDiv.classList.remove('hidden');

    } catch (error) {
      console.error('查找失败:', error);
      errorDiv.textContent = error.message || '查找失败，请重试';
      errorDiv.classList.remove('hidden');
      resultsDiv.classList.add('hidden');
      actionsDiv.classList.add('hidden');
    }
  }

  /**
     * 显示查找结果
     * @param {Object} customerData - 检客档案数据
     */
  displayLookupResults(customerData) {
    const resultsDiv = document.getElementById('lookupResults');

    // 处理不同的数据结构
    // 情况1：后端直接返回的客户数据
    // 情况2：包装过的数据结构
    const customerInfo = customerData.customerInfo || customerData.data?.customerInfo || customerData.data || customerData;
    const statistics = customerData.statistics || customerData.data?.statistics || {};
    const profileCompleteness = customerData.profileCompleteness || customerData.data?.profileCompleteness || { level: '基础', score: 60 };

    // 保存当前选中的客户数据，供handleSuccess使用
    this.currentCustomer = {
      customerInfo: {
        id: customerInfo.id || customerInfo.ID,
        name: customerInfo.name || customerInfo.Name,
        gender: customerInfo.gender || customerInfo.Gender,
        age: customerInfo.age || customerInfo.Age,
        identityCard: customerInfo.identityCard || customerInfo.IdentityCard,
        phone: customerInfo.phone || customerInfo.Phone,
        contactPerson: customerInfo.contactPerson || customerInfo.ContactPerson
      },
      statistics: statistics,
      profileCompleteness: profileCompleteness
    };

    const completenessLevelColor = {
      '完整': 'text-green-600 bg-green-100',
      '良好': 'text-blue-600 bg-blue-100',
      '基础': 'text-yellow-600 bg-yellow-100',
      '不完整': 'text-red-600 bg-red-100'
    };

    const levelClass = completenessLevelColor[profileCompleteness.level] || 'text-gray-600 bg-gray-100';
    const safeName = this.escapeHtml(customerInfo.name || '未填写');
    const safeGender = this.escapeHtml(customerInfo.gender || '未填写');
    const safeAge = this.escapeHtml(customerInfo.age || '未填写');
    const safeIdentityCard = this.escapeHtml(customerInfo.identityCard || '未填写');
    const safePhone = this.escapeHtml(customerInfo.phone || '未填写');
    const safeLevel = this.escapeHtml(profileCompleteness.level || '基础');
    const safeScore = Number(profileCompleteness.score || 0);
    const safeHealthAssessments = Number(statistics.healthAssessments || 0);
    const safeStemCellTreatments = Number(statistics.stemCellTreatments || 0);
    const safeReports = Number(statistics.reports || 0);
    const safeTotalInfusions = Number(statistics.totalInfusions || 0);

    resultsDiv.innerHTML = `
            <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <div class="flex items-center">
                    <i class="fas fa-check-circle text-green-500 text-xl mr-3"></i>
                    <span class="text-green-800 font-medium">检客档案查找成功</span>
                </div>
            </div>

            <div class="space-y-4">
                <!-- 基本信息 -->
                <div class="bg-gray-50 rounded-lg p-4">
                    <h4 class="font-medium text-gray-800 mb-3 flex items-center">
                        <i class="fas fa-user mr-2 text-blue-600"></i>基本信息
                    </h4>
                    <div class="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span class="text-gray-500">姓名：</span>
                            <span class="font-medium">${safeName}</span>
                        </div>
                        <div>
                            <span class="text-gray-500">性别：</span>
                            <span class="font-medium">${safeGender}</span>
                        </div>
                        <div>
                            <span class="text-gray-500">年龄：</span>
                            <span class="font-medium">${safeAge}</span>
                        </div>
                        <div>
                            <span class="text-gray-500">身份证号：</span>
                            <span class="font-medium">${safeIdentityCard}</span>
                        </div>
                        <div>
                            <span class="text-gray-500">联系电话：</span>
                            <span class="font-medium">${safePhone}</span>
                        </div>
                        <div>
                            <span class="text-gray-500">档案完整性：</span>
                            <span class="px-2 py-1 rounded-full text-xs font-medium ${levelClass}">
                                ${safeLevel} (${safeScore}%)
                            </span>
                        </div>
                    </div>
                </div>

                <!-- 统计信息 -->
                <div class="bg-gray-50 rounded-lg p-4">
                    <h4 class="font-medium text-gray-800 mb-3 flex items-center">
                        <i class="fas fa-chart-bar mr-2 text-purple-600"></i>历史记录统计
                    </h4>
                    <div class="grid grid-cols-3 gap-4 text-sm">
                        <div class="text-center">
                            <div class="text-2xl font-bold text-blue-600">${safeHealthAssessments}</div>
                            <div class="text-gray-500">健康评估</div>
                        </div>
                        <div class="text-center">
                            <div class="text-2xl font-bold text-green-600">${safeStemCellTreatments}</div>
                            <div class="text-gray-500">干细胞治疗</div>
                        </div>
                        <div class="text-center">
                            <div class="text-2xl font-bold text-purple-600">${safeReports}</div>
                            <div class="text-gray-500">检查报告</div>
                        </div>
                    </div>
                    ${safeTotalInfusions > 0 ? `
                        <div class="mt-3 text-center">
                            <span class="text-gray-500">累计回输：</span>
                            <span class="font-medium text-orange-600">${safeTotalInfusions} 次</span>
                        </div>
                    ` : ''}
                </div>

                <!-- 最近活动 -->
                <div class="bg-blue-50 rounded-lg p-4">
                    <h4 class="font-medium text-gray-800 mb-3 flex items-center">
                        <i class="fas fa-clock mr-2 text-indigo-600"></i>最近活动
                    </h4>
                    <div class="space-y-2 text-sm">
                        ${statistics.lastAssessmentDate ? `
                            <div class="flex justify-between">
                                <span class="text-gray-500">健康评估：</span>
                                <span class="font-medium">${this.formatDate(statistics.lastAssessmentDate)}</span>
                            </div>
                        ` : ''}
                        ${statistics.lastRegistrationDate ? `
                            <div class="flex justify-between">
                                <span class="text-gray-500">干细胞登记：</span>
                                <span class="font-medium">${this.formatDate(statistics.lastRegistrationDate)}</span>
                            </div>
                        ` : ''}
                        ${statistics.lastReportDate ? `
                            <div class="flex justify-between">
                                <span class="text-gray-500">检查报告：</span>
                                <span class="font-medium">${this.formatDate(statistics.lastReportDate)}</span>
                            </div>
                        ` : ''}
                        ${!statistics.lastAssessmentDate && !statistics.lastRegistrationDate && !statistics.lastReportDate ? `
                            <div class="text-center text-gray-500">暂无活动记录</div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
  }

  /**
     * 格式化日期
     * @param {string} dateString - 日期字符串
     * @returns {string} 格式化后的日期
     */
  formatDate(dateString) {
    if (!dateString) {return '';}
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN');
  }

  /**
     * 处理确认选择
     */
  handleSuccess() {
    if (this.currentOptions.onSuccess && this.currentCustomer) {
      this.currentOptions.onSuccess(this.currentCustomer);
    }
    this.closeLookupModal();
  }

  /**
     * 处理取消操作
     */
  handleCancel() {
    if (this.currentOptions.onCancel) {
      this.currentOptions.onCancel();
    }
    this.closeLookupModal();
  }

  /**
     * 关闭查找界面
     */
  closeLookupModal() {
    const modal = document.getElementById('customerLookupModal');
    if (modal) {
      modal.remove();
    }
    this.currentCustomer = null;
    this.currentOptions = null;
  }

  /**
     * 添加到查找历史
     * @param {string} identityCard - 身份证号
     * @param {Object} data - 查找结果
     */
  addToLookupHistory(identityCard, data) {
    // 检查是否已存在
    const existingIndex = this.lookupHistory.findIndex(item => item.identityCard === identityCard);

    // 安全地获取客户姓名，处理不同的数据结构
    let customerName = '未知客户';
    if (data && data.customerInfo) {
      customerName = data.customerInfo.name || data.customerInfo.Name || '未知客户';
    } else if (data && data.Name) {
      customerName = data.Name;
    } else if (data && data.name) {
      customerName = data.name;
    }

    const historyItem = {
      identityCard,
      customerName: customerName,
      lookupTime: new Date().toISOString(),
      data
    };

    if (existingIndex !== -1) {
      // 更新现有记录
      this.lookupHistory[existingIndex] = historyItem;
    } else {
      // 添加新记录
      this.lookupHistory.unshift(historyItem);
    }

    // 限制历史记录数量
    if (this.lookupHistory.length > 10) {
      this.lookupHistory = this.lookupHistory.slice(0, 10);
    }

    // 保存到本地存储
    this.saveLookupHistory();
  }

  /**
     * 保存查找历史到本地存储
     */
  saveLookupHistory() {
    try {
      localStorage.setItem('customerLookupHistory', JSON.stringify(this.lookupHistory));
    } catch (error) {
      console.warn('保存查找历史失败:', error);
    }
  }

  /**
     * 从本地存储加载查找历史
     */
  loadLookupHistory() {
    try {
      const saved = localStorage.getItem('customerLookupHistory');
      if (saved) {
        this.lookupHistory = JSON.parse(saved);
      }
    } catch (error) {
      console.warn('加载查找历史失败:', error);
    }
  }
}

// 创建全局实例
const customerLookup = new CustomerLookup();
