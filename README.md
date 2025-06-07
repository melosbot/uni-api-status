# uni-api-status
一个用于查询和可视化展示 UniAPI 使用统计数据的 Web 应用程序。
=======
# UniAPI 前端统计与管理面板

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

一个现代化的 Web 应用程序，为 [uni-api](https://github.com/uni-openai/uni-api) 提供图形化界面，用于可视化配置管理和全面的 API 使用统计分析。

## ✨ 核心特性

*   **🔑 API Key 管理**: 便捷输入和验证 API Key，自动识别用户角色（管理员/普通用户），管理员可轻松掌握各用户使用情况。
*   **⚙️ 可视化配置 (管理员)**: 安全地在线编辑、上传、下载 `api.yaml` 配置文件，提供实时 YAML 语法校验和保存机制。
*   **📊 全面统计分析**:
    *   **使用概览**: 展示总请求数、Token 使用量、平均响应时间等关键指标。
    *   **模型维度**: 按不同 AI 模型分别统计。
    *   **渠道维度**: 按不同 API 渠道分别统计。
*   **📜 详细日志查询**: 查看可筛选、可搜索的 API 请求日志，支持无限滚动加载。
*   **📱 响应式设计**: 界面在桌面和移动设备上均能良好显示和操作。
*   **🔐 权限控制**: 基于 API Key 绑定的角色，严格控制对配置管理等敏感功能的访问。
*   **💡 现代技术栈**: 使用 Next.js、shadcn/ui、Tailwind CSS 等流行技术构建，确保高效开发和良好用户体验。
*   **🧠 AI 助力**: 本项目由 [v0 by Vercel](https://v0.dev) 构建主体框架，[gemini-2.5-pro-exp-035 by Gemini](https://blog.google/technology/google-deepmind/gemini-model-thinking-updates-march-2025/#gemini-2-5-pro) 细化页面细节。

## 🛠️ 技术栈

*   **前端框架**: Next.js 14 (App Router)
*   **UI 组件库**: shadcn/ui
*   **样式**: Tailwind CSS
*   **图标**: Lucide React
*   **后端 API**: Next.js API Routes
*   **数据库 (统计)**: SQLite (使用 `sqlite3` 库)
*   **YAML 处理**: `js-yaml`
*   **包管理器**: pnpm
*   **部署**: Docker & Docker Compose

## 🚀 快速开始 (本地开发)

### 环境要求

*   Node.js v18 或更高版本
*   pnpm 包管理器

### 安装步骤

1.  **克隆仓库**
    ```bash
    git clone https://github.com/melosbot/uni-api-status.git
    cd uni-api-status
    ```

2.  **安装依赖**
    ```bash
    pnpm install
    ```

3.  **配置环境变量**
    在项目根目录下创建 `.env.local` 文件，并根据你的实际环境配置以下变量：
    ```env
    # UniAPI 的核心配置文件路径
    API_YAML_PATH=/path/to/your/uniapi/api.yaml

    # UniAPI 生成的统计数据库文件路径
    STATS_DB_PATH=/path/to/your/uniapi/data/stats.db

    # (可选) 指定应用运行端口，默认为 3000
    # PORT=3000
    ```
    *   请确保 Node.js 进程对 `API_YAML_PATH` 指定的文件具有读写权限（用于配置编辑）。
    *   请确保 Node.js 进程对 `STATS_DB_PATH` 指定的文件及其产生的辅助文件 (`-shm`, `-wal`) 具有读取权限。

4.  **运行开发服务器**
    ```bash
    pnpm dev
    ```

5.  **访问应用**
    在浏览器中打开 `http://localhost:3000` (或你指定的端口)。

## 🐳 Docker 部署

推荐使用 Docker Compose 进行部署，以简化流程和管理。

### 使用 Docker Compose (推荐)

1.  **确认 `docker-compose.yml` 配置**:
    检查 `docker-compose.yml` 文件中的 `volumes` 部分，确保将宿主机存放 `api.yaml` 和 `stats.db` 的目录正确映射到容器内的 `/app/data` 目录。

    ```yaml
    services:
      uniapi-frontend:
        image: ghcr.io/melosbot/uni-api-status:latest
        ports:
        - "3000:3000"
        environment:
        - NODE_ENV=production
        - PORT=3000
        - API_YAML_PATH=/app/data/api.yaml
        - STATS_DB_PATH=/app/data/stats.db
        volumes:
        - /path/to/your/uniapi/data:/app/data:ro
        - /path/to/your/uniapi/api.yaml:/app/api.yaml
        restart: unless-stopped
        container_name: uniapi-frontend
    ```
    **重要**: 映射的宿主机目录 (`/path/to/your/uniapi` 在示例中) 需要包含 `api.yaml` 和 `stats.db` 文件。确保 Docker 对该目录及其内容具有读写权限 (尤其是api.yaml)。

2.  **构建并启动服务**:
    在包含 `docker-compose.yml` 文件的目录下运行：
    ```bash
    docker-compose up -d --build
    ```
    `--build` 参数会确保使用最新的代码构建镜像。如果镜像已是最新，可以省略。

### 直接使用 Docker CLI

1.  **运行容器**:
    ```bash
    docker run -d \
    --name uniapi-frontend \
    -p 3000:3000 \
    -e NODE_ENV=production \
    -e /path/to/your/uniapi/data:/app/data:ro \
    -e /path/to/your/uniapi/api.yaml:/app/api.yaml \
    # -e PORT=3000 # 可选
    # 将宿主机数据目录映射到容器，确保路径正确
    -v /path/to/your/uniapi/data:/app/data:ro \
    -v /path/to/your/uniapi/api.yaml:/app/api.yaml \
    ghcr.io/melosbot/uni-api-status:latest
    ```
    同样，请确保宿主机路径 (`/path/to/your/uniapi`) 正确，并且 Docker 具有读写权限。

### Docker 环境变量说明

| 变量名       | 描述                    | 容器内推荐值        |
| --------------- | -------------------------------------- | ---------------------- |
| `NODE_ENV`   | 运行环境                | `production`        |
| `PORT`       | 应用监听端口 (容器内部)          | `3000` (或 `docker-compose.yml` 中设置的值) |
| `API_YAML_PATH` | `api.yaml` 文件在容器内的绝对路径   | `/app/data/api.yaml`   |
| `STATS_DB_PATH` | `stats.db` 数据库文件在容器内的绝对路径 | `/app/data/stats.db`   |

## 🧭 功能导航

1.  **设置 API Key**:
    *   点击界面右上角的设置 (齿轮) 图标。
    *   在弹出的模态框中输入你的 UniAPI API Key。
    *   系统将验证 Key 并显示其对应的角色 (Admin / User)。后续操作权限将基于此角色。

2.  **配置管理 (仅限管理员)**:
    *   管理员验证通过后，侧边栏将出现 "配置管理" 选项。
    *   提供一个安全的在线编辑器来修改 `api.yaml` 内容。
    *   支持直接上传新的 `api.yaml` 文件或下载当前配置文件作为备份。
    *   编辑器包含实时 YAML 语法检查功能。
    *   点击 "保存" 按钮将更改写入服务器上的 `api.yaml` 文件。**注意**: 保存后通常需要重启 UniAPI 服务才能使配置生效。

3.  **统计与日志查看 (管理员和用户)**:
    *   **统计概览**: 默认展示的仪表盘，包含关键性能指标 (KPI)。
    *   **模型统计**: 查看按不同 AI 模型分类的请求数、Token 消耗等数据。
    *   **渠道统计**: 查看按不同 API 渠道分类的请求数、Token 消耗等数据。
    *   **详细日志**: 提供一个可搜索、可按时间/模型/渠道等条件筛选的请求日志列表，支持滚动加载更多历史记录。

## 📁 项目结构

```
.
├── Dockerfile
├── README.md
├── app
│   ├── api
│   │   ├── auth
│   │   ├── config
│   │   ├── filters
│   │   ├── logs
│   │   ├── providers
│   │   └── stats
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components
│   ├── api-key-modal.tsx
│   ├── channel-stats.tsx
│   ├── channel-tester.tsx
│   ├── config-editor.tsx
│   ├── detailed-logs.tsx
│   ├── model-stats.tsx
│   ├── overview-stats.tsx
│   ├── stats-viewer.tsx
│   ├── theme-provider.tsx
│   └── ui
├── components.json
├── docker-compose.yml
├── hooks
│   ├── use-mobile.tsx
│   └── use-toast.ts
├── lib
│   └── utils.ts
├── next.config.mjs
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── postcss.config.mjs
├── public
│   ├── placeholder-logo.png
│   ├── placeholder-logo.svg
│   ├── placeholder-user.jpg
│   ├── placeholder.jpg
│   └── placeholder.svg
├── styles
│   └── globals.css
├── tailwind.config.ts
└── tsconfig.json
```

## 🔌 API 端点

以下是前端应用调用的主要后端 API 路由：

*   `POST /api/auth/validate-key`: 验证提供的 API Key 并返回角色信息。
*   `GET /api/config/load`: (管理员) 加载 `api.yaml` 配置文件内容。
*   `POST /api/config/save`: (管理员) 保存修改后的 `api.yaml` 内容。
*   `GET /api/stats/overview`: 获取概览统计数据。
*   `GET /api/stats/models`: 获取按模型分组的统计数据。
*   `GET /api/stats/channels`: 获取按渠道分组的统计数据。
*   `GET /api/logs`: 获取详细请求日志 (支持分页和筛选参数)。
*   `GET /api/filters`: 获取用于日志筛选的可用选项 (如模型列表、渠道列表)。

## ⚠️ 重要注意事项

*   **依赖 UniAPI 服务**: 本前端应用依赖于正在运行的 UniAPI 服务实例，特别是依赖其生成的 `stats.db` 数据库文件来展示统计和日志。请确保 UniAPI 服务正常运行。
*   **配置文件生效**: 在通过本应用修改并保存 `api.yaml` 后，UniAPI 将自动重启使新的配置生效。
*   **备份配置**: 在进行任何重大配置修改之前，强烈建议使用 "下载" 功能备份当前的 `api.yaml` 文件。
*   **文件权限**: 运行应用的用户（或 Docker 容器）必须对 `api.yaml` 文件具有读写权限，对 `stats.db` 及其关联文件 (`-shm`, `-wal`) 具有读取权限。请仔细检查文件系统的权限设置。
*   **数据库**: 应用直接读取 UniAPI 的 SQLite 数据库文件 (`stats.db`)。确保该文件存在且路径配置正确。

## 🤝 贡献

欢迎提交问题报告 (Issues) 和提出改进建议。如果你希望贡献代码，请先创建一个 Issue 来讨论你的想法。

## 📄 许可证

本项目采用 [MIT License](https://opensource.org/licenses/MIT) 授权。
