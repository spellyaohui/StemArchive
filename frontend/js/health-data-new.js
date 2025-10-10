/**
 * 健康数据管理页面 JavaScript
 * 版本: 2.0.0
 * 日期: 2025-10-06
 * 适配新的科室管理系统和分类健康数据表
 */

// 全局变量
let todayCustomers = [];
const selectedDepartmentType = null;
let selectedCustomerId = null;
let validatedMedicalExamId = null;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
  // 检查用户认证
  auth.checkAuth();

  // 初始化页面
  initPage();

  // 绑定事件监听器
  bindEventListeners();
});

/**
 * 初始化页面
 */
function initPage() {
  // 设置用户名
  const username = localStorage.getItem('username') || '用户';
  document.getElementById('username').textContent = username;

  // 加载今日新增检客
  loadTodayCustomers();

  // 设置今天的日期为默认值
  const today = new Date().toISOString().split('T')[0];
  const dateInputs = document.querySelectorAll('input[type="date"]');
  dateInputs.forEach(input => {
    if (!input.value) {
      input.value = today;
    }
  });
}

/**
 * 绑定事件监听器
 */
function bindEventListeners() {
  // 绑定表单提交事件
  const labForm = document.getElementById('labHealthForm');
  if (labForm) {
    labForm.addEventListener('submit', handleLabFormSubmit);
  }

  const generalForm = document.getElementById('generalHealthForm');
  if (generalForm) {
    generalForm.addEventListener('submit', handleGeneralFormSubmit);
  }

  const imagingForm = document.getElementById('imagingHealthForm');
  if (imagingForm) {
    imagingForm.addEventListener('submit', handleImagingFormSubmit);
  }
}

/**
 * 加载今日新增体检检客
 */
async function loadTodayCustomers() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const response = await API.customer.getTodayHealthChecks();

    if (response.status === 'Success') {
      todayCustomers = response.data;
      renderTodayCustomersTable();
    } else {
      // 如果API不存在，使用模拟数据
      loadMockTodayCustomers();
    }
  } catch (error) {
    console.error('加载今日检客失败:', error);
    // 使用模拟数据
    loadMockTodayCustomers();
  }
}

/**
 * 加载模拟今日检客数据
 */
function loadMockTodayCustomers() {
  todayCustomers = [
    {
      id: '1',
      identityCard: '110101199001011234',
      name: '张三',
      gender: '男',
      age: 35,
      phone: '13800138001',
      createdAt: new Date().toISOString()
    },
    {
      id: '2',
      identityCard: '110101199002021234',
      name: '李四',
      gender: '女',
      age: 28,
      phone: '13800138002',
      createdAt: new Date().toISOString()
    }
  ];
  renderTodayCustomersTable();
}

/**
 * 渲染今日检客表格
 */
function renderTodayCustomersTable() {
  const tbody = document.getElementById('todayCustomersTableBody');
  const noDataMessage = document.getElementById('noTodayCustomersMessage');

  if (!todayCustomers || todayCustomers.length === 0) {
    tbody.innerHTML = '';
    noDataMessage.classList.remove('hidden');
    return;
  }

  noDataMessage.classList.add('hidden');

  tbody.innerHTML = todayCustomers.map(customer => `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${customer.identityCard}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <i class="fas fa-user-circle text-gray-400 mr-2"></i>
                    <span class="text-sm font-medium text-gray-900">${customer.name}</span>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${customer.gender}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${customer.age || '-'}岁</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${customer.phone || '-'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatDateTime(customer.createdAt)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button onclick="selectTodayCustomer('${customer.id}', '${customer.identityCard}', '${customer.name}')"
                        class="text-blue-600 hover:text-blue-900 mr-3" title="选择此检客">
                    <i class="fas fa-hand-pointer"></i> 选择
                </button>
                <button onclick="viewCustomerHealthData('${customer.id}')"
                        class="text-green-600 hover:text-green-900" title="查看健康数据">
                    <i class="fas fa-heartbeat"></i> 查看
                </button>
            </td>
        </tr>
    `).join('');
}

/**
 * 选择今日检客
 */
function selectTodayCustomer(customerId, identityCard, name) {
  // 设置检客信息
  document.getElementById('customerIdentityCard').value = identityCard;
  selectedCustomerId = customerId;

  // 显示选中的检客信息
  const infoDiv = document.getElementById('selectedCustomerInfo');
  infoDiv.innerHTML = `
        <div class="bg-green-50 border border-green-200 rounded-lg p-3">
            <div class="flex items-center">
                <i class="fas fa-check-circle text-green-500 mr-2"></i>
                <div class="flex-1">
                    <span class="font-medium text-green-800">${name}</span>
                    <span class="text-gray-500 ml-2">身份证号: ${identityCard}</span>
                </div>
                <button
                    type="button"
                    onclick="clearCustomerSelection()"
                    class="text-red-500 hover:text-red-700"
                    title="清除选择"
                >
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `;
  infoDiv.classList.remove('hidden');

  showNotification('success', `已选择检客：${name}`);

  // 如果还没有选择科室类型，滚动到科室选择区域
  if (!selectedDepartmentType) {
    document.querySelector('.department-type-btn').scrollIntoView({ behavior: 'smooth' });
  }
}

