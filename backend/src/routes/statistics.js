const express = require('express');
const router = express.Router();
const { executeQuery, sql } = require('../../config/database');

// 获取仪表板统计数据
router.get('/dashboard', async (req, res) => {
    try {
        let totalCustomers = 0;
        let stemCellPatients = 0;
        let monthlyInfusions = 0;
        let todaySchedules = 0;

        try {
            // 查询总客户数
            const customerResult = await executeQuery('SELECT COUNT(*) as total FROM Customers');
            totalCustomers = customerResult[0].total;
        } catch (e) {
            console.log('查询客户总数失败:', e.message);
        }

        try {
            // 查询干细胞患者数
            const patientResult = await executeQuery('SELECT COUNT(*) as total FROM StemCellPatients');
            stemCellPatients = patientResult[0].total;
        } catch (e) {
            console.log('查询干细胞患者数失败:', e.message);
        }

        try {
            // 查询本月回输数
            const currentMonth = new Date().getMonth() + 1;
            const currentYear = new Date().getFullYear();
            const monthlyResult = await executeQuery(`
                SELECT COUNT(*) as total
                FROM InfusionSchedules
                WHERE YEAR(ScheduleDate) = ${currentYear}
                AND MONTH(ScheduleDate) = ${currentMonth}
                AND Status = 'Completed'
            `);
            monthlyInfusions = monthlyResult[0].total;
        } catch (e) {
            console.log('查询本月回输数失败:', e.message);
        }

        try {
            // 查询今日排期数
            const today = new Date().toISOString().split('T')[0];
            const todayResult = await executeQuery(`
                SELECT COUNT(*) as total
                FROM InfusionSchedules
                WHERE CAST(ScheduleDate AS DATE) = '${today}'
                AND Status IN ('已安排', 'Scheduled', 'In Progress', 'Completed')
            `);
            todaySchedules = todayResult[0].total;
        } catch (e) {
            console.log('查询今日排期数失败:', e.message);
        }

        const dashboardStats = {
            totalCustomers,
            stemCellPatients,
            monthlyInfusions,
            todaySchedules
        };

        res.json({
            status: 'Success',
            message: '获取仪表板统计成功',
            data: dashboardStats
        });
    } catch (error) {
        console.error('获取仪表板统计失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '获取仪表板统计失败'
        });
    }
});

// 获取月度统计
router.get('/monthly', async (req, res) => {
    try {
        const { year = new Date().getFullYear() } = req.query;

        // 初始化12个月的数据
        const monthlyData = [];
        const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

        try {
            // 查询每月的回输统计
            const monthlyResult = await executeQuery(`
                SELECT
                    MONTH(ScheduleDate) as month,
                    COUNT(*) as infusions,
                    COUNT(DISTINCT PatientID) as patients
                FROM InfusionSchedules
                WHERE YEAR(ScheduleDate) = ${year}
                GROUP BY MONTH(ScheduleDate)
                ORDER BY MONTH(ScheduleDate)
            `);

            // 构建完整的月度数据
            for (let i = 1; i <= 12; i++) {
                const monthData = monthlyResult.find(item => item.month === i);
                monthlyData.push({
                    month: monthNames[i - 1],
                    patients: monthData ? monthData.patients : 0,
                    infusions: monthData ? monthData.infusions : 0
                });
            }

        } catch (e) {
            console.log('查询月度统计失败:', e.message);
            // 如果查询失败，返回空数据
            for (let i = 1; i <= 12; i++) {
                monthlyData.push({
                    month: monthNames[i - 1],
                    patients: 0,
                    infusions: 0
                });
            }
        }

        res.json({
            status: 'Success',
            message: '获取月度统计成功',
            data: monthlyData
        });
    } catch (error) {
        console.error('获取月度统计失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '获取月度统计失败'
        });
    }
});

