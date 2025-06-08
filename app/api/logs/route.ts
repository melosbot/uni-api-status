// 文件名: api.logs.router.tsx
// 备注：这是一个完整的替换文件内容。请直接用以下内容覆盖 api.logs.router.tsx 文件。
// 修改内容：
// 1. 修正了状态筛选逻辑，使其正确处理前端发送的 'true' 或 'false' 字符串。

import { type NextRequest, NextResponse } from "next/server"
import sqlite3 from "sqlite3"
import { promisify } from "util"

// 辅助函数，用于安全地将字符串 'true'/'false' 转换为布尔值
function parseBoolean(value: string | null): boolean | null {
    if (value === null || value === undefined) {
        return null;
    }
    const lowerCaseValue = value.toLowerCase();
    if (lowerCaseValue === 'true') {
        return true;
    }
    if (lowerCaseValue === 'false') {
        return false;
    }
    return null; // 或者根据需要抛出错误或返回默认值
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const apiKey = searchParams.get("apiKey")
    const page = Number.parseInt(searchParams.get("page") || "1")
    // 增加对 limit 的校验，防止过大或无效值
    const rawLimit = searchParams.get("limit") || "30"; // 默认值改为 30，与前端一致
    const limit = Math.min(Math.max(1, Number.parseInt(rawLimit)), 100); // 限制在 1 到 100 之间
    const model = searchParams.get("model")
    const provider = searchParams.get("provider")
    const statusParam = searchParams.get("status") // 获取原始 status 参数 ('true' or 'false')

    if (!apiKey) {
      return NextResponse.json({ error: "API Key is required" }, { status: 400 })
    }

    const dbPath = process.env.STATS_DB_PATH || "/app/data/stats.db"
    // 以只读模式打开数据库，如果不需要写入的话
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
        if (err) {
            console.error("Error opening database:", err.message);
            // 如果数据库打开失败，直接返回错误，避免后续操作
            // 注意：这里的 return 无法直接返回 NextResponse，需要通过抛出错误或设置标志位处理
            // 简单的处理是继续执行，让后续的 dbAll 捕获错误
        }
    });

    const dbAll = promisify(db.all.bind(db))
    const dbClose = promisify(db.close.bind(db))

    try {
      // 使用参数化查询以防止 SQL 注入
      let whereClause = "WHERE r.api_key = ? AND r.endpoint = ?"
      const params: (string | number | boolean)[] = [apiKey, "POST /v1/chat/completions"]

      if (model) {
        whereClause += " AND r.model = ?"
        params.push(model)
      }

      if (provider) {
        whereClause += " AND r.provider = ?"
        params.push(provider)
      }

      // **修正状态筛选逻辑**
      // 将 'true'/'false' 字符串转换为布尔值
      const successStatus = parseBoolean(statusParam);
      if (successStatus !== null) { // 只有当 status 参数有效时才添加条件
          // SQLite 中布尔值通常存储为 0 或 1
          whereClause += " AND c.success = ?"
          params.push(successStatus ? 1 : 0);
      }
      // 如果 successStatus 为 null (即 status 参数不是 'true' 或 'false'，或者未提供)，则不添加 c.success 条件，返回所有状态

      const offset = (page - 1) * limit

      // 为了检查是否有下一页，多查询一条记录
      const queryLimit = limit + 1;

      const results = await dbAll(
        `
        SELECT
          r.timestamp,
          CASE COALESCE(c.success, 0) WHEN 1 THEN 1 ELSE 0 END as success_int,
          r.model,
          r.provider,
          r.process_time as processTime,
          r.first_response_time as firstResponseTime,
          r.prompt_tokens as promptTokens,
          r.completion_tokens as completionTokens,
          r.total_tokens as totalTokens,
          r.text
        FROM request_stats r
        LEFT JOIN channel_stats c ON r.request_id = c.request_id
        ${whereClause}
        ORDER BY r.timestamp DESC
        LIMIT ? OFFSET ?
      `,
        [...params, queryLimit, offset], // 使用查询限制 queryLimit
      )

      // 处理查询结果，将 success_int 转换为布尔值
      const processedResults = results.map(row => ({
        ...row,
        success: row.success_int === 1 // 将 1 转换为 true, 0 转换为 false
      }));

      // 判断是否有下一页
      const hasNextPage = processedResults.length > limit
      // 如果有下一页，截取所需数量的日志
      const logs = hasNextPage ? processedResults.slice(0, limit) : processedResults

      await dbClose()

      return NextResponse.json({ logs, hasNextPage })

    } catch (dbError) {
      console.error("Database query error:", dbError);
       // 尝试关闭数据库连接，即使出错
      try { await dbClose(); } catch (closeErr) { console.error("Error closing DB after query error:", closeErr); }
      // 返回更具体的数据库错误信息（生产环境中可能需要屏蔽细节）
      return NextResponse.json({ error: "Database query failed", details: (dbError as Error).message }, { status: 500 })
    }
  } catch (error) {
    console.error("Error fetching logs:", error)
    // 确保即使在顶层 catch 中，也能处理已知错误类型
    if (error instanceof Error) {
        return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 })
    }
    // 处理未知错误
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}