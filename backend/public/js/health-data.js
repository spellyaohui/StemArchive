/**
 * 健康数据管理页面脚本
 * 负责体检数据的录入和管理
 */

class HealthDataManager {
  constructor() {
    this.departments = [
      { id: 'internal', name: '内科', icon: 'stethoscope' },
      { id: 'surgery', name: '外科', icon: 'user-md' },
      { id: 'imaging', name: '影像科', icon: 'x-ray' },
      { id: 'laboratory', name: '检验科', icon: 'vial' },
      { id: 'functional', name: '功能科', icon: 'heartbeat' },
      { id: 'orthopedics', name: '骨科', icon: 'bone' }
    ];
    this.selectedDepartment = '';
    this.init();
  }

  init() {
    this.loadDepartments();
    this.loadCustomers();
    this.bindEvents();
  }

  // 加载科室信息
  loadDepartments() {
    const departmentSelect = document.getElementById('departmentSelect');
    if (departmentSelect) {
      departmentSelect.innerHTML = '<option value="">请选择科室</option>' +
                this.departments.map(dept =>
                  `<option value="${dept.id}">${dept.name}</option>`
                ).join('');
    }
  }

  // 加载检客列表
  async loadCustomers() {
    try {
      // 使用模拟检客数据
      const customersData = [
        {
          id: '1',
          name: '章宏',
          id_card: '110101197301011234'
        },
        {
          id: '2',
          name: '王鹏飞',
          id_card: '110101197801011234'
        },
        {
          id: '3',
          name: '李女士',
          id_card: '110101198701011234'
        }
      ];

      this.populateCustomerSelect(customersData);

    } catch (error) {
      console.error('加载检客列表失败:', error);
    }
  }

  // 填充检客选择框
  populateCustomerSelect(customers) {
    const customerSelect = document.getElementById('customerSelect');
    if (customerSelect) {
      customerSelect.innerHTML = '<option value="">请选择检客</option>' +
                customers.map(customer =>
                  `<option value="${customer.id}">${customer.name} (${customer.id_card})</option>`
                ).join('');
    }
  }

