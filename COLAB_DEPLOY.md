# ACE-Step UI - Google Colab 部署指南

## 概述

本指南介绍如何将 ACE-Step AI 音乐生成器部署到 Google Colab，利用 Colab 提供的免费 GPU 进行音乐生成。

### 架构

```
┌─────────────────────────────────────────────────┐
│  Google Colab VM (T4 GPU)                       │
│                                                  │
│  ┌──────────────┐  ┌──────────────┐             │
│  │ ACE-Step API  │  │  Express     │             │
│  │ (Python/      │  │  Backend     │             │
│  │  Gradio)      │  │  (Node.js)   │             │
│  │  :8001        │──│  :3001       │             │
│  └──────────────┘  └──────┬───────┘             │
│                           │ serves              │
│                     ┌─────┴─────┐               │
│                     │ React UI  │               │
│                     │ (dist/)   │               │
│                     └───────────┘               │
└──────────────────────────┬──────────────────────┘
                           │ ngrok / localtunnel
                    ┌──────┴──────┐
                    │  公网 URL    │
                    │ https://... │
                    └─────────────┘
```

| 服务 | 技术栈 | 端口 | 作用 |
|------|--------|------|------|
| ACE-Step API | Python / Gradio | 8001 | AI 推理引擎，加载模型，生成音乐 |
| Express Backend | Node.js / Express | 3001 | REST API、数据库、文件管理、托管前端 |
| React Frontend | 构建后由 Express 托管 | — | 用户界面 |

---

## 前置条件

- Google 账号（用于访问 Colab）
- 可选：ngrok 免费账号（用于公网访问完整 UI，注册地址 https://ngrok.com/signup）

### 运行时要求

| 运行时 | 是否兼容 | 说明 |
|--------|---------|------|
| **T4 GPU** | **兼容（推荐）** | 15GB VRAM，满足所有功能需求 |
| L4 GPU | 兼容 | 24GB VRAM，性能更好 |
| A100 GPU | 兼容 | 40/80GB VRAM，最强性能 |
| **TPU v2** | **不兼容** | ACE-Step 基于 CUDA，不支持 TPU |
| CPU | 部分兼容 | 可运行但极慢（10-30 min/首歌），不推荐 |

> **为什么 TPU 不兼容？** ACE-Step 的模型推理依赖 PyTorch CUDA 运算和 vllm 推理引擎，两者仅支持 NVIDIA GPU。TPU 使用 `torch_xla` 编程模型，与 ACE-Step 的架构不兼容。Notebook 会自动检测运行时类型并在 TPU 环境下给出明确提示。

---

## 部署步骤

### Step 1 — 打开 Colab 并选择 GPU

1. 访问 https://colab.research.google.com
2. 点击 **File → Upload notebook**，上传项目中的 `colab-setup.ipynb`
3. 点击 **Runtime → Change runtime type**
4. Hardware accelerator 选择 **T4 GPU**（**不要选择 TPU**）
5. 点击 **Save**

> **重要**：必须选择 GPU 运行时，否则音乐生成会极其缓慢。

### Step 2 — 逐个执行 Cell

#### Cell 1: GPU 检查

确认输出类似：
```
GPU: Tesla T4 (15.0 GB)
CUDA: 12.x
```

如果没有 GPU，前往 Runtime → Change runtime type 重新选择。

#### Cell 2: 安装 Node.js

安装 Node.js 20.x。输出 `node --version` 和 `npm --version` 即表示成功。

#### Cell 3: 克隆仓库

**需要修改**：如果使用自己的 fork，修改两个 URL 参数：
- `ACESTEP_REPO` — ACE-Step 仓库地址
- `UI_REPO` — ace-step-ui 仓库地址（包含 Colab 改动的分支）

#### Cell 4: 安装 Python 依赖

安装 ACE-Step 的 Python 包和 PyTorch。

**可能需要调整**：根据 ACE-Step 仓库的实际结构，安装命令可能是：
```python
# 方式 1: pyproject.toml + uv
!uv pip install -e . --system

# 方式 2: requirements.txt
!pip install -r requirements.txt

# 方式 3: setup.py
!pip install -e .
```

#### Cell 5: 安装 npm 依赖

分别安装前端和后端的 Node.js 依赖，无需修改。

#### Cell 6: 配置环境变量

自动生成 `.env` 文件，预设了 Colab 目录结构的路径。一般无需修改。

#### Cell 7: 构建前端

执行 `npm run build`，将 React 前端编译为静态文件输出到 `dist/` 目录。

确认输出 `Frontend built successfully: N files in dist/`。

#### Cell 8: 创建必要目录

创建数据库、音频文件、训练数据集等目录。

#### Cell 9: 启动 ACE-Step API