/**
 * 验证体检ID
 */
async function validateMedicalExamId() {
  const medicalExamId = document.getElementById('medicalExamId').value.trim();
  const validationDiv = document.getElementById('medicalExamIdValidation');

  if (!medicalExamId) {
    showValidationResult(validationDiv, 'error', '请输入体检ID');
    return;
  }

  try {
    showNotification('info', '正在验证体检ID...');

    const response = await api.get(`/api/health-assessments/medical-exam/${medicalExamId}`);

    if (response.success) {
      // 体检ID已存在，显示相关信息
      const assessment = response.data;
      showValidationResult(validationDiv, 'warning', `体检ID已存在，属于检客：${assessment.CustomerName}（${assessment.IdentityCard}）`);

      // 填充检客信息
      document.getElementById('customerIdentityCard').value = assessment.IdentityCard;
      selectedCustomerId = assessment.CustomerID;

      // 显示检客信息
      const infoDiv = document.getElementById('selectedCustomerInfo');
      infoDiv.innerHTML = `
                <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div class="flex items-center">
                        <i class="fas fa-exclamation-triangle text-yellow-500 mr-2"></i>
                        <div class="flex-1">
                            <span class="font-medium text-yellow-800">${assessment.CustomerName}</span>
                            <span class="text-gray-500 ml-2">身份证号: ${assessment.IdentityCard}</span>
                            <span class="text-yellow-600 ml-2">（已存在体检记录）</span>
                        </div>
                        <button
                            type="button"
                            onclick="clearCustomerSelection()"
                            class="text-red-500 hover:text-red-700"
                            title="清除选择"
                        >
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            `;
      infoDiv.classList.remove('hidden');

      validatedMedicalExamId = medicalExamId;
      showNotification('warning', '体检ID已存在，可以修改原有数据');
    }
  } catch (error) {
    if (error.status === 404) {
      // 体检ID不存在，可以使用
      showValidationResult(validationDiv, 'success', '体检ID可用，请继续填写检客信息');
      validatedMedicalExamId = medicalExamId;
      showNotification('success', '体检ID验证通过');
    } else {
      console.error('验证体检ID失败:', error);
      showValidationResult(validationDiv, 'error', '验证失败，请稍后重试');
    }
  }
}

/**
 * 显示验证结果
 */
function showValidationResult(container, type, message) {
  const typeClasses = {
    success: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    error: 'bg-red-50 border-red-200 text-red-800'
  };

  const typeIcons = {
    success: 'fas fa-check-circle text-green-500',
    warning: 'fas fa-exclamation-triangle text-yellow-500',
    error: 'fas fa-times-circle text-red-500'
  };

  container.className = `mt-1 p-2 rounded border ${typeClasses[type]}`;
  container.innerHTML = `
        <div class="flex items-center">
            <i class="${typeIcons[type]} mr-2"></i>
            <span class="text-sm">${message}</span>
        </div>
    `;
  container.classList.remove('hidden');
}

/**
 * 查看检客健康数据
 */
function viewCustomerHealthData(customerId) {
  // TODO: 实现查看检客健康数据的逻辑
  showNotification('info', '正在加载检客健康数据...');
}

/**
 * 刷新今日检客列表
 */
function refreshTodayCustomers() {
  loadTodayCustomers();
  showNotification('success', '数据已刷新');
}

/**
 * 处理检验表单提交
 */
async function handleLabFormSubmit(e) {
  e.preventDefault();

  if (!validateForm()) {
    return;
  }

  const formData = collectLabFormData();

  try {
    showNotification('info', '正在保存检验数据...');

    const response = await api.post('/health-data/lab', formData);

    if (response.success) {
      showNotification('success', '检验数据保存成功');
      clearLabForm();
    } else {
      showNotification('error', response.message || '保存失败');
    }
  } catch (error) {
    console.error('保存检验数据失败:', error);
    showNotification('error', '网络错误，请检查连接');
  }
}

/**
 * 处理常规科室表单提交
 */
async function handleGeneralFormSubmit(e) {
  e.preventDefault();

  if (!validateForm()) {
    return;
  }

  const formData = collectGeneralFormData();

  try {
    showNotification('info', '正在保存评估数据...');

    const response = await api.post('/health-data/general', formData);

    if (response.success) {
      showNotification('success', '评估数据保存成功');
      clearGeneralForm();
    } else {
      showNotification('error', response.message || '保存失败');
    }
  } catch (error) {
    console.error('保存评估数据失败:', error);
    showNotification('error', '网络错误，请检查连接');
  }
}

