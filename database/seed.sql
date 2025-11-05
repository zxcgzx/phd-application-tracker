-- 初始化数据（示例数据和默认模板）

-- 插入示例学校（北京理工大学自动化学院）
INSERT INTO universities (name, url, scraper_type, list_page_selector, detail_page_selectors)
VALUES (
  '北京理工大学自动化学院',
  'https://ac.bit.edu.cn/szdw/dsmd/bssds/index.htm',
  'two_level',
  '{"container": "ul.list01.list002 > li", "link": "a", "name": "a"}',
  '{
    "email": ["a[href^=\"mailto:\"]", "text containing @"],
    "phone": ["text matching \\\\d{3,4}-\\\\d{7,8}"],
    "research": ["div.research", "p:contains(研究方向)", "span.field"],
    "title": ["span.title", "text matching (教授|副教授|研究员)"],
    "office": ["text matching (办公室|Office)"]
  }'::jsonb
);

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
);

-- 插入一些示例导师数据（用于测试，实际数据由爬虫填充）
-- 注释掉，实际使用时通过爬虫获取真实数据
/*
INSERT INTO professors (university_id, name, title, research_areas, email)
SELECT
  id,
  '示例导师' || generate_series,
  CASE WHEN random() > 0.5 THEN '教授' ELSE '副教授' END,
  ARRAY['机器学习', '计算机视觉'],
  'example' || generate_series || '@bit.edu.cn'
FROM universities, generate_series(1, 5);
*/
