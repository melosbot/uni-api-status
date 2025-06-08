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

    // Validate API key first
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

    if (!keyEntry) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Parse providers
    const providers = []

    if (config.providers && Array.isArray(config.providers)) {
      for (const provider of config.providers) {
        const models = []

        // Parse model configurations
        if (provider.model && Array.isArray(provider.model)) {
          for (const modelEntry of provider.model) {
            if (typeof modelEntry === "string") {
              // Simple model name
              models.push({
                original: modelEntry,
                display: modelEntry,
              })
            } else if (typeof modelEntry === "object") {
              // Model mapping (original: display)
              for (const [original, display] of Object.entries(modelEntry)) {
                models.push({
                  original,
                  display: display as string,
                })
              }
            }
          }
        }

        // Check if base_url supports chat completions
        const supported =
          provider.base_url &&
          (provider.base_url.includes("/chat/completions") || provider.base_url.includes("/v1/messages"))

        providers.push({
          provider: provider.provider,
          base_url: provider.base_url,
          api: provider.api,
          models,
          supported,
        })
      }
    }

    return NextResponse.json({ providers })
  } catch (error) {
    console.error("Error loading providers:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
