-- =====================================================================================
-- 检验科数据表结构更新脚本
-- 版本: 1.1.0
-- 日期: 2025-10-06
-- 用途: 创建检验科详细数据表，支持API返回的数据结构
-- =====================================================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;

PRINT '====================================================================================';
PRINT '检验科数据表结构更新开始';
PRINT '版本: 1.1.0';
PRINT '时间: ' + CONVERT(NVARCHAR, GETDATE(), 120);
PRINT '====================================================================================';

-- =====================================================================================
-- 1. 创建检验科数据表 (LaboratoryData)
-- =====================================================================================

PRINT '创建检验科数据表...';
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'LaboratoryData' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[LaboratoryData] (
        [ID] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        [CustomerID] UNIQUEIDENTIFIER NOT NULL,
        [ExamId] NVARCHAR(50) NOT NULL,                    -- 体检ID
        [CheckDate] DATE NOT NULL,                         -- 检查日期
        [CheckTime] TIME(0) NULL,                          -- 检查时间
        [TestCategory] NVARCHAR(100) NOT NULL,             -- 检验项目分类名称 (对应API的SFXMMC)
        [ItemName] NVARCHAR(200) NOT NULL,                 -- 具体检验项目名称 (对应API的XXMC)
        [ItemResult] NVARCHAR(200) NOT NULL,               -- 检验结果值
        [ItemUnit] NVARCHAR(50) NULL,                      -- 单位
        [ReferenceValue] NVARCHAR(200) NULL,               -- 参考值范围
        [AbnormalFlag] INT NOT NULL DEFAULT 0,             -- 异常标记 (0=正常, 1=偏低, 2=偏高)
        [Doctor] NVARCHAR(100) NULL,                       -- 医生姓名
        [Department] NVARCHAR(50) NOT NULL DEFAULT 'laboratory', -- 科室类型
        [Status] NVARCHAR(20) NOT NULL DEFAULT 'active',   -- 状态
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [UpdatedAt] DATETIME2 NULL,
        [CreatedBy] NVARCHAR(100) NULL
    );

    -- 创建外键约束
    ALTER TABLE [dbo].[LaboratoryData] ADD CONSTRAINT [FK_LaboratoryData_Customers]
    FOREIGN KEY ([CustomerID]) REFERENCES [dbo].[Customers] ([ID]) ON DELETE CASCADE;

    -- 创建索引
    CREATE INDEX [IX_LaboratoryData_CustomerID] ON [dbo].[LaboratoryData] ([CustomerID]);
    CREATE INDEX [IX_LaboratoryData_ExamId] ON [dbo].[LaboratoryData] ([ExamId]);
    CREATE INDEX [IX_LaboratoryData_CheckDate] ON [dbo].[LaboratoryData] ([CheckDate]);
    CREATE INDEX [IX_LaboratoryData_Category] ON [dbo].[LaboratoryData] ([TestCategory]);
    CREATE INDEX [IX_LaboratoryData_AbnormalFlag] ON [dbo].[LaboratoryData] ([AbnormalFlag]);

    -- 创建检查约束
    ALTER TABLE [dbo].[LaboratoryData] ADD CONSTRAINT [CK_LaboratoryData_AbnormalFlag]
    CHECK ([AbnormalFlag] IN (0, 1, 2));

    ALTER TABLE [dbo].[LaboratoryData] ADD CONSTRAINT [CK_LaboratoryData_Department]
    CHECK ([Department] IN ('laboratory'));

    ALTER TABLE [dbo].[LaboratoryData] ADD CONSTRAINT [CK_LaboratoryData_Status]
    CHECK ([Status] IN ('active', 'inactive', 'deleted'));

    PRINT '✓ 检验科数据表创建完成';
END
ELSE
BEGIN
    PRINT '✓ 检验科数据表已存在，跳过创建';
END

-- =====================================================================================
-- 2. 创建检验科数据汇总表 (LaboratorySummary)
-- =====================================================================================

PRINT '创建检验科数据汇总表...';
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'LaboratorySummary' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[LaboratorySummary] (
        [ID] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        [CustomerID] UNIQUEIDENTIFIER NOT NULL,
        [ExamId] NVARCHAR(50) NOT NULL,                    -- 体检ID
        [CheckDate] DATE NOT NULL,                         -- 检查日期
        [TotalItems] INT NOT NULL DEFAULT 0,               -- 总检验项目数
        [NormalItems] INT NOT NULL DEFAULT 0,              -- 正常项目数
        [AbnormalItems] INT NOT NULL DEFAULT 0,            -- 异常项目数
        [HighItems] INT NOT NULL DEFAULT 0,                -- 偏高项目数 (Flag=2)
        [LowItems] INT NOT NULL DEFAULT 0,                 -- 偏低项目数 (Flag=1)
        [Summary] NVARCHAR(1000) NULL,                     -- 检验汇总
        [Doctor] NVARCHAR(100) NULL,                       -- 主要医生
        [Department] NVARCHAR(50) NOT NULL DEFAULT 'laboratory', -- 科室类型
        [Status] NVARCHAR(20) NOT NULL DEFAULT 'active',   -- 状态
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [UpdatedAt] DATETIME2 NULL,
        [CreatedBy] NVARCHAR(100) NULL
    );

    -- 创建外键约束
    ALTER TABLE [dbo].[LaboratorySummary] ADD CONSTRAINT [FK_LaboratorySummary_Customers]
    FOREIGN KEY ([CustomerID]) REFERENCES [dbo].[Customers] ([ID]) ON DELETE CASCADE;

    -- 创建唯一约束 (一个检客的同一个体检ID只能有一条汇总记录)
    CREATE UNIQUE INDEX [UX_LaboratorySummary_CustomerExam] ON [dbo].[LaboratorySummary] ([CustomerID], [ExamId]);

    -- 创建索引
    CREATE INDEX [IX_LaboratorySummary_CustomerID] ON [dbo].[LaboratorySummary] ([CustomerID]);
    CREATE INDEX [IX_LaboratorySummary_ExamId] ON [dbo].[LaboratorySummary] ([ExamId]);
    CREATE INDEX [IX_LaboratorySummary_CheckDate] ON [dbo].[LaboratorySummary] ([CheckDate]);

    -- 创建检查约束
    ALTER TABLE [dbo].[LaboratorySummary] ADD CONSTRAINT [CK_LaboratorySummary_Total]
    CHECK ([TotalItems] >= 0 AND [NormalItems] >= 0 AND [AbnormalItems] >= 0);

    ALTER TABLE [dbo].[LaboratorySummary] ADD CONSTRAINT [CK_LaboratorySummary_Status]
    CHECK ([Status] IN ('active', 'inactive', 'deleted'));

    PRINT '✓ 检验科数据汇总表创建完成';
