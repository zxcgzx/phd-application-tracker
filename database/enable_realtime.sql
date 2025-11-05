-- ========================================
-- 启用 Supabase Realtime 实时同步功能
-- ========================================
--
-- 功能说明：
-- 此脚本将为核心数据表启用实时同步功能，
-- 使得多个用户可以实时看到彼此的操作更新。
--
-- 执行方式：
-- 1. 登录 Supabase 控制台
-- 2. 进入 SQL Editor
-- 3. 粘贴整个脚本并执行
--
-- ========================================

-- 步骤 1: 检查当前配置
-- ========================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '开始检查 Realtime 配置...';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
END $$;

-- 查看当前启用了 Realtime 的表
SELECT
    '当前已启用 Realtime 的表:' as info,
    COALESCE(
        string_agg(tablename, ', '),
        '无 (尚未启用任何表)'
    ) as enabled_tables
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';

-- 步骤 2: 为核心表启用 Realtime
-- ========================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '正在启用 Realtime...';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
END $$;

-- 为 universities 表启用 Realtime
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.universities;
        RAISE NOTICE '✅ universities 表已启用 Realtime';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE '⚠️  universities 表已经启用了 Realtime (跳过)';
        WHEN OTHERS THEN
            RAISE NOTICE '❌ universities 表启用失败: %', SQLERRM;
    END;
END $$;

-- 为 professors 表启用 Realtime
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.professors;
        RAISE NOTICE '✅ professors 表已启用 Realtime';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE '⚠️  professors 表已经启用了 Realtime (跳过)';
        WHEN OTHERS THEN
            RAISE NOTICE '❌ professors 表启用失败: %', SQLERRM;
    END;
END $$;

-- 为 applications 表启用 Realtime
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.applications;
        RAISE NOTICE '✅ applications 表已启用 Realtime';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE '⚠️  applications 表已经启用了 Realtime (跳过)';
        WHEN OTHERS THEN
            RAISE NOTICE '❌ applications 表启用失败: %', SQLERRM;
    END;
END $$;

-- 为 followup_logs 表启用 Realtime
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.followup_logs;
        RAISE NOTICE '✅ followup_logs 表已启用 Realtime';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE '⚠️  followup_logs 表已经启用了 Realtime (跳过)';
        WHEN OTHERS THEN
            RAISE NOTICE '❌ followup_logs 表启用失败: %', SQLERRM;
    END;
END $$;

-- 为 email_templates 表启用 Realtime
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.email_templates;
        RAISE NOTICE '✅ email_templates 表已启用 Realtime';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE '⚠️  email_templates 表已经启用了 Realtime (跳过)';
        WHEN OTHERS THEN
            RAISE NOTICE '❌ email_templates 表启用失败: %', SQLERRM;
    END;
END $$;

-- 步骤 3: 验证配置结果
-- ========================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '验证配置结果...';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
END $$;

-- 显示所有已启用 Realtime 的表
DO $$
DECLARE
    r RECORD;
    table_count INTEGER := 0;
BEGIN
    RAISE NOTICE '已启用 Realtime 的表列表:';
    RAISE NOTICE '--------------------';

    FOR r IN
        SELECT schemaname, tablename
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        ORDER BY tablename
    LOOP
        table_count := table_count + 1;
        RAISE NOTICE '  %d. %.% ✓', table_count, r.schemaname, r.tablename;
    END LOOP;

    IF table_count = 0 THEN
        RAISE NOTICE '  (无)';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '总计: % 个表已启用 Realtime', table_count;
END $$;

-- 步骤 4: 检查核心表是否都已启用
-- ========================================
DO $$
DECLARE
    missing_tables TEXT[];
    all_enabled BOOLEAN;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '核心表启用状态检查:';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';

    -- 检查必需的表
    SELECT array_agg(required_table)
    INTO missing_tables
    FROM (
        SELECT unnest(ARRAY['universities', 'professors', 'applications', 'followup_logs', 'email_templates']) as required_table
    ) required
    WHERE NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND tablename = required_table
    );

    all_enabled := (missing_tables IS NULL OR array_length(missing_tables, 1) = 0);

    IF all_enabled THEN
        RAISE NOTICE '✅ 所有核心表都已启用 Realtime!';
        RAISE NOTICE '';
        RAISE NOTICE '🎉 配置完成！现在你可以：';
        RAISE NOTICE '  1. 打开两个浏览器窗口访问应用';
        RAISE NOTICE '  2. 在一个窗口中修改数据';
        RAISE NOTICE '  3. 另一个窗口将在1秒内自动更新';
        RAISE NOTICE '';
    ELSE
        RAISE NOTICE '⚠️  以下表尚未启用 Realtime:';
        FOR i IN 1..array_length(missing_tables, 1) LOOP
            RAISE NOTICE '  - %', missing_tables[i];
        END LOOP;
        RAISE NOTICE '';
        RAISE NOTICE '请重新运行此脚本或手动启用这些表。';
        RAISE NOTICE '';
    END IF;
END $$;

-- 步骤 5: 输出 Realtime 连接信息
-- ========================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Realtime 连接配置信息:';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '前端已配置的 Realtime 订阅:';
    RAISE NOTICE '  - Channel: applications (监听 INSERT, UPDATE, DELETE)';
    RAISE NOTICE '  - Channel: professors (监听 INSERT, UPDATE, DELETE)';
    RAISE NOTICE '';
    RAISE NOTICE '验证方法:';
    RAISE NOTICE '  1. 打开浏览器控制台 (F12)';
    RAISE NOTICE '  2. 刷新页面';
    RAISE NOTICE '  3. 查看是否有日志: "✅ 实时同步已启用"';
    RAISE NOTICE '  4. 查看 Network 标签，应该有 WebSocket 连接';
    RAISE NOTICE '';
END $$;

-- 完成
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✨ 脚本执行完成!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
END $$;

-- 返回最终的启用状态摘要
SELECT
    '✅ 配置摘要' as status,
    COUNT(*) as enabled_tables_count,
    string_agg(tablename, ', ' ORDER BY tablename) as table_names
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
GROUP BY status;
