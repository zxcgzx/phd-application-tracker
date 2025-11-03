-- 申请博士记录系统数据库表结构
-- 使用 Supabase (PostgreSQL)

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 学校/单位表
CREATE TABLE universities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,                     -- 学校名称（如：北京理工大学自动化学院）
  url TEXT NOT NULL UNIQUE,               -- 官网网址
  list_page_selector TEXT,                -- 列表页CSS选择器（JSON格式）
  detail_page_selectors JSONB,            -- 详情页字段选择器
  scraper_type TEXT DEFAULT 'two_level',  -- 爬虫类型：two_level/single_page/custom
  last_crawled_at TIMESTAMP,              -- 最后爬取时间
  crawl_status TEXT DEFAULT 'pending',    -- pending/running/success/failed
  professors_count INT DEFAULT 0,          -- 导师数量
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 导师信息表
CREATE TABLE professors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  university_id UUID REFERENCES universities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                      -- 姓名
  name_en TEXT,                            -- 英文名（可选）
  title TEXT,                              -- 职称：教授/副教授/研究员
  department TEXT,                         -- 院系
  research_areas TEXT[],                   -- 研究方向（数组）
  email TEXT,                              -- 邮箱
  phone TEXT,                              -- 电话
  homepage TEXT,                           -- 个人主页
  profile_url TEXT,                        -- 官网个人页面链接
  office_location TEXT,                    -- 办公室位置
  education_background TEXT,               -- 教育背景
  profile_image TEXT,                      -- 头像URL
  raw_html TEXT,                           -- 原始HTML（用于后续重新解析）
  is_recruiting BOOLEAN DEFAULT true,      -- 是否招生
  is_active BOOLEAN DEFAULT true,          -- 是否在职
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- 复合唯一索引：同一学校的导师姓名唯一
  UNIQUE(university_id, name)
);

-- 申请记录表
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professor_id UUID REFERENCES professors(id) ON DELETE CASCADE,
  status TEXT DEFAULT '待发送',            -- 待发送/已发送/已读/已回复/待面试/已拒绝/已接受
  priority INT DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),  -- 优先级 1-5
  match_score INT CHECK (match_score IS NULL OR match_score BETWEEN 1 AND 5),  -- 匹配度 1-5星
  sent_by TEXT,                            -- 操作人："你" 或 "女朋友"
  sent_at TIMESTAMP,                       -- 发送时间
  replied_at TIMESTAMP,                    -- 回复时间
  last_followup_at TIMESTAMP,              -- 最后跟进时间
  next_followup_at TIMESTAMP,              -- 下次跟进时间（用于提醒）
  email_subject TEXT,                      -- 邮件主题
  email_body TEXT,                         -- 邮件正文
  reply_summary TEXT,                      -- 回复摘要
  notes TEXT,                              -- 个人备注
  tags TEXT[],                             -- 标签：如["重点关注","备选"]
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- 确保每个导师只有一条申请记录
  UNIQUE(professor_id)
);

-- 跟进记录表（时间轴）
CREATE TABLE followup_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,               -- sent_email/received_reply/phone_call/interview
  content TEXT,                            -- 记录内容
  operator TEXT,                           -- 操作人
  created_at TIMESTAMP DEFAULT NOW()
);

-- 邮件模板表
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,                      -- 模板名称
  subject TEXT NOT NULL,                   -- 邮件主题
  body TEXT NOT NULL,                      -- 邮件正文（支持变量：{导师姓名}、{学校}等）
  tags TEXT[],                             -- 适用场景标签
  usage_count INT DEFAULT 0,               -- 使用次数
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 爬虫日志表
CREATE TABLE crawl_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  university_id UUID REFERENCES universities(id) ON DELETE CASCADE,
  status TEXT NOT NULL,                    -- success/failed
  professors_found INT DEFAULT 0,          -- 发现导师数
  professors_new INT DEFAULT 0,            -- 新增导师数
  professors_updated INT DEFAULT 0,        -- 更新导师数
  error_message TEXT,                      -- 错误信息
  execution_time_seconds FLOAT,            -- 执行耗时
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);

-- 创建索引（提升查询性能）
CREATE INDEX idx_professors_university ON professors(university_id);
CREATE INDEX idx_professors_name ON professors(name);
CREATE INDEX idx_professors_research ON professors USING GIN(research_areas);
CREATE INDEX idx_applications_professor ON applications(professor_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_sent_by ON applications(sent_by);
CREATE INDEX idx_applications_next_followup ON applications(next_followup_at) WHERE next_followup_at IS NOT NULL;
CREATE INDEX idx_followup_logs_application ON followup_logs(application_id);
CREATE INDEX idx_crawl_logs_university ON crawl_logs(university_id);

-- 创建更新时间自动触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_universities_updated_at BEFORE UPDATE ON universities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_professors_updated_at BEFORE UPDATE ON professors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 创建统计视图（便于快速查询）
CREATE VIEW application_stats AS
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

-- 行级安全策略（RLS）- Supabase 推荐
ALTER TABLE universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE professors ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE followup_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawl_logs ENABLE ROW LEVEL SECURITY;

-- 允许所有认证用户读写（你和女朋友共享数据）
CREATE POLICY "允许所有人读取学校" ON universities FOR SELECT USING (true);
CREATE POLICY "允许所有人写入学校" ON universities FOR ALL USING (true);

CREATE POLICY "允许所有人读取导师" ON professors FOR SELECT USING (true);
CREATE POLICY "允许所有人写入导师" ON professors FOR ALL USING (true);

CREATE POLICY "允许所有人读取申请" ON applications FOR SELECT USING (true);
CREATE POLICY "允许所有人写入申请" ON applications FOR ALL USING (true);

CREATE POLICY "允许所有人读取跟进记录" ON followup_logs FOR SELECT USING (true);
CREATE POLICY "允许所有人写入跟进记录" ON followup_logs FOR ALL USING (true);

CREATE POLICY "允许所有人读取邮件模板" ON email_templates FOR SELECT USING (true);
CREATE POLICY "允许所有人写入邮件模板" ON email_templates FOR ALL USING (true);

CREATE POLICY "允许所有人读取爬虫日志" ON crawl_logs FOR SELECT USING (true);
CREATE POLICY "允许所有人写入爬虫日志" ON crawl_logs FOR ALL USING (true);
