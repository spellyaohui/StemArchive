const express = require('express');
const router = express.Router();
const { executeQuery, sql } = require('../../config/database');
const { ApiResponse } = require('../utils/response');

// 获取治疗效果评估列表
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 20, customerId, patientId, effectivenessType, dateFrom, dateTo } = req.query;
        const offset = (page - 1) * limit;

        let whereConditions = [];
        let params = [];

        if (customerId) {
            whereConditions.push('te.CustomerID = @customerId');
            params.push({ name: 'customerId', value: customerId, type: sql.UniqueIdentifier });
        }

        if (patientId) {
            whereConditions.push('te.PatientID = @patientId');
            params.push({ name: 'patientId', value: patientId, type: sql.UniqueIdentifier });
        }

        if (effectivenessType) {
            whereConditions.push('te.EffectivenessType = @effectivenessType');
            params.push({ name: 'effectivenessType', value: effectivenessType, type: sql.NVarChar });
        }

        if (dateFrom) {
            whereConditions.push('te.AssessmentDate >= @dateFrom');
            params.push({ name: 'dateFrom', value: dateFrom, type: sql.Date });
        }

        if (dateTo) {
            whereConditions.push('te.AssessmentDate <= @dateTo');
            params.push({ name: 'dateTo', value: dateTo, type: sql.Date });
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const query = `
            SELECT
                te.ID,
                te.CustomerID,
                c.Name as CustomerName,
                te.PatientID,
                sp.PatientNumber,
                sp.PrimaryDiagnosis,
                te.InfusionScheduleID,
                te.AssessmentDate,
                te.AssessmentPeriod,
                te.EffectivenessType,
                te.OverallEffectiveness,
                te.SymptomImprovement,
                te.QualityOfLifeImprovement,
                te.DoctorAssessment,
                te.PatientFeedback,
                te.PatientSatisfaction,
                te.DoctorID,
                te.CreatedAt
            FROM TreatmentEffectiveness te
            INNER JOIN Customers c ON te.CustomerID = c.ID
            INNER JOIN StemCellPatients sp ON te.PatientID = sp.ID
            ${whereClause}
            ORDER BY te.AssessmentDate DESC
            OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;

            SELECT COUNT(*) as Total FROM TreatmentEffectiveness te ${whereClause};
        `;

        params.push(
            { name: 'offset', value: offset, type: sql.Int },
            { name: 'limit', value: parseInt(limit), type: sql.Int }
        );

        const result = await executeQuery(query, params);
        const effectivenessData = result.slice(0, -1);
        const total = result[result.length - 1].Total;

        res.json(ApiResponse.success(effectivenessData, '获取治疗效果评估列表成功', {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / limit)
        }));

    } catch (error) {
        console.error('获取治疗效果评估列表失败:', error);
        res.status(500).json(ApiResponse.error('获取治疗效果评估列表失败'));
    }
});

// 获取单个治疗效果评估详情
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const query = `
            SELECT
                te.*,
                c.Name as CustomerName,
                sp.PatientNumber,
                sp.PrimaryDiagnosis,
                isched.ScheduleDate as InfusionDate
            FROM TreatmentEffectiveness te
            INNER JOIN Customers c ON te.CustomerID = c.ID
            INNER JOIN StemCellPatients sp ON te.PatientID = sp.ID
            LEFT JOIN InfusionSchedules isched ON te.InfusionScheduleID = isched.ID
            WHERE te.ID = @id AND te.Status = 'active'
        `;

        const params = [{ name: 'id', value: id, type: sql.UniqueIdentifier }];
        const result = await executeQuery(query, params);

        if (result.length === 0) {
            return res.status(404).json(ApiResponse.error('治疗效果评估记录不存在'));
        }

        res.json(ApiResponse.success(result[0], '获取治疗效果评估详情成功'));

    } catch (error) {
        console.error('获取治疗效果评估详情失败:', error);
        res.status(500).json(ApiResponse.error('获取治疗效果评估详情失败'));
    }
});

