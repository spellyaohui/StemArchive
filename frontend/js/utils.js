// 工具函数库

// 工具类
class Utils {
    // 格式化日期
    static formatDate(date, format = 'YYYY-MM-DD') {
        if (!date) return '';

        const d = new Date(date);
        if (isNaN(d.getTime())) return '';

        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');

        return format
            .replace('YYYY', year)
            .replace('MM', month)
            .replace('DD', day)
            .replace('HH', hours)
            .replace('mm', minutes)
            .replace('ss', seconds);
    }

    // 格式化数字
    static formatNumber(num, decimals = 0) {
        if (num === null || num === undefined) return '0';
        return parseFloat(num).toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    // 格式化年龄
    static formatAge(birthDate) {
        if (!birthDate) return '';

        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }

        return `${age}岁`;
    }

    // 计算BMI
    static calculateBMI(height, weight) {
        if (!height || !weight) return null;
        const heightInMeters = height / 100;
        return (weight / (heightInMeters * heightInMeters)).toFixed(2);
    }

    // 格式化BMI
    static formatBMI(bmi) {
        if (!bmi) return '';

        let category = '';
        let color = '';

        if (bmi < 18.5) {
            category = '偏瘦';
            color = 'text-blue-600';
        } else if (bmi < 24) {
            category = '正常';
            color = 'text-green-600';
        } else if (bmi < 28) {
            category = '偏胖';
            color = 'text-yellow-600';
        } else {
            category = '肥胖';
            color = 'text-red-600';
        }

        return `<span class="${color}">${bmi} (${category})</span>`;
    }

    // 脱敏处理身份证号
    static maskIdCard(idCard) {
        if (!idCard || idCard.length < 8) return idCard;
        return idCard.substring(0, 4) + '****' + idCard.substring(idCard.length - 4);
    }

    // 脱敏处理手机号
    static maskPhone(phone) {
        if (!phone || phone.length < 7) return phone;
        return phone.substring(0, 3) + '****' + phone.substring(phone.length - 4);
    }

    // 生成随机ID
    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // 深拷贝对象
    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));

        const cloned = {};
        for (let key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = this.deepClone(obj[key]);
            }
        }
        return cloned;
    }

    // 防抖函数
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // 节流函数
    static throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // 验证身份证号
    static validateIdCard(idCard) {
        const regex15 = /^\d{15}$/;
        const regex18 = /^\d{17}[\dXx]$/;
        return regex15.test(idCard) || regex18.test(idCard);
    }

    // 验证手机号
    static validatePhone(phone) {
        const regex = /^[0-9]{11}$/;
        return regex.test(phone);
    }

    // 验证邮箱
    static validateEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }

    // 获取文件扩展名
    static getFileExtension(filename) {
        return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
    }

    // 格式化文件大小
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // 获取状态徽章HTML
    static getStatusBadge(status, type = 'default') {
        const statusConfig = {
            default: {
                Active: { class: 'badge-success', text: '正常' },
                Inactive: { class: 'badge-secondary', text: '停用' },
                Pending: { class: 'badge-warning', text: '待处理' },
                Completed: { class: 'badge-success', text: '已完成' },
                Cancelled: { class: 'badge-danger', text: '已取消' }
            },
            treatment: {
                Scheduled: { class: 'badge-info', text: '已排期' },
                InProgress: { class: 'badge-warning', text: '进行中' },
                Completed: { class: 'badge-success', text: '已完成' },
                Cancelled: { class: 'badge-danger', text: '已取消' },
                Rescheduled: { class: 'badge-warning', text: '已改期' }
            }
        };

        const config = statusConfig[type] || statusConfig.default;
        const statusInfo = config[status] || { class: 'badge-secondary', text: status };

        return `<span class="badge ${statusInfo.class}">${statusInfo.text}</span>`;
    }

    // 导出数据到CSV
    static exportToCSV(data, filename = 'export.csv') {
        const csv = this.convertToCSV(data);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');

        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    // 转换数据为CSV格式
    static convertToCSV(data) {
        if (!data || data.length === 0) return '';

        const headers = Object.keys(data[0]);
        const csvHeaders = headers.join(',');

        const csvRows = data.map(row => {
            return headers.map(header => {
                const value = row[header];
                return typeof value === 'string' && value.includes(',')
                    ? `"${value}"`
                    : value;
            }).join(',');
        });

        return [csvHeaders, ...csvRows].join('\n');
    }

    // 复制到剪贴板
    static async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            console.error('复制失败:', err);
            return false;
        }
    }

    // 生成颜色
    static generateColor() {
        const colors = [
            '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
            '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#6366f1'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    // 本地存储操作
    static storage = {
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (error) {
                console.error('存储失败:', error);
                return false;
            }
        },

        get(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (error) {
                console.error('读取失败:', error);
                return defaultValue;
            }
        },

        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (error) {
                console.error('删除失败:', error);
                return false;
            }
        },

        clear() {
            try {
                localStorage.clear();
                return true;
            } catch (error) {
                console.error('清空失败:', error);
                return false;
            }
        }
    };
}

