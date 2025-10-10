/**
 * 性能优化工具
 * 提供页面加载性能优化功能
 */

class PerformanceOptimizer {
    constructor() {
        this.init();
    }

    init() {
        this.addLoadingIndicator();
        this.optimizeResourceLoading();
        this.addPageLoadMetrics();
    }

    // 添加加载指示器
    addLoadingIndicator() {
        // 检查是否已存在加载指示器
        if (document.getElementById('loadingIndicator')) {
            return;
        }

        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'loadingIndicator';
        loadingDiv.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 4px;
                background: linear-gradient(90deg, #3B82F6, #8B5CF6, #EC4899);
                background-size: 200% 100%;
                animation: loading 1.5s ease-in-out infinite;
                z-index: 9999;
            "></div>
            <style>
                @keyframes loading {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
            </style>
        `;
        document.body.appendChild(loadingDiv);

        // 页面加载完成后隐藏加载指示器
        window.addEventListener('load', () => {
            setTimeout(() => {
                const indicator = document.getElementById('loadingIndicator');
                if (indicator) {
                    indicator.style.opacity = '0';
                    indicator.style.transition = 'opacity 0.3s ease-out';
                    setTimeout(() => {
                        if (indicator.parentNode) {
                            indicator.parentNode.removeChild(indicator);
                        }
                    }, 300);
                }
            }, 500);
        });
    }

    // 优化资源加载
    optimizeResourceLoading() {
        // 预加载常用页面
        const commonPages = ['dashboard.html', 'customers.html', 'health-data.html'];
        commonPages.forEach(page => {
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = page;
            document.head.appendChild(link);
        });

        // 为CSS资源添加preload
        const cssResources = [
            'css/tailwind.css',
            'css/main.css',
            'css/fontawesome.min.css'
        ];

        cssResources.forEach(css => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'style';
            link.href = css;
            link.onload = function() { this.rel = 'stylesheet'; };
            document.head.appendChild(link);
        });
    }

    // 添加页面加载性能监控
    addPageLoadMetrics() {
        window.addEventListener('load', () => {
            const loadTime = performance.now();
            console.log(`📊 页面加载时间: ${loadTime.toFixed(2)}ms`);

            // 如果加载时间过长，显示警告
            if (loadTime > 2000) {
                console.warn('⚠️ 页面加载时间较长，建议优化');
            }
        });
    }

    // 延迟加载非关键JavaScript
    static loadScriptDeferred(src, callback) {
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.defer = true;

        if (callback) {
            script.onload = callback;
        }

        document.head.appendChild(script);
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
}

// 初始化性能优化器
const performanceOptimizer = new PerformanceOptimizer();

// 导出到全局
window.PerformanceOptimizer = PerformanceOptimizer;