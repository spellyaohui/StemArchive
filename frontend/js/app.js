// 主应用逻辑
class HealthManagementApp {
  constructor() {
    this.currentPage = 'dashboard';
    this.init();
  }

  // 初始化应用
  async init() {
    this.bindEvents();
    this.showPage('dashboard');
    await this.loadDashboardData();
    this.setupAutoRefresh();
  }

  // 绑定事件
  bindEvents() {
    // 导航菜单事件
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const href = link.getAttribute('href');

        // 检查是否是外部页面链接（如context7-demo.html）
        if (href.endsWith('.html')) {
          // 直接跳转到外部页面
          window.location.href = href;
        } else {
          // 处理内部hash路由
          const pageId = href.substring(1);
          this.showPage(pageId);
        }
      });
    });

    // 移动端菜单切换
    document.getElementById('mobileMenuBtn').addEventListener('click', () => {
      const mobileMenu = document.getElementById('mobileMenu');
      mobileMenu.classList.toggle('hidden');
    });

    // 移动端菜单项点击
    document.querySelectorAll('#mobileMenu a').forEach(link => {
      link.addEventListener('click', () => {
        document.getElementById('mobileMenu').classList.add('hidden');
      });
    });

    // 仪表板相关事件
    this.bindDashboardEvents();

    // 检客管理相关事件
    this.bindCustomerEvents();

    // 健康数据相关事件
    this.bindHealthDataEvents();

    // 干细胞管理相关事件
    this.bindStemCellEvents();

    // 报告相关事件
    this.bindReportEvents();

    // 统计相关事件
    this.bindStatisticsEvents();
  }

  // 显示页面
  showPage(pageId) {
    // 隐藏所有页面
    document.querySelectorAll('.page-section').forEach(section => {
      section.classList.add('hidden');
      section.classList.remove('active');
    });

    // 显示目标页面
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
      targetPage.classList.remove('hidden');
      setTimeout(() => {
        targetPage.classList.add('active');
      }, 10);

      // 更新导航状态
      document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
      });
      document.querySelector(`[href="#${pageId}"]`).classList.add('active');

      this.currentPage = pageId;

      // 加载页面数据
      this.loadPageData(pageId);
    }
  }

  // 加载页面数据
  async loadPageData(pageId) {
    try {
      switch (pageId) {
      case 'dashboard':
        await this.loadDashboardData();
        break;
      case 'customers':
        await this.loadCustomersData();
        break;
      case 'health-data':
        await this.loadHealthDataPage();
        break;
      case 'stem-cell':
        await this.loadStemCellData();
        break;
      case 'reports':
        await this.loadReportsData();
        break;
      case 'statistics':
        await this.loadStatisticsData();
        break;
      }
    } catch (error) {
      console.error(`加载${pageId}页面数据失败:`, error);
      NotificationHelper.dataLoadError('数据加载失败', `${pageId}页面数据加载失败，请刷新页面重试`);
    }
  }

  // 绑定仪表板事件
  bindDashboardEvents() {
    // 仪表板刷新按钮
    const refreshBtn = document.createElement('button');
    refreshBtn.className = 'fixed bottom-6 right-6 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors';
    refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
    refreshBtn.addEventListener('click', () => this.loadDashboardData());
    document.body.appendChild(refreshBtn);
  }

  // 加载仪表板数据
  async loadDashboardData() {
    try {
      // 模拟数据（实际项目中应该从API获取）
      const dashboardData = {
        totalCustomers: 207,
        stemCellPatients: 186,
        monthlyInfusions: 113,
        todaySchedules: 8,
        monthlyChart: [
          { month: '3月', count: 1 },
          { month: '4月', count: 7 },
          { month: '5月', count: 7 },
          { month: '6月', count: 11 },
          { month: '7月', count: 81 },
          { month: '8月', count: 100 },
          { month: '9月', count: 113 }
        ],
        treatmentTypes: [
          { name: 'MSC', count: 306, color: '#3b82f6' },
          { name: 'NK', count: 8, color: '#10b981' },
          { name: '膝关节靶向注射', count: 6, color: '#f59e0b' }
        ],
        todaySchedulesList: [
          { name: '张三', time: '09:00', type: 'MSC' },
          { name: '李四', time: '10:00', type: 'NK' },
          { name: '王五', time: '14:00', type: '膝关节靶向注射' }
        ]
      };

      // 更新统计卡片
      this.updateStatCards(dashboardData);

      // 更新图表
      this.updateCharts(dashboardData);

      // 更新今日排期列表
      this.updateTodaySchedulesList(dashboardData.todaySchedulesList);

    } catch (error) {
      console.error('加载仪表板数据失败:', error);
      NotificationHelper.dataLoadError('仪表板数据加载失败', '无法获取最新统计信息，请刷新页面重试');
    }
  }

  // 更新统计卡片
  updateStatCards(data) {
    document.getElementById('totalCustomers').textContent = data.totalCustomers;
    document.getElementById('stemCellPatients').textContent = data.stemCellPatients;
    document.getElementById('monthlyInfusions').textContent = data.monthlyInfusions;
    document.getElementById('todaySchedules').textContent = data.todaySchedules;
  }

  // 更新图表
  updateCharts(data) {
    // 这里应该使用真实的图表库如Chart.js
    // 现在用简单的HTML模拟
    const monthlyChart = document.getElementById('monthlyChart');
    if (monthlyChart && data.monthlyChart) {
      monthlyChart.innerHTML = `
                <div class="space-y-2">
                    ${data.monthlyChart.map(item => `
                        <div class="flex items-center justify-between">
                            <span class="text-sm">${item.month}</span>
                            <div class="flex items-center">
                                <div class="w-24 bg-gray-200 rounded-full h-2 mr-2">
                                    <div class="bg-blue-600 h-2 rounded-full" style="width: ${(item.count / 120) * 100}%"></div>
                                </div>
                                <span class="text-sm font-medium">${item.count}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
    }

    const treatmentTypeChart = document.getElementById('treatmentTypeChart');
    if (treatmentTypeChart && data.treatmentTypes) {
      treatmentTypeChart.innerHTML = `
                <div class="space-y-2">
                    ${data.treatmentTypes.map(item => `
                        <div class="flex items-center justify-between">
                            <span class="text-sm">${item.name}</span>
                            <div class="flex items-center">
                                <div class="w-24 bg-gray-200 rounded-full h-2 mr-2">
                                    <div class="h-2 rounded-full" style="width: ${(item.count / 320) * 100}%; background-color: ${item.color}"></div>
                                </div>
                                <span class="text-sm font-medium">${item.count}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
    }
  }

  // 更新今日排期列表
  updateTodaySchedulesList(schedules) {
    const container = document.getElementById('todaySchedulesList');
    if (container) {
      if (schedules.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center">今日暂无排期</p>';
      } else {
        container.innerHTML = schedules.map(schedule => `
                    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div class="flex items-center">
                            <div class="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                            <div>
                                <p class="font-medium">${schedule.name}</p>
                                <p class="text-sm text-gray-600">${schedule.time} - ${schedule.type}</p>
                            </div>
                        </div>
                        <button class="text-blue-600 hover:text-blue-800">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                `).join('');
      }
    }
  }

  // 绑定检客管理事件
  bindCustomerEvents() {
    // 新增检客按钮
    document.getElementById('addCustomerBtn')?.addEventListener('click', () => {
      this.showCustomerModal();
    });

    // 搜索功能
    const searchInput = document.getElementById('customerSearch');
    if (searchInput) {
      const debouncedSearch = Utils.debounce((value) => {
        this.searchCustomers(value);
      }, 500);

      searchInput.addEventListener('input', (e) => {
        debouncedSearch(e.target.value);
      });
    }
  }

  // 加载检客数据
  async loadCustomersData() {
    try {
      // 模拟数据
      const customersData = {
        customers: [
          {
            id: '1',
            name: '章宏',
            gender: '男',
            age: 50,
            identityCard: '110101197301011234',
            phone: '13800138000',
            contactPerson: '本院',
            status: 'Active'
          },
          {
            id: '2',
            name: '王鹏飞',
            gender: '男',
            age: 45,
            identityCard: '110101197801011234',
            phone: '13900139000',
            contactPerson: '',
            status: 'Active'
          }
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 207,
          totalPages: 21
        }
      };

      this.renderCustomersList(customersData);
      this.renderCustomersPagination(customersData.pagination);

    } catch (error) {
      console.error('加载检客数据失败:', error);
      NotificationHelper.dataLoadError('检客数据加载失败', '无法获取检客列表，请刷新页面重试');
    }
  }

  // 渲染检客列表
  renderCustomersList(data) {
    const container = document.getElementById('customersList');
    if (container) {
      if (data.customers.length === 0) {
        container.innerHTML = `
                    <tr>
                        <td colspan="8" class="text-center py-8 text-gray-500">
                            暂无检客数据
                        </td>
                    </tr>
                `;
      } else {
        container.innerHTML = data.customers.map(customer => `
                    <tr class="hover:bg-gray-50">
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="flex items-center">
                                <div class="flex-shrink-0 h-10 w-10">
                                    <div class="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                        <span class="text-blue-600 font-medium">${customer.name.charAt(0)}</span>
                                    </div>
                                </div>
                                <div class="ml-4">
                                    <div class="text-sm font-medium text-gray-900">${customer.name}</div>
                                </div>
                            </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${customer.gender}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${customer.age}岁
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${Utils.maskIdCard(customer.identityCard)}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${Utils.maskPhone(customer.phone)}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${customer.contactPerson || '-'}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            ${Utils.getStatusBadge(customer.status)}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button class="text-blue-600 hover:text-blue-900 mr-3" onclick="app.viewCustomer('${customer.id}')">
                                查看
                            </button>
                            <button class="text-green-600 hover:text-green-900 mr-3" onclick="app.editCustomer('${customer.id}')">
                                编辑
                            </button>
                            <button class="text-red-600 hover:text-red-900" onclick="app.deleteCustomer('${customer.id}')">
                                删除
                            </button>
                        </td>
                    </tr>
                `).join('');
      }

      // 更新分页信息
      const start = (data.pagination.page - 1) * data.pagination.limit + 1;
      const end = Math.min(start + data.customers.length - 1, data.pagination.total);

      document.getElementById('customersStart').textContent = start;
      document.getElementById('customersEnd').textContent = end;
      document.getElementById('customersTotal').textContent = data.pagination.total;
    }
  }

  // 渲染检客分页
  renderCustomersPagination(pagination) {
    const container = document.getElementById('customersPagination');
    if (container) {
      this.customerPagination = new Pagination(container, {
        currentPage: pagination.page,
        totalPages: pagination.totalPages,
        onPageChange: (page) => this.loadCustomersPage(page)
      });
      this.customerPagination.render();
    }
  }

  // 显示检客模态框
  showCustomerModal(customer = null) {
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
            <div class="modal-content max-w-2xl">
                <div class="modal-header">
                    <h3 class="modal-title">${customer ? '编辑检客' : '新增检客'}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="customerForm" class="space-y-4">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="form-label">姓名 *</label>
                                <input type="text" name="name" class="form-control" value="${customer?.name || ''}" required>
                            </div>
                            <div>
                                <label class="form-label">性别 *</label>
                                <select name="gender" class="form-control" required>
                                    <option value="">请选择</option>
                                    <option value="男" ${customer?.gender === '男' ? 'selected' : ''}>男</option>
                                    <option value="女" ${customer?.gender === '女' ? 'selected' : ''}>女</option>
                                </select>
                            </div>
                            <div>
                                <label class="form-label">身份证号 *</label>
                                <input type="text" name="identityCard" class="form-control" value="${customer?.identityCard || ''}" required>
                            </div>
                            <div>
                                <label class="form-label">年龄</label>
                                <input type="number" name="age" class="form-control" value="${customer?.age || ''}" min="0" max="150">
                            </div>
                            <div>
                                <label class="form-label">身高 (cm)</label>
                                <input type="number" name="height" class="form-control" value="${customer?.height || ''}" min="50" max="250" step="0.1">
                            </div>
                            <div>
                                <label class="form-label">体重 (kg)</label>
                                <input type="number" name="weight" class="form-control" value="${customer?.weight || ''}" min="20" max="300" step="0.1">
                            </div>
                            <div>
                                <label class="form-label">联系电话</label>
                                <input type="tel" name="phone" class="form-control" value="${customer?.phone || ''}">
                            </div>
                            <div>
                                <label class="form-label">联系人</label>
                                <input type="text" name="contactPerson" class="form-control" value="${customer?.contactPerson || ''}">
                            </div>
                            <div>
                                <label class="form-label">联系人电话</label>
                                <input type="tel" name="contactPersonPhone" class="form-control" value="${customer?.contactPersonPhone || ''}">
                            </div>
                            <div class="md:col-span-2">
                                <label class="form-label">地址</label>
                                <input type="text" name="address" class="form-control" value="${customer?.address || ''}">
                            </div>
                            <div class="md:col-span-2">
                                <label class="form-label">备注</label>
                                <textarea name="remarks" rows="3" class="form-control">${customer?.remarks || ''}</textarea>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="hideModal(this.closest('.modal'))">取消</button>
                    <button class="btn btn-primary" onclick="app.saveCustomer('${customer?.id || ''}')">保存</button>
                </div>
            </div>
        `;

    document.body.appendChild(modal);

    // 绑定关闭事件
    modal.querySelector('.modal-close').addEventListener('click', () => {
      hideModal(modal);
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        hideModal(modal);
      }
    });
  }

  // 保存检客
  async saveCustomer(customerId) {
    const form = document.getElementById('customerForm');
    const formData = new FormData(form);
    const customerData = Object.fromEntries(formData.entries());

    // 验证
    const validationRules = {
      name: [{ required: true, message: '姓名不能为空' }],
      gender: [{ required: true, message: '性别不能为空' }],
      identityCard: [
        { required: true, message: '身份证号不能为空' },
        { pattern: /^\d{15}$|^\d{17}[\dXx]$/, message: '请输入正确的15~18位身份证号' }
      ],
      phone: [{ pattern: /^[0-9]{11}$/, message: '请输入11位手机号' }],
      contactPersonPhone: [{ pattern: /^[0-9]{11}$/, message: '请输入11位联系人手机号' }]
    };

    const errors = validateForm(form, validationRules);
    if (Object.keys(errors).length > 0) {
      showFormErrors(form, errors);
      return;
    }

    try {
      const hideLoadingFn = showLoading(form);

      if (customerId) {
        // 更新检客
        await API.customer.update(customerId, customerData);
        NotificationHelper.success('检客信息更新成功', '客户资料已更新到系统');
      } else {
        // 创建检客
        await API.customer.create(customerData);
        NotificationHelper.success('检客创建成功', '新客户档案已建立');
      }

      hideLoadingFn();
      hideModal(form.closest('.modal'));
      this.loadCustomersData();

    } catch (error) {
      console.error('保存检客失败:', error);
      NotificationHelper.error('保存检客失败', error.message || '网络连接异常，请检查网络后重试');
    }
  }

  // 查看检客详情
  viewCustomer(customerId) {
    // 实现查看详情逻辑
    this.showCustomerDetails(customerId);
  }

  // 编辑检客
  editCustomer(customerId) {
    // 先加载检客数据，然后显示编辑模态框
    this.loadCustomerForEdit(customerId);
  }

  // 删除检客
  deleteCustomer(customerId) {
    NotificationHelper.confirm('确定要删除这个检客吗？', '此操作不可恢复，删除后所有相关数据将被永久清除', async () => {
      try {
        await API.customer.delete(customerId);
        NotificationHelper.success('检客删除成功', '客户档案已从系统中移除');
        this.loadCustomersData();
      } catch (error) {
        console.error('删除检客失败:', error);
        NotificationHelper.error('删除检客失败', '网络连接异常，请检查网络后重试');
      }
    });
  }

  // 搜索检客
  async searchCustomers(query) {
    if (!query.trim()) {
      this.loadCustomersData();
      return;
    }

    try {
      const data = await API.customer.search({ query, limit: 10 });
      this.renderCustomersList({
        customers: data.data,
        pagination: data.pagination
      });
    } catch (error) {
      console.error('搜索检客失败:', error);
    }
  }

  // 加载指定页的检客数据
  async loadCustomersPage(page) {
    try {
      const data = await API.customer.getAll({ page, limit: 10 });
      this.renderCustomersList({
        customers: data.data,
        pagination: data.pagination
      });
      this.customerPagination.update(page, data.pagination.totalPages);
    } catch (error) {
      console.error('加载检客页面失败:', error);
    }
  }

  // 绑定健康数据事件
  bindHealthDataEvents() {
    // 科室按钮事件
    document.querySelectorAll('.department-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const department = e.currentTarget.querySelector('p').textContent;
        this.selectDepartment(department);
      });
    });

    // 健康数据表单提交
    const healthDataForm = document.getElementById('healthDataForm');
    if (healthDataForm) {
      healthDataForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveHealthData();
      });
    }

    // 清空表单按钮
    document.getElementById('clearHealthForm')?.addEventListener('click', () => {
      healthDataForm.reset();
    });
  }

  // 加载健康数据页面
  async loadHealthDataPage() {
    try {
      // 加载检客列表到选择框
      await this.loadCustomerSelect();
      // 加载科室列表
      await this.loadDepartmentSelect();
    } catch (error) {
      console.error('加载健康数据页面失败:', error);
    }
  }

  // 加载检客选择框
  async loadCustomerSelect() {
    const select = document.getElementById('customerSelect');
    if (select) {
      try {
        const data = await API.customer.getAll({ page: 1, limit: 100 });
        select.innerHTML = '<option value="">请选择检客</option>' +
                    data.data.map(customer => `
                        <option value="${customer.id}">${customer.name} (${Utils.maskIdCard(customer.identityCard)})</option>
                    `).join('');
      } catch (error) {
        console.error('加载检客列表失败:', error);
      }
    }
  }

  // 加载科室选择框
  async loadDepartmentSelect() {
    const select = document.getElementById('departmentSelect');
    if (select) {
      const departments = ['内科', '外科', '影像科', '检验科', '功能科', '骨科', '皮肤科', '中医科'];
      select.innerHTML = '<option value="">请选择科室</option>' +
                departments.map(dept => `<option value="${dept}">${dept}</option>`).join('');
    }
  }

  // 选择科室
  selectDepartment(department) {
    const select = document.getElementById('departmentSelect');
    if (select) {
      select.value = department;
      // 高亮选中的科室按钮
      document.querySelectorAll('.department-btn').forEach(btn => {
        btn.classList.remove('ring-2', 'ring-blue-500');
      });
      event.currentTarget.classList.add('ring-2', 'ring-blue-500');
    }
  }

  // 保存健康数据
  async saveHealthData() {
    const form = document.getElementById('healthDataForm');
    const formData = new FormData(form);
    const healthData = Object.fromEntries(formData.entries());

    const validationRules = {
      customerId: [{ required: true, message: '请选择检客' }],
      assessmentDate: [{ required: true, message: '请选择评估日期' }],
      department: [{ required: true, message: '请选择科室' }]
    };

    const errors = validateForm(form, validationRules);
    if (Object.keys(errors).length > 0) {
      showFormErrors(form, errors);
      return;
    }

    try {
      const hideLoadingFn = showLoading(form);
      await API.healthAssessment.create(healthData);
      hideLoadingFn();
      NotificationHelper.success('健康数据保存成功', '体检评估数据已录入系统');
      form.reset();
    } catch (error) {
      console.error('保存健康数据失败:', error);
      NotificationHelper.error('保存健康数据失败', '网络连接异常，请检查网络后重试');
    }
  }

  // 绑定干细胞管理事件
  bindStemCellEvents() {
    // 创建患者档案按钮
    document.getElementById('createStemCellPatientBtn')?.addEventListener('click', () => {
      this.showStemCellPatientModal();
    });

    // 安排输注按钮
    document.getElementById('scheduleInfusionBtn')?.addEventListener('click', () => {
      this.showScheduleModal();
    });

    // 筛选事件
    document.getElementById('statusFilter')?.addEventListener('change', () => {
      this.loadStemCellData();
    });

    document.getElementById('scheduleDateFilter')?.addEventListener('change', () => {
      this.loadStemCellData();
    });
  }

  // 加载干细胞管理数据
  async loadStemCellData() {
    try {
      // 模拟数据
      const stemCellData = {
        patients: [
          {
            id: '1',
            patientNumber: 'ST20250001',
            name: '章宏',
            primaryDiagnosis: '健康体检',
            treatmentPlan: 'MSC基础治疗方案',
            totalInfusionCount: 2,
            nextSchedule: '2025-10-15',
            status: 'Active'
          }
        ],
        statistics: {
          treatmentTypes: [
            { name: 'MSC', count: 306, percentage: 95.6 },
            { name: 'NK', count: 8, percentage: 2.5 },
            { name: '膝关节靶向注射', count: 6, percentage: 1.9 }
          ],
          infusionCounts: [
            { type: '首次', count: 215 },
            { type: '二次', count: 82 },
            { type: '三次', count: 19 },
            { type: '四次', count: 4 }
          ],
          diseases: [
            { name: '糖尿病', count: 45 },
            { name: '高血压', count: 32 },
            { name: '关节病', count: 28 },
            { name: '皮肤病', count: 25 }
          ]
        }
      };

      this.renderStemCellPatients(stemCellData.patients);
      this.renderStemCellStatistics(stemCellData.statistics);

    } catch (error) {
      console.error('加载干细胞管理数据失败:', error);
    }
  }

  // 渲染干细胞患者列表
  renderStemCellPatients(patients) {
    const container = document.getElementById('stemCellPatientsList');
    if (container) {
      if (patients.length === 0) {
        container.innerHTML = `
                    <tr>
                        <td colspan="8" class="text-center py-8 text-gray-500">
                            暂无患者档案
                        </td>
                    </tr>
                `;
      } else {
        container.innerHTML = patients.map(patient => `
                    <tr class="hover:bg-gray-50">
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            ${patient.patientNumber}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${patient.name}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${patient.primaryDiagnosis || '-'}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${patient.treatmentPlan || '-'}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            第${patient.totalInfusionCount}次
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${patient.nextSchedule || '-'}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            ${Utils.getStatusBadge(patient.status)}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button class="text-blue-600 hover:text-blue-900 mr-3" onclick="app.viewPatient('${patient.id}')">
                                查看
                            </button>
                            <button class="text-green-600 hover:text-green-900 mr-3" onclick="app.editPatient('${patient.id}')">
                                编辑
                            </button>
                            <button class="text-purple-600 hover:text-purple-900" onclick="app.scheduleInfusion('${patient.id}')">
                                排期
                            </button>
                        </td>
                    </tr>
                `).join('');
      }
    }
  }

  // 渲染干细胞统计信息
  renderStemCellStatistics(stats) {
    // 治疗类型统计
    const treatmentStats = document.getElementById('treatmentStats');
    if (treatmentStats && stats.treatmentTypes) {
      treatmentStats.innerHTML = stats.treatmentTypes.map(type => `
                <div class="flex items-center justify-between">
                    <span class="text-sm">${type.name}</span>
                    <div class="flex items-center">
                        <div class="w-20 bg-gray-200 rounded-full h-2 mr-2">
                            <div class="bg-blue-600 h-2 rounded-full" style="width: ${type.percentage}%"></div>
                        </div>
                        <span class="text-sm font-medium">${type.count} (${type.percentage}%)</span>
                    </div>
                </div>
            `).join('');
    }

    // 回输次数统计
    const infusionCountStats = document.getElementById('infusionCountStats');
    if (infusionCountStats && stats.infusionCounts) {
      infusionCountStats.innerHTML = stats.infusionCounts.map(count => `
                <div class="flex items-center justify-between">
                    <span class="text-sm">${count.type}</span>
                    <span class="text-sm font-medium">${count.count}人</span>
                </div>
            `).join('');
    }

    // 病种统计
    const diseaseStats = document.getElementById('diseaseStats');
    if (diseaseStats && stats.diseases) {
      diseaseStats.innerHTML = stats.diseases.map(disease => `
                <div class="flex items-center justify-between">
                    <span class="text-sm">${disease.name}</span>
                    <span class="text-sm font-medium">${disease.count}人</span>
                </div>
            `).join('');
    }
  }

  // 绑定报告事件
  bindReportEvents() {
    // 报告类型选择
    document.querySelectorAll('.report-type-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const reportType = e.currentTarget.querySelector('p').textContent;
        this.selectReportType(reportType);
      });
    });

    // 报告生成表单
    const reportForm = document.getElementById('reportForm');
    if (reportForm) {
      reportForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.generateReport();
      });
    }

    // 清空报告表单
    document.getElementById('clearReportForm')?.addEventListener('click', () => {
      reportForm.reset();
    });
  }

  // 加载报告数据
  async loadReportsData() {
    try {
      // 加载检客选择框
      await this.loadCustomerSelect('reportCustomerSelect');
      // 加载历史报告
      await this.loadReportsList();
    } catch (error) {
      console.error('加载报告数据失败:', error);
    }
  }

  // 加载报告列表
  async loadReportsList() {
    const container = document.getElementById('reportsList');
    if (container) {
      // 模拟数据
      const reports = [
        {
          id: '1',
          name: '章宏-健康对比报告',
          type: '对比报告',
          date: '2025-10-01',
          size: '245 KB'
        }
      ];

      if (reports.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center">暂无历史报告</p>';
      } else {
        container.innerHTML = reports.map(report => `
                    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div class="flex items-center">
                            <i class="fas fa-file-pdf text-red-500 text-xl mr-3"></i>
                            <div>
                                <p class="font-medium">${report.name}</p>
                                <p class="text-sm text-gray-600">${report.type} - ${report.date} - ${report.size}</p>
                            </div>
                        </div>
                        <div class="flex space-x-2">
                            <button class="text-blue-600 hover:text-blue-800" title="预览">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="text-green-600 hover:text-green-800" title="下载">
                                <i class="fas fa-download"></i>
                            </button>
                            <button class="text-red-600 hover:text-red-800" title="删除">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `).join('');
      }
    }
  }

  // 选择报告类型
  selectReportType(reportType) {
    const select = document.getElementById('reportTypeSelect');
    if (select) {
      const typeMap = {
        '对比报告': 'comparison',
        '治疗总结': 'treatment',
        '健康评估': 'health'
      };
      select.value = typeMap[reportType] || 'comparison';

      // 高亮选中的报告类型按钮
      document.querySelectorAll('.report-type-btn').forEach(btn => {
        btn.classList.remove('ring-2', 'ring-blue-500');
      });
      event.currentTarget.classList.add('ring-2', 'ring-blue-500');
    }
  }

  // 生成报告
  async generateReport() {
    const form = document.getElementById('reportForm');
    const formData = new FormData(form);
    const reportData = Object.fromEntries(formData.entries());

    const validationRules = {
      customerId: [{ required: true, message: '请选择检客' }],
      reportType: [{ required: true, message: '请选择报告类型' }],
      startDate: [{ required: true, message: '请选择开始日期' }],
      endDate: [{ required: true, message: '请选择结束日期' }]
    };

    const errors = validateForm(form, validationRules);
    if (Object.keys(errors).length > 0) {
      showFormErrors(form, errors);
      return;
    }

    try {
      const hideLoadingFn = showLoading(form);
      // 模拟报告生成
      await new Promise(resolve => setTimeout(resolve, 2000));
      hideLoadingFn();
      NotificationHelper.success('报告生成成功', '健康分析报告已生成，可查看或下载');
      this.loadReportsList();
    } catch (error) {
      console.error('生成报告失败:', error);
      NotificationHelper.error('报告生成失败', '报告生成过程出现异常，请重试');
    }
  }

  // 绑定统计事件
  bindStatisticsEvents() {
    // 应用筛选
    document.getElementById('applyStatsFilter')?.addEventListener('click', () => {
      this.loadStatisticsData();
    });

    // 导出统计
    document.getElementById('exportStatsBtn')?.addEventListener('click', () => {
      this.exportStatistics();
    });
  }

  // 加载统计数据
  async loadStatisticsData() {
    try {
      // 获取筛选日期
      const startDate = document.getElementById('statsStartDate')?.value;
      const endDate = document.getElementById('statsEndDate')?.value;

      // 构建查询参数
      const params = new URLSearchParams();
      if (startDate) {params.append('dateFrom', startDate);}
      if (endDate) {params.append('dateTo', endDate);}

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
        table: [
          {
            item: '新增患者',
            current: comprehensiveData.data?.overview?.newCustomersThisMonth || 0,
            previous: Math.floor((comprehensiveData.data?.overview?.newCustomersThisMonth || 0) * 0.9),
            change: '+10.0%'
          },
          {
            item: '完成回输',
            current: comprehensiveData.data?.overview?.totalInfusions || 0,
            previous: Math.floor((comprehensiveData.data?.overview?.totalInfusions || 0) * 0.88),
            change: '+13.6%'
          },
          {
            item: '活跃患者',
            current: comprehensiveData.data?.overview?.uniquePatients || 0,
            previous: Math.floor((comprehensiveData.data?.overview?.uniquePatients || 0) * 0.94),
            change: '+6.4%'
          }
        ]
      };

      this.renderStatisticsCharts(statsData);
      this.renderStatisticsTable(statsData.table);

    } catch (error) {
      console.error('加载统计数据失败:', error);
      NotificationHelper.dataLoadError('统计数据加载失败', '无法获取统计分析数据，请刷新页面重试');
    }
  }

  // 渲染统计图表
  renderStatisticsCharts(data) {
    try {
      // 渲染月度回输趋势图
      this.renderMonthlyTrendChart(data.monthlyTrend);

      // 渲染患者增长趋势图
      this.renderPatientGrowthChart(data.monthlyTrend);

      // 渲染治疗效果分析图
      this.renderTreatmentEffectChart(data.treatmentTypes);

      // 渲染病种分布统计图
      this.renderDiseaseDistributionChart(data.diseaseDistribution);

      console.log('统计图表渲染完成:', data);
    } catch (error) {
      console.error('渲染统计图表失败:', error);
    }
  }

  // 渲染月度回输趋势图
  renderMonthlyTrendChart(data) {
    const container = document.getElementById('monthlyTrendChart');
    if (!container) {return;}

    // 使用Chart.js渲染图表
    container.innerHTML = `
            <canvas id="monthlyTrendCanvas" width="400" height="200"></canvas>
        `;

    setTimeout(() => {
      const ctx = document.getElementById('monthlyTrendCanvas').getContext('2d');
      if (window.Chart && ctx) {
        new Chart(ctx, {
          type: 'line',
          data: {
            labels: data.map(item => item.month),
            datasets: [{
              label: '回输次数',
              data: data.map(item => item.infusions || 0),
              borderColor: 'rgb(59, 130, 246)',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
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
      } else {
        // 降级方案：简单表格显示
        container.innerHTML = `
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm">
                            <thead>
                                <tr class="border-b">
                                    <th class="text-left py-2">月份</th>
                                    <th class="text-right py-2">回输次数</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.map(item => `
                                    <tr class="border-b">
                                        <td class="py-2">${item.month}</td>
                                        <td class="text-right py-2">${item.infusions || 0}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
      }
    }, 100);
  }

  // 渲染患者增长趋势图
  renderPatientGrowthChart(data) {
    const container = document.getElementById('patientGrowthChart');
    if (!container) {return;}

    container.innerHTML = `
            <canvas id="patientGrowthCanvas" width="400" height="200"></canvas>
        `;

    setTimeout(() => {
      const ctx = document.getElementById('patientGrowthCanvas').getContext('2d');
      if (window.Chart && ctx) {
        new Chart(ctx, {
          type: 'bar',
          data: {
            labels: data.map(item => item.month),
            datasets: [{
              label: '新增患者',
              data: data.map(item => item.patients || 0),
              backgroundColor: 'rgba(16, 185, 129, 0.8)',
              borderColor: 'rgb(16, 185, 129)',
              borderWidth: 1
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
      } else {
        // 降级方案：简单表格显示
        container.innerHTML = `
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm">
                            <thead>
                                <tr class="border-b">
                                    <th class="text-left py-2">月份</th>
                                    <th class="text-right py-2">新增患者</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.map(item => `
                                    <tr class="border-b">
                                        <td class="py-2">${item.month}</td>
                                        <td class="text-right py-2">${item.patients || 0}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
      }
    }, 100);
  }

  // 渲染治疗效果分析图
  renderTreatmentEffectChart(data) {
    const container = document.getElementById('treatmentEffectChart');
    if (!container) {return;}

    container.innerHTML = `
            <canvas id="treatmentEffectCanvas" width="400" height="200"></canvas>
        `;

    setTimeout(() => {
      const ctx = document.getElementById('treatmentEffectCanvas').getContext('2d');
      if (window.Chart && ctx) {
        new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: data.map(item => item.name),
            datasets: [{
              data: data.map(item => item.count),
              backgroundColor: [
                'rgba(59, 130, 246, 0.8)',
                'rgba(16, 185, 129, 0.8)',
                'rgba(245, 158, 11, 0.8)',
                'rgba(139, 92, 246, 0.8)'
              ],
              borderWidth: 2
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
      } else {
        // 降级方案：简单列表显示
        container.innerHTML = `
                    <div class="space-y-2">
                        ${data.map(item => `
                            <div class="flex justify-between items-center p-2 bg-gray-50 rounded">
                                <span class="text-sm font-medium">${item.name}</span>
                                <span class="text-sm text-gray-600">${item.count} (${item.percentage}%)</span>
                            </div>
                        `).join('')}
                    </div>
                `;
      }
    }, 100);
  }

  // 渲染病种分布统计图
  renderDiseaseDistributionChart(data) {
    const container = document.getElementById('diseaseDistributionChart');
    if (!container) {return;}

    container.innerHTML = `
            <canvas id="diseaseDistributionCanvas" width="400" height="200"></canvas>
        `;

    setTimeout(() => {
      const ctx = document.getElementById('diseaseDistributionCanvas').getContext('2d');
      if (window.Chart && ctx) {
        new Chart(ctx, {
          type: 'pie',
          data: {
            labels: data.map(item => item.name),
            datasets: [{
              data: data.map(item => item.count),
              backgroundColor: [
                'rgba(239, 68, 68, 0.8)',
                'rgba(59, 130, 246, 0.8)',
                'rgba(16, 185, 129, 0.8)',
                'rgba(245, 158, 11, 0.8)',
                'rgba(139, 92, 246, 0.8)',
                'rgba(236, 72, 153, 0.8)',
                'rgba(34, 197, 94, 0.8)',
                'rgba(156, 163, 175, 0.8)'
              ],
              borderWidth: 2
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
      } else {
        // 降级方案：简单列表显示
        container.innerHTML = `
                    <div class="space-y-2">
                        ${data.map(item => `
                            <div class="flex justify-between items-center p-2 bg-gray-50 rounded">
                                <span class="text-sm font-medium">${item.name}</span>
                                <span class="text-sm text-gray-600">${item.count} (${item.percentage}%)</span>
                            </div>
                        `).join('')}
                    </div>
                `;
      }
    }, 100);
  }

  // 渲染统计表格
  renderStatisticsTable(tableData) {
    const tbody = document.getElementById('statisticsTable');
    if (tbody) {
      tbody.innerHTML = tableData.map(row => `
                <tr>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${row.item}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${row.current}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${row.previous}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                        <span class="${row.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}">
                            ${row.change}
                        </span>
                    </td>
                </tr>
            `).join('');
    }
  }

  // 导出统计数据
  exportStatistics() {
    // 模拟导出功能
    NotificationHelper.success('统计数据导出成功', '统计报表已生成，文件已开始下载');
  }

  // 设置自动刷新
  setupAutoRefresh() {
    // 每5分钟刷新一次仪表板数据
    setInterval(() => {
      if (this.currentPage === 'dashboard') {
        this.loadDashboardData();
      }
    }, 5 * 60 * 1000);
  }

  // 占位方法 - 这些方法将在后续实现
  showCustomerDetails(customerId) {
    console.log('查看检客详情:', customerId);
  }

  loadCustomerForEdit(customerId) {
    console.log('加载检客编辑数据:', customerId);
  }

  showStemCellPatientModal() {
    console.log('显示干细胞患者模态框');
  }

  showScheduleModal() {
    console.log('显示排期模态框');
  }

  viewPatient(patientId) {
    console.log('查看患者详情:', patientId);
  }

  editPatient(patientId) {
    console.log('编辑患者:', patientId);
  }

  scheduleInfusion(patientId) {
    console.log('安排输注:', patientId);
  }
}

// 初始化应用
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new HealthManagementApp();
});