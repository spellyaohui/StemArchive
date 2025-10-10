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
            timer: null
        });

        // 记录用于去重
        this.recordNotification(message, type, notificationId);

        // 设置自动关闭
        if (duration > 0 && !options.persistent) {
            this.setAutoClose(notificationId, duration);
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
        notification.className = `notification ${type}`;
        notification.dataset.notificationId = notificationId;
        if (group) notification.dataset.group = group;

        // 构建标题
        const titleHtml = title ? `<div class="notification-title font-bold text-sm mb-1">${title}</div>` : '';

        // 构建进度条
        const progressHtml = showProgress ? `
            <div class="notification-progress">
                <div class="notification-progress-bar" style="animation-duration: ${duration}ms"></div>
            </div>
        ` : '';

        // 构建操作按钮
        const actionHtml = actionText ? `
            <button class="notification-action-btn ml-3 px-2 py-1 text-xs bg-white bg-opacity-20 rounded hover:bg-opacity-30 transition-colors">
                ${actionText}
            </button>
        ` : '';

        notification.innerHTML = `
            <div class="notification-content">
                ${titleHtml}
                <div class="notification-body">
                    <i class="fas ${this.getNotificationIcon(type)} notification-icon"></i>
                    <div class="notification-message-wrapper">
                        <div class="notification-message">${message}</div>
                    </div>
                    <div class="notification-actions">
                        ${actionHtml}
                        <button class="notification-close-btn">
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

        // 显示动画
        requestAnimationFrame(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        });

        // 处理容器中的通知位置调整
        this.adjustNotificationPositions();
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

        const { element, timer } = notificationData;

        // 清除定时器
        if (timer) {
            clearTimeout(timer);
        }

        // 移除动画
        element.style.opacity = '0';
        element.style.transform = 'translateX(100%)';

        // 延迟移除DOM元素
        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
            this.adjustNotificationPositions();
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
     * 清理过期的去重记录
     */
    cleanup() {
        const now = Date.now();
        const toDelete = [];

        for (const [key, data] of this.lastNotifications) {
            if (now - data.timestamp > this.deduplicationWindow * 10) {
                toDelete.push(key);
            }
        }

        toDelete.forEach(key => this.lastNotifications.delete(key));
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

// 添加必要的CSS样式
const notificationStyles = `
    <style>
        #notification-container {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 2000;
            pointer-events: none;
            display: flex;
            flex-direction: column-reverse;
            align-items: flex-end;
            max-width: 450px;
            width: 100%;
        }

        .notification {
            position: relative;
            margin-bottom: 10px;
            pointer-events: auto;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
            backdrop-filter: blur(10px);
            border-radius: 0.5rem;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
            max-width: 450px;
            min-width: 300px;
            width: 100%;
            padding: 1rem 1.5rem;
            box-sizing: border-box;
        }

        .notification-content {
            display: flex;
            flex-direction: column;
            width: 100%;
        }

        .notification-title {
            font-weight: 600;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            opacity: 0.9;
            margin-bottom: 0.5rem;
        }

        .notification-body {
            display: flex;
            align-items: flex-start;
            gap: 0.75rem;
            width: 100%;
        }

        .notification-icon {
            font-size: 1.2rem;
            width: 24px;
            text-align: center;
            flex-shrink: 0;
            margin-top: 0.1rem;
        }

        .notification-message-wrapper {
            flex: 1;
            min-width: 0;
        }

        .notification-message {
            font-size: 0.95rem;
            line-height: 1.4;
            word-wrap: break-word;
            word-break: break-word;
        }

        .notification-actions {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            flex-shrink: 0;
        }

        .notification-action-btn {
            background: rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 4px;
            padding: 4px 8px;
            font-size: 0.75rem;
            cursor: pointer;
            transition: all 0.2s ease;
            white-space: nowrap;
            color: white;
        }

        .notification-action-btn:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: translateY(-1px);
        }

        .notification-close-btn {
            background: rgba(255, 255, 255, 0.2);
            border: none;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s ease;
            font-size: 0.8rem;
            color: white;
        }

        .notification-close-btn:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: scale(1.1);
        }

        .notification-progress {
            position: absolute;
            bottom: 0;
            left: 0;
            height: 3px;
            width: 100%;
            background-color: rgba(255, 255, 255, 0.2);
            border-radius: 0 0 0.5rem 0.5rem;
            overflow: hidden;
        }

        .notification-progress-bar {
            height: 100%;
            background-color: rgba(255, 255, 255, 0.8);
            width: 100%;
            animation: progress-countdown linear;
            transform-origin: left;
        }

        @keyframes progress-countdown {
            from {
                transform: scaleX(1);
            }
            to {
                transform: scaleX(0);
            }
        }

        /* 响应式设计 */
        @media (max-width: 640px) {
            #notification-container {
                top: 10px;
                right: 10px;
                left: 10px;
                max-width: none;
            }

            .notification {
                min-width: auto;
                padding: 0.75rem 1rem;
            }

            .notification-body {
                gap: 0.5rem;
            }

            .notification-icon {
                font-size: 1rem;
                width: 20px;
            }

            .notification-message {
                font-size: 0.9rem;
            }
        }

        /* 确保不同通知类型的背景色正确应用 */
        .notification.success {
            background: linear-gradient(135deg, #10b981, #059669);
        }

        .notification.error {
            background: linear-gradient(135deg, #ef4444, #dc2626);
        }

        .notification.warning {
            background: linear-gradient(135deg, #f59e0b, #d97706);
        }

        .notification.info {
            background: linear-gradient(135deg, #06b6d4, #0891b2);
        }

        .notification.loading {
            background: linear-gradient(135deg, #06b6d4, #0891b2);
        }

        .notification.processing {
            background: linear-gradient(135deg, #f59e0b, #d97706);
        }

        .notification.saving {
            background: linear-gradient(135deg, #10b981, #059669);
        }

        .notification.searching {
            background: linear-gradient(135deg, #06b6d4, #0891b2);
        }

        .notification.validation {
            background: linear-gradient(135deg, #8b5cf6, #7c3aed);
        }

        .notification.network {
            background: linear-gradient(135deg, #3b82f6, #2563eb);
        }

        .notification.database {
            background: linear-gradient(135deg, #ef4444, #dc2626);
        }

        .notification.permission {
            background: linear-gradient(135deg, #6b7280, #4b5563);
        }

        .notification.complete {
            background: linear-gradient(135deg, #10b981, #059669);
        }

        .notification.failed {
            background: linear-gradient(135deg, #ef4444, #dc2626);
        }

        .notification.medical {
            background: linear-gradient(135deg, #ef4444, #dc2626);
        }

        .notification.appointment {
            background: linear-gradient(135deg, #10b981, #059669);
        }

        .notification.help {
            background: linear-gradient(135deg, #06b6d4, #0891b2);
        }

        .notification.tip {
            background: linear-gradient(135deg, #f59e0b, #d97706);
        }
    </style>
`;

// 注入样式到页面
if (document.head) {
    document.head.insertAdjacentHTML('beforeend', notificationStyles);
} else {
    document.addEventListener('DOMContentLoaded', () => {
        document.head.insertAdjacentHTML('beforeend', notificationStyles);
    });
}