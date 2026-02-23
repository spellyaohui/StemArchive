/**
 * 体检数据自动导入服务
 * 整合各科室数据获取和导入逻辑
 * 支持批量导入和容错处理
 */

const { executeQuery } = require('../../config/database');
const departmentCodeService = require('./departmentCodeService');
const thirdPartyExaminationService = require('./thirdPartyExaminationService');

/**
 * 将对象参数转换为executeQuery需要的数组格式
 * @param {Object} params - 参数对象 {key: value}
 * @returns {Array} 参数数组 [{name, value}]
 */
function toParamsArray(params) {
    return Object.entries(params).map(([name, value]) => ({ name, value }));
}

class ExaminationDataImportService {
    constructor() {
        console.log('体检数据导入服务初始化完成 - 数据源: 第三方只读数据库');
    }

    /**
     * 根据身份证号自动导入所有体检数据
     * @param {string} identityCard - 身份证号
     * @param {string} customerId - 客户ID
     * @param {Array<string>} selectedExamIds - 选中的体检ID列表（可选，为空则导入全部）
     * @returns {Promise<Object>} 导入结果
     */
    async importAllExaminationData(identityCard, customerId, selectedExamIds = null) {
        const result = {
            success: true,
            totalExamIds: 0,
            processedExamIds: 0,
            departments: {
                processed: [],
                skipped: [],
                empty: [],
                failed: []
            },
            details: [],
            message: ''
        };

        try {
            // 1. 获取体检ID列表
            let examIds = await departmentCodeService.getExaminationIds(identityCard);
            
            if (!examIds || examIds.length === 0) {
                result.success = false;
                result.message = '未找到该身份证号对应的体检记录';
                return result;
            }

            // 如果指定了选中的体检ID，则只处理选中的
            if (selectedExamIds && selectedExamIds.length > 0) {
                examIds = examIds.filter(id => selectedExamIds.includes(id));
            }

            result.totalExamIds = examIds.length;
            console.log(`📋 开始处理 ${examIds.length} 个体检记录...`);

            // 2. 获取系统中的科室列表
            const systemDepartments = await this.getSystemDepartments();
            console.log(`📋 系统中共有 ${systemDepartments.length} 个科室`);

            // 3. 逐个处理体检ID
            for (const examId of examIds) {
                const examResult = await this.processExamination(examId, customerId, systemDepartments);
                result.details.push({
                    examId,
                    ...examResult
                });
                
                // 合并统计数据
                result.departments.processed.push(...examResult.processed);
                result.departments.skipped.push(...examResult.skipped);
                result.departments.empty.push(...examResult.empty);
                result.departments.failed.push(...examResult.failed);
                
                result.processedExamIds++;
            }

            // 4. 生成汇总消息
            const processedCount = result.departments.processed.length;
            const skippedCount = result.departments.skipped.length;
            const emptyCount = result.departments.empty.length;
            const failedCount = result.departments.failed.length;

            result.message = `导入完成！处理了 ${result.processedExamIds} 个体检记录，` +
                `成功导入 ${processedCount} 个科室数据，` +
                `跳过 ${skippedCount} 个未知科室，` +
                `${emptyCount} 个科室无数据，` +
                `${failedCount} 个科室导入失败`;

            console.log(`✅ ${result.message}`);

        } catch (error) {
            console.error('❌ 体检数据导入失败:', error);
            result.success = false;
            result.message = `导入失败: ${error.message}`;
        }

        return result;
    }