  // 绑定事件
  bindEvents() {
    // 科室按钮点击事件
    document.querySelectorAll('.department-btn').forEach((btn, index) => {
      btn.addEventListener('click', () => {
        this.selectDepartment(this.departments[index].id);
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
    const clearBtn = document.getElementById('clearHealthForm');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.clearForm();
      });
    }

    // 设置今天日期为默认值
    const assessmentDate = document.getElementById('assessmentDate');
    if (assessmentDate && !assessmentDate.value) {
      assessmentDate.value = new Date().toISOString().split('T')[0];
    }
  }

  // 选择科室
  selectDepartment(departmentId) {
    this.selectedDepartment = departmentId;

    // 更新按钮样式
    document.querySelectorAll('.department-btn').forEach((btn, index) => {
      if (this.departments[index].id === departmentId) {
        btn.classList.add('ring-2', 'ring-blue-500');
      } else {
        btn.classList.remove('ring-2', 'ring-blue-500');
      }
    });

    // 自动选择科室下拉框
    const departmentSelect = document.getElementById('departmentSelect');
    if (departmentSelect) {
      departmentSelect.value = departmentId;
    }

    // 加载该科室的数据模板
    this.loadDepartmentTemplate(departmentId);
  }

  // 加载科室数据模板
  loadDepartmentTemplate(departmentId) {
    const templates = {
      internal: {
        title: '内科体检数据模板',
        fields: [
          { name: 'blood_pressure', label: '血压', type: 'text', placeholder: '例如: 120/80 mmHg' },
          { name: 'heart_rate', label: '心率', type: 'number', placeholder: '次/分钟' },
          { name: 'temperature', label: '体温', type: 'text', placeholder: '°C' },
          { name: 'respiratory_rate', label: '呼吸频率', type: 'number', placeholder: '次/分钟' }
        ]
      },
      surgery: {
        title: '外科体检数据模板',
        fields: [
          { name: 'wound_status', label: '伤口情况', type: 'textarea', placeholder: '请描述伤口情况' },
          { name: 'surgical_history', label: '手术史', type: 'textarea', placeholder: '请描述手术历史' }
        ]
      },
      imaging: {
        title: '影像科检查数据',
        fields: [
          { name: 'imaging_type', label: '检查类型', type: 'select', options: ['X光', 'CT', 'MRI', '超声'] },
          { name: 'imaging_result', label: '检查结果', type: 'textarea', placeholder: '请描述影像学检查结果' }
        ]
      },
      laboratory: {
        title: '检验科检查数据',
        fields: [
          { name: 'blood_test', label: '血常规', type: 'textarea', placeholder: '请输入血常规检查结果' },
          { name: 'biochemistry', label: '生化检查', type: 'textarea', placeholder: '请输入生化检查结果' },
          { name: 'urine_test', label: '尿常规', type: 'textarea', placeholder: '请输入尿常规检查结果' }
        ]
      },
      functional: {
        title: '功能科检查数据',
        fields: [
          { name: 'ecg', label: '心电图', type: 'textarea', placeholder: '请描述心电图检查结果' },
          { name: 'eeg', label: '脑电图', type: 'textarea', placeholder: '请描述脑电图检查结果' }
        ]
      },
      orthopedics: {
        title: '骨科检查数据',
        fields: [
          { name: 'bone_density', label: '骨密度', type: 'text', placeholder: '请输入骨密度值' },
          { name: 'joint_exam', label: '关节检查', type: 'textarea', placeholder: '请描述关节检查结果' }
        ]
      }
    };

    const template = templates[departmentId];
    if (!template) {return;}

    this.showTemplateModal(template);
  }

  // 显示模板模态框
  showTemplateModal(template) {
    const modalContainer = document.getElementById('modalContainer');
    if (!modalContainer) {return;}

    const fieldsHTML = template.fields.map(field => {
      let fieldHTML = `
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">${field.label}</label>
            `;

      if (field.type === 'select') {
        fieldHTML += `
                    <select name="${field.name}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">请选择</option>
                        ${field.options.map(option => `<option value="${option}">${option}</option>`).join('')}
                    </select>
                `;
      } else if (field.type === 'textarea') {
        fieldHTML += `
                    <textarea name="${field.name}" rows="3" placeholder="${field.placeholder}"
                              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
                `;
      } else {
        fieldHTML += `
                    <input type="${field.type}" name="${field.name}" placeholder="${field.placeholder}"
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                `;
      }

      fieldHTML += '</div>';
      return fieldHTML;
    }).join('');

    modalContainer.innerHTML = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                    <div class="p-6 border-b border-gray-200">
                        <h3 class="text-lg font-medium text-gray-900">${template.title}</h3>
                    </div>
                    <form class="p-6">
                        <div class="space-y-4">
                            ${fieldsHTML}
                        </div>
                        <div class="flex justify-end space-x-3 mt-6">
                            <button type="button" onclick="healthDataManager.closeModal()"
                                    class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                                取消
                            </button>
                            <button type="button" onclick="healthDataManager.applyTemplate()"
                                    class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                                应用模板
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
  }

  // 应用模板
  applyTemplate() {
    const modalContainer = document.getElementById('modalContainer');
    const form = modalContainer.querySelector('form');
    const formData = new FormData(form);
    const templateData = Object.fromEntries(formData.entries());

    // 将模板数据合并到评估数据中
    const assessmentDataTextarea = document.getElementById('assessmentData');
    if (assessmentDataTextarea) {
      const currentData = assessmentDataTextarea.value;
      const templateText = Object.entries(templateData)
        .filter(([key, value]) => value)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');

      assessmentDataTextarea.value = currentData ?
        `${currentData}\n\n${templateText}` : templateText;
    }

    this.closeModal();
  }

  // 保存健康数据
  async saveHealthData() {
    const form = document.getElementById('healthDataForm');
    const formData = new FormData(form);
    const healthData = Object.fromEntries(formData.entries());

    try {
      const response = await window.API.service.post('/health-data', healthData);

      if (response.status === 'Success') {
        NotificationHelper.success('健康数据保存成功', '体检数据已录入系统');
        this.clearForm();
      } else {
        NotificationHelper.error('保存失败', response.message || '健康数据保存失败，请重试');
      }
    } catch (error) {
      console.error('保存健康数据失败:', error);
      NotificationHelper.error('保存失败', '网络连接异常，请检查网络后重试');
    }
  }

  // 清空表单
  clearForm() {
    const form = document.getElementById('healthDataForm');
    if (form) {
      form.reset();
      // 重新设置今天日期
      const assessmentDate = document.getElementById('assessmentDate');
      if (assessmentDate) {
        assessmentDate.value = new Date().toISOString().split('T')[0];
      }
    }

    // 清除科室选择
    this.selectedDepartment = '';
    document.querySelectorAll('.department-btn').forEach(btn => {
      btn.classList.remove('ring-2', 'ring-blue-500');
    });
  }

  // 关闭模态框
  closeModal() {
    const modalContainer = document.getElementById('modalContainer');
    if (modalContainer) {
      modalContainer.innerHTML = '';
    }
  }
}

// 创建全局实例
const healthDataManager = new HealthDataManager();

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  healthDataManager.init();
});