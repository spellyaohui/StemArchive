-- =====================================================================================
-- 健康数据表结构创建脚本
-- 版本: 1.0.0
-- 日期: 2025-10-06
-- 用途: 创建检验科、常规科室、影像科室健康数据表
-- =====================================================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;

PRINT '====================================================================================';
PRINT '健康数据表结构创建开始';
PRINT '版本: 1.0.0';
PRINT '开始时间: ' + CONVERT(NVARCHAR, GETDATE(), 120);
PRINT '====================================================================================';

-- =====================================================================================
-- 1. 创建检验科健康数据表
-- =====================================================================================

PRINT '正在创建检验科健康数据表...';

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'LabHealthData')
BEGIN
    CREATE TABLE [dbo].[LabHealthData] (
        [ID] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        [CustomerID] UNIQUEIDENTIFIER NOT NULL,
        [MedicalExamID] NVARCHAR(50) NOT NULL,
        [DepartmentID] UNIQUEIDENTIFIER NOT NULL,
        [TestDate] DATE NOT NULL,
        [TestName] NVARCHAR(200) NOT NULL,
        [TestResult] NVARCHAR(500) NOT NULL,
        [ReferenceValue] NVARCHAR(200) NULL,
        [Unit] NVARCHAR(50) NULL,
        [AbnormalStatus] INT NOT NULL DEFAULT 0,
        [Doctor] NVARCHAR(100) NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [UpdatedAt] DATETIME2 NULL,
        PRIMARY KEY ([ID]),
        FOREIGN KEY ([CustomerID]) REFERENCES [dbo].[Customers]([ID]),
        FOREIGN KEY ([DepartmentID]) REFERENCES [dbo].[Departments]([ID])
    );

    -- 创建索引
    CREATE INDEX [IX_LabHealthData_CustomerID] ON [dbo].[LabHealthData] ([CustomerID]);
    CREATE INDEX [IX_LabHealthData_MedicalExamID] ON [dbo].[LabHealthData] ([MedicalExamID]);
    CREATE INDEX [IX_LabHealthData_TestDate] ON [dbo].[LabHealthData] ([TestDate]);
    CREATE INDEX [IX_LabHealthData_DepartmentID] ON [dbo].[LabHealthData] ([DepartmentID]);

    PRINT '✓ 成功创建LabHealthData表';
END
ELSE
BEGIN
    -- 检查是否需要添加MedicalExamID字段
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'LabHealthData'
        AND COLUMN_NAME = 'MedicalExamID'
    )
    BEGIN
        ALTER TABLE [dbo].[LabHealthData]
        ADD [MedicalExamID] NVARCHAR(50) NOT NULL DEFAULT '';

        -- 创建MedicalExamID索引
        CREATE INDEX [IX_LabHealthData_MedicalExamID] ON [dbo].[LabHealthData] ([MedicalExamID]);

        PRINT '✓ 成功为LabHealthData添加MedicalExamID字段';
    END
    ELSE
    BEGIN
        PRINT '⚠ LabHealthData表已存在MedicalExamID字段';
    END
END;

-- =====================================================================================
-- 2. 创建常规科室健康数据表
-- =====================================================================================

PRINT '正在创建常规科室健康数据表...';

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'GeneralHealthData')
BEGIN
    CREATE TABLE [dbo].[GeneralHealthData] (
        [ID] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        [CustomerID] UNIQUEIDENTIFIER NOT NULL,
        [MedicalExamID] NVARCHAR(50) NOT NULL,
        [DepartmentID] UNIQUEIDENTIFIER NOT NULL,
        [AssessmentDate] DATE NOT NULL,
        [ItemName] NVARCHAR(200) NOT NULL,
        [ItemResult] NVARCHAR(1000) NOT NULL,
        [Doctor] NVARCHAR(100) NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [UpdatedAt] DATETIME2 NULL,
        PRIMARY KEY ([ID]),
        FOREIGN KEY ([CustomerID]) REFERENCES [dbo].[Customers]([ID]),
        FOREIGN KEY ([DepartmentID]) REFERENCES [dbo].[Departments]([ID])
    );

    -- 创建索引
    CREATE INDEX [IX_GeneralHealthData_CustomerID] ON [dbo].[GeneralHealthData] ([CustomerID]);
    CREATE INDEX [IX_GeneralHealthData_MedicalExamID] ON [dbo].[GeneralHealthData] ([MedicalExamID]);
    CREATE INDEX [IX_GeneralHealthData_AssessmentDate] ON [dbo].[GeneralHealthData] ([AssessmentDate]);
    CREATE INDEX [IX_GeneralHealthData_DepartmentID] ON [dbo].[GeneralHealthData] ([DepartmentID]);

    PRINT '✓ 成功创建GeneralHealthData表';