    /**
     * 处理单个体检记录
     * @param {string} examId - 体检ID
     * @param {string} customerId - 客户ID
     * @param {Array} systemDepartments - 系统科室列表
     * @returns {Promise<Object>} 处理结果
     */
    async processExamination(examId, customerId, systemDepartments) {
        const result = {
            processed: [],
            skipped: [],
            empty: [],
            failed: []
        };

        try {
            // 1. 获取该体检ID的科室编码
            const departmentCodes = await departmentCodeService.getDepartmentCodes(examId);
            
            if (!departmentCodes || departmentCodes.length === 0) {
                console.log(`⚠️ 体检ID ${examId} 未找到科室编码`);
                return result;
            }

            console.log(`📋 体检ID ${examId} 包含 ${departmentCodes.length} 个科室: [${departmentCodes.join(', ')}]`);

            // 2. 获取体检日期
            const examDate = await this.getExaminationDate(examId);

            // 3. 逐个处理科室
            for (const code of departmentCodes) {
                try {
                    // 检查科室是否存在于系统中
                    const department = systemDepartments.find(d => d.DepartmentCode === code);
                    
                    if (!department) {
                        // 科室不存在，跳过但记录
                        result.skipped.push({
                            examId,
                            code,
                            reason: '系统中不存在此科室编码'
                        });
                        console.log(`⚠️ 跳过未知科室编码: ${code}`);
                        continue;
                    }

                    // 获取科室数据
                    const departmentData = await this.fetchDepartmentData(examId, code, department.DepartmentType);
                    
                    // 检查数据是否为空
                    if (this.isEmptyData(departmentData, department.DepartmentType)) {
                        result.empty.push({
                            examId,
                            code,
                            departmentName: department.DepartmentName,
                            reason: '该科室无检查数据'
                        });
                        console.log(`ℹ️ 科室 ${code} (${department.DepartmentName}) 无数据，跳过`);
                        continue;
                    }

                    // 导入数据
                    const importResult = await this.importDepartmentData(
                        examId, 
                        customerId, 
                        department, 
                        departmentData, 
                        examDate
                    );

                    result.processed.push({
                        examId,
                        code,
                        departmentName: department.DepartmentName,
                        departmentType: department.DepartmentType,
                        dataCount: importResult.count
                    });
                    console.log(`✅ 科室 ${code} (${department.DepartmentName}) 成功导入 ${importResult.count} 条记录`);

                } catch (error) {
                    result.failed.push({
                        examId,
                        code,
                        error: error.message
                    });
                    console.log(`❌ 科室 ${code} 数据获取/导入失败: ${error.message}`);
                }
            }

        } catch (error) {
            console.error(`❌ 处理体检ID ${examId} 失败:`, error);
        }

        return result;
    }

    /**
     * 获取系统中的科室列表
     * @returns {Promise<Array>} 科室列表
     */
    async getSystemDepartments() {
        try {
            const result = await executeQuery(`
                SELECT DepartmentID, DepartmentCode, DepartmentName, DepartmentType
                FROM Departments
                WHERE IsActive = 1
            `, []);
            return result || [];
        } catch (error) {
            console.error('获取系统科室列表失败:', error);
            return [];
        }
    }

    /**
     * 获取体检日期
     * @param {string} examId - 体检ID
     * @returns {Promise<string|null>} 体检日期
     */
    async getExaminationDate(examId) {
        try {
            return await thirdPartyExaminationService.getExaminationDate(examId);
        } catch (error) {
            console.warn(`获取体检日期失败: ${error.message}`);
            return null;
        }
    }

    /**
     * 根据科室类型获取数据
     * @param {string} examId - 体检ID
     * @param {string} code - 科室编码
     * @param {string} departmentType - 科室类型
     * @returns {Promise<Object>} API响应数据
     */
    async fetchDepartmentData(examId, code, departmentType) {
        switch (departmentType) {
            case 'laboratory':
                return thirdPartyExaminationService.queryLaboratory(examId);
            case 'general':
                return thirdPartyExaminationService.queryGeneral(examId, code);
            case 'imaging':
                return thirdPartyExaminationService.queryImaging(examId, code);
            case 'instrument':
                return thirdPartyExaminationService.queryInstrument(examId, code);
            default:
                throw new Error(`不支持的科室类型: ${departmentType}`);
        }
    }

    /**
     * 检查数据是否为空
     * @param {Object} apiResponse - API响应
     * @param {string} departmentType - 科室类型
     * @returns {boolean} 是否为空数据
     */
    isEmptyData(apiResponse, departmentType) {
        // 检查API响应基本结构
        if (!apiResponse || apiResponse.code !== 200) {
            return true;
        }

        const data = apiResponse.data;

        // 检查数据是否为空
        if (!data || (Array.isArray(data) && data.length === 0)) {
            return true;
        }

        // 如果是数组，检查是否所有记录都是空的
        if (Array.isArray(data)) {
            return data.every(record => this.isEmptyRecord(record, departmentType));
        }

        // 如果是单个对象，检查是否为空记录
        return this.isEmptyRecord(data, departmentType);
    }

