-- 清空 Supabase 中教授表的联系方式字段，防止旧数据残留
UPDATE professors
SET email = NULL,
    phone = NULL,
    updated_at = NOW();
