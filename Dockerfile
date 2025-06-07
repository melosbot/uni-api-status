# 文件名: Dockerfile

# ==========================
# 构建阶段 (Builder Stage)
# ==========================
FROM node:18-alpine AS builder

# 检查构建架构 (例如输出 x86_64 或 aarch64)
RUN uname -m

# 安装 pnpm 全局工具
RUN npm install -g pnpm

# 为原生模块编译安装必要的构建依赖 和 sqlite3 的运行时依赖
RUN apk add --no-cache --virtual .build-deps build-base python3 linux-headers && \
    apk add --no-cache sqlite-libs

# 设置工作目录
WORKDIR /app

# 复制包管理文件
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# 安装所有依赖
RUN pnpm install --frozen-lockfile --unsafe-perm=true

# 复制项目所有源代码 (在 rebuild 之后)
COPY . .

# 执行 Next.js 应用构建
RUN pnpm build

# 构建完成后，清理临时的构建工具依赖
RUN apk del .build-deps

# ==========================
# 生产阶段 (Runner Stage)
# ==========================
FROM node:18-alpine AS runner

WORKDIR /app

# 安装 sqlite3 的运行时系统依赖
RUN apk add --no-cache sqlite-libs

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

EXPOSE 3000

CMD ["node", "server.js"]