    /**
     * 检查单条记录是否为空
     * @param {Object} record - 数据记录
     * @param {string} departmentType - 科室类型
     * @returns {boolean} 是否为空记录
     */
    isEmptyRecord(record, departmentType) {
        if (!record || typeof record !== 'object') {
            return true;
        }

        // 根据科室类型检查关键字段
        switch (departmentType) {
            case 'laboratory':
                // 检验科：除了StudyID外，应该有检验项目和结果
                return Object.keys(record).filter(key => 
                    key !== 'StudyID' && 
                    record[key] !== null && 
                    record[key] !== undefined && 
                    record[key] !== ''
                ).length === 0;
                
            case 'imaging':
                // 影像科：应该有检查描述或检查结论
                return !record['检查描述'] && !record['检查结论'] && !record['影像所见'];
                
            case 'general':
                // 常规科室：应该有评估内容
                const hasContent = Object.keys(record).some(key => 
                    key !== 'StudyID' && 
                    key !== '小结' && 
                    key !== '其他' &&
                    record[key] && 
                    String(record[key]).trim() !== ''
                );
                return !hasContent;
                
            case 'instrument':
                // 仪器室：应该有检查结果
                return !record['检查结果'] && !record['测试结果'] && !record['检测值'];
                
            default:
                // 默认检查：除StudyID外有任何非空字段就认为有数据
                return Object.keys(record).filter(key => 
                    key !== 'StudyID' && 
                    record[key] !== null && 
                    record[key] !== undefined && 
                    record[key] !== ''
                ).length === 0;
        }
    }

    /**
     * 导入科室数据到数据库
     * @param {string} examId - 体检ID
     * @param {string} customerId - 客户ID
     * @param {Object} department - 科室信息
     * @param {Object} apiResponse - API响应数据
     * @param {string} examDate - 体检日期
     * @returns {Promise<Object>} 导入结果
     */
    async importDepartmentData(examId, customerId, department, apiResponse, examDate) {
        const data = apiResponse.data;
        // 医生字段可能在响应根级别（常规科室API返回格式）
        const doctor = apiResponse['医生'] || apiResponse.doctor || '';
        let count = 0;

        try {
            switch (department.DepartmentType) {
                case 'laboratory':
                    count = await this.importLaboratoryData(examId, customerId, data, examDate);
                    break;
                case 'general':
                    count = await this.importGeneralData(examId, customerId, department, data, examDate, doctor);
                    break;
                case 'imaging':
                    count = await this.importImagingData(examId, customerId, department, data, examDate, doctor);
                    break;
                case 'instrument':
                    count = await this.importInstrumentData(examId, customerId, department, data, examDate, doctor);
                    break;
                default:
                    console.warn(`⚠️ 不支持的科室类型: ${department.DepartmentType}`);
            }
        } catch (error) {
            console.error(`❌ 导入${department.DepartmentName}数据失败:`, error);
            throw error;
        }

        return { count };
    }


