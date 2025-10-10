const express = require('express');
const router = express.Router();
const { executeQuery, sql } = require('../../config/database');
const { ApiResponse } = require('../utils/response');

// 获取治疗历史列表
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 20, customerId, patientId, eventType, dateFrom, dateTo } = req.query;
        const offset = (page - 1) * limit;

        let whereConditions = [];
        let params = [];

        if (customerId) {
            whereConditions.push('th.CustomerID = @customerId');
            params.push({ name: 'customerId', value: customerId, type: sql.UniqueIdentifier });
        }

        if (patientId) {
            whereConditions.push('th.PatientID = @patientId');
            params.push({ name: 'patientId', value: patientId, type: sql.UniqueIdentifier });
        }

        if (eventType) {
            whereConditions.push('th.EventType = @eventType');
            params.push({ name: 'eventType', value: eventType, type: sql.NVarChar });
        }

        if (dateFrom) {
            whereConditions.push('th.EventDate >= @dateFrom');
            params.push({ name: 'dateFrom', value: dateFrom, type: sql.Date });
        }

        if (dateTo) {
            whereConditions.push('th.EventDate <= @dateTo');
            params.push({ name: 'dateTo', value: dateTo, type: sql.Date });
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const query = `
            SELECT
                th.ID,
                th.CustomerID,
                c.Name as CustomerName,
                th.PatientID,
                sp.PatientNumber,
                sp.PrimaryDiagnosis,
                th.EventDate,
                th.EventType,
                th.EventTitle,
                th.EventDescription,
                th.InfusionScheduleID,
                th.TreatmentType,
                th.TreatmentPhase,
                th.TreatmentResponse,
                th.ResponseDetails,
                th.AttendingDoctor,
                th.Department,
                th.AdverseEvents,
                th.SeverityGrade,
                th.Notes,
                th.CreatedAt
            FROM TreatmentHistory th
            INNER JOIN Customers c ON th.CustomerID = c.ID
            INNER JOIN StemCellPatients sp ON th.PatientID = sp.ID
            ${whereClause}
            ORDER BY th.EventDate DESC, th.CreatedAt DESC
            OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;

            SELECT COUNT(*) as Total FROM TreatmentHistory th ${whereClause};
        `;

        params.push(
            { name: 'offset', value: offset, type: sql.Int },
            { name: 'limit', value: parseInt(limit), type: sql.Int }
        );

        const result = await executeQuery(query, params);
        const historyData = result.slice(0, -1);
        const total = result[result.length - 1].Total;

        res.json(ApiResponse.success(historyData, '获取治疗历史列表成功', {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / limit)
        }));

    } catch (error) {
        console.error('获取治疗历史列表失败:', error);
        res.status(500).json(ApiResponse.error('获取治疗历史列表失败'));
    }
});

// 获取单个治疗历史详情
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const query = `
            SELECT
                th.*,
                c.Name as CustomerName,
                sp.PatientNumber,
                sp.PrimaryDiagnosis,
                isched.ScheduleDate as InfusionDate
            FROM TreatmentHistory th
            INNER JOIN Customers c ON th.CustomerID = c.ID
            INNER JOIN StemCellPatients sp ON th.PatientID = sp.ID
            LEFT JOIN InfusionSchedules isched ON th.InfusionScheduleID = isched.ID
            WHERE th.ID = @id AND th.Status = 'active'
        `;

        const params = [{ name: 'id', value: id, type: sql.UniqueIdentifier }];
        const result = await executeQuery(query, params);

        if (result.length === 0) {
            return res.status(404).json(ApiResponse.error('治疗历史记录不存在'));
        }

        res.json(ApiResponse.success(result[0], '获取治疗历史详情成功'));

    } catch (error) {
        console.error('获取治疗历史详情失败:', error);
        res.status(500).json(ApiResponse.error('获取治疗历史详情失败'));
    }
});