// 获取治疗类型统计
router.get('/treatment-types', async (req, res) => {
    try {
        const { dateFrom, dateTo } = req.query;

        let treatmentTypes = [];
        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

        try {
            // 构建查询条件
            let whereClause = '';
            if (dateFrom && dateTo) {
                whereClause = ` WHERE CAST(ScheduleDate AS DATE) BETWEEN '${dateFrom}' AND '${dateTo}'`;
            }

            // 查询治疗类型统计
            const result = await executeQuery(`
                SELECT
                    COALESCE(TreatmentType, '未知') as name,
                    COUNT(*) as count
                FROM InfusionSchedules
                ${whereClause}
                GROUP BY TreatmentType
                ORDER BY count DESC
            `);

            // 计算总数和百分比
            const total = result.reduce((sum, item) => sum + item.count, 0);

            treatmentTypes = result.map((item, index) => ({
                name: item.name,
                count: item.count,
                percentage: total > 0 ? parseFloat((item.count / total * 100).toFixed(1)) : 0,
                color: colors[index % colors.length]
            }));

        } catch (e) {
            console.log('查询治疗类型统计失败:', e.message);
            // 如果查询失败，返回空数据
            treatmentTypes = [];
        }

        res.json({
            status: 'Success',
            message: '获取治疗类型统计成功',
            data: treatmentTypes
        });
    } catch (error) {
        console.error('获取治疗类型统计失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '获取治疗类型统计失败'
        });
    }
});

// 获取病种统计
router.get('/diseases', async (req, res) => {
    try {
        const { dateFrom, dateTo } = req.query;

        let diseaseStats = [];

        try {
            // 构建查询条件
            let whereClause = '';
            if (dateFrom && dateTo) {
                whereClause = ` WHERE CAST(sp.RegistrationDate AS DATE) BETWEEN '${dateFrom}' AND '${dateTo}'`;
            }

            // 查询病种统计
            const result = await executeQuery(`
                SELECT
                    COALESCE(sp.PrimaryDiagnosis, '未知') as name,
                    COUNT(*) as count
                FROM StemCellPatients sp
                ${whereClause}
                GROUP BY sp.PrimaryDiagnosis
                ORDER BY count DESC
            `);

            // 计算总数和百分比
            const total = result.reduce((sum, item) => sum + item.count, 0);

            diseaseStats = result.map(item => ({
                name: item.name,
                count: item.count,
                percentage: total > 0 ? parseFloat((item.count / total * 100).toFixed(1)) : 0
            }));

        } catch (e) {
            console.log('查询病种统计失败:', e.message);
            // 如果查询失败，返回空数据
            diseaseStats = [];
        }

        res.json({
            status: 'Success',
            message: '获取病种统计成功',
            data: diseaseStats
        });
    } catch (error) {
        console.error('获取病种统计失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '获取病种统计失败'
        });
    }
});

// 获取回输次数分布
router.get('/infusion-counts', async (req, res) => {
    try {
        const { dateFrom, dateTo } = req.query;

        let infusionCounts = [];

        try {
            // 构建查询条件
            let whereClause = '';
            if (dateFrom && dateTo) {
                whereClause = ` WHERE CAST(isched.ScheduleDate AS DATE) BETWEEN '${dateFrom}' AND '${dateTo}'`;
            }

            // 查询回输次数分布
            const result = await executeQuery(`
                SELECT
                    CASE
                        WHEN isched.InfusionCount = 1 THEN '首次'
                        WHEN isched.InfusionCount = 2 THEN '二次'
                        WHEN isched.InfusionCount = 3 THEN '三次'
                        ELSE '四次及以上'
                    END as type,
                    COUNT(*) as count
                FROM InfusionSchedules isched
                ${whereClause}
                GROUP BY
                    CASE
                        WHEN isched.InfusionCount = 1 THEN '首次'
                        WHEN isched.InfusionCount = 2 THEN '二次'
                        WHEN isched.InfusionCount = 3 THEN '三次'
                        ELSE '四次及以上'
                    END
                ORDER BY
                    CASE
                        WHEN isched.InfusionCount = 1 THEN 1
                        WHEN isched.InfusionCount = 2 THEN 2
                        WHEN isched.InfusionCount = 3 THEN 3
                        ELSE 4
                    END
            `);

            // 计算总数和百分比
            const total = result.reduce((sum, item) => sum + item.count, 0);

            infusionCounts = result.map(item => ({
                type: item.type,
                count: item.count,
                percentage: total > 0 ? parseFloat((item.count / total * 100).toFixed(1)) : 0
            }));

        } catch (e) {
            console.log('查询回输次数分布失败:', e.message);
            // 如果查询失败，返回空数据
            infusionCounts = [];
        }

        res.json({
            status: 'Success',
            message: '获取回输次数分布成功',
            data: infusionCounts
        });
    } catch (error) {
        console.error('获取回输次数分布失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '获取回输次数分布失败'
        });
    }
});

