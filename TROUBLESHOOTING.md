# 🔍 详细故障诊断报告

**生成时间**: 2025-11-03
**问题**: 网页上看不到导师数据

---

## 📊 当前状态

### 1. 数据库状态 ✅
```
✅ Supabase 连接: 正常
✅ universities 表: 1个学校
⚠️ professors 表: 0位导师 (空表)
✅ applications 表: 0条记录
✅ email_templates 表: 12个模板
```

### 2. API Key 配置 ✅
```
✅ frontend anon key: 正确
✅ crawler service key: 正确 (本地已验证)
✅ 诊断工具: 可以正常访问数据库
```

### 3. GitHub Actions 运行记录 ⚠️
```
爬虫运行次数: 仅1次
最后运行时间: 2025-11-03 06:10 UTC (北京时间 14:10)
运行状态: 成功
⚠️ 问题: 这是在用户更新Secrets之前的运行!
```

---

## 🔴 根本原因分析

### 时间线:

1. **06:10** - 用户首次手动触发爬虫
   - 此时GitHub Secrets可能配置错误
   - 爬虫虽然显示"成功",但实际没有写入数据

2. **之后** - 用户更新了正确的API Keys
   - ✅ 前端配置已更新
   - ✅ GitHub Secrets已更新
   - ❌ **但没有重新运行爬虫!**

3. **现在** - professors表仍然是空的
   - 数据库连接正常
   - 爬虫配置正确
   - **缺少的是: 用新的正确配置重新运行一次爬虫**

---

## ✅ 解决方案

### 步骤1: 验证GitHub Secrets (重要!)

访问: https://github.com/zxcgzx/phd-application-tracker/settings/secrets/actions

**必须确认以下两个Secrets存在且正确:**

#### Secret 1: SUPABASE_URL
```
https://<你的项目地址>.supabase.co
```

#### Secret 2: SUPABASE_SERVICE_KEY
```
<你的 service_role key>
```

**⚠️ 注意**:
- Secrets页面不会显示完整的值,只会显示名称
- 如果不确定值是否正确,需要重新Update一次

---

### 步骤2: 立即重新运行爬虫

1. **访问**: https://github.com/zxcgzx/phd-application-tracker/actions

2. **触发新的运行**:
   - 左侧点击 "手动触发爬虫"
   - 右侧点击 "Run workflow"
   - 点击绿色 "Run workflow" 按钮
   - **这会创建一个全新的运行记录**

3. **监控运行过程**:
   - 刷新页面,会看到新的运行记录出现
   - 点击进入查看详情
   - 等待约2-3分钟

---

### 步骤3: 查看运行日志

展开 "🕷️ 执行爬虫" 步骤,**关键日志应该显示**:

#### ✅ 成功的日志:
```
开始爬取: 北京理工大学自动化学院
URL: https://ac.bit.edu.cn/szdw/dsmd/bssds/index.htm
✓ 找到 74 位导师
  [1/74] 爬取: 赵静...
  [2/74] 爬取: 俞成浦...
  ...
✓ 成功爬取 74 位导师的信息

同步到数据库...
  新增: 74 位
  更新: 0 位
  未变化: 0 位

✅ 完成!
```

#### ❌ 如果失败,可能显示:
```
❌ 数据库连接失败: Invalid API key
❌ 403 Forbidden
❌ RLS policy violation
```

**请把完整日志截图或复制给我!**

---

### 步骤4: 验证数据

**爬虫成功运行后3分钟**,访问诊断页面:
```
https://phd-application-tracker-7zg1.vercel.app/debug.html
```

点击"开始诊断",应该看到:
```
✅ professors 表存在，共有 74 位导师

前5位导师:
  1. 赵静 - 教授 - zhaojing_bit@bit.edu.cn
  2. 俞成浦 - 副教授 - ...
  3. 柴润祺 - ...
  4. ...
  5. ...
```

---

## 🐛 常见问题排查

### Q1: GitHub Secrets更新了,但爬虫日志仍显示"Invalid API key"?

**可能原因**:
1. Secrets名称拼写错误 (必须是 `SUPABASE_SERVICE_KEY`,不是 `SUPABASE_KEY`)
2. 复制时带有多余的空格或换行符
3. 使用了anon key而不是service_role key

**解决方案**:
- 删除Secrets重新创建
- 确保复制完整的JWT token (很长的字符串)
- 从Supabase → Settings → API 重新复制

---

### Q2: 爬虫成功,但professors表仍是空的?

**查看日志中的同步部分**:

如果显示:
```
同步到数据库...
  新增: 0 位
```

说明数据库写入被阻止了。

**可能原因**:
1. RLS策略阻止了service_role写入
2. 数据库表结构不完整

**解决方案**:
在Supabase SQL Editor中执行:
```sql
-- 检查RLS策略
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename IN ('professors', 'universities');

-- 如果需要,临时禁用RLS测试
ALTER TABLE professors DISABLE ROW LEVEL SECURITY;
-- 运行爬虫
-- 然后重新启用
ALTER TABLE professors ENABLE ROW LEVEL SECURITY;
```

---

### Q3: 如何确认service_role key有写入权限?

在Supabase → Settings → API 页面:
- service_role key 下方应该显示: "This key has the ability to bypass Row Level Security"
- 如果没有显示,说明key不对

---

## 📋 检查清单

请逐项检查:

- [ ] 1. Supabase项目正常运行
- [ ] 2. 在Supabase SQL Editor执行过 `init_all.sql`
- [ ] 3. Table Editor中有6个表
- [ ] 4. GitHub Secrets中有 `SUPABASE_URL` 和 `SUPABASE_SERVICE_KEY`
- [ ] 5. Secrets的值是完整的(没有截断或空格)
- [ ] 6. **在更新Secrets后重新运行了爬虫** ⭐最关键
- [ ] 7. 爬虫运行日志显示"新增: 74 位"
- [ ] 8. 诊断页面显示74位导师
- [ ] 9. 网页强制刷新后能看到导师列表

---

## 💡 立即行动

**现在请:**

1. ✅ 确认GitHub Secrets配置正确
2. 🚀 **立即重新运行一次爬虫** (这是最关键的!)
3. 📋 把爬虫运行日志发给我
4. 🔍 运行诊断工具查看结果

**如果爬虫日志有任何错误,立即告诉我,我会帮你解决!**

---

## 🆘 需要的信息

如果问题仍未解决,请提供:

1. **GitHub Actions运行日志**
   - 访问: https://github.com/zxcgzx/phd-application-tracker/actions
   - 点击最新的"手动触发爬虫"运行
   - 展开"🕷️ 执行爬虫"步骤
   - 复制完整日志或截图

2. **Supabase RLS策略**
   - SQL Editor中运行:
     ```sql
     SELECT * FROM pg_policies WHERE tablename = 'professors';
     ```
   - 复制结果

3. **诊断工具结果**
   - 访问 debug.html
   - 点击"开始诊断"
   - 截图完整结果

有了这些信息,我可以精确定位问题!

---

**关键提醒: 更新Secrets后一定要重新运行爬虫,旧的运行不会自动使用新配置!** 🎯