// 显示通知（增强版，兼容旧版本调用）
function showNotification(messageOrType, typeOrMessage, durationOrOptions = 3000, options = {}) {
    // 如果新的通知管理器可用，优先使用
    if (window.notificationManager) {
        // 兼容旧版本调用：showNotification(type, message)
        if (typeof messageOrType === 'string' && typeof typeOrMessage === 'string' &&
            ['success', 'error', 'warning', 'info'].includes(messageOrType)) {
            // 这是旧版本调用方式
            const type = messageOrType;
            const message = typeOrMessage;
            const duration = typeof durationOrOptions === 'number' ? durationOrOptions : 3000;
            const finalOptions = typeof durationOrOptions === 'object' ? durationOrOptions : options;

            return window.notificationManager.create(message, type, duration, finalOptions);
        } else {
            // 这是新版本调用方式
            const message = messageOrType;
            const type = typeOrMessage || 'info';
            const duration = typeof durationOrOptions === 'number' ? durationOrOptions : 3000;
            const finalOptions = typeof durationOrOptions === 'object' ? durationOrOptions : options;

            return window.notificationManager.create(message, type, duration, finalOptions);
        }
    }

    // 回退到原始实现
    return createNotification(messageOrType, typeOrMessage, durationOrOptions, options);
}

