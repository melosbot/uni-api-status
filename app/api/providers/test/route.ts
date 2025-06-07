import { type NextRequest, NextResponse } from "next/server"
import fs from "fs"
import yaml from "js-yaml"

export async function POST(request: NextRequest) {
  try {
    const { apiKey, provider, base_url, api, model } = await request.json()

    if (!apiKey || !provider || !base_url || !api || !model) {
      return NextResponse.json(
        {
          success: false,
          message: "缺少必要参数",
        },
        { status: 400 },
      )
    }

    // Validate API key first
    const apiYamlPath = process.env.API_YAML_PATH || "/app/data/api.yaml"

    if (!fs.existsSync(apiYamlPath)) {
      return NextResponse.json(
        {
          success: false,
          message: "配置文件未找到",
        },
        { status: 500 },
      )
    }

    const yamlContent = fs.readFileSync(apiYamlPath, "utf8")
    const config = yaml.load(yamlContent) as any

    if (!config.api_keys || !Array.isArray(config.api_keys)) {
      return NextResponse.json(
        {
          success: false,
          message: "配置文件格式错误",
        },
        { status: 500 },
      )
    }

    const keyEntry = config.api_keys.find((entry: any) => entry.api === apiKey)

    if (!keyEntry) {
      return NextResponse.json(
        {
          success: false,
          message: "未授权",
        },
        { status: 403 },
      )
    }

    // Check if endpoint is supported
    if (!base_url.includes("/chat/completions") && !base_url.includes("/v1/messages")) {
      return NextResponse.json({
        success: false,
        message: "不支持的端点类型",
      })
    }

    // Prepare test request
    const testPayload = {
      model,
      messages: [
        {
          role: "user",
          content: "渠道测试，仅回复ok",
        },
      ],
    }

    // Handle different API formats
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    if (base_url.includes("/v1/messages")) {
      // Anthropic format
      headers["x-api-key"] = api
      headers["anthropic-version"] = "2023-06-01"
    } else {
      // OpenAI format
      headers["Authorization"] = `Bearer ${api}`
    }

    const startTime = Date.now()

    try {
      const response = await fetch(base_url, {
        method: "POST",
        headers,
        body: JSON.stringify(testPayload),
        signal: AbortSignal.timeout(60000), // 60s timeout
      })

      const responseTime = (Date.now() - startTime) / 1000

      if (response.ok) {
        const data = await response.json()
        return NextResponse.json({
          success: true,
          message: "测试成功",
          responseTime,
        })
      } else {
        const errorData = await response.text()
        return NextResponse.json({
          success: false,
          message: `HTTP ${response.status}: ${errorData.substring(0, 200)}`,
          responseTime,
        })
      }
    } catch (error: any) {
      const responseTime = (Date.now() - startTime) / 1000

      if (error.name === "TimeoutError") {
        return NextResponse.json({
          success: false,
          message: "请求超时(60s)",
          responseTime,
        })
      }

      return NextResponse.json({
        success: false,
        message: `网络错误: ${error.message}`,
        responseTime,
      })
    }
  } catch (error) {
    console.error("Error testing provider:", error)
    return NextResponse.json(
      {
        success: false,
        message: "内部服务器错误",
      },
      { status: 500 },
    )
  }
}
