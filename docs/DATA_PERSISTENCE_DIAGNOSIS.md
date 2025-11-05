# 🔍 数据持久化问题诊断与修复指南

## 📋 问题描述

**症状**：多端可以实时同步操作，但刷新页面后之前的修改全部消失

**核心矛盾**：
- ✅ **实时同步正常** → 说明数据确实写入了数据库（否则不会触发 Realtime 事件）
- ❌ **刷新后丢失** → 说明数据在读取时被某种机制过滤掉了

---

## 🎯 问题根源分析

根据代码审查和 Supabase 工作原理，99% 的情况是由 **Row Level Security (RLS)** 策略配置不当导致的。

### RLS 导致的典型现象

```
写入数据 → 成功（触发 Realtime 同步）
         ↓
读取数据 → 失败（被 RLS 策略阻止）
         ↓
刷新页面 → 数据消失（因为查询不到）
```

**为什么实时同步能工作？**

因为 Supabase Realtime 是通过监听数据库 WAL (Write-Ahead Log) 实现的，**不经过 RLS 策略检查**。所以即使写入的数据你读不到，Realtime 仍然会推送变更事件到所有客户端。

---

## 🔧 诊断步骤

### 步骤 1：检查 RLS 策略配置

在 **Supabase Dashboard → SQL Editor** 中运行：

```bash
database/check_rls_policies.sql
```

**预期结果**：
- ✅ 每个表应该有至少 1 个策略
- ✅ "测试1: 导师数据" 和 "测试2: 申请记录" 都显示 "✅ 可以读取"

**如果出现以下情况，说明 RLS 有问题**：
- ❌ 某些表的 `policy_count = 0`（策略缺失）
- ❌ 测试显示 "❌ 无法读取（RLS 阻止）"
- ❌ `qual` 或 `with_check` 字段为空或不一致

### 步骤 2：使用前端诊断工具

在浏览器中打开：

```
frontend/debug_data_persistence.html
```

然后打开浏览器控制台（F12），查看自动运行的测试结果。

**关键测试**：
- 【测试3】如果显示 "❌ 写入成功但无法读回" → **RLS 策略问题确诊！**

### 步骤 3：检查浏览器控制台错误

在正常使用页面时，打开浏览器控制台，尝试：
1. 修改一个导师的状态
2. 查看控制台是否有错误（特别是红色的 `Error`）

**常见错误信息**：
- `new row violates row-level security policy` → RLS 阻止写入
- `could not serialize access` → 并发冲突
- `permission denied` → 权限问题

---

## 🛠️ 修复方案

### 方案 1：重新配置 RLS 策略（推荐）

在 **Supabase Dashboard → SQL Editor** 中执行：

```bash
database/fix_rls_policies.sql
```

这个脚本会：
1. 删除所有现有的冲突策略
2. 重新创建统一的宽松策略（允许所有读写操作）
3. 验证配置是否成功

执行后，刷新前端页面，测试是否能正常保存数据。

### 方案 2：临时禁用 RLS（用于快速验证）

**⚠️ 警告：这会关闭所有安全检查，仅用于诊断，不要在生产环境使用！**

```sql
-- 临时禁用 RLS
ALTER TABLE universities DISABLE ROW LEVEL SECURITY;
ALTER TABLE professors DISABLE ROW LEVEL SECURITY;
ALTER TABLE applications DISABLE ROW LEVEL SECURITY;
ALTER TABLE followup_logs DISABLE ROW LEVEL SECURITY;
```

然后刷新前端测试。如果问题解决，说明确实是 RLS 导致的。

**验证后记得重新启用 RLS**：

```sql
-- 重新启用 RLS
ALTER TABLE universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE professors ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE followup_logs ENABLE ROW LEVEL SECURITY;
```

然后执行 `fix_rls_policies.sql` 正确配置策略。

---

## 📊 其他可能原因（概率较低）

### 原因 2：Supabase 项目被暂停

**检查方法**：
1. 访问 https://app.supabase.com
2. 查看项目状态是否为 "Paused"（黄色图标）

**解决方法**：
点击 "Restore project" 恢复项目（免费版在长时间不活跃后会被暂停）

### 原因 3：前端查询条件过滤

检查 `frontend/js/app.js` 第 716-724 行：

```javascript
const { data: professors } = await supabase
    .from('professors')
    .select('*')
    .eq('is_active', true)  // ← 这个条件可能过滤掉数据
```

**验证方法**：
在浏览器控制台运行：

```javascript
const { supabase } = await import('./js/supabase-config.js');
const { data, error } = await supabase.from('professors').select('*');
console.log('不加条件的查询:', data, error);
```

如果能查到数据，说明是前端过滤问题。

### 原因 4：浏览器缓存干扰

**解决方法**：
1. 清除浏览器缓存（Ctrl+Shift+Delete）
2. 硬刷新页面（Ctrl+Shift+R）
3. 或使用隐身模式测试

### 原因 5：数据库表结构未正确创建

**检查方法**：

在 Supabase SQL Editor 中运行：