// 创建治疗效果评估
router.post('/', async (req, res) => {
    try {
        const {
            customerId,
            patientId,
            infusionScheduleId,
            assessmentDate,
            assessmentPeriod,
            effectivenessType,
            overallEffectiveness,
            symptomImprovement,
            qualityOfLifeImprovement,
            doctorAssessment,
            treatmentAdjustment,
            nextAssessmentDate,
            patientFeedback,
            patientSatisfaction,
            sideEffects,
            primaryIndicators,
            secondaryIndicators,
            labResults,
            imagingComparison,
            additionalTests,
            doctorId
        } = req.body;

        // 验证必填字段
        if (!customerId || !patientId || !assessmentDate || !assessmentPeriod || !effectivenessType) {
            return res.status(400).json(ApiResponse.error('缺少必填字段'));
        }

        const query = `
            INSERT INTO TreatmentEffectiveness (
                CustomerID, PatientID, InfusionScheduleID, AssessmentDate, AssessmentPeriod,
                EffectivenessType, OverallEffectiveness, SymptomImprovement, QualityOfLifeImprovement,
                DoctorAssessment, TreatmentAdjustment, NextAssessmentDate, PatientFeedback,
                PatientSatisfaction, SideEffects, PrimaryIndicators, SecondaryIndicators,
                LabResults, ImagingComparison, AdditionalTests, DoctorID, CreatedBy
            ) VALUES (
                @customerId, @patientId, @infusionScheduleId, @assessmentDate, @assessmentPeriod,
                @effectivenessType, @overallEffectiveness, @symptomImprovement, @qualityOfLifeImprovement,
                @doctorAssessment, @treatmentAdjustment, @nextAssessmentDate, @patientFeedback,
                @patientSatisfaction, @sideEffects, @primaryIndicators, @secondaryIndicators,
                @labResults, @imagingComparison, @additionalTests, @doctorId, @createdBy
            );
        `;

        const params = [
            { name: 'customerId', value: customerId, type: sql.UniqueIdentifier },
            { name: 'patientId', value: patientId, type: sql.UniqueIdentifier },
            { name: 'infusionScheduleId', value: infusionScheduleId || null, type: sql.UniqueIdentifier },
            { name: 'assessmentDate', value: assessmentDate, type: sql.Date },
            { name: 'assessmentPeriod', value: assessmentPeriod, type: sql.NVarChar },
            { name: 'effectivenessType', value: effectivenessType, type: sql.NVarChar },
            { name: 'overallEffectiveness', value: overallEffectiveness || null, type: sql.Decimal },
            { name: 'symptomImprovement', value: symptomImprovement || null, type: sql.Decimal },
            { name: 'qualityOfLifeImprovement', value: qualityOfLifeImprovement || null, type: sql.Decimal },
            { name: 'doctorAssessment', value: doctorAssessment || null, type: sql.NVarChar },
            { name: 'treatmentAdjustment', value: treatmentAdjustment || null, type: sql.NVarChar },
            { name: 'nextAssessmentDate', value: nextAssessmentDate || null, type: sql.Date },
            { name: 'patientFeedback', value: patientFeedback || null, type: sql.NVarChar },
            { name: 'patientSatisfaction', value: patientSatisfaction || null, type: sql.Int },
            { name: 'sideEffects', value: sideEffects || null, type: sql.NVarChar },
            { name: 'primaryIndicators', value: primaryIndicators || null, type: sql.NVarChar },
            { name: 'secondaryIndicators', value: secondaryIndicators || null, type: sql.NVarChar },
            { name: 'labResults', value: labResults || null, type: sql.NVarChar },
            { name: 'imagingComparison', value: imagingComparison || null, type: sql.NVarChar },
            { name: 'additionalTests', value: additionalTests || null, type: sql.NVarChar },
            { name: 'doctorId', value: doctorId || null, type: sql.NVarChar },
            { name: 'createdBy', value: req.user?.username || 'system', type: sql.NVarChar }
        ];

        await executeQuery(query, params);

        // 同时创建治疗历史记录
        const historyQuery = `
            INSERT INTO TreatmentHistory (
                CustomerID, PatientID, EventDate, EventType, EventTitle, EventDescription,
                TreatmentResponse, AttendingDoctor, CreatedBy
            ) VALUES (
                @customerId, @patientId, @assessmentDate, '疗效评估', @eventTitle, @eventDescription,
                @effectivenessType, @doctorId, @createdBy
            );
        `;

        const historyParams = [
            { name: 'customerId', value: customerId, type: sql.UniqueIdentifier },
            { name: 'patientId', value: patientId, type: sql.UniqueIdentifier },
            { name: 'assessmentDate', value: assessmentDate, type: sql.Date },
            { name: 'eventTitle', value: `治疗效果评估 - ${effectivenessType}`, type: sql.NVarChar },
            { name: 'eventDescription', value: doctorAssessment || '完成治疗效果评估', type: sql.NVarChar },
            { name: 'effectivenessType', value: effectivenessType, type: sql.NVarChar },
            { name: 'doctorId', value: doctorId || null, type: sql.NVarChar },
            { name: 'createdBy', value: req.user?.username || 'system', type: sql.NVarChar }
        ];

        await executeQuery(historyQuery, historyParams);

        res.json(ApiResponse.success(null, '创建治疗效果评估成功'));

    } catch (error) {
        console.error('创建治疗效果评估失败:', error);
        res.status(500).json(ApiResponse.error('创建治疗效果评估失败'));
    }
});

