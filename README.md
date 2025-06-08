# UniAPI 前端统计与管理面板

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker Image](https://img.shields.io/badge/Docker-ghcr.io/melosbot/uni--api--status:latest-blue)](https://github.com/melosbot/uni-api-status/pkgs/container/uni-api-status)

一个现代化的 Web 应用程序，为 [uni-api](https://github.com/yym68686/uni-api) 提供图形化界面，用于可视化配置管理、全面的 API 使用统计分析以及渠道连通性测试。

**镜像构建:** `ghcr.io/melosbot/uni-api-status:latest` (支持 amd64/arm64 架构)

## ✨ 核心特性

*   **🔑 API Key 管理**: 便捷输入和验证 API Key，自动识别用户角色（管理员/普通用户）。管理员可选择查看特定 Key 的统计数据。
*   **⚙️ 可视化配置 (管理员)**: 安全地在线编辑、上传、下载 `api.yaml` 配置文件，提供实时 YAML 语法校验和保存机制。保存后需 `uni-api` 服务应用新配置。
*   **📊 全面统计分析**:
    *   **使用概览**: 展示总请求数、Token 使用量、平均处理耗时、平均首次响应时间等关键指标。
    *   **模型维度**: 按不同 AI 模型分别统计请求数、成功/失败、成功率、Token 消耗、耗时等。
    *   **渠道维度**: 按不同 API 渠道（Provider）分别统计各项指标。
*   **🧪 渠道测试 (管理员与用户)**:
    *   加载 `api.yaml` 中的渠道配置。
    *   支持选择特定模型对单个渠道进行连通性测试。
    *   支持一键测试所有支持的渠道（默认模型）。
    *   显示测试状态（成功/失败/测试中）、响应时间及错误信息。
*   **📜 详细日志查询**: 查看可筛选（模型、渠道、状态）、可搜索的 API 请求日志，支持无限滚动加载更多记录，并可查看完整的请求/响应内容。
*   **📱 响应式设计**: 界面在桌面和移动设备上均能良好显示和操作。
*   **🔐 权限控制**: 基于 API Key 绑定的角色，严格控制对配置管理等敏感功能的访问。
*   **💡 现代技术栈**: 使用 Next.js、shadcn/ui、Tailwind CSS 等流行技术构建，确保高效开发和良好用户体验。
*   **🧠 AI 助力**: 本项目主体框架由 [v0 by Vercel](https://v0.dev) 构建，页面细节由 [Gemini](https://gemini.google.com/) 完善。

## 🛠️ 技术栈

*   **前端框架**: Next.js 14 (App Router)
*   **UI 组件库**: shadcn/ui
*   **样式**: Tailwind CSS
*   **图标**: Lucide React
*   **后端 API**: Next.js API Routes
*   **YAML 处理**: `js-yaml`
*   **统计数据源**: 直接读取 `uni-api` 生成的 SQLite 数据库 (`stats.db`)
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
    # UniAPI 的核心配置文件路径 (绝对路径)
    # 应用需要对此文件有读写权限
    API_YAML_PATH=/path/to/your/uniapi/config/api.yaml

    # UniAPI 生成的统计数据库文件路径 (绝对路径)
    # 应用需要对此文件及其关联文件(-shm, -wal)有读取权限
    STATS_DB_PATH=/path/to/your/uniapi/data/stats.db

    # (可选) 指定应用运行端口，默认为 3000
    # PORT=3000
    ```
    *   **重要**: 确保 Node.js 进程对 `API_YAML_PATH` 指定的文件具有 **读写** 权限（用于配置编辑）。
    *   **重要**: 确保 Node.js 进程对 `STATS_DB_PATH` 指定的文件及其可能产生的辅助文件 (`-shm`, `-wal`) 具有 **读取** 权限。

4.  **运行开发服务器**
    ```bash
    pnpm dev
    ```

5.  **访问应用**
    在浏览器中打开 `http://localhost:3000` (或你指定的端口)。

## 🐳 Docker 部署

推荐使用 Docker Compose 进行部署。

### 使用 Docker Compose (推荐)

1.  **确认 `docker-compose.yml` 配置**:
    检查或创建 `docker-compose.yml` 文件。以下是一个示例，**请务必根据你的实际文件路径修改 `volumes` 部分**:

    ```yaml
    services:
      uniapi:
        image: yym68686/uni-api:latest
        restart: unless-stopped
        volumes:
          - /path/to/uniapi/api.yaml:/home/api.yaml
          - /path/to/uniapi/data:/home/data

      uniapi-frontend:
        image: ghcr.io/melosbot/uni-api-status:latest
        ports:
          # 将宿主机的 3000 端口映射到容器的 3000 端口
          # 如果宿主机 3000 端口已被占用，请修改左侧端口号，例如 "8080:3000"
          - "3000:3000"
        environment:
          # 生产环境配置
          - NODE_ENV=production
          - PORT=3000 # 容器内运行端口
          # 以下路径为容器内的路径，与 volumes 映射的容器内目标路径对应
          - API_YAML_PATH=/app/config/api.yaml
          - STATS_DB_PATH=/app/data/stats.db
        volumes:
          # 将宿主机的 api.yaml 文件映射到容器内的 /app/config/api.yaml
          # 确保 Docker 对宿主机此文件有【读写】权限
          - /path/to/uniapi/api.yaml:/app/config/api.yaml
          # 将宿主机包含 stats.db 的目录映射到容器内的 /app/data
          # 建议使用 :ro (read-only) 挂载，因为前端只需要读取统计数据
          # 确保 Docker 对宿主机此目录及内容有【读取】权限
          - /path/to/uniapi/data:/app/data:ro
        restart: unless-stopped
    ```
    **重要**:
    *   请将 `/path/to/your/uniapi/config/api.yaml` 替换为你宿主机上 `api.yaml` 文件的 **完整、绝对** 路径。
    *   请将 `/path/to/your/uniapi/data` 替换为你宿主机上包含 `stats.db` 文件的 **目录** 的 **完整、绝对** 路径。
    *   确保 Docker 守护进程有权访问你指定的宿主机路径和文件，并具有正确的读写权限（`api.yaml` 需要写，`stats.db` 只需要读）。

2.  **构建并启动服务**:
    在包含 `docker-compose.yml` 文件的目录下运行：
    ```bash
    docker-compose up -d
    ```
    如果需要重新构建镜像（例如本地修改了代码并希望使用本地构建），可以添加 `--build` 参数。

### 直接使用 Docker CLI

1.  **运行容器**:
    ```bash
    docker run -d \
      --name uniapi-frontend \
      -p 3000:3000 \
      -e NODE_ENV=production \
      -e PORT=3000 \
      -e API_YAML_PATH=/app/config/api.yaml \
      -e STATS_DB_PATH=/app/data/stats.db \
      -v /path/to/uniapi/config/api.yaml:/app/config/api.yaml \
      -v /path/to/uniapi/data:/app/data:ro \
      --restart unless-stopped \
      ghcr.io/melosbot/uni-api-status:latest
    ```
    同样，请确保替换宿主机路径 (`/path/to/uniapi/*`) 为你的实际路径，并检查 Docker 的访问权限。

### Docker 环境变量说明

| 变量名          | 描述                                       | 容器内推荐值               |
| --------------- | ------------------------------------------ | -------------------------- |
| `NODE_ENV`      | 运行环境                                   | `production`               |
| `PORT`          | 应用监听端口 (容器内部)                      | `3000` (或 Compose 中设置的值) |
| `API_YAML_PATH` | `api.yaml` 文件在容器内的绝对路径              | `/app/config/api.yaml`     |
| `STATS_DB_PATH` | `stats.db` 数据库文件在容器内的绝对路径      | `/app/data/stats.db`       |

## 🧭 功能导航

1.  **设置 API Key**:
    *   首次访问或点击界面右上角的设置 (齿轮) 图标。
    *   在弹出的模态框中输入你的 UniAPI API Key 或从已保存列表中选择。
    *   系统将验证 Key 并显示其对应的角色 (管理员 / 用户)。后续操作权限将基于此角色。
    *   管理员可以额外选择一个 Key 来查看其统计信息。

2.  **配置管理 (仅限管理员)**:
    *   管理员验证通过后，导航栏/菜单中将出现 "配置管理" 选项。
    *   提供一个安全的在线编辑器来修改 `api.yaml` 内容。
    *   支持直接上传新的 `api.yaml` 文件或下载当前配置文件作为备份。
    *   编辑器包含实时 YAML 语法检查功能。
    *   点击 "保存配置" 按钮将更改写入服务器上的 `api.yaml` 文件。**注意**: 保存后需要 `uni-api` 服务重新加载配置才能生效（通常需要重启 `uni-api` 或等待其自动重载）。

3.  **统计与日志查看 (管理员和用户)**:
    *   点击导航栏/菜单中的 "统计信息"。
    *   页面内包含多个统计模块，可以通过桌面端的悬浮菜单或移动端的菜单快速跳转到对应区域：
        *   **概览统计**: 关键性能指标 (KPI)。
        *   **模型统计**: 按不同 AI 模型分类的请求数、Token 消耗、成功率等数据。
        *   **渠道统计**: 按不同 API 渠道分类的请求数、Token 消耗、成功率等数据。
        *   **详细日志**: 提供一个可筛选（模型、渠道、状态）、可搜索的请求日志列表，支持滚动加载更多历史记录，并可查看请求详情。

4.  **渠道测试 (管理员与用户)**:
    *   点击导航栏/菜单中的 "渠道测试"。
    *   页面会列出从 `api.yaml` 加载的渠道及其配置的模型。
    *   可以选择模型，对单个渠道进行连通性测试。
    *   可以点击 "测试全部" 来测试所有标记为 `supported: true` 的渠道。
    *   实时显示测试结果，包括状态、响应时间和错误信息。


## 🔌 API 端点 (部分示例)

前端应用通过内部 API 路由与后端逻辑交互：

*   `POST /api/auth/validate-key`: 验证 API Key 并返回角色。
*   `POST /api/auth/available-keys`: (管理员) 获取所有可供查看统计的 Key 列表。
*   `GET /api/config/load`: (管理员) 加载 `api.yaml` 内容。
*   `POST /api/config/save`: (管理员) 保存 `api.yaml` 内容。
*   `GET /api/stats/overview`: 获取概览统计。
*   `GET /api/stats/models`: 获取模型统计。
*   `GET /api/stats/channels`: 获取渠道统计。
*   `GET /api/logs`: 获取详细日志 (支持分页和筛选)。
*   `GET /api/filters`: 获取日志筛选选项 (可用模型、渠道)。
*   `GET /api/providers/list`: 获取渠道列表及其配置 (用于渠道测试)。
*   `POST /api/providers/test`: 测试指定渠道的连通性。

## ⚠️ 重要注意事项

*   **依赖 UniAPI 服务**: 本应用强依赖于正在运行的 UniAPI 服务实例，特别是其生成的 `stats.db` 数据库文件和 `api.yaml` 配置文件。请确保 UniAPI 服务正常运行且相关文件路径配置正确。
*   **配置文件生效**: 通过本应用修改并保存 `api.yaml` 后，需要 UniAPI 服务重新加载配置（例如重启服务或等待其内部的自动重载机制）才能使更改生效。本应用 **不负责** 重启或重载 UniAPI 服务。
*   **备份配置**: 在进行任何重大配置修改之前，强烈建议使用 "下载" 功能备份当前的 `api.yaml` 文件。
*   **文件权限**: 运行本应用的用户（或 Docker 容器）必须对 `api.yaml` 文件具有 **读写** 权限，对 `stats.db` 及其关联文件 (`-shm`, `-wal`) 具有 **读取** 权限。请仔细检查文件系统或 Docker Volume 的权限设置。
*   **数据库**: 应用直接读取 UniAPI 的 SQLite 数据库文件 (`stats.db`)。请勿在 UniAPI 写入数据时对该文件进行写操作，以免损坏数据库。推荐使用 Docker 的 `:ro` (只读) 模式挂载包含 `stats.db` 的目录。

## 🤝 贡献

欢迎提交问题报告 (Issues) 和提出改进建议。如果你希望贡献代码，请先创建一个 Issue 来讨论你的想法。

## 📄 许可证

本项目采用 [MIT License](https://opensource.org/licenses/MIT) 授权。