END
ELSE
BEGIN
    -- 检查是否需要添加MedicalExamID字段
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'GeneralHealthData'
        AND COLUMN_NAME = 'MedicalExamID'
    )
    BEGIN
        ALTER TABLE [dbo].[GeneralHealthData]
        ADD [MedicalExamID] NVARCHAR(50) NOT NULL DEFAULT '';

        -- 创建MedicalExamID索引
        CREATE INDEX [IX_GeneralHealthData_MedicalExamID] ON [dbo].[GeneralHealthData] ([MedicalExamID]);

        PRINT '✓ 成功为GeneralHealthData添加MedicalExamID字段';
    END
    ELSE
    BEGIN
        PRINT '⚠ GeneralHealthData表已存在MedicalExamID字段';
    END
END;

-- =====================================================================================
-- 3. 创建影像科室健康数据表
-- =====================================================================================

PRINT '正在创建影像科室健康数据表...';

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ImagingHealthData')
BEGIN
    CREATE TABLE [dbo].[ImagingHealthData] (
        [ID] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        [CustomerID] UNIQUEIDENTIFIER NOT NULL,
        [MedicalExamID] NVARCHAR(50) NOT NULL,
        [DepartmentID] UNIQUEIDENTIFIER NOT NULL,
        [ExamDate] DATE NOT NULL,
        [ExamDescription] NVARCHAR(MAX) NOT NULL,
        [ExamConclusion] NVARCHAR(2000) NOT NULL,
        [Doctor] NVARCHAR(100) NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [UpdatedAt] DATETIME2 NULL,
        PRIMARY KEY ([ID]),
        FOREIGN KEY ([CustomerID]) REFERENCES [dbo].[Customers]([ID]),
        FOREIGN KEY ([DepartmentID]) REFERENCES [dbo].[Departments]([ID])
    );

    -- 创建索引
    CREATE INDEX [IX_ImagingHealthData_CustomerID] ON [dbo].[ImagingHealthData] ([CustomerID]);
    CREATE INDEX [IX_ImagingHealthData_MedicalExamID] ON [dbo].[ImagingHealthData] ([MedicalExamID]);
    CREATE INDEX [IX_ImagingHealthData_ExamDate] ON [dbo].[ImagingHealthData] ([ExamDate]);
    CREATE INDEX [IX_ImagingHealthData_DepartmentID] ON [dbo].[ImagingHealthData] ([DepartmentID]);

    PRINT '✓ 成功创建ImagingHealthData表';
END
ELSE
BEGIN
    -- 检查是否需要添加MedicalExamID字段
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'ImagingHealthData'
        AND COLUMN_NAME = 'MedicalExamID'
    )
    BEGIN
        ALTER TABLE [dbo].[ImagingHealthData]
        ADD [MedicalExamID] NVARCHAR(50) NOT NULL DEFAULT '';

        -- 创建MedicalExamID索引
        CREATE INDEX [IX_ImagingHealthData_MedicalExamID] ON [dbo].[ImagingHealthData] ([MedicalExamID]);

        PRINT '✓ 成功为ImagingHealthData添加MedicalExamID字段';
    END
    ELSE
    BEGIN
        PRINT '⚠ ImagingHealthData表已存在MedicalExamID字段';
    END
END;

-- =====================================================================================
-- 4. 创建体检ID唯一约束（跨表检查）
-- =====================================================================================

PRINT '正在创建体检ID唯一约束...';

-- 为每个表的MedicalExamID创建唯一约束
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'UQ_LabHealthData_MedicalExamID'
    AND object_id = OBJECT_ID('dbo.LabHealthData')
)
BEGIN
    ALTER TABLE [dbo].[LabHealthData]
    ADD CONSTRAINT [UQ_LabHealthData_MedicalExamID] UNIQUE ([MedicalExamID]);
    PRINT '✓ 创建LabHealthData表MedicalExamID唯一约束';
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'UQ_GeneralHealthData_MedicalExamID'
    AND object_id = OBJECT_ID('dbo.GeneralHealthData')
)
BEGIN
    ALTER TABLE [dbo].[GeneralHealthData]
    ADD CONSTRAINT [UQ_GeneralHealthData_MedicalExamID] UNIQUE ([MedicalExamID]);
    PRINT '✓ 创建GeneralHealthData表MedicalExamID唯一约束';
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'UQ_ImagingHealthData_MedicalExamID'
    AND object_id = OBJECT_ID('dbo.ImagingHealthData')
)
BEGIN
    ALTER TABLE [dbo].[ImagingHealthData]
    ADD CONSTRAINT [UQ_ImagingHealthData_MedicalExamID] UNIQUE ([MedicalExamID]);
    PRINT '✓ 创建ImagingHealthData表MedicalExamID唯一约束';
