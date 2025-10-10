/**
 * 统计分析数据填充脚本
 * 为统计分析页面提供真实的测试数据
 */

const { executeQuery } = require('../config/database');

async function fillStatisticsData() {
    console.log('开始填充统计分析数据...');

    try {
        // 1. 先检查现有数据
        const customerCount = await executeQuery('SELECT COUNT(*) as total FROM Customers');
        const patientCount = await executeQuery('SELECT COUNT(*) as total FROM StemCellPatients');
        const infusionCount = await executeQuery('SELECT COUNT(*) as total FROM InfusionSchedules');

        console.log(`现有数据: 客户 ${customerCount[0].total}, 患者 ${patientCount[0].total}, 回输 ${infusionCount[0].total}`);

        // 2. 如果数据不足，填充测试数据
        if (customerCount[0].total < 10) {
            console.log('填充客户数据...');
            await fillCustomerData();
        }

        if (patientCount[0].total < 8) {
            console.log('填充患者数据...');
            await fillPatientData();
        }

        if (infusionCount[0].total < 20) {
            console.log('填充回输数据...');
            await fillInfusionData();
        }

        // 3. 填充治疗效果评估数据
        console.log('填充治疗效果评估数据...');
        await fillTreatmentEffectivenessData();

        console.log('统计分析数据填充完成!');

    } catch (error) {
        console.error('填充数据失败:', error);
    }
}

async function fillCustomerData() {
    const customers = [
        { identityCard: '110101198001010011', name: '张三', gender: '男', age: 45, phone: '13800138001' },
        { identityCard: '110101198102020022', name: '李四', gender: '女', age: 42, phone: '13800138002' },
        { identityCard: '110101197503030033', name: '王五', gender: '男', age: 49, phone: '13800138003' },
        { identityCard: '110101196804040044', name: '赵六', gender: '女', age: 56, phone: '13800138004' },
        { identityCard: '110101198505050055', name: '钱七', gender: '男', age: 39, phone: '13800138005' },
        { identityCard: '110101197206060066', name: '孙八', gender: '女', age: 52, phone: '13800138006' },
        { identityCard: '110101198807070077', name: '周九', gender: '男', age: 36, phone: '13800138007' },
        { identityCard: '110101196909090088', name: '吴十', gender: '女', age: 55, phone: '13800138008' },
        { identityCard: '110101198308080099', name: '郑十一', gender: '男', age: 41, phone: '13800138009' },
        { identityCard: '110101197411110000', name: '王十二', gender: '女', age: 50, phone: '13800138010' }
    ];

    for (const customer of customers) {
        try {
            await executeQuery(`
                INSERT INTO Customers (ID, IdentityCard, Name, Gender, Age, Phone, Status, CreatedAt)
                VALUES (NEWID(), '${customer.identityCard}', '${customer.name}', '${customer.gender}', ${customer.age}, '${customer.phone}', 'Active', GETDATE())
            `);
        } catch (error) {
            // 忽略重复数据错误
            if (!error.message.includes('违反 UNIQUE KEY 约束')) {
                console.warn(`插入客户数据失败: ${error.message}`);
            }
        }
    }
}

async function fillPatientData() {
    // 获取所有客户ID
    const customers = await executeQuery('SELECT ID FROM Customers');

    const diseases = [
        '2型糖尿病', '高血压', '类风湿性关节炎', '抗衰老', '帕金森病', '冠心病', '膝关节退行性病变', '皮肤病'
    ];

    for (let i = 0; i < Math.min(customers.length, 8); i++) {
        const customer = customers[i];
        const patientNumber = `SC${String(i + 1).padStart(4, '0')}`;
        const disease = diseases[i % diseases.length];

        try {
            await executeQuery(`
                INSERT INTO StemCellPatients (ID, CustomerID, PatientNumber, RegistrationDate, DiseaseTypes, PrimaryDiagnosis, Status, CreatedAt)
                VALUES (NEWID(), '${customer.ID}', '${patientNumber}', DATEADD(DAY, -${i * 30}, GETDATE()), '${disease}', '${disease}治疗', 'Active', GETDATE())
            `);
        } catch (error) {
            console.warn(`插入患者数据失败: ${error.message}`);
        }
    }
}

async function fillInfusionData() {
    // 获取所有患者ID
    const patients = await executeQuery('SELECT ID FROM StemCellPatients');

    const treatmentTypes = ['干细胞治疗', '免疫细胞治疗', '联合治疗', '康复治疗'];

    for (let i = 0; i < patients.length; i++) {
        const patient = patients[i];
        const treatmentType = treatmentTypes[i % treatmentTypes.length];

        // 为每个患者创建多个回输记录
        for (let j = 1; j <= 3; j++) {
            const scheduleDate = new Date();
            scheduleDate.setMonth(scheduleDate.getMonth() - (j * 2));
            const dateStr = scheduleDate.toISOString().split('T')[0];

            try {
                await executeQuery(`
                    INSERT INTO InfusionSchedules (ID, PatientID, ScheduleDate, ScheduleType, TreatmentType, InfusionCount, Status, CreatedAt)
                    VALUES (NEWID(), '${patient.ID}', '${dateStr}', '常规回输', '${treatmentType}', ${j}, 'Completed', GETDATE())
                `);
            } catch (error) {
                console.warn(`插入回输数据失败: ${error.message}`);
            }
        }
    }
}

async function fillTreatmentEffectivenessData() {
    // 获取所有回输记录
    const infusions = await executeQuery('SELECT ID, PatientID FROM InfusionSchedules');

    const effectivenessTypes = ['显著改善', '有所改善', '无明显变化'];

    for (let i = 0; i < infusions.length; i++) {
        const infusion = infusions[i];
        const effectivenessType = effectivenessTypes[i % effectivenessTypes.length];

        try {
            await executeQuery(`
                INSERT INTO TreatmentEffectiveness (ID, PatientID, InfusionID, EffectivenessType, AssessmentDate, Doctor, CreatedAt)
                VALUES (NEWID(), '${infusion.PatientID}', '${infusion.ID}', '${effectivenessType}', DATEADD(DAY, 7, GETDATE()), '张医生', GETDATE())
            `);
        } catch (error) {
            console.warn(`插入治疗效果数据失败: ${error.message}`);
        }
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    fillStatisticsData().then(() => {
        console.log('数据填充脚本执行完成');
        process.exit(0);
    }).catch(error => {
        console.error('脚本执行失败:', error);
        process.exit(1);
    });
}

module.exports = { fillStatisticsData };