// 创建通知的核心函数
function createNotification(message, type = 'info', duration = 3000, options = {}) {
    const {
        title = null,
        actionText = null,
        actionCallback = null,
        persistent = false
    } = options;

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;

    // 确保通知容器存在
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.style.cssText = `
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
        `;
        document.body.appendChild(container);
    }

    // 设置基础样式
    notification.style.cssText = `
        position: relative;
        margin-bottom: 10px;
        pointer-events: auto;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
        border-radius: 0.5rem;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        max-width: 450px;
        min-width: 300px;
        width: 100%;
        padding: 1rem 1.5rem;
        box-sizing: border-box;
        max-height: 250px;
        overflow: hidden;
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
        color: white;
    `;

    // 根据通知类型设置背景样式
    const typeBackgrounds = {
        success: 'linear-gradient(135deg, #10b981, #059669)',
        error: 'linear-gradient(135deg, #ef4444, #dc2626)',
        warning: 'linear-gradient(135deg, #f59e0b, #d97706)',
        info: 'linear-gradient(135deg, #06b6d4, #0891b2)',
        validation: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
        network: 'linear-gradient(135deg, #3b82f6, #2563eb)',
        database: 'linear-gradient(135deg, #ef4444, #dc2626)',
        auth: 'linear-gradient(135deg, #f59e0b, #d97706)',
        permission: 'linear-gradient(135deg, #6b7280, #4b5563)',
        loading: 'linear-gradient(135deg, #06b6d4, #0891b2)',
        saving: 'linear-gradient(135deg, #10b981, #059669)',
        uploading: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
        downloading: 'linear-gradient(135deg, #3b82f6, #2563eb)',
        searching: 'linear-gradient(135deg, #06b6d4, #0891b2)',
        processing: 'linear-gradient(135deg, #f59e0b, #d97706)',
        complete: 'linear-gradient(135deg, #10b981, #059669)',
        failed: 'linear-gradient(135deg, #ef4444, #dc2626)',
        pending: 'linear-gradient(135deg, #6b7280, #4b5563)',
        question: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
        help: 'linear-gradient(135deg, #06b6d4, #0891b2)',
        tip: 'linear-gradient(135deg, #f59e0b, #d97706)',
        alert: 'linear-gradient(135deg, #ef4444, #dc2626)',
        critical: 'linear-gradient(135deg, #991b1b, #7f1d1d)',
        maintenance: 'linear-gradient(135deg, #6b7280, #4b5563)',
        update: 'linear-gradient(135deg, #06b6d4, #0891b2)',
        backup: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
        security: 'linear-gradient(135deg, #059669, #047857)',
        appointment: 'linear-gradient(135deg, #10b981, #059669)',
        medical: 'linear-gradient(135deg, #ef4444, #dc2626)'
    };

    // 设置背景
    const background = typeBackgrounds[type] || typeBackgrounds.info;
    notification.style.background = background;

    // 构建标题
    const titleHtml = title ? `<div class="notification-title">${title}</div>` : '';

    // 构建操作按钮
    const actionHtml = actionText ? `
        <button class="notification-action-btn">
            ${actionText}
        </button>
    ` : '';

    notification.innerHTML = `
        <div class="notification-content">
            ${titleHtml}
            <div class="notification-body">
                <i class="fas ${getNotificationIcon(type)} notification-icon"></i>
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
        </div>
    `;

    container.appendChild(notification);

    // 显示动画
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
    }, 10);

    // 关闭按钮事件
    const closeBtn = notification.querySelector('.notification-close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            hideNotification(notification);
        });
    }

    // 操作按钮事件
    if (actionCallback && actionText) {
        const actionBtn = notification.querySelector('.notification-action-btn');
        if (actionBtn) {
            actionBtn.addEventListener('click', () => {
                actionCallback();
                hideNotification(notification);
            });
        }
    }

    // 自动关闭（非持久化通知）
    if (!persistent && duration > 0) {
        setTimeout(() => {
            hideNotification(notification);
        }, duration);
    }

    return notification;
}

// 隐藏通知
function hideNotification(notification) {
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 300);
}

// 获取通知图标（增强版）
function getNotificationIcon(type) {
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle',
        // 新增类型
        validation: 'fa-shield-alt',        // 验证相关
        network: 'fa-wifi',                 // 网络相关
        database: 'fa-database',            // 数据库相关
        auth: 'fa-user-shield',             // 认证相关
        permission: 'fa-lock',              // 权限相关
        loading: 'fa-spinner fa-spin',      // 加载中
        saving: 'fa-save',                  // 保存中
        uploading: 'fa-upload',             // 上传中
        downloading: 'fa-download',         // 下载中
        searching: 'fa-search',             // 搜索中
        processing: 'fa-cogs fa-spin',      // 处理中
        complete: 'fa-check-double',        // 完成
        failed: 'fa-times-circle',          // 失败
        pending: 'fa-clock',                // 等待中
        question: 'fa-question-circle',     // 疑问
        help: 'fa-question-circle',         // 帮助
        tip: 'fa-lightbulb',                // 提示
        alert: 'fa-bell',                   // 警报
        critical: 'fa-exclamation-triangle', // 严重错误
        maintenance: 'fa-tools',            // 维护
        update: 'fa-sync-alt',              // 更新
        backup: 'fa-archive',               // 备份
        security: 'fa-shield-alt',          // 安全
        appointment: 'fa-calendar-check',   // 预约
        medical: 'fa-stethoscope'           // 医疗相关
    };
    return icons[type] || icons.info;
}

