const puppeteer = require('puppeteer');
const { marked } = require('marked');

class HealthAssessmentPdfService {
    constructor() {
        this.browser = null;
    }

    /**
     * 获取或复用浏览器实例
     */
    async getBrowser() {
        if (!this.browser || !this.browser.isConnected()) {
            this.browser = await puppeteer.launch({
                headless: 'new',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--font-render-hinting=none'
                ]
            });
        }
        return this.browser;
    }

    /**
     * 将Markdown转换为具有医疗专业风格的PDF
     * @param {string} markdownContent - Markdown内容
     * @param {Object} options - 配置选项 (如报告名称、客户姓名等)
     * @returns {Promise<Object>} 转换结果包含 pdfData (Base64)
     */
    async convertMarkdownToPDF(markdownContent, options = {}) {
        let page = null;
        try {
            const startTime = Date.now();
            const html = this.buildHtml(markdownContent, options);

            const browser = await this.getBrowser();
            page = await browser.newPage();
            
            // 设置内容并等待网络空闲
            await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
            
            // 报告标题
            const reportTitle = options.title || '健康评估报告';
            
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: { top: '30mm', bottom: '30mm', left: '25mm', right: '25mm' },
                displayHeaderFooter: true,
                headerTemplate: `
                    <div style="width:100%;font-size:9px;color:#475569;padding:0 25mm;display:flex;justify-content:space-between;align-items:center;font-family:'Microsoft YaHei',sans-serif;border-bottom:1px solid #e2e8f0;padding-bottom:5px;margin-bottom:5px;">
                        <span style="font-weight:bold;color:#0f172a;">干细胞治疗档案管理系统</span>
                        <span>${reportTitle}</span>
                    </div>`,
                footerTemplate: `
                    <div style="width:100%;font-size:9px;color:#64748b;padding:0 25mm;display:flex;justify-content:space-between;align-items:center;font-family:'Microsoft YaHei',sans-serif;border-top:1px solid #e2e8f0;padding-top:5px;margin-top:5px;">
                        <span>本报告由AI智能分析生成，仅供临床参考，不能替代医生最终诊断。</span>
                        <span>第 <span class="pageNumber"></span> 页 / 共 <span class="totalPages"></span> 页</span>
                    </div>`
            });

            await page.close();
            page = null;

            const processingTime = Math.round((Date.now() - startTime) / 1000);

            return {
                success: true,
                pdfData: Buffer.from(pdfBuffer).toString('base64'),
                processingTime,
                message: 'PDF转换成功'
            };
        } catch (error) {
            console.error('PDF生成失败:', error);
            if (page) { try { await page.close(); } catch (e) { /* ignore */ } }
            
            return {
                success: false,
                error: error.message || 'PDF转换失败',
                processingTime: 0
            };
        }
    }

    /**
     * 构建HTML结构和医疗专业样式
     */
    buildHtml(markdownContent, options) {
        // 配置 marked 支持表格等扩展，并开启换行符
        marked.setOptions({
            breaks: true,
            gfm: true
        });

        // 使用 marked 将 markdown 转换为 html
        const rawHtml = marked.parse(markdownContent || '');

        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <style>
        :root {
            --ink-900: #0f172a;
            --ink-700: #334155;
            --ink-600: #475569;
            --line-200: #e2e8f0;
            --line-300: #cbd5e1;
            --brand-700: #1d4ed8;
            --brand-100: #f3f8ff;
            --risk-high-bg: #fee2e2;
            --risk-high-text: #991b1b;
            --risk-mid-bg: #fef3c7;
            --risk-mid-text: #92400e;
            --risk-low-bg: #dbeafe;
            --risk-low-text: #1e3a8a;
        }

        * { box-sizing: border-box; }
        body {
            margin: 0;
            padding: 0;
            font-family: "PingFang SC", "Microsoft YaHei", "SimHei", -apple-system, BlinkMacSystemFont, sans-serif;
            color: var(--ink-700);
            font-size: 13.5px;
            line-height: 1.85;
            background: #ffffff;
            overflow-wrap: anywhere;
            word-break: break-word;
            letter-spacing: 0.1px;
        }
        
        .markdown-body {
            width: 100%;
        }

        /* 标题样式 - 专科中心风格（克制、专业） */
        .markdown-body h1 {
            color: var(--ink-900);
            font-size: 27px;
            font-weight: 700;
            text-align: center;
            margin: 10px 0 28px 0;
            padding-bottom: 14px;
            border-bottom: 3px double var(--brand-700);
            letter-spacing: 1.5px;
            page-break-after: avoid !important;
            break-after: avoid !important;
        }
        
        .markdown-body h2 {
            color: #0f3b67;
            font-size: 18px;
            font-weight: 700;
            margin: 26px 0 14px 0;
            border-left: 5px solid var(--brand-700);
            border-bottom: 1px solid #dbeafe;
            background: var(--brand-100);
            padding: 10px 12px;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            break-after: avoid !important;
            break-inside: avoid !important;
        }

        .markdown-body h2.section-critical {
            color: #7f1d1d;
            border-left-color: #b91c1c;
            border-bottom-color: #fecdd3;
            background: #fff1f2;
        }
        
        .markdown-body h3 {
            color: #1e3a8a;
            font-size: 16px;
            font-weight: 700;
            margin: 20px 0 10px 0;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            break-after: avoid !important;
            break-inside: avoid !important;
        }

        .markdown-body h4 {
            color: #2f4b66;
            font-size: 14px;
            font-weight: 700;
            margin: 16px 0 8px 0;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            break-after: avoid !important;
            break-inside: avoid !important;
        }

        /* 段落和列表 */
        .markdown-body p {
            margin: 0 0 16px 0;
            text-align: justify;
            text-justify: inter-ideograph;
            page-break-inside: auto;
            break-inside: auto;
        }
        
        .markdown-body ul, .markdown-body ol {
            margin: 0 0 20px 0;
            padding-left: 28px;
            page-break-inside: auto;
            break-inside: auto;
        }
        
        .markdown-body li {
            margin-bottom: 8px;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
        }
        
        /* 强调文本 */
        .markdown-body strong {
            color: var(--ink-900);
            font-weight: 600;
        }

        /* 引用块 - 用于重要提示或小结 */
        .markdown-body blockquote {
            margin: 18px 0;
            padding: 12px 16px;
            background-color: #f8fafc;
            border-left: 4px solid #94a3b8;
            color: var(--ink-600);
            font-size: 13px;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
        }
        
        .markdown-body blockquote p:last-child {
            margin-bottom: 0;
        }

        /* 表格样式 - 医疗数据风格 */
        .markdown-body table {
            width: 100%;
            border-collapse: collapse;
            margin: 18px 0;
            table-layout: fixed;
            border: 1px solid var(--line-300);
            page-break-inside: auto;
            break-inside: auto;
            font-size: 12px;
        }
        
        .markdown-body tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: auto;
            break-after: auto;
        }
        
        .markdown-body th {
            background-color: #eef4fb;
            border: 1px solid var(--line-300);
            padding: 7px 8px;
            text-align: left;
            color: #0f2f57;
            font-weight: 700;
            font-size: 11.5px;
            line-height: 1.5;
        }
        
        .markdown-body td {
            border: 1px solid var(--line-200);
            padding: 7px 8px;
            vertical-align: top;
            color: var(--ink-700);
            font-size: 12px;
        }

        .markdown-body th:first-child,
        .markdown-body td:first-child {
            width: 20%;
        }

        .markdown-body th:last-child,
        .markdown-body td:last-child {
            width: 32%;
            white-space: normal;
            word-break: break-word;
        }

        .markdown-body td:first-child {
            font-weight: 600;
            color: #0f2742;
            background: #f8fbff;
        }
        
        /* 斑马纹表格 */
        .markdown-body tbody tr:nth-child(even) {
            background-color: #fbfdff;
        }

        /* 分割线 */
        .markdown-body hr {
            border: none;
            border-top: 1px solid var(--line-200);
            margin: 26px 0;
        }
        
        /* 处理指标异常高亮（如使用标记语法） */
        .highlight-abnormal {
            display: inline-block;
            padding: 1px 6px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 700;
            color: #b45309;
            background: #fffbeb;
            border: 1px solid #fde68a;
            margin: 0 2px;
        }
        
        .highlight-high {
            display: inline-block;
            padding: 1px 6px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 700;
            color: #92400e;
            background: #fff7ed;
            border: 1px solid #fed7aa;
            margin: 0 2px;
        }
        
        .highlight-low {
            display: inline-block;
            padding: 1px 6px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 700;
            color: #1e40af;
            background: #eff6ff;
            border: 1px solid #bfdbfe;
            margin: 0 2px;
        }

        .risk-level {
            display: inline-block;
            padding: 1px 8px;
            border-radius: 999px;
            border: 1px solid transparent;
            font-size: 11px;
            font-weight: 700;
            margin-right: 4px;
            vertical-align: baseline;
        }

        .risk-level-high {
            background: var(--risk-high-bg);
            color: var(--risk-high-text);
            border-color: #fecaca;
        }

        .risk-level-medium {
            background: var(--risk-mid-bg);
            color: var(--risk-mid-text);
            border-color: #fde68a;
        }

        .risk-level-low {
            background: var(--risk-low-bg);
            color: var(--risk-low-text);
            border-color: #bfdbfe;
        }
    </style>
