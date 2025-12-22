/**
 * 前端构建脚本
 * 将前端文件复制到 backend/public 目录，实现前后端合并部署
 */

const fs = require('fs');
const path = require('path');

// 引入前端环境变量构建脚本
const frontendScriptsDir = path.join(__dirname, '../../frontend/scripts');
let buildEnv = null;

try {
    if (fs.existsSync(path.join(frontendScriptsDir, 'build-env.js'))) {
        buildEnv = require(path.join(frontendScriptsDir, 'build-env.js')).buildEnv;
    }
} catch (error) {
    console.warn('⚠️ 无法加载前端环境变量构建脚本:', error.message);
}

// 配置
const config = {
    // 前端源目录
    sourceDir: path.join(__dirname, '../../frontend'),
    // 目标目录
    targetDir: path.join(__dirname, '../public'),
    // 排除的文件和目录
    excludes: [
        'node_modules',
        'tests',
        '.git',
        '.gitignore',
        'package.json',
        'package-lock.json',
        '.eslintrc.js',
        '.eslintrc.json'
    ]
};

/**
 * 递归删除目录
 */
function removeDir(dirPath) {
    if (fs.existsSync(dirPath)) {
        fs.readdirSync(dirPath).forEach(file => {
            const curPath = path.join(dirPath, file);
            if (fs.lstatSync(curPath).isDirectory()) {
                removeDir(curPath);
            } else {
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(dirPath);
    }
}

/**
 * 递归复制目录
 */
function copyDir(src, dest, excludes = []) {
    // 创建目标目录
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        // 检查是否在排除列表中
        if (excludes.includes(entry.name)) {
            console.log(`  跳过: ${entry.name}`);
            continue;
        }

        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDir(srcPath, destPath, excludes);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

/**
 * 创建根路径重定向文件
 */
function createIndexRedirect(targetDir) {
    const indexPath = path.join(targetDir, 'index.html');
    
    // 如果已存在 index.html，检查是否需要创建重定向
    if (fs.existsSync(indexPath)) {
        const content = fs.readFileSync(indexPath, 'utf8');
        // 如果已经是重定向文件或有实际内容，不覆盖
        if (content.includes('login.html') || content.length > 500) {
            console.log('  index.html 已存在，跳过创建重定向');
            return;
        }
    }

    const redirectContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="refresh" content="0;url=/login.html">
    <title>跳转中...</title>
</head>
<body>
    <p>正在跳转到登录页面...</p>
    <script>window.location.href = '/login.html';</script>
</body>
</html>`;

    fs.writeFileSync(indexPath, redirectContent, 'utf8');
    console.log('  创建 index.html 重定向文件');
}

/**
 * 主函数
 */
function main() {
    console.log('========================================');
    console.log('  前端构建脚本 - 前后端合并部署');
    console.log('========================================\n');

    const { sourceDir, targetDir, excludes } = config;

    // 检查源目录是否存在
    if (!fs.existsSync(sourceDir)) {
        console.error(`错误: 前端源目录不存在: ${sourceDir}`);
        process.exit(1);
    }

    console.log(`源目录: ${sourceDir}`);
    console.log(`目标目录: ${targetDir}`);
    console.log(`排除项: ${excludes.join(', ')}\n`);

    // 步骤 0: 构建前端环境变量
    console.log('步骤 0: 构建前端环境变量...');
    if (buildEnv) {
        try {
            buildEnv();
            console.log('  环境变量构建完成');
        } catch (error) {
            console.warn('  环境变量构建失败:', error.message);
        }
    } else {
        console.log('  跳过环境变量构建（构建脚本不可用）');
    }

    // 步骤 1: 清理旧的 public 目录
    console.log('步骤 1: 清理旧的 public 目录...');
    if (fs.existsSync(targetDir)) {
        removeDir(targetDir);
        console.log('  已清理旧目录');
    } else {
        console.log('  目录不存在，跳过清理');
    }

    // 步骤 2: 复制前端文件
    console.log('\n步骤 2: 复制前端文件...');
    copyDir(sourceDir, targetDir, excludes);
    console.log('  文件复制完成');

    // 步骤 3: 创建根路径重定向
    console.log('\n步骤 3: 处理根路径重定向...');
    createIndexRedirect(targetDir);

    // 统计复制的文件数量
    function countFiles(dir) {
        let count = 0;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory()) {
                count += countFiles(path.join(dir, entry.name));
            } else {
                count++;
            }
        }
        return count;
    }

    const fileCount = countFiles(targetDir);
    
    console.log('\n========================================');
    console.log(`  构建完成！共复制 ${fileCount} 个文件`);
    console.log('========================================\n');
    console.log('现在可以运行 npm start 启动统一服务器');
}

// 执行主函数
main();