// 更新治疗效果评估
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            assessmentDate,
            assessmentPeriod,
            effectivenessType,
            overallEffectiveness,
            symptomImprovement,
            qualityOfLifeImprovement,
            doctorAssessment,
            treatmentAdjustment,
            nextAssessmentDate,
            patientFeedback,
            patientSatisfaction,
            sideEffects,
            primaryIndicators,
            secondaryIndicators,
            labResults,
            imagingComparison,
            additionalTests,
            doctorId
        } = req.body;

        const query = `
            UPDATE TreatmentEffectiveness SET
                AssessmentDate = @assessmentDate,
                AssessmentPeriod = @assessmentPeriod,
                EffectivenessType = @effectivenessType,
                OverallEffectiveness = @overallEffectiveness,
                SymptomImprovement = @symptomImprovement,
                QualityOfLifeImprovement = @qualityOfLifeImprovement,
                DoctorAssessment = @doctorAssessment,
                TreatmentAdjustment = @treatmentAdjustment,
                NextAssessmentDate = @nextAssessmentDate,
                PatientFeedback = @patientFeedback,
                PatientSatisfaction = @patientSatisfaction,
                SideEffects = @sideEffects,
                PrimaryIndicators = @primaryIndicators,
                SecondaryIndicators = @secondaryIndicators,
                LabResults = @labResults,
                ImagingComparison = @imagingComparison,
                AdditionalTests = @additionalTests,
                DoctorID = @doctorId,
                UpdatedAt = GETDATE(),
                UpdatedBy = @updatedBy
            WHERE ID = @id AND Status = 'active'
        `;

        const params = [
            { name: 'id', value: id, type: sql.UniqueIdentifier },
            { name: 'assessmentDate', value: assessmentDate, type: sql.Date },
            { name: 'assessmentPeriod', value: assessmentPeriod, type: sql.NVarChar },
            { name: 'effectivenessType', value: effectivenessType, type: sql.NVarChar },
            { name: 'overallEffectiveness', value: overallEffectiveness || null, type: sql.Decimal },
            { name: 'symptomImprovement', value: symptomImprovement || null, type: sql.Decimal },
            { name: 'qualityOfLifeImprovement', value: qualityOfLifeImprovement || null, type: sql.Decimal },
            { name: 'doctorAssessment', value: doctorAssessment || null, type: sql.NVarChar },
            { name: 'treatmentAdjustment', value: treatmentAdjustment || null, type: sql.NVarChar },
            { name: 'nextAssessmentDate', value: nextAssessmentDate || null, type: sql.Date },
            { name: 'patientFeedback', value: patientFeedback || null, type: sql.NVarChar },
            { name: 'patientSatisfaction', value: patientSatisfaction || null, type: sql.Int },
            { name: 'sideEffects', value: sideEffects || null, type: sql.NVarChar },
            { name: 'primaryIndicators', value: primaryIndicators || null, type: sql.NVarChar },
            { name: 'secondaryIndicators', value: secondaryIndicators || null, type: sql.NVarChar },
            { name: 'labResults', value: labResults || null, type: sql.NVarChar },
            { name: 'imagingComparison', value: imagingComparison || null, type: sql.NVarChar },
            { name: 'additionalTests', value: additionalTests || null, type: sql.NVarChar },
            { name: 'doctorId', value: doctorId || null, type: sql.NVarChar },
            { name: 'updatedBy', value: req.user?.username || 'system', type: sql.NVarChar }
        ];

        const result = await executeQuery(query, params);

        if (result.rowsAffected === 0) {
            return res.status(404).json(ApiResponse.error('治疗效果评估记录不存在'));
        }

        res.json(ApiResponse.success(null, '更新治疗效果评估成功'));

    } catch (error) {
        console.error('更新治疗效果评估失败:', error);
        res.status(500).json(ApiResponse.error('更新治疗效果评估失败'));
    }
});

