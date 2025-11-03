# 📚 申请博士记录系统

一个专为博士申请设计的导师信息管理和申请进度跟踪系统。支持多人实时协作、自动爬取导师信息、智能统计分析。

> **项目状态**: v0.9 - 核心功能完整,需要用户完成配置和部署 | [查看详细状态](PROJECT_STATUS.md)

## ✨ 核心特性

- **🕷️ 智能爬虫**: 自动从学校官网爬取导师信息,支持定期更新
- **☁️ 云端同步**: 基于 Supabase,数据实时同步,你和女朋友同时使用无冲突
- **📱 移动端适配**: 响应式设计,手机、平板、电脑都能流畅使用
- **📊 数据分析**: 自动统计发送量、回复率、面试进度等
- **🔍 强大筛选**: 按学校、状态、操作人、研究方向快速筛选
- **📧 邮件模板**: 预设多个模板,快速生成申请邮件
- **⚡ 批量操作**: 一键标记多位导师,提升效率

## 📦 项目结构

```
申请博士记录/
├── frontend/              # 前端网页
│   ├── index.html        # 主页面
│   ├── css/              # 样式文件
│   └── js/               # JavaScript 代码
├── crawler/              # 爬虫系统
│   ├── main.py          # 主程序
│   ├── config.yaml      # 学校配置
│   └── scrapers/        # 爬虫模块
├── database/            # 数据库脚本
│   ├── schema.sql       # 表结构
│   └── seed.sql         # 初始数据
└── .github/workflows/   # 自动化任务
```

## 🚀 快速开始

### 第一步: 设置 Supabase 数据库

