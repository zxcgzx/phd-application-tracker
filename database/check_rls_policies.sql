-- ========================================
-- 诊断脚本：检查 RLS 策略配置
-- ========================================
-- 运行此脚本可以发现为什么刷新后数据丢失

-- 1. 检查哪些表启用了 RLS
SELECT
    schemaname,
    tablename,
    CASE WHEN rowsecurity THEN '✅ 已启用' ELSE '❌ 未启用' END as rls_status
FROM pg_tables
LEFT JOIN pg_class ON pg_tables.tablename = pg_class.relname
WHERE schemaname = 'public'
AND tablename IN ('universities', 'professors', 'applications', 'followup_logs')
ORDER BY tablename;

-- 2. 检查每个表的策略数量
SELECT
    schemaname,
    tablename,
    COUNT(*) as policy_count,
    STRING_AGG(policyname, ', ') as policies
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('universities', 'professors', 'applications', 'followup_logs')
GROUP BY schemaname, tablename
ORDER BY tablename;

-- 3. 详细查看 applications 表的策略
SELECT
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'applications';

-- 4. 测试能否读取数据（关键测试）
SELECT
    '测试1: 导师数据' as test_name,
    COUNT(*) as record_count,
    CASE
        WHEN COUNT(*) > 0 THEN '✅ 可以读取'
        ELSE '❌ 无法读取（RLS 阻止）'
    END as status
FROM professors
UNION ALL
SELECT
    '测试2: 申请记录' as test_name,
    COUNT(*) as record_count,
    CASE
        WHEN COUNT(*) > 0 THEN '✅ 可以读取'
        ELSE '⚠️ 当前无数据或被 RLS 阻止'
    END as status
FROM applications;

-- 5. 检查最近创建的数据
SELECT
    '最近24小时创建的导师' as category,
    COUNT(*) as count
FROM professors
WHERE created_at > NOW() - INTERVAL '24 hours'
UNION ALL
SELECT
    '最近24小时创建的申请记录' as category,
    COUNT(*) as count
FROM applications
WHERE created_at > NOW() - INTERVAL '24 hours';

-- ========================================
-- 诊断结果说明
-- ========================================
--
-- 【情况1】如果"测试1"和"测试2"都显示 ❌ 无法读取
--   → 原因：RLS 策略阻止了所有读取操作
--   → 解决方案：执行 fix_rls_policies.sql
--
-- 【情况2】如果有策略但 policy_count = 0
--   → 原因：策略没有正确创建
--   → 解决方案：执行 schema.sql 的 RLS 部分（第159-184行）
--
-- 【情况3】如果可以读取但"最近24小时"为 0
--   → 原因：数据根本没写入数据库（前端报错被忽略）
--   → 解决方案：检查浏览器控制台的错误日志
