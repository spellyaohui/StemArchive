-- =====================================================================================
-- 干细胞治疗档案管理系统 - 视图和存储过程
-- 版本: 1.0.0
-- 日期: 2025-10-05
-- 用途: 创建业务视图和存储过程
-- =====================================================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;

USE [HealthRecordSystem];

PRINT '开始创建视图和存储过程...';

-- =====================================================================================
-- 1. 业务视图
-- =====================================================================================

PRINT '创建业务视图...';

-- 客户档案完整度视图
IF EXISTS (SELECT 1 FROM sys.views WHERE name = 'CustomerProfileCompleteness')
BEGIN
    DROP VIEW [dbo].[CustomerProfileCompleteness];
    PRINT '✓ 已删除旧视图: CustomerProfileCompleteness';
END

EXEC ('
CREATE VIEW [dbo].[CustomerProfileCompleteness] AS
SELECT
    c.ID,
    c.IdentityCard,
    c.Name,
    c.Phone,
    CASE
        WHEN c.IdentityCard IS NOT NULL AND c.Name IS NOT NULL AND c.Phone IS NOT NULL
             AND c.Gender IS NOT NULL AND c.BirthDate IS NOT NULL
             AND c.Address IS NOT NULL AND c.EmergencyContact IS NOT NULL
        THEN 100
        WHEN c.IdentityCard IS NOT NULL AND c.Name IS NOT NULL AND c.Phone IS NOT NULL
        THEN 70
        WHEN c.IdentityCard IS NOT NULL AND c.Name IS NOT NULL
        THEN 50
        ELSE 30
    END AS ProfileCompleteness,
    ha.AssessmentDate AS LastHealthAssessment,
    sc.CreatedDate AS LastStemCellRecord,
    i.InfusionDate AS LastInfusionDate,
    CASE
        WHEN ha.AssessmentDate IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN sc.CreatedDate IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN i.InfusionDate IS NOT NULL THEN 1 ELSE 0 END AS ActivityCount
FROM [dbo].[Customers] c
LEFT JOIN [dbo].[HealthAssessments] ha ON c.ID = ha.CustomerID AND ha.AssessmentDate = (
    SELECT MAX(AssessmentDate) FROM [dbo].[HealthAssessments] WHERE CustomerID = c.ID
)
LEFT JOIN [dbo].[StemCellPatients] sc ON c.ID = sc.CustomerID AND sc.CreatedDate = (
    SELECT MAX(CreatedDate) FROM [dbo].[StemCellPatients] WHERE CustomerID = c.ID
)
LEFT JOIN [dbo].[InfusionSchedules] i ON c.ID = i.CustomerID AND i.InfusionDate = (
    SELECT MAX(InfusionDate) FROM [dbo].[InfusionSchedules] WHERE CustomerID = c.ID
);
');

PRINT '✓ 视图创建完成: CustomerProfileCompleteness';

-- 客户活动统计视图
IF EXISTS (SELECT 1 FROM sys.views WHERE name = 'CustomerActivityStats')
BEGIN
    DROP VIEW [dbo].[CustomerActivityStats];
    PRINT '✓ 已删除旧视图: CustomerActivityStats';
END

EXEC ('
CREATE VIEW [dbo].[CustomerActivityStats] AS
SELECT
    c.ID AS CustomerID,
    c.IdentityCard,
    c.Name,
    ISNULL(ha_count, 0) AS HealthAssessmentCount,
    ISNULL(sc_count, 0) AS StemCellCount,
    ISNULL(i_count, 0) AS InfusionCount,
    ISNULL(r_count, 0) AS ReportCount,
    ISNULL(m_count, 0) AS MedicalImageCount,
    CASE
        WHEN ISNULL(ha_count, 0) > 0 OR ISNULL(sc_count, 0) > 0
             OR ISNULL(i_count, 0) > 0 OR ISNULL(r_count, 0) > 0
        THEN ''活跃''
        ELSE ''不活跃''
    END AS ActivityStatus,
    CASE
        WHEN DATEDIFF(MONTH, ISNULL(GREATEST(ISNULL(ha_last, ''1900-01-01''), ISNULL(sc_last, ''1900-01-01''), ISNULL(i_last, ''1900-01-01'')), GETDATE()) <= 3
        THEN ''高活跃''
        WHEN DATEDIFF(MONTH, ISNULL(GREATEST(ISNULL(ha_last, ''1900-01-01''), ISNULL(sc_last, ''1900-01-01''), ISNULL(i_last, ''1900-01-01'')), GETDATE()) <= 6
        THEN ''中活跃''
        ELSE ''低活跃''
    END AS ActivityLevel
FROM [dbo].[Customers] c
LEFT JOIN (
    SELECT CustomerID, COUNT(*) AS ha_count, MAX(AssessmentDate) AS ha_last
    FROM [dbo].[HealthAssessments]
    GROUP BY CustomerID
) ha ON c.ID = ha.CustomerID
LEFT JOIN (
    SELECT CustomerID, COUNT(*) AS sc_count, MAX(CreatedDate) AS sc_last
    FROM [dbo].[StemCellPatients]
    GROUP BY CustomerID
) sc ON c.ID = sc.CustomerID
LEFT JOIN (
    SELECT CustomerID, COUNT(*) AS i_count, MAX(InfusionDate) AS i_last
    FROM [dbo].[InfusionSchedules]
    GROUP BY CustomerID
) i ON c.ID = i.CustomerID
LEFT JOIN (
    SELECT CustomerID, COUNT(*) AS r_count
    FROM [dbo].[Reports]
    GROUP BY CustomerID
) r ON c.ID = r.CustomerID
LEFT JOIN (
    SELECT CustomerID, COUNT(*) AS m_count
    FROM [dbo].[MedicalImages]
    GROUP BY CustomerID
) m ON c.ID = m.CustomerID;
');

PRINT '✓ 视图创建完成: CustomerActivityStats';

-- 治疗计划执行情况视图
IF EXISTS (SELECT 1 FROM sys.views WHERE name = 'TreatmentPlanExecution')
BEGIN
    DROP VIEW [dbo].[TreatmentPlanExecution];
    PRINT '✓ 已删除旧视图: TreatmentPlanExecution';
END

EXEC ('
CREATE VIEW [dbo].[TreatmentPlanExecution] AS
SELECT
    tp.ID AS TreatmentPlanID,
    tp.PlanName,
    tp.DiseaseType,
    tp.PlanDetails,
    c.ID AS CustomerID,
    c.IdentityCard,
    c.Name AS CustomerName,
    i.ID AS InfusionScheduleID,
    i.InfusionDate,
    i.InfusionStatus,
    i.Notes AS InfusionNotes,
    CASE
        WHEN i.InfusionStatus = ''已完成'' THEN ''已完成''
        WHEN i.InfusionDate < GETDATE() AND i.InfusionStatus = ''计划中'' THEN ''已逾期''
        WHEN i.InfusionDate >= GETDATE() AND i.InfusionStatus = ''计划中'' THEN ''进行中''
        ELSE ''未开始''
    END AS ExecutionStatus,
    DATEDIFF(DAY, GETDATE(), i.InfusionDate) AS DaysUntilInfusion
FROM [dbo].[TreatmentPlans] tp
JOIN [dbo].[Customers] c ON tp.CustomerID = c.ID
LEFT JOIN [dbo].[InfusionSchedules] i ON tp.ID = i.TreatmentPlanID;
');

PRINT '✓ 视图创建完成: TreatmentPlanExecution';

-- =====================================================================================
-- 2. 存储过程
-- =====================================================================================

PRINT '创建存储过程...';

-- 创建客户档案的存储过程
IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'CreateCustomer')
BEGIN
    DROP PROCEDURE [dbo].[CreateCustomer];
    PRINT '✓ 已删除旧存储过程: CreateCustomer';
END

EXEC ('
CREATE PROCEDURE [dbo].[CreateCustomer]
    @IdentityCard NVARCHAR(18),
    @Name NVARCHAR(100),
    @Gender NVARCHAR(10),
    @Age INT,
    @BirthDate DATE,
    @Phone NVARCHAR(20),
    @Address NVARCHAR(500),
    @BloodType NVARCHAR(10),
    @EmergencyContact NVARCHAR(100),
    @CreatedBy UNIQUEIDENTIFIER,
    @NewCustomerID UNIQUEIDENTIFIER OUTPUT,
    @ResultMessage NVARCHAR(500) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        -- 检查身份证号是否已存在
        IF EXISTS (SELECT 1 FROM [dbo].[Customers] WHERE IdentityCard = @IdentityCard)
        BEGIN
            SET @ResultMessage = ''身份证号已存在: '' + @IdentityCard;
            SET @NewCustomerID = NULL;
            RETURN;
        END

        -- 创建新客户
        INSERT INTO [dbo].[Customers] (
            IdentityCard, Name, Gender, Age, BirthDate, Phone,
            Address, BloodType, EmergencyContact, CreatedBy, CreatedDate
        ) VALUES (
            @IdentityCard, @Name, @Gender, @Age, @BirthDate, @Phone,
            @Address, @BloodType, @EmergencyContact, @CreatedBy, GETDATE()
        );

        SET @NewCustomerID = SCOPE_IDENTITY();
        SET @ResultMessage = ''客户创建成功'';

    END TRY
    BEGIN CATCH
        SET @ResultMessage = ''创建客户失败: '' + ERROR_MESSAGE();
        SET @NewCustomerID = NULL;
    END CATCH
END;
');

PRINT '✓ 存储过程创建完成: CreateCustomer';

-- 获取客户完整统计信息
IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'GetCustomerStatistics')
BEGIN
    DROP PROCEDURE [dbo].[GetCustomerStatistics];
    PRINT '✓ 已删除旧存储过程: GetCustomerStatistics';
END

EXEC ('
CREATE PROCEDURE [dbo].[GetCustomerStatistics]
    @CustomerID UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        c.*,
        ISNULL(ha.HealthAssessmentCount, 0) AS HealthAssessmentCount,
        ISNULL(sc.StemCellCount, 0) AS StemCellCount,
        ISNULL(i.InfusionCount, 0) AS InfusionCount,
        ISNULL(r.ReportCount, 0) AS ReportCount,
        ISNULL(m.MedicalImageCount, 0) AS MedicalImageCount,
        ha.LastHealthAssessment,
        sc.LastStemCellRecord,
        i.LastInfusionDate,
        CASE
            WHEN ISNULL(ha.HealthAssessmentCount, 0) > 0 OR ISNULL(sc.StemCellCount, 0) > 0
                 OR ISNULL(i.InfusionCount, 0) > 0 OR ISNULL(r.ReportCount, 0) > 0
            THEN ''活跃''
            ELSE ''不活跃''
        END AS ActivityStatus
    FROM [dbo].[Customers] c
    LEFT JOIN (
        SELECT CustomerID, COUNT(*) AS HealthAssessmentCount, MAX(AssessmentDate) AS LastHealthAssessment
        FROM [dbo].[HealthAssessments]
        WHERE CustomerID = @CustomerID
        GROUP BY CustomerID
    ) ha ON c.ID = ha.CustomerID
    LEFT JOIN (
        SELECT CustomerID, COUNT(*) AS StemCellCount, MAX(CreatedDate) AS LastStemCellRecord
        FROM [dbo].[StemCellPatients]
        WHERE CustomerID = @CustomerID
        GROUP BY CustomerID
    ) sc ON c.ID = sc.CustomerID
    LEFT JOIN (
        SELECT CustomerID, COUNT(*) AS InfusionCount, MAX(InfusionDate) AS LastInfusionDate
        FROM [dbo].[InfusionSchedules]
        WHERE CustomerID = @CustomerID
        GROUP BY CustomerID
    ) i ON c.ID = i.CustomerID
    LEFT JOIN (
        SELECT CustomerID, COUNT(*) AS ReportCount
        FROM [dbo].[Reports]
        WHERE CustomerID = @CustomerID
        GROUP BY CustomerID
    ) r ON c.ID = r.CustomerID
    LEFT JOIN (
        SELECT CustomerID, COUNT(*) AS MedicalImageCount
        FROM [dbo].[MedicalImages]
        WHERE CustomerID = @CustomerID
        GROUP BY CustomerID
    ) m ON c.ID = m.CustomerID
    WHERE c.ID = @CustomerID;
END;
');

PRINT '✓ 存储过程创建完成: GetCustomerStatistics';

-- 系统统计信息存储过程
IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'GetSystemStatistics')
BEGIN
    DROP PROCEDURE [dbo].[GetSystemStatistics];
    PRINT '✓ 已删除旧存储过程: GetSystemStatistics';
END

EXEC ('
CREATE PROCEDURE [dbo].[GetSystemStatistics]
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @TotalCustomers INT = (SELECT COUNT(*) FROM [dbo].[Customers]);
    DECLARE @ActiveCustomers INT = (
        SELECT COUNT(*) FROM [dbo].[CustomerActivityStats]
        WHERE ActivityStatus = ''活跃''
    );
    DECLARE @TotalHealthAssessments INT = (SELECT COUNT(*) FROM [dbo].[HealthAssessments]);
    DECLARE @TotalStemCellPatients INT = (SELECT COUNT(*) FROM [dbo].[StemCellPatients]);
    DECLARE @TotalInfusions INT = (SELECT COUNT(*) FROM [dbo].[InfusionSchedules]);
    DECLARE @TotalReports INT = (SELECT COUNT(*) FROM [dbo].[Reports]);
    DECLARE @TotalMedicalImages INT = (SELECT COUNT(*) FROM [dbo].[MedicalImages]);

    SELECT
        @TotalCustomers AS TotalCustomers,
        @ActiveCustomers AS ActiveCustomers,
        @TotalHealthAssessments AS TotalHealthAssessments,
        @TotalStemCellPatients AS TotalStemCellPatients,
        @TotalInfusions AS TotalInfusions,
        @TotalReports AS TotalReports,
        @TotalMedicalImages AS TotalMedicalImages,
        CASE WHEN @TotalCustomers > 0
             THEN CAST(@ActiveCustomers AS FLOAT) / @TotalCustomers * 100
             ELSE 0 END AS ActiveCustomerPercentage;
END;
');

PRINT '✓ 存储过程创建完成: GetSystemStatistics';

-- 批量创建输液计划的存储过程
IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'CreateInfusionSchedule')
BEGIN
    DROP PROCEDURE [dbo].[CreateInfusionSchedule];
    PRINT '✓ 已删除旧存储过程: CreateInfusionSchedule';
END

EXEC ('
CREATE PROCEDURE [dbo].[CreateInfusionSchedule]
    @TreatmentPlanID UNIQUEIDENTIFIER,
    @InfusionDates NVARCHAR(MAX),
    @CreatedBy UNIQUEIDENTIFIER,
    @ResultMessage NVARCHAR(500) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        DECLARE @Date DATE;
        DECLARE @Position INT = 1;
        DECLARE @Delimiter CHAR = '','';
        DECLARE @DateStr NVARCHAR(20);
        DECLARE @CreatedCount INT = 0;

        -- 验证治疗计划存在
        IF NOT EXISTS (SELECT 1 FROM [dbo].[TreatmentPlans] WHERE ID = @TreatmentPlanID)
        BEGIN
            SET @ResultMessage = ''治疗计划不存在'';
            RETURN;
        END

        -- 分割日期字符串并创建输液计划
        WHILE @Position > 0
        BEGIN
            SET @DateStr = LTRIM(RTRIM(
                CASE
                    WHEN CHARINDEX(@Delimiter, @InfusionDates, @Position) > 0
                    THEN SUBSTRING(@InfusionDates, @Position, CHARINDEX(@Delimiter, @InfusionDates, @Position) - @Position)
                    ELSE SUBSTRING(@InfusionDates, @Position, LEN(@InfusionDates) - @Position + 1)
                END
            ));

            IF ISDATE(@DateStr) = 1
            BEGIN
                SET @Date = CONVERT(DATE, @DateStr);

                INSERT INTO [dbo].[InfusionSchedules] (
                    TreatmentPlanID, CustomerID, InfusionDate, InfusionStatus,
                    CreatedBy, CreatedDate
                )
                SELECT
                    @TreatmentPlanID, CustomerID, @Date, ''计划中'', @CreatedBy, GETDATE()
                FROM [dbo].[TreatmentPlans]
                WHERE ID = @TreatmentPlanID;

                SET @CreatedCount = @CreatedCount + 1;
            END

            SET @Position = CASE
                WHEN CHARINDEX(@Delimiter, @InfusionDates, @Position) > 0
                THEN CHARINDEX(@Delimiter, @InfusionDates, @Position) + 1
                ELSE 0
            END;
        END

        SET @ResultMessage = ''成功创建 '' + CAST(@CreatedCount AS NVARCHAR) + '' 个输液计划'';

    END TRY
    BEGIN CATCH
        SET @ResultMessage = ''创建输液计划失败: '' + ERROR_MESSAGE();
    END CATCH
END;
');

PRINT '✓ 存储过程创建完成: CreateInfusionSchedule';

PRINT '✓ 所有视图和存储过程创建完成';