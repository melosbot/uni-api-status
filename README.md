# UniAPI Status - 前端统计与管理面板

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker Image](https://img.shields.io/badge/Docker-ghcr.io/melosbot/uni--api--status:latest-blue)](https://github.com/melosbot/uni-api-status/pkgs/container/uni-api-status)

一个现代化的 Web 应用程序，为 [uni-api](https://github.com/yym68686/uni-api) 提供图形化界面，用于可视化配置管理、全面的 API 使用统计分析以及渠道连通性测试。

**镜像构建:** `ghcr.io/melosbot/uni-api-status:latest` (支持 amd64/arm64 架构)

---

## 📝 目录

- [UniAPI Status - 前端统计与管理面板](#uniapi-status---前端统计与管理面板)
  - [📝 目录](#-目录)
  - [✨ 核心特性](#-核心特性)
  - [🛠️ 技术栈](#️-技术栈)
  - [🚀 快速开始 (本地开发)](#-快速开始-本地开发)
    - [环境要求](#环境要求)
    - [安装步骤](#安装步骤)
  - [🐳 Docker 部署](#-docker-部署)
    - [使用 Docker Compose (推荐)](#使用-docker-compose-推荐)
    - [直接使用 Docker CLI](#直接使用-docker-cli)
    - [Docker 环境变量](#docker-环境变量)
  - [🧭 功能导航](#-功能导航)
  - [❓ 常见问题 (Troubleshooting)](#-常见问题-troubleshooting)
  - [🔌 API 端点](#-api-端点)
  - [⚠️ 重要注意事项](#️-重要注意事项)
  - [🤝 贡献](#-贡献)
  - [🙌 致谢](#-致谢)
  - [📄 许可证](#-许可证)

---

## ✨ 核心特性

- **🔑 API Key 管理**: 便捷输入和验证 API Key，自动识别用户角色（管理员/普通用户）。管理员可选择查看特定 Key 的统计数据。
- **⚙️ 可视化配置 (管理员)**: 安全地在线编辑、上传、下载 `api.yaml` 配置文件，提供实时 YAML 语法校验。
- **📊 全面统计分析**:
  - **使用概览**: 总请求数、Token 使用量、平均耗时等关键指标。
  - **模型维度**: 按模型统计请求数、成功率、Token 消耗等。
  - **渠道维度**: 按渠道统计各项指标。
- **🧪 渠道连通性测试**: 支持对单个或所有渠道进行连通性测试，实时显示状态、响应时间及错误信息。
- **📜 详细日志查询**: 可筛选、可搜索的 API 请求日志，支持无限滚动加载和查看完整请求/响应内容。
- **📱 响应式设计**: 完美适配桌面和移动设备。
- **🔐 权限控制**: 基于 API Key 角色，严格控制对敏感功能的访问。
- **💡 现代技术栈**: 基于 Next.js、shadcn/ui、Tailwind CSS 等流行技术构建。

## 🛠️ 技术栈

- **前端框架**: Next.js 14 (App Router)
- **UI 组件库**: shadcn/ui
- **样式**: Tailwind CSS
- **图标**: Lucide React
- **后端 API**: Next.js API Routes
- **YAML 处理**: `js-yaml`
- **统计数据源**: 直接读取 `uni-api` 生成的 SQLite 数据库 (`stats.db`)
- **包管理器**: pnpm
- **部署**: Docker & Docker Compose

## 🚀 快速开始 (本地开发)

### 环境要求

- Node.js v18 或更高版本
- pnpm 包管理器

### 安装步骤

1. **克隆仓库**

    ```bash
    git clone https://github.com/melosbot/uni-api-status.git
    cd uni-api-status
    ```

2. **安装依赖**

    ```bash
    pnpm install
    ```

3. **配置环境变量**
    在项目根目录下创建 `.env.local` 文件，并根据你的实际环境配置以下变量：

    ```env
    # UniAPI 的核心配置文件路径 (绝对路径)
    API_YAML_PATH=/path/to/your/uniapi/config/api.yaml

    # UniAPI 生成的统计数据库文件路径 (绝对路径)
    STATS_DB_PATH=/path/to/your/uniapi/data/stats.db

    # (可选) 指定应用运行端口，默认为 3000
    # PORT=3000
    ```

    > **⚠️ 重要：文件权限**
    > - 确保应用进程对 `API_YAML_PATH` 指定的文件具有 **读写** 权限。
    > - 确保应用进程对 `STATS_DB_PATH` 指定的文件及其关联文件 (`-shm`, `-wal`) 具有 **读取** 权限。

4. **运行开发服务器**

    ```bash
    pnpm dev
    ```

5. **访问应用**
    在浏览器中打开 `http://localhost:3000` (或你指定的端口)。

## 🐳 Docker 部署

### 使用 Docker Compose (推荐)

1. **创建 `docker-compose.yml` 文件**
    这是一个推荐的配置示例。**请务必根据你的实际文件路径修改 `volumes` 部分**。

    <details>
    <summary>📄 点击查看 docker-compose.yml 示例</summary>

    ```yaml
    services:
      # 这是 uni-api 服务的示例，如果已有则无需重复添加
      uniapi:
        image: yym68686/uni-api:latest
        restart: unless-stopped
        volumes:
          - /path/to/uniapi/api.yaml:/home/api.yaml
          - /path/to/uniapi/data:/home/data

      # 本应用的前端服务
      uniapi-frontend:
        image: ghcr.io/melosbot/uni-api-status:latest
        restart: unless-stopped
        ports:
          # 将宿主机的 3000 端口映射到容器。如果 3000 端口被占用，请修改左侧值，如 "8080:3000"
          - "3000:3000"
        environment:
          - NODE_ENV=production
          - PORT=3000
          # 以下为容器内的路径，与 volumes 挂载点对应
          - API_YAML_PATH=/app/config/api.yaml
          - STATS_DB_PATH=/app/data/stats.db
        volumes:
          # 将宿主机的 api.yaml 挂载到容器内，需要【读写】权限
          - /path/to/your/uniapi/api.yaml:/app/config/api.yaml
          # 将宿主机包含 stats.db 的目录挂载到容器内，建议只读【:ro】
          - /path/to/your/uniapi/data:/app/data:ro
    ```

    </details>

    > **⚠️ 重要：路径和权限**
    > - 请将 `/path/to/your/uniapi/...` 替换为你宿主机上的 **完整、绝对** 路径。
    > - 确保 Docker 守护进程有权访问你指定的宿主机路径，并具有正确的读写权限。

2. **启动服务**
    在 `docker-compose.yml` 所在目录下运行：

    ```bash
    docker-compose up -d
    ```

### 直接使用 Docker CLI

如果你不使用 Docker Compose，也可以直接运行以下命令。同样，请务必替换路径并检查权限。

<details>
<summary>💻 点击查看 docker run 命令</summary>

```bash
docker run -d \
  --name uniapi-frontend \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e API_YAML_PATH=/app/config/api.yaml \
  -e STATS_DB_PATH=/app/data/stats.db \
  -v /path/to/your/uniapi/api.yaml:/app/config/api.yaml \
  -v /path/to/your/uniapi/data:/app/data:ro \
  --restart unless-stopped \
  ghcr.io/melosbot/uni-api-status:latest
```

</details>

### Docker 环境变量

| 变量名          | 描述                                | 容器内推荐值           |
| --------------- | ----------------------------------- | ---------------------- |
| `NODE_ENV`      | 运行环境                            | `production`           |
| `PORT`          | 容器内应用监听端口                  | `3000`                 |
| `API_YAML_PATH` | `api.yaml` 在容器内的绝对路径       | `/app/config/api.yaml` |
| `STATS_DB_PATH` | `stats.db` 在容器内的绝对路径       | `/app/data/stats.db`   |

## 🧭 功能导航

1. **设置 API Key**: 首次访问或点击右上角设置图标，输入你的 UniAPI Key 以验证身份和权限。
2. **配置管理 (仅管理员)**: 在 "配置管理" 页面，在线编辑、上传或下载 `api.yaml` 文件。
3. **统计与日志**: 在 "统计信息" 页面，查看概览、模型、渠道维度的统计图表，并查询详细的请求日志。
4. **渠道测试**: 在 "渠道测试" 页面，对 `api.yaml` 中配置的渠道进行连通性测试。

## ❓ 常见问题 (Troubleshooting)

1. **修改配置后 `uni-api` 没有变化?**
    - **原因**: 本应用只负责修改 `api.yaml` 文件本身。`uni-api` 服务需要重新加载配置才能使其生效。
    - **解决方案**: 重启 `uni-api` 服务 (例如 `docker restart uniapi`) 或等待其内部的自动重载机制。

2. **应用日志提示 "Permission denied" 或无法读取/写入文件?**
    - **原因**: 运行本应用的进程（或 Docker 容器）没有足够的文件系统权限。
    - **解决方案**:
        - **Docker**: 检查你的 `volumes` 挂载路径在宿主机上的权限。确保 Docker 守护进程有权访问。在某些系统（如 SELinux 环境）上，你可能需要为卷标添加 `:z` 或 `:Z` 选项。
        - **本地开发**: 检查运行 `pnpm dev` 的用户是否对 `API_YAML_PATH` 和 `STATS_DB_PATH` 具有正确的读/写权限。

3. **统计数据不更新?**
    - **原因**: `STATS_DB_PATH` 配置错误，或者 `uni-api` 没有在向该数据库写入数据。
    - **解决方案**: 确认路径配置正确，并检查 `uni-api` 服务是否正常运行且产生了日志。

## 🔌 API 端点

前端应用通过以下内部 API 路由与后端逻辑交互：

<details>
<summary>📄 点击展开 API 列表</summary>

- `POST /api/auth/validate-key`: 验证 API Key 并返回角色。
- `POST /api/auth/available-keys`: (管理员) 获取所有可供查看统计的 Key 列表。
- `GET /api/config/load`: (管理员) 加载 `api.yaml` 内容。
- `POST /api/config/save`: (管理员) 保存 `api.yaml` 内容。
- `GET /api/stats/overview`: 获取概览统计。
- `GET /api/stats/models`: 获取模型统计。
- `GET /api/stats/channels`: 获取渠道统计。
- `GET /api/logs`: 获取详细日志 (支持分页和筛选)。
- `GET /api/filters`: 获取日志筛选选项 (可用模型、渠道)。
- `GET /api/providers/list`: 获取渠道列表及其配置 (用于渠道测试)。
- `POST /api/providers/test`: 测试指定渠道的连通性。

</details>

## ⚠️ 重要注意事项

- **依赖 UniAPI**: 本应用强依赖于 `uni-api` 服务，请确保其正常运行且文件路径配置正确。
- **备份配置**: 在进行任何重大配置修改前，强烈建议使用 "下载" 功能备份当前的 `api.yaml` 文件。
- **文件权限**: 再次强调，请务必确保正确的 **读写** (`api.yaml`) 和 **读取** (`stats.db`) 权限。
- **数据库只读**: 应用默认以只读方式访问 `stats.db`，请勿尝试对其进行写操作，以免损坏数据库。

## 🤝 贡献

欢迎提交问题报告 (Issues) 和提出改进建议。如果你希望贡献代码，请先创建一个 Issue 来讨论你的想法。

## 🙌 致谢

- 本项目主体框架由 [v0 by Vercel](https://v0.dev) 构建。
- 页面细节由 [Gemini](https://gemini.google.com/) 完善。

## 📄 许可证

本项目采用 [MIT License](https://opensource.org/licenses/MIT) 授权。
