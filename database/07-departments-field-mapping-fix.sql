-- =====================================================================================
-- 科室管理字段映射修复脚本
-- 版本: 1.1.1
-- 日期: 2025-10-06
-- 用途: 修复Departments表字段名称与后端代码的不匹配问题
-- =====================================================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;

PRINT '====================================================================================';
PRINT '科室管理字段映射修复开始';
PRINT '版本: 1.1.1';
PRINT '开始时间: ' + CONVERT(NVARCHAR, GETDATE(), 120);
PRINT '====================================================================================';

-- =====================================================================================
-- 1. 修复字段名称不匹配问题
-- =====================================================================================

PRINT '正在修复字段名称不匹配问题...';

-- 如果Type字段不存在，添加它
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Departments' AND COLUMN_NAME = 'Type')
BEGIN
    ALTER TABLE [dbo].[Departments] ADD [Type] NVARCHAR(20) NOT NULL DEFAULT 'general';
    PRINT '✓ 添加 Type 字段';
END;

-- 如果Status字段不存在，将IsActive重命名为Status（或者添加Status字段）
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Departments' AND COLUMN_NAME = 'Status')
BEGIN
    IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Departments' AND COLUMN_NAME = 'IsActive')
    BEGIN
        -- 先添加Status字段
        ALTER TABLE [dbo].[Departments] ADD [Status] NVARCHAR(20) NOT NULL DEFAULT 'active';

        -- 复制数据：bit -> nvarchar
        UPDATE [dbo].[Departments] SET [Status] = CASE WHEN [IsActive] = 1 THEN 'active' ELSE 'inactive' END;

        PRINT '✓ 添加 Status 字段并从 IsActive 复制数据';
    END
    ELSE
    BEGIN
        -- 直接添加Status字段
        ALTER TABLE [dbo].[Departments] ADD [Status] NVARCHAR(20) NOT NULL DEFAULT 'active';
        PRINT '✓ 添加 Status 字段';
    END
END;

-- 修复Sort_Order字段名称不匹配
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Departments' AND COLUMN_NAME = 'Sort_Order')
BEGIN
    IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Departments' AND COLUMN_NAME = 'SortOrder')
    BEGIN
        -- 重命名字段
        EXEC sp_rename '[dbo].[Departments].[SortOrder]', 'Sort_Order', 'COLUMN';
        PRINT '✓ 重命名 SortOrder 为 Sort_Order';
    END
    ELSE
    BEGIN
        -- 添加字段
        ALTER TABLE [dbo].[Departments] ADD [Sort_Order] INT NOT NULL DEFAULT 0;
        PRINT '✓ 添加 Sort_Order 字段';
    END
END;

-- 修复Created_At字段名称不匹配
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Departments' AND COLUMN_NAME = 'Created_At')
BEGIN
    IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Departments' AND COLUMN_NAME = 'CreatedAt')
    BEGIN
        -- 重命名字段
        EXEC sp_rename '[dbo].[Departments].[CreatedAt]', 'Created_At', 'COLUMN';
        PRINT '✓ 重命名 CreatedAt 为 Created_At';
    END
    ELSE
    BEGIN
        -- 添加字段
        ALTER TABLE [dbo].[Departments] ADD [Created_At] DATETIME2 NOT NULL DEFAULT GETDATE();
        PRINT '✓ 添加 Created_At 字段';
    END
END;

-- 修复Updated_At字段名称不匹配
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Departments' AND COLUMN_NAME = 'Updated_At')
BEGIN
    IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Departments' AND COLUMN_NAME = 'UpdatedAt')
    BEGIN
        -- 重命名字段
        EXEC sp_rename '[dbo].[Departments].[UpdatedAt]', 'Updated_At', 'COLUMN';
        PRINT '✓ 重命名 UpdatedAt 为 Updated_At';
    END
    ELSE
    BEGIN
        -- 添加字段
        ALTER TABLE [dbo].[Departments] ADD [Updated_At] DATETIME2 NULL;
        PRINT '✓ 添加 Updated_At 字段';
    END