// 获取年龄分布统计
router.get('/age-distribution', async (req, res) => {
    try {
        const { dateFrom, dateTo } = req.query;

        let ageDistribution = [];

        try {
            // 构建查询条件
            let whereClause = '';
            if (dateFrom && dateTo) {
                whereClause = ` WHERE CAST(sp.RegistrationDate AS DATE) BETWEEN '${dateFrom}' AND '${dateTo}'`;
            }

            // 查询年龄分布统计
            const result = await executeQuery(`
                SELECT
                    CASE
                        WHEN c.Age BETWEEN 18 AND 30 THEN '18-30岁'
                        WHEN c.Age BETWEEN 31 AND 40 THEN '31-40岁'
                        WHEN c.Age BETWEEN 41 AND 50 THEN '41-50岁'
                        WHEN c.Age BETWEEN 51 AND 60 THEN '51-60岁'
                        WHEN c.Age BETWEEN 61 AND 70 THEN '61-70岁'
                        ELSE '70岁以上'
                    END as range,
                    COUNT(*) as count
                FROM StemCellPatients sp
                INNER JOIN Customers c ON sp.CustomerID = c.ID
                ${whereClause}
                GROUP BY
                    CASE
                        WHEN c.Age BETWEEN 18 AND 30 THEN '18-30岁'
                        WHEN c.Age BETWEEN 31 AND 40 THEN '31-40岁'
                        WHEN c.Age BETWEEN 41 AND 50 THEN '41-50岁'
                        WHEN c.Age BETWEEN 51 AND 60 THEN '51-60岁'
                        WHEN c.Age BETWEEN 61 AND 70 THEN '61-70岁'
                        ELSE '70岁以上'
                    END
                ORDER BY
                    CASE
                        WHEN c.Age BETWEEN 18 AND 30 THEN 1
                        WHEN c.Age BETWEEN 31 AND 40 THEN 2
                        WHEN c.Age BETWEEN 41 AND 50 THEN 3
                        WHEN c.Age BETWEEN 51 AND 60 THEN 4
                        WHEN c.Age BETWEEN 61 AND 70 THEN 5
                        ELSE 6
                    END
            `);

            // 计算总数和百分比
            const total = result.reduce((sum, item) => sum + item.count, 0);

            ageDistribution = result.map(item => ({
                range: item.range,
                count: item.count,
                percentage: total > 0 ? parseFloat((item.count / total * 100).toFixed(1)) : 0
            }));

        } catch (e) {
            console.log('查询年龄分布统计失败:', e.message);
            // 如果查询失败，返回空数据
            ageDistribution = [];
        }

        res.json({
            status: 'Success',
            message: '获取年龄分布统计成功',
            data: ageDistribution
        });
    } catch (error) {
        console.error('获取年龄分布统计失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '获取年龄分布统计失败'
        });
    }
});

