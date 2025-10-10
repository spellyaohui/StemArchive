/**
 * 检客管理页面脚本
 * 负责检客信息的增删改查功能
 */

class CustomersManager {
  constructor() {
    this.customers = [];
    this.currentPage = 1;
    this.pageSize = 10;
    this.totalCustomers = 0; // 总客户数
    this.searchTerm = '';
    this.isSubmitting = false; // 防止重复提交
    this.init();
  }

  init() {
    this.loadCustomers();
    this.bindEvents();
  }

  // 加载检客列表
  async loadCustomers() {
    try {
      const params = {
        page: this.currentPage || 1,
        limit: this.pageSize || 10,
        search: this.searchTerm || ''
      };

      const result = await window.API.customer.getAll(params);

      if (result.status === 'Success') {
        this.customers = result.data || [];
        this.totalCustomers = this.customers.length; // 临时修复：使用当前数据长度作为总数
        this.renderCustomersList();
        this.renderPagination(result.pagination);
        this.updatePaginationInfo(); // 确保更新分页信息显示
      } else {
        throw new Error(result.message || '获取检客数据失败');
      }

    } catch (error) {
      console.error('加载检客列表失败:', error);
      if (error.message.includes('fetch') || error.message.includes('network')) {
        NotificationHelper.networkError('无法加载检客列表，请检查网络连接', () => {
          customers.loadCustomers(); // 重试加载
        });
      } else {
        NotificationHelper.error('加载检客列表失败，请刷新页面重试', '数据加载错误');
      }
      this.showEmptyState();
    }
  }

  // 渲染检客列表
  renderCustomersList() {
    const container = document.getElementById('customersList');
    if (!container) {return;}

    if (this.customers.length === 0) {
      container.innerHTML = `
                <tr>
                    <td colspan="8" class="px-6 py-8 text-center text-gray-500">
                        <i class="fas fa-users text-3xl mb-2"></i>
                        <p>暂无检客数据</p>
                    </td>
                </tr>
            `;
      return;
    }

    container.innerHTML = this.customers.map(customer => `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                            <i class="fas fa-user text-blue-600 text-sm"></i>
                        </div>
                        <div class="font-medium text-gray-900">${customer.Name || customer.name}</div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${customer.Gender === '男' || customer.gender === 'male' ? '男' : '女'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${customer.Age || customer.age}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${customer.IdentityCard || customer.identityCard || customer.id_card}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${customer.Phone || customer.phone || '无'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${customer.ContactPerson || customer.contactPerson || '无'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${this.getStatusClass(customer.Status || customer.status)}">
                        ${this.getStatusText(customer.Status || customer.status)}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onclick="customersManager.viewCustomer('${customer.ID}')" class="text-blue-600 hover:text-blue-900 mr-3">
                        <i class="fas fa-eye"></i> 查看
                    </button>
                    <button onclick="customersManager.editCustomer('${customer.ID}')" class="text-green-600 hover:text-green-900 mr-3">
                        <i class="fas fa-edit"></i> 编辑
                    </button>
                    <button onclick="customersManager.deleteCustomer('${customer.ID}')" class="text-red-600 hover:text-red-900">
                        <i class="fas fa-trash"></i> 删除
                    </button>
                </td>
            </tr>
        `).join('');

    // 更新分页信息
    this.updatePaginationInfo();
  }

  // 显示空状态
  showEmptyState() {
    const container = document.getElementById('customersList');
    if (!container) {return;}

    container.innerHTML = `
            <tr>
                <td colspan="8" class="px-6 py-8 text-center text-gray-500">
                    <i class="fas fa-users text-3xl mb-2"></i>
                    <p>暂无检客数据</p>
                </td>
            </tr>
        `;
  }

  // 获取状态样式类
  getStatusClass(status) {
    const statusClasses = {
      'Active': 'bg-green-100 text-green-800',
      'Inactive': 'bg-gray-100 text-gray-800',
      'Pending': 'bg-yellow-100 text-yellow-800',
      'active': 'bg-green-100 text-green-800',
      'inactive': 'bg-gray-100 text-gray-800',
      'pending': 'bg-yellow-100 text-yellow-800'
    };
    return statusClasses[status] || 'bg-gray-100 text-gray-800';
  }

  // 获取状态文本
  getStatusText(status) {
    const statusTexts = {
      'Active': '活跃',
      'Inactive': '未激活',
      'Pending': '待审核',
      'active': '活跃',
      'inactive': '未激活',
      'pending': '待审核'
    };
    return statusTexts[status] || '未知';
  }

