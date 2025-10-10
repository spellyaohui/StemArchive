-- =====================================================================================
-- 科室管理系统数据库更新脚本
-- 版本: 1.1.0
-- 日期: 2025-10-06
-- 用途: 添加科室类型管理和分类健康数据表
-- =====================================================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;

PRINT '====================================================================================';
PRINT '科室管理系统数据库更新开始';
PRINT '版本: 1.1.0';
PRINT '开始时间: ' + CONVERT(NVARCHAR, GETDATE(), 120);
PRINT '====================================================================================';

-- =====================================================================================
-- 1. 修改 Departments 表结构
-- =====================================================================================

PRINT '正在修改 Departments 表结构...';

-- 检查是否需要添加新字段
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Departments' AND COLUMN_NAME = 'Code')
BEGIN
    ALTER TABLE [dbo].[Departments] ADD [Code] NVARCHAR(50) NULL;
    PRINT '✓ 添加 Code 字段';
END;

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Departments' AND COLUMN_NAME = 'Type')
BEGIN
    ALTER TABLE [dbo].[Departments] ADD [Type] NVARCHAR(20) NOT NULL DEFAULT 'general';
    PRINT '✓ 添加 Type 字段';
END;

-- 更新现有数据的Code和Type
UPDATE [dbo].[Departments] SET
    [Code] = REPLACE(REPLACE(REPLACE([name], '科', ''), '室', ''), '部', '') + '_' + CAST([id] AS NVARCHAR(10)),
    [Type] = CASE
        WHEN [name] LIKE '%检验%' THEN 'laboratory'
        WHEN [name] LIKE '%影像%' OR [name] LIKE '%X光%' OR [name] LIKE '%CT%' OR [name] LIKE '%MRI%' THEN 'imaging'
        ELSE 'general'
    END
WHERE [Code] IS NULL;

-- 删除旧的唯一约束，创建新的唯一约束
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_Departments_name' AND object_id = OBJECT_ID('dbo.Departments'))
BEGIN
    DROP INDEX [UQ_Departments_name] ON [dbo].[Departments];
    PRINT '✓ 删除旧的名称唯一约束';
END;

-- 创建Code的唯一约束
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_Departments_Code' AND object_id = OBJECT_ID('dbo.Departments'))
BEGIN
    CREATE UNIQUE INDEX [UQ_Departments_Code] ON [dbo].[Departments] ([Code]);
    PRINT '✓ 创建Code唯一约束';
END;

-- 创建Type索引
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Departments_Type' AND object_id = OBJECT_ID('dbo.Departments'))
BEGIN
    CREATE INDEX [IX_Departments_Type] ON [dbo].[Departments] ([Type]);
    PRINT '✓ 创建Type索引';
END;

PRINT '✓ Departments 表结构修改完成';

-- =====================================================================================
-- 2. 创建分类健康数据表
-- =====================================================================================

-- 2.1 检验科健康数据表
PRINT '创建检验科健康数据表...';
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'LabHealthData' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[LabHealthData] (
        [ID] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        [CustomerID] UNIQUEIDENTIFIER NOT NULL,
        [DepartmentID] INT NOT NULL,
        [TestDate] DATE NOT NULL,
        [TestName] NVARCHAR(200) NOT NULL,
        [TestResult] NVARCHAR(500) NOT NULL,
        [ReferenceValue] NVARCHAR(200) NULL,
        [Unit] NVARCHAR(50) NULL,
        [AbnormalStatus] INT NOT NULL DEFAULT 0, -- 0:正常, 1:偏低, 2:偏高
        [Doctor] NVARCHAR(100) NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [UpdatedAt] DATETIME2 NULL,
        [CreatedBy] NVARCHAR(100) NULL,
        CONSTRAINT [FK_LabHealthData_Customers] FOREIGN KEY ([CustomerID]) REFERENCES [dbo].[Customers] ([ID]) ON DELETE CASCADE,
        CONSTRAINT [FK_LabHealthData_Departments] FOREIGN KEY ([DepartmentID]) REFERENCES [dbo].[Departments] ([id])
    );

    CREATE INDEX [IX_LabHealthData_Customer_TestDate] ON [dbo].[LabHealthData] ([CustomerID], [TestDate]);
    CREATE INDEX [IX_LabHealthData_Department] ON [dbo].[LabHealthData] ([DepartmentID]);
    CREATE INDEX [IX_LabHealthData_AbnormalStatus] ON [dbo].[LabHealthData] ([AbnormalStatus]);

    PRINT '✓ 检验科健康数据表创建完成';
