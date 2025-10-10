/**
 * 科室管理页面 JavaScript
 * 版本: 1.0.0
 * 日期: 2025-10-06
 */

// 全局变量
let departments = [];
let currentEditId = null;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
  console.log('department-management: DOMContentLoaded事件触发');

  // 检查用户认证
  try {
    if (typeof auth !== 'undefined' && auth.checkAuth) {
      auth.checkAuth();
    }
  } catch (error) {
    console.warn('用户认证检查失败:', error);
  }

  // 初始化页面
  try {
    initPage();
  } catch (error) {
    console.error('页面初始化失败:', error);
  }

  // 绑定事件监听器
  try {
    bindEventListeners();
    console.log('department-management: 事件监听器绑定完成');
  } catch (error) {
    console.error('绑定事件监听器失败:', error);
  }
});

// 确保在页面完全加载后也能工作
window.addEventListener('load', function() {
  console.log('department-management: window.load事件触发');

  // 再次尝试绑定事件监听器（以防DOMContentLoaded时出现问题）
  try {
    const addBtn = document.getElementById('addDepartmentBtn');
    if (addBtn && !addBtn.hasAttribute('data-bound')) {
      bindEventListeners();
      console.log('department-management: 通过load事件重新绑定监听器');
    }
  } catch (error) {
    console.error('load事件中重新绑定失败:', error);
  }
});

/**
 * 初始化页面
 */
function initPage() {
  // 设置用户名（如果元素存在）
  const usernameElement = document.getElementById('username');
  if (usernameElement) {
    const username = localStorage.getItem('username') || '用户';
    usernameElement.textContent = username;
  }

  // 加载科室数据
  loadDepartments();

  // 更新统计信息
  updateStatistics();
}

/**
 * 绑定事件监听器
 */
function bindEventListeners() {
  try {
    console.log('department-management: 开始绑定事件监听器');

    // 新增科室按钮 - 最重要的按钮
    const addDepartmentBtn = document.getElementById('addDepartmentBtn');
    if (addDepartmentBtn) {
      // 检查是否已经绑定过
      if (!addDepartmentBtn.hasAttribute('data-bound')) {
        addDepartmentBtn.addEventListener('click', function(e) {
          console.log('department-management: 新增科室按钮被点击');
          e.preventDefault();
          e.stopPropagation();
          if (typeof openDepartmentModal === 'function') {
            openDepartmentModal();
          } else {
            console.error('department-management: openDepartmentModal函数不存在');
          }
        });
        addDepartmentBtn.setAttribute('data-bound', 'true');
        console.log('department-management: 新增科室按钮事件绑定成功');
      } else {
        console.log('department-management: 新增科室按钮已经绑定过事件');
      }
    } else {
      console.error('department-management: 找不到新增科室按钮');
    }

    // 搜索输入
    const searchInput = document.getElementById('searchInput');
    if (searchInput && !searchInput.hasAttribute('data-bound')) {
      searchInput.addEventListener('input', filterDepartments);
      searchInput.setAttribute('data-bound', 'true');
    }

    // 类型筛选
    const typeFilter = document.getElementById('typeFilter');
    if (typeFilter && !typeFilter.hasAttribute('data-bound')) {
      typeFilter.addEventListener('change', filterDepartments);
      typeFilter.setAttribute('data-bound', 'true');
    }

    // 状态筛选
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter && !statusFilter.hasAttribute('data-bound')) {
      statusFilter.addEventListener('change', filterDepartments);
      statusFilter.setAttribute('data-bound', 'true');
    }

    // 刷新按钮
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn && !refreshBtn.hasAttribute('data-bound')) {
      refreshBtn.addEventListener('click', function() {
        loadDepartments();
        showNotification('success', '数据已刷新');
      });
      refreshBtn.setAttribute('data-bound', 'true');
    }

    // 科室表单提交
    const departmentForm = document.getElementById('departmentForm');
    if (departmentForm && !departmentForm.hasAttribute('data-bound')) {
      departmentForm.addEventListener('submit', function(e) {
        e.preventDefault();
        saveDepartment();
      });
      departmentForm.setAttribute('data-bound', 'true');
    }

    console.log('department-management: 所有事件监听器绑定完成');
  } catch (error) {
    console.error('绑定事件监听器时出错:', error);
  }
}

/**
 * 加载科室数据
 */