```sql
-- 检查表是否存在
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('universities', 'professors', 'applications', 'followup_logs');

-- 检查字段是否完整
\d applications
```

**解决方法**：

如果表不存在或字段缺失，重新执行 `database/schema.sql`

---

## 🎯 快速诊断流程图

```
开始
  ↓
在 Supabase SQL Editor 中运行 check_rls_policies.sql
  ↓
检查结果
  ├─ 所有测试通过 → 问题不在 RLS，继续检查原因2-5
  └─ 有测试失败 → 执行 fix_rls_policies.sql
          ↓
      刷新前端测试
          ↓
      问题解决？
          ├─ 是 → 完成 ✅
          └─ 否 → 运行 debug_data_persistence.html
                      ↓
                  查看控制台详细错误
                      ↓
                  根据错误信息进一步排查
```

---

## 🧪 验证修复结果

完成修复后，按以下步骤验证：

### 测试 1：单设备持久化

1. 刷新页面
2. 修改一个导师的状态（如：待发送 → 已发送）
3. **硬刷新页面**（Ctrl+Shift+R）
4. 检查修改是否保留

**预期结果**：✅ 修改保留

### 测试 2：多设备同步

1. 在两个浏览器窗口（或电脑+手机）打开系统
2. 窗口A：修改一个导师的状态
3. 窗口B：应该在 1 秒内看到更新
4. 窗口B：刷新页面
5. 窗口B：检查修改是否保留

**预期结果**：✅ 实时同步正常，刷新后数据保留

### 测试 3：创建新记录

1. 点击"添加导师"创建一个新导师
2. 刷新页面
3. 检查新导师是否还在列表中

**预期结果**：✅ 新导师保留

---

## 📖 技术细节：RLS 策略的正确配置

### 为什么会出现"写入成功但读不回"？

在 PostgreSQL 的 RLS 中：
- `USING` 子句：控制**能读到哪些行**
- `WITH CHECK` 子句：控制**能写入哪些行**

**错误的配置示例**：

```sql
-- ❌ 只配置了 SELECT 策略，没有配置写入策略
CREATE POLICY "只读策略" ON professors
FOR SELECT USING (true);

-- 结果：能读但不能写
```

**或者**：

```sql
-- ❌ 只配置了写入策略，没有配置读取策略
CREATE POLICY "只写策略" ON professors
FOR INSERT WITH CHECK (true);

-- 结果：能写但读不到刚写入的数据
```

**正确的配置**：

```sql
-- ✅ 使用 FOR ALL 同时配置读写
CREATE POLICY "允许所有操作" ON professors
FOR ALL
USING (true)       -- 能读到所有行
WITH CHECK (true); -- 能写入任何行
```

### Supabase 的 anon key 权限

使用 `SUPABASE_ANON_KEY` 时：
- 角色：`anon` (匿名用户)
- 权限：受 RLS 策略限制
- 不能：执行需要 `service_role` 权限的操作

所以 RLS 策略**必须明确允许 `anon` 角色的操作**，否则会被拒绝。

---

## 💡 预防措施

### 1. 在 schema.sql 中添加验证脚本

在 `database/schema.sql` 末尾添加：

```sql
-- 验证 RLS 配置
DO $$
DECLARE
    r RECORD;
    missing_policies BOOLEAN := false;
BEGIN
    FOR r IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename IN ('universities', 'professors', 'applications', 'followup_logs')
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = r.tablename
        ) THEN
            RAISE WARNING '表 % 缺少 RLS 策略！', r.tablename;
            missing_policies := true;
        END IF;
    END LOOP;

    IF NOT missing_policies THEN
        RAISE NOTICE '✅ 所有表的 RLS 策略配置完整';
    END IF;
END $$;
```

### 2. 添加前端错误处理

在修改数据时，捕获并显示详细错误：

```javascript
try {
    const { data, error } = await supabase
        .from('applications')
        .update(payload)
        .eq('id', applicationId)
        .select()
        .single();

    if (error) {
        // 显示详细错误信息
        console.error('❌ 数据库操作失败:', error);
        showToast(`保存失败: ${error.message}`, 'error');
        return false;
    }

    // 立即验证能否读回
    const { data: verify } = await supabase
        .from('applications')
        .select('*')
        .eq('id', data.id)
        .single();

    if (!verify) {
        console.error('❌ 写入成功但无法读回，RLS 策略有问题！');
        showToast('数据保存异常，请检查权限配置', 'error');
    }
} catch (err) {
    console.error('❌ 操作异常:', err);
    showToast('操作失败，请重试', 'error');
}
```

---

## 🆘 仍然无法解决？

如果按照以上步骤操作后问题仍然存在，请提供以下信息：

1. **`check_rls_policies.sql` 的完整输出**（截图或文本）
2. **浏览器控制台的错误日志**（按 F12 → Console，截图红色错误）
3. **Supabase Dashboard → Database → Replication** 页面的截图
4. **具体的操作步骤和现象描述**

这将帮助进一步定位问题。

---

**最后更新时间**：2025-11-05
**维护者**：Claude Code Assistant
