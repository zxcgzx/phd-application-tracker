-- ========================================
-- 深度诊断：刷新后数据丢失的真实原因
-- ========================================
-- 这个脚本会全面检查所有可能导致数据丢失的原因

-- ========================================
-- 第1部分：检查数据是否真的在数据库中
-- ========================================
\echo '========================================';
\echo '【检查1】数据库中的实际数据';
\echo '========================================';

-- 1.1 最近创建/更新的导师
SELECT
    '最近24小时创建的导师' as category,
    COUNT(*) as count,
    string_agg(name, ', ') as names
FROM professors
WHERE created_at > NOW() - INTERVAL '24 hours';

SELECT
    '最近24小时更新的导师' as category,
    COUNT(*) as count,
    string_agg(name, ', ') as names
FROM professors
WHERE updated_at > NOW() - INTERVAL '24 hours';

-- 1.2 最近创建/更新的申请记录
SELECT
    '最近24小时创建的申请记录' as category,
    COUNT(*) as count
FROM applications
WHERE created_at > NOW() - INTERVAL '24 hours';

SELECT
    '最近24小时更新的申请记录' as category,
    COUNT(*) as count,
    string_agg(status, ', ') as statuses
FROM applications
WHERE updated_at > NOW() - INTERVAL '24 hours';

-- 1.3 检查有 application 但可能被过滤的导师
SELECT
    '总导师数' as metric,
    COUNT(*) as count
FROM professors;

SELECT
    'is_active=true 的导师' as metric,
    COUNT(*) as count
FROM professors
WHERE is_active = true;

SELECT
    'is_active=false 的导师' as metric,
    COUNT(*) as count
FROM professors
WHERE is_active = false;

SELECT
    'is_active IS NULL 的导师' as metric,
    COUNT(*) as count
FROM professors
WHERE is_active IS NULL;

-- ========================================
-- 第2部分：模拟前端的查询
-- ========================================
\echo '';
\echo '========================================';
\echo '【检查2】前端查询能否获取数据';
\echo '========================================';

-- 2.1 模拟前端的 loadData 查询
-- 这是前端实际使用的查询条件
SELECT
    p.id,
    p.name,
    p.is_active,
    p.created_at,
    p.updated_at,
    u.name as university_name,
    COUNT(a.id) as application_count
FROM professors p
LEFT JOIN universities u ON p.university_id = u.id
LEFT JOIN applications a ON p.id = a.professor_id
WHERE p.is_active = true  -- 这是关键过滤条件！
GROUP BY p.id, p.name, p.is_active, p.created_at, p.updated_at, u.name
ORDER BY p.created_at DESC
LIMIT 10;

\echo '';
\echo '提示：如果上面的查询结果为空或数量少于预期，说明 is_active 过滤条件有问题！';

-- 2.2 查看被过滤掉的导师（如果有）
SELECT
    '被 is_active 过滤掉的导师' as category,
    COUNT(*) as count,
    string_agg(name || ' (is_active=' || COALESCE(is_active::text, 'NULL') || ')', ', ') as details
FROM professors
WHERE is_active != true OR is_active IS NULL;

-- ========================================
-- 第3部分：检查 RLS 策略
-- ========================================
\echo '';
\echo '========================================';
\echo '【检查3】RLS 策略配置';
\echo '========================================';

-- 3.1 检查哪些表启用了 RLS
SELECT
    schemaname,
    tablename,
    CASE WHEN rowsecurity THEN '✅ 已启用' ELSE '❌ 未启用' END as rls_status
FROM pg_tables
LEFT JOIN pg_class ON pg_tables.tablename = pg_class.relname
WHERE schemaname = 'public'
AND tablename IN ('universities', 'professors', 'applications', 'followup_logs')
ORDER BY tablename;

-- 3.2 检查策略数量
SELECT
    tablename,
    COUNT(*) as policy_count,
    STRING_AGG(policyname, ', ') as policy_names
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('universities', 'professors', 'applications', 'followup_logs')
GROUP BY tablename
ORDER BY tablename;

