# 多人实时同步问题诊断报告

## 📋 问题描述

在线打开系统后,多人操作无法实时同步更新。

## 🔍 代码检查结果

✅ **代码实现正确**:
- `setupRealtimeSubscription()` 函数已正确实现 (`app.js:1088-1147`)
- 已订阅 `applications` 和 `professors` 表的 `INSERT`、`UPDATE`、`DELETE` 事件
- 初始化流程正确,会在页面加载时自动调用订阅函数 (`app.js:391`)
- Supabase 配置已填写完整 (`frontend/js/supabase-config.js`)

## ⚠️ 问题原因分析

根据代码审查,实时同步不工作的**最可能原因是 Supabase 项目中没有为数据库表启用 Realtime Publication**。

### Supabase Realtime 工作原理

```
用户A修改数据
    ↓
Supabase API 写入 PostgreSQL
    ↓
PostgreSQL 生成 WAL (Write-Ahead Log)
    ↓
⚠️ [关键检查点] 表是否启用了 Realtime Publication?
    ↓ YES
Supabase Realtime 服务器监听 WAL 日志
    ↓
通过 WebSocket 推送到所有订阅的客户端
    ↓
用户B浏览器接收更新并刷新 UI
```

**如果表没有启用 Realtime Publication,更新会被阻断在关键检查点处!**

## 🛠️ 修复步骤

### 方法 1: 在 Supabase Dashboard 中启用 (推荐)

#### 步骤 1: 访问 Supabase 项目

1. 打开 https://app.supabase.com
2. 选择你的项目 (cacvfqtupprixlmzrury)
3. 点击左侧菜单的 **"Database"**

#### 步骤 2: 启用 Realtime

有两种方式:

**方式A: 通过 Replication 界面 (最简单)**

1. 在 Database 菜单中,点击 **"Replication"**
2. 在 "Manage" 选项卡中,找到 **"Source"** 部分
3. 点击 "0 tables" 或 "Publication" 链接
4. 在表列表中,勾选以下表:
   - ✅ `universities`
   - ✅ `professors`
   - ✅ `applications`
   - ✅ `followup_logs`
   - ✅ `email_templates`
5. 点击 **"Save"** 或 **"Apply Changes"**

**方式B: 通过 SQL Editor (适合高级用户)**

1. 点击左侧菜单的 **"SQL Editor"**
2. 点击 **"New query"**
3. 复制以下 SQL 代码:

```sql
-- 检查当前启用了 Realtime 的表
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';

-- 为所有核心表启用 Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.universities;
ALTER PUBLICATION supabase_realtime ADD TABLE public.professors;
ALTER PUBLICATION supabase_realtime ADD TABLE public.applications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.followup_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.email_templates;

-- 验证已启用
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';
```

4. 点击 **"Run"** 执行
5. 检查查询结果,应该看到 5 张表都在列表中

#### 步骤 3: 验证实时同步是否工作