// 便利的专用通知函数（增强版，支持新通知管理器）
const NotificationHelper = {
    // 成功通知
    success: (message, title = '操作成功', options = {}) => {
        if (window.EnhancedNotificationHelper) {
            return window.EnhancedNotificationHelper.success(message, title, options);
        }
        return showNotification(message, 'success', 3000, { title, ...options });
    },

    // 错误通知
    error: (message, title = '操作失败', options = {}) => {
        if (window.EnhancedNotificationHelper) {
            return window.EnhancedNotificationHelper.error(message, title, options);
        }
        const persistent = options.persistent !== false; // 默认持久化
        return showNotification(message, 'error', persistent ? 0 : 5000, { title, persistent, ...options });
    },

    // 警告通知
    warning: (message, title = '注意', options = {}) => {
        if (window.EnhancedNotificationHelper) {
            return window.EnhancedNotificationHelper.warning(message, title, options);
        }
        return showNotification(message, 'warning', 4000, { title, ...options });
    },

    // 信息通知
    info: (message, title = '提示', options = {}) => {
        if (window.EnhancedNotificationHelper) {
            return window.EnhancedNotificationHelper.info(message, title, options);
        }
        return showNotification(message, 'info', 3000, { title, ...options });
    },

    // 网络错误
    networkError: (message, actionCallback = null) => {
        if (window.EnhancedNotificationHelper) {
            return window.EnhancedNotificationHelper.networkError(message, actionCallback);
        }
        return showNotification(message, 'network', 6000, {
            title: '网络连接错误',
            actionText: '重试',
            actionCallback,
            persistent: true
        });
    },

    // 数据库错误
    databaseError: (message) => {
        if (window.EnhancedNotificationHelper) {
            return window.EnhancedNotificationHelper.databaseError(message);
        }
        return showNotification(message, 'database', 8000, {
            title: '数据库错误',
            persistent: true
        });
    },

    // 权限错误
    permissionError: (message) => {
        if (window.EnhancedNotificationHelper) {
            return window.EnhancedNotificationHelper.permissionError(message);
        }
        return showNotification(message, 'permission', 6000, {
            title: '权限不足',
            persistent: true
        });
    },

    // 验证错误
    validationError: (message) => {
        if (window.EnhancedNotificationHelper) {
            return window.EnhancedNotificationHelper.validationError(message);
        }
        return showNotification(message, 'validation', 4000, {
            title: '数据验证失败'
        });
    },

    // 加载中
    loading: (message = '正在处理，请稍候...', options = {}) => {
        if (window.EnhancedNotificationHelper) {
            return window.EnhancedNotificationHelper.loading(message, options);
        }
        return showNotification(message, 'loading', 0, {
            title: '加载中',
            persistent: true,
            ...options
        });
    },

    // 保存中
    saving: (message = '正在保存数据...', options = {}) => {
        if (window.EnhancedNotificationHelper) {
            return window.EnhancedNotificationHelper.saving(message, options);
        }
        return showNotification(message, 'saving', 0, {
            title: '保存中',
            persistent: true,
            ...options
        });
    },

    // 搜索中
    searching: (message = '正在搜索...', options = {}) => {
        if (window.EnhancedNotificationHelper) {
            return window.EnhancedNotificationHelper.searching(message, options);
        }
        return showNotification(message, 'searching', 0, {
            title: '搜索中',
            persistent: true,
            ...options
        });
    },

    // 处理中（新增）
    processing: (message = '正在处理，请稍候...', options = {}) => {
        if (window.EnhancedNotificationHelper) {
            return window.EnhancedNotificationHelper.processing(message, options);
        }
        return showNotification(message, 'processing', 0, {
            title: '处理中',
            persistent: true,
            ...options
        });
    },

    // 完成
    complete: (message, title = '操作完成', options = {}) => {
        if (window.EnhancedNotificationHelper) {
            return window.EnhancedNotificationHelper.complete(message, title, options);
        }
        return showNotification(message, 'complete', 3000, { title, ...options });
    },

    // 医疗相关
    medical: (message, title = '医疗信息', options = {}) => {
        if (window.EnhancedNotificationHelper) {
            return window.EnhancedNotificationHelper.medical(message, title, options);
        }
        return showNotification(message, 'medical', 4000, { title, ...options });
    },

    // 预约相关
    appointment: (message, title = '预约信息', options = {}) => {
        if (window.EnhancedNotificationHelper) {
            return window.EnhancedNotificationHelper.appointment(message, title, options);
        }
        return showNotification(message, 'appointment', 4000, { title, ...options });
    },

    // 提示
    tip: (message, title = '小提示', options = {}) => {
        if (window.EnhancedNotificationHelper) {
            return window.EnhancedNotificationHelper.tip(message, title, options);
        }
        return showNotification(message, 'tip', 4000, { title, ...options });
    },

    // 帮助
    help: (message, actionCallback = null) => {
        if (window.EnhancedNotificationHelper) {
            return window.EnhancedNotificationHelper.help(message, actionCallback);
        }
        return showNotification(message, 'help', 6000, {
            title: '帮助信息',
            actionText: '查看详情',
            actionCallback
        });
    },

    // 确认对话框
    confirm: (message, onConfirm, onCancel = null) => {
        return showConfirm(message, onConfirm, onCancel);
    },

    // 数据加载错误
    dataLoadError: (message, title = '数据加载失败') => {
        if (window.EnhancedNotificationHelper) {
            return window.EnhancedNotificationHelper.dataLoadError(message, title);
        }
        return showNotification(message, 'error', 5000, { title, persistent: true });
    },

    // 更新加载中通知（新增）
    updateLoading: (message, options = {}) => {
        if (window.EnhancedNotificationHelper) {
            return window.EnhancedNotificationHelper.updateLoading(message, options);
        }
        // 回退方案：清除现有加载通知并创建新的
        this.clearLoading();
        return this.loading(message, options);
    },

    // 清除方法（新增）
    clearLoading: () => {
        if (window.EnhancedNotificationHelper) {
            return window.EnhancedNotificationHelper.clearLoading();
        }
        // 回退方案：清除所有加载类型的通知
        if (window.notificationManager) {
            window.notificationManager.clearByType('loading');
        }
    },

    clearSaving: () => {
        if (window.EnhancedNotificationHelper) {
            return window.EnhancedNotificationHelper.clearSaving();
        }
        if (window.notificationManager) {
            window.notificationManager.clearByType('saving');
        }
    },

    clearSearching: () => {
        if (window.EnhancedNotificationHelper) {
            return window.EnhancedNotificationHelper.clearSearching();
        }
        if (window.notificationManager) {
            window.notificationManager.clearByType('searching');
        }
    },

    clearProcessing: () => {
        if (window.EnhancedNotificationHelper) {
            return window.EnhancedNotificationHelper.clearProcessing();
        }
        if (window.notificationManager) {
            window.notificationManager.clearByType('processing');
        }
    },

    clearAll: () => {
        if (window.EnhancedNotificationHelper) {
            return window.EnhancedNotificationHelper.clearAll();
        }
        if (window.notificationManager) {
            window.notificationManager.clearAll();
        }
    },

    // 获取统计信息（新增）
    getStats: () => {
        if (window.EnhancedNotificationHelper) {
            return window.EnhancedNotificationHelper.getStats();
        }
        if (window.notificationManager) {
            return window.notificationManager.getStats();
        }
        return { activeNotifications: 0, queuedNotifications: 0, maxNotifications: 0, deduplicationRecords: 0 };
    }
};