async function loadDepartments() {
  try {
    // 检查API是否可用
    if (typeof api === 'undefined' || !api.get) {
      console.warn('API不可用，跳过数据加载');
      // 使用空数据
      departments = [];
      renderDepartmentTable();
      updateStatistics();
      return;
    }

    const response = await api.get('/departments');
    if (response.success) {
      departments = response.data || [];
      renderDepartmentTable();
      updateStatistics();
    } else {
      showNotification('error', response.message || '加载科室数据失败');
    }
  } catch (error) {
    console.error('加载科室数据失败:', error);
    showNotification('error', '网络错误，请检查连接');
    // 出错时使用空数据
    departments = [];
    renderDepartmentTable();
    updateStatistics();
  }
}

/**
 * 渲染科室表格
 */
function renderDepartmentTable() {
  const tbody = document.getElementById('departmentTableBody');
  const noDataMessage = document.getElementById('noDataMessage');

  if (!departments || departments.length === 0) {
    tbody.innerHTML = '';
    noDataMessage.classList.remove('hidden');
    return;
  }

  noDataMessage.classList.add('hidden');

  tbody.innerHTML = departments.map(dept => `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-sm font-medium text-gray-900">${dept.Code || ''}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    ${getDepartmentIcon(dept.Type)}
                    <span class="ml-2 text-sm font-medium text-gray-900">${dept.Name || ''}</span>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getTypeBadgeClass(dept.Type)}">
                    ${getTypeLabel(dept.Type)}
                </span>
            </td>
            <td class="px-6 py-4">
                <span class="text-sm text-gray-500">${dept.Description || '-'}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-sm text-gray-900">${dept.Sort_Order || 0}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${dept.Status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    ${dept.Status === 'active' ? '启用' : '禁用'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${formatDate(dept.CreatedAt)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button onclick="editDepartment('${dept.id}')" class="text-blue-600 hover:text-blue-900 mr-3" title="编辑">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="toggleDepartmentStatus('${dept.id}', '${dept.Status}')"
                        class="${dept.Status === 'active' ? 'text-yellow-600 hover:text-yellow-900' : 'text-green-600 hover:text-green-900'} mr-3"
                        title="${dept.Status === 'active' ? '禁用' : '启用'}">
                    <i class="fas fa-${dept.Status === 'active' ? 'ban' : 'check'}"></i>
                </button>
                <button onclick="deleteDepartment('${dept.id}')" class="text-red-600 hover:text-red-900" title="删除">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

/**
 * 更新统计信息
 */
function updateStatistics() {
  const total = departments.length;
  const lab = departments.filter(d => d.Type === 'laboratory').length;
  const general = departments.filter(d => d.Type === 'general').length;
  const imaging = departments.filter(d => d.Type === 'imaging').length;
  const instrument = departments.filter(d => d.Type === 'instrument').length;

  document.getElementById('totalDepartments').textContent = total;
  document.getElementById('labDepartments').textContent = lab;
  document.getElementById('generalDepartments').textContent = general;
  document.getElementById('imagingDepartments').textContent = imaging;
  document.getElementById('instrumentDepartments').textContent = instrument;
}

/**
 * 筛选科室
 */
function filterDepartments() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  const typeFilter = document.getElementById('typeFilter').value;
  const statusFilter = document.getElementById('statusFilter').value;

  const filtered = departments.filter(dept => {
    const matchesSearch = !searchTerm ||
            (dept.Name && dept.Name.toLowerCase().includes(searchTerm)) ||
            (dept.Code && dept.Code.toLowerCase().includes(searchTerm));

    const matchesType = !typeFilter || dept.Type === typeFilter;
    const matchesStatus = !statusFilter || dept.Status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  // 临时替换数据并重新渲染
  const originalDepartments = departments;
  departments = filtered;
  renderDepartmentTable();
  departments = originalDepartments;
}

/**
 * 打开科室模态框
 */
function openDepartmentModal(dept = null) {
  const modal = document.getElementById('departmentModal');
  const modalTitle = document.getElementById('modalTitle');
  const form = document.getElementById('departmentForm');

  // 重置表单
  form.reset();
  currentEditId = null;

  if (dept) {
    // 编辑模式
    modalTitle.textContent = '编辑科室';
    currentEditId = dept.id;
    document.getElementById('departmentId').value = dept.id;
    document.getElementById('departmentCode').value = dept.Code || '';
    document.getElementById('departmentName').value = dept.Name || '';
    document.getElementById('departmentType').value = dept.Type || '';
    document.getElementById('departmentDescription').value = dept.Description || '';
    document.getElementById('departmentSort').value = dept.Sort_Order || 0;
    document.getElementById('departmentStatus').value = dept.Status || 'active';

    // 编辑模式下编码不可修改
    document.getElementById('departmentCode').setAttribute('readonly', true);
  } else {
    // 新增模式
    modalTitle.textContent = '新增科室';
    document.getElementById('departmentCode').removeAttribute('readonly');
  }

  modal.classList.remove('hidden');
}

/**
 * 关闭科室模态框
 */
function closeDepartmentModal() {
  document.getElementById('departmentModal').classList.add('hidden');
  document.getElementById('departmentForm').reset();
  currentEditId = null;
}

/**
 * 编辑科室
 */
function editDepartment(id) {
  const dept = departments.find(d => d.id == id);
  if (dept) {
    openDepartmentModal(dept);
  }
}

/**
 * 保存科室
 */
async function saveDepartment() {
  const formData = {
    code: document.getElementById('departmentCode').value.trim(),
    name: document.getElementById('departmentName').value.trim(),
    type: document.getElementById('departmentType').value,
    description: document.getElementById('departmentDescription').value.trim(),
    sort_order: parseInt(document.getElementById('departmentSort').value) || 0,
    status: document.getElementById('departmentStatus').value
  };

  // 表单验证
  if (!formData.code || !formData.name || !formData.type) {
    showNotification('error', '请填写必填字段');
    return;
  }

  // 检查API是否可用
  if (typeof api === 'undefined' || !api.post || !api.put) {
    console.error('API不可用，无法保存科室数据');
    showNotification('error', '系统错误：API不可用，请检查网络连接或联系管理员');
    return;
  }

  try {
    let response;
    if (currentEditId) {
      // 更新科室
      response = await api.put(`/departments/${currentEditId}`, formData);
    } else {
      // 新增科室
      response = await api.post('/departments', formData);
    }

    if (response.success) {
      showNotification('success', currentEditId ? '科室更新成功' : '科室新增成功');
      closeDepartmentModal();
      loadDepartments();
    } else {
      showNotification('error', response.message || '操作失败');
    }
  } catch (error) {
    console.error('保存科室失败:', error);
    showNotification('error', '网络错误，请检查连接');
  }
}

/**
 * 切换科室状态
 */
async function toggleDepartmentStatus(id, currentStatus) {
  const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
  const action = newStatus === 'active' ? '启用' : '禁用';

  if (!confirm(`确定要${action}该科室吗？`)) {
    return;
  }

  try {
    const response = await api.put(`/departments/${id}/status`, { status: newStatus });

    if (response.success) {
      showNotification('success', `科室${action}成功`);
      loadDepartments();
    } else {
      showNotification('error', response.message || '操作失败');
    }
  } catch (error) {
    console.error('切换科室状态失败:', error);
    showNotification('error', '网络错误，请检查连接');
  }
}

/**
 * 删除科室
 */
async function deleteDepartment(id) {
  if (!confirm('确定要删除该科室吗？删除后无法恢复！')) {
    return;
  }

  try {
    const response = await api.delete(`/departments/${id}`);

    if (response.success) {
      showNotification('success', '科室删除成功');
      loadDepartments();
    } else {
      showNotification('error', response.message || '删除失败');
    }
  } catch (error) {
    console.error('删除科室失败:', error);
    showNotification('error', '网络错误，请检查连接');
  }
}

/**
 * 获取科室图标
 */
function getDepartmentIcon(type) {
  const icons = {
    'laboratory': '<i class="fas fa-vial text-yellow-500"></i>',
    'general': '<i class="fas fa-stethoscope text-green-500"></i>',
    'imaging': '<i class="fas fa-x-ray text-purple-500"></i>',
    'instrument': '<i class="fas fa-microscope text-blue-500"></i>'
  };
  return icons[type] || '<i class="fas fa-hospital text-gray-500"></i>';
}

/**
 * 获取类型标签样式
 */
function getTypeBadgeClass(type) {
  const classes = {
    'laboratory': 'bg-yellow-100 text-yellow-800',
    'general': 'bg-green-100 text-green-800',
    'imaging': 'bg-purple-100 text-purple-800',
    'instrument': 'bg-blue-100 text-blue-800'
  };
  return classes[type] || 'bg-gray-100 text-gray-800';
}

/**
 * 获取类型标签文本
 */
function getTypeLabel(type) {
  const labels = {
    'laboratory': '检验科',
    'general': '常规科室',
    'imaging': '影像科室',
    'instrument': '仪器室'
  };
  return labels[type] || '未知';
}

/**
 * 格式化日期
 */
function formatDate(dateString) {
  if (!dateString) {return '-';}
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

// 显示通知的通用函数（如果utils.js中没有的话）
// 确保NotificationHelper可用
if (typeof NotificationHelper === 'undefined') {
  console.warn('NotificationHelper未加载，请确保utils.js已引入');
}