END
ELSE
BEGIN
    PRINT '✓ 检验科数据汇总表已存在，跳过创建';
END

-- =====================================================================================
-- 3. 创建视图：检验科数据详情视图
-- =====================================================================================

PRINT '创建检验科数据详情视图...';
IF NOT EXISTS (SELECT 1 FROM sys.views WHERE name = 'V_LaboratoryDataDetail')
BEGIN
    EXEC('
    CREATE VIEW [dbo].[V_LaboratoryDataDetail]
    AS
    SELECT
        ld.ID,
        ld.CustomerID,
        c.IdentityCard,
        c.Name AS CustomerName,
        ld.ExamId,
        ld.CheckDate,
        ld.CheckTime,
        ld.TestCategory,
        ld.ItemName,
        ld.ItemResult,
        ld.ItemUnit,
        ld.ReferenceValue,
        ld.AbnormalFlag,
        CASE
            WHEN ld.AbnormalFlag = 0 THEN ''正常''
            WHEN ld.AbnormalFlag = 1 THEN ''偏低''
            WHEN ld.AbnormalFlag = 2 THEN ''偏高''
            ELSE ''未知''
        END AS AbnormalStatusText,
        CASE
            WHEN ld.AbnormalFlag = 0 THEN ''text-gray-600''
            WHEN ld.AbnormalFlag = 1 THEN ''text-blue-600''
            WHEN ld.AbnormalFlag = 2 THEN ''text-red-600''
            ELSE ''text-gray-400''
        END AS AbnormalStatusClass,
        ld.Doctor,
        ld.Department,
        ld.Status,
        ld.CreatedAt,
        ld.UpdatedAt,
        ld.CreatedBy
    FROM [dbo].[LaboratoryData] ld
    INNER JOIN [dbo].[Customers] c ON ld.CustomerID = c.ID
    WHERE ld.Status = ''active''
    ');

    PRINT '✓ 检验科数据详情视图创建完成';
END
ELSE
BEGIN
    PRINT '✓ 检验科数据详情视图已存在，跳过创建';
END

-- =====================================================================================
-- 4. 创建视图：检验科数据汇总视图
-- =====================================================================================

PRINT '创建检验科数据汇总视图...';
IF NOT EXISTS (SELECT 1 FROM sys.views WHERE name = 'V_LaboratorySummary')
BEGIN
    EXEC('
    CREATE VIEW [dbo].[V_LaboratorySummary]
    AS
    SELECT
        ls.ID,
        ls.CustomerID,
        c.IdentityCard,
        c.Name AS CustomerName,
        ls.ExamId,
        ls.CheckDate,
        ls.TotalItems,
        ls.NormalItems,
        ls.AbnormalItems,
        ls.HighItems,
        ls.LowItems,
        CASE
            WHEN ls.AbnormalItems = 0 THEN ''全部正常''
            WHEN ls.AbnormalItems <= 3 THEN ''轻度异常''
            WHEN ls.AbnormalItems <= 6 THEN ''中度异常''
            ELSE ''重度异常''
        END AS RiskLevel,
        ls.Summary,
        ls.Doctor,
        ls.Department,
        ls.Status,
        ls.CreatedAt,
        ls.UpdatedAt,
        ls.CreatedBy
    FROM [dbo].[LaboratorySummary] ls
    INNER JOIN [dbo].[Customers] c ON ls.CustomerID = c.ID
    WHERE ls.Status = ''active''
    ');

    PRINT '✓ 检验科数据汇总视图创建完成';
END
ELSE
BEGIN
    PRINT '✓ 检验科数据汇总视图已存在，跳过创建';
END

-- =====================================================================================
-- 5. 更新现有HealthAssessments表，添加ExamId字段
-- =====================================================================================

PRINT '更新HealthAssessments表，添加ExamId字段...';
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.HealthAssessments') AND name = 'ExamId')
BEGIN
    ALTER TABLE [dbo].[HealthAssessments] ADD [ExamId] NVARCHAR(50) NULL;
    CREATE INDEX [IX_HealthAssessments_ExamId] ON [dbo].[HealthAssessments] ([ExamId]);
    PRINT '✓ HealthAssessments表添加ExamId字段完成';
END
ELSE
BEGIN
    PRINT '✓ HealthAssessments表ExamId字段已存在，跳过添加';
END

PRINT '====================================================================================';
PRINT '检验科数据表结构更新完成';
PRINT '时间: ' + CONVERT(NVARCHAR, GETDATE(), 120);
PRINT '====================================================================================';