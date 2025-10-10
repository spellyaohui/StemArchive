const axios = require('axios');

class PDFService {
    constructor() {
        // 支持两种配置方式：
        // 1. 使用完整的PDF_CONVERT_URL
        // 2. 分别配置PDF_HOST和PDF_PORT
        if (process.env.PDF_CONVERT_URL) {
            this.pdfConvertUrl = process.env.PDF_CONVERT_URL;
        } else {
            const host = process.env.PDF_HOST || 'localhost';
            const port = process.env.PDF_PORT || '4000';
            this.pdfConvertUrl = `http://${host}:${port}/convert`;
        }

        this.timeout = parseInt(process.env.PDF_CONVERT_TIMEOUT || '30000');

        // 验证配置
        this.validateConfiguration();
    }

    // 验证配置
    validateConfiguration() {
        if (!this.pdfConvertUrl) {
            console.warn('PDF转换服务URL未配置，请检查环境变量 PDF_CONVERT_URL');
        }
    }

    /**
     * 将Markdown转换为PDF
     * @param {string} markdownContent - Markdown内容
     * @returns {Promise<Object>} 转换结果
     */
    async convertMarkdownToPDF(markdownContent) {
        try {
            const startTime = Date.now();

            const requestData = {
                markdown: markdownContent
            };

            const response = await axios.post(this.pdfConvertUrl, requestData, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: this.timeout
            });

            const processingTime = Math.round((Date.now() - startTime) / 1000);

            if (response.data && response.data.pdfBase64) {
                return {
                    success: true,
                    pdfData: response.data.pdfBase64, // Base64编码的PDF数据
                    processingTime,
                    message: 'PDF转换成功'
                };
            } else {
                console.error('PDF转换响应数据:', response.data);
                throw new Error('PDF转换响应格式错误：缺少pdfBase64字段');
            }

        } catch (error) {
            console.error('PDF转换失败:', error);

            let errorMessage = 'PDF转换失败';
            if (error.response) {
                errorMessage += `: ${error.response.data?.message || error.response.statusText}`;
            } else if (error.request) {
                if (error.code === 'ECONNRESET') {
                    errorMessage = 'PDF转换服务连接被重置，请检查服务状态';
                } else if (error.code === 'ETIMEDOUT') {
                    errorMessage = 'PDF转换超时，请稍后重试';
                } else if (error.code === 'ENOTFOUND') {
                    errorMessage = 'PDF转换服务未启动，请确保服务运行在 ' + this.pdfConvertUrl;
                } else {
                    errorMessage = '无法连接到PDF转换服务';
                }
            } else {
                errorMessage = error.message;
            }

            return {
                success: false,
                error: errorMessage,
                processingTime: 0
            };
        }
    }

    /**
     * 检查PDF转换服务是否可用
     * @returns {Promise<boolean>} 服务是否可用
     */
    async isServiceAvailable() {
        try {
            // 使用基础URL检查服务状态，而不是转换端点
            const baseUrl = this.pdfConvertUrl.replace('/convert', '');
            const response = await axios.get(baseUrl, {
                timeout: 5000 // 短超时时间检查服务状态
            });
            return response.status === 200;
        } catch (error) {
            return false;
        }
    }

    /**
     * 下载PDF文件到本地
     * @param {string} base64Data - Base64编码的PDF数据
     * @param {string} filename - 文件名
     */
    downloadPDF(base64Data, filename) {
        try {
            // 将Base64数据转换为Blob
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            const blob = new Blob([bytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);

            // 创建下载链接
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;

            // 兼容不同浏览器
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // 清理URL对象
            setTimeout(() => {
                URL.revokeObjectURL(url);
            }, 100);

            return true;
        } catch (error) {
            console.error('下载PDF失败:', error);
            return false;
        }
    }
}

module.exports = new PDFService();