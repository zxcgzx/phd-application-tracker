# 🚀 Cloudflare Pages 部署指南

## 为什么选择 Cloudflare Pages？

相比 Vercel，Cloudflare Pages 有以下优势：

- ✅ **国内访问无需翻墙**
- ✅ **全球 CDN 加速**，速度更快
- ✅ **完全免费**，无任何限制
- ✅ **自动部署**，git push 即生效
- ✅ **无限流量**，无限请求
- ✅ **免费自定义域名** + 免费 SSL

---

## 📋 部署步骤（5分钟完成）

### 步骤 1：注册 Cloudflare 账号

1. **访问 Cloudflare Pages**：https://pages.cloudflare.com
2. **点击 "Sign up"** 注册账号
   - 可以使用邮箱注册
   - 或使用 GitHub 账号登录（推荐）
3. **验证邮箱**（如果使用邮箱注册）

---

### 步骤 2：连接 GitHub 仓库

1. **登录后点击 "Create a project"**
2. **点击 "Connect to Git"**
3. **选择 "GitHub"**
4. **授权 Cloudflare 访问你的 GitHub**
   - 会跳转到 GitHub 授权页面
   - 点击 "Authorize Cloudflare Pages"
5. **选择仓库**
   - 在列表中找到 `phd-application-tracker`
   - 点击 "Begin setup"

---

### 步骤 3：配置构建设置

在构建设置页面，填写以下信息：

| 配置项 | 填写内容 |
|--------|----------|
| **Project name** | `phd-application-tracker`（或自定义名称） |
| **Production branch** | `main` |
| **Framework preset** | `None` |
| **Build command** | 留空（不填） |
| **Build output directory** | `/` |
| **Root directory (advanced)** | 留空（不填） |

**重要提示**：
- ❌ **不要选择任何 Framework preset**（如 React、Vue 等）
- ❌ **不要填写 Build command**
- ✅ **Build output directory 必须填写 `/`**

配置示意图：
```
┌─────────────────────────────────────────────┐
│ Setup build and deployment                  │
├─────────────────────────────────────────────┤
│ Project name: phd-application-tracker       │
│ Production branch: main                     │
│                                             │
│ Framework preset: [None ▼]                  │
│                                             │
│ Build command: [留空]                       │
│                                             │
│ Build output directory: /                   │
│                                             │
│ Root directory: [留空]                      │
│                                             │
│         [Cancel]  [Save and Deploy]         │
└─────────────────────────────────────────────┘
```

---

### 步骤 4：保存并部署

1. **点击 "Save and Deploy"**
2. **等待部署完成**（约 30 秒 - 1 分钟）
3. **部署成功后**，你会看到：
   ```
   ✅ Success! Your project is now deployed.

   https://phd-application-tracker.pages.dev
   ```

---

## 🎉 完成！测试访问

### 获取访问地址

部署成功后，你会得到一个 Cloudflare Pages 地址：

```
https://你的项目名.pages.dev
```

例如：`https://phd-application-tracker.pages.dev`

### 测试功能

1. **打开浏览器**，访问上面的地址
2. **确认页面正常加载**
3. **测试数据加载**：
   - 点击"导师列表" Tab
   - 应该能看到从 Supabase 加载的导师数据
4. **测试多端同步**：
   - 在电脑上打开 Cloudflare Pages 地址
   - 在手机上打开同一个地址
   - 在一个设备上修改导师状态
   - 另一个设备应该在 1 秒内看到更新

---

## 🔄 自动部署

配置完成后，每次你 `git push` 到 GitHub，Cloudflare Pages 会自动部署：

```bash
git add .
git commit -m "更新前端代码"
git push origin main
```

1-2 分钟后，你的网站会自动更新！

---

## 🌐 绑定自定义域名（可选）

如果你有自己的域名（如 `phd.example.com`），可以绑定到 Cloudflare Pages：

### 步骤 1：添加自定义域名

1. **进入项目设置**
   - 在 Cloudflare Pages 控制台中
   - 点击你的项目 → "Custom domains"
2. **点击 "Set up a custom domain"**
3. **输入你的域名**（如 `phd.example.com`）
4. **点击 "Continue"**

### 步骤 2：配置 DNS

Cloudflare 会提供 DNS 配置指南：

1. **如果你的域名在 Cloudflare**：
   - 自动配置，无需手动操作

2. **如果你的域名在其他服务商**（如阿里云、腾讯云）：
   - 添加 CNAME 记录：
     ```
     phd.example.com → phd-application-tracker.pages.dev
     ```