    /**
     * 导入检验科数据
     * @param {string} examId - 体检ID
     * @param {string} customerId - 客户ID
     * @param {Array} data - 检验数据
     * @param {string} examDate - 体检日期
     * @returns {Promise<number>} 导入记录数
     */
    async importLaboratoryData(examId, customerId, data, examDate) {
        if (!Array.isArray(data) || data.length === 0) {
            console.log(`⚠️ 检验科数据为空或格式不正确`);
            return 0;
        }

        console.log(`📋 开始导入检验科数据，共 ${data.length} 条记录`);
        let count = 0;

        for (const item of data) {
            try {
                // API返回字段: SFXMMC(收费项目名称), XXMC(细项名称), CheckDate, CheckTime, ItemResult, ItemUnit, Flag, DefValue, Doctor
                const itemName = item.XXMC || item.SFXMMC || '';
                
                if (!itemName) {
                    console.log(`⚠️ 跳过无名称的检验项目`);
                    continue;
                }

                // 检查是否已存在
                const existCheck = await executeQuery(`
                    SELECT COUNT(*) as count FROM LaboratoryData 
                    WHERE CustomerID = @customerId AND ExamId = @examId AND ItemName = @itemName
                `, toParamsArray({
                    customerId,
                    examId,
                    itemName
                }));

                if (existCheck && existCheck[0] && existCheck[0].count > 0) {
                    console.log(`ℹ️ 检验项目已存在，跳过: ${itemName}`);
                    continue;
                }

                // 解析日期 - 优先使用API返回的CheckDate
                let checkDate = item.CheckDate || examDate || new Date().toISOString().split('T')[0];
                // 确保日期格式正确
                if (checkDate && checkDate.includes(' ')) {
                    checkDate = checkDate.split(' ')[0];
                }

                // 解析异常标记 - API返回的Flag是数字: 0=正常, 1=偏低, 2=偏高
                // 数据库约束: 0=正常, 1=偏低, 2=偏高
                let abnormalFlag = 0;
                if (item.Flag !== undefined && item.Flag !== null) {
                    const flag = Number(item.Flag);
                    if (flag === 2 || item.Flag === 'H' || item.Flag === '↑' || item.Flag === '偏高') {
                        abnormalFlag = 2;  // 偏高
                    } else if (flag === 1 || item.Flag === 'L' || item.Flag === '↓' || item.Flag === '偏低') {
                        abnormalFlag = 1;  // 偏低
                    }
                }

                // 插入数据 - 注意: DefValue是参考值字段
                await executeQuery(`
                    INSERT INTO LaboratoryData (
                        ID, CustomerID, ExamId, CheckDate, TestCategory, ItemName, 
                        ItemResult, ItemUnit, ReferenceValue, AbnormalFlag, 
                        Doctor, Department, Status, CreatedAt
                    ) VALUES (
                        NEWID(), @customerId, @examId, @checkDate, @testCategory, @itemName,
                        @itemResult, @itemUnit, @referenceValue, @abnormalFlag,
                        @doctor, @department, @status, GETDATE()
                    )
                `, toParamsArray({
                    customerId,
                    examId,
                    checkDate,
                    testCategory: item.SFXMMC || '检验科',
                    itemName,
                    itemResult: item.ItemResult || '',
                    itemUnit: item.ItemUnit || '',
                    referenceValue: item.DefValue || '',  // 修正: DefValue是参考值
                    abnormalFlag,
                    doctor: item.Doctor || '',
                    department: '检验科',
                    status: 'Active'
                }));

                count++;
                console.log(`✅ 导入检验项目: ${itemName} = ${item.ItemResult} ${item.ItemUnit || ''}`);
            } catch (error) {
                console.error(`❌ 导入检验项目失败: ${item.XXMC || item.SFXMMC}`, error.message);
            }
        }

        console.log(`📋 检验科数据导入完成，成功 ${count} 条`);
        return count;
    }

    /**
     * 导入常规科室数据
     * @param {string} examId - 体检ID
     * @param {string} customerId - 客户ID
     * @param {Object} department - 科室信息
     * @param {Object} apiData - API响应数据（包含data数组和医生字段）
     * @param {string} examDate - 体检日期
     * @param {string} doctor - 医生姓名（从API响应根级别获取）
     * @returns {Promise<number>} 导入记录数
     */
    async importGeneralData(examId, customerId, department, apiData, examDate, doctor = '') {
        // apiData 可能是数组（直接传入）或包含 data 字段的对象
        const data = Array.isArray(apiData) ? apiData : (apiData.data || apiData);
        
        if (!Array.isArray(data) || data.length === 0) {
            console.log(`⚠️ 常规科室 ${department.DepartmentName} 数据为空`);
            return 0;
        }

        console.log(`📋 开始导入常规科室数据: ${department.DepartmentName}，共 ${data.length} 条记录`);
        let count = 0;

        for (const record of data) {
            try {
                // 检查是否已存在
                const existCheck = await executeQuery(`
                    SELECT COUNT(*) as count FROM HealthAssessments 
                    WHERE CustomerID = @customerId AND MedicalExamID = @examId AND Department = @department
                `, toParamsArray({
                    customerId,
                    examId,
                    department: department.DepartmentName
                }));

                if (existCheck && existCheck[0] && existCheck[0].count > 0) {
                    console.log(`ℹ️ 常规科室数据已存在，跳过: ${department.DepartmentName}`);
                    continue;
                }

                // 构建评估内容JSON - 排除StudyID等非数据字段
                const assessmentContent = {};
                let summary = '';
                Object.keys(record).forEach(key => {
                    if (key !== 'StudyID' && record[key] !== null && record[key] !== '') {
                        assessmentContent[key] = record[key];
                        if (key === '小结' || key === '结论') {
                            summary = record[key];
                        }
                    }
                });

                // 解析日期
                let assessmentDate = examDate || new Date().toISOString().split('T')[0];
                if (assessmentDate && assessmentDate.includes(' ')) {
                    assessmentDate = assessmentDate.split(' ')[0];
                }

                // 插入数据 - 医生字段优先使用传入的doctor参数
                await executeQuery(`
                    INSERT INTO HealthAssessments (
                        ID, CustomerID, MedicalExamID, ExamId, AssessmentDate, Department,
                        Doctor, AssessmentData, Summary, Status, CreatedAt
                    ) VALUES (
                        NEWID(), @customerId, @medicalExamId, @examId, @assessmentDate, @department,
                        @doctor, @assessmentData, @summary, @status, GETDATE()
                    )
                `, toParamsArray({
                    customerId,
                    medicalExamId: examId,
                    examId,
                    assessmentDate,
                    department: department.DepartmentName,
                    doctor: doctor || record['医生'] || record['Doctor'] || '',
                    assessmentData: JSON.stringify(assessmentContent),
                    summary: summary || '',
                    status: 'Active'
                }));

                count++;
                console.log(`✅ 导入常规科室: ${department.DepartmentName}`);
            } catch (error) {
                console.error(`❌ 导入常规科室数据失败: ${department.DepartmentName}`, error.message);
            }
        }

        console.log(`📋 常规科室 ${department.DepartmentName} 导入完成，成功 ${count} 条`);
        return count;
    }

