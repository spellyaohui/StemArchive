/**
 * 干细胞管理页面脚本
 * 负责干细胞患者档案和治疗方案管理
 */

class StemCellManager {
  constructor() {
    this.patients = [];
    this.currentPage = 1;
    this.pageSize = 10;
    this.totalPatients = 0;
    this.filters = {
      date: '',
      status: ''
    };
    this.init();
  }

  init() {
    this.loadPatients();
    this.loadStatistics();
    this.bindEvents();
  }

  // 加载患者列表（使用分页API）
  async loadPatients() {
    try {
      // 确保分页参数有默认值
      const params = {
        page: this.currentPage || 1,
        limit: this.pageSize || 10
      };

      if (this.filters.status) {
        params.status = this.filters.status;
      }

      const result = await window.API.stemCell.patients.getAll(params);

      if (result.status === 'Success') {
        this.patients = result.data || [];
        this.totalPatients = result.pagination?.total || this.patients.length;
        this.renderPatientsList();
        this.renderPagination(result.pagination);
        this.updatePaginationInfo(); // 更新分页信息显示
      } else {
        throw new Error(result.message || '获取患者列表失败');
      }

    } catch (error) {
      console.error('加载患者列表失败:', error);
      showNotification('加载患者列表失败: ' + error.message, 'error');
    }
  }

