# Colab 部署支持 — 修改记录

**Commit**: `825d51c` — Add Google Colab deployment support
**分支**: main
**日期**: 2026-05-09

---

## 修改文件清单

| 文件 | 类型 | 变更说明 |
|------|------|----------|
| `server/src/index.ts` | 修改 | 生产模式支持：静态文件托管、SPA 路由、CSP 适配 |
| `server/src/config/index.ts` | 修改 | 新增 `STATIC_DIR` 配置项 |
| `vite.config.ts` | 修改 | proxy target 改为环境变量可配置 |
| `.env.colab` | 新增 | Colab 专用环境变量配置 |
| `colab-setup.ipynb` | 新增 | Colab 一键部署 Notebook |
| `COLAB_DEPLOY.md` | 新增 | 部署详细说明文档 |

---

## 各文件变更详情

### 1. `server/src/index.ts`

**改动 A — CSP 策略适配生产模式**

```diff
- contentSecurityPolicy: {
+ contentSecurityPolicy: config.nodeEnv === 'production' ? false : {
```

原因：生产模式下 `index.html` 通过 CDN 加载 Tailwind CSS 和 Google Fonts，严格的 CSP 策略会阻止这些外部资源加载。生产模式下直接关闭 CSP（Colab 为个人开发环境，安全风险可接受）。

**改动 B — 生产模式静态文件托管**

```diff
+ // Serve static frontend build in production mode
+ if (config.nodeEnv === 'production') {
+   app.use(express.static(config.staticDir));
+   // SPA fallback: serve index.html for all non-API, non-static routes
+   app.get('*', (_req, res) => {
+     res.sendFile(path.join(config.staticDir, 'index.html'));
+   });
+ }
```

位置：API 路由之后、错误处理中间件之前。

原因：开发模式下前端由 Vite dev server 独立托管（port 3000），生产模式下需要 Express 同时承担 API 和静态文件服务。SPA fallback 确保前端路由（如 `/song/:id`）能正确返回 `index.html`。

---

### 2. `server/src/config/index.ts`

```diff
+ // Static frontend build directory (for production / Colab)
+ staticDir: process.env.STATIC_DIR || path.join(__dirname, '../../dist'),
```

新增配置项，可通过 `STATIC_DIR` 环境变量指定前端构建产物目录。默认值为项目根目录下的 `dist/`（与 `vite build` 默认输出一致）。

---

### 3. `vite.config.ts`

```diff
+ const proxyTarget = env.VITE_PROXY_TARGET || 'http://127.0.0.1:3001';
  ...
- target: 'http://127.0.0.1:3001',
+ target: proxyTarget,
```

将 5 个 proxy 规则（`/api`、`/audio`、`/editor`、`/blog`、`/demucs-web`）的目标地址从硬编码改为读取 `VITE_PROXY_TARGET` 环境变量。

原因：当后端不在 `127.0.0.1:3001` 时（如远程开发或特殊部署场景），可通过环境变量灵活配置。默认行为不变。

---

### 4. `.env.colab`（新建）

Colab 环境专用配置文件，包含：
- `NODE_ENV=production` — 启用生产模式
- `STATIC_DIR`、`DATABASE_PATH`、`AUDIO_DIR` 等路径指向 Colab 的 `/content/` 目录
- `ACESTEP_API_URL=http://localhost:8001` — 后端连接本地 ACE-Step API
- `DATASETS_DIR` / `DATASETS_UPLOADS_DIR` — LoRA 训练数据集路径

---

### 5. `colab-setup.ipynb`（新建）

Jupyter Notebook，包含 14 个 Cell 的完整 Colab 部署流程：

| Cell | 功能 |
|------|------|
| 1 | GPU 环境检查（torch.cuda） |
| 2 | 安装 Node.js 20.x |
| 3 | 克隆 ACE-Step 和 ace-step-ui 仓库 |
| 4 | 安装 ACE-Step Python 依赖 |
| 5 | 安装前端和后端 npm 依赖 |
| 6 | 生成 `.env` 配置文件 |
| 7 | 构建 React 前端（`npm run build`） |
| 8 | 创建数据目录 |
| 9 | 启动 ACE-Step API 服务（后台进程） |
| 10 | 启动 Express 后端服务（后台进程） |
| 11 | 健康检查（验证两个服务） |
| 12 | 公网访问设置（ngrok / localtunnel / Gradio share） |
| 13-14 | 辅助功能：查看日志、停止服务、挂载 Google Drive |

---

## 兼容性说明

- 所有改动仅在 `NODE_ENV=production` 时生效
- 本地开发模式（`NODE_ENV=development`）行为完全不变
- `.env` 文件不配置 `STATIC_DIR` 时，使用默认的 `dist/` 路径
- Vite proxy 不配置 `VITE_PROXY_TARGET` 时，使用默认的 `http://127.0.0.1:3001`