    /**
     * 导入影像科室数据
     * @param {string} examId - 体检ID
     * @param {string} customerId - 客户ID
     * @param {Object} department - 科室信息
     * @param {Array} data - 影像数据
     * @param {string} examDate - 体检日期
     * @param {string} doctor - 医生姓名
     * @returns {Promise<number>} 导入记录数
     */
    async importImagingData(examId, customerId, department, data, examDate, doctor = '') {
        if (!Array.isArray(data) || data.length === 0) {
            console.log(`⚠️ 影像科室 ${department.DepartmentName} 数据为空`);
            return 0;
        }

        console.log(`📋 开始导入影像科室数据: ${department.DepartmentName}，共 ${data.length} 条记录`);
        let count = 0;

        for (const record of data) {
            try {
                // 检查是否已存在
                const existCheck = await executeQuery(`
                    SELECT COUNT(*) as count FROM HealthAssessments 
                    WHERE CustomerID = @customerId AND MedicalExamID = @examId AND Department = @department
                `, toParamsArray({
                    customerId,
                    examId,
                    department: department.DepartmentName
                }));

                if (existCheck && existCheck[0] && existCheck[0].count > 0) {
                    console.log(`ℹ️ 影像科室数据已存在，跳过: ${department.DepartmentName}`);
                    continue;
                }

                // 构建评估内容JSON
                const assessmentContent = {
                    检查描述: record['检查描述'] || '',
                    检查结论: record['检查结论'] || '',
                    影像所见: record['影像所见'] || ''
                };

                // 解析日期
                let assessmentDate = examDate || new Date().toISOString().split('T')[0];
                if (assessmentDate && assessmentDate.includes(' ')) {
                    assessmentDate = assessmentDate.split(' ')[0];
                }

                // 插入数据
                await executeQuery(`
                    INSERT INTO HealthAssessments (
                        ID, CustomerID, MedicalExamID, ExamId, AssessmentDate, Department,
                        Doctor, AssessmentData, Summary, Status, CreatedAt
                    ) VALUES (
                        NEWID(), @customerId, @medicalExamId, @examId, @assessmentDate, @department,
                        @doctor, @assessmentData, @summary, @status, GETDATE()
                    )
                `, toParamsArray({
                    customerId,
                    medicalExamId: examId,
                    examId,
                    assessmentDate,
                    department: department.DepartmentName,
                    doctor: doctor || record['Doctor'] || record['医生'] || '',
                    assessmentData: JSON.stringify(assessmentContent),
                    summary: record['检查结论'] || '',
                    status: 'Active'
                }));

                count++;
                console.log(`✅ 导入影像科室: ${department.DepartmentName}`);
            } catch (error) {
                console.error(`❌ 导入影像科室数据失败: ${department.DepartmentName}`, error.message);
            }
        }

        console.log(`📋 影像科室 ${department.DepartmentName} 导入完成，成功 ${count} 条`);
        return count;
    }