1. **注册 Supabase 账号**
   - 访问 [https://supabase.com](https://supabase.com)
   - 点击 "Start your project" 注册账号(免费)

2. **创建新项目**
   - 在 Dashboard 点击 "New Project"
   - 填写项目名称、数据库密码、选择地区(建议 Singapore)
   - 等待项目初始化(约 2 分钟)

3. **初始化数据库**
   - 在项目页面左侧点击 "SQL Editor"
   - 点击 "New query"
   - 复制 `database/schema.sql` 的全部内容
   - 粘贴并点击 "Run" 执行
   - 同样方式执行 `database/seed.sql`(可选,用于添加示例模板)

4. **获取配置信息**
   - 点击左侧 "Settings" → "API"
   - 复制以下信息:
     - Project URL (例如: `https://xxxxx.supabase.co`)
     - `anon` `public` key (用于前端)
     - `service_role` key (用于爬虫,保密)

### 第二步: 配置前端

编辑 `frontend/js/supabase-config.js`:

```javascript
const SUPABASE_URL = 'https://你的项目.supabase.co'
const SUPABASE_ANON_KEY = '你的anon_key'
```

### 第三步: 部署到 Vercel (推荐)

1. **注册 Vercel**
   - 访问 [https://vercel.com](https://vercel.com)
   - 使用 GitHub 账号登录

2. **导入项目**
   - 点击 "Add New..." → "Project"
   - 选择你的 GitHub 仓库 `申请博士记录`
   - Framework Preset: 选择 "Other"
   - Root Directory: 留空或选择 `frontend`
   - 点击 "Deploy"

3. **完成部署**
   - 等待部署完成(约 1 分钟)
   - 获得网址,例如: `https://your-project.vercel.app`
   - 在手机或电脑上打开即可使用！

### 第四步: 配置爬虫

1. **本地安装 Python 依赖**(如果需要本地运行爬虫)

```bash
cd crawler
pip install -r requirements.txt
```

2. **配置环境变量**

复制 `.env.example` 为 `.env`:

```bash
cp .env.example .env
```

编辑 `.env`,填入 Supabase 信息:

```
SUPABASE_URL=https://你的项目.supabase.co
SUPABASE_SERVICE_KEY=你的service_role_key
```

3. **添加学校配置**

编辑 `crawler/config.yaml`,添加要爬取的学校:

```yaml
universities:
  - name: "清华大学计算机系"
    url: "https://www.cs.tsinghua.edu.cn/..."
    scraper_type: "two_level"
    enabled: true
    # ... 其他配置
```

4. **测试爬虫**

```bash
cd crawler
python main.py --dry-run  # 测试模式,不写入数据库
```

5. **正式爬取**

```bash
python main.py  # 爬取所有启用的学校
python main.py --url "https://xxx"  # 爬取指定学校
```

### 第五步: 设置自动爬取 (可选)

在 GitHub 仓库设置中添加 Secrets:

1. 访问 GitHub 仓库 → Settings → Secrets and variables → Actions
2. 添加以下 Secrets:
   - `SUPABASE_URL`: 你的 Supabase URL
   - `SUPABASE_SERVICE_KEY`: 你的 service_role key

配置完成后,系统会每周日凌晨自动爬取更新导师信息。你也可以在 Actions 页面手动触发。

## 📖 使用指南

### 添加新学校

#### 方法 1: 通过配置文件(推荐)

编辑 `crawler/config.yaml`:

```yaml
universities:
  - name: "北京大学信科学院"
    url: "https://eecs.pku.edu.cn/..."
    scraper_type: "two_level"
    enabled: true
    update_frequency: "weekly"

    list_page:
      container_selector: "ul > li"
      link_selector: "a"
      name_selector: "a"

    detail_page:
      email:
        - pattern: "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}"
      # ... 其他字段配置
```

#### 方法 2: 网页端添加(开发中)

未来版本将支持在网页上直接输入 URL,系统自动识别结构并爬取。

### 标记申请进度

1. **打开导师列表页**
2. **找到目标导师卡片**
3. **点击"查看详情"**
4. **在弹窗中更新状态和备注**
5. **点击"保存更新"**

你的操作会实时同步到数据库,女朋友的屏幕会立即看到更新！

### 批量操作

1. 点击导师列表页右上角的"批量操作"按钮
2. 选中要操作的导师(点击卡片上的复选框)
3. 点击批量操作栏的"标记为已发送"或"导出选中"
4. 完成后点击"取消"退出批量模式

### 查看统计

点击顶部"📊 统计面板" Tab,可以看到:

- 总导师数、已发送、已回复、面试中等数据
- 按学校和操作人的详细统计
- 回复率分析
- 待办事项提醒(如超过 7 天未回复的导师)

## 🛠️ 高级配置

### 自定义爬虫策略

对于特殊结构的网站,可以在 `crawler/scrapers/` 下创建自定义爬虫:

```python
from .base_scraper import BaseScraper

class CustomScraper(BaseScraper):
    def scrape(self):
        # 自定义爬取逻辑
        pass
```

然后在 `config.yaml` 中指定:

```yaml
scraper_type: "custom"
custom_module: "scrapers.custom.my_scraper"
```

### 数据备份

Supabase 提供自动备份,但建议定期导出数据:

1. 在 Supabase Dashboard → Database → Backups
2. 点击 "Create backup"
3. 或使用 SQL 导出:

```sql
COPY (SELECT * FROM professors) TO '/tmp/professors.csv' CSV HEADER;
```

### 性能优化

如果导师数量超过 500 位,建议:

1. 启用前端分页加载
2. 优化筛选查询(已创建索引)
3. 定期清理无用数据

## 🤝 协作使用

### 多人同时使用

系统支持无限用户同时使用,所有操作实时同步。建议:

1. 在右上角用户选择器中设置当前用户(你/女朋友)
2. 标记申请时会自动记录操作人
3. 可以在筛选器中只看自己的记录

### 防止冲突

虽然系统使用实时同步,但建议:

- 避免同时编辑同一个导师的记录
- 使用备注功能留言沟通
- 重要决策前先查看对方是否已操作

## 📝 常见问题

**Q: 爬虫无法访问某些学校网站?**

A: 可能是网络限制或需要登录。解决方案:
- 使用 VPN 或代理
- 手动下载导师名单,用脚本导入数据库
- 编写自定义爬虫处理登录逻辑

**Q: 数据同步有延迟?**

A: Supabase 实时同步通常在 100ms 内,如果超过 3 秒:
- 检查网络连接
- 查看浏览器控制台是否有错误
- 刷新页面重新建立连接

**Q: 如何修改邮件模板?**

A: 两种方式:
1. 在网页"📧 邮件模板" Tab 中编辑
2. 直接在 Supabase Dashboard → Table Editor → email_templates 中修改

**Q: 可以导出 Excel 吗?**

A: 目前支持批量导出功能。或在 Supabase Dashboard 中用 SQL 导出:

```sql
SELECT
  p.name,
  p.email,
  u.name as university,
  a.status,
  a.sent_at
FROM professors p
LEFT JOIN universities u ON p.university_id = u.id
LEFT JOIN applications a ON p.id = a.professor_id
```

**Q: 数据安全吗?**

A: 完全安全:
- Supabase 使用企业级加密
- 数据存储在云端,不会丢失
- 可以设置行级安全策略(RLS)控制访问权限
- 建议不要在公开场合展示包含 service_role key 的代码

## 📄 开源协议

MIT License - 随意使用和修改

## 🙏 致谢

- Supabase - 提供优秀的后端服务
- Tailwind CSS - 快速构建美观界面
- Vercel - 免费的前端部署平台

---

**祝申请顺利,早日找到心仪的导师! 🎓**

如有问题或建议,欢迎提 Issue 或联系作者。