// 创建治疗历史记录
router.post('/', async (req, res) => {
    try {
        const {
            customerId,
            patientId,
            eventDate,
            eventType,
            eventTitle,
            eventDescription,
            infusionScheduleId,
            treatmentEffectivenessId,
            treatmentType,
            treatmentPhase,
            clinicalData,
            vitalSigns,
            symptoms,
            treatmentResponse,
            responseDetails,
            adverseEvents,
            severityGrade,
            attendingDoctor,
            department,
            notes
        } = req.body;

        // 验证必填字段
        if (!customerId || !patientId || !eventDate || !eventType || !eventTitle) {
            return res.status(400).json(ApiResponse.error('缺少必填字段'));
        }

        const query = `
            INSERT INTO TreatmentHistory (
                CustomerID, PatientID, EventDate, EventType, EventTitle, EventDescription,
                InfusionScheduleID, TreatmentEffectivenessID, TreatmentType, TreatmentPhase,
                ClinicalData, VitalSigns, Symptoms, TreatmentResponse, ResponseDetails,
                AdverseEvents, SeverityGrade, AttendingDoctor, Department, Notes, CreatedBy
            ) VALUES (
                @customerId, @patientId, @eventDate, @eventType, @eventTitle, @eventDescription,
                @infusionScheduleId, @treatmentEffectivenessId, @treatmentType, @treatmentPhase,
                @clinicalData, @vitalSigns, @symptoms, @treatmentResponse, @responseDetails,
                @adverseEvents, @severityGrade, @attendingDoctor, @department, @notes, @createdBy
            );
        `;

        const params = [
            { name: 'customerId', value: customerId, type: sql.UniqueIdentifier },
            { name: 'patientId', value: patientId, type: sql.UniqueIdentifier },
            { name: 'eventDate', value: eventDate, type: sql.Date },
            { name: 'eventType', value: eventType, type: sql.NVarChar },
            { name: 'eventTitle', value: eventTitle, type: sql.NVarChar },
            { name: 'eventDescription', value: eventDescription || null, type: sql.NVarChar },
            { name: 'infusionScheduleId', value: infusionScheduleId || null, type: sql.UniqueIdentifier },
            { name: 'treatmentEffectivenessId', value: treatmentEffectivenessId || null, type: sql.UniqueIdentifier },
            { name: 'treatmentType', value: treatmentType || null, type: sql.NVarChar },
            { name: 'treatmentPhase', value: treatmentPhase || null, type: sql.NVarChar },
            { name: 'clinicalData', value: clinicalData || null, type: sql.NVarChar },
            { name: 'vitalSigns', value: vitalSigns || null, type: sql.NVarChar },
            { name: 'symptoms', value: symptoms || null, type: sql.NVarChar },
            { name: 'treatmentResponse', value: treatmentResponse || null, type: sql.NVarChar },
            { name: 'responseDetails', value: responseDetails || null, type: sql.NVarChar },
            { name: 'adverseEvents', value: adverseEvents || null, type: sql.NVarChar },
            { name: 'severityGrade', value: severityGrade || null, type: sql.NVarChar },
            { name: 'attendingDoctor', value: attendingDoctor || null, type: sql.NVarChar },
            { name: 'department', value: department || null, type: sql.NVarChar },
            { name: 'notes', value: notes || null, type: sql.NVarChar },
            { name: 'createdBy', value: req.user?.username || 'system', type: sql.NVarChar }
        ];

        await executeQuery(query, params);

        res.json(ApiResponse.success(null, '创建治疗历史记录成功'));

    } catch (error) {
        console.error('创建治疗历史记录失败:', error);
        res.status(500).json(ApiResponse.error('创建治疗历史记录失败'));
    }
});

