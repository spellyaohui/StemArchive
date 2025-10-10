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
                        content: "你是一位专业的医疗AI助手，专门负责分析体检报告并生成健康评估。请基于提供的体检数据，生成专业、详细、易懂的健康评估报告。"
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
                        content: "你是一位专业的医疗AI助手，专门负责分析多次体检报告并进行对比分析。请基于提供的多次体检数据，生成专业、详细、易懂的健康对比分析报告，重点关注健康趋势变化和需要关注的健康问题。"
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

        content += `**请生成一份完整的健康对比分析报告，包括：**\\n`;
        content += `1. 健康状况总体对比\\n`;
        content += `2. 关键指标变化趋势分析\\n`;
        content += `3. 新出现异常指标提醒\\n`;
        content += `4. 改善或恶化的指标分析\\n`;
        content += `5. 健康风险评估变化\\n`;
        content += `6. 针对性健康建议\\n`;
        content += `7. 复查和随访建议\\n`;
        content += `8. 生活方式调整指导\n`;
        content += `9. 检验数据请使用表格方式展现，清晰对比各次检查结果\n\n`;
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
     * 检查API配置
     * @returns {boolean} API是否配置正确
     */
    isConfigured() {
        return !!this.apiKey;
    }
}

module.exports = new DeepSeekService();