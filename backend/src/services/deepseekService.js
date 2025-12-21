const axios = require('axios');

class DeepSeekService {
    constructor() {
        this.apiKey = process.env.DEEPSEEK_API_KEY;
        this.baseURL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
        this.model = process.env.DEEPSEEK_MODEL || 'deepseek-chat'; // 可以根据需要切换为 'deepseek-reasoner'

        // 验证配置
        this.validateConfiguration();
    }

    // 验证配置
    validateConfiguration() {
        if (!this.apiKey) {
            console.warn('DeepSeek API Key未配置，请在环境变量中设置DEEPSEEK_API_KEY');
        }
        if (!this.baseURL) {
            console.warn('DeepSeek Base URL未配置，使用默认值: https://api.deepseek.com');
        }
    }

    /**
     * 生成健康评估
     * @param {Object} healthData - 健康数据
     * @param {string} healthData.customerName - 客户姓名
     * @param {string} healthData.medicalExamId - 体检ID
     * @param {Array} healthData.departments - 科室数据
     * @param {Date} healthData.examDate - 体检日期
     * @returns {Promise<Object>} AI分析结果
     */
    async generateHealthAssessment(healthData) {
        try {
            const startTime = Date.now();

            // 构建请求内容
            const requestContent = this.buildRequestContent(healthData);

            const requestData = {
                model: this.model,
                messages: [
                    {
                        role: "system",
                        content: "你是一位专业的医疗AI助手，专门负责分析体检报告并生成健康评估。请基于提供的体检数据，生成专业、详细、易懂的健康评估报告。\n\n【重要格式要求】：\n1. 直接输出报告正文内容，禁止使用任何对话式开头语句\n2. 禁止出现「好的」「收到」「明白」「我已」「我来」「我将」等对话性词语作为开头\n3. 报告应以标题或正式内容直接开始，如「### 健康评估报告」或直接描述分析结果\n4. 保持专业医疗报告的正式文体风格"
                    },
                    {
                        role: "user",
                        content: requestContent
                    }
                ],
                max_tokens: 4000,
                temperature: 0.3,
                top_p: 0.95
            };

            const response = await axios.post(`${this.baseURL}/v1/chat/completions`, requestData, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 600000 // 10分钟超时，根据DeepSeek API文档建议
            });

            const processingTime = Math.round((Date.now() - startTime) / 1000); // 秒

            // 提取AI回复内容
            const aiResponse = response.data;
            const aiAnalysis = aiResponse.choices?.[0]?.message?.content || '';

            if (!aiAnalysis) {
                throw new Error('AI响应内容为空');
            }

            // 生成Markdown格式的报告
            const markdownContent = this.generateMarkdownReport(healthData, aiAnalysis);

            return {
                success: true,
                aiAnalysis,
                markdownContent,
                apiModel: this.model,
                apiTokenCount: aiResponse.usage?.total_tokens || 0,
                processingTime,
                apiRequest: JSON.stringify(requestData, null, 2),
                apiResponse: JSON.stringify(aiResponse, null, 2)
            };

        } catch (error) {
            console.error('DeepSeek API调用失败:', error);

            // 记录详细的错误信息
            let errorMessage = '生成健康评估失败';
            if (error.response) {
                errorMessage += `: ${error.response.data?.error?.message || error.response.statusText}`;
            } else if (error.request) {
                if (error.code === 'ECONNRESET') {
                    errorMessage = '连接被重置，可能是请求超时或网络问题，请重试';
                } else if (error.code === 'ETIMEDOUT') {
                    errorMessage = '请求超时，请检查网络连接或重试';
                } else {
                    errorMessage = '无法连接到DeepSeek服务，请检查网络配置';
                }
            } else {
                errorMessage = error.message;
            }

            return {
                success: false,
                error: errorMessage,
                processingTime: 0,
                apiTokenCount: 0
            };
        }
    }

    /**
     * 构建请求数据内容
     * @param {Object} healthData - 健康数据
     * @returns {string} 请求数据内容
     */
    buildRequestContent(healthData) {
        const { customerName, medicalExamId, examDate, departments } = healthData;

        let content = `需要帮我根据这份体检报告生成一份健康评估。\n\n`;
        content += `**基本信息：**\n`;
        content += `- 姓名：${customerName}\n`;
        content += `- 体检ID：${medicalExamId}\n`;
        content += `- 体检日期：${examDate}\n\n`;

        content += `**体检数据：**\n`;

        if (departments && departments.length > 0) {
            departments.forEach((dept, index) => {
                content += `\n### ${index + 1}. ${dept.department}\n`;

                if (dept.assessmentDate) {
                    content += `检查日期：${dept.assessmentDate}\n`;
                }

                if (dept.doctor) {
                    content += `检查医生：${dept.doctor}\n`;
                }

                // 解析AssessmentData JSON数据
                if (dept.assessmentData) {
                    try {
                        const assessmentData = JSON.parse(dept.assessmentData);
                        if (Array.isArray(assessmentData)) {
                            assessmentData.forEach(item => {
                                if (item.itemName && item.itemResult) {
                                    content += `${item.itemName}：${item.itemResult}\n`;
                                }
                            });
                        }
                    } catch (e) {
                        console.error('解析评估数据失败:', e);
                        content += `${dept.assessmentData}\n`;
                    }
                }

                // 添加科室小结
                if (dept.summary) {
                    content += `科室小结：${dept.summary}\n`;
                }
            });
        }

        content += `\n**请生成一份完整的健康评估报告，包括：**\n`;
        content += `1. 健康状况总体评估\n`;
        content += `2. 各项指标分析\n`;
        content += `3. 异常指标提醒\n`;
        content += `4. 健康建议\n`;
        content += `5. 复查建议\n`;
        content += `6. 生活方式指导\n\n`;
        content += `请使用专业的医疗术语，同时确保内容通俗易懂，便于患者理解。`;

        return content;
    }

    /**
     * 生成Markdown格式的报告
     * @param {Object} healthData - 健康数据
     * @param {string} aiAnalysis - AI分析结果
     * @returns {string} Markdown格式报告
     */
    generateMarkdownReport(healthData, aiAnalysis) {
        const { customerName, medicalExamId, examDate } = healthData;

        let markdown = `# ${customerName} - 健康评估报告\n\n`;

        markdown += `## 基本信息\n\n`;
        markdown += `- **姓名**: ${customerName}\n`;
        markdown += `- **体检ID**: ${medicalExamId}\n`;
        markdown += `- **体检日期**: ${examDate}\n`;
        markdown += `- **评估生成时间**: ${new Date().toLocaleString('zh-CN')}\n\n`;

        markdown += `---\n\n`;

        markdown += `## AI健康评估分析\n\n`;
        markdown += aiAnalysis;

        markdown += `\n\n---\n\n`;
        markdown += `## 重要提示\n\n`;
        markdown += `1. 本健康评估报告基于AI算法生成，仅供参考，不能替代专业医生的诊断。\n`;
        markdown += `2. 如有健康问题，请及时咨询专业医疗机构。\n`;
        markdown += `3. 请根据医生建议进行定期复查和健康管理。\n\n`;

        markdown += `---\n\n`;
        markdown += `*报告生成时间: ${new Date().toLocaleString('zh-CN')}*\n`;
        markdown += `*Powered by DeepSeek AI*\n`;

        return markdown;
    }

    /**
     * 生成健康对比分析
     * @param {Object} comparisonData - 对比数据
     * @param {string} comparisonData.customerName - 客户姓名
     * @param {Array} comparisonData.exams - 体检记录数组
     * @returns {Promise<Object>} AI对比分析结果
     */
    async generateHealthComparison(comparisonData) {
        try {
            const startTime = Date.now();

            // 构建请求内容
            const requestContent = this.buildComparisonRequestContent(comparisonData);

            const requestData = {
                model: this.model,
                messages: [
                    {
                        role: "system",
                        content: `你是一位专业的医疗AI助手，专门负责分析多次体检报告并进行对比分析。请基于提供的多次体检数据，生成专业、详细、易懂的健康对比分析报告，重点关注健康趋势变化和需要关注的健康问题。

【重要格式要求】：
1. 直接输出报告正文内容，禁止使用任何对话式开头语句
2. 禁止出现「好的」「收到」「明白」「我已」「我来」「我将」等对话性词语作为开头
3. 报告应以标题或正式内容直接开始，如「### 健康对比分析报告」或直接描述分析结果
4. 保持专业医疗报告的正式文体风格
5. 表格中的体检数据必须按时间顺序从左到右排列（最早的体检在左边，最近的体检在右边）

【表格格式强制规范】：
1. 每个指标类别必须使用带编号的加粗标题，格式为：**1. 类别名称**、**2. 类别名称**
2. 表格标题行必须是列名，不能将指标类别名称放入表格第一行
3. 表格列结构固定为：| 指标 | 第1次体检 (日期) | 第2次体检 (日期) | ... | 趋势分析 |
4. 每个指标占一行，指标名称使用加粗格式如 **空腹血糖 (GLU)**
5. 异常值后面标注 **(异常)** 或使用 **↑**/**↓** 箭头标识

【表格示例】：
**1. 血糖与胰岛素相关指标**
| 指标 | 第1次体检 (2025-08-18) | 第2次体检 (2025-10-27) | 第3次体检 (2025-12-21) | 趋势分析 |
| :--- | :--- | :--- | :--- | :--- |
| **空腹血糖 (GLU)** | **7.28 mmol/L** (异常) | **6.50 mmol/L** (异常) | 6.03 mmol/L | **显著改善**。说明... |
| **糖化血红蛋白 (HbA1c)** | 5.5% | 5.3% | 5.8% | 基本稳定，说明... |

**2. 肿瘤标志物**
| 指标 | 第1次体检 | 第2次体检 | 第3次体检 | 趋势分析 |
| :--- | :--- | :--- | :--- | :--- |
| **糖类抗原72-4 (CA72-4)** | **11.9 U/ml** (异常) | **14.0 U/ml** (异常) | **16.1 U/ml** (异常) | **进行性升高**。说明... |`
                    },
                    {
                        role: "user",
                        content: requestContent
                    }
                ],
                max_tokens: 4000,
                temperature: 0.3,
                top_p: 0.95
            };

            const response = await axios.post(`${this.baseURL}/v1/chat/completions`, requestData, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 600000 // 10分钟超时
            });

            const processingTime = Math.round((Date.now() - startTime) / 1000);

            // 提取AI回复内容
            const aiResponse = response.data;
            const aiAnalysis = aiResponse.choices?.[0]?.message?.content || '';

            if (!aiAnalysis) {
                throw new Error('AI响应内容为空');
            }

            // 生成Markdown格式的对比报告
            const markdownContent = this.generateComparisonMarkdownReport(comparisonData, aiAnalysis);

            return {
                success: true,
                aiAnalysis,
                markdownContent,
                apiModel: this.model,
                apiTokenCount: aiResponse.usage?.total_tokens || 0,
                processingTime,
                apiRequest: JSON.stringify(requestData, null, 2),
                apiResponse: JSON.stringify(aiResponse, null, 2)
            };

        } catch (error) {
            console.error('DeepSeek对比分析API调用失败:', error);

            // 记录详细的错误信息
            let errorMessage = '生成健康对比分析失败';
            if (error.response) {
                errorMessage += `: ${error.response.data?.error?.message || error.response.statusText}`;
            } else if (error.request) {
                if (error.code === 'ECONNRESET') {
                    errorMessage = '连接被重置，可能是请求超时或网络问题，请重试';
                } else if (error.code === 'ETIMEDOUT') {
                    errorMessage = '请求超时，请检查网络连接或重试';
                } else {
                    errorMessage = '无法连接到DeepSeek服务，请检查网络配置';
                }
            } else {
                errorMessage = error.message;
            }

            return {
                success: false,
                error: errorMessage,
                processingTime: 0,
                apiTokenCount: 0
            };
        }
    }

    /**
     * 构建对比分析请求数据内容
     * @param {Object} comparisonData - 对比数据
     * @returns {string} 请求数据内容
     */
    buildComparisonRequestContent(comparisonData) {
        const { customerName, exams } = comparisonData;

        let content = `需要帮我根据这些体检报告生成一份健康对比分析。\\n\\n`;
        content += `**基本信息：**\\n`;
        content += `- 姓名：${customerName}\\n`;
        content += `- 体检记录数量：${exams.length}\\n\\n`;

        content += `**体检记录详情：**\\n`;

        exams.forEach((exam, index) => {
            content += `\\n### 第${index + 1}次体检 (ID: ${exam.medicalExamId})\\n`;
            content += `体检日期：${exam.examDate}\\n\\n`;

            if (exam.departments && exam.departments.length > 0) {
                exam.departments.forEach((dept, deptIndex) => {
                    content += `#### ${deptIndex + 1}. ${dept.department}\\n`;

                    if (dept.assessmentDate) {
                        content += `检查日期：${dept.assessmentDate}\\n`;
                    }

                    if (dept.doctor) {
                        content += `检查医生：${dept.doctor}\\n`;
                    }

                    // 解析AssessmentData JSON数据
                    if (dept.assessmentData) {
                        try {
                            const assessmentData = JSON.parse(dept.assessmentData);
                            if (Array.isArray(assessmentData)) {
                                assessmentData.forEach(item => {
                                    if (item.itemName && item.itemResult) {
                                        content += `${item.itemName}：${item.itemResult}\\n`;
                                    }
                                });
                            }
                        } catch (e) {
                            console.error('解析评估数据失败:', e);
                            content += `${dept.assessmentData}\\n`;
                        }
                    }

                    // 添加科室小结
                    if (dept.summary) {
                        content += `科室小结：${dept.summary}\\n`;
                    }
                    content += `\\n`;
                });
            }
        });

        content += `**请生成一份完整的健康对比分析报告，包括：**\n`;
        content += `1. 健康状况总体对比\n`;
        content += `2. 关键指标变化趋势分析（必须使用表格，按指标类别分组，每组表格前加编号标题如"**1. 血糖与胰岛素相关指标**"）\n`;
        content += `3. 新出现异常指标提醒\n`;
        content += `4. 改善或恶化的指标分析\n`;
        content += `5. 健康风险评估变化\n`;
        content += `6. 针对性健康建议\n`;
        content += `7. 复查和随访建议\n`;
        content += `8. 生活方式调整指导\n\n`;
        content += `【表格格式要求】：\n`;
        content += `- 将检验指标按类别分组（如：血糖相关、血脂相关、肝功能、肾功能、肿瘤标志物、性激素等）\n`;
        content += `- 每组表格前必须有带编号的加粗标题，如"**1. 血糖与胰岛素相关指标**"\n`;
        content += `- 表格第一行是列标题，不要把指标类别名称放在表格里\n`;
        content += `- 表格列结构：| 指标 | 第1次体检 (日期) | 第2次体检 (日期) | ... | 趋势分析 |\n`;
        content += `- 异常值标注"(异常)"或使用↑/↓箭头\n\n`;
        content += `请重点分析各次体检间的变化趋势，提供时间序列的健康洞察，使用专业的医疗术语，同时确保内容通俗易懂，便于患者理解。`;

        return content;
    }

    /**
     * 生成对比分析Markdown格式的报告
     * @param {Object} comparisonData - 对比数据
     * @param {string} aiAnalysis - AI分析结果
     * @returns {string} Markdown格式报告
     */
    generateComparisonMarkdownReport(comparisonData, aiAnalysis) {
        const { customerName, exams } = comparisonData;

        let markdown = `# ${customerName} - 健康对比分析报告\\n\\n`;

        markdown += `## 基本信息\\n\\n`;
        markdown += `- **姓名**: ${customerName}\\n`;
        markdown += `- **对比体检次数**: ${exams.length}\\n`;

        // 添加体检ID列表
        markdown += `- **对比体检ID**: `;
        markdown += exams.map((exam, index) => `第${index + 1}次: ${exam.medicalExamId}`).join(', ');
        markdown += `\\n`;

        // 添加体检日期列表
        markdown += `- **体检日期**: `;
        markdown += exams.map((exam, index) => `第${index + 1}次: ${exam.examDate}`).join(', ');
        markdown += `\\n`;

        markdown += `- **报告生成时间**: ${new Date().toLocaleString('zh-CN')}\\n\\n`;

        markdown += `---\\n\\n`;

        markdown += `## AI健康对比分析\\n\\n`;
        markdown += aiAnalysis;

        markdown += `\\n\\n---\\n\\n`;
        markdown += `## 重要提示\\n\\n`;
        markdown += `1. 本健康对比分析报告基于AI算法生成，仅供参考，不能替代专业医生的诊断。\\n`;
        markdown += `2. 如有健康问题，请及时咨询专业医疗机构。\\n`;
        markdown += `3. 请根据医生建议进行定期复查和健康管理。\\n`;
        markdown += `4. 对比分析基于历史体检数据，个体差异可能影响分析结果。\\n\\n`;

        markdown += `---\\n\\n`;
        markdown += `*报告生成时间: ${new Date().toLocaleString('zh-CN')}*\\n`;
        markdown += `*Powered by DeepSeek AI*\\n`;

        return markdown;
    }

    /**
     * 生成治疗总结报告
     * @param {Object} treatmentData - 治疗数据
     * @returns {Promise<Object>} AI分析结果
     */
    async generateTreatmentSummary(treatmentData) {
        try {
            const startTime = Date.now();

            // 构建请求内容
            const requestContent = this.buildTreatmentSummaryRequestContent(treatmentData);

            const requestData = {
                model: this.model,
                messages: [
                    {
                        role: "system",
                        content: `你是一位专业的医疗AI助手，专门负责分析干细胞治疗数据并生成治疗总结报告。请基于提供的治疗档案、输注记录、疗效评估等数据，生成专业、详细、易懂的治疗总结报告。

【重要格式要求】：
1. 直接输出报告正文内容，禁止使用任何对话式开头语句
2. 禁止出现「好的」「收到」「明白」「我已」「我来」「我将」等对话性词语作为开头
3. 报告应以标题或正式内容直接开始
4. 保持专业医疗报告的正式文体风格

【报告结构要求】：
1. 患者基本信息概述
2. 治疗方案总结
3. 治疗过程回顾（输注记录分析）
4. 疗效评估分析（症状改善、生活质量等）
5. 治疗效果总体评价
6. 不良反应及安全性评估
7. 后续治疗建议
8. 注意事项和随访计划`
                    },
                    {
                        role: "user",
                        content: requestContent
                    }
                ],
                max_tokens: 4000,
                temperature: 0.3,
                top_p: 0.95
            };

            const response = await axios.post(`${this.baseURL}/v1/chat/completions`, requestData, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 600000
            });

            const processingTime = Math.round((Date.now() - startTime) / 1000);
            const aiResponse = response.data;
            const aiAnalysis = aiResponse.choices?.[0]?.message?.content || '';

            if (!aiAnalysis) {
                throw new Error('AI响应内容为空');
            }

            const markdownContent = this.generateTreatmentSummaryMarkdownReport(treatmentData, aiAnalysis);

            return {
                success: true,
                aiAnalysis,
                markdownContent,
                apiModel: this.model,
                apiTokenCount: aiResponse.usage?.total_tokens || 0,
                processingTime,
                apiRequest: JSON.stringify(requestData, null, 2),
                apiResponse: JSON.stringify(aiResponse, null, 2)
            };

        } catch (error) {
            console.error('DeepSeek治疗总结API调用失败:', error);

            let errorMessage = '生成治疗总结失败';
            if (error.response) {
                errorMessage += `: ${error.response.data?.error?.message || error.response.statusText}`;
            } else if (error.request) {
                if (error.code === 'ECONNRESET') {
                    errorMessage = '连接被重置，可能是请求超时或网络问题，请重试';
                } else if (error.code === 'ETIMEDOUT') {
                    errorMessage = '请求超时，请检查网络连接或重试';
                } else {
                    errorMessage = '无法连接到DeepSeek服务，请检查网络配置';
                }
            } else {
                errorMessage = error.message;
            }

            return {
                success: false,
                error: errorMessage,
                processingTime: 0,
                apiTokenCount: 0
            };
        }
    }

    /**
     * 构建治疗总结请求数据内容
     */
    buildTreatmentSummaryRequestContent(treatmentData) {
        const { customerName, patientNumber, primaryDiagnosis, patientInfo, infusionRecords, effectivenessRecords, treatmentHistory } = treatmentData;

        let content = `需要帮我根据这份干细胞治疗档案生成一份治疗总结报告。\n\n`;
        content += `**患者基本信息：**\n`;
        content += `- 姓名：${customerName}\n`;
        content += `- 患者编号：${patientNumber}\n`;
        content += `- 主要诊断：${primaryDiagnosis}\n`;
        
        if (patientInfo) {
            if (patientInfo.gender) content += `- 性别：${patientInfo.gender}\n`;
            if (patientInfo.age) content += `- 年龄：${patientInfo.age}岁\n`;
            if (patientInfo.treatmentPlan) content += `- 治疗方案：${patientInfo.treatmentPlan}\n`;
            if (patientInfo.registrationDate) content += `- 登记日期：${patientInfo.registrationDate}\n`;
            if (patientInfo.status) content += `- 当前状态：${patientInfo.status}\n`;
        }

        // 输注记录
        if (infusionRecords && infusionRecords.length > 0) {
            content += `\n**输注记录（共${infusionRecords.length}次）：**\n`;
            infusionRecords.forEach((record, index) => {
                content += `\n### 第${index + 1}次输注\n`;
                content += `- 输注日期：${record.scheduleDate || '未知'}\n`;
                content += `- 输注次数：第${record.infusionCount || index + 1}次\n`;
                if (record.treatmentType) content += `- 治疗类型：${record.treatmentType}\n`;
                if (record.doctor) content += `- 主治医生：${record.doctor}\n`;
                if (record.status) content += `- 状态：${record.status}\n`;
                if (record.notes) content += `- 备注：${record.notes}\n`;
            });
        }

        // 疗效评估记录
        if (effectivenessRecords && effectivenessRecords.length > 0) {
            content += `\n**疗效评估记录（共${effectivenessRecords.length}次）：**\n`;
            effectivenessRecords.forEach((record, index) => {
                content += `\n### 第${index + 1}次疗效评估\n`;
                content += `- 评估日期：${record.assessmentDate || '未知'}\n`;
                content += `- 评估阶段：${record.assessmentPeriod || '未知'}\n`;
                content += `- 疗效类型：${record.effectivenessType || '未知'}\n`;
                if (record.overallEffectiveness) content += `- 总体疗效评分：${record.overallEffectiveness}\n`;
                if (record.symptomImprovement) content += `- 症状改善评分：${record.symptomImprovement}\n`;
                if (record.qualityOfLifeImprovement) content += `- 生活质量改善评分：${record.qualityOfLifeImprovement}\n`;
                if (record.doctorAssessment) content += `- 医生评估：${record.doctorAssessment}\n`;
                if (record.patientFeedback) content += `- 患者反馈：${record.patientFeedback}\n`;
                if (record.patientSatisfaction) content += `- 患者满意度：${record.patientSatisfaction}/5\n`;
                if (record.sideEffects) content += `- 不良反应：${record.sideEffects}\n`;
                if (record.doctorId) content += `- 评估医生：${record.doctorId}\n`;
            });
        }

        // 治疗历史
        if (treatmentHistory && treatmentHistory.length > 0) {
            content += `\n**治疗历史记录（共${treatmentHistory.length}条）：**\n`;
            treatmentHistory.forEach((record, index) => {
                content += `\n### 记录${index + 1}\n`;
                content += `- 事件日期：${record.date || '未知'}\n`;
                content += `- 事件类型：${record.eventType || '未知'}\n`;
                content += `- 事件标题：${record.title || '未知'}\n`;
                if (record.description) content += `- 事件描述：${record.description}\n`;
                if (record.response) content += `- 治疗响应：${record.response}\n`;
                if (record.doctor) content += `- 主治医生：${record.doctor}\n`;
                if (record.adverseEvents) content += `- 不良事件：${record.adverseEvents}\n`;
            });
        }

        content += `\n**请生成一份完整的治疗总结报告，包括：**\n`;
        content += `1. 患者基本信息概述\n`;
        content += `2. 治疗方案总结\n`;
        content += `3. 治疗过程回顾（输注记录分析）\n`;
        content += `4. 疗效评估分析（症状改善、生活质量等）\n`;
        content += `5. 治疗效果总体评价\n`;
        content += `6. 不良反应及安全性评估\n`;
        content += `7. 后续治疗建议\n`;
        content += `8. 注意事项和随访计划\n\n`;
        content += `请使用专业的医疗术语，同时确保内容通俗易懂，便于患者和家属理解。`;

        return content;
    }

    /**
     * 生成治疗总结Markdown格式的报告
     */
    generateTreatmentSummaryMarkdownReport(treatmentData, aiAnalysis) {
        const { customerName, patientNumber, primaryDiagnosis, infusionRecords, effectivenessRecords } = treatmentData;

        let markdown = `# ${customerName} - 干细胞治疗总结报告\n\n`;
        markdown += `## 基本信息\n\n`;
        markdown += `- **姓名**: ${customerName}\n`;
        markdown += `- **患者编号**: ${patientNumber}\n`;
        markdown += `- **主要诊断**: ${primaryDiagnosis}\n`;
        markdown += `- **输注次数**: ${infusionRecords?.length || 0}次\n`;
        markdown += `- **疗效评估次数**: ${effectivenessRecords?.length || 0}次\n`;
        markdown += `- **报告生成时间**: ${new Date().toLocaleString('zh-CN')}\n\n`;
        markdown += `---\n\n`;
        markdown += `## AI治疗总结分析\n\n`;
        markdown += aiAnalysis;
        markdown += `\n\n---\n\n`;
        markdown += `## 重要提示\n\n`;
        markdown += `1. 本治疗总结报告基于AI算法生成，仅供参考，不能替代专业医生的诊断。\n`;
        markdown += `2. 如有健康问题，请及时咨询专业医疗机构。\n`;
        markdown += `3. 请根据医生建议进行后续治疗和定期复查。\n`;
        markdown += `4. 治疗效果因人而异，请遵医嘱进行个性化治疗。\n\n`;
        markdown += `---\n\n`;
        markdown += `*报告生成时间: ${new Date().toLocaleString('zh-CN')}*\n`;
        markdown += `*Powered by DeepSeek AI*\n`;

        return markdown;
    }

    /**
     * 检查API配置
     * @returns {boolean} API是否配置正确
     */
    isConfigured() {
        return !!this.apiKey;
    }
}

module.exports = new DeepSeekService();