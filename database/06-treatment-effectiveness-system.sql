-- =====================================================
-- 治疗效果评估系统数据库表结构
-- =====================================================

-- 1. 治疗效果评估表
CREATE TABLE TreatmentEffectiveness (
    ID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    CustomerID UNIQUEIDENTIFIER NOT NULL,
    PatientID UNIQUEIDENTIFIER NOT NULL,
    InfusionScheduleID UNIQUEIDENTIFIER NULL,  -- 关联具体输液安排

    -- 基础评估信息
    AssessmentDate DATE NOT NULL,
    AssessmentPeriod VARCHAR(50) NOT NULL,     -- 评估周期: 治疗前/治疗中/治疗后/随访期

    -- 疗效评估结果
    EffectivenessType VARCHAR(50) NOT NULL,    -- 效果类型: 显著改善/改善/稳定/无效/恶化
    OverallEffectiveness DECIMAL(5,2),         -- 总体效果评分 (0-100)
    SymptomImprovement DECIMAL(5,2),           -- 症状改善评分 (0-100)
    QualityOfLifeImprovement DECIMAL(5,2),     -- 生活质量改善评分 (0-100)

    -- 具体评估项目
    PrimaryIndicators NVARCHAR(MAX),           -- 主要指标评估(JSON格式)
    SecondaryIndicators NVARCHAR(MAX),         -- 次要指标评估(JSON格式)
    LabResults NVARCHAR(MAX),                  -- 实验室结果对比(JSON格式)

    -- 医生评估
    DoctorAssessment NVARCHAR(2000),           -- 医生综合评估意见
    TreatmentAdjustment NVARCHAR(1000),        -- 治疗方案调整建议
    NextAssessmentDate DATE,                   -- 下次评估日期

    -- 患者反馈
    PatientFeedback NVARCHAR(1000),            -- 患者主观反馈
    PatientSatisfaction INT,                   -- 患者满意度 (1-5)
    SideEffects NVARCHAR(500),                 -- 副作用记录

    -- 影像学和检查资料
    ImagingComparison NVARCHAR(MAX),           -- 影像学对比资料(JSON格式)
    AdditionalTests NVARCHAR(MAX),             -- 附加检查结果(JSON格式)

    -- 系统字段
    DoctorID VARCHAR(50),                      -- 评估医生ID
    Status VARCHAR(20) DEFAULT 'active',       -- 记录状态: active/archived/deleted

    -- 审计字段
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2 DEFAULT GETDATE(),
    CreatedBy VARCHAR(100),
    UpdatedBy VARCHAR(100),

    -- 外键约束
    CONSTRAINT FK_TreatmentEffectiveness_Customers FOREIGN KEY (CustomerID) REFERENCES Customers(ID),
    CONSTRAINT FK_TreatmentEffectiveness_Patients FOREIGN KEY (PatientID) REFERENCES StemCellPatients(ID),
    CONSTRAINT FK_TreatmentEffectiveness_InfusionSchedules FOREIGN KEY (InfusionScheduleID) REFERENCES InfusionSchedules(ID)
);

