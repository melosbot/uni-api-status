import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const apiKey = searchParams.get("apiKey")

    if (!apiKey) {
      return NextResponse.json({ error: "API Key is required" }, { status: 400 })
    }

    try {
      const results = await query(
        `
        SELECT
          r.provider,
          COUNT(*) as requests,
          COALESCE(SUM(CASE WHEN c.success = true THEN 1 ELSE 0 END), 0) as successes,
          COALESCE(SUM(CASE WHEN c.success = false THEN 1 ELSE 0 END), 0) as failures,
          COALESCE(AVG(CAST(c.success AS FLOAT)), 0) as successRate,
          COALESCE(SUM(r.total_tokens), 0) as totalTokens,
          COALESCE(SUM(r.prompt_tokens), 0) as promptTokens,
          COALESCE(SUM(r.completion_tokens), 0) as completionTokens,
          COALESCE(AVG(r.process_time), 0) as avgProcessTime,
          COALESCE(AVG(r.first_response_time), 0) as avgFirstResponseTime
        FROM request_stats r
        LEFT JOIN channel_stats c ON r.request_id = c.request_id
        WHERE r.api_key = $1 AND r.endpoint = 'POST /v1/chat/completions'
        GROUP BY r.provider
        ORDER BY requests DESC
      `,
        [apiKey],
      )

      return NextResponse.json(results)
    } catch (dbError) {
      throw dbError
    }
  } catch (error) {
    console.error("Error fetching channel stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