// 将便利函数添加到全局作用域
Object.assign(window, NotificationHelper);

// 显示确认对话框
function showConfirm(message, onConfirm, onCancel = null) {
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3 class="modal-title">确认操作</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <p>${message}</p>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary cancel-btn">取消</button>
                <button class="btn btn-danger confirm-btn">确认</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // 关闭按钮事件
    modal.querySelector('.modal-close').addEventListener('click', () => {
        hideModal(modal);
        if (onCancel) onCancel();
    });

    modal.querySelector('.cancel-btn').addEventListener('click', () => {
        hideModal(modal);
        if (onCancel) onCancel();
    });

    // 确认按钮事件
    modal.querySelector('.confirm-btn').addEventListener('click', () => {
        hideModal(modal);
        if (onConfirm) onConfirm();
    });

    // 点击背景关闭
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            hideModal(modal);
            if (onCancel) onCancel();
        }
    });

    return modal;
}

// 隐藏模态框
function hideModal(modal) {
    modal.classList.remove('show');
    setTimeout(() => {
        if (modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
    }, 300);
}

// 显示加载状态
function showLoading(element, text = '加载中...') {
    if (typeof element === 'string') {
        element = document.querySelector(element);
    }

    if (!element) return;

    const originalContent = element.innerHTML;
    element.dataset.originalContent = originalContent;
    element.innerHTML = `
        <div class="flex items-center justify-center">
            <div class="loading mr-2"></div>
            <span>${text}</span>
        </div>
    `;
    element.disabled = true;

    return () => hideLoading(element);
}

// 隐藏加载状态
function hideLoading(element) {
    if (typeof element === 'string') {
        element = document.querySelector(element);
    }

    if (!element || !element.dataset.originalContent) return;

    element.innerHTML = element.dataset.originalContent;
    delete element.dataset.originalContent;
    element.disabled = false;
}

// 表单验证
function validateForm(form, rules) {
    const errors = {};

    Object.keys(rules).forEach(fieldName => {
        const field = form.querySelector(`[name="${fieldName}"]`);
        if (!field) return;

        const value = field.value.trim();
        const fieldRules = rules[fieldName];

        fieldRules.forEach(rule => {
            if (rule.required && !value) {
                errors[fieldName] = rule.message || '此字段为必填项';
                return;
            }

            if (value && rule.pattern && !rule.pattern.test(value)) {
                errors[fieldName] = rule.message || '格式不正确';
                return;
            }

            if (value && rule.minLength && value.length < rule.minLength) {
                errors[fieldName] = rule.message || `最少需要${rule.minLength}个字符`;
                return;
            }

            if (value && rule.maxLength && value.length > rule.maxLength) {
                errors[fieldName] = rule.message || `最多允许${rule.maxLength}个字符`;
                return;
            }

            if (value && rule.validator && !rule.validator(value)) {
                errors[fieldName] = rule.message || '验证失败';
                return;
            }
        });
    });

    return errors;
}

// 显示表单错误
function showFormErrors(form, errors) {
    // 清除之前的错误
    form.querySelectorAll('.error-message').forEach(error => {
        error.remove();
    });
    form.querySelectorAll('.form-control.error').forEach(field => {
        field.classList.remove('error');
    });

    // 显示新的错误
    Object.keys(errors).forEach(fieldName => {
        const field = form.querySelector(`[name="${fieldName}"]`);
        if (!field) return;

        field.classList.add('error');

        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.textContent = errors[fieldName];

        field.parentNode.appendChild(errorElement);
    });
}

// 清除表单错误
function clearFormErrors(form) {
    form.querySelectorAll('.error-message').forEach(error => {
        error.remove();
    });
    form.querySelectorAll('.form-control.error').forEach(field => {
        field.classList.remove('error');
    });
}

// 分页组件
class Pagination {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? document.querySelector(container) : container;
        this.currentPage = options.currentPage || 1;
        this.totalPages = options.totalPages || 1;
        this.onPageChange = options.onPageChange || (() => {});
        this.showNumbers = options.showNumbers !== false;
        this.showFirstLast = options.showFirstLast !== false;
        this.maxVisible = options.maxVisible || 7;
    }

    render() {
        if (!this.container) return;

        let html = '<div class="pagination">';

        // 首页按钮
        if (this.showFirstLast && this.totalPages > 1) {
            html += `
                <button class="pagination-btn" ${this.currentPage === 1 ? 'disabled' : ''} data-page="1">
                    <i class="fas fa-angle-double-left"></i>
                </button>
            `;
        }

        // 上一页按钮
        html += `
            <button class="pagination-btn" ${this.currentPage === 1 ? 'disabled' : ''} data-page="${this.currentPage - 1}">
                <i class="fas fa-angle-left"></i>
            </button>
        `;

        // 页码按钮
        if (this.showNumbers && this.totalPages > 1) {
            const pageNumbers = this.getPageNumbers();
            pageNumbers.forEach(page => {
                if (page === '...') {
                    html += '<span class="pagination-ellipsis">...</span>';
                } else {
                    html += `
                        <button class="pagination-btn ${page === this.currentPage ? 'active' : ''}" data-page="${page}">
                            ${page}
                        </button>
                    `;
                }
            });
        }

        // 下一页按钮
        html += `
            <button class="pagination-btn" ${this.currentPage === this.totalPages ? 'disabled' : ''} data-page="${this.currentPage + 1}">
                <i class="fas fa-angle-right"></i>
            </button>
        `;

        // 末页按钮
        if (this.showFirstLast && this.totalPages > 1) {
            html += `
                <button class="pagination-btn" ${this.currentPage === this.totalPages ? 'disabled' : ''} data-page="${this.totalPages}">
                    <i class="fas fa-angle-double-right"></i>
                </button>
            `;
        }

        html += '</div>';

        this.container.innerHTML = html;
        this.bindEvents();
    }

    getPageNumbers() {
        if (this.totalPages <= this.maxVisible) {
            return Array.from({ length: this.totalPages }, (_, i) => i + 1);
        }

        const half = Math.floor(this.maxVisible / 2);
        let start = Math.max(1, this.currentPage - half);
        let end = Math.min(this.totalPages, this.currentPage + half);

        if (start === 1) {
            end = Math.min(this.totalPages, this.maxVisible - 1);
        }
        if (end === this.totalPages) {
            start = Math.max(1, this.totalPages - this.maxVisible + 2);
        }

        const pages = [];
        if (start > 1) {
            pages.push(1);
            if (start > 2) pages.push('...');
        }

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }

        if (end < this.totalPages) {
            if (end < this.totalPages - 1) pages.push('...');
            pages.push(this.totalPages);
        }

        return pages;
    }

    bindEvents() {
        this.container.querySelectorAll('.pagination-btn[data-page]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = parseInt(e.currentTarget.dataset.page);
                if (page !== this.currentPage && page >= 1 && page <= this.totalPages) {
                    this.currentPage = page;
                    this.onPageChange(page);
                    this.render();
                }
            });
        });
    }

    update(currentPage, totalPages) {
        this.currentPage = currentPage;
        this.totalPages = totalPages;
        this.render();
    }
}