/**
 * 处理影像科室表单提交
 */
async function handleImagingFormSubmit(e) {
  e.preventDefault();

  if (!validateForm()) {
    return;
  }

  const formData = collectImagingFormData();

  try {
    showNotification('info', '正在保存影像数据...');

    const response = await api.post('/health-data/imaging', formData);

    if (response.success) {
      showNotification('success', '影像数据保存成功');
      clearImagingForm();
    } else {
      showNotification('error', response.message || '保存失败');
    }
  } catch (error) {
    console.error('保存影像数据失败:', error);
    showNotification('error', '网络错误，请检查连接');
  }
}

/**
 * 收集检验表单数据
 */
function collectLabFormData() {
  const testItems = [];
  const labItems = document.querySelectorAll('#labTestItems > div');

  labItems.forEach(item => {
    const testName = item.querySelector('[name="testName"]')?.value;
    const testResult = item.querySelector('[name="testResult"]')?.value;
    const referenceValue = item.querySelector('[name="referenceValue"]')?.value;
    const abnormalStatus = item.querySelector('[name="abnormalStatus"]')?.value;
    const unit = item.querySelector('[name="unit"]')?.value;

    if (testName && testResult) {
      testItems.push({
        testName,
        testResult,
        referenceValue,
        abnormalStatus: parseInt(abnormalStatus) || 0,
        unit
      });
    }
  });

  return {
    customerId: selectedCustomerId,
    medicalExamId: validatedMedicalExamId,
    departmentId: parseInt(document.getElementById('departmentSelect').value),
    testDate: document.getElementById('testDate').value,
    doctor: document.getElementById('doctorName').value,
    testItems
  };
}

/**
 * 收集常规科室表单数据
 */
function collectGeneralFormData() {
  const assessmentItems = [];
  const generalItems = document.querySelectorAll('#generalAssessmentItems > div');

  generalItems.forEach(item => {
    const itemName = item.querySelector('[name="itemName"]')?.value;
    const itemResult = item.querySelector('[name="itemResult"]')?.value;

    if (itemName && itemResult) {
      assessmentItems.push({
        itemName,
        itemResult
      });
    }
  });

  return {
    customerId: selectedCustomerId,
    medicalExamId: validatedMedicalExamId,
    departmentId: parseInt(document.getElementById('departmentSelect').value),
    assessmentDate: document.getElementById('assessmentDate').value,
    doctor: document.getElementById('doctorName').value,
    assessmentItems
  };
}

/**
 * 收集影像科室表单数据
 */
function collectImagingFormData() {
  return {
    customerId: selectedCustomerId,
    medicalExamId: validatedMedicalExamId,
    departmentId: parseInt(document.getElementById('departmentSelect').value),
    examDate: document.getElementById('examDate').value,
    doctor: document.getElementById('doctorName').value,
    examDescription: document.getElementById('examDescription').value,
    examConclusion: document.getElementById('examConclusion').value
  };
}

/**
 * 验证表单
 */
function validateForm() {
  // 验证体检ID
  const medicalExamId = document.getElementById('medicalExamId').value.trim();
  if (!medicalExamId) {
    showNotification('error', '请输入体检ID');
    return false;
  }

  if (medicalExamId !== validatedMedicalExamId) {
    showNotification('error', '请先验证体检ID');
    return false;
  }

  // 验证是否已选择检客
  if (!selectedCustomerId) {
    showNotification('error', '请先选择检客');
    return false;
  }

  // 验证是否已选择科室
  const departmentId = document.getElementById('departmentSelect').value;
  if (!departmentId) {
    showNotification('error', '请选择科室');
    return false;
  }

  return true;
}

/**
 * 清空检验表单
 */
function clearLabForm() {
  document.getElementById('labHealthForm').reset();
  document.getElementById('labTestItems').innerHTML = '';
}

/**
 * 清空常规科室表单
 */
function clearGeneralForm() {
  document.getElementById('generalHealthForm').reset();
  document.getElementById('generalAssessmentItems').innerHTML = '';
}

/**
 * 清空影像科室表单
 */
function clearImagingForm() {
  document.getElementById('imagingHealthForm').reset();
}

/**
 * 清除检客选择
 */
function clearCustomerSelection() {
  document.getElementById('customerIdentityCard').value = '';
  document.getElementById('selectedCustomerInfo').classList.add('hidden');
  selectedCustomerId = null;

  // 同时清除体检ID验证状态
  document.getElementById('medicalExamId').value = '';
  document.getElementById('medicalExamIdValidation').classList.add('hidden');
  validatedMedicalExamId = null;
}

/**
 * 格式化日期时间
 */
function formatDateTime(dateString) {
  if (!dateString) {return '-';}
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// 确保NotificationHelper可用
if (typeof NotificationHelper === 'undefined') {
  console.warn('NotificationHelper未加载，请确保utils.js已引入');
}