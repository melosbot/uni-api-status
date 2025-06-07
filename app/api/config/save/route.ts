import { type NextRequest, NextResponse } from "next/server"
import fs from "fs"
import yaml from "js-yaml"

export async function POST(request: NextRequest) {
  try {
    const { apiKey, config } = await request.json()

    if (!apiKey || !config) {
      return NextResponse.json({ error: "API Key and config are required" }, { status: 400 })
    }

    const apiYamlPath = process.env.API_YAML_PATH || "/app/data/api.yaml"

    if (!fs.existsSync(apiYamlPath)) {
      return NextResponse.json({ error: "Configuration file not found" }, { status: 500 })
    }

    // Validate API key and check admin role
    const currentYamlContent = fs.readFileSync(apiYamlPath, "utf8")
    const currentConfig = yaml.load(currentYamlContent) as any

    if (!currentConfig.api_keys || !Array.isArray(currentConfig.api_keys)) {
      return NextResponse.json({ error: "Invalid current configuration" }, { status: 500 })
    }

    const keyEntry = currentConfig.api_keys.find((entry: any) => entry.api === apiKey)

    if (!keyEntry || keyEntry.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Validate YAML syntax
    try {
      yaml.load(config)
    } catch (yamlError) {
      return NextResponse.json({ error: "Invalid YAML syntax" }, { status: 400 })
    }

    // Save the configuration
    fs.writeFileSync(apiYamlPath, config, "utf8")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving config:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
