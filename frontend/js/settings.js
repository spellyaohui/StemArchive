/**
 * 系统设置页面脚本
 * 负责系统配置和用户管理
 */

class SettingsManager {
  constructor() {
    this.currentTab = 'general';
    this.users = [];
    this.backups = [];
    this.logs = [];
    this.init();
  }

  init() {
    this.loadSystemSettings();
    this.loadUsers();
    this.loadBackups();
    this.bindEvents();
  }

  // 加载系统设置
  async loadSystemSettings() {
    try {
      const response = await window.API.service.get('/settings/general');

      if (response.status === 'Success') {
        this.populateGeneralSettings(response.data);
      } else {
        NotificationHelper.error(response.message || '加载系统设置失败');
      }
    } catch (error) {
      console.error('加载系统设置失败:', error);
      // 使用模拟数据作为后备
      const mockSettings = {
        system_name: '干细胞治疗档案管理系统',
        system_version: '1.2.1',
        admin_email: 'admin@healthcare.com',
        admin_phone: '13800138000',
        system_description: '专业的干细胞治疗档案管理系统',
        enable_notifications: true,
        max_file_size: 10,
        backup_frequency: 'daily',
        session_timeout: 30
      };
      this.populateGeneralSettings(mockSettings);
    }
  }

  // 填充基本设置表单
  populateGeneralSettings(settings) {
    const fields = {
      systemName: settings.systemName || '干细胞治疗档案管理系统',
      systemVersion: settings.systemVersion || '1.0.0',
      adminEmail: settings.adminEmail || '',
      adminPhone: settings.adminPhone || '',
      systemDescription: settings.systemDescription || '',
      enableNotifications: settings.enableNotifications || false
    };

    Object.keys(fields).forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) {
        if (field.type === 'checkbox') {
          field.checked = fields[fieldId];
        } else {
          field.value = fields[fieldId];
        }
      }
    });

    // 更新页面标题和所有系统名称显示
    this.updateAllSystemNames(settings.systemName || '干细胞治疗档案管理系统');
  }

  // 更新页面标题和所有系统名称显示
  updateAllSystemNames(systemName) {
    // 立即更新所有显示，不依赖localStorage
    this.updatePageTitle(systemName);
    this.updateNavigationTitle(systemName);

    // 同时更新localStorage以便其他页面使用
    if (window.SystemNameManager) {
      window.SystemNameManager.setSystemName(systemName);
    }
  }

  // 更新页面标题
  updatePageTitle(systemName) {
    const newTitle = `系统设置 - ${systemName}`;
    document.title = newTitle;
    console.log(`页面标题已更新为: ${newTitle}`);
  }

  // 更新导航栏标题
  updateNavigationTitle(systemName) {
    // 更新导航栏中的系统标题
    let navTitle = document.querySelector('nav h1');
    if (!navTitle) {
      navTitle = document.querySelector('h1');
    }
    if (!navTitle) {
      navTitle = document.querySelector('.nav h1');
    }
    if (!navTitle) {
      navTitle = document.getElementById('navTitle');
    }

    if (navTitle) {
      navTitle.textContent = systemName;
      console.log(`导航栏标题已更新为: ${systemName}`);
    } else {
      console.warn('未找到导航栏标题元素');
    }
  }

  // 加载用户列表
  async loadUsers() {
    try {
      const response = await window.API.service.get('/users');

      if (response.status === 'Success') {
        this.users = response.data.users;
        this.renderUsersList();
      } else {
        NotificationHelper.error(response.message || '加载用户列表失败');
      }
    } catch (error) {
      console.error('加载用户列表失败:', error);
      NotificationHelper.error('加载用户列表失败');
    }
  }

  // 渲染用户列表
  renderUsersList() {
    const container = document.getElementById('usersList');
    if (!container) {return;}

    if (this.users.length === 0) {
      container.innerHTML = `
                <tr>
                    <td colspan="6" class="px-6 py-8 text-center text-gray-500">
                        <i class="fas fa-users text-3xl mb-2"></i>
                        <p>暂无用户数据</p>
                    </td>
                </tr>
            `;
      return;
    }

    container.innerHTML = this.users.map(user => `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${user.username}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${user.real_name || '-'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${user.email || '-'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${this.getRoleClass(user.role)}">
                        ${this.getRoleText(user.role)}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                        ${user.is_active ? '活跃' : '禁用'}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onclick="settingsManager.editUser(${user.id})" class="text-blue-600 hover:text-blue-900 mr-3">
                        <i class="fas fa-edit"></i> 编辑
                    </button>
                    <button onclick="settingsManager.toggleUserStatus(${user.id}, ${user.is_active})" class="text-yellow-600 hover:text-yellow-900 mr-3">
                        <i class="fas fa-${user.is_active ? 'ban' : 'check'}"></i> ${user.is_active ? '禁用' : '启用'}
                    </button>
                    ${user.id !== auth.getUser().id ? `
                        <button onclick="settingsManager.deleteUser(${user.id})" class="text-red-600 hover:text-red-900">
                            <i class="fas fa-trash"></i> 删除
                        </button>
                    ` : ''}
                </td>
            </tr>
        `).join('');
  }

  // 获取角色样式类
  getRoleClass(role) {
    const roleClasses = {
      'admin': 'bg-purple-100 text-purple-800',
      'doctor': 'bg-blue-100 text-blue-800',
      'user': 'bg-gray-100 text-gray-800'
    };
    return roleClasses[role] || 'bg-gray-100 text-gray-800';
  }

  // 获取角色文本
  getRoleText(role) {
    const roleTexts = {
      'admin': '系统管理员',
      'doctor': '医生',
      'user': '普通用户'
    };
    return roleTexts[role] || '未知';
  }

  // 加载备份历史
  async loadBackups() {
    try {
      const response = await window.API.service.get('/settings/backups');

      if (response.status === 'Success') {
        this.backups = response.data.backups;
        this.renderBackupList();
      }
    } catch (error) {
      console.error('加载备份历史失败:', error);
      // 使用模拟数据作为后备
      const mockBackups = [
        {
          id: 1,
          filename: 'backup_2025-10-07_23-00-00.sql',
          size: '12.5MB',
          timestamp: '2025-10-07T23:00:00Z',
          type: 'full'
        },
        {
          id: 2,
          filename: 'backup_2025-10-06_23-00-00.sql',
          size: '11.8MB',
          timestamp: '2025-10-06T23:00:00Z',
          type: 'full'
        }
      ];
      this.backups = mockBackups;
      this.renderBackupList();
    }
  }

  // 渲染备份列表
  renderBackupList() {
    const container = document.getElementById('backupList');
    if (!container) {return;}

    if (this.backups.length === 0) {
      container.innerHTML = `
                <div class="text-center text-gray-500 py-4">
                    <i class="fas fa-database text-2xl mb-2"></i>
                    <p>暂无备份记录</p>
                </div>
            `;
      return;
    }

    container.innerHTML = this.backups.map(backup => `
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div class="flex items-center space-x-3">
                    <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <i class="fas fa-file-archive text-blue-600 text-sm"></i>
                    </div>
                    <div>
                        <p class="font-medium text-gray-900">${backup.filename}</p>
                        <p class="text-sm text-gray-600">
                            ${new Date(backup.created_at).toLocaleString('zh-CN')} (${backup.file_size})
                        </p>
                    </div>
                </div>
                <div class="flex space-x-2">
                    <button onclick="settingsManager.downloadBackup('${backup.id}')"
                            class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                        <i class="fas fa-download mr-1"></i>下载
                    </button>
                    <button onclick="settingsManager.restoreBackup('${backup.id}')"
                            class="px-3 py-1 text-sm bg-orange-600 text-white rounded hover:bg-orange-700">
                        <i class="fas fa-upload mr-1"></i>恢复
                    </button>
                    <button onclick="settingsManager.deleteBackup('${backup.id}')"
                            class="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700">
                        <i class="fas fa-trash mr-1"></i>删除
                    </button>
                </div>
            </div>
        `).join('');
  }

  // 加载系统日志
  async loadLogs() {
    try {
      const logLevel = document.getElementById('logLevel')?.value || 'all';
      const response = await window.API.service.get('/settings/logs', { level: logLevel });

      if (response.status === 'Success') {
        this.logs = response.data.logs;
        this.renderLogs();
      }
    } catch (error) {
      console.error('加载系统日志失败:', error);
    }
  }

  // 渲染日志
  renderLogs() {
    const container = document.getElementById('logsContent');
    if (!container) {return;}

    if (this.logs.length === 0) {
      container.textContent = '暂无日志记录';
      return;
    }

    container.innerHTML = this.logs.map(log => {
      const timestamp = new Date(log.timestamp).toLocaleString('zh-CN');
      const levelClass = this.getLogLevelClass(log.level);
      return `[${timestamp}] [${levelClass}] ${log.message}`;
    }).join('\n');
  }

  // 获取日志级别样式
  getLogLevelClass(level) {
    const levelClasses = {
      'error': '\x1b[31mERROR\x1b[0m',
      'warning': '\x1b[33mWARNING\x1b[0m',
      'info': '\x1b[36mINFO\x1b[0m',
      'debug': '\x1b[37mDEBUG\x1b[0m'
    };
    return levelClasses[level] || level;
  }

  // 保存基本设置
  async saveGeneralSettings() {
    const form = document.getElementById('generalSettingsForm');
    const formData = new FormData(form);
    const settings = Object.fromEntries(formData.entries());

    // 处理复选框
    settings.enable_notifications = document.getElementById('enableNotifications').checked;

    try {
      const response = await window.API.service.put('/settings/general', settings);

      if (response.status === 'Success') {
        showNotification('系统设置保存成功', 'success');

        // 立即更新系统名称显示
        if (settings.systemName) {
          console.log('正在更新系统名称显示为:', settings.systemName);
          this.updateAllSystemNames(settings.systemName);
        }

        // 重新加载设置数据以更新表单显示
        await this.loadSystemSettings();
      } else {
        showNotification(response.message || '保存失败', 'error');
      }
    } catch (error) {
      console.error('保存系统设置失败:', error);
      showNotification('保存系统设置失败', 'error');
    }
  }

  // 显示用户编辑模态框
  showUserModal(user = null) {
    const modalContainer = document.getElementById('modalContainer');
    if (!modalContainer) {return;}

    const isEdit = !!user;

    modalContainer.innerHTML = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white rounded-lg w-full max-w-md">
                    <div class="p-6 border-b border-gray-200">
                        <h3 class="text-lg font-medium text-gray-900">
                            ${isEdit ? '编辑用户' : '添加用户'}
                        </h3>
                    </div>
                    <form class="p-6">
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-2">用户名</label>
                            <input type="text" name="username" value="${user?.username || ''}" required
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                   ${isEdit ? 'readonly' : ''}>
                        </div>
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-2">真实姓名</label>
                            <input type="text" name="real_name" value="${user?.real_name || ''}"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-2">邮箱</label>
                            <input type="email" name="email" value="${user?.email || ''}"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-2">角色</label>
                            <select name="role" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="user" ${user?.role === 'user' ? 'selected' : ''}>普通用户</option>
                                <option value="doctor" ${user?.role === 'doctor' ? 'selected' : ''}>医生</option>
                                <option value="admin" ${user?.role === 'admin' ? 'selected' : ''}>系统管理员</option>
                            </select>
                        </div>
                        ${!isEdit ? `
                            <div class="mb-4">
                                <label class="block text-sm font-medium text-gray-700 mb-2">密码</label>
                                <input type="password" name="password" required
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                            </div>
                        ` : ''}
                        <div class="flex justify-end space-x-3">
                            <button type="button" onclick="settingsManager.closeModal()"
                                    class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                                取消
                            </button>
                            <button type="button" onclick="settingsManager.saveUser(${user?.id || null}, ${isEdit})"
                                    class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                                ${isEdit ? '更新' : '添加'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
  }

  // 保存用户
  async saveUser(userId, isEdit) {
    const form = document.querySelector('#modalContainer form');
    const formData = new FormData(form);
    const userData = Object.fromEntries(formData.entries());

    try {
      let response;
      if (isEdit) {
        response = await window.API.service.put(`/users/${userId}`, userData);
      } else {
        response = await window.API.service.post('/users', userData);
      }

      if (response.status === 'Success') {
        showNotification(`用户${isEdit ? '更新' : '添加'}成功`, 'success');
        this.closeModal();
        this.loadUsers();
      } else {
        showNotification(response.message || '保存失败', 'error');
      }
    } catch (error) {
      console.error('保存用户失败:', error);
      showNotification('保存用户失败', 'error');
    }
  }

  // 编辑用户
  editUser(userId) {
    const user = this.users.find(u => u.id === userId);
    if (!user) {return;}

    this.showUserModal(user);
  }

  // 切换用户状态
  async toggleUserStatus(userId, currentStatus) {
    const action = currentStatus ? '禁用' : '启用';
    NotificationHelper.confirm(
      `确定要${action}这个用户吗？`,
      async () => {
        try {
          const response = await window.API.service.put(`/users/${userId}/status`, {
            is_active: !currentStatus
          });

          if (response.status === 'Success') {
            NotificationHelper.success(`用户${action}成功`);
            this.loadUsers();
          } else {
            NotificationHelper.error(response.message || '操作失败');
          }
        } catch (error) {
          console.error('切换用户状态失败:', error);
          NotificationHelper.error('操作失败');
        }
      }
    );
  }

  // 删除用户
  async deleteUser(userId) {
    NotificationHelper.confirm(
      '确定要删除这个用户吗？此操作不可恢复！',
      async () => {
        try {
          const response = await window.API.service.delete(`/users/${userId}`);

          if (response.status === 'Success') {
            NotificationHelper.success('用户删除成功');
            this.loadUsers();
          } else {
            NotificationHelper.error(response.message || '删除失败');
          }
        } catch (error) {
          console.error('删除用户失败:', error);
          NotificationHelper.error('删除用户失败');
        }
      }
    );
  }

  // 创建备份
  async createBackup() {
    try {
      const includeData = confirm('是否包含数据备份？（不勾选则只备份结构）');
      const response = await window.API.service.post('/settings/backup', { includeData });

      if (response.status === 'Success') {
        NotificationHelper.success('备份创建成功');
        this.loadBackups();
        this.addBackupToList(response.data);
      } else {
        NotificationHelper.error(response.message || '备份创建失败');
      }
    } catch (error) {
      console.error('创建备份失败:', error);
      NotificationHelper.error('创建备份失败');
    }
  }

  // 添加备份到列表
  addBackupToList(backupInfo) {
    const backupList = document.getElementById('backupList');
    if (!backupList) {return;}

    const backupItem = document.createElement('div');
    backupItem.className = 'flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50';
    backupItem.innerHTML = `
            <div class="flex items-center space-x-3">
                <i class="fas fa-file-archive text-blue-500"></i>
                <div>
                    <p class="text-sm font-medium text-gray-900">${backupInfo.filename}</p>
                    <p class="text-xs text-gray-500">${backupInfo.size} • ${new Date(backupInfo.timestamp).toLocaleString('zh-CN')}</p>
                </div>
            </div>
            <div class="flex items-center space-x-2">
                <button onclick="settingsManager.downloadBackup('${backupInfo.filename}')" class="text-blue-600 hover:text-blue-800">
                    <i class="fas fa-download"></i>
                </button>
                <button onclick="settingsManager.deleteBackup('${backupInfo.filename}')" class="text-red-600 hover:text-red-800">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

    backupList.insertBefore(backupItem, backupList.firstChild);
  }

  // 恢复备份
  async restoreBackup() {
    const fileInput = document.getElementById('restoreFile');
    const file = fileInput.files[0];

    if (!file) {
      NotificationHelper.error('请选择备份文件');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('backupFile', file);

      const response = await window.API.service.post('/settings/restore', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.status === 'Success') {
        NotificationHelper.success('备份恢复成功，系统将重新启动');
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      } else {
        NotificationHelper.error(response.message || '恢复失败');
      }
    } catch (error) {
      console.error('恢复备份失败:', error);
      NotificationHelper.error('恢复备份失败');
    }
  }

  // 恢复备份
  async restoreBackup(backupId) {
    NotificationHelper.confirm(
      '确定要恢复这个备份吗？这将覆盖当前所有数据！',
      async () => {
        try {
          const response = await window.API.service.post('/settings/restore', { backupFile: backupId });

          if (response.status === 'Success') {
            NotificationHelper.success('备份恢复成功，系统将重新启动');
            setTimeout(() => {
              window.location.reload();
            }, 3000);
          } else {
            NotificationHelper.error(response.message || '恢复失败');
          }
        } catch (error) {
          console.error('恢复备份失败:', error);
          NotificationHelper.error('恢复备份失败');
        }
      }
    );
  }

  // 下载备份
  async downloadBackup(backupId) {
    try {
      const response = await window.API.service.get(`/settings/backups/${backupId}/download`);

      if (response.status === 'Success') {
        const link = document.createElement('a');
        link.href = response.data.download_url;
        link.download = response.data.filename;
        link.click();

        showNotification('备份下载成功', 'success');
      } else {
        showNotification('下载失败', 'error');
      }
    } catch (error) {
      console.error('下载备份失败:', error);
      showNotification('下载备份失败', 'error');
    }
  }

  // 删除备份
  async deleteBackup(backupId) {
    NotificationHelper.confirm(
      '确定要删除这个备份吗？',
      async () => {
        try {
          const response = await window.API.service.delete(`/settings/backups/${backupId}`);

          if (response.status === 'Success') {
            NotificationHelper.success('备份删除成功');
            this.loadBackups();
          } else {
            NotificationHelper.error(response.message || '删除失败');
          }
        } catch (error) {
          console.error('删除备份失败:', error);
          NotificationHelper.error('删除备份失败');
        }
      }
    );
  }

  // 清空日志
  async clearLogs() {
    NotificationHelper.confirm(
      '确定要清空所有系统日志吗？此操作不可恢复！',
      async () => {
        try {
          const response = await window.API.service.delete('/settings/logs');

          if (response.status === 'Success') {
            NotificationHelper.success('系统日志已清空');
            this.loadLogs();
          } else {
            NotificationHelper.error(response.message || '清空失败');
          }
        } catch (error) {
          console.error('清空日志失败:', error);
          NotificationHelper.error('清空日志失败');
        }
      }
    );
  }

  // 关闭模态框
  closeModal() {
    const modalContainer = document.getElementById('modalContainer');
    if (modalContainer) {
      modalContainer.innerHTML = '';
    }
  }

  // 切换选项卡
  switchTab(tabName) {
    this.currentTab = tabName;

    // 更新选项卡样式
    document.querySelectorAll('.settings-tab').forEach(tab => {
      if (tab.dataset.tab === tabName) {
        tab.classList.add('border-blue-500', 'text-blue-600');
        tab.classList.remove('border-transparent', 'text-gray-500');
      } else {
        tab.classList.remove('border-blue-500', 'text-blue-600');
        tab.classList.add('border-transparent', 'text-gray-500');
      }
    });

    // 显示对应内容
    document.querySelectorAll('.settings-content').forEach(content => {
      content.classList.add('hidden');
    });

    const targetContent = document.getElementById(`${tabName}Tab`);
    if (targetContent) {
      targetContent.classList.remove('hidden');
    }

    // 加载对应数据
    switch (tabName) {
    case 'users':
      this.loadUsers();
      break;
    case 'backup':
      this.loadBackups();
      break;
    case 'logs':
      this.loadLogs();
      break;
    case 'stats':
      this.loadSystemStats();
      break;
    }
  }

  // 绑定事件
  bindEvents() {
    // 选项卡切换
    document.querySelectorAll('.settings-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.switchTab(tab.dataset.tab);
      });
    });

    // 基本设置表单提交
    const generalForm = document.getElementById('generalSettingsForm');
    if (generalForm) {
      generalForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveGeneralSettings();
      });
    }

    // 添加用户按钮
    const addUserBtn = document.getElementById('addUserBtn');
    if (addUserBtn) {
      addUserBtn.addEventListener('click', () => {
        this.showUserModal();
      });
    }

    // 创建备份按钮
    const createBackupBtn = document.getElementById('createBackupBtn');
    if (createBackupBtn) {
      createBackupBtn.addEventListener('click', () => {
        this.createBackup();
      });
    }

    // 恢复数据按钮
    const restoreBtn = document.getElementById('restoreBtn');
    if (restoreBtn) {
      restoreBtn.addEventListener('click', () => {
        const fileInput = document.getElementById('restoreFile');
        if (fileInput.files.length === 0) {
          NotificationHelper.error('请选择备份文件');
          return;
        }

        NotificationHelper.confirm(
          '确定要恢复这个备份吗？这将覆盖当前所有数据！',
          () => {
            NotificationHelper.info('文件上传恢复功能开发中...');
          }
        );
      });
    }

    // 清空日志按钮
    const clearLogsBtn = document.getElementById('clearLogsBtn');
    if (clearLogsBtn) {
      clearLogsBtn.addEventListener('click', () => {
        this.clearLogs();
      });
    }

    // 日志级别筛选
    const logLevel = document.getElementById('logLevel');
    if (logLevel) {
      logLevel.addEventListener('change', () => {
        this.loadLogs();
      });
    }
  }

  // 加载系统日志
  async loadLogs() {
    try {
      const logLevel = document.getElementById('logLevel')?.value || 'all';
      const response = await window.API.service.get(`/settings/logs?level=${logLevel}`);

      if (response.status === 'Success') {
        this.logs = response.data.logs;
        this.renderLogsList();
      } else {
        NotificationHelper.error(response.message || '加载系统日志失败');
      }
    } catch (error) {
      console.error('加载系统日志失败:', error);
      // 使用模拟数据
      this.renderMockLogs();
    }
  }

  // 渲染日志列表
  renderLogsList() {
    const container = document.getElementById('logsContent');
    if (!container) {return;}

    if (this.logs.length === 0) {
      container.innerHTML = '暂无日志记录';
      return;
    }

    const logsText = this.logs.map(log => {
      const timestamp = new Date(log.timestamp).toLocaleString('zh-CN');
      const level = this.formatLogLevel(log.level).padEnd(6);
      const message = log.message;
      const user = log.user.padEnd(10);
      const ip = log.ip.padEnd(15);

      return `[${timestamp}] ${level} | ${user} | ${ip} | ${message}`;
    }).join('\n');

    container.textContent = logsText;
  }

  // 渲染模拟日志
  renderMockLogs() {
    const container = document.getElementById('logsContent');
    if (!container) {return;}

    const mockLogs = [
      {
        level: 'INFO',
        message: '用户登录成功',
        user: 'admin',
        ip: '127.0.0.1',
        timestamp: new Date().toISOString()
      },
      {
        level: 'WARNING',
        message: 'PDF转换服务连接超时',
        user: 'system',
        ip: 'localhost',
        timestamp: new Date(Date.now() - 3600000).toISOString()
      },
      {
        level: 'ERROR',
        message: '数据库连接失败',
        user: 'system',
        ip: 'localhost',
        timestamp: new Date(Date.now() - 7200000).toISOString()
      }
    ];

    const logsText = mockLogs.map(log => {
      const timestamp = new Date(log.timestamp).toLocaleString('zh-CN');
      const level = this.formatLogLevel(log.level).padEnd(6);
      const message = log.message;
      const user = log.user.padEnd(10);
      const ip = log.ip.padEnd(15);

      return `[${timestamp}] ${level} | ${user} | ${ip} | ${message}`;
    }).join('\n');

    container.textContent = logsText;
  }

  // 获取日志级别颜色
  getLogLevelColor(level) {
    const colors = {
      'INFO': 'border-blue-500 text-blue-500',
      'WARNING': 'border-yellow-500 text-yellow-500',
      'ERROR': 'border-red-500 text-red-500',
      'DEBUG': 'border-gray-500 text-gray-500'
    };
    return colors[level] || 'border-gray-500 text-gray-500';
  }

  // 获取日志图标
  getLogIcon(level) {
    const icons = {
      'INFO': 'fa-info-circle',
      'WARNING': 'fa-exclamation-triangle',
      'ERROR': 'fa-times-circle',
      'DEBUG': 'fa-bug'
    };
    return icons[level] || 'fa-info-circle';
  }

  // 格式化日志级别
  formatLogLevel(level) {
    const levelNames = {
      'INFO': '信息',
      'WARNING': '警告',
      'ERROR': '错误',
      'DEBUG': '调试'
    };
    return levelNames[level] || level;
  }

  // 清空日志
  async clearLogs() {
    const olderThanDays = prompt('清理多少天前的日志？', '30');

    if (!olderThanDays || isNaN(olderThanDays)) {
      NotificationHelper.error('请输入有效的天数');
      return;
    }

    try {
      const response = await window.API.service.delete(`/settings/logs?olderThanDays=${olderThanDays}`);

      if (response.status === 'Success') {
        NotificationHelper.success(`已清理${olderThanDays}天前的系统日志`);
        this.loadLogs();
      } else {
        NotificationHelper.error(response.message || '清空日志失败');
      }
    } catch (error) {
      console.error('清空日志失败:', error);
      NotificationHelper.error('清空日志失败');
    }
  }

  // 加载系统统计
  async loadSystemStats() {
    try {
      const response = await window.API.service.get('/settings/stats');

      if (response.status === 'Success') {
        this.updateSystemStats(response.data);
      } else {
        NotificationHelper.error(response.message || '加载系统统计失败');
      }
    } catch (error) {
      console.error('加载系统统计失败:', error);
      this.updateSystemStats(this.getMockStats());
    }
  }

  // 更新系统统计显示
  updateSystemStats(stats) {
    // 更新统计数字
    this.updateElement('statsCustomers', stats.totalCustomers || 0);
    this.updateElement('statsHealthAssessments', stats.totalHealthAssessments || 0);
    this.updateElement('statsStemCellPatients', stats.totalStemCellPatients || 0);
    this.updateElement('statsActiveUsers', stats.totalActiveUsers || 0);
    this.updateElement('statsReports', stats.totalReports || 0);
    this.updateElement('statsDatabaseSize', stats.databaseSize || '0MB');

    // 更新系统信息
    this.updateElement('systemUptime', stats.systemUptime || '未知');

    // 如果有健康状态数据，更新服务状态
    if (stats.services) {
      this.updateServiceStatus('dbStatus', stats.services.database);
      this.updateServiceStatus('pdfStatus', stats.services.pdfService);
      this.updateServiceStatus('apiStatus', stats.services.deepseekApi);
    }

    // 如果有系统信息，更新系统资源使用率
    if (stats.system) {
      this.updateElement('cpuUsage', stats.system.cpuUsage || '未知');
      this.updateElement('memoryUsage', stats.system.memoryUsage || '未知');
    }
  }

  // 更新元素内容
  updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  }

  // 更新服务状态
  updateServiceStatus(elementId, service) {
    const element = document.getElementById(elementId);
    if (!element) {return;}

    let statusClass = 'bg-green-100 text-green-800';
    let statusText = '正常';

    if (service.status === 'error' || !service.available) {
      statusClass = 'bg-red-100 text-red-800';
      statusText = '异常';
    } else if (service.status === 'warning') {
      statusClass = 'bg-yellow-100 text-yellow-800';
      statusText = '警告';
    }

    element.className = `px-2 py-1 text-xs rounded-full ${statusClass}`;
    element.textContent = statusText;
  }

  // 获取模拟统计数据
  getMockStats() {
    return {
      totalCustomers: 156,
      totalHealthAssessments: 89,
      totalStemCellPatients: 234,
      totalActiveUsers: 5,
      totalReports: 156,
      databaseSize: '125.6MB',
      systemUptime: '15天7小时',
      services: {
        database: {
          status: 'connected',
          responseTime: '15ms'
        },
        pdfService: {
          status: 'available',
          responseTime: '120ms'
        },
        deepseekApi: {
          status: 'available',
          responseTime: '850ms'
        }
      },
      system: {
        cpuUsage: '25%',
        memoryUsage: '68%',
        diskSpace: {
          total: '500GB',
          used: '125.6GB',
          available: '374.4GB'
        }
      }
    };
  }

  // 刷新系统统计
  async refreshSystemStats() {
    // 显示加载状态
    const refreshBtn = document.querySelector('[onclick="settingsManager.refreshSystemStats()"]');
    if (refreshBtn) {
      refreshBtn.disabled = true;
      refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>刷新中...';
    }

    try {
      await this.loadSystemStats();
      NotificationHelper.success('系统统计已刷新');
    } catch (error) {
      NotificationHelper.error('刷新失败');
    } finally {
      // 恢复按钮状态
      if (refreshBtn) {
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = '<i class="fas fa-sync-alt mr-2"></i>刷新统计';
      }
    }
  }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  window.settingsManager = new SettingsManager();
});