-- =====================================================================================
-- Departments 表新增 IgnoreInImport 字段
-- 版本: 1.0.0
-- 日期: 2026-02-25
-- 用途: 支持“获取体检数据时忽略科室”配置
-- =====================================================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;

PRINT '====================================================================================';
PRINT '开始执行 Departments.IgnoreInImport 字段升级脚本';
PRINT '开始时间: ' + CONVERT(NVARCHAR, GETDATE(), 120);
PRINT '====================================================================================';

DECLARE @CurrentDatabase SYSNAME = DB_NAME();
PRINT '当前数据库: ' + @CurrentDatabase;

IF @CurrentDatabase = 'JZCIS'
BEGIN
    THROW 50001, '禁止在只读数据库 JZCIS 执行该脚本。请切换到可写业务库后再执行。', 1;
END;

IF DATABASEPROPERTYEX(@CurrentDatabase, 'Updateability') = 'READ_ONLY'
BEGIN
    THROW 50002, '当前数据库为只读模式，禁止执行写入脚本。', 1;
END;

IF NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'Departments'
      AND COLUMN_NAME = 'IgnoreInImport'
)
BEGIN
    ALTER TABLE [dbo].[Departments]
    ADD [IgnoreInImport] BIT NOT NULL CONSTRAINT [DF_Departments_IgnoreInImport] DEFAULT (0);

    PRINT '✓ 已新增 IgnoreInImport 字段，默认值 0（不忽略）';
END
ELSE
BEGIN
    PRINT 'ℹ IgnoreInImport 字段已存在，跳过新增';

    -- 如果字段存在但允许 NULL，统一修复为 NOT NULL 并补齐空值
    IF EXISTS (
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'Departments'
          AND COLUMN_NAME = 'IgnoreInImport'
          AND IS_NULLABLE = 'YES'
    )
    BEGIN
        UPDATE [dbo].[Departments]
        SET [IgnoreInImport] = 0
        WHERE [IgnoreInImport] IS NULL;

        ALTER TABLE [dbo].[Departments]
        ALTER COLUMN [IgnoreInImport] BIT NOT NULL;

        PRINT '✓ 已修复 IgnoreInImport 字段为 NOT NULL，并补齐空值';
    END
END;

PRINT '====================================================================================';
PRINT 'Departments.IgnoreInImport 字段升级脚本执行完成';
PRINT '完成时间: ' + CONVERT(NVARCHAR, GETDATE(), 120);
PRINT '====================================================================================';