// 获取性别分布统计
router.get('/gender-distribution', async (req, res) => {
    try {
        const { dateFrom, dateTo } = req.query;

        let genderDistribution = [];

        try {
            // 构建查询条件
            let whereClause = '';
            if (dateFrom && dateTo) {
                whereClause = ` WHERE CAST(sp.RegistrationDate AS DATE) BETWEEN '${dateFrom}' AND '${dateTo}'`;
            }

            // 查询性别分布统计
            const result = await executeQuery(`
                SELECT
                    c.Gender as gender,
                    COUNT(*) as count
                FROM StemCellPatients sp
                INNER JOIN Customers c ON sp.CustomerID = c.ID
                ${whereClause}
                GROUP BY c.Gender
                ORDER BY count DESC
            `);

            // 计算总数和百分比
            const total = result.reduce((sum, item) => sum + item.count, 0);

            genderDistribution = result.map(item => ({
                gender: item.gender,
                count: item.count,
                percentage: total > 0 ? parseFloat((item.count / total * 100).toFixed(1)) : 0
            }));

        } catch (e) {
            console.log('查询性别分布统计失败:', e.message);
            // 如果查询失败，返回空数据
            genderDistribution = [];
        }

        res.json({
            status: 'Success',
            message: '获取性别分布统计成功',
            data: genderDistribution
        });
    } catch (error) {
        console.error('获取性别分布统计失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '获取性别分布统计失败'
        });
    }
});

// 获取综合统计报告
router.get('/comprehensive', async (req, res) => {
    try {
        const { dateFrom, dateTo, type = 'monthly' } = req.query;

        let totalCustomers = 0;
        let newCustomersThisMonth = 0;
        let totalInfusions = 0;
        let uniquePatients = 0;
        let averageAge = 0;
        let malePercentage = 0;
        let femalePercentage = 0;

        try {
            const customerResult = await executeQuery('SELECT COUNT(*) as total FROM Customers');
            totalCustomers = customerResult[0].total;
        } catch (e) {
            console.log('查询客户总数失败:', e.message);
        }

        try {
            const infusionResult = await executeQuery('SELECT COUNT(*) as total, COUNT(DISTINCT PatientID) as patients FROM InfusionSchedules');
            totalInfusions = infusionResult[0].total;
            uniquePatients = infusionResult[0].patients;
        } catch (e) {
            console.log('查询输注统计失败:', e.message);
        }

        try {
            const ageResult = await executeQuery(`
                SELECT AVG(CAST(c.Age as FLOAT)) as avgAge
                FROM StemCellPatients sp
                INNER JOIN Customers c ON sp.CustomerID = c.ID
            `);
            averageAge = ageResult[0].avgAge || 0;
        } catch (e) {
            console.log('查询平均年龄失败:', e.message);
        }

        try {
            const genderResult = await executeQuery(`
                SELECT
                    Gender,
                    COUNT(*) as count
                FROM StemCellPatients sp
                INNER JOIN Customers c ON sp.CustomerID = c.ID
                GROUP BY Gender
            `);

            const totalGender = genderResult.reduce((sum, item) => sum + item.count, 0);
            const maleCount = genderResult.find(item => item.Gender === '男')?.count || 0;
            const femaleCount = genderResult.find(item => item.Gender === '女')?.count || 0;

            malePercentage = totalGender > 0 ? parseFloat((maleCount / totalGender * 100).toFixed(1)) : 0;
            femalePercentage = totalGender > 0 ? parseFloat((femaleCount / totalGender * 100).toFixed(1)) : 0;
        } catch (e) {
            console.log('查询性别分布失败:', e.message);
        }

        // 获取治疗效果数据
        let treatmentEffectiveness = [];
        try {
            // 查询 TreatmentEffectiveness 表获取真实的效果统计数据
            const effectivenessResult = await executeQuery(`
                SELECT
                    EffectivenessType as type,
                    COUNT(*) as count,
                    AVG(OverallEffectiveness) as avgScore
                FROM TreatmentEffectiveness
                WHERE Status = 'active'
                GROUP BY EffectivenessType
                ORDER BY count DESC
            `);

            const totalEffectiveness = effectivenessResult.reduce((sum, item) => sum + item.count, 0);

            treatmentEffectiveness = effectivenessResult.map(item => ({
                type: item.type,
                count: item.count,
                percentage: totalEffectiveness > 0 ? parseFloat((item.count / totalEffectiveness * 100).toFixed(1)) : 0,
                avgScore: item.avgScore ? Math.round(item.avgScore) : 0
            }));
        } catch (e) {
            console.log('查询治疗效果数据失败:', e.message);

            // 降级使用输液状态作为替代统计
            try {
                const infusionResult = await executeQuery(`
                    SELECT
                        CASE
                            WHEN Status = 'Completed' THEN '治疗完成'
                            WHEN Status = 'In Progress' THEN '治疗中'
                            WHEN Status = 'Scheduled' THEN '已安排'
                            WHEN Status = '已安排' THEN '已安排'
                            ELSE '其他状态'
                        END as type,
                        COUNT(*) as count
                    FROM InfusionSchedules
                    GROUP BY Status
                    ORDER BY count DESC
                `);

                const totalInfusion = infusionResult.reduce((sum, item) => sum + item.count, 0);

                treatmentEffectiveness = infusionResult.map(item => ({
                    type: item.type,
                    count: item.count,
                    percentage: totalInfusion > 0 ? parseFloat((item.count / totalInfusion * 100).toFixed(1)) : 0,
                    avgScore: 0
                }));
            } catch (infusionError) {
                console.log('输液状态查询也失败，返回空数据:', infusionError.message);
                treatmentEffectiveness = [];
            }
        }

        // 获取病种数据
        let topDiseases = [];
        try {
            const diseaseResult = await executeQuery(`
                SELECT
                    COALESCE(PrimaryDiagnosis, '未知') as name,
                    COUNT(*) as count
                FROM StemCellPatients
                GROUP BY PrimaryDiagnosis
                ORDER BY count DESC
            `);

            topDiseases = diseaseResult.slice(0, 4); // 取前4种疾病
        } catch (e) {
            console.log('查询病种数据失败:', e.message);
        }

        const comprehensiveData = {
            overview: {
                totalCustomers: totalCustomers,
                newCustomersThisMonth: newCustomersThisMonth,
                totalInfusions: totalInfusions,
                uniquePatients: uniquePatients,
                averageAge: parseFloat(averageAge.toFixed(1)),
                malePercentage: malePercentage,
                femalePercentage: femalePercentage
            },
            trends: {
                customerGrowth: [], // 可以后续实现增长趋势
                infusionGrowth: []  // 可以后续实现增长趋势
            },
            topDiseases: topDiseases,
            treatmentEffectiveness: treatmentEffectiveness
        };

        res.json({
            status: 'Success',
            message: '获取综合统计报告成功',
            data: comprehensiveData
        });
    } catch (error) {
        console.error('获取综合统计报告失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '获取综合统计报告失败'
        });
    }
});

