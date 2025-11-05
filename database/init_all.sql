-- 完整初始化脚本（包含表结构+初始数据）
-- 在 Supabase SQL Editor 中一次性执行本文件

-- ============================================
-- 第一部分：创建表结构
-- ============================================

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 学校/单位表
CREATE TABLE IF NOT EXISTS universities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  list_page_selector TEXT,
  detail_page_selectors JSONB,
  scraper_type TEXT DEFAULT 'two_level',
  last_crawled_at TIMESTAMP,
  crawl_status TEXT DEFAULT 'pending',
  professors_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 导师信息表
CREATE TABLE IF NOT EXISTS professors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  university_id UUID REFERENCES universities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_en TEXT,
  title TEXT,
  department TEXT,
  research_areas TEXT[],
  email TEXT,
  phone TEXT,
  homepage TEXT,
  profile_url TEXT,
  office_location TEXT,
  education_background TEXT,
  profile_image TEXT,
  raw_html TEXT,
  is_recruiting BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(university_id, name)
);

-- 申请记录表
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professor_id UUID REFERENCES professors(id) ON DELETE CASCADE,
  status TEXT DEFAULT '待发送',
  priority INT DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  match_score INT CHECK (match_score IS NULL OR match_score BETWEEN 1 AND 5),
  sent_by TEXT,
  sent_at TIMESTAMP,
  replied_at TIMESTAMP,
  last_followup_at TIMESTAMP,
  next_followup_at TIMESTAMP,
  email_subject TEXT,
  email_body TEXT,
  reply_summary TEXT,
  notes TEXT,
  tags TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(professor_id)
);

-- 跟进记录表
CREATE TABLE IF NOT EXISTS followup_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  content TEXT,
  operator TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 邮件模板表
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  tags TEXT[],
  usage_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 爬虫日志表