    /**
     * 导入仪器室数据
     * @param {string} examId - 体检ID
     * @param {string} customerId - 客户ID
     * @param {Object} department - 科室信息
     * @param {Array} data - 仪器室数据
     * @param {string} examDate - 体检日期
     * @param {string} doctor - 医生姓名
     * @returns {Promise<number>} 导入记录数
     */
    async importInstrumentData(examId, customerId, department, data, examDate, doctor = '') {
        if (!Array.isArray(data) || data.length === 0) {
            console.log(`⚠️ 仪器室 ${department.DepartmentName} 数据为空`);
            return 0;
        }

        console.log(`📋 开始导入仪器室数据: ${department.DepartmentName}，共 ${data.length} 条记录`);
        let count = 0;

        for (const record of data) {
            try {
                // 检查是否已存在
                const existCheck = await executeQuery(`
                    SELECT COUNT(*) as count FROM HealthAssessments 
                    WHERE CustomerID = @customerId AND MedicalExamID = @examId AND Department = @department
                `, toParamsArray({
                    customerId,
                    examId,
                    department: department.DepartmentName
                }));

                if (existCheck && existCheck[0] && existCheck[0].count > 0) {
                    console.log(`ℹ️ 仪器室数据已存在，跳过: ${department.DepartmentName}`);
                    continue;
                }

                // 构建评估内容JSON
                const assessmentContent = {
                    检查结果: record['检查结果'] || '',
                    测试结果: record['测试结果'] || '',
                    检测值: record['检测值'] || ''
                };

                // 解析日期
                let assessmentDate = examDate || new Date().toISOString().split('T')[0];
                if (assessmentDate && assessmentDate.includes(' ')) {
                    assessmentDate = assessmentDate.split(' ')[0];
                }

                // 插入数据
                await executeQuery(`
                    INSERT INTO HealthAssessments (
                        ID, CustomerID, MedicalExamID, ExamId, AssessmentDate, Department,
                        Doctor, AssessmentData, Summary, Status, CreatedAt
                    ) VALUES (
                        NEWID(), @customerId, @medicalExamId, @examId, @assessmentDate, @department,
                        @doctor, @assessmentData, @summary, @status, GETDATE()
                    )
                `, toParamsArray({
                    customerId,
                    medicalExamId: examId,
                    examId,
                    assessmentDate,
                    department: department.DepartmentName,
                    doctor: doctor || record['Doctor'] || record['医生'] || '',
                    assessmentData: JSON.stringify(assessmentContent),
                    summary: record['检查结果'] || record['测试结果'] || '',
                    status: 'Active'
                }));

                count++;
                console.log(`✅ 导入仪器室: ${department.DepartmentName}`);
            } catch (error) {
                console.error(`❌ 导入仪器室数据失败: ${department.DepartmentName}`, error.message);
            }
        }

        console.log(`📋 仪器室 ${department.DepartmentName} 导入完成，成功 ${count} 条`);
        return count;
    }

    /**
     * 获取单个体检ID的预览信息
     * @param {string} examId - 体检ID
     * @returns {Promise<Object>} 预览信息
     */
    async getExaminationPreview(examId) {
        const preview = {
            examId,
            examDate: null,
            departmentCodes: [],
            departments: []
        };

        try {
            // 获取体检日期
            preview.examDate = await this.getExaminationDate(examId);

            // 获取科室编码
            preview.departmentCodes = await departmentCodeService.getDepartmentCodes(examId);

            // 获取系统科室信息
            const systemDepartments = await this.getSystemDepartments();

            // 匹配科室信息
            for (const code of preview.departmentCodes) {
                const dept = systemDepartments.find(d => d.DepartmentCode === code);
                if (dept) {
                    preview.departments.push({
                        code,
                        name: dept.DepartmentName,
                        type: dept.DepartmentType,
                        exists: true
                    });
                } else {
                    preview.departments.push({
                        code,
                        name: '未知科室',
                        type: 'unknown',
                        exists: false
                    });
                }
            }

        } catch (error) {
            console.error(`获取体检预览信息失败: ${examId}`, error);
        }

        return preview;
    }
}

// 创建单例实例
const examinationDataImportService = new ExaminationDataImportService();

module.exports = examinationDataImportService;
