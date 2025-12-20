/**
 * 增强版通知管理器
 * 解决通知堆积、重复、内存泄漏等问题
 */
class NotificationManager {
    constructor() {
        this.notifications = new Map(); // 存储所有活动通知
        this.maxNotifications = 5; // 最大同时显示的通知数量
        this.notificationQueue = []; // 通知队列
        this.deduplicationEnabled = true; // 启用去重
        this.deduplicationWindow = 1000; // 去重时间窗口（毫秒）
        this.lastNotifications = new Map(); // 用于去重的最近通知记录
        this.cleanupInterval = 30000; // 清理间隔（毫秒）
        this.maxDuration = 60000; // 默认最大持续时间（1分钟）
        this.aiMaxDuration = 600000; // AI通信最大持续时间（10分钟）

        // 启动定期清理
        this.startCleanupTimer();
    }

    /**
     * 创建通知（主要入口）
     */
    create(message, type = 'info', duration = 3000, options = {}) {
        const notificationId = options.id || this.generateId();

        // 去重检查
        if (this.deduplicationEnabled && this.isDuplicate(message, type)) {
            console.log('检测到重复通知，跳过创建:', { message, type });
            return this.getExistingNotification(message, type);
        }

        // 检查是否超过最大通知数量
        if (this.notifications.size >= this.maxNotifications) {
            this.queueNotification({ message, type, duration, options, notificationId });
            this.removeOldestNotification();
        }

        // 创建通知
        const notification = this.createNotificationElement(message, type, duration, options, notificationId);

        // 存储通知信息
        this.notifications.set(notificationId, {
            element: notification,
            message,
            type,
            createdAt: Date.now(),
            duration,
            options,
            timer: null,
            maxTimer: null
        });

        // 记录用于去重
        this.recordNotification(message, type, notificationId);

        // 设置自动关闭
        if (duration > 0 && !options.persistent) {
            this.setAutoClose(notificationId, duration);
        }

        // 为持久化通知设置最大持续时间，防止永久残留
        // AI通信类通知使用更长的超时时间
        if (options.persistent) {
            const maxTime = options.isAiCommunication ? this.aiMaxDuration : this.maxDuration;
            this.setMaxDuration(notificationId, maxTime);
        }

        // 添加到页面
        this.addToPage(notification);

        return notification;
    }

    /**
     * 创建通知元素
     */
    createNotificationElement(message, type, duration, options, notificationId) {
        const {
            title = null,
            actionText = null,
            actionCallback = null,
            persistent = false,
            showProgress = duration > 0 && !persistent,
            group = null
        } = options;

        const notification = document.createElement('div');
        notification.className = `notification ${type} entering`;
        notification.dataset.notificationId = notificationId;
        if (group) notification.dataset.group = group;

        // 构建标题
        const titleHtml = title ? `<div class="notification-title">${this.escapeHtml(title)}</div>` : '';

        // 构建进度条
        const progressHtml = showProgress ? `
            <div class="notification-progress">
                <div class="notification-progress-bar" style="animation-duration: ${duration}ms"></div>
            </div>
        ` : '';

        // 构建操作按钮
        const actionHtml = actionText ? `
            <button class="notification-action-btn">
                ${this.escapeHtml(actionText)}
            </button>
        ` : '';

        notification.innerHTML = `
            <div class="notification-content">
                ${titleHtml}
                <div class="notification-body">
                    <i class="fas ${this.getNotificationIcon(type)} notification-icon"></i>
                    <div class="notification-message-wrapper">
                        <div class="notification-message">${this.escapeHtml(message)}</div>
                    </div>
                    <div class="notification-actions">
                        ${actionHtml}
                        <button class="notification-close-btn" aria-label="关闭通知">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                ${progressHtml}
            </div>
        `;

        // 绑定事件
        this.bindNotificationEvents(notification, notificationId, actionCallback);

        return notification;
    }