### 步骤 3：等待生效

- DNS 传播时间：5 分钟 - 24 小时
- SSL 证书自动签发（免费）

---

## 📊 与其他部署方式对比

| 特性 | Cloudflare Pages | GitHub Pages | Vercel |
|------|------------------|--------------|--------|
| **国内访问** | ✅ 无需翻墙 | ✅ 无需翻墙 | ❌ 需要翻墙 |
| **访问速度** | ⚡⚡⚡ 很快 | ⚡⚡ 较快 | ⚡⚡⚡ 很快 |
| **自动部署** | ✅ | ✅ | ✅ |
| **自定义域名** | ✅ 免费 | ✅ 免费 | ✅ 免费 |
| **HTTPS** | ✅ 自动 | ✅ 自动 | ✅ 自动 |
| **流量限制** | ❌ 无限制 | ❌ 无限制 | ⚠️ 有限制 |
| **构建时间** | ⚡ 30秒 | ⚡ 1分钟 | ⚡ 30秒 |
| **价格** | 💚 完全免费 | 💚 完全免费 | 💰 有限额 |

**推荐策略**：
- 🥇 **主力部署**：Cloudflare Pages（国内访问快）
- 🥈 **备用部署**：GitHub Pages（已配置好）
- 🥉 **可选部署**：Vercel（如果你在国外）

---

## ❌ 常见问题排查

### 问题 1：部署后显示 404 Not Found

**原因**：Cloudflare Pages 无法找到 `index.html`

**解决方法**：
1. 检查 **Build output directory** 是否填写了 `/`
2. 检查仓库根目录是否有 `index.html`
3. 如果 `index.html` 在 `frontend/` 目录下：
   - 修改 **Root directory** 为 `frontend`
   - 或者在根目录创建 `index.html` 重定向到 `frontend/index.html`

### 问题 2：部署后数据无法加载

**原因**：Supabase 配置不正确

**解决方法**：
1. 检查 `frontend/js/supabase-config.js` 中的配置：
   ```javascript
   const SUPABASE_URL = 'https://你的项目.supabase.co'
   const SUPABASE_ANON_KEY = '你的anon_key'
   ```
2. 确保这些配置已经推送到 GitHub
3. 重新触发 Cloudflare Pages 部署

### 问题 3：实时同步不工作

**原因**：Supabase Realtime 未启用

**解决方法**：
1. 参考 `docs/ENABLE_REALTIME_GUIDE.md`
2. 在 Supabase 中执行 `database/enable_realtime.sql`
3. 刷新 Cloudflare Pages 网站

### 问题 4：修改代码后网站没有更新

**原因**：Cloudflare Pages 缓存

**解决方法**：
1. 等待 1-2 分钟让部署完成
2. 或在浏览器中硬刷新：
   - Windows: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`
3. 或清除浏览器缓存

---

## 🔧 高级配置

### 配置环境变量（可选）

如果需要配置环境变量：

1. **进入项目设置**
   - Cloudflare Pages 控制台
   - 点击你的项目 → "Settings" → "Environment variables"
2. **点击 "Add variable"**
3. **输入变量名和值**
   - 例如：`SUPABASE_URL`、`SUPABASE_ANON_KEY`
4. **保存**

**注意**：本项目不需要环境变量，因为配置已经硬编码在 `supabase-config.js` 中。

### 查看部署日志

如果部署失败，可以查看日志：

1. **进入项目页面**
2. **点击 "View build"**
3. **查看 "Build log"**
4. **寻找错误信息**（通常是红色的）

---

## 📞 需要帮助？

如果按照以上步骤仍然无法部署，请提供以下信息：

1. **Cloudflare Pages 部署日志**
   - 在项目页面点击 "View build" → 复制日志
2. **浏览器控制台错误**
   - 按 `F12` → Console → 截图或复制错误信息
3. **网络请求错误**
   - 按 `F12` → Network → 筛选失败的请求（红色）
4. **项目信息**
   - GitHub 仓库地址
   - Cloudflare Pages 项目名称

---

## 🎊 部署成功后的效果

部署成功后，你将拥有：

✅ **一个不需要翻墙的网站**
✅ **全球 CDN 加速，访问速度快**
✅ **自动 HTTPS，安全可靠**
✅ **自动部署，git push 即生效**
✅ **多端实时同步，协作无障碍**
✅ **完全免费，无任何限制**

---

**最后更新时间**：2025-11-05
**维护者**：Claude Code Assistant
**如有问题**：请查看项目的 `README.md` 或提交 GitHub Issue