-- 3.3 详细查看 professors 和 applications 的策略
SELECT
    tablename,
    policyname,
    CASE cmd
        WHEN 'ALL' THEN '所有操作'
        WHEN 'SELECT' THEN '仅查询'
        WHEN 'INSERT' THEN '仅插入'
        WHEN 'UPDATE' THEN '仅更新'
        WHEN 'DELETE' THEN '仅删除'
    END as allowed_operations,
    CASE permissive
        WHEN 'PERMISSIVE' THEN '允许型'
        WHEN 'RESTRICTIVE' THEN '限制型'
    END as policy_type,
    qual as using_condition,
    with_check as with_check_condition
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('professors', 'applications')
ORDER BY tablename, policyname;

\echo '';
\echo '提示：如果 using_condition 或 with_check_condition 不是 "true"，可能会阻止数据读写！';

-- ========================================
-- 第4部分：检查数据完整性
-- ========================================
\echo '';
\echo '========================================';
\echo '【检查4】数据关联完整性';
\echo '========================================';

-- 4.1 检查孤立的 application（professor 已被删除）
SELECT
    '孤立的申请记录（导师已删除）' as issue,
    COUNT(*) as count
FROM applications a
LEFT JOIN professors p ON a.professor_id = p.id
WHERE p.id IS NULL;

-- 4.2 检查孤立的 professor（university 已被删除）
SELECT
    '孤立的导师（学校已删除）' as issue,
    COUNT(*) as count,
    string_agg(p.name, ', ') as professor_names
FROM professors p
LEFT JOIN universities u ON p.university_id = u.id
WHERE u.id IS NULL;

-- 4.3 检查最近更新但没有 application 的导师
SELECT
    '最近更新但无申请记录的导师' as category,
    COUNT(*) as count,
    string_agg(p.name, ', ') as names
FROM professors p
LEFT JOIN applications a ON p.id = a.professor_id
WHERE p.updated_at > NOW() - INTERVAL '24 hours'
AND a.id IS NULL;

-- ========================================
-- 第5部分：检查 Realtime Publication
-- ========================================
\echo '';
\echo '========================================';
\echo '【检查5】Realtime 配置';
\echo '========================================';

-- 5.1 检查哪些表启用了 Realtime
SELECT
    schemaname,
    tablename,
    '✅ 已启用 Realtime' as status
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND schemaname = 'public'
AND tablename IN ('universities', 'professors', 'applications', 'followup_logs')
ORDER BY tablename;

-- 5.2 检查缺失的 Realtime 配置
SELECT
    t.tablename,
    '❌ 未启用 Realtime' as status
FROM pg_tables t
WHERE t.schemaname = 'public'
AND t.tablename IN ('universities', 'professors', 'applications', 'followup_logs')
AND NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables pt
    WHERE pt.pubname = 'supabase_realtime'
    AND pt.schemaname = t.schemaname
    AND pt.tablename = t.tablename
);

\echo '';
\echo '提示：如果某些表未启用 Realtime，实时同步可能不正常！';

-- ========================================
-- 第6部分：诊断结论
-- ========================================
\echo '';
\echo '========================================';
\echo '【诊断结论】根据以上检查结果：';
\echo '========================================';
\echo '';
\echo '常见问题判断：';
\echo '1. 如果【检查1】显示最近无更新 → 数据根本没写入数据库';
\echo '2. 如果【检查2】前端查询结果为空 → is_active 过滤条件有问题';
\echo '3. 如果【检查3】策略条件不是 true → RLS 策略阻止了操作';
\echo '4. 如果【检查4】有孤立记录 → 数据关联被破坏';
\echo '5. 如果【检查5】表未启用 Realtime → 实时同步会失败';
\echo '';
\echo '请根据上述检查结果，执行相应的修复脚本。';
\echo '========================================';
