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
      const [models, providers] = await Promise.all([
        dbAll(
          `
          SELECT DISTINCT model 
          FROM request_stats 
          WHERE api_key = ? AND endpoint = 'POST /v1/chat/completions'
          ORDER BY model
        `,
          [apiKey],
        ),
        dbAll(
          `
          SELECT DISTINCT provider 
          FROM request_stats 
          WHERE api_key = ? AND endpoint = 'POST /v1/chat/completions'
          ORDER BY provider
        `,
          [apiKey],
        ),
      ])

      await dbClose()

      return NextResponse.json({
        models: models.map((row) => row.model),
        providers: providers.map((row) => row.provider),
      })
    } catch (dbError) {
      await dbClose()
      throw dbError
    }
  } catch (error) {
    console.error("Error fetching filters:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