// 删除治疗效果评估
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const query = `
            UPDATE TreatmentEffectiveness
            SET Status = 'deleted', UpdatedAt = GETDATE(), UpdatedBy = @updatedBy
            WHERE ID = @id AND Status = 'active'
        `;

        const params = [
            { name: 'id', value: id, type: sql.UniqueIdentifier },
            { name: 'updatedBy', value: req.user?.username || 'system', type: sql.NVarChar }
        ];

        const result = await executeQuery(query, params);

        if (result.rowsAffected === 0) {
            return res.status(404).json(ApiResponse.error('治疗效果评估记录不存在'));
        }

        res.json(ApiResponse.success(null, '删除治疗效果评估成功'));

    } catch (error) {
        console.error('删除治疗效果评估失败:', error);
        res.status(500).json(ApiResponse.error('删除治疗效果评估失败'));
    }
});

// 获取治疗效果统计数据
router.get('/statistics/summary', async (req, res) => {
    try {
        const { dateFrom, dateTo } = req.query;

        let whereClause = '';
        let params = [];

        if (dateFrom) {
            whereClause += ' AND AssessmentDate >= @dateFrom';
            params.push({ name: 'dateFrom', value: dateFrom, type: sql.Date });
        }

        if (dateTo) {
            whereClause += ' AND AssessmentDate <= @dateTo';
            params.push({ name: 'dateTo', value: dateTo, type: sql.Date });
        }

        const query = `
            SELECT
                EffectivenessType,
                COUNT(*) as count,
                AVG(OverallEffectiveness) as avgOverallScore,
                AVG(SymptomImprovement) as avgSymptomScore,
                AVG(QualityOfLifeImprovement) as avgQualityScore,
                AVG(PatientSatisfaction) as avgSatisfaction
            FROM TreatmentEffectiveness
            WHERE Status = 'active'${whereClause}
            GROUP BY EffectivenessType
            ORDER BY count DESC
        `;

        const result = await executeQuery(query, params);

        const total = result.reduce((sum, item) => sum + item.count, 0);

        const statistics = result.map(item => ({
            effectivenessType: item.EffectivenessType,
            count: item.count,
            percentage: total > 0 ? Math.round((item.count / total) * 100) : 0,
            avgOverallScore: Math.round(item.avgOverallScore || 0),
            avgSymptomScore: Math.round(item.avgSymptomScore || 0),
            avgQualityScore: Math.round(item.avgQualityScore || 0),
            avgSatisfaction: Math.round(item.avgSatisfaction || 0)
        }));

        res.json(ApiResponse.success(statistics, '获取治疗效果统计数据成功'));

    } catch (error) {
        console.error('获取治疗效果统计数据失败:', error);
        res.status(500).json(ApiResponse.error('获取治疗效果统计数据失败'));
    }
});

module.exports = router;