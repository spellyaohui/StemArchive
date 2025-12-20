/**
 * 路径辅助函数
 * 用于处理根目录部署和子目录部署的路径问题
 */

class PathHelper {
    constructor() {
        this.basePath = window.CONFIG?.paths?.basePath || '';
        this.isRootDeployment = window.CONFIG?.paths?.isRootDeployment || false;
    }

    /**
     * 构建完整的相对路径
     * @param {string} path - 相对路径（如 'dashboard.html', 'js/app.js'）
     * @returns {string} 完整路径
     */
    buildPath(path) {
        // 如果是绝对路径或外部链接，直接返回
        if (path.startsWith('http') || path.startsWith('//') || path.startsWith('#')) {
            return path;
        }

        // 如果是根目录部署，直接返回相对路径
        if (this.isRootDeployment) {
            return path;
        }

        // 子目录部署，需要添加基础路径
        return this.basePath + '/' + path;
    }

    /**
     * 构建资源路径（CSS、JS、图片等）
     * @param {string} resourcePath - 资源路径
     * @returns {string} 完整的资源路径
     */
    buildResourcePath(resourcePath) {
        return this.buildPath(resourcePath);
    }

    /**
     * 构建API路径
     * @param {string} endpoint - API端点（如 '/users', '/api/data'）
     * @returns {string} 完整的API路径
     */
    buildAPIPath(endpoint) {
        // API路径通常不需要考虑前端部署路径，直接使用CONFIG.api.baseURL
        if (window.CONFIG?.api?.baseURL) {
            return window.CONFIG.api.baseURL + endpoint;
        }
        return endpoint;
    }

    /**
     * 动态更新页面中的链接和资源引用
     * @param {string} containerSelector - 容器选择器，默认为body
     */
    updatePageLinks(containerSelector = 'body') {
        const container = document.querySelector(containerSelector);
        if (!container) return;

        // 更新所有相对链接
        const links = container.querySelectorAll('a[href]:not([href^="http"]):not([href^="//"]):not([href^="#"])');
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (href) {
                link.setAttribute('href', this.buildPath(href));
            }
        });

        // 更新所有资源引用
        const resources = container.querySelectorAll('link[href]:not([href^="http"]):not([href^="//"]), script[src]:not([src^="http"]):not([src^="//"]), img[src]:not([src^="http"]):not([src^="//"])');
        resources.forEach(resource => {
            const src = resource.getAttribute('href') || resource.getAttribute('src');
            if (src) {
                if (resource.tagName === 'LINK') {
                    resource.setAttribute('href', this.buildResourcePath(src));
                } else {
                    resource.setAttribute('src', this.buildResourcePath(src));
                }
            }
        });
    }

    /**
     * 跳转到指定页面
     * @param {string} path - 目标页面路径
     * @param {boolean} newTab - 是否在新标签页打开
     */
    navigateTo(path, newTab = false) {
        const fullPath = this.buildPath(path);
        if (newTab) {
            window.open(fullPath, '_blank');
        } else {
            window.location.href = fullPath;
        }
    }

    /**
     * 获取当前页面基础路径
     * @returns {string} 基础路径
     */
    getBasePath() {
        return this.basePath;
    }

    /**
     * 检查是否为根目录部署
     * @returns {boolean}
     */
    isRootDeployment() {
        return this.isRootDeployment;
    }
}

// 创建全局实例
window.PathHelper = new PathHelper();

// 页面加载完成后自动更新链接
document.addEventListener('DOMContentLoaded', () => {
    // 延迟执行，确保所有资源都加载完成
    setTimeout(() => {
        window.PathHelper.updatePageLinks();
    }, 100);
});

// 导出配置
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PathHelper;
}