// 更新治疗历史记录
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            eventDate,
            eventType,
            eventTitle,
            eventDescription,
            treatmentType,
            treatmentPhase,
            clinicalData,
            vitalSigns,
            symptoms,
            treatmentResponse,
            responseDetails,
            adverseEvents,
            severityGrade,
            attendingDoctor,
            department,
            notes
        } = req.body;

        const query = `
            UPDATE TreatmentHistory SET
                EventDate = @eventDate,
                EventType = @eventType,
                EventTitle = @eventTitle,
                EventDescription = @eventDescription,
                TreatmentType = @treatmentType,
                TreatmentPhase = @treatmentPhase,
                ClinicalData = @clinicalData,
                VitalSigns = @vitalSigns,
                Symptoms = @symptoms,
                TreatmentResponse = @treatmentResponse,
                ResponseDetails = @responseDetails,
                AdverseEvents = @adverseEvents,
                SeverityGrade = @severityGrade,
                AttendingDoctor = @attendingDoctor,
                Department = @department,
                Notes = @notes,
                UpdatedAt = GETDATE(),
                UpdatedBy = @updatedBy
            WHERE ID = @id AND Status = 'active'
        `;

        const params = [
            { name: 'id', value: id, type: sql.UniqueIdentifier },
            { name: 'eventDate', value: eventDate, type: sql.Date },
            { name: 'eventType', value: eventType, type: sql.NVarChar },
            { name: 'eventTitle', value: eventTitle, type: sql.NVarChar },
            { name: 'eventDescription', value: eventDescription || null, type: sql.NVarChar },
            { name: 'treatmentType', value: treatmentType || null, type: sql.NVarChar },
            { name: 'treatmentPhase', value: treatmentPhase || null, type: sql.NVarChar },
            { name: 'clinicalData', value: clinicalData || null, type: sql.NVarChar },
            { name: 'vitalSigns', value: vitalSigns || null, type: sql.NVarChar },
            { name: 'symptoms', value: symptoms || null, type: sql.NVarChar },
            { name: 'treatmentResponse', value: treatmentResponse || null, type: sql.NVarChar },
            { name: 'responseDetails', value: responseDetails || null, type: sql.NVarChar },
            { name: 'adverseEvents', value: adverseEvents || null, type: sql.NVarChar },
            { name: 'severityGrade', value: severityGrade || null, type: sql.NVarChar },
            { name: 'attendingDoctor', value: attendingDoctor || null, type: sql.NVarChar },
            { name: 'department', value: department || null, type: sql.NVarChar },
            { name: 'notes', value: notes || null, type: sql.NVarChar },
            { name: 'updatedBy', value: req.user?.username || 'system', type: sql.NVarChar }
        ];

        const result = await executeQuery(query, params);

        if (result.rowsAffected === 0) {
            return res.status(404).json(ApiResponse.error('治疗历史记录不存在'));
        }

        res.json(ApiResponse.success(null, '更新治疗历史记录成功'));

    } catch (error) {
        console.error('更新治疗历史记录失败:', error);
        res.status(500).json(ApiResponse.error('更新治疗历史记录失败'));
    }
});

// 删除治疗历史记录
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const query = `
            UPDATE TreatmentHistory
            SET Status = 'deleted', UpdatedAt = GETDATE(), UpdatedBy = @updatedBy
            WHERE ID = @id AND Status = 'active'
        `;

        const params = [
            { name: 'id', value: id, type: sql.UniqueIdentifier },
            { name: 'updatedBy', value: req.user?.username || 'system', type: sql.NVarChar }
        ];

        const result = await executeQuery(query, params);

        if (result.rowsAffected === 0) {
            return res.status(404).json(ApiResponse.error('治疗历史记录不存在'));
        }

        res.json(ApiResponse.success(null, '删除治疗历史记录成功'));

    } catch (error) {
        console.error('删除治疗历史记录失败:', error);
        res.status(500).json(ApiResponse.error('删除治疗历史记录失败'));
    }
});

// 获取患者的完整治疗时间线
router.get('/timeline/:patientId', async (req, res) => {
    try {
        const { patientId } = req.params;
        const { limit = 50 } = req.query;

        const query = `
            SELECT
                'history' as type,
                th.EventDate as date,
                th.EventType as eventType,
                th.EventTitle as title,
                th.EventDescription as description,
                th.TreatmentType as treatmentType,
                th.TreatmentResponse as response,
                th.AttendingDoctor as doctor,
                th.Department as department,
                th.AdverseEvents as adverseEvents,
                th.CreatedAt as createdAt
            FROM TreatmentHistory th
            WHERE th.PatientID = @patientId AND th.Status = 'active'

            UNION ALL

            SELECT
                'infusion' as type,
                isched.ScheduleDate as date,
                '输液' as eventType,
                '干细胞输注' as title,
                '第' + CAST(isched.InfusionCount as VARCHAR) + '次输液' as description,
                isched.TreatmentType as treatmentType,
                isched.Status as response,
                isched.Doctor as doctor,
                NULL as department,
                NULL as adverseEvents,
                isched.CreatedAt as createdAt
            FROM InfusionSchedules isched
            WHERE isched.PatientID = @patientId

            UNION ALL

            SELECT
                'effectiveness' as type,
                te.AssessmentDate as date,
                '疗效评估' as eventType,
                '治疗效果评估' as title,
                te.EffectivenessType + ' - 总体评分:' + CAST(te.OverallEffectiveness as VARCHAR) as description,
                NULL as treatmentType,
                te.EffectivenessType as response,
                te.DoctorID as doctor,
                NULL as department,
                te.SideEffects as adverseEvents,
                te.CreatedAt as createdAt
            FROM TreatmentEffectiveness te
            WHERE te.PatientID = @patientId AND te.Status = 'active'

            ORDER BY date DESC, createdAt DESC
            OFFSET 0 ROWS FETCH NEXT @limit ROWS ONLY;
        `;

        const params = [
            { name: 'patientId', value: patientId, type: sql.UniqueIdentifier },
            { name: 'limit', value: parseInt(limit), type: sql.Int }
        ];

        const result = await executeQuery(query, params);

        res.json(ApiResponse.success(result, '获取患者治疗时间线成功'));

    } catch (error) {
        console.error('获取患者治疗时间线失败:', error);
        res.status(500).json(ApiResponse.error('获取患者治疗时间线失败'));
    }
});

