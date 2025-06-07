"use client"

import { useState, useEffect } from "react"
import { OverviewStats } from "@/components/overview-stats"
import { ModelStats } from "@/components/model-stats"
import { ChannelStats } from "@/components/channel-stats"
import { DetailedLogs } from "@/components/detailed-logs"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

interface StatsViewerProps {
  apiKey: string
}

export function StatsViewer({ apiKey }: StatsViewerProps) {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 模拟加载时间
    const timer = setTimeout(() => setLoading(false), 1000)
    return () => clearTimeout(timer)
  }, [])

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">加载统计数据中...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div id="overview">
        <OverviewStats apiKey={apiKey} />
      </div>
      <div id="models">
        <ModelStats apiKey={apiKey} />
      </div>
      <div id="channels">
        <ChannelStats apiKey={apiKey} />
      </div>
      <div id="logs">
        <DetailedLogs apiKey={apiKey} />
      </div>
    </div>
  )
}