END;

-- =====================================================================================
-- 2. 更新现有数据
-- =====================================================================================

PRINT '正在更新现有数据...';

-- 更新Code字段（如果为空）
UPDATE [dbo].[Departments] SET
    [Code] = REPLACE(REPLACE(REPLACE([Name], '科', ''), '室', ''), '部', '') + '_' + CAST([ID] AS NVARCHAR(10))
WHERE [Code] IS NULL OR [Code] = '';

-- 更新Type字段（如果为空）
UPDATE [dbo].[Departments] SET
    [Type] = CASE
        WHEN [Name] LIKE '%检验%' THEN 'laboratory'
        WHEN [Name] LIKE '%影像%' OR [Name] LIKE '%X光%' OR [Name] LIKE '%CT%' OR [Name] LIKE '%MRI%' THEN 'imaging'
        ELSE 'general'
    END
WHERE [Type] IS NULL OR [Type] = '';

-- 更新Sort_Order字段（如果为0）
UPDATE [dbo].[Departments] SET
    [Sort_Order] = CASE
        WHEN [Name] LIKE '%检验%' THEN 1
        WHEN [Name] LIKE '%影像%' THEN 2
        WHEN [Name] LIKE '%内%' THEN 3
        WHEN [Name] LIKE '%外%' THEN 4
        WHEN [Name] LIKE '%妇%' THEN 5
        WHEN [Name] LIKE '%儿%' THEN 6
        WHEN [Name] LIKE '%眼%' THEN 7
        WHEN [Name] LIKE '%耳%' THEN 8
        WHEN [Name] LIKE '%口%' THEN 9
        ELSE 10
    END
WHERE [Sort_Order] = 0;

PRINT '✓ 现有数据更新完成';

-- =====================================================================================
-- 3. 插入示例数据（如果表为空）
-- =====================================================================================

PRINT '检查并插入示例数据...';

IF NOT EXISTS (SELECT 1 FROM [dbo].[Departments] WHERE [Code] LIKE 'LAB_%')
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
    ('口腔科', 'GEN_007', '口腔检查和牙科治疗', 'general', 'active', 9),
    ('功能科', 'GEN_008', '心电图、脑电图等功能检查', 'general', 'active', 10);

    PRINT '✓ 示例科室数据插入完成';
END;

-- =====================================================================================
-- 4. 创建索引
-- =====================================================================================

PRINT '创建索引...';

-- Code字段的唯一约束
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_Departments_Code' AND object_id = OBJECT_ID('dbo.Departments'))
BEGIN
    CREATE UNIQUE INDEX [UQ_Departments_Code] ON [dbo].[Departments] ([Code]);
    PRINT '✓ 创建Code唯一约束';
END;

-- Type字段索引
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Departments_Type' AND object_id = OBJECT_ID('dbo.Departments'))
BEGIN
    CREATE INDEX [IX_Departments_Type] ON [dbo].[Departments] ([Type]);
    PRINT '✓ 创建Type索引';
END;

-- Status字段索引
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Departments_Status' AND object_id = OBJECT_ID('dbo.Departments'))
BEGIN
    CREATE INDEX [IX_Departments_Status] ON [dbo].[Departments] ([Status]);
    PRINT '✓ 创建Status索引';
END;

-- Sort_Order字段索引
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Departments_Sort_Order' AND object_id = OBJECT_ID('dbo.Departments'))
BEGIN
    CREATE INDEX [IX_Departments_Sort_Order] ON [dbo].[Departments] ([Sort_Order]);
    PRINT '✓ 创建Sort_Order索引';
END;

PRINT '====================================================================================';
PRINT '科室管理字段映射修复完成';
PRINT '完成时间: ' + CONVERT(NVARCHAR, GETDATE(), 120);
PRINT '====================================================================================';

-- 显示最终表结构
SELECT
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Departments'
ORDER BY ORDINAL_POSITION;