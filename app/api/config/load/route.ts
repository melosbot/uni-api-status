import { type NextRequest, NextResponse } from "next/server"
import fs from "fs"
import yaml from "js-yaml"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const apiKey = searchParams.get("apiKey")

    if (!apiKey) {
      return NextResponse.json({ error: "API Key is required" }, { status: 400 })
    }

    // Validate API key and check admin role
    const apiYamlPath = process.env.API_YAML_PATH || "/app/data/api.yaml"

    if (!fs.existsSync(apiYamlPath)) {
      return NextResponse.json({ error: "Configuration file not found" }, { status: 500 })
    }

    const yamlContent = fs.readFileSync(apiYamlPath, "utf8")
    const config = yaml.load(yamlContent) as any

    if (!config.api_keys || !Array.isArray(config.api_keys)) {
      return NextResponse.json({ error: "Invalid configuration" }, { status: 500 })
    }

    const keyEntry = config.api_keys.find((entry: any) => entry.api === apiKey)

    if (!keyEntry || keyEntry.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    return NextResponse.json({ config: yamlContent })
  } catch (error) {
    console.error("Error loading config:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
