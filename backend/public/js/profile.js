/**
 * 个人资料页面脚本
 * 负责用户个人信息管理和修改密码
 */

class ProfileManager {
  constructor() {
    this.user = auth.getUser();
    this.init();
  }

  init() {
    this.loadUserProfile();
    this.bindEvents();
  }

  // 加载用户资料
  async loadUserProfile() {
    try {
      // 使用模拟用户数据，因为个人资料页面在原单页面应用中也使用本地数据
      const mockUserData = {
        username: 'admin',
        real_name: '系统管理员',
        email: 'admin@healthcare.com',
        phone: '13800138000',
        role: 'admin',
        department: '信息科',
        position: '系统管理员',
        bio: '负责系统维护和用户管理',
        created_at: '2024-01-01T00:00:00Z'
      };

      // 合并本地存储的用户信息和模拟数据
      this.user = { ...this.user, ...mockUserData };
      this.updateProfileUI();
      this.populateEditForm();

    } catch (error) {
      console.error('加载用户资料失败:', error);
      // 使用本地存储的用户信息作为后备
      this.updateProfileUI();
      this.populateEditForm();
    }
  }

  // 更新资料显示界面
  updateProfileUI() {
    const elements = {
      profileName: document.getElementById('profileName'),
      profileEmail: document.getElementById('profileEmail'),
      profilePhone: document.getElementById('profilePhone'),
      profileRole: document.getElementById('profileRole'),
      profileJoinDate: document.getElementById('profileJoinDate')
    };

    if (elements.profileName) {
      elements.profileName.textContent = this.user.real_name || this.user.username || '未知用户';
    }

    if (elements.profileEmail) {
      elements.profileEmail.textContent = this.user.email || '未设置';
    }

    if (elements.profilePhone) {
      elements.profilePhone.textContent = this.user.phone || '未设置';
    }

    if (elements.profileRole) {
      const roleMap = {
        'admin': '系统管理员',
        'doctor': '医生',
        'user': '普通用户'
      };
      elements.profileRole.textContent = roleMap[this.user.role] || '普通用户';
    }

    if (elements.profileJoinDate) {
      const joinDate = this.user.created_at ?
        new Date(this.user.created_at).toLocaleDateString('zh-CN') :
        '未知';
      elements.profileJoinDate.textContent = joinDate;
    }
  }