-- 2. 治疗历史记录表
CREATE TABLE TreatmentHistory (
    ID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    CustomerID UNIQUEIDENTIFIER NOT NULL,
    PatientID UNIQUEIDENTIFIER NOT NULL,

    -- 治疗事件基础信息
    EventDate DATE NOT NULL,
    EventType VARCHAR(50) NOT NULL,            -- 事件类型: 初始评估/输液/疗效评估/随访/方案调整/不良反应

    -- 关联信息
    InfusionScheduleID UNIQUEIDENTIFIER NULL,
    TreatmentEffectivenessID UNIQUEIDENTIFIER NULL,

    -- 事件详情
    EventTitle NVARCHAR(200) NOT NULL,
    EventDescription NVARCHAR(MAX),            -- 详细描述

    -- 治疗方案信息
    TreatmentType VARCHAR(100),
    TreatmentPhase VARCHAR(50),                -- 治疗阶段: 诱导期/巩固期/维持期

    -- 临床数据
    ClinicalData NVARCHAR(MAX),                -- 临床数据(JSON格式)
    VitalSigns NVARCHAR(MAX),                  -- 生命体征(JSON格式)
    Symptoms NVARCHAR(MAX),                    -- 症状记录(JSON格式)

    -- 治疗响应
    TreatmentResponse VARCHAR(50),             -- 治疗响应: 完全缓解/部分缓解/稳定/进展
    ResponseDetails NVARCHAR(1000),            -- 响应详情

    -- 不良事件
    AdverseEvents NVARCHAR(MAX),               -- 不良事件记录(JSON格式)
    SeverityGrade VARCHAR(20),                 -- 严重程度分级

    -- 医生信息
    AttendingDoctor VARCHAR(100),
    Department VARCHAR(100),

    -- 备注
    Notes NVARCHAR(2000),

    -- 系统字段
    Status VARCHAR(20) DEFAULT 'active',

    -- 审计字段
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2 DEFAULT GETDATE(),
    CreatedBy VARCHAR(100),
    UpdatedBy VARCHAR(100),

    -- 外键约束
    CONSTRAINT FK_TreatmentHistory_Customers FOREIGN KEY (CustomerID) REFERENCES Customers(ID),
    CONSTRAINT FK_TreatmentHistory_Patients FOREIGN KEY (PatientID) REFERENCES StemCellPatients(ID),
    CONSTRAINT FK_TreatmentHistory_InfusionSchedules FOREIGN KEY (InfusionScheduleID) REFERENCES InfusionSchedules(ID),
    CONSTRAINT FK_TreatmentHistory_TreatmentEffectiveness FOREIGN KEY (TreatmentEffectivenessID) REFERENCES TreatmentEffectiveness(ID)
);

-- 3. 创建索引以提高查询性能
CREATE INDEX IX_TreatmentEffectiveness_CustomerID ON TreatmentEffectiveness(CustomerID);
CREATE INDEX IX_TreatmentEffectiveness_PatientID ON TreatmentEffectiveness(PatientID);
CREATE INDEX IX_TreatmentEffectiveness_AssessmentDate ON TreatmentEffectiveness(AssessmentDate);
CREATE INDEX IX_TreatmentEffectiveness_EffectivenessType ON TreatmentEffectiveness(EffectivenessType);
CREATE INDEX IX_TreatmentEffectiveness_Status ON TreatmentEffectiveness(Status);

CREATE INDEX IX_TreatmentHistory_CustomerID ON TreatmentHistory(CustomerID);
CREATE INDEX IX_TreatmentHistory_PatientID ON TreatmentHistory(PatientID);
CREATE INDEX IX_TreatmentHistory_EventDate ON TreatmentHistory(EventDate);
CREATE INDEX IX_TreatmentHistory_EventType ON TreatmentHistory(EventType);
CREATE INDEX IX_TreatmentHistory_Status ON TreatmentHistory(Status);

-- 4. 创建治疗效果评估视图
CREATE VIEW v_TreatmentEffectivenessSummary AS
SELECT
    te.ID,
    te.CustomerID,
    c.Name AS CustomerName,
    te.PatientID,
    sp.PatientNumber,
    te.AssessmentDate,
    te.AssessmentPeriod,
    te.EffectivenessType,
    te.OverallEffectiveness,
    te.SymptomImprovement,
    te.QualityOfLifeImprovement,
    te.DoctorAssessment,
    te.PatientSatisfaction,
    te.DoctorID,
    te.CreatedAt
FROM TreatmentEffectiveness te
INNER JOIN Customers c ON te.CustomerID = c.ID
INNER JOIN StemCellPatients sp ON te.PatientID = sp.ID
WHERE te.Status = 'active';

