import { type NextRequest, NextResponse } from "next/server"
import fs from "fs"
import yaml from "js-yaml"

export async function POST(request: NextRequest) {
  try {
    const { adminKey } = await request.json()

    if (!adminKey) {
      return NextResponse.json({ error: "Admin key is required" }, { status: 400 })
    }

    const apiYamlPath = process.env.API_YAML_PATH || "/app/data/api.yaml"

    if (!fs.existsSync(apiYamlPath)) {
      return NextResponse.json({ error: "Configuration file not found" }, { status: 500 })
    }

    const yamlContent = fs.readFileSync(apiYamlPath, "utf8")
    const config = yaml.load(yamlContent) as any

    if (!config.api_keys || !Array.isArray(config.api_keys)) {
      return NextResponse.json({ error: "Invalid configuration" }, { status: 500 })
    }

    // 验证是否为管理员
    const adminEntry = config.api_keys.find((entry: any) => entry.api === adminKey)
    if (!adminEntry || adminEntry.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // 返回所有有效的 API Keys
    const keys = config.api_keys.map((entry: any) => ({
      api: entry.api,
      role: entry.role || "user",
      name: entry.name || undefined,
    }))

    return NextResponse.json({ keys })
  } catch (error) {
    console.error("Error fetching available keys:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
