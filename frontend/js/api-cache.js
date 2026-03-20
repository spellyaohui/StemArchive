/**
 * API缓存优化模块
 * 减少重复的API调用，提高页面响应速度
 */

class APICache {
    constructor() {
        this.cache = new Map();
        this.ongoingRequests = new Map(); // 防止重复请求
        this.defaultTTL = 5 * 60 * 1000; // 5分钟缓存
        this.hitCount = 0;
        this.missCount = 0;
    }

    // 构建完整URL（包含排序后的查询参数，保证缓存键稳定）
    buildUrl(url, params = {}) {
        const entries = Object.entries(params || {})
            .filter(([, value]) => value !== undefined && value !== null && value !== '');

        if (entries.length === 0) {
            return url;
        }

        const searchParams = new URLSearchParams();
        entries
            .sort(([a], [b]) => a.localeCompare(b))
            .forEach(([key, value]) => {
                if (Array.isArray(value)) {
                    value.forEach(item => searchParams.append(key, item));
                    return;
                }
                searchParams.append(key, String(value));
            });

        const joiner = url.includes('?') ? '&' : '?';
        return `${url}${joiner}${searchParams.toString()}`;
    }

    // 生成缓存键
    generateKey(url) {
        return url;
    }

    // 检查缓存是否有效
    isValid(cacheItem) {
        return cacheItem && Date.now() - cacheItem.timestamp < cacheItem.ttl;
    }

    // 获取缓存数据
    get(url, params = {}) {
        const requestUrl = this.buildUrl(url, params);
        const key = this.generateKey(requestUrl);
        const cacheItem = this.cache.get(key);

        if (this.isValid(cacheItem)) {
            this.hitCount++;
            console.log(`📦 从缓存获取: ${requestUrl}`);
            return cacheItem.data;
        }

        this.missCount++;
        if (cacheItem) {
            this.cache.delete(key);
        }
        return null;
    }

    // 设置缓存
    set(url, data, ttl = this.defaultTTL, params = {}) {
        const requestUrl = this.buildUrl(url, params);
        const key = this.generateKey(requestUrl);
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl
        });
        console.log(`💾 缓存数据: ${requestUrl} (TTL: ${ttl/1000}s)`);
    }

    // 带缓存的请求方法
    async cachedFetch(url, options = {}, ttl = this.defaultTTL) {
        const params = options.params || {};
        const requestUrl = this.buildUrl(url, params);
        const key = this.generateKey(requestUrl);
        const requestOptions = { ...options };
        delete requestOptions.params;

        // 检查缓存
        const cachedData = this.get(url, params);
        if (cachedData) {
            return cachedData;
        }

        // 检查是否有正在进行的相同请求
        if (this.ongoingRequests.has(key)) {
            console.log(`⏳ 等待正在进行的请求: ${requestUrl}`);
            return await this.ongoingRequests.get(key);
        }

        // 发起新请求
        console.log(`🌐 发起新请求: ${requestUrl}`);
        const requestPromise = this.makeRequest(requestUrl, requestOptions, ttl, params);
        this.ongoingRequests.set(key, requestPromise);

        try {
            const result = await requestPromise;
            return result;
        } finally {
            this.ongoingRequests.delete(key);
        }
    }

    // 实际请求方法
    async makeRequest(url, options, ttl, params) {
        const response = await fetch(url, options);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // 只缓存成功的响应
        if (data.status === 'Success') {
            this.set(url, data, ttl, params);
        }

        return data;
    }

    // 清除特定缓存
    clear(url, params = {}) {
        const requestUrl = this.buildUrl(url, params);
        const key = this.generateKey(requestUrl);
        this.cache.delete(key);
        console.log(`🗑️ 清除缓存: ${requestUrl}`);
    }

    // 清除所有缓存
    clearAll() {
        this.cache.clear();
        this.ongoingRequests.clear();
        console.log('🗑️ 清除所有缓存');
    }

    // 清除过期缓存
    cleanup() {
        const now = Date.now();
        for (const [key, cacheItem] of this.cache.entries()) {
            if (now - cacheItem.timestamp >= cacheItem.ttl) {
                this.cache.delete(key);
            }
        }
    }

    // 获取缓存统计
    getStats() {
        const total = this.hitCount + this.missCount;
        return {
            cacheSize: this.cache.size,
            ongoingRequests: this.ongoingRequests.size,
            hitCount: this.hitCount,
            missCount: this.missCount,
            hitRate: total > 0 ? this.hitCount / total : 0
        };
    }
}

// 优化后的API包装器
class OptimizedAPI {
    constructor() {
        this.cache = new APICache();
        this.setupPeriodicCleanup();
    }

    setupPeriodicCleanup() {
        // 每分钟清理一次过期缓存
        setInterval(() => {
            this.cache.cleanup();
        }, 60 * 1000);
    }

    // 获取统计数据 - 短期缓存
    async getStats(type = 'dashboard') {
        const ttl = 30 * 1000; // 30秒缓存
        const baseUrl = window.CONFIG?.api?.baseURL || '/api';
        return await this.cache.cachedFetch(
            `${baseUrl}/statistics/${type}`,
            { method: 'GET' },
            ttl
        );
    }

    // 获取科室数据 - 长期缓存
    async getDepartments(type = null) {
        const ttl = 10 * 60 * 1000; // 10分钟缓存
        const baseUrl = window.CONFIG?.api?.baseURL || '/api';
        const url = type ? `${baseUrl}/departments?type=${type}` : `${baseUrl}/departments`;
        return await this.cache.cachedFetch(url, { method: 'GET' }, ttl);
    }

    // 获取客户数据 - 短期缓存
    async getCustomers(page = 1, limit = 10, search = '') {
        const ttl = 60 * 1000; // 1分钟缓存
        const baseUrl = window.CONFIG?.api?.baseURL || '/api';
        const params = { page, limit, search };
        return await this.cache.cachedFetch(
            `${baseUrl}/customers`,
            {
                method: 'GET',
                params
            },
            ttl
        );
    }

    // 获取今日新增体检检客 - 短期缓存
    async getTodayHealthChecks() {
        const ttl = 60 * 1000; // 1分钟缓存
        const baseUrl = window.CONFIG?.api?.baseURL || '/api';
        return await this.cache.cachedFetch(
            `${baseUrl}/customers/today-health-checks`,
            { method: 'GET' },
            ttl
        );
    }

    // 获取今日排期 - 短期缓存
    async getTodaySchedules() {
        const ttl = 30 * 1000; // 30秒缓存
        const baseUrl = window.CONFIG?.api?.baseURL || '/api';
        return await this.cache.cachedFetch(
            `${baseUrl}/stem-cell/schedules/today`,
            { method: 'GET' },
            ttl
        );
    }

    // 令牌验证 - 短期缓存，防止页面加载时重复验证
    async verifyToken(token) {
        const ttl = 10 * 1000; // 10秒缓存，足够页面初始化完成
        const apiUrl = `${window.CONFIG?.api?.baseURL || '/api'}/auth/verify`;
        return await this.cache.cachedFetch(
            apiUrl,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            },
            ttl
        );
    }

    // 清除特定缓存
    invalidateCache(pattern) {
        for (const [key] of this.cache.cache.entries()) {
            if (key.includes(pattern)) {
                this.cache.cache.delete(key);
            }
        }
        console.log(`🗑️ 清除匹配缓存: ${pattern}`);
    }
}

// 创建全局API缓存实例
window.optimizedAPI = new OptimizedAPI();

// 导出工具函数
window.APICache = APICache;
