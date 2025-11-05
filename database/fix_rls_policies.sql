-- ========================================
-- 修复脚本：重新配置 RLS 策略
-- ========================================
-- 如果 check_rls_policies.sql 显示策略有问题，运行此脚本修复

-- 步骤 1: 删除所有现有策略（清空重来）
DROP POLICY IF EXISTS "允许所有人读取学校" ON universities;
DROP POLICY IF EXISTS "允许所有人写入学校" ON universities;
DROP POLICY IF EXISTS "允许所有人读取导师" ON professors;
DROP POLICY IF EXISTS "允许所有人写入导师" ON professors;
DROP POLICY IF EXISTS "允许所有人读取申请" ON applications;
DROP POLICY IF EXISTS "允许所有人写入申请" ON applications;
DROP POLICY IF EXISTS "允许所有人读取跟进记录" ON followup_logs;
DROP POLICY IF EXISTS "允许所有人写入跟进记录" ON followup_logs;
DROP POLICY IF EXISTS "允许所有人读取邮件模板" ON email_templates;
DROP POLICY IF EXISTS "允许所有人写入邮件模板" ON email_templates;

-- 步骤 2: 确保表启用了 RLS
ALTER TABLE universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE professors ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE followup_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- 步骤 3: 创建新的宽松策略（允许所有操作）
-- 使用 FOR ALL 策略，同时支持读和写

-- universities 表
CREATE POLICY "允许所有操作_universities"
ON universities
FOR ALL
USING (true)
WITH CHECK (true);

-- professors 表
CREATE POLICY "允许所有操作_professors"
ON professors
FOR ALL
USING (true)
WITH CHECK (true);

-- applications 表（核心表）
CREATE POLICY "允许所有操作_applications"
ON applications
FOR ALL
USING (true)
WITH CHECK (true);

-- followup_logs 表
CREATE POLICY "允许所有操作_followup_logs"
ON followup_logs
FOR ALL
USING (true)
WITH CHECK (true);

-- email_templates 表
CREATE POLICY "允许所有操作_email_templates"
ON email_templates
FOR ALL
USING (true)
WITH CHECK (true);

-- 步骤 4: 验证配置
SELECT
    tablename,
    COUNT(*) as policy_count,
    STRING_AGG(policyname, ', ') as policy_names
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('universities', 'professors', 'applications', 'followup_logs', 'email_templates')
GROUP BY tablename
ORDER BY tablename;

-- ========================================
-- 预期结果
-- ========================================
-- 每个表应该有 1 个策略
-- 如果某个表显示 0 个策略，说明 RLS 策略创建失败
