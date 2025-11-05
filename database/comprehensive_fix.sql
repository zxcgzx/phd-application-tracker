-- ========================================
-- 综合修复脚本：根据诊断结果修复所有问题
-- ========================================
-- 使用前请先运行 deep_diagnosis.sql 确认问题

\echo '开始执行综合修复...';
\echo '';

-- ========================================
-- 修复1：确保所有导师的 is_active 为 true
-- ========================================
\echo '【修复1】检查并修复 is_active 字段...';

-- 显示当前状态
SELECT
    '修复前' as status,
    COUNT(*) FILTER (WHERE is_active = true) as active_count,
    COUNT(*) FILTER (WHERE is_active = false) as inactive_count,
    COUNT(*) FILTER (WHERE is_active IS NULL) as null_count,
    COUNT(*) as total
FROM professors;

-- 将所有 NULL 和 false 的 is_active 设置为 true
UPDATE professors
SET is_active = true
WHERE is_active != true OR is_active IS NULL;

-- 显示修复后状态
SELECT
    '修复后' as status,
    COUNT(*) FILTER (WHERE is_active = true) as active_count,
    COUNT(*) FILTER (WHERE is_active = false) as inactive_count,
    COUNT(*) FILTER (WHERE is_active IS NULL) as null_count,
    COUNT(*) as total
FROM professors;

\echo '✅ is_active 字段修复完成';
\echo '';

-- ========================================
-- 修复2：重建 RLS 策略
-- ========================================
\echo '【修复2】重建 RLS 策略...';

-- 删除所有现有策略
DROP POLICY IF EXISTS "允许所有人读取学校" ON universities;
DROP POLICY IF EXISTS "允许所有人写入学校" ON universities;
DROP POLICY IF EXISTS "允许所有操作_universities" ON universities;

DROP POLICY IF EXISTS "允许所有人读取导师" ON professors;
DROP POLICY IF EXISTS "允许所有人写入导师" ON professors;
DROP POLICY IF EXISTS "允许所有操作_professors" ON professors;

DROP POLICY IF EXISTS "允许所有人读取申请" ON applications;
DROP POLICY IF EXISTS "允许所有人写入申请" ON applications;
DROP POLICY IF EXISTS "允许所有操作_applications" ON applications;

DROP POLICY IF EXISTS "允许所有人读取跟进记录" ON followup_logs;
DROP POLICY IF EXISTS "允许所有人写入跟进记录" ON followup_logs;
DROP POLICY IF EXISTS "允许所有操作_followup_logs" ON followup_logs;

DROP POLICY IF EXISTS "允许所有人读取邮件模板" ON email_templates;
DROP POLICY IF EXISTS "允许所有人写入邮件模板" ON email_templates;
DROP POLICY IF EXISTS "允许所有操作_email_templates" ON email_templates;

\echo '已删除旧策略';

-- 确保 RLS 启用
ALTER TABLE universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE professors ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE followup_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

\echo 'RLS 已启用';

-- 创建新的宽松策略（允许所有操作）
CREATE POLICY "允许所有操作_universities"
ON universities FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "允许所有操作_professors"
ON professors FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "允许所有操作_applications"
ON applications FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "允许所有操作_followup_logs"
ON followup_logs FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "允许所有操作_email_templates"
ON email_templates FOR ALL
USING (true)
WITH CHECK (true);

\echo '✅ RLS 策略重建完成';
\echo '';

-- ========================================
-- 修复3：启用 Realtime Publication
-- ========================================
\echo '【修复3】启用 Realtime Publication...';

-- 尝试为所有表启用 Realtime（如果已启用会自动跳过）
DO $$
BEGIN
    -- universities
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE universities;
        RAISE NOTICE 'universities: Realtime 已启用';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'universities: Realtime 已存在';
    END;

    -- professors
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE professors;
        RAISE NOTICE 'professors: Realtime 已启用';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'professors: Realtime 已存在';
    END;

    -- applications
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE applications;
        RAISE NOTICE 'applications: Realtime 已启用';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'applications: Realtime 已存在';
    END;

    -- followup_logs
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE followup_logs;
        RAISE NOTICE 'followup_logs: Realtime 已启用';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'followup_logs: Realtime 已存在';
    END;

    -- email_templates
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE email_templates;
        RAISE NOTICE 'email_templates: Realtime 已启用';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'email_templates: Realtime 已存在';
    END;
END $$;

\echo '✅ Realtime Publication 配置完成';
\echo '';

-- ========================================
-- 修复4：清理孤立数据
-- ========================================
\echo '【修复4】清理孤立数据...';

-- 删除指向不存在导师的申请记录
WITH deleted AS (
    DELETE FROM applications
    WHERE professor_id NOT IN (SELECT id FROM professors)
    RETURNING id
)
SELECT
    '删除的孤立申请记录' as category,
    COUNT(*) as count
FROM deleted;

-- 删除指向不存在学校的导师
WITH deleted AS (
    DELETE FROM professors
    WHERE university_id NOT IN (SELECT id FROM universities)
    RETURNING id
)
SELECT
    '删除的孤立导师记录' as category,
    COUNT(*) as count
FROM deleted;

\echo '✅ 孤立数据清理完成';
\echo '';

-- ========================================
-- 验证修复结果
-- ========================================
\echo '========================================';
\echo '【验证】修复结果检查';
\echo '========================================';

-- 验证1：检查策略
SELECT
    tablename,
    COUNT(*) as policy_count,
    STRING_AGG(policyname, ', ') as policies
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('universities', 'professors', 'applications', 'followup_logs', 'email_templates')
GROUP BY tablename
ORDER BY tablename;

\echo '';

-- 验证2：检查 Realtime
SELECT
    tablename,
    '✅ Realtime 已启用' as status
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND schemaname = 'public'
AND tablename IN ('universities', 'professors', 'applications', 'followup_logs', 'email_templates')
ORDER BY tablename;

\echo '';

-- 验证3：检查 is_active
SELECT
    'is_active 统计' as category,
    COUNT(*) FILTER (WHERE is_active = true) as active_count,
    COUNT(*) FILTER (WHERE is_active = false) as inactive_count,
    COUNT(*) FILTER (WHERE is_active IS NULL) as null_count
FROM professors;

\echo '';

-- 验证4：测试能否查询数据
SELECT
    '测试查询' as category,
    COUNT(*) as professor_count
FROM professors
WHERE is_active = true;

SELECT
    '测试查询' as category,
    COUNT(*) as application_count
FROM applications;

\echo '';
\echo '========================================';
\echo '✅ 综合修复完成！';
\echo '========================================';
\echo '';
\echo '下一步：';
\echo '1. 刷新前端页面';
\echo '2. 修改一个导师的状态';
\echo '3. 硬刷新页面（Ctrl+Shift+R）';
\echo '4. 检查修改是否保留';
\echo '';