</head>
<body>
    <div class="page">
        <div class="markdown-body">
            ${this.enhanceHtml(rawHtml)}
        </div>
    </div>
</body>
</html>`;
    }

    /**
     * 对生成的 HTML 进行后处理，增加特定高亮样式
     */
    enhanceHtml(html) {
        let enhanced = html;

        enhanced = enhanced.replace(/<h2>([^<]*(重点异常|异常指标|风险分级|关键异常)[^<]*)<\/h2>/g, '<h2 class="section-critical">$1</h2>');

        enhanced = enhanced.replace(/\[高风险\]/g, '<span class="risk-level risk-level-high">高风险</span>');
        enhanced = enhanced.replace(/\[中风险\]/g, '<span class="risk-level risk-level-medium">中风险</span>');
        enhanced = enhanced.replace(/\[低风险\]/g, '<span class="risk-level risk-level-low">低风险</span>');

        enhanced = enhanced.replace(/（高风险）/g, '（<span class="risk-level risk-level-high">高风险</span>）');
        enhanced = enhanced.replace(/（中风险）/g, '（<span class="risk-level risk-level-medium">中风险</span>）');
        enhanced = enhanced.replace(/（低风险）/g, '（<span class="risk-level risk-level-low">低风险</span>）');
        
        // 使用正则对表格中的异常内容或特定关键字进行高亮处理
        // 注意：由于前面用了 marked 解析，这里只需简单处理文本替换，可以根据 AI 生成的常用表达来正则匹配
        enhanced = enhanced.replace(/(偏高|升高|↑)/g, '<span class="highlight-high">$1</span>');
        enhanced = enhanced.replace(/(偏低|降低|↓)/g, '<span class="highlight-low">$1</span>');
        enhanced = enhanced.replace(/([^>])(异常|阳性|可疑)([^<])/g, '$1<span class="highlight-abnormal">$2</span>$3');
        
        return enhanced;
    }

    /**
     * 关闭浏览器实例（进程退出时调用）
     */
    async close() {
        if (this.browser) {
            try { await this.browser.close(); } catch (e) { /* ignore */ }
            this.browser = null;
        }
    }
}

module.exports = new HealthAssessmentPdfService();