**关键步骤，可能需要调整启动命令。**

默认命令：
```python
python -m acestep --port 8001 --enable-api --server-name 127.0.0.1
```

常见替代命令：
```python
# 如果有独立启动脚本
python app.py --port 8001 --enable-api

# 如果使用 uv 包管理器
uv run acestep-api --port 8001

# 如果使用 gradio 直接启动
python app.py --server_name 127.0.0.1 --server_port 8001
```

等待输出 `ACE-Step API is ready!`，模型加载通常需要 1-3 分钟。

如果失败，查看日志：
```
!cat /content/acestep-api.log
```

#### Cell 10: 启动 Express 后端

启动 Node.js 后端服务，确认 health 端点返回：
```json
{"status":"ok","service":"ACE-Step UI API"}
```

#### Cell 11: 健康检查

验证两个服务均显示 `[OK]`。

#### Cell 12: 公网访问

选择以下方式之一：

| 方式 | 配置 | 优点 | 缺点 |
|------|------|------|------|
| **ngrok（推荐）** | 需要免费 authtoken | 完整 React UI，稳定可靠 | 需注册 |
| **localtunnel** | 无需配置 | 无需注册 | 首次访问有密码确认页，稳定性一般 |
| **Gradio share** | 在 Cell 9 添加 `--share` | 零配置 | 只暴露 Gradio 原生 UI，不含 React 界面 |

**ngrok 使用方法**：
1. 注册 https://ngrok.com/signup
2. 在 Dashboard 复制 authtoken
3. 粘贴到 Cell 的 `NGROK_AUTHTOKEN` 参数框
4. 运行 Cell，获得公网链接如 `https://xxxx.ngrok-free.app`
5. 在浏览器打开该链接即可使用

**Gradio share 方法**：

修改 Cell 9 的启动命令，添加 `--share` 和 `--server-name 0.0.0.0`：
```python
python -m acestep --port 8001 --enable-api --server-name 0.0.0.0 --share
```
输出中会出现类似 `https://xxxxx.gradio.live` 的链接。注意此链接是 Gradio 原生界面，不含 ace-step-ui 的 React 界面。

---

## 常用操作

### 查看日志

```
# ACE-Step API 日志
!cat /content/acestep-api.log

# Express 后端日志
!cat /content/express-backend.log

# 实时跟踪日志
!tail -f /content/acestep-api.log
```

### 停止服务

运行 Notebook 中的「停止所有服务」Cell，或手动执行：
```bash
!pkill -f acestep
!pkill -f tsx
```

### 重启服务

先停止，再重新运行 Cell 9 和 Cell 10。

---

## 持久化数据（可选）

Colab 断开连接后数据会丢失。运行「挂载 Google Drive」Cell 可将以下数据持久化：

- SQLite 数据库（用户、歌曲、播放列表）
- 生成的音频文件
- 训练数据集

操作步骤：
1. 运行挂载 Cell，授权 Google Drive 访问
2. 数据存储在 `MyDrive/ace-step-data/` 目录
3. 通过软链接映射到项目目录

> **注意**：需要在启动服务之前执行挂载操作。

---

## 故障排查

| 问题 | 解决方案 |
|------|----------|
| **TPU 运行时不兼容** | Runtime → Change runtime type → 选择 **T4 GPU**（不要选 TPU）。ACE-Step 仅支持 CUDA GPU |
| Cell 1 报告 TPU detected | 立即切换 GPU 运行时并重启 Notebook，不要继续执行后续 Cell |
| `Failed to fetch` 错误 | 通常是 TPU 环境下服务未启动导致，先切换到 GPU 运行时 |
| GPU 未检测到 | Runtime → Change runtime type → 选择 T4 GPU |
| ACE-Step 启动超时 | 检查 `acestep-api.log`，可能需要调整启动命令或安装额外依赖 |
| ACE-Step 进程立即退出 | 查看日志 `!cat /content/acestep-api.log`，常见原因：CUDA 驱动不匹配、内存不足 |
| Express 后端报错 | 检查 `express-backend.log`，确认 `.env` 配置正确 |
| 前端页面空白 | 确认 `dist/` 目录存在且包含 `index.html` |
| ngrok 链接打不开 | 确认 authtoken 正确，检查 ngrok 是否还在运行 |
| 生成音乐失败 | 确认 ACE-Step API 健康检查通过，查看 API 日志 |
| Colab 断线 | 免费版 Colab 有闲置超时，定期操作页面保持活跃；或使用 Colab Pro |

---

## 本地部署（非 Colab）

如需在本地机器部署，参考 `start-all.sh`：
```bash
./setup.sh      # 安装依赖
./start-all.sh  # 启动所有服务
```

本地部署无需 ngrok，直接访问 `http://localhost:3000`。