    /**
     * HTML转义，防止XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 绑定通知事件
     */
    bindNotificationEvents(notification, notificationId, actionCallback) {
        // 关闭按钮事件
        const closeBtn = notification.querySelector('.notification-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.remove(notificationId);
            });
        }

        // 操作按钮事件
        if (actionCallback) {
            const actionBtn = notification.querySelector('.notification-action-btn');
            if (actionBtn) {
                actionBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    actionCallback();
                    this.remove(notificationId);
                });
            }
        }

        // 点击通知本身关闭（非持久化通知）
        if (!this.notifications.get(notificationId)?.options.persistent) {
            notification.addEventListener('click', () => {
                this.remove(notificationId);
            });
        }
    }

    /**
     * 添加通知到页面
     */
    addToPage(notification) {
        // 确保通知容器存在
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            document.body.appendChild(container);
        }

        container.appendChild(notification);

        // 移除entering类，触发动画完成
        setTimeout(() => {
            notification.classList.remove('entering');
        }, 300);
    }

    /**
     * 调整通知位置
     */
    adjustNotificationPositions() {
        const container = document.getElementById('notification-container');
        if (!container) return;

        const notifications = container.querySelectorAll('.notification');
        notifications.forEach((notification, index) => {
            notification.style.order = index;
        });
    }

    /**
     * 移除通知
     */
    remove(notificationId) {
        const notificationData = this.notifications.get(notificationId);
        if (!notificationData) return false;

        const { element, timer, maxTimer, timerInterval } = notificationData;

        // 清除定时器
        if (timer) {
            clearTimeout(timer);
        }
        if (maxTimer) {
            clearTimeout(maxTimer);
        }
        // 清除AI通知的计时器
        if (timerInterval) {
            clearInterval(timerInterval);
        }

        // 添加退出动画类
        element.classList.add('exiting');

        // 延迟移除DOM元素
        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
        }, 300);

        // 从存储中移除
        this.notifications.delete(notificationId);

        // 处理队列中的通知
        this.processQueue();

        return true;
    }

    /**
     * 设置自动关闭
     */
    setAutoClose(notificationId, duration) {
        const timer = setTimeout(() => {
            this.remove(notificationId);
        }, duration);

        const notificationData = this.notifications.get(notificationId);
        if (notificationData) {
            notificationData.timer = timer;
        }
    }

    /**
     * 设置最大持续时间（防止持久化通知永久残留）
     */
    setMaxDuration(notificationId, duration = this.maxDuration) {
        const maxTimer = setTimeout(() => {
            console.warn(`通知 ${notificationId} 超过最大持续时间，自动移除`);
            this.remove(notificationId);
        }, duration);

        const notificationData = this.notifications.get(notificationId);
        if (notificationData) {
            notificationData.maxTimer = maxTimer;
        }
    }

    /**
     * 创建AI通信进度通知（带实时计时器）
     */
    createAiProgressNotification(message, options = {}) {
        const notificationId = options.id || this.generateId();
        const startTime = Date.now();

        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = 'notification ai-progress entering';
        notification.dataset.notificationId = notificationId;
        notification.dataset.group = 'ai-communication';

        const title = options.title || 'AI 分析中';

        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-title">${this.escapeHtml(title)}</div>
                <div class="notification-body">
                    <div class="ai-progress-icon">
                        <i class="fas fa-robot"></i>
                        <div class="ai-pulse-ring"></div>
                    </div>
                    <div class="notification-message-wrapper">
                        <div class="notification-message">${this.escapeHtml(message)}</div>
                        <div class="ai-progress-info">
                            <span class="ai-timer">已用时: <span class="timer-value">0</span>秒</span>
                            <span class="ai-status">正在连接...</span>
                        </div>
                    </div>
                    <button class="notification-close-btn" aria-label="关闭通知">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="ai-progress-bar-container">
                    <div class="ai-progress-bar"></div>
                </div>
            </div>
        `;

        // 绑定关闭事件
        const closeBtn = notification.querySelector('.notification-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.remove(notificationId);
            });
        }

        // 启动计时器
        const timerElement = notification.querySelector('.timer-value');
        const statusElement = notification.querySelector('.ai-status');
        const progressBar = notification.querySelector('.ai-progress-bar');

        const timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            if (timerElement) {
                timerElement.textContent = elapsed;
            }

            // 更新状态提示
            if (statusElement) {
                if (elapsed < 5) {
                    statusElement.textContent = '正在连接...';
                } else if (elapsed < 15) {
                    statusElement.textContent = '正在分析数据...';
                } else if (elapsed < 30) {
                    statusElement.textContent = '正在生成报告...';
                } else if (elapsed < 60) {
                    statusElement.textContent = '处理中，请耐心等待...';
                } else if (elapsed < 120) {
                    statusElement.textContent = '数据量较大，仍在处理...';
                } else {
                    statusElement.textContent = '处理时间较长，请继续等待...';
                }
            }

            // 更新进度条（模拟进度，最多到90%）
            if (progressBar) {
                const progress = Math.min(90, (elapsed / 120) * 100);
                progressBar.style.width = `${progress}%`;
            }
        }, 1000);

        // 存储通知信息
        this.notifications.set(notificationId, {
            element: notification,
            message,
            type: 'ai-progress',
            createdAt: startTime,
            duration: 0,
            options: { ...options, persistent: true, isAiCommunication: true, group: 'ai-communication' },
            timer: null,
            maxTimer: null,
            timerInterval,
            statusElement,
            progressBar
        });

        // 设置最大持续时间（10分钟）
        this.setMaxDuration(notificationId, this.aiMaxDuration);

        // 添加到页面
        this.addToPage(notification);

        return {
            id: notificationId,
            element: notification,
            updateStatus: (status) => this.updateAiNotificationStatus(notificationId, status),
            updateMessage: (msg) => this.updateAiNotificationMessage(notificationId, msg),
            complete: (msg, isSuccess = true) => this.completeAiNotification(notificationId, msg, isSuccess),
            remove: () => this.remove(notificationId)
        };
    }

    /**
     * 更新AI通知状态
     */
    updateAiNotificationStatus(notificationId, status) {
        const notificationData = this.notifications.get(notificationId);
        if (!notificationData) return;

        const statusElement = notificationData.element.querySelector('.ai-status');
        if (statusElement) {
            statusElement.textContent = status;
        }
    }

    /**
     * 更新AI通知消息
     */
    updateAiNotificationMessage(notificationId, message) {
        const notificationData = this.notifications.get(notificationId);
        if (!notificationData) return;

        const messageElement = notificationData.element.querySelector('.notification-message');
        if (messageElement) {
            messageElement.textContent = message;
        }
    }

    /**
     * 完成AI通知
     */
    completeAiNotification(notificationId, message, isSuccess = true) {
        const notificationData = this.notifications.get(notificationId);
        if (!notificationData) return;

        // 停止计时器
        if (notificationData.timerInterval) {
            clearInterval(notificationData.timerInterval);
        }

        const element = notificationData.element;

        // 更新样式
        element.classList.remove('ai-progress');
        element.classList.add(isSuccess ? 'success' : 'error');

        // 更新图标
        const iconContainer = element.querySelector('.ai-progress-icon');
        if (iconContainer) {
            iconContainer.innerHTML = `<i class="fas ${isSuccess ? 'fa-check-circle' : 'fa-times-circle'}"></i>`;
            iconContainer.classList.add('completed');
        }

        // 更新消息
        const messageElement = element.querySelector('.notification-message');
        if (messageElement) {
            messageElement.textContent = message;
        }

        // 更新状态
        const statusElement = element.querySelector('.ai-status');
        if (statusElement) {
            statusElement.textContent = isSuccess ? '完成' : '失败';
        }

        // 更新进度条到100%
        const progressBar = element.querySelector('.ai-progress-bar');
        if (progressBar) {
            progressBar.style.width = '100%';
            progressBar.style.backgroundColor = isSuccess ? '#10b981' : '#ef4444';
        }

        // 3秒后自动关闭
        setTimeout(() => {
            this.remove(notificationId);
        }, 3000);
    }

    /**
     * 移除最旧的通知
     */
    removeOldestNotification() {
        let oldestNotificationId = null;
        let oldestTime = Date.now();

        for (const [id, data] of this.notifications) {
            if (data.createdAt < oldestTime) {
                oldestTime = data.createdAt;
                oldestNotificationId = id;
            }
        }

        if (oldestNotificationId) {
            this.remove(oldestNotificationId);
        }
    }

    /**
     * 队列通知
     */
    queueNotification(notificationData) {
        this.notificationQueue.push(notificationData);

        // 限制队列大小
        if (this.notificationQueue.length > 10) {
            this.notificationQueue.shift();
        }
    }

    /**
     * 处理队列中的通知
     */
    processQueue() {
        if (this.notificationQueue.length === 0) return;
        if (this.notifications.size >= this.maxNotifications) return;

        const nextNotification = this.notificationQueue.shift();
        this.create(
            nextNotification.message,
            nextNotification.type,
            nextNotification.duration,
            nextNotification.options
        );
    }

    /**
     * 去重检查
     */
    isDuplicate(message, type) {
        const key = `${type}:${message}`;
        const lastNotification = this.lastNotifications.get(key);

        if (!lastNotification) return false;

        return (Date.now() - lastNotification.timestamp) < this.deduplicationWindow;
    }

    /**
     * 记录通知用于去重
     */
    recordNotification(message, type, notificationId) {
        const key = `${type}:${message}`;
        this.lastNotifications.set(key, {
            notificationId,
            timestamp: Date.now()
        });
    }

    /**
     * 获取现有通知
     */
    getExistingNotification(message, type) {
        const key = `${type}:${message}`;
        const lastNotification = this.lastNotifications.get(key);

        if (lastNotification) {
            const notificationData = this.notifications.get(lastNotification.notificationId);
            if (notificationData) {
                // 重置定时器
                if (notificationData.timer) {
                    clearTimeout(notificationData.timer);
                }
                if (notificationData.duration > 0 && !notificationData.options.persistent) {
                    this.setAutoClose(lastNotification.notificationId, notificationData.duration);
                }
                return notificationData.element;
            }
        }

        return null;
    }

    /**
     * 按组移除通知
     */
    removeByGroup(group) {
        const toRemove = [];
        for (const [id, data] of this.notifications) {
            if (data.options.group === group) {
                toRemove.push(id);
            }
        }
        toRemove.forEach(id => this.remove(id));
    }

    /**
     * 清除所有通知
     */
    clearAll() {
        const notificationIds = Array.from(this.notifications.keys());
        notificationIds.forEach(id => this.remove(id));
        this.notificationQueue.length = 0;
    }

    /**
     * 清除指定类型的通知
     */
    clearByType(type) {
        const toRemove = [];
        for (const [id, data] of this.notifications) {
            if (data.type === type) {
                toRemove.push(id);
            }
        }
        toRemove.forEach(id => this.remove(id));
    }

    /**
     * 更新通知内容
     */
    update(notificationId, updates) {
        const notificationData = this.notifications.get(notificationId);
        if (!notificationData) return false;

        const { element } = notificationData;

        if (updates.message) {
            const messageElement = element.querySelector('.notification-message');
            if (messageElement) {
                messageElement.textContent = updates.message;
            }
        }

        if (updates.type) {
            element.className = `notification ${updates.type}`;
            const iconElement = element.querySelector('.notification-icon');
            if (iconElement) {
                iconElement.className = `fas ${this.getNotificationIcon(updates.type)} mr-3 notification-icon`;
            }
        }

        // 更新存储的数据
        Object.assign(notificationData, updates);

        return true;
    }

    /**
     * 获取通知图标
     */
    getNotificationIcon(type) {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle',
            validation: 'fa-shield-alt',
            network: 'fa-wifi',
            database: 'fa-database',
            auth: 'fa-user-shield',
            permission: 'fa-lock',
            loading: 'fa-spinner fa-spin',
            saving: 'fa-save',
            uploading: 'fa-upload',
            downloading: 'fa-download',
            searching: 'fa-search',
            processing: 'fa-cogs fa-spin',
            complete: 'fa-check-double',
            failed: 'fa-times-circle',
            pending: 'fa-clock',
            question: 'fa-question-circle',
            help: 'fa-question-circle',
            tip: 'fa-lightbulb',
            alert: 'fa-bell',
            critical: 'fa-exclamation-triangle',
            maintenance: 'fa-tools',
            update: 'fa-sync-alt',
            backup: 'fa-archive',
            security: 'fa-shield-alt',
            appointment: 'fa-calendar-check',
            medical: 'fa-stethoscope'
        };
        return icons[type] || icons.info;
    }

    /**
     * 生成唯一ID
     */
    generateId() {
        return 'notification_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * 启动清理定时器
     */
    startCleanupTimer() {
        setInterval(() => {
            this.cleanup();
        }, this.cleanupInterval);
    }

    /**
     * 清理过期的去重记录和残留通知
     */
    cleanup() {
        const now = Date.now();
        const toDelete = [];

        // 清理去重记录
        for (const [key, data] of this.lastNotifications) {
            if (now - data.timestamp > this.deduplicationWindow * 10) {
                toDelete.push(key);
            }
        }
        toDelete.forEach(key => this.lastNotifications.delete(key));

        // 清理超时的持久化通知（双重保险）
        const notificationsToRemove = [];
        for (const [id, data] of this.notifications) {
            // 如果通知存在超过2分钟，强制移除
            if (now - data.createdAt > 120000) {
                notificationsToRemove.push(id);
            }
        }
        notificationsToRemove.forEach(id => {
            console.warn(`清理残留通知: ${id}`);
            this.remove(id);
        });

        // 清理孤立的DOM元素
        this.cleanupOrphanedElements();
    }

    /**
     * 清理孤立的DOM元素
     */
    cleanupOrphanedElements() {
        const container = document.getElementById('notification-container');
        if (!container) return;

        const domNotifications = container.querySelectorAll('.notification');
        domNotifications.forEach(element => {
            const notificationId = element.dataset.notificationId;
            if (notificationId && !this.notifications.has(notificationId)) {
                console.warn(`清理孤立通知元素: ${notificationId}`);
                element.remove();
            }
        });
    }

    /**
     * 获取统计信息
     */
    getStats() {
        return {
            activeNotifications: this.notifications.size,
            queuedNotifications: this.notificationQueue.length,
            maxNotifications: this.maxNotifications,
            deduplicationRecords: this.lastNotifications.size
        };
    }

    /**
     * 设置配置
     */
    setConfig(config) {
        if (config.maxNotifications !== undefined) {
            this.maxNotifications = Math.max(1, config.maxNotifications);
        }
        if (config.deduplicationEnabled !== undefined) {
            this.deduplicationEnabled = config.deduplicationEnabled;
        }
        if (config.deduplicationWindow !== undefined) {
            this.deduplicationWindow = Math.max(100, config.deduplicationWindow);
        }
    }
}

// 创建全局实例
const notificationManager = new NotificationManager();

// 增强版 NotificationHelper，使用新的通知管理器
const EnhancedNotificationHelper = {
    // 基础通知方法
    success: (message, title = '操作成功', options = {}) => {
        return notificationManager.create(message, 'success', 3000, { title, ...options });
    },

    error: (message, title = '操作失败', options = {}) => {
        return notificationManager.create(message, 'error', 5000, { title, persistent: true, ...options });
    },

    warning: (message, title = '注意', options = {}) => {
        return notificationManager.create(message, 'warning', 4000, { title, ...options });
    },

    info: (message, title = '提示', options = {}) => {
        return notificationManager.create(message, 'info', 3000, { title, ...options });
    },

    // 网络错误
    networkError: (message, actionCallback = null) => {
        return notificationManager.create(message, 'network', 6000, {
            title: '网络连接错误',
            actionText: '重试',
            actionCallback,
            persistent: true
        });
    },

    // 数据库错误
    databaseError: (message) => {
        return notificationManager.create(message, 'database', 8000, {
            title: '数据库错误',
            persistent: true
        });
    },

    // 权限错误
    permissionError: (message) => {
        return notificationManager.create(message, 'permission', 6000, {
            title: '权限不足',
            persistent: true
        });
    },

    // 验证错误
    validationError: (message) => {
        return notificationManager.create(message, 'validation', 4000, {
            title: '数据验证失败'
        });
    },

    // 加载中（支持更新）
    loading: (message = '正在处理，请稍候...', options = {}) => {
        return notificationManager.create(message, 'loading', 0, {
            title: '加载中',
            persistent: true,
            group: 'loading',
            ...options
        });
    },

    // 保存中
    saving: (message = '正在保存数据...', options = {}) => {
        return notificationManager.create(message, 'saving', 0, {
            title: '保存中',
            persistent: true,
            group: 'saving',
            ...options
        });
    },

    // 搜索中
    searching: (message = '正在搜索...', options = {}) => {
        return notificationManager.create(message, 'searching', 0, {
            title: '搜索中',
            persistent: true,
            group: 'searching',
            ...options
        });
    },

    // 处理中（支持更新）
    processing: (message = '正在处理，请稍候...', options = {}) => {
        return notificationManager.create(message, 'processing', 0, {
            title: '处理中',
            persistent: true,
            group: 'processing',
            ...options
        });
    },

    // 完成
    complete: (message, title = '操作完成', options = {}) => {
        return notificationManager.create(message, 'complete', 3000, { title, ...options });
    },

    // 医疗相关
    medical: (message, title = '医疗信息', options = {}) => {
        return notificationManager.create(message, 'medical', 4000, { title, ...options });
    },

    // 预约相关
    appointment: (message, title = '预约信息', options = {}) => {
        return notificationManager.create(message, 'appointment', 4000, { title, ...options });
    },

    // 提示
    tip: (message, title = '小提示', options = {}) => {
        return notificationManager.create(message, 'tip', 4000, { title, ...options });
    },

    // 帮助
    help: (message, actionCallback = null) => {
        return notificationManager.create(message, 'help', 6000, {
            title: '帮助信息',
            actionText: '查看详情',
            actionCallback
        });
    },

    // AI通信进度通知（带实时计时器）
    aiProgress: (message, options = {}) => {
        return notificationManager.createAiProgressNotification(message, options);
    },

    // 清除AI通信通知
    clearAiProgress: () => {
        notificationManager.removeByGroup('ai-communication');
    },

    // 确认对话框（保持原有实现）
    confirm: (message, onConfirm, onCancel = null) => {
        return showConfirm(message, onConfirm, onCancel);
    },

    // 数据加载错误
    dataLoadError: (message, title = '数据加载失败') => {
        return notificationManager.create(message, 'error', 5000, { title, persistent: true });
    },

    // 更新现有通知
    updateLoading: (message, options = {}) => {
        const loadingNotifications = Array.from(notificationManager.notifications.values())
            .filter(n => n.options.group === 'loading');

        if (loadingNotifications.length > 0) {
            const oldestLoading = loadingNotifications[0];
            return notificationManager.update(
                Array.from(notificationManager.notifications.keys()).find(id =>
                    notificationManager.notifications.get(id) === oldestLoading
                ),
                { message }
            );
        }

        return notificationManager.create(message, 'loading', 0, {
            title: '加载中',
            persistent: true,
            group: 'loading',
            ...options
        });
    },

    // 清除方法
    clearLoading: () => {
        notificationManager.removeByGroup('loading');
    },

    clearSaving: () => {
        notificationManager.removeByGroup('saving');
    },

    clearSearching: () => {
        notificationManager.removeByGroup('searching');
    },

    clearProcessing: () => {
        notificationManager.removeByGroup('processing');
    },

    clearAll: () => {
        notificationManager.clearAll();
    },

    // 工具方法
    getStats: () => {
        return notificationManager.getStats();
    },

    setConfig: (config) => {
        notificationManager.setConfig(config);
    }
};

// 导出到全局
window.NotificationManager = NotificationManager;
window.notificationManager = notificationManager;
window.EnhancedNotificationHelper = EnhancedNotificationHelper;