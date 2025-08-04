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
      const [models, providers] = await Promise.all([
        query(
          `
          SELECT DISTINCT model
          FROM request_stats
          WHERE api_key = $1 AND endpoint = 'POST /v1/chat/completions'
          ORDER BY model
        `,
          [apiKey],
        ),
        query(
          `
          SELECT DISTINCT provider
          FROM request_stats
          WHERE api_key = $1 AND endpoint = 'POST /v1/chat/completions'
          ORDER BY provider
        `,
          [apiKey],
        ),
      ])

      return NextResponse.json({
        models: models.map((row: any) => row.model),
        providers: providers.map((row: any) => row.provider),
      })
    } catch (dbError) {
      throw dbError
    }
  } catch (error) {
    console.error("Error fetching filters:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
