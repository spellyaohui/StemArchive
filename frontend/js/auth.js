/**
 * 认证系统
 * 提供用户登录、注册、权限验证等功能
 */

class Auth {
  constructor() {
    this.token = localStorage.getItem('token');
    this.user = JSON.parse(localStorage.getItem('user') || '{}');
    this.isInitialized = false; // 防止重复初始化
    this.menuState = null; // 菜单状态缓存

    // 如果已有用户信息，预设菜单状态
    if (this.user.role) {
      this.preloadMenuState();
    }

    // 异步初始化，不等待完成
    this.init().catch(error => {
      console.error('认证系统初始化失败:', error);
    });
  }

  async init() {
    // 使用setTimeout让初始化异步执行，不阻塞页面加载
    setTimeout(async () => {
      try {
        // 检查token是否过期
        if (this.token) {
          await this.verifyToken();
        }

        // 初始化用户菜单
        this.initUserMenu();

        // 初始化移动端菜单
        this.initMobileMenu();
      } catch (error) {
        console.error('认证系统异步初始化失败:', error);
      }
    }, 0);
  }

  // 验证token有效性
  async verifyToken() {
    try {
      // 使用优化的API，防止重复验证请求
      let result;
      if (window.optimizedAPI) {
        result = await window.optimizedAPI.verifyToken(this.token);
      } else {
        result = await window.API.service.request('/auth/verify', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.token}`
          }
        });
      }

      if (result.status !== 'Success') {
        throw new Error(result.message || 'Token验证失败');
      }

      // 更新用户信息
      this.user = result.data.user;

      // 确保必要字段存在
      if (!this.user.role) {
        console.warn('Token验证成功但用户角色信息缺失:', this.user);
      }

      // 验证用户数据完整性
      if (!this.user.id || !this.user.username) {
        console.warn('Token验证成功但用户关键信息缺失:', this.user);
      }

      localStorage.setItem('user', JSON.stringify(this.user));
      this.updateUserUI();
      console.log('Token验证完成，当前用户角色:', this.getUserRole());

      // 预设菜单状态，避免点击时重复验证
      this.preloadMenuState();
    } catch (error) {
      console.error('Token验证失败:', error);
      this.logout();
    }
  }

  // 登录
  async login(username, password, rememberMe = false) {
    try {
      const result = await window.API.service.post('/auth/login', { username, password });

      if (result.status === 'Success') {
        // 保存token和用户信息
        this.token = result.data.token;
        this.user = result.data.user;

        localStorage.setItem('token', this.token);
        localStorage.setItem('user', JSON.stringify(this.user));

        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true');
        }

        this.updateUserUI();
        this.preloadMenuState(); // 登录成功时预设菜单状态
        return { success: true, data: result.data };
      } else {
        return { success: false, message: result.message || '登录失败' };
      }
    } catch (error) {
      console.error('登录失败:', error);
      return { success: false, message: '网络错误，请检查连接' };
    }
  }

  // 退出登录
  async logout() {
    try {
      // 调用后端退出登录API
      if (this.token) {
        await window.API.service.request('/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token}`
          }
        });
      }
    } catch (error) {
      console.error('调用退出登录API失败:', error);
      // 即使API调用失败，仍然继续本地退出流程
    } finally {
      // 清除本地存储
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('rememberMe');

      this.token = null;
      this.user = {};

      // 立即跳转到登录页面，不等待任何异步操作
      if (window.location.pathname !== '/login.html') {
        window.location.href = 'login.html';
      }
    }
  }

  // 检查是否已登录
  isAuthenticated() {
    return !!this.token;
  }

  // 获取用户信息
  getUser() {
    return this.user;
  }

  // 获取用户角色
  getUserRole() {
    if (!this.user || typeof this.user !== 'object') {
      console.warn('用户数据异常，使用默认角色:', this.user);
      return 'user';
    }
    if (!this.user.role) {
      console.warn('用户角色信息缺失，使用默认角色:', this.user);
    }
    return this.user.role || 'user';
  }

  // 检查权限
  hasRole(requiredRole) {
    const userRole = this.getUserRole();
    console.log(`权限检查: 用户角色=${userRole}, 需要角色=${requiredRole}`);

    if (Array.isArray(requiredRole)) {
      const hasPermission = requiredRole.includes(userRole);
      console.log(`数组权限检查结果: ${hasPermission}`);
      return hasPermission;
    }

    const roleHierarchy = {
      'admin': 3,
      'doctor': 2,
      'user': 1
    };

    const userLevel = roleHierarchy[userRole] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;
    const hasPermission = userLevel >= requiredLevel;

    console.log(`层级权限检查: 用户级别=${userLevel}, 需要级别=${requiredLevel}, 结果=${hasPermission}`);
    return hasPermission;
  }

  // 检查是否为管理员
  isAdmin() {
    return this.getUserRole() === 'admin';
  }

  // 初始化用户菜单
  initUserMenu() {
    // 防止重复初始化
    if (this.menuInitialized) {
      console.log('用户菜单已初始化，跳过重复初始化');
      return;
    }

    const userMenuBtn = document.getElementById('userMenuBtn');
    const userMenu = document.getElementById('userMenu');
    const logoutBtn = document.getElementById('logoutBtn');
    const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');

    // 移除页面初始化时的权限检查，改为点击时验证
    console.log('用户菜单初始化完成，权限验证将在点击时进行');

    if (userMenuBtn && userMenu) {
      userMenuBtn.addEventListener('click', async () => {
        // 显示菜单
        userMenu.classList.remove('hidden');

        // 按需验证权限并更新菜单显示
        await this.updateMenuPermissions();
      });

      // 点击外部关闭菜单
      document.addEventListener('click', (e) => {
        if (!userMenuBtn.contains(e.target) && !userMenu.contains(e.target)) {
          userMenu.classList.add('hidden');
        }
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        NotificationHelper.confirm(
          '确定要退出登录吗？',
          () => {
            this.logout();
          }
        );
      });
    }

    if (mobileLogoutBtn) {
      mobileLogoutBtn.addEventListener('click', () => {
        NotificationHelper.confirm(
          '确定要退出登录吗？',
          () => {
            this.logout();
          }
        );
      });
    }

    this.updateUserUI();

    // 标记菜单初始化完成
    this.menuInitialized = true;
    console.log('用户菜单初始化完成');
  }

  // 初始化移动端菜单
  initMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');

    if (mobileMenuBtn && mobileMenu) {
      mobileMenuBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
      });
    }
  }

  // 更新用户界面
  updateUserUI() {
    const usernameElements = document.querySelectorAll('#username');
    const profileNameElements = document.querySelectorAll('#profileName');
    const profileEmailElements = document.querySelectorAll('#profileEmail');
    const profilePhoneElements = document.querySelectorAll('#profilePhone');
    const profileRoleElements = document.querySelectorAll('#profileRole');

    if (this.user.username) {
      usernameElements.forEach(el => {
        el.textContent = this.user.username;
      });
      profileNameElements.forEach(el => {
        el.textContent = this.user.real_name || this.user.username;
      });
    }

    if (this.user.email) {
      profileEmailElements.forEach(el => {
        el.textContent = this.user.email;
      });
    }

    if (this.user.phone) {
      profilePhoneElements.forEach(el => {
        el.textContent = this.user.phone;
      });
    }

    if (this.user.role) {
      const roleMap = {
        'admin': '系统管理员',
        'doctor': '医生',
        'user': '普通用户'
      };
      profileRoleElements.forEach(el => {
        el.textContent = roleMap[this.user.role] || '普通用户';
      });
    }
  }

  // 权限检查装饰器
  requireAuth(requiredRole = 'user') {
    return (target, propertyKey, descriptor) => {
      const originalMethod = descriptor.value;

      descriptor.value = function(...args) {
        if (!this.isAuthenticated()) {
          showNotification('请先登录', 'error');
          window.location.href = 'login.html';
          return;
        }

        if (!this.hasRole(requiredRole)) {
          showNotification('权限不足', 'error');
          return;
        }

        return originalMethod.apply(this, args);
      };

      return descriptor;
    };
  }

  // 轻量级菜单权限验证（点击时使用）- 极速版
  async updateMenuPermissions() {
    try {
      // 极速路径1：如果已有预设状态，直接应用
      if (this.menuState) {
        if (this.menuState === 'admin') {
          this.showAdminMenuItems();
        } else {
          this.hideAdminMenuItems();
        }
        return;
      }

      // 极速路径2：如果用户角色已知，直接应用
      if (this.user.role) {
        if (this.user.role === 'admin') {
          this.showAdminMenuItems();
          this.preloadMenuState(); // 预设状态以备下次使用
        } else {
          this.hideAdminMenuItems();
          this.preloadMenuState();
        }
        return;
      }

      // 降级路径：只有在完全没有用户信息时才进行token验证
      if (this.token) {
        await this.verifyToken();
        if (this.user.role === 'admin') {
          this.showAdminMenuItems();
        } else {
          this.hideAdminMenuItems();
        }
        this.preloadMenuState();
      }
    } catch (error) {
      console.error('菜单权限验证失败:', error);
      // 出错时默认隐藏管理员菜单
      this.hideAdminMenuItems();
    }
  }

  // 显示管理员菜单项
  showAdminMenuItems() {
    const adminMenuItems = document.getElementById('adminMenuItems');
    const settingsLink = document.querySelector('a[href="settings.html"]');

    if (adminMenuItems) {
      adminMenuItems.classList.remove('hidden');
    }
    if (settingsLink) {
      settingsLink.style.display = 'block';
    }
  }

  // 隐藏管理员菜单项
  hideAdminMenuItems() {
    const adminMenuItems = document.getElementById('adminMenuItems');
    const settingsLink = document.querySelector('a[href="settings.html"]');

    if (adminMenuItems) {
      adminMenuItems.classList.add('hidden');
    }
    if (settingsLink) {
      settingsLink.style.display = 'none';
    }
  }

  // 预设菜单状态（在用户登录或token验证成功后调用）
  preloadMenuState() {
    // 根据用户角色预设菜单状态，避免点击时重复DOM操作
    if (this.user.role === 'admin') {
      // 对于管理员，预设显示状态，但保持DOM隐藏
      this.menuState = 'admin';
    } else {
      // 对于普通用户，预设隐藏状态
      this.menuState = 'user';
    }
    console.log(`菜单状态已预设: ${this.menuState}`);
  }

  // 保留原有的完整权限检查方法（用于特殊情况）
  checkAdminPermissions(retryCount = 0) {
    const userRole = this.getUserRole();
    const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
    const checkKey = `${currentPage}_${userRole}_${retryCount}`;

    // 防止同一页面的重复权限检查
    if (this.lastPermissionCheck === checkKey && retryCount === 0) {
      console.log('权限检查已在当前页面执行过，跳过重复检查');
      return;
    }

    console.log('=== 完整权限检查开始 ===');
    console.log('当前页面:', currentPage);
    console.log('当前用户角色:', userRole);
    console.log('Token存在性:', !!this.token);
    console.log('重试次数:', retryCount);

    const adminMenuItems = document.getElementById('adminMenuItems');
    const settingsLink = document.querySelector('a[href="settings.html"]');

    // 检查当前页面是否应该包含管理员菜单（根据实际项目结构）
    const pagesWithAdminMenu = [
      'dashboard.html',
      'customers.html',
      'health-data.html',
      'stem-cell.html'
    ];
    const shouldHaveAdminMenu = pagesWithAdminMenu.includes(currentPage);

    // 如果当前页面应该有管理员菜单但DOM元素还没加载完成，延迟重试
    if (shouldHaveAdminMenu && !adminMenuItems && retryCount < 3) {
      console.log(`${currentPage}页面应该包含管理员菜单但DOM元素未找到，50ms后重试...`);
      setTimeout(() => {
        this.checkAdminPermissions(retryCount + 1);
      }, 50);
      return;
    }

    if (this.hasRole('admin')) {
      console.log('✅ 用户是管理员，显示管理功能');
      this.showAdminMenuItems();
      this.checkPageAccess();
    } else {
      console.log('❌ 用户不是管理员，隐藏管理功能');
      this.hideAdminMenuItems();
      this.checkPageAccess();
    }

    // 记录本次权限检查的标识
    this.lastPermissionCheck = checkKey;
    console.log('=== 完整权限检查完成 ===');
  }

  // 检查页面访问权限
  checkPageAccess() {
    const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';

    // 需要管理员权限的页面列表
    const adminOnlyPages = [
      'settings.html',
      'department-management.html',
      'person-management.html'
    ];

    if (adminOnlyPages.includes(currentPage) && !this.hasRole('admin')) {
      // 显示权限不足提示
      this.showAccessDeniedMessage();

      // 重定向到仪表板
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 3000);
    }
  }

  // 显示权限不足消息
  showAccessDeniedMessage() {
    // 创建消息元素
    const messageDiv = document.createElement('div');
    messageDiv.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #ef4444;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            z-index: 9999;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 8px;
        `;
    messageDiv.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <span>权限不足，您没有访问此页面的权限</span>
        `;

    document.body.appendChild(messageDiv);

    // 3秒后自动移除
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.parentNode.removeChild(messageDiv);
      }
    }, 3000);
  }
}

// 页面加载时检查登录状态
document.addEventListener('DOMContentLoaded', () => {
  const currentPath = window.location.pathname;

  // 对于登录页面，完全跳过Auth初始化和所有检查逻辑
  if (currentPath.includes('login.html')) {
    console.log('登录页面 - 跳过认证系统初始化');
    return;
  }

  // 创建全局认证实例
  const auth = new Auth();

  // 等待认证系统异步初始化完成后再检查登录状态
  // 增加延迟时间，确保异步初始化有足够时间完成
  setTimeout(() => {
    // 如果不是登录页面且未登录，跳转到登录页面
    if (!auth.isAuthenticated()) {
      console.log('用户未登录，跳转到登录页面');
      window.location.replace('login.html');
      return;
    }

    console.log('用户已登录，保持当前页面');
  }, 300); // 增加延迟时间，确保异步初始化完成

  // 导出认证实例
  window.auth = auth;
});