  // 更新分页信息
  updatePaginationInfo() {
    const startElement = document.getElementById('customersStart');
    const endElement = document.getElementById('customersEnd');
    const totalElement = document.getElementById('customersTotal');

    // 确保数值类型
    const currentPage = parseInt(this.currentPage) || 1;
    const pageSize = parseInt(this.pageSize) || 10;
    const customersLength = parseInt(this.customers?.length) || 0;
    const totalCustomers = parseInt(this.totalCustomers) || customersLength;

    // 计算分页信息
    const start = (currentPage - 1) * pageSize + 1;
    const end = Math.min(currentPage * pageSize, totalCustomers);
    const total = totalCustomers;

    console.log('更新分页信息:', {
      currentPage,
      pageSize,
      start,
      end,
      total,
      customersLength,
      totalCustomers
    });

    if (startElement) {startElement.textContent = start;}
    if (endElement) {endElement.textContent = end;}
    if (totalElement) {totalElement.textContent = total;}
  }

  // 渲染分页控件
  renderPagination(pagination) {
    const container = document.getElementById('customersPagination');
    if (!container || !pagination) {return;}

    const { totalPages, currentPage, total } = pagination;
    this.currentPage = currentPage;
    this.totalCustomers = total; // 设置总客户数

    // 处理totalPages为null的情况
    const calculatedTotalPages = totalPages || Math.ceil(total / this.pageSize) || 1;

    console.log('渲染分页控件:', {
      pagination,
      totalPages,
      currentPage,
      total,
      totalCustomers: this.totalCustomers,
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
                <button onclick="customersManager.goToPage(${currentPage - 1})" class="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50">
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
                    <button onclick="customersManager.goToPage(${i})" class="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                        ${i}
                    </button>
                `;
      } else if (Math.abs(i - currentPage) === 3) {
        paginationHTML += '<span class="px-3 py-1 text-sm text-gray-500">...</span>';
      }
    }

    // 下一页
    if (currentPage < calculatedTotalPages) {
      paginationHTML += `
                <button onclick="customersManager.goToPage(${currentPage + 1})" class="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                    <i class="fas fa-chevron-right"></i>
                </button>
            `;
    }

    container.innerHTML = paginationHTML;
  }

  // 跳转到指定页面
  goToPage(page) {
    this.currentPage = page;
    this.loadCustomers();
  }

  // 搜索检客
  searchCustomers() {
    const searchInput = document.getElementById('customerSearch');
    if (searchInput) {
      this.searchTerm = searchInput.value;
      this.currentPage = 1;
      this.loadCustomers();
    }
  }

  // 查看检客详情
  async viewCustomer(id) {
    try {
      // 从API获取完整的客户详情
      const response = await window.API.customer.getById(id);

      if (response.status === 'Success') {
        this.showCustomerModal(response.data, 'view');
      } else {
        NotificationHelper.error('获取客户详情失败: ' + response.message, '数据加载错误');
      }
    } catch (error) {
      console.error('查看客户详情失败:', error);
      NotificationHelper.error('查看客户详情失败，请重试', '查看失败');
    }
  }

  // 编辑检客
  async editCustomer(id) {
    try {
      // 从API获取完整的客户详情
      const response = await window.API.customer.getById(id);

      if (response.status === 'Success') {
        this.showCustomerModal(response.data, 'edit');
      } else {
        NotificationHelper.error('获取客户详情失败: ' + response.message, '数据加载错误');
      }
    } catch (error) {
      console.error('获取客户详情失败:', error);
      showNotification('获取客户详情失败', 'error');
    }
  }

  // 删除检客
  async deleteCustomer(id) {
    // 显示危险警告确认框
    const dangerMessage = `
⚠️  危险操作警告 ⚠️

您即将执行一个永久性删除操作，此操作具有以下严重后果：

🔴 数据完全清除：该检客的所有数据将从系统中彻底抹除，包括：
   • 个人档案信息
   • 健康评估记录（所有科室数据）
   • AI健康评估报告和对比分析报告
   • 干细胞治疗记录和输注计划
   • 医学影像和检验数据
   • 治疗效果和历史记录
   • 所有相关通知和报告

🔴 操作不可逆：一旦删除，所有数据将永久丢失，无法恢复！

🔴 系统完整性：删除后可能影响历史统计数据和报表完整性。

请您仔细确认：
1. 是否已备份该检客的重要数据？
2. 是否确定不再需要该检客的任何历史记录？
3. 是否获得必要的删除授权？

如果确认要继续此危险操作，请输入"DELETE"进行确认：`;

    const confirmation = prompt(dangerMessage);
    if (confirmation !== 'DELETE') {
      if (confirmation !== null) {
        NotificationHelper.warning('操作已取消。输入不正确，删除操作未执行。', '危险操作已终止');
      }
      return;
    }

    try {
      // 显示删除进度提示
      NotificationHelper.warning('正在执行永久删除操作，请稍候...', '危险操作执行中');

      const response = await window.API.customer.delete(id);

      if (response.status === 'Success') {
        NotificationHelper.success('检客及其所有相关数据已永久删除', '危险操作完成');

        // 检查当前页是否还有数据，如果没有则回到上一页
        const currentCustomersOnPage = this.customers.length;
        if (currentCustomersOnPage <= 1 && this.currentPage > 1) {
          this.currentPage--;
        }

        // 重新加载客户列表
        await this.loadCustomers();
      } else {
        NotificationHelper.error(response.message || '删除失败，请重试', '删除失败');
      }
    } catch (error) {
      console.error('删除检客失败:', error);
      NotificationHelper.error('删除检客失败，请重试', '删除错误');
    }
  }

  // 显示检客模态框
  showCustomerModal(customer, mode) {
    const modalContainer = document.getElementById('modalContainer');
    if (!modalContainer) {return;}

    const isView = mode === 'view';
    const isEdit = mode === 'edit';
    const isAdd = mode === 'add';

    modalContainer.innerHTML = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                    <div class="p-6 border-b border-gray-200">
                        <h3 class="text-lg font-medium text-gray-900">
                            ${isAdd ? '新增检客' : isEdit ? '编辑检客' : '检客详情'}
                        </h3>
                    </div>
                    <form id="customerForm" class="p-6">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">姓名 *</label>
                                <input type="text" name="name" value="${customer?.Name || customer?.name || ''}"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                       ${isView ? 'readonly' : ''} required>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">性别 *</label>
                                <select name="gender" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        ${isView ? 'disabled' : ''} required>
                                    <option value="">请选择</option>
                                    <option value="male" ${(customer?.Gender === '男' || customer?.gender === 'male') ? 'selected' : ''}>男</option>
                                    <option value="female" ${(customer?.Gender === '女' || customer?.gender === 'female') ? 'selected' : ''}>女</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">年龄</label>
                                <input type="number" name="age" value="${customer?.Age || customer?.age || ''}"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                       min="0" max="150" title="请输入0-150之间的年龄"
                                       ${isView ? 'readonly' : ''}>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">身份证号 *</label>
                                <input type="text" name="id_card" value="${customer?.IdentityCard || customer?.identityCard || customer?.id_card || ''}"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                       pattern="[0-9]{15}|[0-9]{17}[0-9Xx]"
                                       title="请输入正确的15~18位身份证号"
                                       maxlength="18"
                                       ${isView ? 'readonly' : ''} required>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">联系电话 *</label>
                                <input type="tel" name="phone" value="${customer?.Phone || customer?.phone || ''}"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                       pattern="[0-9]{11}"
                                       title="请输入11位手机号"
                                       maxlength="11"
                                       ${isView ? 'readonly' : ''} required>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">联系人</label>
                                <input type="text" name="contact_person" value="${customer?.ContactPerson || customer?.contact_person || ''}"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                       ${isView ? 'readonly' : ''}>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">联系人电话</label>
                                <input type="tel" name="contact_phone" value="${customer?.ContactPersonPhone || customer?.contact_phone || ''}"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                       ${isView ? 'readonly' : ''}>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">身高 (cm)</label>
                                <input type="number" name="height" value="${customer?.Height || customer?.height || ''}"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                       ${isView ? 'readonly' : ''} step="0.1">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">体重 (kg)</label>
                                <input type="number" name="weight" value="${customer?.Weight || customer?.weight || ''}"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                       ${isView ? 'readonly' : ''} step="0.1">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">地址</label>
                                <input type="text" name="address" value="${customer?.Address || customer?.address || ''}"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                       ${isView ? 'readonly' : ''}>
                            </div>
                        </div>
                        <div class="mt-4">
                            <label class="block text-sm font-medium text-gray-700 mb-2">备注</label>
                            <textarea name="notes" rows="3"
                                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      ${isView ? 'readonly' : ''}>${customer?.Remarks || customer?.remarks || ''}</textarea>
                        </div>
                        ${isView ? `
                        <div class="mt-6 p-4 bg-gray-50 rounded-lg">
                            <h4 class="font-medium text-gray-900 mb-3">系统信息</h4>
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-gray-600">客户ID:</span>
                                    <span class="font-medium ml-2">${customer?.ID || 'N/A'}</span>
                                </div>
                                <div>
                                    <span class="text-gray-600">BMI:</span>
                                    <span class="font-medium ml-2">${customer?.BMI || 'N/A'}</span>
                                </div>
                                <div>
                                    <span class="text-gray-600">状态:</span>
                                    <span class="font-medium ml-2">${customer?.Status ? this.getStatusText(customer.Status) : 'N/A'}</span>
                                </div>
                                <div>
                                    <span class="text-gray-600">创建时间:</span>
                                    <span class="font-medium ml-2">${customer?.CreatedAt ? new Date(customer.CreatedAt).toLocaleString('zh-CN') : 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                        ` : ''}
                        <div class="flex justify-end space-x-3 mt-6">
                            <button type="button" onclick="customersManager.closeModal()"
                                    class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                                ${isView ? '关闭' : '取消'}
                            </button>
                            ${!isView ? `
                                <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                                    <i class="fas fa-save mr-2"></i>${isAdd ? '新增' : '保存'}
                                </button>
                            ` : ''}
                        </div>
                    </form>
                </div>
            </div>
        `;

    // 绑定表单提交事件
    if (!isView) {
      // 使用setTimeout确保DOM完全加载后再绑定事件
      setTimeout(() => {
        const formElement = document.getElementById('customerForm');
        if (formElement) {
          formElement.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveCustomer(customer?.ID, mode);
          });
        }
      }, 100);
    }
  }

  // 保存检客
  async saveCustomer(id, mode) {
    // 防止重复提交
    if (this.isSubmitting) {
      console.log('正在提交中，请勿重复操作');
      return;
    }

    this.isSubmitting = true;

    const form = document.getElementById('customerForm');
    const formData = new FormData(form);
    const customerData = Object.fromEntries(formData.entries());

    // 转换数据格式以匹配API期望的字段名
    const apiData = {
      name: customerData.name,
      gender: customerData.gender === 'male' ? '男' : customerData.gender === 'female' ? '女' : customerData.gender,
      identityCard: customerData.id_card,
      phone: customerData.phone,
      address: customerData.address,
      remarks: customerData.notes
    };

    // 只有当字段有值时才添加到API数据中
    if (customerData.contact_person && customerData.contact_person.trim()) {
      apiData.contactPerson = customerData.contact_person;
    }

    if (customerData.contact_phone && customerData.contact_phone.trim()) {
      apiData.contactPersonPhone = customerData.contact_phone;
    }

    // 只有当字段有值时才添加到API数据中
    if (customerData.age && customerData.age.trim()) {
      apiData.age = parseInt(customerData.age);
    }

    if (customerData.height && customerData.height.trim()) {
      apiData.height = parseFloat(customerData.height);
    }

    if (customerData.weight && customerData.weight.trim()) {
      apiData.weight = parseFloat(customerData.weight);
      // 自动计算BMI
      if (apiData.height) {
        apiData.BMI = (apiData.weight / Math.pow(apiData.height / 100, 2)).toFixed(1);
      }
    }

    try {
      let response;
      if (mode === 'add') {
        response = await window.API.customer.create(apiData);
      } else {
        response = await window.API.customer.update(id, apiData);
      }

      if (response.status === 'Success') {
        NotificationHelper.success(`检客${mode === 'add' ? '新增' : '更新'}成功`, '保存完成');
        this.closeModal();
        this.loadCustomers();
      } else {
        NotificationHelper.error(response.message || '保存失败，请重试', '保存失败');
      }
    } catch (error) {
      console.error('保存检客失败:', error);
      NotificationHelper.error('保存检客失败，请重试', '保存错误');
    } finally {
      // 重置提交状态
      this.isSubmitting = false;
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
    // 新增检客按钮
    const addBtn = document.getElementById('addCustomerBtn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        this.showCustomerModal(null, 'add');
      });
    }

    // 搜索功能
    const searchInput = document.getElementById('customerSearch');
    if (searchInput) {
      let searchTimeout;
      searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          this.searchCustomers();
        }, 500);
      });
    }

    // 批量导入按钮
    const importBtn = document.getElementById('importCustomersBtn');
    if (importBtn) {
      importBtn.addEventListener('click', () => {
        NotificationHelper.tip('批量导入功能正在开发中，敬请期待', '功能提示');
      });
    }
  }
}

// 创建全局实例
const customersManager = new CustomersManager();

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  customersManager.init();
});

// 暴露到全局作用域，供HTML调用
window.customersManager = customersManager;