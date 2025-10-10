-- =====================================================================================
-- 修复LaboratoryData表的CustomerID字段类型
-- 版本: 1.2.0
-- 日期: 2025-10-06
-- 用途: 将CustomerID从UNIQUEIDENTIFIER改为NVARCHAR(50)，支持身份证号作为唯一标识
-- =====================================================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;

PRINT '====================================================================================';
PRINT '修复LaboratoryData表的CustomerID字段类型';
PRINT '版本: 1.2.0';
PRINT '时间: ' + CONVERT(NVARCHAR, GETDATE(), 120);
PRINT '====================================================================================';

BEGIN TRANSACTION;

-- 1. 删除外键约束
PRINT '删除外键约束...';
IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_LaboratoryData_Customers')
BEGIN
    ALTER TABLE [dbo].[LaboratoryData] DROP CONSTRAINT [FK_LaboratoryData_Customers];
    PRINT '✓ 外键约束已删除';
END

-- 2. 删除相关索引
PRINT '删除相关索引...';
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_LaboratoryData_CustomerID')
BEGIN
    DROP INDEX [IX_LaboratoryData_CustomerID] ON [dbo].[LaboratoryData];
    PRINT '✓ CustomerID索引已删除';
END

-- 3. 修改CustomerID字段类型
PRINT '修改CustomerID字段类型...';
ALTER TABLE [dbo].[LaboratoryData] ALTER COLUMN [CustomerID] NVARCHAR(50) NOT NULL;
PRINT '✓ CustomerID字段类型已修改为NVARCHAR(50)';

-- 4. 重建索引
PRINT '重建索引...';
CREATE INDEX [IX_LaboratoryData_CustomerID] ON [dbo].[LaboratoryData] ([CustomerID]);
PRINT '✓ CustomerID索引已重建';

-- 5. 修改LaboratorySummary表（如果存在）
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'LaboratorySummary' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    PRINT '修改LaboratorySummary表的CustomerID字段类型...';

    -- 删除外键约束
    IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_LaboratorySummary_Customers')
    BEGIN
        ALTER TABLE [dbo].[LaboratorySummary] DROP CONSTRAINT [FK_LaboratorySummary_Customers];
        PRINT '✓ LaboratorySummary外键约束已删除';
    END

    -- 删除索引
    IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_LaboratorySummary_CustomerID')
    BEGIN
        DROP INDEX [IX_LaboratorySummary_CustomerID] ON [dbo].[LaboratorySummary];
        PRINT '✓ LaboratorySummary CustomerID索引已删除';
    END

    -- 修改字段类型
    ALTER TABLE [dbo].[LaboratorySummary] ALTER COLUMN [CustomerID] NVARCHAR(50) NOT NULL;
    PRINT '✓ LaboratorySummary CustomerID字段类型已修改';

    -- 重建索引
    CREATE INDEX [IX_LaboratorySummary_CustomerID] ON [dbo].[LaboratorySummary] ([CustomerID]);
    PRINT '✓ LaboratorySummary CustomerID索引已重建';
END

COMMIT TRANSACTION;

PRINT '====================================================================================';
PRINT 'LaboratoryData表CustomerID字段类型修复完成';
PRINT 'CustomerID字段类型: UNIQUEIDENTIFIER → NVARCHAR(50)';
PRINT '时间: ' + CONVERT(NVARCHAR, GETDATE(), 120);
PRINT '====================================================================================';