CREATE TABLE IF NOT EXISTS crawl_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  university_id UUID REFERENCES universities(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  professors_found INT DEFAULT 0,
  professors_new INT DEFAULT 0,
  professors_updated INT DEFAULT 0,
  error_message TEXT,
  execution_time_seconds FLOAT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_professors_university ON professors(university_id);
CREATE INDEX IF NOT EXISTS idx_professors_name ON professors(name);
CREATE INDEX IF NOT EXISTS idx_professors_research ON professors USING GIN(research_areas);
CREATE INDEX IF NOT EXISTS idx_applications_professor ON applications(professor_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_sent_by ON applications(sent_by);
CREATE INDEX IF NOT EXISTS idx_applications_next_followup ON applications(next_followup_at) WHERE next_followup_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_followup_logs_application ON followup_logs(application_id);
CREATE INDEX IF NOT EXISTS idx_crawl_logs_university ON crawl_logs(university_id);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_universities_updated_at ON universities;
CREATE TRIGGER update_universities_updated_at BEFORE UPDATE ON universities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_professors_updated_at ON professors;
CREATE TRIGGER update_professors_updated_at BEFORE UPDATE ON professors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_applications_updated_at ON applications;
CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_email_templates_updated_at ON email_templates;
CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 创建统计视图
CREATE OR REPLACE VIEW application_stats AS
SELECT
  sent_by,
  COUNT(*) AS total_applications,
  COUNT(CASE WHEN status = '已发送' OR status = '已读' THEN 1 END) AS sent_count,
  COUNT(CASE WHEN status = '已回复' THEN 1 END) AS replied_count,
  COUNT(CASE WHEN status = '待面试' THEN 1 END) AS interview_count,
  COUNT(CASE WHEN status = '已接受' THEN 1 END) AS accepted_count,
  COUNT(CASE WHEN status = '已拒绝' THEN 1 END) AS rejected_count,
  ROUND(
    100.0 * COUNT(CASE WHEN status = '已回复' THEN 1 END) /
    NULLIF(COUNT(CASE WHEN status = '已发送' OR status = '已读' THEN 1 END), 0),
    2
  ) AS reply_rate
FROM applications
WHERE status != '待发送'
GROUP BY sent_by;

-- 启用行级安全策略
ALTER TABLE universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE professors ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE followup_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawl_logs ENABLE ROW LEVEL SECURITY;

-- 创建访问策略（允许所有人读写）
DROP POLICY IF EXISTS "允许所有人读取学校" ON universities;
CREATE POLICY "允许所有人读取学校" ON universities FOR SELECT USING (true);
DROP POLICY IF EXISTS "允许所有人写入学校" ON universities;
CREATE POLICY "允许所有人写入学校" ON universities FOR ALL USING (true);

DROP POLICY IF EXISTS "允许所有人读取导师" ON professors;
CREATE POLICY "允许所有人读取导师" ON professors FOR SELECT USING (true);
DROP POLICY IF EXISTS "允许所有人写入导师" ON professors;
CREATE POLICY "允许所有人写入导师" ON professors FOR ALL USING (true);

DROP POLICY IF EXISTS "允许所有人读取申请" ON applications;
CREATE POLICY "允许所有人读取申请" ON applications FOR SELECT USING (true);
DROP POLICY IF EXISTS "允许所有人写入申请" ON applications;
CREATE POLICY "允许所有人写入申请" ON applications FOR ALL USING (true);

DROP POLICY IF EXISTS "允许所有人读取跟进记录" ON followup_logs;
CREATE POLICY "允许所有人读取跟进记录" ON followup_logs FOR SELECT USING (true);
DROP POLICY IF EXISTS "允许所有人写入跟进记录" ON followup_logs;
CREATE POLICY "允许所有人写入跟进记录" ON followup_logs FOR ALL USING (true);

DROP POLICY IF EXISTS "允许所有人读取邮件模板" ON email_templates;
CREATE POLICY "允许所有人读取邮件模板" ON email_templates FOR SELECT USING (true);
DROP POLICY IF EXISTS "允许所有人写入邮件模板" ON email_templates;
CREATE POLICY "允许所有人写入邮件模板" ON email_templates FOR ALL USING (true);

DROP POLICY IF EXISTS "允许所有人读取爬虫日志" ON crawl_logs;
CREATE POLICY "允许所有人读取爬虫日志" ON crawl_logs FOR SELECT USING (true);
DROP POLICY IF EXISTS "允许所有人写入爬虫日志" ON crawl_logs;
CREATE POLICY "允许所有人写入爬虫日志" ON crawl_logs FOR ALL USING (true);

-- ============================================
-- 第二部分：插入初始数据
-- ============================================

-- 插入示例学校（北京理工大学自动化学院）
INSERT INTO universities (name, url, scraper_type, list_page_selector, detail_page_selectors)
VALUES (
  '北京理工大学自动化学院',
  'https://ac.bit.edu.cn/szdw/dsmd/bssds/index.htm',
  'two_level',
  '{"container": "ul.list01.list002 > li", "link": "a", "name": "a"}',
  '{
    "email": ["a[href^=\"mailto:\"]", "text containing @"],
    "phone": ["text matching \\d{3,4}-\\d{7,8}"],
    "research": ["div.research", "p:contains(研究方向)", "span.field"],
    "title": ["span.title", "text matching (教授|副教授|研究员)"],
    "office": ["text matching (办公室|Office)"]
  }'::jsonb
)
ON CONFLICT (url) DO NOTHING;

-- 插入默认邮件模板
INSERT INTO email_templates (name, subject, body, tags) VALUES
(
  '首次联系模板（正式版）',
  '申请攻读博士学位 - {学校}{院系}',
  '尊敬的{导师姓名}{职称}：

您好！

我是XXX，目前就读于XXX大学XXX专业，即将于202X年XX月毕业。通过研读您的学术论文和研究成果，我对您在{研究方向}领域的工作深感兴趣，特此冒昧来信，希望能有机会在您的指导下攻读博士学位。

【个人背景】
- 本科/硕士院校：XXX
- 研究经历：XXX
- 发表论文：XXX
- 技术技能：XXX

【研究兴趣】
我特别关注{具体研究课题}，这与您在{相关论文}中的研究方向高度契合。我希望能够在XXX方面深入探索。

【申请意向】
诚挚希望能够加入您的课题组，攻读202X年秋季入学的博士研究生。如蒙您考虑，我将不胜感激。附件中是我的详细简历和成绩单，敬请查阅。

期待您的回复！

祝
科研顺利！

XXX
联系方式：XXX
邮箱：XXX',
  ARRAY['首次联系', '正式']
),
(
  '首次联系模板（简洁版）',
  '博士申请咨询 - {学校}',
  '{导师姓名}老师：

您好！我是XXX，对您在{研究方向}的工作很感兴趣，希望申请您202X年的博士生名额。

我的研究背景：
• XXX
• XXX

附件是我的简历，期待您的指导意见。

此致
敬礼

XXX
{邮箱}',
  ARRAY['首次联系', '简洁']
),
(
  '跟进邮件模板',
  '博士申请跟进 - {学校}',
  '{导师姓名}老师：

您好！

我于{发送日期}向您发送了博士申请邮件，不知您是否有时间查阅？

如果您对我的背景感兴趣，我非常乐意通过邮件或视频会议进一步交流。我也可以根据您的要求提供更详细的研究计划。

再次感谢您的时间！

此致
敬礼

XXX',
  ARRAY['跟进', '提醒']
),
(
  '感谢回复模板',
  'Re: {原邮件主题}',
  '{导师姓名}老师：

非常感谢您的回复！

{根据导师回复内容定制化回应}

我会按您的建议{具体行动}，并及时向您汇报进展。

再次感谢您的指导！

此致
敬礼

XXX',
  ARRAY['感谢', '回复']
)
ON CONFLICT DO NOTHING;

-- 完成
SELECT '✅ 数据库初始化完成！' AS status;