END

-- =====================================================================================
-- 5. 创建示例数据
-- =====================================================================================

PRINT '检查并插入示例数据...';

-- 获取第一个客户ID作为示例
DECLARE @SampleCustomerID UNIQUEIDENTIFIER;
SELECT TOP 1 @SampleCustomerID = ID FROM [dbo].[Customers];

-- 获取第一个科室ID作为示例
DECLARE @SampleDepartmentID UNIQUEIDENTIFIER;
SELECT TOP 1 @SampleDepartmentID = ID FROM [dbo].[Departments];

IF @SampleCustomerID IS NOT NULL AND @SampleDepartmentID IS NOT NULL
BEGIN
    -- 检查是否已有示例数据
    IF NOT EXISTS (SELECT 1 FROM [dbo].[LabHealthData] WHERE MedicalExamID LIKE 'SAMPLE_%')
    BEGIN
        -- 插入检验科示例数据
        INSERT INTO [dbo].[LabHealthData] (
            CustomerID, MedicalExamID, DepartmentID, TestDate, TestName, TestResult,
            ReferenceValue, Unit, AbnormalStatus, Doctor
        ) VALUES
        (@SampleCustomerID, 'SAMPLE_LAB_001', @SampleDepartmentID, GETDATE(), '血常规', '4.5', '3.5-9.5', '10^9/L', 0, '张医生'),
        (@SampleCustomerID, 'SAMPLE_LAB_002', @SampleDepartmentID, GETDATE(), '肝功能', '正常', '参考范围内', '', 0, '李医生');

        PRINT '✓ 插入检验科示例数据';
    END

    IF NOT EXISTS (SELECT 1 FROM [dbo].[GeneralHealthData] WHERE MedicalExamID LIKE 'SAMPLE_%')
    BEGIN
        -- 插入常规科室示例数据
        INSERT INTO [dbo].[GeneralHealthData] (
            CustomerID, MedicalExamID, DepartmentID, AssessmentDate, ItemName, ItemResult, Doctor
        ) VALUES
        (@SampleCustomerID, 'SAMPLE_GEN_001', @SampleDepartmentID, GETDATE(), '血压', '120/80 mmHg', '王医生'),
        (@SampleCustomerID, 'SAMPLE_GEN_002', @SampleDepartmentID, GETDATE(), '心率', '72次/分', '王医生');

        PRINT '✓ 插入常规科室示例数据';
    END

    IF NOT EXISTS (SELECT 1 FROM [dbo].[ImagingHealthData] WHERE MedicalExamID LIKE 'SAMPLE_%')
    BEGIN
        -- 插入影像科室示例数据
        INSERT INTO [dbo].[ImagingHealthData] (
            CustomerID, MedicalExamID, DepartmentID, ExamDate, ExamDescription, ExamConclusion, Doctor
        ) VALUES
        (@SampleCustomerID, 'SAMPLE_IMG_001', @SampleDepartmentID, GETDATE(),
         '胸部X光片显示肺部纹理清晰，心脏大小正常，膈肌光滑。', '胸部X光检查未见明显异常', '赵医生');

        PRINT '✓ 插入影像科室示例数据';
    END
END
ELSE
BEGIN
    PRINT '⚠ 无客户或科室数据，跳过示例数据插入';
END;

PRINT '====================================================================================';
PRINT '健康数据表结构创建完成';
PRINT '完成时间: ' + CONVERT(NVARCHAR, GETDATE(), 120);
PRINT '====================================================================================';

-- 显示表结构信息
SELECT
    t.name AS TableName,
    COUNT(c.column_id) AS ColumnCount,
    (SELECT COUNT(*) FROM sys.indexes WHERE object_id = t.object_id) AS IndexCount
FROM sys.tables t
INNER JOIN sys.columns c ON t.object_id = c.object_id
WHERE t.name IN ('LabHealthData', 'GeneralHealthData', 'ImagingHealthData')
GROUP BY t.name
ORDER BY t.name;