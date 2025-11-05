-- 清理无效数据脚本
-- 在 Supabase SQL Editor 中执行本文件

-- 1. 删除"视频介绍"等无效导师条目
DELETE FROM professors
WHERE name LIKE '%视频介绍%'
   OR name LIKE '%Video%'
   OR name LIKE 'Introduction%'
   OR name LIKE '%简介%';

-- 2. 删除华北电力大学的所有导师数据（因为研究方向数据错误，需要重新抓取）
DELETE FROM professors
WHERE university_id IN (
    SELECT id FROM universities
    WHERE name = '华北电力大学电气与电子工程学院'
);

-- 3. 删除北京航空航天大学的所有导师数据（需要重新抓取）
DELETE FROM professors
WHERE university_id IN (
    SELECT id FROM universities
    WHERE name = '北京航空航天大学自动化科学与电气工程学院'
);

-- 4. 重置这两个学校的爬取状态，以便重新爬取
UPDATE universities
SET crawl_status = 'pending',
    professors_count = 0,
    last_crawled_at = NULL
WHERE name IN (
    '华北电力大学电气与电子工程学院',
    '北京航空航天大学自动化科学与电气工程学院'
);

-- 查看清理后的统计
SELECT
    u.name,
    COUNT(p.id) as professor_count
FROM universities u
LEFT JOIN professors p ON p.university_id = u.id
GROUP BY u.id, u.name
ORDER BY u.name;