// 测试API - 验证数据库连接和表存在
router.get('/test', async (req, res) => {
    try {
        // 测试基本查询
        const customerCount = await executeQuery('SELECT COUNT(*) as total FROM Customers');
        const infusionCount = await executeQuery('SELECT COUNT(*) as total FROM InfusionSchedules');
        const patientCount = await executeQuery('SELECT COUNT(*) as total FROM StemCellPatients');

        res.json({
            status: 'Success',
            message: '数据库连接测试成功',
            data: {
                customers: customerCount[0].total,
                infusions: infusionCount[0].total,
                patients: patientCount[0].total
            }
        });
    } catch (error) {
        console.error('数据库测试失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '数据库测试失败',
            error: error.message
        });
    }
});

// ==================== 基于身份证号的统计分析功能 ====================

/**
 * 获取按身份证号统计的检客完整档案数据
 * GET /api/statistics/customers/complete-profile
 */
router.get('/customers/complete-profile', async (req, res) => {
    try {
        const { page = 1, limit = 20, sortBy = 'CreatedAt', sortOrder = 'DESC' } = req.query;
        const offset = (page - 1) * limit;

        const query = `
            SELECT
                ccp.*,
                c.Phone,
                c.ContactPerson,
                c.ContactPersonPhone,
                c.Address,
                c.Remarks
            FROM dbo.CustomerCompleteProfile ccp
            INNER JOIN Customers c ON ccp.CustomerID = c.ID
            ORDER BY ${sortBy} ${sortOrder}
            OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;

            SELECT COUNT(*) as Total FROM dbo.CustomerCompleteProfile;
        `;

        const params = [
            { name: 'offset', value: offset, type: sql.Int },
            { name: 'limit', value: limit, type: sql.Int }
        ];

        const result = await executeQuery(query, params);
        const customers = result.slice(0, -1);
        const total = result[result.length - 1].Total;

        res.json({
            status: 'Success',
            message: '获取检客完整档案统计成功',
            data: customers,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('获取检客完整档案统计失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '获取检客完整档案统计失败'
        });
    }
});

/**
 * 获取检客档案完整性统计
 * GET /api/statistics/customers/profile-completeness
 */
router.get('/customers/profile-completeness', async (req, res) => {
    try {
        const query = `
            SELECT
                ProfileCompletenessScore,
                CASE
                    WHEN ProfileCompletenessScore >= 100 THEN '完整'
                    WHEN ProfileCompletenessScore >= 80 THEN '良好'
                    WHEN ProfileCompletenessScore >= 60 THEN '基础'
                    ELSE '不完整'
                END as CompletenessLevel,
                COUNT(*) as CustomerCount,
                ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM dbo.CustomerCompleteProfile), 2) as Percentage
            FROM dbo.CustomerCompleteProfile
            GROUP BY ProfileCompletenessScore
            ORDER BY ProfileCompletenessScore DESC;
        `;

        const result = await executeQuery(query);

        // 按级别汇总
        const summary = result.reduce((acc, item) => {
            const level = item.CompletenessLevel;
            if (!acc[level]) {
                acc[level] = {
                    level,
                    customerCount: 0,
                    percentage: 0
                };
            }
            acc[level].customerCount += item.CustomerCount;
            acc[level].percentage += item.Percentage;
            return acc;
        }, {});

        const summaryArray = Object.values(summary);

        res.json({
            status: 'Success',
            message: '获取检客档案完整性统计成功',
            data: {
                details: result,
                summary: summaryArray
            }
        });
    } catch (error) {
        console.error('获取检客档案完整性统计失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '获取检客档案完整性统计失败'
        });
    }
});

