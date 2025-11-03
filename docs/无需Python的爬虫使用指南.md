# 无需安装Python - 云端爬虫使用指南

本指南适用于**没有安装Python环境**的用户。通过GitHub Actions,你可以在云端免费运行爬虫!

---

## 🌟 方案1: GitHub Actions 云端爬虫 (推荐)

### 前置准备 (仅需配置一次)

#### 步骤1: 在GitHub仓库中添加Secrets

1. **打开你的GitHub仓库**
   访问: https://github.com/zxcgzx/phd-application-tracker

2. **进入Settings**
   点击仓库顶部的 `Settings` 标签

3. **添加Secrets**
   - 左侧菜单: `Secrets and variables` → `Actions`
   - 点击右上角 `New repository secret`

4. **添加第一个Secret: SUPABASE_URL**
   - Name: `SUPABASE_URL`
   - Secret: `https://cacvfqtupprixlmzrury.supabase.co`
   - 点击 `Add secret`

5. **添加第二个Secret: SUPABASE_SERVICE_KEY**
   - Name: `SUPABASE_SERVICE_KEY`
   - Secret: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhY3ZmcXR1cHByaXhsbXpydXJ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjEzMjU5MywiZXhwIjoyMDc3NzA4NTkzfQ.hbqrmQKt5_Pjn6bAwxhik2v9KHsiTY-edwPjEtWn2fg`
   - 点击 `Add secret`

✅ 配置完成!现在GitHub Actions可以安全地访问你的数据库了。

---

### 使用方式A: 手动触发爬虫 (一键执行)

#### 1. 进入Actions页面
- 访问: https://github.com/zxcgzx/phd-application-tracker/actions
- 或在仓库页面点击顶部 `Actions` 标签

#### 2. 选择工作流
左侧列表中点击 `手动触发爬虫`

#### 3. 运行工作流
1. 右侧点击 `Run workflow` 下拉按钮
2. 看到3个可选参数:

   **参数说明**:
   - `目标学校URL`: 留空 = 爬取所有已配置学校 (推荐)
   - `测试模式`: 勾选 = 只测试不写入数据库

3. **首次使用建议**:
   - 目标学校URL: **留空**
   - 测试模式: **不勾选** (取消勾选)

4. 点击绿色的 `Run workflow` 按钮

#### 4. 查看执行结果

- 等待约 1-2 分钟 (GitHub会自动安装Python和依赖)
- 点击运行记录查看详细日志
- 看到 `✅ 爬虫执行成功!` 表示完成

#### 5. 在网站上查看结果

- 访问: https://phd-application-tracker-7zg1.vercel.app/
- 点击 "导师列表" Tab
- 应该能看到新增的74位北理工导师! 🎉

---

### 使用方式B: 自动定时爬取

系统已配置**每周日上午11:00**(北京时间)自动爬取一次。

**无需任何操作**,爬虫会自动运行并更新数据库!

如需修改时间,编辑 `.github/workflows/crawl-weekly.yml`:

```yaml
schedule:
  - cron: '0 3 * * 0'  # 每周日 UTC 3:00 (北京 11:00)
  # 改为每天: '0 3 * * *'
  # 改为每月1号: '0 3 1 * *'
```

---

## 🎯 方案2: 手动导入CSV (备用方案)

如果GitHub Actions不可用,可以手动整理数据:

### 步骤1: 准备CSV文件

创建一个 `professors.csv` 文件,包含以下列:

```csv
name,email,title,research_areas,homepage,university_name
张三,zhangsan@bit.edu.cn,教授,机器学习;计算机视觉,https://...,北京理工大学自动化学院
李四,lisi@bit.edu.cn,副教授,自然语言处理,https://...,北京理工大学自动化学院
```

### 步骤2: 在Supabase中导入

1. 访问 Supabase Dashboard: https://app.supabase.com/
2. 选择你的项目
3. 左侧菜单: `Table Editor` → `professors`
4. 点击右上角 `Insert` → `Import data from CSV`
5. 上传CSV文件
6. 完成!

---

## 📊 方案3: 使用Vercel Serverless (高级,暂未实现)

**未来版本** 将支持在网页上直接点击"爬取"按钮,无需任何配置。

原理: 在Vercel上部署Python Serverless Functions,实现纯网页端爬虫。

---

## ❓ 常见问题

### Q1: GitHub Actions执行失败,提示"Secrets未配置"?

**A**: 检查Secrets是否正确添加:
- 名称必须完全一致: `SUPABASE_URL` 和 `SUPABASE_SERVICE_KEY`
- 不要有多余的空格
- Secret值要完整复制

### Q2: 爬虫执行成功,但网站上看不到数据?

**A**: 可能的原因:
1. **刷新网页**: 按 `Ctrl + Shift + R` 强制刷新
2. **检查筛选器**: 取消所有筛选条件
3. **查看Supabase**: 在Supabase Dashboard → Table Editor → professors 中直接查看

### Q3: 能否只爬取特定学校?

**A**: 可以!运行手动工作流时:
- 在 `目标学校URL` 中填入: `https://ac.bit.edu.cn/szdw/dsmd/bssds/index.htm`
- 点击 `Run workflow`

### Q4: 爬虫会重复添加导师吗?

**A**: 不会!系统会自动检查:
- 如果导师已存在(根据姓名+学校),则**更新**信息
- 如果是新导师,则**插入**新记录

### Q5: 爬虫执行要多久?

**A**: 取决于导师数量:
- 74位导师 ≈ 2-3分钟 (包括GitHub启动容器的时间)
- 200位导师 ≈ 5-7分钟

### Q6: 免费版有次数限制吗?

**A**: GitHub Actions免费额度:
- 公开仓库: **无限制**
- 私有仓库: 每月 2000 分钟

你的仓库是公开的,所以**完全免费,无限使用**! 🎉

### Q7: 如何查看爬虫日志?

**A**:
1. 访问 Actions 页面
2. 点击任意运行记录
3. 展开 `🕷️ 执行爬虫` 步骤
4. 可以看到详细的爬取过程和统计

示例日志:
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

---

## 🎁 推荐使用流程

**首次使用**:
1. ✅ 配置GitHub Secrets (5分钟,一次性)
2. ✅ 手动触发一次爬虫,验证配置正确 (2分钟)
3. ✅ 在网站上查看爬取的导师信息
4. ✅ 开始使用系统管理申请进度!

**日常使用**:
- 系统每周日自动更新导师信息
- 如需立即更新,手动触发一次即可
- 专注于申请本身,无需关心技术细节!

---

## 📞 需要帮助?

如果遇到任何问题:

1. **查看Actions日志**: 通常错误信息很明确
2. **检查CRAWLER_TEST_REPORT.md**: 有详细的技术说明
3. **提Issue**: https://github.com/zxcgzx/phd-application-tracker/issues

---

**现在就去GitHub Actions试试吧! 🚀**
