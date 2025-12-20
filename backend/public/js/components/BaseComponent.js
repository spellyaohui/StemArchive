/**
 * 基础组件类
 * 提供所有UI组件的通用功能和生命周期管理
 */

class BaseComponent {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    this.options = {
      className: '',
      template: '',
      autoRender: true,
      ...options
    };

    this.state = {};
    this.props = {};
    this.children = new Map();
    this.eventListeners = new Map();
    this.isRendered = false;
    this.isDestroyed = false;

    this.init();
  }

  /**
     * 初始化组件
     */
  init() {
    this.setupComponent();
    if (this.options.autoRender) {
      this.render();
    }
    this.bindEvents();
    this.onMounted();
  }

  /**
     * 设置组件基础配置
     */
  setupComponent() {
    if (this.container) {
      this.container.classList.add(this.options.className);
      this.container.setAttribute('data-component', this.constructor.name);
    }
  }

  /**
     * 获取组件模板
     * @returns {string} HTML模板字符串
     */
  getTemplate() {
    return this.options.template || '';
  }

  /**
     * 渲染组件
     * @param {Object} data - 渲染数据
     */
  render(data = {}) {
    if (this.isDestroyed) {return;}

    const template = this.getTemplate();
    const html = this.processTemplate(template, { ...this.state, ...this.props, ...data });

    if (this.container) {
      this.container.innerHTML = html;
      this.isRendered = true;
      this.onRendered();
    }
  }

  /**
     * 处理模板
     * @param {string} template - 模板字符串
     * @param {Object} data - 数据对象
     * @returns {string} 处理后的HTML
     */
  processTemplate(template, data) {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? data[key] : '';
    });
  }

  /**
     * 更新组件状态
     * @param {Object} newState - 新状态
     */
  setState(newState) {
    const oldState = { ...this.state };
    this.state = { ...this.state, ...newState };
    this.onStateUpdate(oldState, this.state);
    this.render();
  }

  /**
     * 更新组件属性
     * @param {Object} newProps - 新属性
     */
  setProps(newProps) {
    const oldProps = { ...this.props };
    this.props = { ...this.props, ...newProps };
    this.onPropsUpdate(oldProps, this.props);
    this.render();
  }

  /**
     * 添加子组件
     * @param {string} name - 子组件名称
     * @param {BaseComponent} child - 子组件实例
     */
  addChild(name, child) {
    this.children.set(name, child);
  }

  /**
     * 获取子组件
     * @param {string} name - 子组件名称
     * @returns {BaseComponent} 子组件实例
     */
  getChild(name) {
    return this.children.get(name);
  }

  /**
     * 移除子组件
     * @param {string} name - 子组件名称
     */
  removeChild(name) {
    const child = this.children.get(name);
    if (child) {
      child.destroy();
      this.children.delete(name);
    }
  }

  /**
     * 绑定事件监听器
     */
  bindEvents() {
    // 子类可以重写此方法来绑定特定事件
  }

  /**
     * 添加事件监听器
     * @param {string} element - 元素选择器
     * @param {string} event - 事件类型
     * @param {Function} handler - 事件处理函数
     */
  addEventListener(element, event, handler) {
    const el = typeof element === 'string' ? this.container?.querySelector(element) : element;
    if (el) {
      el.addEventListener(event, handler);

      // 存储事件监听器以便后续清理
      const key = `${element}_${event}`;
      if (!this.eventListeners.has(key)) {
        this.eventListeners.set(key, []);
      }
      this.eventListeners.get(key).push({ element: el, event, handler });
    }
  }

  /**
     * 移除事件监听器
     * @param {string} element - 元素选择器
     * @param {string} event - 事件类型
     * @param {Function} handler - 事件处理函数
     */
  removeEventListener(element, event, handler) {
    const el = typeof element === 'string' ? this.container?.querySelector(element) : element;
    if (el) {
      el.removeEventListener(event, handler);

      // 从存储中移除
      const key = `${element}_${event}`;
      const listeners = this.eventListeners.get(key);
      if (listeners) {
        const index = listeners.findIndex(l => l.element === el && l.event === event && l.handler === handler);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    }
  }

  /**
     * 显示加载状态
     * @param {string} message - 加载消息
     */
  showLoading(message = '加载中...') {
    if (this.container) {
      this.container.classList.add('loading');
      const loadingEl = this.container.querySelector('.loading-overlay');
      if (loadingEl) {
        loadingEl.textContent = message;
        loadingEl.style.display = 'flex';
      } else {
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'loading-overlay';
        loadingOverlay.innerHTML = `
                    <div class="loading-spinner">
                        <i class="fas fa-spinner fa-spin"></i>
                        <span>${message}</span>
                    </div>
                `;
        loadingOverlay.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(255, 255, 255, 0.8);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                `;
        this.container.style.position = 'relative';
        this.container.appendChild(loadingOverlay);
      }
    }
  }

  /**
     * 隐藏加载状态
     */
  hideLoading() {
    if (this.container) {
      this.container.classList.remove('loading');
      const loadingEl = this.container.querySelector('.loading-overlay');
      if (loadingEl) {
        loadingEl.style.display = 'none';
      }
    }
  }

  /**
     * 显示错误状态
     * @param {string} message - 错误消息
     */
  showError(message) {
    if (this.container) {
      const errorEl = this.container.querySelector('.error-message');
      if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
      } else {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
                    <i class="fas fa-exclamation-circle"></i>
                    <span>${message}</span>
                `;
        errorDiv.style.cssText = `
                    color: #ef4444;
                    padding: 10px;
                    background-color: #fef2f2;
                    border: 1px solid #fecaca;
                    border-radius: 4px;
                    margin-bottom: 10px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                `;
        this.container.insertBefore(errorDiv, this.container.firstChild);
      }
    }
  }

  /**
     * 隐藏错误状态
     */
  hideError() {
    if (this.container) {
      const errorEl = this.container.querySelector('.error-message');
      if (errorEl) {
        errorEl.style.display = 'none';
      }
    }
  }

  /**
     * 验证表单数据
     * @param {Object} rules - 验证规则
     * @param {Object} data - 待验证数据
     * @returns {Object} 验证结果
     */
  validate(rules, data) {
    const errors = {};

    Object.keys(rules).forEach(field => {
      const rule = rules[field];
      const value = data[field];

      if (rule.required && (!value || value.toString().trim() === '')) {
        errors[field] = rule.requiredMessage || `${field}不能为空`;
        return;
      }

      if (value && rule.pattern && !rule.pattern.test(value)) {
        errors[field] = rule.patternMessage || `${field}格式不正确`;
        return;
      }

      if (value && rule.minLength && value.length < rule.minLength) {
        errors[field] = rule.minLengthMessage || `${field}长度不能少于${rule.minLength}个字符`;
        return;
      }

      if (value && rule.maxLength && value.length > rule.maxLength) {
        errors[field] = rule.maxLengthMessage || `${field}长度不能超过${rule.maxLength}个字符`;
        return;
      }

      if (rule.custom && typeof rule.custom === 'function') {
        const customError = rule.custom(value);
        if (customError) {
          errors[field] = customError;
        }
      }
    });

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  /**
     * 生命周期钩子 - 组件挂载后
     */
  onMounted() {
    // 子类可以重写此方法
  }

  /**
     * 生命周期钩子 - 组件渲染后
     */
  onRendered() {
    // 子类可以重写此方法
  }

  /**
     * 生命周期钩子 - 状态更新后
     * @param {Object} oldState - 旧状态
     * @param {Object} newState - 新状态
     */
  onStateUpdate(oldState, newState) {
    // 子类可以重写此方法
  }

  /**
     * 生命周期钩子 - 属性更新后
     * @param {Object} oldProps - 旧属性
     * @param {Object} newProps - 新属性
     */
  onPropsUpdate(oldProps, newProps) {
    // 子类可以重写此方法
  }

  /**
     * 生命周期钩子 - 组件销毁前
     */
  onDestroy() {
    // 子类可以重写此方法
  }

  /**
     * 销毁组件
     */
  destroy() {
    if (this.isDestroyed) {return;}

    this.onDestroy();

    // 清理子组件
    this.children.forEach(child => child.destroy());
    this.children.clear();

    // 清理事件监听器
    this.eventListeners.forEach(listeners => {
      listeners.forEach(({ element, event, handler }) => {
        element.removeEventListener(event, handler);
      });
    });
    this.eventListeners.clear();

    // 清理DOM
    if (this.container) {
      this.container.innerHTML = '';
      this.container.removeAttribute('data-component');
    }

    this.isDestroyed = true;
  }

  /**
     * 静态方法 - 创建组件
     * @param {HTMLElement|string} container - 容器元素或选择器
     * @param {Object} options - 配置选项
     * @returns {BaseComponent} 组件实例
     */
  static create(container, options = {}) {
    return new this(container, options);
  }

  /**
     * 静态方法 - 从模板创建组件
     * @param {string} template - HTML模板
     * @param {HTMLElement|string} container - 容器元素或选择器
     * @param {Object} options - 配置选项
     * @returns {BaseComponent} 组件实例
     */
  static fromTemplate(template, container, options = {}) {
    return new this(container, {
      template,
      ...options
    });
  }
}

// 导出基础组件类
window.BaseComponent = BaseComponent;