END;

-- 2.2 常规科室健康数据表
PRINT '创建常规科室健康数据表...';
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'GeneralHealthData' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[GeneralHealthData] (
        [ID] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        [CustomerID] UNIQUEIDENTIFIER NOT NULL,
        [DepartmentID] INT NOT NULL,
        [AssessmentDate] DATE NOT NULL,
        [ItemName] NVARCHAR(200) NOT NULL,
        [ItemResult] NVARCHAR(1000) NOT NULL,
        [Doctor] NVARCHAR(100) NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [UpdatedAt] DATETIME2 NULL,
        [CreatedBy] NVARCHAR(100) NULL,
        CONSTRAINT [FK_GeneralHealthData_Customers] FOREIGN KEY ([CustomerID]) REFERENCES [dbo].[Customers] ([ID]) ON DELETE CASCADE,
        CONSTRAINT [FK_GeneralHealthData_Departments] FOREIGN KEY ([DepartmentID]) REFERENCES [dbo].[Departments] ([id])
    );

    CREATE INDEX [IX_GeneralHealthData_Customer_Date] ON [dbo].[GeneralHealthData] ([CustomerID], [AssessmentDate]);
    CREATE INDEX [IX_GeneralHealthData_Department] ON [dbo].[GeneralHealthData] ([DepartmentID]);

    PRINT '✓ 常规科室健康数据表创建完成';
END;

-- 2.3 影像科室健康数据表
PRINT '创建影像科室健康数据表...';
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ImagingHealthData' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[ImagingHealthData] (
        [ID] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        [CustomerID] UNIQUEIDENTIFIER NOT NULL,
        [DepartmentID] INT NOT NULL,
        [ExamDate] DATE NOT NULL,
        [ExamDescription] NVARCHAR(MAX) NOT NULL,
        [ExamConclusion] NVARCHAR(2000) NOT NULL,
        [Doctor] NVARCHAR(100) NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [UpdatedAt] DATETIME2 NULL,
        [CreatedBy] NVARCHAR(100) NULL,
        CONSTRAINT [FK_ImagingHealthData_Customers] FOREIGN KEY ([CustomerID]) REFERENCES [dbo].[Customers] ([ID]) ON DELETE CASCADE,
        CONSTRAINT [FK_ImagingHealthData_Departments] FOREIGN KEY ([DepartmentID]) REFERENCES [dbo].[Departments] ([id])
    );

    CREATE INDEX [IX_ImagingHealthData_Customer_Date] ON [dbo].[ImagingHealthData] ([CustomerID], [ExamDate]);
    CREATE INDEX [IX_ImagingHealthData_Department] ON [dbo].[ImagingHealthData] ([DepartmentID]);

    PRINT '✓ 影像科室健康数据表创建完成';
END;

-- =====================================================================================
-- 3. 更新科室初始数据
-- =====================================================================================

PRINT '更新科室初始数据...';

-- 插入示例科室数据（如果不存在）
IF NOT EXISTS (SELECT 1 FROM [dbo].[Departments] WHERE [Code] = 'LAB_001')
BEGIN
    INSERT INTO [dbo].[Departments] ([Name], [Code], [Description], [Type], [Status], [Sort_Order]) VALUES
    ('检验科', 'LAB_001', '血液检验、生化检验、免疫检验等', 'laboratory', 'active', 1),
    ('影像科', 'IMG_001', 'X光、CT、MRI、超声等影像检查', 'imaging', 'active', 2),
    ('内科', 'GEN_001', '内科常规检查和诊断', 'general', 'active', 3),
    ('外科', 'GEN_002', '外科常规检查和手术', 'general', 'active', 4),
    ('妇科', 'GEN_003', '妇科检查和妇女保健', 'general', 'active', 5),
    ('儿科', 'GEN_004', '儿科检查和儿童保健', 'general', 'active', 6),
    ('眼科', 'GEN_005', '眼科检查和视力保健', 'general', 'active', 7),
    ('耳鼻喉科', 'GEN_006', '耳鼻喉科检查和治疗', 'general', 'active', 8),
    ('口腔科', 'GEN_007', '口腔检查和牙科治疗', 'general', 'active', 8),
    ('功能科', 'GEN_008', '心电图、脑电图等功能检查', 'general', 'active', 9);

    PRINT '✓ 科室初始数据插入完成';
END;

PRINT '====================================================================================';
PRINT '科室管理系统数据库更新完成';
PRINT '完成时间: ' + CONVERT(NVARCHAR, GETDATE(), 120);
PRINT '====================================================================================';