-- 5. 创建治疗历史视图
CREATE VIEW v_TreatmentHistorySummary AS
SELECT
    th.ID,
    th.CustomerID,
    c.Name AS CustomerName,
    th.PatientID,
    sp.PatientNumber,
    th.EventDate,
    th.EventType,
    th.EventTitle,
    th.TreatmentType,
    th.TreatmentPhase,
    th.TreatmentResponse,
    th.AttendingDoctor,
    th.Department,
    th.CreatedAt
FROM TreatmentHistory th
INNER JOIN Customers c ON th.CustomerID = c.ID
INNER JOIN StemCellPatients sp ON th.PatientID = sp.ID
WHERE th.Status = 'active'
ORDER BY th.EventDate DESC;

-- 6. 插入一些示例数据 (基于现有崔博的数据)
DECLARE @customerID UNIQUEIDENTIFIER = (SELECT ID FROM Customers WHERE Name = '崔博');
DECLARE @patientID UNIQUEIDENTIFIER = (SELECT ID FROM StemCellPatients WHERE CustomerID = @customerID);

IF @customerID IS NOT NULL AND @patientID IS NOT NULL
BEGIN
    -- 插入治疗历史记录
    INSERT INTO TreatmentHistory (
        CustomerID, PatientID, EventDate, EventType, EventTitle, EventDescription,
        TreatmentType, TreatmentPhase, AttendingDoctor, Department, CreatedBy
    ) VALUES
    (@customerID, @patientID, '2025-10-06', '初始评估', '干细胞治疗前评估', '患者因高血压疾病开始干细胞治疗前综合评估',
     'MSC', '诱导期', '医生', '心血管科', 'system'),

    (@customerID, @patientID, '2025-10-08', '输液', '首次干细胞输注', '完成首次干细胞输注治疗，过程顺利，无明显不良反应',
     'MSC', '诱导期', '医生', '心血管科', 'system');

    -- 获取刚插入的输液记录ID
    DECLARE @infusionID UNIQUEIDENTIFIER = (SELECT TOP 1 ID FROM InfusionSchedules WHERE PatientID = @patientID);

    -- 插入治疗效果评估
    INSERT INTO TreatmentEffectiveness (
        CustomerID, PatientID, InfusionScheduleID, AssessmentDate, AssessmentPeriod,
        EffectivenessType, OverallEffectiveness, SymptomImprovement, QualityOfLifeImprovement,
        DoctorAssessment, PatientFeedback, PatientSatisfaction, DoctorID, CreatedBy
    ) VALUES
    (@customerID, @patientID, @infusionID, '2025-10-08', '治疗后',
     '改善', 75.0, 70.0, 80.0,
     '患者完成首次干细胞输注，血压控制有所改善，建议继续按计划进行治疗',
     '治疗过程顺利，无明显不适，期望进一步改善', 4, 'doctor001', 'system');
END

-- 7. 创建统计存储过程
CREATE PROCEDURE sp_GetTreatmentEffectivenessStats
    @DateFrom DATE = NULL,
    @DateTo DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        EffectivenessType,
        COUNT(*) as Count,
        CAST(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() AS DECIMAL(5,2)) as Percentage
    FROM TreatmentEffectiveness
    WHERE Status = 'active'
    AND (@DateFrom IS NULL OR AssessmentDate >= @DateFrom)
    AND (@DateTo IS NULL OR AssessmentDate <= @DateTo)
    GROUP BY EffectivenessType
    ORDER BY Count DESC;
END

CREATE PROCEDURE sp_GetTreatmentHistoryStats
    @DateFrom DATE = NULL,
    @DateTo DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        EventType,
        COUNT(*) as Count,
        CAST(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() AS DECIMAL(5,2)) as Percentage
    FROM TreatmentHistory
    WHERE Status = 'active'
    AND (@DateFrom IS NULL OR EventDate >= @DateFrom)
    AND (@DateTo IS NULL OR EventDate <= @DateTo)
    GROUP BY EventType
    ORDER BY Count DESC;
END

PRINT '治疗效果评估系统数据库表结构创建完成！';