  // 加载统计数据
  async loadStatistics() {
    try {
      // 使用专门的统计API获取统计数据
      const result = await window.API.service.get('/stem-cell/dashboard/statistics');

      if (result.status === 'Success') {
        this.updateStatistics(result.data);
      } else {
        console.error('获取统计数据失败:', result.message);
      }
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  }

  // 更新统计数据
  updateStatistics(stats) {
    console.log('更新统计数据:', stats);

    // 更新治疗类型统计
    const treatmentStatsEl = document.getElementById('treatmentStats');
    if (treatmentStatsEl && stats.treatmentTypes) {
      treatmentStatsEl.innerHTML = stats.treatmentTypes.map(item => `
                <div class="flex justify-between items-center">
                    <span class="text-sm text-gray-600">${item.name}</span>
                    <span class="text-sm font-medium text-gray-900">${item.count}例</span>
                </div>
            `).join('');
      console.log('✅ 治疗类型统计已更新');
    }

    // 更新回输次数分布
    const infusionStatsEl = document.getElementById('infusionCountStats');
    if (infusionStatsEl && stats.infusionCounts) {
      infusionStatsEl.innerHTML = stats.infusionCounts.map(item => `
                <div class="flex justify-between items-center">
                    <span class="text-sm text-gray-600">${item.type}</span>
                    <span class="text-sm font-medium text-gray-900">${item.count}人</span>
                </div>
            `).join('');
      console.log('✅ 回输次数分布已更新');
    }

    // 更新病种分布
    const diseaseStatsEl = document.getElementById('diseaseStats');
    if (diseaseStatsEl && stats.diseases) {
      diseaseStatsEl.innerHTML = stats.diseases.map(item => `
                <div class="flex justify-between items-center">
                    <span class="text-sm text-gray-600">${item.name}</span>
                    <span class="text-sm font-medium text-gray-900">${item.count}例</span>
                </div>
            `).join('');
      console.log('✅ 病种分布已更新');
    }
  }

  // 渲染患者列表
  renderPatientsList() {
    const container = document.getElementById('stemCellPatientsList');
    if (!container) {return;}

    console.log('渲染患者列表，患者数量:', this.patients.length);

    if (this.patients.length === 0) {
      container.innerHTML = `
                <tr>
                    <td colspan="8" class="px-6 py-8 text-center text-gray-500">
                        <i class="fas fa-user-injured text-3xl mb-2"></i>
                        <p>暂无患者数据</p>
                    </td>
                </tr>
            `;
      console.log('✅ 患者列表渲染完成：无数据');
      return;
    }

    container.innerHTML = this.patients.map((patient, index) => `
            <tr class="hover:bg-gray-50 cursor-pointer patient-row ${index === 0 ? 'selected' : ''}"
                data-patient-id="${patient.ID}"
                onclick="stemCellManager.selectPatient('${patient.ID}')">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <div class="flex items-center">
                        <input type="radio" name="selectedPatient" value="${patient.ID}"
                               class="mr-3" ${index === 0 ? 'checked' : ''}>
                        ${patient.PatientNumber || 'N/A'}
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                            <i class="fas fa-user text-green-600 text-sm"></i>
                        </div>
                        <div class="font-medium text-gray-900">${patient.CustomerName || 'N/A'}</div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${patient.PrimaryDiagnosis || 'N/A'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${patient.TreatmentPlan || 'N/A'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                        ${patient.TotalInfusionCount || 0}次
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${patient.next_schedule || '-'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${this.getStatusClass(patient.Status)}">
                        ${this.getStatusText(patient.Status)}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onclick="event.stopPropagation(); stemCellManager.viewPatient('${patient.ID}')"
                            class="text-blue-600 hover:text-blue-900 mr-3">
                        <i class="fas fa-eye"></i> 查看
                    </button>
                    <button onclick="event.stopPropagation(); stemCellManager.editPatient('${patient.ID}')"
                            class="text-green-600 hover:text-green-900 mr-3">
                        <i class="fas fa-edit"></i> 编辑
                    </button>
                    <button onclick="event.stopPropagation(); stemCellManager.scheduleInfusion('${patient.ID}')"
                            class="text-purple-600 hover:text-purple-900 mr-3">
                        <i class="fas fa-calendar-plus"></i> 排期
                    </button>
                    <button onclick="event.stopPropagation(); stemCellManager.deletePatient('${patient.ID}', '${patient.PatientNumber}', '${patient.CustomerName}')"
                            class="text-red-600 hover:text-red-900">
                        <i class="fas fa-trash"></i> 删除
                    </button>
                </td>
            </tr>
        `).join('');
    console.log('✅ 患者列表渲染完成，显示', this.patients.length, '名患者');
  }

  // 获取状态样式类
  getStatusClass(status) {
    const statusClasses = {
      'Active': 'bg-green-100 text-green-800',
      'Inactive': 'bg-gray-100 text-gray-800',
      'Completed': 'bg-blue-100 text-blue-800',
      'Suspended': 'bg-yellow-100 text-yellow-800',
      'In Progress': 'bg-orange-100 text-orange-800',
      '进行中': 'bg-orange-100 text-orange-800',
      'Scheduled': 'bg-purple-100 text-purple-800',
      'Cancelled': 'bg-red-100 text-red-800',
      'Rescheduled': 'bg-indigo-100 text-indigo-800'
    };
    return statusClasses[status] || 'bg-gray-100 text-gray-800';
  }

  // 获取状态文本
  getStatusText(status) {
    const statusTexts = {
      'Active': '治疗中',
      'Inactive': '未激活',
      'Completed': '已完成',
      'Suspended': '暂停',
      'In Progress': '进行中',
      '进行中': '进行中',
      'Scheduled': '已排期',
      'Cancelled': '已取消',
      'Rescheduled': '已重新安排'
    };
    return statusTexts[status] || status || '未知';
  }

  // 更新分页信息显示
  updatePaginationInfo() {
    const startElement = document.getElementById('patientsStart');
    const endElement = document.getElementById('patientsEnd');
    const totalElement = document.getElementById('patientsTotal');

    // 确保数值类型
    const currentPage = parseInt(this.currentPage) || 1;
    const pageSize = parseInt(this.pageSize) || 10;
    const patientsLength = parseInt(this.patients?.length) || 0;
    const totalPatients = parseInt(this.totalPatients) || patientsLength;

    // 计算分页信息
    const start = (currentPage - 1) * pageSize + 1;
    const end = Math.min(currentPage * pageSize, totalPatients);
    const total = totalPatients;

    console.log('更新分页信息:', {
      currentPage,
      pageSize,
      start,
      end,
      total,
      patientsLength,
      totalPatients
    });

    if (startElement) {startElement.textContent = start;}
    if (endElement) {endElement.textContent = end;}
    if (totalElement) {totalElement.textContent = total;}
  }

  // 渲染分页控件
  renderPagination(pagination) {
    const container = document.getElementById('patientsPagination');
    if (!container || !pagination) {return;}

    const { totalPages, currentPage, total } = pagination;
    this.currentPage = currentPage;
    this.totalPatients = total; // 设置总患者数

    // 处理totalPages为null的情况
    const calculatedTotalPages = totalPages || Math.ceil(total / this.pageSize) || 1;

    console.log('渲染分页控件:', {
      pagination,
      totalPages,
      currentPage,
      total,
      totalPatients: this.totalPatients,
      calculatedTotalPages
    });

    // 如果只有一页数据，不显示分页按钮，但显示提示信息
    if (calculatedTotalPages <= 1) {
      container.innerHTML = '<span class="text-sm text-gray-500">数据不足一页，无需分页</span>';
      return;
    }

    let paginationHTML = '';

    // 上一页
    if (currentPage > 1) {
      paginationHTML += `
                <button onclick="stemCellManager.goToPage(${currentPage - 1})" class="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                    <i class="fas fa-chevron-left"></i>
                </button>
            `;
    }

    // 页码
    for (let i = 1; i <= calculatedTotalPages; i++) {
      if (i === currentPage) {
        paginationHTML += `
                    <button class="px-3 py-1 text-sm bg-blue-600 text-white border border-blue-600 rounded-md">
                        ${i}
                    </button>
                `;
      } else if (Math.abs(i - currentPage) <= 2 || i === 1 || i === calculatedTotalPages) {
        paginationHTML += `
                    <button onclick="stemCellManager.goToPage(${i})" class="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                        ${i}
                    </button>
                `;
      } else if (i === currentPage - 3 || i === currentPage + 3) {
        paginationHTML += '<span class="px-3 py-1 text-sm text-gray-500">...</span>';
      }
    }

    // 下一页
    if (currentPage < calculatedTotalPages) {
      paginationHTML += `
                <button onclick="stemCellManager.goToPage(${currentPage + 1})" class="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                    <i class="fas fa-chevron-right"></i>
                </button>
            `;
    }

    container.innerHTML = paginationHTML;
  }

  // 跳转到指定页面
  goToPage(page) {
    this.currentPage = page;
    this.loadPatients();
  }

  // 查看患者详情
  viewPatient(id) {
    const patient = this.patients.find(p => p.ID === id);
    if (!patient) {
      console.error('未找到患者:', id);
      showNotification('未找到患者信息', 'error');
      return;
    }

    console.log('查看患者详情:', patient);
    this.showPatientModal(patient, 'view');
  }

  // 编辑患者
  editPatient(id) {
    const patient = this.patients.find(p => p.ID === id);
    if (!patient) {
      console.error('未找到患者:', id);
      showNotification('未找到患者信息', 'error');
      return;
    }

    console.log('编辑患者:', patient);
    this.showPatientModal(patient, 'edit');
  }

  // 安排输注
  scheduleInfusion(id) {
    const patient = this.patients.find(p => p.ID === id);
    if (!patient) {
      console.error('未找到患者:', id);
      showNotification('未找到患者信息', 'error');
      return;
    }

    console.log('安排输注:', patient);
    this.showScheduleModal(patient);
  }

  // 显示患者模态框
  async showPatientModal(patient, mode) {
    const modalContainer = document.getElementById('modalContainer');
    if (!modalContainer) {return;}

    const isView = mode === 'view';
    const isEdit = mode === 'edit';
    const isAdd = mode === 'add';

    // 加载检客列表和疾病类型列表
    let customersOptions = '';
    let diseaseTypesOptions = '';

    try {
      // 加载检客列表（仅新增模式需要）
      if (isAdd) {
        const customersResult = await window.API.service.get('/customers/available-for-stem-cell');
        if (customersResult.status === 'Success' && customersResult.data) {
          customersOptions = customersResult.data.map(customer =>
            `<option value="${customer.ID}">${customer.Name} (${customer.IdentityCard})</option>`
          ).join('');
        }
      }

      // 加载疾病类型列表（所有模式都需要）
      const diseaseTypesResult = await window.API.service.get('/disease-types?isActive=true');
      if (diseaseTypesResult.status === 'Success' && diseaseTypesResult.data) {
        // 检查当前患者的主要诊断是否在疾病类型列表中
        const currentDiagnosis = patient?.PrimaryDiagnosis;
        const isCurrentDiagnosisInList = currentDiagnosis &&
                    diseaseTypesResult.data.some(disease => disease.DiseaseName === currentDiagnosis);

        diseaseTypesOptions = diseaseTypesResult.data.map(disease =>
          `<option value="${disease.DiseaseName}" ${currentDiagnosis === disease.DiseaseName ? 'selected' : ''}>${disease.DiseaseName}</option>`
        ).join('');

        // 如果当前诊断不在列表中，添加它作为选项
        if (currentDiagnosis && !isCurrentDiagnosisInList) {
          diseaseTypesOptions += `<option value="${currentDiagnosis}" selected>${currentDiagnosis} (旧数据)</option>`;
        }
      }

      // 添加"其他"选项，用于兼容现有数据
      diseaseTypesOptions += '<option value="其他">其他</option>';

    } catch (error) {
      console.error('加载数据失败:', error);
      showNotification('加载数据失败', 'error');
      return;
    }

    modalContainer.innerHTML = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                    <div class="p-6 border-b border-gray-200">
                        <h3 class="text-lg font-medium text-gray-900">
                            ${isAdd ? '创建患者档案' : isEdit ? '编辑患者档案' : '患者详情'}
                        </h3>
                    </div>
                    <div class="p-6">
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <!-- 基本信息 -->
                            <div class="space-y-4">
                                <h4 class="font-medium text-gray-900 border-b pb-2">基本信息</h4>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    ${isAdd ? `
                                        <div class="md:col-span-2">
                                            <label class="block text-sm font-medium text-gray-700 mb-2">选择检客 *</label>
                                            <select id="customerSelect" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                                                <option value="">请选择检客...</option>
                                                ${customersOptions}
                                            </select>
                                        </div>
                                    ` : `
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-2">患者编号</label>
                                            <input type="text" value="${patient?.PatientNumber || ''}"
                                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg ${isView ? 'bg-gray-50' : ''}"
                                                   ${isView ? 'readonly' : ''}>
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-2">姓名</label>
                                            <input type="text" value="${patient?.CustomerName || ''}"
                                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg ${isView ? 'bg-gray-50' : ''}"
                                                   ${isView ? 'readonly' : ''}>
                                        </div>
                                    `}
                                    <div class="md:col-span-2">
                                        <label class="block text-sm font-medium text-gray-700 mb-2">主要诊断</label>
                                        ${isView ? `
                                            <input type="text" value="${patient?.PrimaryDiagnosis || '未设置'}"
                                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" readonly>
                                        ` : `
                                            <select id="primaryDiagnosis" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                                <option value="">请选择主要诊断...</option>
                                                ${diseaseTypesOptions}
                                            </select>
                                        `}
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">状态</label>
                                        <select id="status" class="w-full px-3 py-2 border border-gray-300 rounded-lg ${isView ? 'bg-gray-50' : ''}"
                                                ${isView ? 'disabled' : ''}>
                                            <option value="Active" ${patient?.Status === 'Active' ? 'selected' : ''}>治疗中</option>
                                            <option value="Inactive" ${patient?.Status === 'Inactive' ? 'selected' : ''}>未激活</option>
                                            <option value="Completed" ${patient?.Status === 'Completed' ? 'selected' : ''}>已完成</option>
                                            <option value="Suspended" ${patient?.Status === 'Suspended' ? 'selected' : ''}>暂停</option>
                                            <option value="In Progress" ${patient?.Status === 'In Progress' || patient?.Status === '进行中' ? 'selected' : ''}>进行中</option>
                                        </select>
                                    </div>
                                    ${isAdd ? `
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-2">患者编号</label>
                                            <input type="text" id="patientNumber"
                                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                                   placeholder="留空自动生成">
                                        </div>
                                    ` : ''}
                                </div>
                            </div>

                            <!-- 治疗方案 -->
                            <div class="space-y-4">
                                <h4 class="font-medium text-gray-900 border-b pb-2">治疗方案</h4>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">治疗方案</label>
                                    <textarea id="treatmentPlan" rows="3"
                                              class="w-full px-3 py-2 border border-gray-300 rounded-lg ${isView ? 'bg-gray-50' : ''}"
                                              ${isView ? 'readonly' : ''} placeholder="请输入治疗方案">${patient?.TreatmentPlan || ''}</textarea>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">回输次数</label>
                                    <input type="number" id="totalInfusionCount" value="${patient?.TotalInfusionCount || 0}"
                                           class="w-full px-3 py-2 border border-gray-300 rounded-lg ${isView ? 'bg-gray-50' : ''}"
                                           ${isView ? 'readonly' : ''} min="0" placeholder="已完成的回输次数">
                                </div>
                                ${!isAdd ? `
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">下次排期</label>
                                    <input type="datetime-local" value="${patient?.next_schedule ? this.formatDateTimeLocal(patient.next_schedule) : ''}"
                                           class="w-full px-3 py-2 border border-gray-300 rounded-lg ${isView ? 'bg-gray-50' : ''}"
                                           ${isView ? 'readonly' : ''}>
                                </div>
                                ` : ''}
                            </div>
                        </div>

                        <!-- 治疗历史 -->
                        ${patient ? `
                            <div class="mt-6">
                                <h4 class="font-medium text-gray-900 border-b pb-2 mb-4">治疗历史</h4>
                                <div class="bg-gray-50 rounded-lg p-4">
                                    <div class="space-y-2">
                                        <div class="flex justify-between text-sm">
                                            <span class="text-gray-600">首次治疗</span>
                                            <span class="font-medium">${patient.first_treatment || '-'}</span>
                                        </div>
                                        <div class="flex justify-between text-sm">
                                            <span class="text-gray-600">最近治疗</span>
                                            <span class="font-medium">${patient.last_treatment || '-'}</span>
                                        </div>
                                        <div class="flex justify-between text-sm">
                                            <span class="text-gray-600">治疗医生</span>
                                            <span class="font-medium">${patient.doctor || '-'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ` : ''}

                        <div class="flex justify-end space-x-3 mt-6">
                            <button type="button" onclick="stemCellManager.closeModal()"
                                    class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                                ${isView ? '关闭' : '取消'}
                            </button>
                            ${!isView ? `
                                <button type="button" onclick="stemCellManager.savePatient('${patient?.ID || ''}', '${mode}')"
                                        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                                    <i class="fas fa-save mr-2"></i>${isAdd ? '创建' : '保存'}
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
  }

  // 显示排期模态框
  showScheduleModal(patient) {
    const modalContainer = document.getElementById('modalContainer');
    if (!modalContainer) {return;}

    modalContainer.innerHTML = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white rounded-lg w-full max-w-md">
                    <div class="p-6 border-b border-gray-200">
                        <h3 class="text-lg font-medium text-gray-900">安排输注</h3>
                    </div>
                    <form class="p-6">
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-2">患者编号</label>
                            <input type="text" value="${patient.PatientNumber || 'N/A'}" readonly
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
                        </div>
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-2">患者姓名</label>
                            <input type="text" value="${patient.CustomerName || '未知患者'}" readonly
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
                        </div>
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-2">当前回输次数</label>
                            <input type="text" value="${patient.TotalInfusionCount || 0}" readonly
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
                        </div>
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-2">输注日期</label>
                            <input type="date" name="infusion_date" required
                                   value="${new Date().toISOString().split('T')[0]}"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-2">输注时间</label>
                            <input type="time" name="infusion_time" required
                                   value="09:00"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-2">治疗类型</label>
                            <select name="treatment_type" required
                                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="">请选择治疗类型</option>
                                <option value="NK">NK细胞</option>
                                <option value="MSC" selected>MSC干细胞</option>
                                <option value="2MSC">2MSC干细胞</option>
                                <option value="膝关节靶向注射">膝关节靶向注射</option>
                            </select>
                        </div>
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-2">医生</label>
                            <input type="text" name="doctor" required
                                   placeholder="请输入医生姓名"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-2">备注</label>
                            <textarea name="notes" rows="3"
                                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
                        </div>
                        <div class="flex justify-end space-x-3">
                            <button type="button" onclick="stemCellManager.closeModal()"
                                    class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                                取消
                            </button>
                            <button type="button" onclick="stemCellManager.saveInfusion('${patient.ID}')"
                                    class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                                <i class="fas fa-save mr-2"></i>保存排期
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
  }

  // 保存患者信息
  async savePatient(id, mode) {
    try {
      const modalContainer = document.querySelector('#modalContainer');

      // 获取表单数据
      let patientData = {};

      if (mode === 'add') {
        // 新增模式：从检客选择中获取CustomerID
        const customerSelect = modalContainer.querySelector('#customerSelect');
        if (!customerSelect.value) {
          showNotification('请选择检客', 'error');
          return;
        }

        const primaryDiagnosisSelect = modalContainer.querySelector('#primaryDiagnosis');
        if (!primaryDiagnosisSelect.value) {
          showNotification('请选择主要诊断', 'error');
          return;
        }

        patientData = {
          customerId: customerSelect.value, // 使用与后端匹配的字段名
          patientNumber: modalContainer.querySelector('#patientNumber').value || null, // 允许后端自动生成
          primaryDiagnosis: primaryDiagnosisSelect.value,
          treatmentPlan: modalContainer.querySelector('#treatmentPlan').value || '',
          totalInfusionCount: parseInt(modalContainer.querySelector('#totalInfusionCount').value) || 0,
          status: modalContainer.querySelector('#status').value || 'Active',
          registrationDate: new Date().toISOString().split('T')[0], // 当前日期
          diseaseTypes: [], // 满足后端验证要求，可以为空数组
          diseaseKeywords: '' // 疾病关键词
        };
      } else {
        // 编辑模式：使用原有的表单数据结构
        const primaryDiagnosisSelect = modalContainer.querySelector('#primaryDiagnosis');
        if (!primaryDiagnosisSelect.value) {
          showNotification('请选择主要诊断', 'error');
          return;
        }

        patientData = {
          primaryDiagnosis: primaryDiagnosisSelect.value,
          treatmentPlan: modalContainer.querySelector('#treatmentPlan').value || '',
          totalInfusionCount: parseInt(modalContainer.querySelector('#totalInfusionCount').value) || 0,
          status: modalContainer.querySelector('#status').value || 'Active'
        };
      }

      let response;
      if (mode === 'add') {
        response = await window.API.service.post('/stem-cell/patients', patientData);
      } else {
        // 验证患者ID
        if (!id) {
          showNotification('患者ID不能为空', 'error');
          return;
        }
        response = await window.API.service.put(`/stem-cell/patients/${id}`, patientData);
      }

      if (response.status === 'Success') {
        showNotification(`患者档案${mode === 'add' ? '创建' : '更新'}成功`, 'success');
        this.closeModal();
        this.loadPatients();
        this.loadStatistics(); // 重新加载统计数据
      } else {
        const errorMsg = response.message || '保存失败';
        console.error('保存患者信息失败:', errorMsg);
        showNotification(errorMsg, 'error');
      }
    } catch (error) {
      console.error('保存患者信息失败:', error);

      // 根据错误类型提供更具体的错误信息
      let errorMessage = '保存患者信息失败';
      if (error.message.includes('ECONNREFUSED')) {
        errorMessage = '无法连接到服务器，请检查网络连接';
      } else if (error.message.includes('401')) {
        errorMessage = '登录已过期，请重新登录';
      } else if (error.message.includes('403')) {
        errorMessage = '权限不足，无法执行此操作';
      } else if (error.message.includes('404')) {
        errorMessage = '请求的资源不存在';
      } else if (error.message.includes('500')) {
        errorMessage = '服务器内部错误，请稍后重试';
      } else if (error.message) {
        errorMessage = error.message;
      }

      showNotification(errorMessage, 'error');
    }
  }

  // 保存输注排期
  async saveInfusion(patientId) {
    try {
      const form = document.querySelector('#modalContainer form');
      if (!form) {
        showNotification('表单未找到', 'error');
        return;
      }

      const formData = new FormData(form);
      const infusionData = Object.fromEntries(formData.entries());

      // 添加必需的字段
      infusionData.patientId = patientId;
      infusionData.scheduleDate = infusionData.infusion_date;
      infusionData.scheduleTime = infusionData.infusion_time || '09:00';
      infusionData.doctor = infusionData.doctor || '未指定';
      infusionData.notes = infusionData.notes || '';
      infusionData.scheduleType = '再次'; // 默认值
      infusionData.treatmentType = infusionData.treatment_type || 'MSC'; // 使用表单中选择的治疗类型
      infusionData.infusionCount = 1; // 默认值

      console.log('保存输注排期数据:', infusionData);

      const response = await window.API.service.post('/stem-cell/schedules', infusionData);

      if (response.status === 'Success') {
        showNotification('输注排期保存成功', 'success');
        this.closeModal();
        this.loadPatients();
      } else {
        showNotification(response.message || '保存失败', 'error');
      }
    } catch (error) {
      console.error('保存输注排期失败:', error);
      showNotification('保存输注排期失败: ' + error.message, 'error');
    }
  }

  // 显示选择患者进行排期的模态框
  showPatientSelectionForScheduling() {
    const modalContainer = document.getElementById('modalContainer');
    if (!modalContainer) {return;}

    const patientsOptions = this.patients.map(patient => `
            <option value="${patient.ID}">${patient.PatientNumber} - ${patient.CustomerName}</option>
        `).join('');

    modalContainer.innerHTML = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white rounded-lg w-full max-w-md">
                    <div class="p-6 border-b border-gray-200">
                        <h3 class="text-lg font-medium text-gray-900">选择患者进行排期</h3>
                    </div>
                    <div class="p-6">
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-2">选择患者</label>
                            <select id="patientSelectForScheduling" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                                <option value="">请选择患者...</option>
                                ${patientsOptions}
                            </select>
                        </div>
                        <div class="flex justify-end space-x-3">
                            <button type="button" onclick="stemCellManager.closeModal()"
                                    class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                                取消
                            </button>
                            <button type="button" onclick="stemCellManager.scheduleSelectedPatient()"
                                    class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                                确定选择
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
  }

  // 选择患者
  selectPatient(patientId) {
    // 移除所有选中状态
    document.querySelectorAll('.patient-row').forEach(row => {
      row.classList.remove('selected', 'bg-blue-50');
    });

    // 添加选中状态
    const selectedRow = document.querySelector(`[data-patient-id="${patientId}"]`);
    if (selectedRow) {
      selectedRow.classList.add('selected', 'bg-blue-50');
      // 选中对应的radio按钮
      const radio = selectedRow.querySelector('input[type="radio"]');
      if (radio) {
        radio.checked = true;
      }
    }

    // 更新当前选中的患者ID
    this.selectedPatientId = patientId;
    console.log('选中患者:', patientId);
  }

  // 获取当前选中的患者
  getSelectedPatient() {
    if (this.selectedPatientId) {
      return this.patients.find(p => p.ID === this.selectedPatientId);
    }
    // 如果没有手动选择，返回第一个患者
    return this.patients.length > 0 ? this.patients[0] : null;
  }

  // 为选定的患者安排输注
  scheduleSelectedPatient() {
    const patientSelect = document.getElementById('patientSelectForScheduling');
    if (!patientSelect.value) {
      showNotification('请选择患者', 'error');
      return;
    }

    const patient = this.patients.find(p => p.ID === patientSelect.value);
    if (patient) {
      this.closeModal();
      this.showScheduleModal(patient);
    }
  }

  // 关闭模态框
  closeModal() {
    const modalContainer = document.getElementById('modalContainer');
    if (modalContainer) {
      modalContainer.innerHTML = '';
    }
  }

  // 显示治疗类型统计维护窗口
  async showTreatmentTypeMaintenance() {
    const modalContainer = document.getElementById('modalContainer');
    if (!modalContainer) {return;}

    try {
      // 获取治疗类型列表
      const result = await window.API.service.get('/treatment-types');

      let treatmentTypesContent = '';
      if (result.status === 'Success' && result.data) {
        treatmentTypesContent = result.data.map((item, index) => `
                    <tr class="border-b hover:bg-gray-50">
                        <td class="px-4 py-3 text-sm">${index + 1}</td>
                        <td class="px-4 py-3 text-sm">${item.name || item.TreatmentType || '未知类型'}</td>
                        <td class="px-4 py-3 text-sm text-center">${item.patientCount || item.count || 0}</td>
                        <td class="px-4 py-3 text-sm text-center">
                            <button onclick="stemCellManager.editTreatmentType('${item.name || item.TreatmentType}')"
                                    class="text-blue-600 hover:text-blue-800 mr-2">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="stemCellManager.deleteTreatmentType('${item.name || item.TreatmentType}')"
                                    class="text-red-600 hover:text-red-800">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `).join('');
      } else {
        treatmentTypesContent = `
                    <tr>
                        <td colspan="4" class="px-4 py-8 text-center text-gray-500">暂无数据</td>
                    </tr>
                `;
      }

      modalContainer.innerHTML = `
                <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div class="bg-white rounded-lg w-full max-w-3xl max-h-[80vh] overflow-y-auto">
                        <div class="p-6 border-b border-gray-200 flex justify-between items-center">
                            <h3 class="text-lg font-medium text-gray-900">治疗类型统计维护</h3>
                            <button onclick="stemCellManager.closeModal()"
                                    class="text-gray-400 hover:text-gray-600">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="p-6">
                            <div class="mb-4">
                                <button onclick="stemCellManager.showAddTreatmentTypeModal()"
                                        class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                                    <i class="fas fa-plus mr-2"></i>添加治疗类型
                                </button>
                            </div>
                            <div class="overflow-x-auto">
                                <table class="w-full border-collapse">
                                    <thead class="bg-gray-50">
                                        <tr>
                                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">序号</th>
                                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">治疗类型</th>
                                            <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">统计数量</th>
                                            <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">操作</th>
                                        </tr>
                                    </thead>
                                    <tbody class="bg-white divide-y divide-gray-200">
                                        ${treatmentTypesContent}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            `;
    } catch (error) {
      console.error('加载治疗类型统计数据失败:', error);
      showNotification('加载治疗类型统计数据失败', 'error');
    }
  }

  // 显示病种分布维护窗口
  async showDiseaseTypeMaintenance() {
    const modalContainer = document.getElementById('modalContainer');
    if (!modalContainer) {return;}

    try {
      // 获取疾病类型列表
      const result = await window.API.service.get('/disease-types?isActive=true');

      let diseaseTypesContent = '';
      if (result.status === 'Success' && result.data) {
        diseaseTypesContent = result.data.map((item, index) => `
                    <tr class="border-b hover:bg-gray-50">
                        <td class="px-4 py-3 text-sm">${index + 1}</td>
                        <td class="px-4 py-3 text-sm">${item.DiseaseName || item.name || '未知病种'}</td>
                        <td class="px-4 py-3 text-sm text-center">${item.patientCount || item.count || 0}</td>
                        <td class="px-4 py-3 text-sm text-center">
                            <button onclick="stemCellManager.editDiseaseType('${item.ID}')"
                                    class="text-blue-600 hover:text-blue-800 mr-2">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="stemCellManager.deleteDiseaseType('${item.ID}', '${item.DiseaseName}')"
                                    class="text-red-600 hover:text-red-800">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `).join('');
      } else {
        diseaseTypesContent = `
                    <tr>
                        <td colspan="4" class="px-4 py-8 text-center text-gray-500">暂无数据</td>
                    </tr>
                `;
      }

      modalContainer.innerHTML = `
                <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div class="bg-white rounded-lg w-full max-w-3xl max-h-[80vh] overflow-y-auto">
                        <div class="p-6 border-b border-gray-200 flex justify-between items-center">
                            <h3 class="text-lg font-medium text-gray-900">病种分布维护</h3>
                            <button onclick="stemCellManager.closeModal()"
                                    class="text-gray-400 hover:text-gray-600">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="p-6">
                            <div class="mb-4">
                                <button onclick="stemCellManager.showAddDiseaseTypeModal()"
                                        class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                                    <i class="fas fa-plus mr-2"></i>添加病种类型
                                </button>
                            </div>
                            <div class="overflow-x-auto">
                                <table class="w-full border-collapse">
                                    <thead class="bg-gray-50">
                                        <tr>
                                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">序号</th>
                                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">病种类型</th>
                                            <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">统计数量</th>
                                            <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">操作</th>
                                        </tr>
                                    </thead>
                                    <tbody class="bg-white divide-y divide-gray-200">
                                        ${diseaseTypesContent}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            `;
    } catch (error) {
      console.error('加载病种统计数据失败:', error);
      showNotification('加载病种统计数据失败', 'error');
    }
  }

  // 显示添加治疗类型模态框
  showAddTreatmentTypeModal() {
    const modalContainer = document.getElementById('modalContainer');
    if (!modalContainer) {return;}

    modalContainer.innerHTML = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white rounded-lg w-full max-w-md">
                    <div class="p-6 border-b border-gray-200">
                        <h3 class="text-lg font-medium text-gray-900">添加治疗类型</h3>
                    </div>
                    <div class="p-6">
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-2">治疗类型名称</label>
                            <input type="text" id="newTreatmentTypeName"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                   placeholder="请输入治疗类型名称">
                        </div>
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-2">描述（可选）</label>
                            <textarea id="newTreatmentTypeDescription" rows="3"
                                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      placeholder="请输入描述信息"></textarea>
                        </div>
                        <div class="flex justify-end space-x-3">
                            <button onclick="stemCellManager.closeModal()"
                                    class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                                取消
                            </button>
                            <button onclick="stemCellManager.addTreatmentType()"
                                    class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                                <i class="fas fa-save mr-2"></i>保存
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
  }

  // 显示添加病种类型模态框
  showAddDiseaseTypeModal() {
    const modalContainer = document.getElementById('modalContainer');
    if (!modalContainer) {return;}

    modalContainer.innerHTML = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white rounded-lg w-full max-w-md">
                    <div class="p-6 border-b border-gray-200">
                        <h3 class="text-lg font-medium text-gray-900">添加病种类型</h3>
                    </div>
                    <div class="p-6">
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-2">病种类型名称</label>
                            <input type="text" id="newDiseaseTypeName"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                   placeholder="请输入病种类型名称">
                        </div>
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-2">描述（可选）</label>
                            <textarea id="newDiseaseTypeDescription" rows="3"
                                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      placeholder="请输入描述信息"></textarea>
                        </div>
                        <div class="flex justify-end space-x-3">
                            <button onclick="stemCellManager.closeModal()"
                                    class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                                取消
                            </button>
                            <button onclick="stemCellManager.addDiseaseType()"
                                    class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                                <i class="fas fa-save mr-2"></i>保存
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
  }

  // 添加治疗类型
  async addTreatmentType() {
    const name = document.getElementById('newTreatmentTypeName').value.trim();
    const description = document.getElementById('newTreatmentTypeDescription').value.trim();

    if (!name) {
      showNotification('请输入治疗类型名称', 'error');
      return;
    }

    try {
      const result = await window.API.service.post('/treatment-types', {
        treatmentType: name,
        planName: `${name}治疗方案`,
        description: description,
        diseaseType: '通用',
        keywords: name
      });

      if (result.status === 'Success') {
        showNotification('治疗类型添加成功', 'success');
        this.closeModal();
        this.showTreatmentTypeMaintenance(); // 刷新列表
        this.loadStatistics(); // 刷新统计数据
      } else {
        showNotification(result.message || '添加治疗类型失败', 'error');
      }
    } catch (error) {
      console.error('添加治疗类型失败:', error);
      showNotification('添加治疗类型失败', 'error');
    }
  }

  // 添加病种类型
  async addDiseaseType() {
    const name = document.getElementById('newDiseaseTypeName').value.trim();
    const description = document.getElementById('newDiseaseTypeDescription').value.trim();

    if (!name) {
      showNotification('请输入病种类型名称', 'error');
      return;
    }

    try {
      const result = await window.API.service.post('/disease-types', {
        diseaseName: name,
        category: '其他',
        description: description,
        keywords: name,
        recommendedTreatment: 'MSC'
      });

      if (result.status === 'Success') {
        showNotification('病种类型添加成功', 'success');
        this.closeModal();
        this.showDiseaseTypeMaintenance(); // 刷新列表
        this.loadStatistics(); // 刷新统计数据
      } else {
        showNotification(result.message || '添加病种类型失败', 'error');
      }
    } catch (error) {
      console.error('添加病种类型失败:', error);
      showNotification('添加病种类型失败', 'error');
    }
  }

  // 编辑治疗类型
  async editTreatmentType(name) {
    const modalContainer = document.getElementById('modalContainer');
    if (!modalContainer) {return;}

    modalContainer.innerHTML = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white rounded-lg w-full max-w-md">
                    <div class="p-6 border-b border-gray-200">
                        <h3 class="text-lg font-medium text-gray-900">编辑治疗类型</h3>
                    </div>
                    <div class="p-6">
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-2">治疗类型名称</label>
                            <input type="text" id="editTreatmentTypeName" value="${name}"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-2">描述</label>
                            <textarea id="editTreatmentTypeDescription" rows="3"
                                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      placeholder="请输入描述信息"></textarea>
                        </div>
                        <div class="flex justify-end space-x-3">
                            <button onclick="stemCellManager.closeModal()"
                                    class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                                取消
                            </button>
                            <button onclick="stemCellManager.updateTreatmentType('${name}')"
                                    class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                                <i class="fas fa-save mr-2"></i>保存
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
  }

  // 更新治疗类型
  async updateTreatmentType(oldName) {
    const newName = document.getElementById('editTreatmentTypeName').value.trim();
    const description = document.getElementById('editTreatmentTypeDescription').value.trim();

    if (!newName) {
      showNotification('请输入治疗类型名称', 'error');
      return;
    }

    try {
      const result = await window.API.service.put(`/treatment-types/${oldName}`, {
        newTreatmentType: newName !== oldName ? newName : null,
        description: description
      });

      if (result.status === 'Success') {
        showNotification('治疗类型更新成功', 'success');
        this.closeModal();
        this.showTreatmentTypeMaintenance(); // 刷新列表
        this.loadStatistics(); // 刷新统计数据
      } else {
        showNotification(result.message || '更新治疗类型失败', 'error');
      }
    } catch (error) {
      console.error('更新治疗类型失败:', error);
      showNotification('更新治疗类型失败', 'error');
    }
  }

  // 删除治疗类型
  async deleteTreatmentType(name) {
    NotificationHelper.confirm(
      `确定要删除治疗类型 "${name}" 吗？此操作不可撤销。`,
      async () => {
        try {
          const result = await window.API.service.delete(`/treatment-types/${name}`);

          if (result.status === 'Success') {
            NotificationHelper.success('治疗类型删除成功');
            this.showTreatmentTypeMaintenance(); // 刷新列表
            this.loadStatistics(); // 刷新统计数据
          } else {
            NotificationHelper.error(result.message || '删除治疗类型失败');
          }
        } catch (error) {
          console.error('删除治疗类型失败:', error);
          NotificationHelper.error('删除治疗类型失败');
        }
      }
    );
  }

  // 编辑病种类型
  async editDiseaseType(id) {
    const modalContainer = document.getElementById('modalContainer');
    if (!modalContainer) {return;}

    // 先获取详细信息
    try {
      const result = await window.API.service.get(`/disease-types/${id}`);

      if (result.status !== 'Success') {
        showNotification('获取病种信息失败', 'error');
        return;
      }

      const disease = result.data;

      modalContainer.innerHTML = `
                <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div class="bg-white rounded-lg w-full max-w-md">
                        <div class="p-6 border-b border-gray-200">
                            <h3 class="text-lg font-medium text-gray-900">编辑病种类型</h3>
                        </div>
                        <div class="p-6">
                            <div class="mb-4">
                                <label class="block text-sm font-medium text-gray-700 mb-2">病种类型名称</label>
                                <input type="text" id="editDiseaseTypeName" value="${disease.DiseaseName}"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                            </div>
                            <div class="mb-4">
                                <label class="block text-sm font-medium text-gray-700 mb-2">分类</label>
                                <input type="text" id="editDiseaseTypeCategory" value="${disease.Category}"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                            </div>
                            <div class="mb-4">
                                <label class="block text-sm font-medium text-gray-700 mb-2">描述</label>
                                <textarea id="editDiseaseTypeDescription" rows="3"
                                          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                          placeholder="请输入描述信息">${disease.Description || ''}</textarea>
                            </div>
                            <div class="mb-4">
                                <label class="block text-sm font-medium text-gray-700 mb-2">推荐治疗</label>
                                <select id="editDiseaseTypeRecommendedTreatment"
                                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="MSC" ${disease.RecommendedTreatment === 'MSC' ? 'selected' : ''}>MSC</option>
                                    <option value="NK" ${disease.RecommendedTreatment === 'NK' ? 'selected' : ''}>NK</option>
                                    <option value="2MSC" ${disease.RecommendedTreatment === '2MSC' ? 'selected' : ''}>2MSC</option>
                                    <option value="膝关节靶向注射" ${disease.RecommendedTreatment === '膝关节靶向注射' ? 'selected' : ''}>膝关节靶向注射</option>
                                </select>
                            </div>
                            <div class="mb-4">
                                <label class="flex items-center">
                                    <input type="checkbox" id="editDiseaseTypeIsActive" ${disease.IsActive ? 'checked' : ''}
                                           class="mr-2">
                                    <span class="text-sm text-gray-700">启用状态</span>
                                </label>
                            </div>
                            <div class="flex justify-end space-x-3">
                                <button onclick="stemCellManager.closeModal()"
                                        class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                                    取消
                                </button>
                                <button onclick="stemCellManager.updateDiseaseType('${id}')"
                                        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                                    <i class="fas fa-save mr-2"></i>保存
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
    } catch (error) {
      console.error('获取病种信息失败:', error);
      showNotification('获取病种信息失败', 'error');
    }
  }

  // 更新病种类型
  async updateDiseaseType(id) {
    const name = document.getElementById('editDiseaseTypeName').value.trim();
    const category = document.getElementById('editDiseaseTypeCategory').value.trim();
    const description = document.getElementById('editDiseaseTypeDescription').value.trim();
    const recommendedTreatment = document.getElementById('editDiseaseTypeRecommendedTreatment').value;
    const isActive = document.getElementById('editDiseaseTypeIsActive').checked;

    if (!name) {
      showNotification('请输入病种类型名称', 'error');
      return;
    }

    try {
      const result = await window.API.service.put(`/disease-types/${id}`, {
        diseaseName: name,
        category: category,
        description: description,
        recommendedTreatment: recommendedTreatment,
        isActive: isActive
      });

      if (result.status === 'Success') {
        showNotification('病种类型更新成功', 'success');
        this.closeModal();

        // 如果推荐治疗方案有变化，询问是否同步到相关的输注排期
        if (recommendedTreatment) {
          await this.checkAndSyncTreatmentType(id, recommendedTreatment);
        }

        this.showDiseaseTypeMaintenance(); // 刷新列表
        this.loadStatistics(); // 刷新统计数据
      } else {
        showNotification(result.message || '更新病种类型失败', 'error');
      }
    } catch (error) {
      console.error('更新病种类型失败:', error);
      showNotification('更新病种类型失败', 'error');
    }
  }

  // 检查并同步治疗类型
  async checkAndSyncTreatmentType(diseaseTypeId, newTreatmentType) {
    try {
      // 首先查询需要同步的记录
      const checkResult = await window.API.service.post(`/disease-types/${diseaseTypeId}/sync-treatment-type`, {
        confirm: false
      });

      if (checkResult.status === 'Success' && checkResult.data.affectedCount > 0) {
        const { diseaseName, recommendedTreatment, affectedCount, schedules } = checkResult.data;

        // 显示确认对话框
        const confirmMessage = `检测到 ${affectedCount} 条输注排期记录的治疗类型与新的推荐治疗方案 "${recommendedTreatment}" 不一致：

${schedules.map(s => `• ${s.CustomerName} (${s.PatientNumber}) - 当前: ${s.CurrentTreatmentType} → 新: ${recommendedTreatment}`).join('\n')}

是否要将这些记录的治疗类型同步更新为 "${recommendedTreatment}"？`;

        NotificationHelper.confirm(
          confirmMessage,
          async () => {
            // 用户确认同步，执行更新
            const syncResult = await window.API.service.post(`/disease-types/${diseaseTypeId}/sync-treatment-type`, {
              confirm: true
            });

            if (syncResult.status === 'Success') {
              NotificationHelper.success(`成功同步 ${syncResult.data.affectedCount} 条输注排期记录的治疗类型`);
              this.loadStatistics(); // 再次刷新统计数据
            } else {
              NotificationHelper.error(syncResult.message || '同步治疗类型失败');
            }
          }
        );
      }
    } catch (error) {
      console.error('检查同步治疗类型失败:', error);
      // 不显示错误，因为这不是核心功能
    }
  }

  // 删除病种类型
  async deleteDiseaseType(id, name) {
    NotificationHelper.confirm(
      `确定要删除病种类型 "${name}" 吗？此操作不可撤销。`,
      async () => {
        try {
          const result = await window.API.service.delete(`/disease-types/${id}`);

          if (result.status === 'Success') {
            NotificationHelper.success('病种类型删除成功');
            this.showDiseaseTypeMaintenance(); // 刷新列表
            this.loadStatistics(); // 刷新统计数据
          } else {
            NotificationHelper.error(result.message || '删除病种类型失败');
          }
        } catch (error) {
          console.error('删除病种类型失败:', error);
          NotificationHelper.error('删除病种类型失败');
        }
      }
    );
  }

  // 删除干细胞患者档案
  async deletePatient(id, patientNumber, customerName) {
    NotificationHelper.confirm(
      `确定要删除患者 ${customerName} (${patientNumber}) 的干细胞治疗档案吗？

注意：此操作仅删除干细胞治疗相关数据，不会删除客户的基础信息。此操作不可撤销。`,
      async () => {
        try {
          // 检查患者是否有未完成的输注排期
          const schedulesResult = await window.API.service.get(`/stem-cell/schedules/patient/${id}?limit=1`);

          if (schedulesResult.status === 'Success' && schedulesResult.data && schedulesResult.data.length > 0) {
            const hasActiveSchedules = schedulesResult.data.some(schedule =>
              schedule.Status === 'Scheduled' || schedule.Status === 'In Progress'
            );

            if (hasActiveSchedules) {
              NotificationHelper.error('该患者有未完成的输注排期，请先处理相关排期后再删除档案');
              return;
            }
          }

          // 删除干细胞患者档案
          const result = await window.API.service.delete(`/stem-cell/patients/${id}`);

          if (result.status === 'Success') {
            NotificationHelper.success('干细胞治疗档案删除成功');
            this.loadPatients(); // 重新加载患者列表
            this.loadStatistics(); // 重新加载统计数据
          } else {
            NotificationHelper.error(result.message || '删除患者档案失败');
          }
        } catch (error) {
          console.error('删除患者档案失败:', error);
          NotificationHelper.error('删除患者档案失败');
        }
      }
    );
  }

  // 格式化日期时间为datetime-local输入框格式
  formatDateTimeLocal(dateString) {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      // 获取本地时区的日期时间并格式化为YYYY-MM-DDTHH:MM
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch (error) {
      console.error('日期格式化失败:', error);
      return '';
    }
  }

  // 格式化日期为 YYYY-MM-DD 格式（用于 date input）
  formatDateForInput(dateString) {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('日期格式化失败:', error);
      return '';
    }
  }

