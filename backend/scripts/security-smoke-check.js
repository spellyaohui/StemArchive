/**
 * 安全改造冒烟检查脚本
 *
 * 检查项：
 * 1. 公开接口可用（/health）
 * 2. 受保护接口未登录返回401
 * 3. 登录成功后受保护接口可访问
 * 4. uploads 目录受鉴权保护
 * 5. statistics 参数校验返回400
 * 6. （可选）登录接口限流返回429
 *
 * 使用方式：
 *   node scripts/security-smoke-check.js
 *
 * 可选环境变量：
 *   SMOKE_BASE_URL=http://127.0.0.1:5000
 *   SMOKE_USERNAME=admin
 *   SMOKE_PASSWORD=admin123
 *   SMOKE_CHECK_RATE_LIMIT=true
 */

const axios = require('axios');

const BASE_URL = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:5000';
const USERNAME = process.env.SMOKE_USERNAME || 'admin';
const PASSWORD = process.env.SMOKE_PASSWORD || 'admin123';
const CHECK_RATE_LIMIT = process.env.SMOKE_CHECK_RATE_LIMIT === 'true';

const client = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    validateStatus: () => true
});

const results = [];

function addResult(name, passed, details) {
    results.push({ name, passed, details });
    const icon = passed ? '✅' : '❌';
    console.log(`${icon} ${name} - ${details}`);
}

async function check(name, requestFn, validator) {
    try {
        const response = await requestFn();
        const { passed, details } = validator(response);
        addResult(name, passed, details);
        return response;
    } catch (error) {
        addResult(name, false, `请求异常: ${error.message}`);
        return null;
    }
}

function authHeader(token) {
    return token ? { Authorization: `Bearer ${token}` } : {};
}

async function run() {
    console.log('========================================');
    console.log('安全改造冒烟检查开始');
    console.log(`目标地址: ${BASE_URL}`);
    console.log('========================================');

    await check(
        '健康检查接口',
        () => client.get('/health'),
        (res) => ({
            passed: res && res.status === 200 && res.data && res.data.status === 'OK',
            details: `HTTP ${res ? res.status : 'N/A'}`
        })
    );

    await check(
        '未登录访问受保护接口返回401',
        () => client.get('/api/statistics/dashboard'),
        (res) => ({
            passed: res && res.status === 401,
            details: `HTTP ${res ? res.status : 'N/A'}`
        })
    );

    const loginResponse = await check(
        '登录接口可用',
        () => client.post('/api/auth/login', {
            username: USERNAME,
            password: PASSWORD,
            rememberMe: false
        }),
        (res) => ({
            passed: !!(res && res.status === 200 && res.data && res.data.status === 'Success' && res.data.data && res.data.data.token),
            details: `HTTP ${res ? res.status : 'N/A'}`
        })
    );

    const token = loginResponse && loginResponse.data && loginResponse.data.data ? loginResponse.data.data.token : null;

    if (!token) {
        console.log('\n登录失败，后续需要鉴权的检查已跳过。');
        printSummary();
        process.exit(1);
    }

    await check(
        '已登录访问受保护接口成功',
        () => client.get('/api/statistics/dashboard', { headers: authHeader(token) }),
        (res) => ({
            passed: !!(res && res.status === 200 && res.data && res.data.status === 'Success'),
            details: `HTTP ${res ? res.status : 'N/A'}`
        })
    );

    await check(
        '未登录访问uploads被拦截',
        () => client.get('/uploads/smoke-check-not-exist.txt'),
        (res) => ({
            passed: res && res.status === 401,
            details: `HTTP ${res ? res.status : 'N/A'}`
        })
    );

    await check(
        '已登录访问uploads不再返回401',
        () => client.get('/uploads/smoke-check-not-exist.txt', { headers: authHeader(token) }),
        (res) => ({
            passed: res && res.status !== 401,
            details: `HTTP ${res ? res.status : 'N/A'}`
        })
    );

    await check(
        'monthly参数year非法时返回400',
        () => client.get('/api/statistics/monthly?year=abc', { headers: authHeader(token) }),
        (res) => ({
            passed: res && res.status === 400,
            details: `HTTP ${res ? res.status : 'N/A'}`
        })
    );

    await check(
        'treatment-types日期参数不完整时返回400',
        () => client.get('/api/statistics/treatment-types?dateFrom=2026-01-01', { headers: authHeader(token) }),
        (res) => ({
            passed: res && res.status === 400,
            details: `HTTP ${res ? res.status : 'N/A'}`
        })
    );

    await check(
        'complete-profile非法排序字段返回400',
        () => client.get('/api/statistics/customers/complete-profile?sortBy=DROP_TABLE', { headers: authHeader(token) }),
        (res) => ({
            passed: res && res.status === 400,
            details: `HTTP ${res ? res.status : 'N/A'}`
        })
    );

    if (CHECK_RATE_LIMIT) {
        let got429 = false;

        for (let i = 1; i <= 6; i++) {
            const res = await client.post('/api/auth/login', {
                username: USERNAME,
                password: 'wrong-password-for-smoke-check',
                rememberMe: false
            });
            if (res.status === 429) {
                got429 = true;
                break;
            }
        }

        addResult(
            '登录限流检查（可选）',
            got429,
            got429 ? '检测到429限流响应' : '未检测到429（请确认限流窗口和当前环境）'
        );
    } else {
        console.log('ℹ️ 已跳过登录限流检查（设置 SMOKE_CHECK_RATE_LIMIT=true 可启用）');
    }

    printSummary();

    const failedCount = results.filter(item => !item.passed).length;
    process.exit(failedCount > 0 ? 1 : 0);
}

function printSummary() {
    const passedCount = results.filter(item => item.passed).length;
    const failedCount = results.length - passedCount;

    console.log('\n========================================');
    console.log('安全改造冒烟检查结果');
    console.log(`通过: ${passedCount}`);
    console.log(`失败: ${failedCount}`);
    console.log('========================================');
}

run().catch((error) => {
    console.error('脚本执行异常:', error.message);
    process.exit(1);
});
