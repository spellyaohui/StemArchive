const puppeteer = require('puppeteer');

class SingleReportPdfService {
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
     * 根据体检数据生成PDF（先标准化数据，再生成Markdown，最后渲染PDF）
     * @param {Object} examData - 体检数据（与 exam-detail 接口返回结构一致）
     * @returns {Promise<Buffer>} PDF Buffer
     */
    async generatePdf(examData) {
        let page = null;
        try {
            const normalizedData = this.normalizeExamData(examData || {});
            const markdownContent = this.generateMarkdownReport(normalizedData);
            const html = this.buildHtml(markdownContent, normalizedData);

            const browser = await this.getBrowser();
            page = await browser.newPage();
            await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });

            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: { top: '10mm', bottom: '14mm', left: '12mm', right: '12mm' },
                displayHeaderFooter: true,
                headerTemplate: '<div style="width:100%;font-size:7px;color:#64748b;padding:0 12mm;display:flex;justify-content:space-between;align-items:center;font-family:Microsoft YaHei,sans-serif;"><span>干细胞治疗档案管理系统</span><span>健康体检单次报告</span></div>',
                footerTemplate: '<div style="width:100%;font-size:7px;color:#64748b;padding:0 12mm;display:flex;justify-content:space-between;align-items:center;font-family:Microsoft YaHei,sans-serif;"><span>本报告由系统自动生成，仅供参考</span><span>第 <span class="pageNumber"></span> 页 / 共 <span class="totalPages"></span> 页</span></div>'
            });

            await page.close();
            page = null;

            return pdfBuffer;
        } catch (error) {
            if (page) { try { await page.close(); } catch (e) { /* ignore */ } }
            throw error;
        }
    }

    /**
     * 标准化单次报告数据
     */
    normalizeExamData(examData) {
        const customerName = examData.customerName || '未知检客';
        const medicalExamId = examData.medicalExamId || '未知ID';
        const examDate = examData.examDate || '未知日期';
        const deptOrder = ['检验科', '彩超室', '心电图室', '放射科', '内科', '外科', '眼科', '耳鼻喉科', '口腔科'];

        const sourceDepartments = Array.isArray(examData.departments) ? examData.departments.slice() : [];
        sourceDepartments.sort((a, b) => {
            const aName = (a && a.department) ? a.department : '';
            const bName = (b && b.department) ? b.department : '';
            const ai = deptOrder.indexOf(aName);
            const bi = deptOrder.indexOf(bName);

            if (ai === -1 && bi === -1) { return aName.localeCompare(bName); }
            if (ai === -1) { return 1; }
            if (bi === -1) { return -1; }
            return ai - bi;
        });

        const departments = sourceDepartments.map((dept) => {
            const departmentName = (dept && dept.department) ? String(dept.department).trim() : '未命名科室';
            const parsedAssessmentData = this.parseAssessmentData(dept ? dept.assessmentData : null);
            const normalizedDepartment = {
                department: departmentName,
                assessmentDate: dept ? dept.assessmentDate : null,
                doctor: dept ? dept.doctor : null,
                summary: dept ? dept.summary : null,
                items: [],
                labCategories: []
            };

            if (departmentName === '检验科') {
                normalizedDepartment.labCategories = this.normalizeLabCategories(parsedAssessmentData);
            } else {
                normalizedDepartment.items = this.normalizeGeneralItems(parsedAssessmentData);
            }

            return normalizedDepartment;
        });

        return {
            customerName,
            medicalExamId,
            examDate,
            generatedAt: new Date(),
            departments
        };
    }

    /**
     * 解析 assessmentData
     */
    parseAssessmentData(assessmentData) {
        if (!assessmentData) { return []; }

        if (Array.isArray(assessmentData)) {
            return assessmentData;
        }

        if (typeof assessmentData === 'string') {
            try {
                const parsed = JSON.parse(assessmentData);
                return Array.isArray(parsed) ? parsed : [];
            } catch (e) {
                return [];
            }
        }

        return [];
    }

    /**
     * 标准化普通科室项目
     */
    normalizeGeneralItems(items) {
        if (!Array.isArray(items)) { return []; }

        const normalizedItems = [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i] || {};
            const itemName = item.itemName || item.name || item.title || '';
            let itemResult = item.itemResult || item.resultValue || item.rawText || '';

            if (!itemResult && Array.isArray(item.labItems)) {
                itemResult = item.labItems.map((labItem) => {
                    const resultValue = labItem.resultValue || labItem.itemResult || '';
                    const resultUnit = labItem.resultUnit || labItem.itemUnit || '';
                    const referenceRange = labItem.referenceRange || labItem.referenceValue || '';
                    return `${labItem.itemName || ''}: ${resultValue}${resultUnit ? ' ' + resultUnit : ''}${referenceRange ? '（参考值：' + referenceRange + '）' : ''}`.trim();
                }).filter(Boolean).join('；');
            }

            if (!itemName && !itemResult) {
                continue;
            }

            normalizedItems.push({
                itemName: itemName || '未命名项目',
                itemResult: itemResult || '未提供结果'
            });
        }

        return normalizedItems;
    }

    /**
     * 标准化检验科分类与项目（结构化优先 + 文本兜底）
     */
    normalizeLabCategories(items) {
        if (!Array.isArray(items)) { return []; }

        const categories = [];
        for (let i = 0; i < items.length; i++) {
            const category = items[i] || {};
            const categoryName = (category.itemName || category.category || category.categoryName || '未分类').toString().trim();
            const normalizedItems = [];

            if (Array.isArray(category.labItems) && category.labItems.length > 0) {
                for (let j = 0; j < category.labItems.length; j++) {
                    const normalizedLabItem = this.normalizeLabItem(category.labItems[j]);
                    if (this.hasMeaningfulLabItem(normalizedLabItem)) {
                        normalizedItems.push(normalizedLabItem);
                    }
                }
            } else if (category.resultValue || category.itemResult || category.itemUnit || category.referenceValue || category.referenceRange || category.resultUnit) {
                // 历史数据可能直接存储在 itemResult 文本中
                if (typeof category.itemResult === 'string' && category.itemResult.indexOf('\n') >= 0) {
                    const lines = category.itemResult.split(/\r?\n/);
                    for (let k = 0; k < lines.length; k++) {
                        const parsed = this.parseLegacyLabLine(lines[k]);
                        if (parsed) {
                            normalizedItems.push(parsed);
                        }
                    }
                } else {
                    const directItem = this.normalizeLabItem(category);
                    if (this.hasMeaningfulLabItem(directItem)) {
                        normalizedItems.push(directItem);
                    }
                }
            }

            if (normalizedItems.length > 0) {
                categories.push({
                    categoryName,
                    items: normalizedItems
                });
            }
        }

        return categories;
    }

    /**
     * 标准化检验项目
     */
    normalizeLabItem(item) {
        const source = item || {};

        let itemName = (source.itemName || '').toString().trim();
        let resultValue = (source.resultValue || source.itemResult || '').toString().trim();
        let resultUnit = (source.resultUnit || source.itemUnit || '').toString().trim();
        let referenceRange = (source.referenceRange || source.referenceValue || '').toString().trim();
        let abnormalFlag = this.normalizeAbnormalFlag(source.abnormalFlag);
        let rawText = (source.rawText || '').toString().trim();

        // 兜底：如果字段不完整，尝试从混合文本解析
        if (!rawText) {
            rawText = `${itemName ? itemName + ': ' : ''}${resultValue}${resultUnit ? ' ' + resultUnit : ''}${referenceRange ? ' (参考值: ' + referenceRange + ')' : ''}${abnormalFlag ? ' [' + abnormalFlag + ']' : ''}`.trim();
        }

        if ((!itemName || !resultValue) && rawText) {
            const parsed = this.parseLegacyLabLine(rawText);
            if (parsed) {
                itemName = itemName || parsed.itemName;
                resultValue = resultValue || parsed.resultValue;
                resultUnit = resultUnit || parsed.resultUnit;
                referenceRange = referenceRange || parsed.referenceRange;
                abnormalFlag = abnormalFlag || parsed.abnormalFlag;
                rawText = parsed.rawText || rawText;
            }
        }

        return {
            itemName: itemName || '未命名项目',
            resultValue: resultValue || '',
            resultUnit: resultUnit || '',
            referenceRange: referenceRange || '',
            abnormalFlag: abnormalFlag || '',
            rawText: rawText || ''
        };
    }

    /**
     * 解析历史混合文本行
     */
    parseLegacyLabLine(line) {
        const raw = (line || '').toString().trim();
        if (!raw) { return null; }

        let text = raw;
        let abnormalFlag = '';
        let referenceRange = '';
        let itemName = '';

        // 提取异常标记
        const abnormalMatch = text.match(/\[(异常|偏高|偏低|阳性|阴性|可疑)\]\s*$/);
        if (abnormalMatch) {
            abnormalFlag = abnormalMatch[1];
            text = text.replace(abnormalMatch[0], '').trim();
        }

        // 提取参考值
        const referenceMatch = text.match(/[（(]\s*参考值[:：]?\s*([^()（）]+?)\s*[)）]/);
        if (referenceMatch) {
            referenceRange = referenceMatch[1].trim();
            text = text.replace(referenceMatch[0], '').trim();
        }

        // 提取项目名和结果主体
        let valuePart = text;
        let splitIndex = text.indexOf('：');
        if (splitIndex < 0) {
            splitIndex = text.indexOf(':');
        }
        if (splitIndex > 0) {
            itemName = text.slice(0, splitIndex).trim();
            valuePart = text.slice(splitIndex + 1).trim();
        }

        // 提取单位（弱规则）
        let resultValue = valuePart;
        let resultUnit = '';
        const resultMatch = valuePart.match(/^(.+?)\s+([^\s]+)$/);
        if (resultMatch && this.looksLikeUnit(resultMatch[2])) {
            resultValue = resultMatch[1].trim();
            resultUnit = resultMatch[2].trim();
        }

        return {
            itemName: itemName || '未命名项目',
            resultValue: resultValue || '',
            resultUnit: resultUnit || '',
            referenceRange: referenceRange || '',
            abnormalFlag: this.normalizeAbnormalFlag(abnormalFlag),
            rawText: raw
        };
    }

    /**
     * 是否像一个单位字符串
     */
    looksLikeUnit(unit) {
        if (!unit) { return false; }
        const u = String(unit).trim();
        if (!u) { return false; }

        return /(%|‰|\/|μ|µ|mmHg|bpm|次\/分|kg\/m2|mmol\/L|g\/L|pg\/mL|ng\/mL|U\/L|IU\/L|10\^?\d+\/L|[a-zA-Z]+)$/i.test(u);
    }

    /**
     * 归一化异常标记
     */
    normalizeAbnormalFlag(flag) {
        if (flag === undefined || flag === null) {
            return '';
        }

        const text = String(flag).trim();
        if (!text || text === '0' || text === '-' || text.toLowerCase() === 'normal' || text === '正常' || text === '无异常') {
            return '';
        }

        if (text === '2' || text === 'H' || text === 'h' || text === '↑' || text === '偏高') {
            return '偏高';
        }

        if (text === '1' || text === 'L' || text === 'l' || text === '↓' || text === '偏低') {
            return '偏低';
        }

        if (text === '阴性') {
            return '阴性';
        }

        if (text === '阳性') {
            return '阳性';
        }

        return text;
    }

    formatAbnormalFlagForDisplay(flag) {
        const normalized = this.normalizeAbnormalFlag(flag);
        if (!normalized) {
            return '-';
        }

        if (normalized === '偏高') {
            return '【↑ 偏高】';
        }

        if (normalized === '偏低') {
            return '【↓ 偏低】';
        }

        if (normalized === '阴性') {
            return '【阴性】';
        }

        if (normalized === '阳性') {
            return '【阳性】';
        }

        return `【${normalized}】`;
    }

    hasMeaningfulLabItem(item) {
        if (!item) { return false; }
        return !!(item.itemName || item.resultValue || item.referenceRange || item.resultUnit || item.rawText);
    }

    isAbnormalFlag(flag) {
        const text = this.normalizeAbnormalFlag(flag);
        if (!text) { return false; }
        if (text === '阴性' || text === '正常') { return false; }
        return true;
    }

    hasAbnormalText(text) {
        const content = (text || '').toString();
        if (!content) { return false; }
        if (/无异常|未见异常|阴性/.test(content)) { return false; }
        return /异常|偏高|偏低|阳性|可疑/.test(content);
    }

    collectAbnormalItems(departments) {
        const result = [];
        if (!Array.isArray(departments)) {
            return result;
        }

        for (let i = 0; i < departments.length; i++) {
            const dept = departments[i];
            const departmentName = dept.department || '未命名科室';

            if (departmentName === '检验科') {
                const labCategories = Array.isArray(dept.labCategories) ? dept.labCategories : [];
                for (let j = 0; j < labCategories.length; j++) {
                    const category = labCategories[j];
                    const labItems = Array.isArray(category.items) ? category.items : [];
                    for (let k = 0; k < labItems.length; k++) {
                        const item = labItems[k];
                        if (this.isAbnormalFlag(item.abnormalFlag)) {
                            result.push({
                                department: departmentName,
                                itemName: item.itemName || '未命名项目',
                                resultText: `${item.resultValue || '-'}${item.resultUnit ? ' ' + item.resultUnit : ''}`.trim(),
                                referenceRange: item.referenceRange || '',
                                flag: item.abnormalFlag || '异常'
                            });
                        }
                    }
                }
            } else {
                const items = Array.isArray(dept.items) ? dept.items : [];
                for (let j = 0; j < items.length; j++) {
                    const item = items[j];
                    if (this.hasAbnormalText(item.itemResult)) {
                        result.push({
                            department: departmentName,
                            itemName: item.itemName || '未命名项目',
                            resultText: item.itemResult || '-',
                            referenceRange: '',
                            flag: '异常提示'
                        });
                    }
                }
            }
        }

        return result;
    }

    /**
     * 生成单次报告Markdown
     */
    generateMarkdownReport(reportData) {
        const lines = [];
        const customerName = reportData.customerName || '未知检客';
        const medicalExamId = reportData.medicalExamId || '未知ID';
        const examDate = this.formatDate(reportData.examDate);
        const generatedAt = this.formatDateTime(reportData.generatedAt || new Date());
        const departments = Array.isArray(reportData.departments) ? reportData.departments : [];

        lines.push('# 健康体检单次报告');
        lines.push('');
        lines.push('> 本报告基于体检系统记录自动生成，仅供临床参考，不能替代医生最终诊断。');
        lines.push('');

        lines.push('## 基本信息');
        lines.push('');
        lines.push(`- **检客姓名**：${customerName}`);
        lines.push(`- **体检编号**：${medicalExamId}`);
        lines.push(`- **体检日期**：${examDate}`);
        lines.push(`- **生成时间**：${generatedAt}`);
        lines.push('');

        const abnormalItems = this.collectAbnormalItems(departments);
        lines.push('## 异常结果摘要');
        lines.push('');
        if (abnormalItems.length === 0) {
            lines.push('- 暂未发现明确异常标记。');
        } else {
            for (let i = 0; i < abnormalItems.length; i++) {
                const abnormal = abnormalItems[i];
                let line = `- **${abnormal.department} / ${abnormal.itemName}**：${abnormal.resultText || '-'}`;
                if (abnormal.referenceRange) {
                    line += `（参考值：${abnormal.referenceRange}）`;
                }
                if (abnormal.flag) {
                    const displayFlag = this.formatAbnormalFlagForDisplay(abnormal.flag);
                    if (displayFlag && displayFlag !== '-') {
                        line += displayFlag;
                    }
                }
                lines.push(line);
            }
        }
        lines.push('');

        lines.push('## 科室检查结果');
        lines.push('');

        for (let i = 0; i < departments.length; i++) {
            const dept = departments[i];
            lines.push(`### ${i + 1}. ${dept.department}`);
            lines.push('');

            if (dept.assessmentDate) {
                lines.push(`- 检查日期：${this.formatDate(dept.assessmentDate)}`);
            }
            if (dept.doctor) {
                lines.push(`- 检查医生：${dept.doctor}`);
            }
            if (dept.assessmentDate || dept.doctor) {
                lines.push('');
            }

            if (dept.department === '检验科') {
                const categories = Array.isArray(dept.labCategories) ? dept.labCategories : [];
                if (categories.length === 0) {
                    lines.push('- 暂无检验科明细数据。');
                    lines.push('');
                } else {
                    for (let j = 0; j < categories.length; j++) {
                        const category = categories[j];
                        lines.push(`#### ${category.categoryName}`);
                        lines.push('');
                        lines.push('| 检查项目 | 结果 | 单位 | 参考值 | 判定 |');
                        lines.push('| --- | --- | --- | --- | --- |');

                        const categoryItems = Array.isArray(category.items) ? category.items : [];
                        for (let k = 0; k < categoryItems.length; k++) {
                            const item = categoryItems[k];
                            lines.push(`| ${this.escapeMarkdownCell(item.itemName)} | ${this.escapeMarkdownCell(item.resultValue || '-')} | ${this.escapeMarkdownCell(item.resultUnit || '-')} | ${this.escapeMarkdownCell(item.referenceRange || '-')} | ${this.escapeMarkdownCell(this.formatAbnormalFlagForDisplay(item.abnormalFlag))} |`);
                        }
                        lines.push('');
                    }
                }
            } else {
                const items = Array.isArray(dept.items) ? dept.items : [];
                if (items.length === 0) {
                    lines.push('- 暂无该科室明细数据。');
                    lines.push('');
                } else {
                    lines.push('| 检查项目 | 检查结果 |');
                    lines.push('| --- | --- |');
                    for (let j = 0; j < items.length; j++) {
                        const item = items[j];
                        lines.push(`| ${this.escapeMarkdownCell(item.itemName)} | ${this.escapeMarkdownCell(item.itemResult)} |`);
                    }
                    lines.push('');
                }
            }

            if (dept.summary) {
                lines.push(`> 科室小结：${dept.summary}`);
                lines.push('');
            }

            lines.push('---');
            lines.push('');
        }

        lines.push('## 医疗说明与免责声明');
        lines.push('');
        lines.push('- 本报告内容来源于体检数据的结构化整理与自动排版展示。');
        lines.push('- 报告中提示的异常结果仅作为复查与随访参考。');
        lines.push('- 最终诊疗结论请以临床医生面诊意见为准。');
        lines.push('');
        lines.push(`*报告生成时间：${generatedAt}*`);

        return lines.join('\n');
    }

    /**
     * Markdown 转 HTML 页面
     */
    buildHtml(markdownContent) {
        const markdownHtml = this.renderMarkdownToHtml(markdownContent);

        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <style>
        * { box-sizing: border-box; }
        body {
            margin: 0;
            padding: 0;
            font-family: "Microsoft YaHei", "PingFang SC", "SimHei", sans-serif;
            color: #1f2937;
            font-size: 12px;
            line-height: 1.55;
            background: #ffffff;
        }
        .page {
            padding: 0;
        }
        .markdown-body {
            width: 100%;
        }
        .markdown-body h1 {
            margin: 0 0 12px 0;
            padding: 0 0 10px 0;
            border-bottom: 2px solid #1d4ed8;
            font-size: 22px;
            color: #1e3a8a;
            letter-spacing: 1px;
        }
        .markdown-body h2 {
            margin: 16px 0 8px 0;
            padding-left: 8px;
            border-left: 4px solid #2563eb;
            font-size: 15px;
            color: #1e40af;
        }
        .markdown-body h3 {
            margin: 14px 0 6px 0;
            font-size: 13px;
            color: #1d4ed8;
        }
        .markdown-body h4 {
            margin: 10px 0 4px 0;
            font-size: 12px;
            color: #334155;
            font-weight: 700;
        }
        .markdown-body p {
            margin: 4px 0;
            color: #334155;
        }
        .markdown-body ul {
            margin: 4px 0 8px 0;
            padding-left: 20px;
        }
        .markdown-body li {
            margin: 2px 0;
        }
        .markdown-body hr {
            border: 0;
            border-top: 1px dashed #cbd5e1;
            margin: 12px 0;
        }
        .markdown-body blockquote {
            margin: 8px 0;
            padding: 6px 10px;
            background: #eff6ff;
            border-left: 3px solid #3b82f6;
            color: #1e3a8a;
            border-radius: 4px;
        }
        .md-table {
            width: 100%;
            border-collapse: collapse;
            margin: 6px 0 10px 0;
            table-layout: fixed;
            page-break-inside: auto;
            break-inside: auto;
        }
        .md-table th {
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            padding: 6px 8px;
            text-align: left;
            color: #334155;
            font-size: 11px;
            font-weight: 700;
        }
        .md-table td {
            border: 1px solid #e2e8f0;
            padding: 6px 8px;
            vertical-align: top;
            color: #1f2937;
            font-size: 11px;
            word-break: break-word;
        }
        .tag-abnormal {
            display: inline-block;
            padding: 1px 6px;
            border-radius: 10px;
            font-size: 10px;
            font-weight: 600;
            color: #b45309;
            background: #fffbeb;
            border: 1px solid #fde68a;
        }
        .tag-high {
            display: inline-block;
            padding: 1px 6px;
            border-radius: 10px;
            font-size: 10px;
            font-weight: 600;
            color: #92400e;
            background: #fff7ed;
            border: 1px solid #fed7aa;
        }
        .tag-low {
            display: inline-block;
            padding: 1px 6px;
            border-radius: 10px;
            font-size: 10px;
            font-weight: 600;
            color: #1e40af;
            background: #eff6ff;
            border: 1px solid #bfdbfe;
        }
        .tag-normal {
            display: inline-block;
            padding: 1px 6px;
            border-radius: 10px;
            font-size: 10px;
            font-weight: 600;
            color: #475569;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
        }
        code {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 3px;
            padding: 0 4px;
            font-size: 11px;
        }
    </style>
</head>
<body>
    <div class="page">
        <div class="markdown-body">${markdownHtml}</div>
    </div>
</body>
</html>`;
    }

    /**
     * 渲染简化Markdown（满足本报告模板语法）
     */
    renderMarkdownToHtml(markdown) {
        const lines = String(markdown || '').replace(/\r/g, '').split('\n');
        const html = [];

        let inList = false;
        let inTable = false;
        let tableHeaderParsed = false;
        let tableBodyStarted = false;

        const closeList = () => {
            if (inList) {
                html.push('</ul>');
                inList = false;
            }
        };

        const closeTable = () => {
            if (inTable) {
                if (!tableBodyStarted) {
                    html.push('</thead><tbody></tbody>');
                } else {
                    html.push('</tbody>');
                }
                html.push('</table>');
                inTable = false;
                tableHeaderParsed = false;
                tableBodyStarted = false;
            }
        };

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i] || '';
            const trimmed = line.trim();

            if (!trimmed) {
                closeList();
                closeTable();
                continue;
            }

            if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
                closeList();
                const cells = trimmed.split('|').slice(1, -1).map((cell) => cell.trim());
                const isSeparator = cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s/g, '')));

                if (!inTable) {
                    inTable = true;
                    tableHeaderParsed = false;
                    tableBodyStarted = false;
                    html.push('<table class="md-table"><thead>');
                }

                if (isSeparator) {
                    if (!tableBodyStarted) {
                        html.push('</thead><tbody>');
                        tableBodyStarted = true;
                    }
                    continue;
                }

                if (!tableHeaderParsed) {
                    html.push('<tr>' + cells.map((cell) => '<th>' + this.renderInlineMarkdown(cell) + '</th>').join('') + '</tr>');
                    tableHeaderParsed = true;
                } else {
                    if (!tableBodyStarted) {
                        html.push('</thead><tbody>');
                        tableBodyStarted = true;
                    }
                    html.push('<tr>' + cells.map((cell) => '<td>' + this.renderInlineMarkdown(cell) + '</td>').join('') + '</tr>');
                }
                continue;
            }

            closeTable();

            const heading = trimmed.match(/^(#{1,4})\s+(.*)$/);
            if (heading) {
                closeList();
                const level = heading[1].length;
                const content = this.renderInlineMarkdown(heading[2]);
                html.push(`<h${level}>${content}</h${level}>`);
                continue;
            }

            const listItem = trimmed.match(/^[-]\s+(.*)$/);
            if (listItem) {
                if (!inList) {
                    html.push('<ul>');
                    inList = true;
                }
                html.push('<li>' + this.renderInlineMarkdown(listItem[1]) + '</li>');
                continue;
            }

            closeList();

            if (trimmed === '---') {
                html.push('<hr/>');
                continue;
            }

            const quote = trimmed.match(/^>\s?(.*)$/);
            if (quote) {
                html.push('<blockquote>' + this.renderInlineMarkdown(quote[1]) + '</blockquote>');
                continue;
            }

            html.push('<p>' + this.renderInlineMarkdown(trimmed) + '</p>');
        }

        closeList();
        closeTable();

        return html.join('');
    }

    renderInlineMarkdown(text) {
        let safeText = this.escapeHtml(text || '');
        safeText = safeText.replace(/\\\|/g, '|');
        safeText = safeText.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        safeText = safeText.replace(/`([^`]+)`/g, '<code>$1</code>');
        safeText = safeText.replace(/【([^】]+)】/g, (all, tagText) => {
            let cssClass = 'tag-normal';
            if (/↑\s*偏高|偏高/.test(tagText)) {
                cssClass = 'tag-high';
            } else if (/↓\s*偏低|偏低/.test(tagText)) {
                cssClass = 'tag-low';
            } else if (/异常|阳性|可疑/.test(tagText)) {
                cssClass = 'tag-abnormal';
            }
            return `<span class="${cssClass}">${tagText}</span>`;
        });
        return safeText;
    }

    escapeMarkdownCell(value) {
        if (value === undefined || value === null) {
            return '-';
        }

        const text = String(value)
            .replace(/\r?\n+/g, '；')
            .replace(/\|/g, '\\|')
            .trim();

        return text || '-';
    }

    /**
     * 格式化日期
     */
    formatDate(dateVal) {
        if (!dateVal) { return '未知日期'; }

        const d = new Date(dateVal);
        if (isNaN(d.getTime())) { return String(dateVal); }

        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    formatDateTime(dateVal) {
        const d = new Date(dateVal || new Date());
        if (isNaN(d.getTime())) { return String(dateVal || ''); }

        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const h = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        return `${y}-${m}-${day} ${h}:${min}`;
    }

    /**
     * HTML转义
     */
    escapeHtml(str) {
        if (str === undefined || str === null) { return ''; }
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
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

module.exports = new SingleReportPdfService();