// 系统名称管理
class SystemNameManager {
    static getSystemName() {
        return localStorage.getItem('systemName') || '干细胞治疗档案管理系统';
    }

    static setSystemName(systemName) {
        localStorage.setItem('systemName', systemName);
        this.updateAllSystemNames(systemName);
    }

    static updateAllSystemNames(systemName) {
        // 更新页面标题
        const originalTitle = document.title;
        const titleParts = originalTitle.split(' - ');
        if (titleParts.length > 1) {
            titleParts[titleParts.length - 1] = systemName;
            document.title = titleParts.join(' - ');
        } else {
            document.title = `${originalTitle} - ${systemName}`;
        }

        // 更新导航栏标题
        const navTitle = document.querySelector('nav h1');
        if (navTitle) {
            navTitle.textContent = systemName;
        }

        // 更新所有带有data-system-name属性的元素
        const systemNameElements = document.querySelectorAll('[data-system-name]');
        systemNameElements.forEach(element => {
            element.textContent = systemName;
        });
    }

    static initializeSystemName() {
        const systemName = this.getSystemName();
        this.updateAllSystemNames(systemName);
        return systemName;
    }
}

// 页面加载时初始化系统名称（延迟执行，让API数据优先）
document.addEventListener('DOMContentLoaded', () => {
    // 延迟1秒执行，让settings页面的API数据先加载
    setTimeout(() => {
        if (window.SystemNameManager) {
            // 只有在settings页面才检查是否需要初始化
            if (window.location.pathname.includes('settings.html')) {
                // 如果localStorage中没有系统名称，则使用默认值初始化
                if (!localStorage.getItem('systemName')) {
                    window.SystemNameManager.initializeSystemName();
                }
            } else {
                // 其他页面直接初始化
                window.SystemNameManager.initializeSystemName();
            }
        }
    }, 100);
});

// 导出到全局
window.Utils = Utils;
window.showNotification = showNotification;
window.showConfirm = showConfirm;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.validateForm = validateForm;
window.showFormErrors = showFormErrors;
window.clearFormErrors = clearFormErrors;
window.Pagination = Pagination;
window.SystemNameManager = SystemNameManager;