import { type NextRequest, NextResponse } from "next/server"
import fs from "fs"
import yaml from "js-yaml"

export async function POST(request: NextRequest) {
  try {
    const { apiKey } = await request.json()

    if (!apiKey) {
      return NextResponse.json({ valid: false, error: "API Key is required" }, { status: 400 })
    }

    const apiYamlPath = process.env.API_YAML_PATH || "/app/data/api.yaml"

    if (!fs.existsSync(apiYamlPath)) {
      return NextResponse.json({ valid: false, error: "Configuration file not found" }, { status: 500 })
    }

    const yamlContent = fs.readFileSync(apiYamlPath, "utf8")
    const config = yaml.load(yamlContent) as any

    if (!config.api_keys || !Array.isArray(config.api_keys)) {
      return NextResponse.json({ valid: false, error: "Invalid configuration" }, { status: 500 })
    }

    const keyEntry = config.api_keys.find((entry: any) => entry.api === apiKey)

    if (keyEntry) {
      return NextResponse.json({
        valid: true,
        role: keyEntry.role || "user",
      })
    } else {
      return NextResponse.json({ valid: false })
    }
  } catch (error) {
    console.error("Error validating API key:", error)
    return NextResponse.json({ valid: false, error: "Internal server error" }, { status: 500 })
  }
}