/**
 * 获取检客活跃度统计（基于最近活动时间）
 * GET /api/statistics/customers/activity-level
 */
router.get('/customers/activity-level', async (req, res) => {
    try {
        const query = `
            SELECT
                CustomerID,
                IdentityCard,
                Name,
                Gender,
                Age,
                HealthAssessmentCount,
                StemCellCount,
                ReportCount,
                TotalInfusionCount,
                LastAssessmentDate,
                LastRegistrationDate,
                LastReportDate,
                -- 计算最近活动时间
                CASE
                    WHEN LastAssessmentDate >= LastRegistrationDate AND LastAssessmentDate >= LastReportDate THEN LastAssessmentDate
                    WHEN LastRegistrationDate >= LastAssessmentDate AND LastRegistrationDate >= LastReportDate THEN LastRegistrationDate
                    ELSE LastReportDate
                END as LastActivityDate,
                -- 计算活跃度级别
                CASE
                    WHEN LastAssessmentDate IS NULL AND LastRegistrationDate IS NULL AND LastReportDate IS NULL THEN '无活动'
                    WHEN DATEDIFF(DAY,
                        CASE
                            WHEN LastAssessmentDate >= LastRegistrationDate AND LastAssessmentDate >= LastReportDate THEN LastAssessmentDate
                            WHEN LastRegistrationDate >= LastAssessmentDate AND LastRegistrationDate >= LastReportDate THEN LastRegistrationDate
                            ELSE LastReportDate
                        END, GETDATE()) <= 30 THEN '活跃'
                    WHEN DATEDIFF(DAY,
                        CASE
                            WHEN LastAssessmentDate >= LastRegistrationDate AND LastAssessmentDate >= LastReportDate THEN LastAssessmentDate
                            WHEN LastRegistrationDate >= LastAssessmentDate AND LastRegistrationDate >= LastReportDate THEN LastRegistrationDate
                            ELSE LastReportDate
                        END, GETDATE()) <= 90 THEN '一般活跃'
                    ELSE '不活跃'
                END as ActivityLevel
            FROM dbo.CustomerCompleteProfile
            ORDER BY LastActivityDate DESC;
        `;

        const result = await executeQuery(query);

        // 按活跃度级别统计
        const activityStats = result.reduce((acc, item) => {
            const level = item.ActivityLevel;
            if (!acc[level]) {
                acc[level] = {
                    level,
                    count: 0,
                    percentage: 0
                };
            }
            acc[level].count++;
            return acc;
        }, {});

        // 计算百分比
        const total = result.length;
        Object.keys(activityStats).forEach(level => {
            activityStats[level].percentage = Math.round((activityStats[level].count / total) * 100);
        });

        res.json({
            status: 'Success',
            message: '获取检客活跃度统计成功',
            data: {
                customers: result,
                statistics: Object.values(activityStats),
                summary: {
                    totalCustomers: total,
                    activeCustomers: activityStats['活跃']?.count || 0,
                    inactiveCustomers: activityStats['不活跃']?.count || 0,
                    noActivityCustomers: activityStats['无活动']?.count || 0
                }
            }
        });
    } catch (error) {
        console.error('获取检客活跃度统计失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '获取检客活跃度统计失败'
        });
    }
});