1. 在浏览器中打开系统前端 (https://你的域名.vercel.app)
2. **打开浏览器开发者工具** (按 F12 或右键 → 检查)
3. 切换到 **"Console"** 标签
4. 刷新页面,应该看到:
   ```
   ✅ 实时同步已启用 (applications + professors)
   ```
5. **开两个浏览器窗口** (或一个电脑 + 一个手机):
   - 窗口A: 标记某个导师为"已发送"
   - 窗口B: 应该在 **1 秒内** 看到更新 + 弹出提示框

### 方法 2: 通过 SQL 脚本批量启用

如果你想在初始化数据库时就启用 Realtime,可以将以下内容添加到 `database/schema.sql` 的**末尾**:

```sql
-- ========================================
-- Realtime 配置 (启用实时同步)
-- ========================================

-- 为核心表启用 Realtime Publication
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.universities;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.professors;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.applications;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.followup_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.email_templates;

-- 验证配置
DO $$
BEGIN
    RAISE NOTICE '已启用 Realtime 的表:';
    FOR r IN SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' LOOP
        RAISE NOTICE '  - %', r.tablename;
    END LOOP;
END $$;
```

然后重新执行整个 `schema.sql` 文件。

## 🧪 测试清单

完成配置后,请按以下步骤测试:

### 测试 1: 控制台检查

- [ ] 打开浏览器开发者工具 (F12)
- [ ] 刷新页面
- [ ] 在 Console 中看到 `✅ 实时同步已启用`
- [ ] 在 Network 标签中看到 WebSocket 连接 (wss://...)
- [ ] WebSocket 状态为 `101 Switching Protocols` (绿色)

### 测试 2: 单人操作反馈

- [ ] 标记一个导师为"已发送"
- [ ] 在 Console 中看到类似以下日志:
  ```
  实时更新 (applications): {eventType: 'UPDATE', new: {...}, ...}
  ```

### 测试 3: 多人协作

- [ ] **窗口A**: 在电脑浏览器中登录,切换用户为 "Zhang"
- [ ] **窗口B**: 在手机浏览器中打开,切换用户为 "Shi"
- [ ] **窗口A**: 标记某个导师为"已发送"
- [ ] **窗口B**: 在 **1 秒内** 看到该导师卡片更新
- [ ] **窗口B**: 看到提示框 "Zhang 刚刚更新了申请记录"

### 测试 4: 新增导师同步

- [ ] **窗口A**: 点击"添加导师"创建新导师
- [ ] **窗口B**: 应该立即看到新导师卡片出现
- [ ] **窗口B**: 看到提示框 "发现新导师,列表已更新"

## 🐛 如果仍然不工作

### 检查点 1: WebSocket 连接状态

打开浏览器开发者工具 → Network → WS (WebSocket) 标签:

- **没有 WebSocket 连接**: Supabase 客户端初始化失败
  - 检查 `supabase-config.js` 中的 URL 和 Key 是否正确
  - 检查控制台是否有错误信息

- **WebSocket 连接但状态为 Pending**: 网络问题
  - 检查防火墙/代理设置
  - 尝试使用手机 4G 网络测试

- **WebSocket 连接后立即断开**: 认证失败
  - 检查 `SUPABASE_ANON_KEY` 是否正确
  - 在 Supabase Dashboard → Settings → API 中重新复制 Key

### 检查点 2: Supabase 项目状态

1. 访问 https://app.supabase.com/project/cacvfqtupprixlmzrury/settings/general
2. 检查项目状态是否为 **"Active"** (绿色)
3. 如果显示 "Paused",点击 "Restore" 恢复项目

### 检查点 3: 数据库查询测试

在 Supabase SQL Editor 中运行:

```sql
-- 测试查询权限
SELECT * FROM professors LIMIT 1;

-- 检查 RLS 策略是否阻止了 Realtime
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('professors', 'applications');
```

如果查询失败或返回权限错误,说明 RLS 策略配置有问题。

### 检查点 4: 清除缓存重试

1. 清除浏览器缓存 (Ctrl+Shift+Delete)
2. 硬刷新页面 (Ctrl+Shift+R 或 Cmd+Shift+R)
3. 重新测试

## 📖 相关文档

- [Supabase Realtime 官方文档](https://supabase.com/docs/guides/realtime)
- [Supabase Realtime Broadcast 教程](https://supabase.com/docs/guides/realtime/broadcast)
- [PostgreSQL Logical Replication 原理](https://www.postgresql.org/docs/current/logical-replication.html)

## 🎯 总结

**核心问题**: Supabase 数据库表没有启用 Realtime Publication

**修复方法**:
1. 访问 Supabase Dashboard → Database → Replication
2. 勾选 `professors` 和 `applications` 表
3. 保存设置

**验证方法**:
- 打开两个浏览器窗口
- 在窗口A中修改导师状态
- 窗口B应该在 1 秒内看到更新

**预计修复时间**: 2-5 分钟

---

如果按照以上步骤仍然无法解决,请提供:
1. 浏览器控制台的完整日志 (Console 标签)
2. Network 标签中 WebSocket 连接的详细信息
3. Supabase Dashboard 中 Replication 页面的截图

这将帮助进一步诊断问题。