  // 填充编辑表单
  populateEditForm() {
    const form = document.getElementById('profileForm');
    if (!form) {return;}

    const fields = {
      editUsername: this.user.username || '',
      editRealName: this.user.real_name || '',
      editEmail: this.user.email || '',
      editPhone: this.user.phone || '',
      editDepartment: this.user.department || '',
      editPosition: this.user.position || '',
      editBio: this.user.bio || ''
    };

    Object.keys(fields).forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) {
        field.value = fields[fieldId];
      }
    });
  }

  // 保存个人信息
  async saveProfile() {
    const form = document.getElementById('profileForm');
    const formData = new FormData(form);
    const profileData = Object.fromEntries(formData.entries());

    try {
      const response = await window.API.service.put('/user/profile', profileData);

      if (response.status === 'Success') {
        // 更新本地存储的用户信息
        const updatedUser = { ...this.user, ...profileData };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        this.user = updatedUser;

        showNotification('个人信息保存成功', 'success');
        this.updateProfileUI();
      } else {
        showNotification(response.message || '保存失败', 'error');
      }
    } catch (error) {
      console.error('保存个人信息失败:', error);
      showNotification('保存个人信息失败', 'error');
    }
  }

  // 修改密码
  async changePassword() {
    const form = document.getElementById('passwordForm');
    const formData = new FormData(form);
    const passwordData = Object.fromEntries(formData.entries());

    // 验证密码
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      NotificationHelper.validationError('新密码和确认密码不匹配');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      NotificationHelper.validationError('新密码长度至少为6位');
      return;
    }

    try {
      const response = await window.API.service.put('/user/password', {
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword
      });

      if (response.status === 'Success') {
        NotificationHelper.success('密码修改成功');
        form.reset();

        // 如果修改成功，可能需要重新登录
        setTimeout(() => {
          NotificationHelper.confirm(
            '密码已修改成功，是否重新登录？',
            () => {
              auth.logout();
            }
          );
        }, 1500);
      } else {
        NotificationHelper.error(response.message || '密码修改失败');
      }
    } catch (error) {
      console.error('修改密码失败:', error);
      NotificationHelper.error('修改密码失败');
    }
  }

  // 修改密码（快速操作）
  showChangePasswordModal() {
    const modalContainer = document.getElementById('modalContainer');
    if (!modalContainer) {return;}

    modalContainer.innerHTML = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white rounded-lg w-full max-w-md">
                    <div class="p-6 border-b border-gray-200">
                        <h3 class="text-lg font-medium text-gray-900">修改密码</h3>
                    </div>
                    <form class="p-6">
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-2">当前密码</label>
                            <input type="password" name="currentPassword" required
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-2">新密码</label>
                            <input type="password" name="newPassword" required
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-2">确认新密码</label>
                            <input type="password" name="confirmPassword" required
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div class="flex justify-end space-x-3">
                            <button type="button" onclick="profileManager.closeModal()"
                                    class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                                取消
                            </button>
                            <button type="button" onclick="profileManager.quickChangePassword()"
                                    class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                                修改密码
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
  }

  // 快速修改密码
  quickChangePassword() {
    const form = document.querySelector('#modalContainer form');
    const formData = new FormData(form);
    const passwordData = Object.fromEntries(formData.entries());

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      NotificationHelper.validationError('新密码和确认密码不匹配');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      NotificationHelper.validationError('新密码长度至少为6位');
      return;
    }

    this.changePasswordWithData({
      current_password: passwordData.currentPassword,
      new_password: passwordData.newPassword
    });
  }

  // 修改密码（带数据）
  async changePasswordWithData(passwordData) {
    try {
      const response = await window.API.service.put('/user/password', passwordData);

      if (response.status === 'Success') {
        NotificationHelper.success('密码修改成功');
        this.closeModal();

        setTimeout(() => {
          NotificationHelper.confirm(
            '密码已修改成功，是否重新登录？',
            () => {
              auth.logout();
            }
          );
        }, 1500);
      } else {
        NotificationHelper.error(response.message || '密码修改失败');
      }
    } catch (error) {
      console.error('修改密码失败:', error);
      NotificationHelper.error('修改密码失败');
    }
  }

  // 导出数据
  exportData() {
    try {
      const userData = {
        ...this.user,
        export_date: new Date().toISOString(),
        export_type: 'user_data'
      };

      const dataStr = JSON.stringify(userData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

      const exportFileDefaultName = `user_data_${this.user.username}_${new Date().toISOString().split('T')[0]}.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();

      showNotification('数据导出成功', 'success');
    } catch (error) {
      console.error('导出数据失败:', error);
      showNotification('导出数据失败', 'error');
    }
  }

  // 查看登录历史
  async showLoginHistory() {
    try {
      const response = await window.API.service.get('/user/login-history');

      if (response.status === 'Success') {
        this.showLoginHistoryModal(response.data.history);
      } else {
        showNotification('加载登录历史失败', 'error');
      }
    } catch (error) {
      console.error('加载登录历史失败:', error);
      showNotification('加载登录历史失败', 'error');
    }
  }

  // 显示登录历史模态框
  showLoginHistoryModal(history) {
    const modalContainer = document.getElementById('modalContainer');
    if (!modalContainer) {return;}

    const historyHTML = history.length > 0 ?
      history.map(item => `
                <div class="flex justify-between items-center py-2 border-b">
                    <div>
                        <p class="text-sm font-medium text-gray-900">
                            ${new Date(item.login_time).toLocaleString('zh-CN')}
                        </p>
                        <p class="text-sm text-gray-600">${item.ip_address} - ${item.user_agent}</p>
                    </div>
                    <span class="px-2 py-1 text-xs rounded-full ${
  item.status === 'success' ?
    'bg-green-100 text-green-800' :
    'bg-red-100 text-red-800'
}">
                        ${item.status === 'success' ? '成功' : '失败'}
                    </span>
                </div>
            `).join('') :
      '<p class="text-center text-gray-500 py-4">暂无登录历史</p>';

    modalContainer.innerHTML = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden">
                    <div class="p-6 border-b border-gray-200">
                        <h3 class="text-lg font-medium text-gray-900">登录历史</h3>
                    </div>
                    <div class="p-6 overflow-y-auto max-h-60">
                        ${historyHTML}
                    </div>
                    <div class="p-6 border-t border-gray-200">
                        <button onclick="profileManager.closeModal()"
                                class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            关闭
                        </button>
                    </div>
                </div>
            </div>
        `;
  }

  // 关闭模态框
  closeModal() {
    const modalContainer = document.getElementById('modalContainer');
    if (modalContainer) {
      modalContainer.innerHTML = '';
    }
  }

  // 返回上一个页面
  goBack() {
    // 检查是否有历史记录可以返回
    if (document.referrer && document.referrer !== window.location.href) {
      // 如果有来源页面且不是当前页面，则返回来源页面
      window.location.href = document.referrer;
    } else {
      // 否则跳转到仪表板页面
      window.location.href = 'dashboard.html';
    }
  }

  // 绑定事件
  bindEvents() {
    // 个人信息表单提交
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
      profileForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveProfile();
      });
    }

    // 密码修改表单提交
    const passwordForm = document.getElementById('passwordForm');
    if (passwordForm) {
      passwordForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.changePassword();
      });
    }

    // 取消编辑按钮
    const cancelBtn = document.getElementById('cancelEdit');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        // 返回上一个页面或默认跳转到仪表板
        this.goBack();
      });
    }

    // 快速操作按钮（需要动态绑定）
    document.addEventListener('click', (e) => {
      if (e.target.closest('button')) {
        const button = e.target.closest('button');
        if (button.textContent.includes('修改密码')) {
          this.showChangePasswordModal();
        } else if (button.textContent.includes('导出数据')) {
          this.exportData();
        } else if (button.textContent.includes('登录历史')) {
          this.showLoginHistory();
        }
      }
    });
  }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  new ProfileManager();
});