// 获取治疗历史统计数据
router.get('/statistics/summary', async (req, res) => {
    try {
        const { dateFrom, dateTo } = req.query;

        let whereClause = '';
        let params = [];

        if (dateFrom) {
            whereClause += ' AND EventDate >= @dateFrom';
            params.push({ name: 'dateFrom', value: dateFrom, type: sql.Date });
        }

        if (dateTo) {
            whereClause += ' AND EventDate <= @dateTo';
            params.push({ name: 'dateTo', value: dateTo, type: sql.Date });
        }

        // 事件类型统计
        const eventTypeQuery = `
            SELECT
                EventType,
                COUNT(*) as count
            FROM TreatmentHistory
            WHERE Status = 'active'${whereClause}
            GROUP BY EventType
            ORDER BY count DESC
        `;

        // 治疗响应统计
        const responseQuery = `
            SELECT
                TreatmentResponse,
                COUNT(*) as count
            FROM TreatmentHistory
            WHERE Status = 'active' AND TreatmentResponse IS NOT NULL${whereClause}
            GROUP BY TreatmentResponse
            ORDER BY count DESC
        `;

        // 不良事件统计
        const adverseQuery = `
            SELECT
                COUNT(*) as totalEvents,
                SUM(CASE WHEN AdverseEvents IS NOT NULL AND AdverseEvents != '{}' THEN 1 ELSE 0 END) as withAdverseEvents,
                SUM(CASE WHEN SeverityGrade IN ('严重', '重度') THEN 1 ELSE 0 END) as severeEvents
            FROM TreatmentHistory
            WHERE Status = 'active'${whereClause}
        `;

        const [eventTypeResult, responseResult, adverseResult] = await Promise.all([
            executeQuery(eventTypeQuery, params),
            executeQuery(responseQuery, params),
            executeQuery(adverseQuery, params)
        ]);

        const totalEvents = eventTypeResult.reduce((sum, item) => sum + item.count, 0);

        const statistics = {
            eventTypes: eventTypeResult.map(item => ({
                eventType: item.EventType,
                count: item.count,
                percentage: totalEvents > 0 ? Math.round((item.count / totalEvents) * 100) : 0
            })),
            treatmentResponses: responseResult.map(item => ({
                response: item.TreatmentResponse,
                count: item.count
            })),
            adverseEvents: {
                totalEvents: adverseResult[0]?.totalEvents || 0,
                withAdverseEvents: adverseResult[0]?.withAdverseEvents || 0,
                severeEvents: adverseResult[0]?.severeEvents || 0,
                adverseRate: adverseResult[0]?.totalEvents > 0 ?
                    Math.round((adverseResult[0]?.withAdverseEvents / adverseResult[0]?.totalEvents) * 100) : 0
            }
        };

        res.json(ApiResponse.success(statistics, '获取治疗历史统计数据成功'));

    } catch (error) {
        console.error('获取治疗历史统计数据失败:', error);
        res.status(500).json(ApiResponse.error('获取治疗历史统计数据失败'));
    }
});

module.exports = router;