  // 绑定事件
  bindEvents() {
    // 创建患者档案按钮
    const createBtn = document.getElementById('createStemCellPatientBtn');
    if (createBtn) {
      createBtn.addEventListener('click', () => {
        this.showPatientModal(null, 'add');
      });
    }

    // 安排输注按钮 - 使用选中的患者或显示选择对话框
    const scheduleBtn = document.getElementById('scheduleInfusionBtn');
    if (scheduleBtn) {
      scheduleBtn.addEventListener('click', () => {
        const selectedPatient = this.getSelectedPatient();
        if (selectedPatient) {
          this.showScheduleModal(selectedPatient);
        } else {
          showNotification('请先选择患者', 'info');
        }
      });
    }

    // 排期管理按钮
    const manageSchedulesBtn = document.getElementById('manageSchedulesBtn');
    if (manageSchedulesBtn) {
      manageSchedulesBtn.addEventListener('click', () => {
        this.showScheduleManagement();
      });
    }

    // 治疗效果评估按钮
    const treatmentEffectivenessBtn = document.getElementById('treatmentEffectivenessBtn');
    if (treatmentEffectivenessBtn) {
      treatmentEffectivenessBtn.addEventListener('click', () => {
        this.showTreatmentEffectivenessModal();
      });
    }

    // 日期筛选
    const dateFilter = document.getElementById('scheduleDateFilter');
    if (dateFilter) {
      dateFilter.addEventListener('change', (e) => {
        this.filters.date = e.target.value;
        this.loadPatients();
      });
    }

    // 状态筛选
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
      statusFilter.addEventListener('change', (e) => {
        // 状态值直接使用，HTML中已经设置为正确的英文值
        this.filters.status = e.target.value;
        this.loadPatients();
      });
    }
  }

  // 显示排期管理窗口
  async showScheduleManagement() {
    const modalContainer = document.getElementById('modalContainer');
    if (!modalContainer) {return;}

    try {
      // 显示加载状态
      modalContainer.innerHTML = `
                <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div class="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-screen overflow-hidden">
                        <div class="p-6 border-b border-gray-200">
                            <div class="flex justify-between items-center">
                                <h3 class="text-xl font-semibold text-gray-800">输注排期管理</h3>
                                <button onclick="stemCellManager.closeModal()" class="text-gray-400 hover:text-gray-600">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        </div>
                        <div class="p-6 overflow-y-auto" style="max-height: 60vh;">
                            <div class="text-center py-8">
                                <i class="fas fa-spinner fa-spin text-4xl text-blue-600 mb-4"></i>
                                <p class="text-gray-600">正在加载排期数据...</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;

      // 获取所有排期数据
      const result = await window.API.service.get('/stem-cell/schedules?limit=100');

      if (result.status !== 'Success') {
        throw new Error(result.message || '加载排期数据失败');
      }

      const schedules = result.data || [];

      // 渲染排期列表
      this.renderScheduleManagement(schedules);

    } catch (error) {
      console.error('加载排期管理数据失败:', error);
      showNotification('加载排期数据失败: ' + error.message, 'error');
      this.closeModal();
    }
  }

  // 渲染排期管理列表
  renderScheduleManagement(schedules) {
    const modalContainer = document.getElementById('modalContainer');
    if (!modalContainer) {return;}

    if (!schedules || schedules.length === 0) {
      modalContainer.innerHTML = `
                <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl">
                        <div class="p-6 border-b border-gray-200">
                            <div class="flex justify-between items-center">
                                <h3 class="text-xl font-semibold text-gray-800">输注排期管理</h3>
                                <button onclick="stemCellManager.closeModal()" class="text-gray-400 hover:text-gray-600">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        </div>
                        <div class="p-6 text-center">
                            <i class="fas fa-calendar-times text-4xl text-gray-400 mb-4"></i>
                            <p class="text-gray-600">暂无排期数据</p>
                        </div>
                    </div>
                </div>
            `;
      return;
    }

    const schedulesHtml = schedules.map(schedule => {
      const scheduleDate = schedule.ScheduleDate ?
        new Date(schedule.ScheduleDate).toLocaleDateString('zh-CN') : '未知日期';
      const scheduleTime = schedule.ScheduleDate ?
        new Date(schedule.ScheduleDate).toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit'
        }) : '';

      return `
                <tr class="border-b hover:bg-gray-50">
                    <td class="px-4 py-3 text-sm">${schedule.PatientNumber || '未知'}</td>
                    <td class="px-4 py-3 text-sm">${schedule.CustomerName || '未知客户'}</td>
                    <td class="px-4 py-3 text-sm">${schedule.TreatmentType || '未知类型'}</td>
                    <td class="px-4 py-3 text-sm">${scheduleDate} ${scheduleTime}</td>
                    <td class="px-4 py-3 text-sm">
                        <span class="inline-block px-2 py-1 text-xs rounded-full ${this.getStatusClass(schedule.Status)}">
                            ${this.getStatusText(schedule.Status)}
                        </span>
                    </td>
                    <td class="px-4 py-3 text-sm text-center">
                        ${this.getScheduleActionButtons(schedule)}
                    </td>
                </tr>
            `;
    }).join('');

    modalContainer.innerHTML = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-screen overflow-hidden">
                    <div class="p-6 border-b border-gray-200">
                        <div class="flex justify-between items-center">
                            <h3 class="text-xl font-semibold text-gray-800">输注排期管理</h3>
                            <button onclick="stemCellManager.closeModal()" class="text-gray-400 hover:text-gray-600">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    <div class="p-6 overflow-y-auto" style="max-height: 60vh;">
                        <div class="mb-4 text-sm text-gray-600">
                            <i class="fas fa-info-circle mr-2"></i>
                            共找到 ${schedules.length} 条排期记录，可以完成、取消或删除相应排期
                        </div>
                        <div class="overflow-x-auto">
                            <table class="w-full border-collapse">
                                <thead class="bg-gray-50">
                                    <tr>
                                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">患者编号</th>
                                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">客户姓名</th>
                                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">治疗类型</th>
                                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">排期时间</th>
                                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                                        <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">操作</th>
                                    </tr>
                                </thead>
                                <tbody class="bg-white divide-y divide-gray-200">
                                    ${schedulesHtml}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
  }

  // 删除排期
  async deleteSchedule(scheduleId) {
    if (!scheduleId) {
      NotificationHelper.error('排期ID不能为空');
      return;
    }

    // 确认删除
    NotificationHelper.confirm(
      '确定要删除这条排期记录吗？此操作不可恢复。',
      async () => {
        try {
          const response = await window.API.service.delete(`/stem-cell/schedules/${scheduleId}`);

          if (response.status === 'Success') {
            NotificationHelper.success('排期删除成功');
            // 重新加载排期管理窗口
            this.showScheduleManagement();
          } else {
            NotificationHelper.error(response.message || '删除排期失败');
          }
        } catch (error) {
          console.error('删除排期失败:', error);

          // 根据错误类型提供具体的错误信息
          const errorMessage = '删除排期失败';
          if (error.message.includes('ECONNREFUSED')) {
            NotificationHelper.networkError('无法连接到服务器，请检查网络连接');
          } else if (error.message.includes('401')) {
            NotificationHelper.error('登录已过期，请重新登录');
          } else if (error.message.includes('403')) {
            NotificationHelper.permissionError('权限不足，无法执行此操作');
          } else if (error.message.includes('404')) {
            NotificationHelper.error('排期记录不存在');
          } else if (error.message.includes('500')) {
            NotificationHelper.error('服务器内部错误，请稍后重试');
          } else if (error.message) {
            NotificationHelper.error(error.message);
          } else {
            NotificationHelper.error(errorMessage);
          }
        }
      }
    );
  }

  // 获取排期操作按钮
  getScheduleActionButtons(schedule) {
    const isCompleted = schedule.Status === 'Completed' || schedule.Status === '已完成';
    const isCancelled = schedule.Status === 'Cancelled' || schedule.Status === '已取消';

    if (isCompleted) {
      // 已完成的排期显示完成信息
      return '<span class="text-green-600 text-xs">已完成</span>';
    } else if (isCancelled) {
      // 已取消的排期显示取消状态
      return '<span class="text-red-600 text-xs">已取消</span>';
    } else {
      // 未完成的排期可以完成、取消或删除
      return `
        <button onclick="stemCellManager.completeSchedule('${schedule.ID}')"
                class="text-green-600 hover:text-green-800 mr-2"
                title="完成输注">
            <i class="fas fa-check-circle"></i>
        </button>
        <button onclick="stemCellManager.cancelSchedule('${schedule.ID}')"
                class="text-yellow-600 hover:text-yellow-800 mr-2"
                title="取消排期">
            <i class="fas fa-ban"></i>
        </button>
        <button onclick="stemCellManager.deleteSchedule('${schedule.ID}')"
                class="text-red-600 hover:text-red-800"
                title="删除排期">
            <i class="fas fa-trash"></i>
        </button>
      `;
    }
  }

  // 完成排期
  async completeSchedule(scheduleId) {
    if (!scheduleId) {
      showNotification('排期ID不能为空', 'error');
      return;
    }

    // 弹出对话框获取完成信息
    const doctor = prompt('请输入执行医生姓名（可选）：');
    const nurse = prompt('请输入执行护士姓名（可选）：');
    const notes = prompt('请输入完成备注（可选）：');

    try {
      const response = await window.API.service.put(`/stem-cell/schedules/${scheduleId}/complete`, {
        doctor: doctor || '',
        nurse: nurse || '',
        notes: notes || ''
      });

      if (response.status === 'Success') {
        showNotification('输注完成成功', 'success');
        // 重新加载排期管理窗口
        this.showScheduleManagement();
        // 刷新患者列表
        this.loadPatients();
      } else {
        showNotification(response.message || '完成输注失败', 'error');
      }
    } catch (error) {
      console.error('完成输注失败:', error);

      // 根据错误类型提供具体的错误信息
      let errorMessage = '完成输注失败';
      if (error.message.includes('ECONNREFUSED')) {
        errorMessage = '无法连接到服务器，请检查网络连接';
      } else if (error.message.includes('401')) {
        errorMessage = '登录已过期，请重新登录';
      } else if (error.message.includes('403')) {
        errorMessage = '权限不足，无法执行此操作';
      } else if (error.message.includes('404')) {
        errorMessage = '排期记录不存在';
      } else if (error.message.includes('500')) {
        errorMessage = '服务器内部错误，请稍后重试';
      } else if (error.message) {
        errorMessage = error.message;
      }

      showNotification(errorMessage, 'error');
    }
  }

  // 取消排期
  async cancelSchedule(scheduleId) {
    if (!scheduleId) {
      showNotification('排期ID不能为空', 'error');
      return;
    }

    // 弹出对话框输入取消原因
    const reason = prompt('请输入取消原因（可选）：');

    try {
      const response = await window.API.service.put(`/stem-cell/schedules/${scheduleId}/cancel`, {
        reason: reason || '用户取消'
      });

      if (response.status === 'Success') {
        showNotification('排期取消成功', 'success');
        // 重新加载排期管理窗口
        this.showScheduleManagement();
      } else {
        showNotification(response.message || '取消排期失败', 'error');
      }
    } catch (error) {
      console.error('取消排期失败:', error);

      // 根据错误类型提供具体的错误信息
      let errorMessage = '取消排期失败';
      if (error.message.includes('ECONNREFUSED')) {
        errorMessage = '无法连接到服务器，请检查网络连接';
      } else if (error.message.includes('401')) {
        errorMessage = '登录已过期，请重新登录';
      } else if (error.message.includes('403')) {
        errorMessage = '权限不足，无法执行此操作';
      } else if (error.message.includes('404')) {
        errorMessage = '排期记录不存在';
      } else if (error.message.includes('500')) {
        errorMessage = '服务器内部错误，请稍后重试';
      } else if (error.message) {
        errorMessage = error.message;
      }

      showNotification(errorMessage, 'error');
    }
  }

  // 显示治疗效果评估模态框
  showTreatmentEffectivenessModal() {
    const modal = document.getElementById('treatmentEffectivenessModal');
    modal.classList.remove('hidden');
    this.loadEffectivenessPatients();
  }

  // 加载可用于评估的患者列表
  async loadEffectivenessPatients() {
    try {
      const result = await window.API.stemCell.patients.getAll();

      if (result.status === 'Success') {
        const select = document.getElementById('effectivenessPatientSelect');
        select.innerHTML = '<option value="">请选择患者</option>';

        result.data.forEach(patient => {
          const option = document.createElement('option');
          option.value = patient.ID;
          option.textContent = `${patient.PatientNumber} - ${patient.CustomerName || patient.Name || '未知姓名'}`;
          // 存储CustomerID到DOM元素中
          option.dataset.customerId = patient.CustomerID;
          select.appendChild(option);
        });

        // 绑定患者选择事件
        select.addEventListener('change', (e) => {
          if (e.target.value) {
            // 获取选中的选项
            const selectedOption = e.target.options[e.target.selectedIndex];
            // 存储CustomerID到全局变量
            window.currentEffectivenessCustomerId = selectedOption.dataset.customerId;
            window.currentEffectivenessPatientId = e.target.value;

            this.loadPatientEffectiveness(e.target.value);
          } else {
            this.clearEffectivenessList();
          }
        });
      } else {
        showNotification('加载患者列表失败', 'error');
      }
    } catch (error) {
      console.error('加载患者列表失败:', error);
      showNotification('加载患者列表失败', 'error');
    }
  }

  // 加载患者的治疗效果评估记录
  async loadPatientEffectiveness(patientId) {
    try {
      const result = await window.API.treatmentEffectiveness.getAll({
        patientId: patientId,
        limit: 50
      });

      if (result.status === 'Success') {
        this.renderEffectivenessList(result.data || []);
      } else {
        showNotification('加载评估记录失败', 'error');
      }
    } catch (error) {
      console.error('加载评估记录失败:', error);
      showNotification('加载评估记录失败', 'error');
    }
  }

  // 渲染治疗效果评估列表
  renderEffectivenessList(effectivenessData) {
    const container = document.getElementById('effectivenessList');

    if (!effectivenessData || effectivenessData.length === 0) {
      container.innerHTML = '<div class="text-center text-gray-500 py-8">暂无评估记录</div>';
      return;
    }

    container.innerHTML = effectivenessData.map(record => {
      const typeClass = this.getEffectivenessTypeClass(record.EffectivenessType);
      const typeText = record.EffectivenessType || '未评估';

      return `
        <div class="border rounded-lg p-4 hover:shadow-md transition-shadow">
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <div class="flex items-center space-x-3 mb-2">
                <span class="text-sm text-gray-500">${record.AssessmentDate || '未记录'}</span>
                <span class="px-2 py-1 text-xs rounded-full ${typeClass}">${typeText}</span>
                <span class="text-sm text-gray-600">${record.AssessmentPeriod || ''}</span>
              </div>

              ${record.OverallEffectiveness ? `
                <div class="grid grid-cols-3 gap-4 text-sm mb-2">
                  <div>
                    <span class="text-gray-500">总体效果:</span>
                    <span class="font-medium">${record.OverallEffectiveness}/100</span>
                  </div>
                  <div>
                    <span class="text-gray-500">症状改善:</span>
                    <span class="font-medium">${record.SymptomImprovement || 0}/100</span>
                  </div>
                  <div>
                    <span class="text-gray-500">满意度:</span>
                    <span class="font-medium">${record.PatientSatisfaction || 0}/10</span>
                  </div>
                </div>
              ` : ''}

              ${record.DoctorAssessment ? `
                <div class="text-sm text-gray-600 mb-1">
                  <strong>医生评估:</strong> ${record.DoctorAssessment}
                </div>
              ` : ''}

              ${record.PatientFeedback ? `
                <div class="text-sm text-gray-600">
                  <strong>患者反馈:</strong> ${record.PatientFeedback}
                </div>
              ` : ''}
            </div>

            <div class="flex space-x-2 ml-4">
              <button onclick="stemCellManager.editEffectiveness('${record.ID}')"
                      class="text-blue-600 hover:text-blue-800 text-sm">
                <i class="fas fa-edit"></i> 编辑
              </button>
              <button onclick="stemCellManager.deleteEffectiveness('${record.ID}')"
                      class="text-red-600 hover:text-red-800 text-sm">
                <i class="fas fa-trash"></i> 删除
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // 获取治疗效果类型的样式类
  getEffectivenessTypeClass(type) {
    const classes = {
      '显著改善': 'bg-green-100 text-green-800',
      '改善': 'bg-blue-100 text-blue-800',
      '稳定': 'bg-yellow-100 text-yellow-800',
      '恶化': 'bg-red-100 text-red-800',
      '无效': 'bg-gray-100 text-gray-800'
    };
    return classes[type] || 'bg-gray-100 text-gray-800';
  }

  // 清空评估列表
  clearEffectivenessList() {
    document.getElementById('effectivenessList').innerHTML = '<div class="text-center text-gray-500 py-8">请选择患者查看评估记录</div>';
  }

  // 编辑治疗效果评估
  async editEffectiveness(effectivenessId) {
    try {
      const result = await window.API.treatmentEffectiveness.getById(effectivenessId);

      if (result.status === 'Success') {
        this.showEditEffectivenessModal(result.data);
      } else {
        showNotification('获取评估详情失败', 'error');
      }
    } catch (error) {
      console.error('获取评估详情失败:', error);
      showNotification('获取评估详情失败', 'error');
    }
  }

  // 删除治疗效果评估
  async deleteEffectiveness(effectivenessId) {
    if (!confirm('确定要删除这条评估记录吗？')) {
      return;
    }

    try {
      const result = await window.API.treatmentEffectiveness.delete(effectivenessId);

      if (result.status === 'Success') {
        showNotification('评估记录删除成功', 'success');

        // 重新加载当前患者的评估记录
        const patientSelect = document.getElementById('effectivenessPatientSelect');
        if (patientSelect.value) {
          this.loadPatientEffectiveness(patientSelect.value);
        }
      } else {
        showNotification('删除评估记录失败', 'error');
      }
    } catch (error) {
      console.error('删除评估记录失败:', error);
      showNotification('删除评估记录失败', 'error');
    }
  }

  // 显示编辑模态框
  showEditEffectivenessModal(data = null) {
    const modal = document.getElementById('editEffectivenessModal');
    const form = document.getElementById('effectivenessForm');

    // 重置表单
    form.reset();
    document.getElementById('effectivenessId').value = '';

    if (data) {
      // 编辑模式 - 填充数据
      document.getElementById('effectivenessId').value = data.ID;
      document.getElementById('assessmentDate').value = this.formatDateForInput(data.AssessmentDate);
      document.getElementById('assessmentPeriod').value = data.AssessmentPeriod || '';
      document.getElementById('effectivenessType').value = data.EffectivenessType || '';
      document.getElementById('overallEffectiveness').value = data.OverallEffectiveness || '';
      document.getElementById('symptomImprovement').value = data.SymptomImprovement || '';
      document.getElementById('qualityOfLifeImprovement').value = data.QualityOfLifeImprovement || '';
      document.getElementById('patientSatisfaction').value = data.PatientSatisfaction || '';
      document.getElementById('doctorAssessment').value = data.DoctorAssessment || '';
      document.getElementById('patientFeedback').value = data.PatientFeedback || '';
      document.getElementById('sideEffects').value = data.SideEffects || '';
      document.getElementById('treatmentAdjustment').value = data.TreatmentAdjustment || '';
      document.getElementById('nextAssessmentDate').value = this.formatDateForInput(data.NextAssessmentDate);

      // 存储客户ID
      window.currentEffectivenessCustomerId = data.CustomerID;
    } else {
      // 新建模式 - 设置默认值
      document.getElementById('assessmentDate').value = new Date().toISOString().split('T')[0];
      // CustomerID和PatientID在选择患者时已经设置到全局变量中了
    }

    modal.classList.remove('hidden');
  }

}

// 创建全局实例
const stemCellManager = new StemCellManager();

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  stemCellManager.init();
});

// 暴露到全局作用域，供HTML调用
window.stemCellManager = stemCellManager;