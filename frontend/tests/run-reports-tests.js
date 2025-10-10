#!/usr/bin/env node

/**
 * 报告页面测试运行脚本
 * 用于快速运行报告页面的相关测试
 */

const { spawn } = require('child_process');
const path = require('path');
const { buildURL } = require('./test-config.js');

console.log('🧪 开始运行报告页面测试...\n');

// 测试配置
const testFiles = [
    'reports.spec.js',
    'reports-fixes.spec.js'
];

const playwrightConfig = {
    timeout: 30000,
    retries: 1,
    headed: process.argv.includes('--headed'),
    browser: process.argv.includes('--firefox') ? 'firefox' :
             process.argv.includes('--webkit') ? 'webkit' : 'chromium'
};

// 运行测试
async function runTests() {
    console.log(`📋 测试配置:`);
    console.log(`   - 浏览器: ${playwrightConfig.browser}`);
    console.log(`   - 有头模式: ${playwrightConfig.headed ? '是' : '否'}`);
    console.log(`   - 超时时间: ${playwrightConfig.timeout}ms`);
    console.log(`   - 重试次数: ${playwrightConfig.retries}`);
    console.log('');

    for (const testFile of testFiles) {
        console.log(`🔬 运行测试: ${testFile}`);

        const args = [
            'npx', 'playwright', 'test', testFile,
            '--config=playwright.config.js',
            '--timeout=' + playwrightConfig.timeout,
            '--retries=' + playwrightConfig.retries,
            '--project=' + playwrightConfig.browser
        ];

        if (playwrightConfig.headed) {
            args.push('--headed');
        }

        const testProcess = spawn('npx', args.slice(1), {
            stdio: 'inherit',
            cwd: path.resolve(__dirname, '..'),
            shell: true
        });

        await new Promise((resolve, reject) => {
            testProcess.on('close', (code) => {
                if (code === 0) {
                    console.log(`✅ ${testFile} 测试通过\n`);
                    resolve();
                } else {
                    console.log(`❌ ${testFile} 测试失败 (退出码: ${code})\n`);
                    reject(new Error(`测试失败: ${testFile}`));
                }
            });

            testProcess.on('error', (error) => {
                console.error(`💥 运行 ${testFile} 时出错:`, error);
                reject(error);
            });
        });
    }

    console.log('🎉 所有测试都通过了！');
}

// 显示帮助信息
function showHelp() {
    console.log(`
📖 报告页面测试运行器

用法:
  node run-reports-tests.js [选项]

选项:
  --headed       在有头模式下运行测试（显示浏览器窗口）
  --firefox      使用 Firefox 浏览器运行测试
  --webkit       使用 WebKit (Safari) 浏览器运行测试
  --help         显示此帮助信息

示例:
  node run-reports-tests.js                    # 默认使用 Chrome 无头模式
  node run-reports-tests.js --headed           # 使用 Chrome 有头模式
  node run-reports-tests.js --firefox --headed # 使用 Firefox 有头模式

测试文件:
  - reports.spec.js        # 基础功能测试
  - reports-fixes.spec.js  # 修复功能专项测试

注意事项:
  1. 运行前请确保后端服务已启动
  2. 确保前端服务器在 ${buildURL('frontend', '/')} 运行
  3. 确保已安装 Playwright 依赖
  `);
}

// 检查命令行参数
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    showHelp();
    process.exit(0);
}

// 运行测试
runTests().catch((error) => {
    console.error('💥 测试运行失败:', error.message);
    console.log('\n🔧 请检查:');
    console.log('   1. 后端服务是否正常运行');
    console.log('   2. 前端服务器是否在', buildURL('frontend', '/'), '运行');
    console.log('   3. Playwright 是否正确安装');
    console.log('   4. 测试数据是否存在');
    console.log('\n💡 运行 "node run-reports-tests.js --help" 查看更多选项');
    process.exit(1);
});