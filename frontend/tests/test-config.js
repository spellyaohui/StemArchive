/**
 * 测试环境配置文件
 * 用于管理测试中的硬编码URL和配置
 */

// 检测部署模式
const isRootDeployment = process.env.ROOT_DEPLOYMENT === 'true';

// 测试环境配置
const TEST_CONFIG = {
    // 部署配置
    deployment: {
        isRootDeployment: isRootDeployment,
        basePath: isRootDeployment ? '' : '/frontend'
    },

    // 测试服务器配置
    servers: {
        frontend: {
            url: process.env.FRONTEND_URL || (isRootDeployment ? 'http://localhost:8080' : 'http://localhost:8080/frontend'),
            defaultPage: '/login.html'
        },
        backend: {
            url: process.env.BACKEND_URL || 'http://localhost:5000',
            apiBase: process.env.BACKEND_URL || 'http://localhost:5000/api'
        },
        thirdParty: {
            url: process.env.THIRD_PARTY_URL || 'http://localhost:3000',
            apiBase: process.env.THIRD_PARTY_URL || 'http://localhost:3000/api'
        }
    },

    // 测试超时配置
    timeouts: {
        default: 2000,
        navigation: 5000,
        api: 10000
    },

    // 测试用户配置
    users: {
        admin: {
            username: process.env.ADMIN_USERNAME || 'admin',
            password: process.env.ADMIN_PASSWORD || 'admin123'
        }
    }
};

// 导出配置
if (typeof module !== 'undefined' && module.exports) {
    // Node.js环境
    module.exports = TEST_CONFIG;
} else {
    // 浏览器环境
    window.TEST_CONFIG = TEST_CONFIG;
}

// 辅助函数：构建完整URL
function buildURL(server, path) {
    const baseUrl = TEST_CONFIG.servers[server]?.url || '';
    const fullPath = TEST_CONFIG.deployment.isRootDeployment ? path : `/frontend${path}`;
    return `${baseUrl}${fullPath}`;
}

// 辅助函数：构建API URL
function buildAPIURL(server, endpoint) {
    const apiBase = TEST_CONFIG.servers[server]?.apiBase || '';
    return `${apiBase}${endpoint}`;
}

// Node.js环境下也导出辅助函数
if (typeof module !== 'undefined' && module.exports) {
    module.exports.buildURL = buildURL;
    module.exports.buildAPIURL = buildAPIURL;
}