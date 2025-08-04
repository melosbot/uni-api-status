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
          COUNT(*) as requests,
          COALESCE(SUM(total_tokens), 0) as totalTokens,
          COALESCE(SUM(prompt_tokens), 0) as promptTokens,
          COALESCE(SUM(completion_tokens), 0) as completionTokens,
          COALESCE(AVG(process_time), 0) as avgProcessTime,
          COALESCE(AVG(first_response_time), 0) as avgFirstResponseTime
        FROM request_stats
        WHERE api_key = $1 AND endpoint = 'POST /v1/chat/completions'
      `,
        [apiKey],
      )

      const stats = results[0] || {
        requests: 0,
        totalTokens: 0,
        promptTokens: 0,
        completionTokens: 0,
        avgProcessTime: 0,
        avgFirstResponseTime: 0,
      }

      return NextResponse.json(stats)
    } catch (dbError) {
      throw dbError
    }
  } catch (error) {
    console.error("Error fetching overview stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