/**
 * 获取检客治疗历史统计
 * GET /api/statistics/customers/treatment-history
 */
router.get('/customers/treatment-history', async (req, res) => {
    try {
        const { groupBy = 'infusionRange' } = req.query;

        let groupByClause;
        switch (groupBy) {
            case 'infusionRange':
                groupByClause = `
                    CASE
                        WHEN TotalInfusionCount = 0 THEN '0次'
                        WHEN TotalInfusionCount BETWEEN 1 AND 3 THEN '1-3次'
                        WHEN TotalInfusionCount BETWEEN 4 AND 6 THEN '4-6次'
                        WHEN TotalInfusionCount BETWEEN 7 AND 10 THEN '7-10次'
                        ELSE '10次以上'
                    END
                `;
                break;
            case 'assessmentRange':
                groupByClause = `
                    CASE
                        WHEN HealthAssessmentCount = 0 THEN '0次'
                        WHEN HealthAssessmentCount BETWEEN 1 AND 2 THEN '1-2次'
                        WHEN HealthAssessmentCount BETWEEN 3 AND 5 THEN '3-5次'
                        ELSE '5次以上'
                    END
                `;
                break;
            case 'reportRange':
                groupByClause = `
                    CASE
                        WHEN ReportCount = 0 THEN '0份'
                        WHEN ReportCount = 1 THEN '1份'
                        WHEN ReportCount BETWEEN 2 AND 3 THEN '2-3份'
                        ELSE '4份以上'
                    END
                `;
                break;
            default:
                groupByClause = `TotalInfusionCount`;
        }

        const query = `
            SELECT
                ${groupByClause} as GroupLabel,
                COUNT(*) as CustomerCount,
                AVG(TotalInfusionCount) as AvgInfusions,
                AVG(HealthAssessmentCount) as AvgAssessments,
                AVG(ReportCount) as AvgReports
            FROM dbo.CustomerCompleteProfile
            GROUP BY ${groupByClause}
            ORDER BY
                CASE
                    WHEN GroupLabel = '0次' OR GroupLabel = '0份' THEN 1
                    WHEN GroupLabel LIKE '1-%' OR GroupLabel = '1份' THEN 2
                    WHEN GroupLabel LIKE '%-%' THEN 3
                    WHEN GroupLabel LIKE '%以上' THEN 4
                    ELSE 5
                END;
        `;

        const result = await executeQuery(query);

        res.json({
            status: 'Success',
            message: '获取检客治疗历史统计成功',
            data: {
                groupBy,
                statistics: result
            }
        });
    } catch (error) {
        console.error('获取检客治疗历史统计失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '获取检客治疗历史统计失败'
        });
    }
});

