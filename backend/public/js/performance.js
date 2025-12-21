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
        // 使用 DOMContentLoaded 测量 DOM 解析完成时间（更准确反映页面可交互时间）
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                const domLoadTime = performance.now();
                console.log(`📊 DOM 加载时间: ${domLoadTime.toFixed(2)}ms`);
            });
        }

        // 使用 load 事件测量完整页面加载时间（包括所有资源）
        window.addEventListener('load', () => {
            // 使用 Performance API 获取更准确的时间
            const perfEntries = performance.getEntriesByType('navigation');
            if (perfEntries.length > 0) {
                const navEntry = perfEntries[0];
                const domContentLoaded = navEntry.domContentLoadedEventEnd - navEntry.startTime;
                const loadComplete = navEntry.loadEventEnd - navEntry.startTime;
                
                console.log(`📊 DOM 解析完成: ${domContentLoaded.toFixed(2)}ms`);
                console.log(`📊 页面完全加载: ${loadComplete.toFixed(2)}ms`);
                
                // 只有当 DOM 解析时间过长时才警告
                if (domContentLoaded > 2000) {
                    console.warn('⚠️ DOM 解析时间较长，建议优化');
                }
            } else {
                // 降级方案
                const loadTime = performance.now();
                console.log(`📊 页面加载时间: ${loadTime.toFixed(2)}ms`);
                
                if (loadTime > 2000) {
                    console.warn('⚠️ 页面加载时间较长，建议优化');
                }
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