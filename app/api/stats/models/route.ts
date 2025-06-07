import { type NextRequest, NextResponse } from "next/server"
import sqlite3 from "sqlite3"
import { promisify } from "util"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const apiKey = searchParams.get("apiKey")

    if (!apiKey) {
      return NextResponse.json({ error: "API Key is required" }, { status: 400 })
    }

    const dbPath = process.env.STATS_DB_PATH || "/app/data/stats.db"
    const db = new sqlite3.Database(dbPath)

    const dbAll = promisify(db.all.bind(db))
    const dbClose = promisify(db.close.bind(db))

    try {
      const results = await dbAll(
        `
        SELECT 
          r.model,
          COUNT(*) as requests,
          COALESCE(SUM(CASE WHEN c.success = 1 THEN 1 ELSE 0 END), 0) as successes,
          COALESCE(SUM(CASE WHEN c.success = 0 THEN 1 ELSE 0 END), 0) as failures,
          COALESCE(AVG(CAST(c.success AS FLOAT)), 0) as successRate,
          COALESCE(SUM(r.total_tokens), 0) as totalTokens,
          COALESCE(SUM(r.prompt_tokens), 0) as promptTokens,
          COALESCE(SUM(r.completion_tokens), 0) as completionTokens,
          COALESCE(AVG(r.process_time), 0) as avgProcessTime,
          COALESCE(AVG(r.first_response_time), 0) as avgFirstResponseTime
        FROM request_stats r
        LEFT JOIN channel_stats c ON r.request_id = c.request_id
        WHERE r.api_key = ? AND r.endpoint = 'POST /v1/chat/completions'
        GROUP BY r.model
        ORDER BY requests DESC
      `,
        [apiKey],
      )

      await dbClose()

      return NextResponse.json(results)
    } catch (dbError) {
      await dbClose()
      throw dbError
    }
  } catch (error) {
    console.error("Error fetching model stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