/**
 * 获取多维度检客统计对比
 * GET /api/statistics/customers/comparison
 */
router.get('/customers/comparison', async (req, res) => {
    try {
        const { dimensions = 'gender,ageGroup,treatmentLevel' } = req.query;
        const dimensionList = dimensions.split(',');

        const query = `
            SELECT
                c.IdentityCard,
                c.Name,
                c.Gender,
                c.Age,
                ccp.HealthAssessmentCount,
                ccp.StemCellCount,
                ccp.ReportCount,
                ccp.TotalInfusionCount,
                ccp.ProfileCompletenessScore,
                -- 年龄分组
                CASE
                    WHEN c.Age < 30 THEN '30岁以下'
                    WHEN c.Age BETWEEN 30 AND 40 THEN '30-40岁'
                    WHEN c.Age BETWEEN 41 AND 50 THEN '41-50岁'
                    WHEN c.Age BETWEEN 51 AND 60 THEN '51-60岁'
                    ELSE '60岁以上'
                END as AgeGroup,
                -- 治疗水平分组
                CASE
                    WHEN ccp.TotalInfusionCount = 0 THEN '未开始'
                    WHEN ccp.TotalInfusionCount BETWEEN 1 AND 3 THEN '初期'
                    WHEN ccp.TotalInfusionCount BETWEEN 4 AND 8 THEN '中期'
                    ELSE '长期'
                END as TreatmentLevel,
                -- 档案完整性分组
                CASE
                    WHEN ccp.ProfileCompletenessScore >= 100 THEN '完整'
                    WHEN ccp.ProfileCompletenessScore >= 80 THEN '良好'
                    WHEN ccp.ProfileCompletenessScore >= 60 THEN '基础'
                    ELSE '不完整'
                END as ProfileLevel
            FROM Customers c
            INNER JOIN dbo.CustomerCompleteProfile ccp ON c.ID = ccp.CustomerID
            ORDER BY c.CreatedAt DESC;
        `;

        const result = await executeQuery(query);

        // 按请求的维度进行统计
        const comparisons = {};

        dimensionList.forEach(dimension => {
            const stats = result.reduce((acc, item) => {
                const key = item[dimension.trim()];
                if (!acc[key]) {
                    acc[key] = {
                        group: key,
                        count: 0,
                        avgInfusions: 0,
                        avgAssessments: 0,
                        avgReports: 0,
                        avgCompleteness: 0
                    };
                }
                acc[key].count++;
                acc[key].avgInfusions += item.TotalInfusionCount || 0;
                acc[key].avgAssessments += item.HealthAssessmentCount || 0;
                acc[key].avgReports += item.ReportCount || 0;
                acc[key].avgCompleteness += item.ProfileCompletenessScore || 0;
                return acc;
            }, {});

            // 计算平均值
            Object.keys(stats).forEach(key => {
                const stat = stats[key];
                stat.avgInfusions = Math.round(stat.avgInfusions / stat.count * 10) / 10;
                stat.avgAssessments = Math.round(stat.avgAssessments / stat.count * 10) / 10;
                stat.avgReports = Math.round(stat.avgReports / stat.count * 10) / 10;
                stat.avgCompleteness = Math.round(stat.avgCompleteness / stat.count);
            });

            comparisons[dimension.trim()] = Object.values(stats);
        });

        res.json({
            status: 'Success',
            message: '获取检客对比统计成功',
            data: {
                dimensions: dimensionList,
                customers: result,
                comparisons
            }
        });
    } catch (error) {
        console.error('获取检客对比统计失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '获取检客对比统计失败'
        });
    }
});

module.exports = router;