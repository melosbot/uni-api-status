"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Activity, Zap, MessageSquare, Clock, Timer, BarChart3 } from "lucide-react"

interface OverviewStatsProps {
  apiKey: string
}

interface OverviewData {
  requests: number
  totalTokens: number
  promptTokens: number
  completionTokens: number
  avgProcessTime: number
  avgFirstResponseTime: number
}

export function OverviewStats({ apiKey }: OverviewStatsProps) {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOverviewStats()
  }, [apiKey])

  const fetchOverviewStats = async () => {
    try {
      const response = await fetch(`/api/stats/overview?apiKey=${encodeURIComponent(apiKey)}`)
      if (response.ok) {
        const result = await response.json()
        setData(result)
      }
    } catch (error) {
      console.error("Failed to fetch overview stats:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000000) return (num / 1000000000).toFixed(1) + "B"
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M"
    if (num >= 1000) return (num / 1000).toFixed(1) + "K"
    return num.toString()
  }

  const formatTime = (seconds: number) => {
    return seconds.toFixed(2) + "s"
  }

  const stats = [
    {
      title: "总请求数",
      value: data ? formatNumber(data.requests) : "0",
      icon: Activity,
      color: "text-blue-600",
    },
    {
      title: "总计 Tokens",
      value: data ? formatNumber(data.totalTokens) : "0",
      icon: BarChart3,
      color: "text-green-600",
    },
    {
      title: "提示 Tokens",
      value: data ? formatNumber(data.promptTokens) : "0",
      icon: MessageSquare,
      color: "text-purple-600",
    },
    {
      title: "完成 Tokens",
      value: data ? formatNumber(data.completionTokens) : "0",
      icon: Zap,
      color: "text-orange-600",
    },
    {
      title: "平均处理耗时",
      value: data ? formatTime(data.avgProcessTime) : "0.00s",
      icon: Clock,
      color: "text-red-600",
    },
    {
      title: "平均首次响应时间",
      value: data ? formatTime(data.avgFirstResponseTime) : "0.00s",
      icon: Timer,
      color: "text-indigo-600",
    },
  ]

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">概览统计</h2>
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className="w-full">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg bg-gray-100 ${stat.color} flex-shrink-0`}>
                  <stat.icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <p className="text-xs font-medium text-muted-foreground truncate" title={stat.title}>
                    {stat.title}
                  </p>
                  <p className="text-lg font-bold font-mono">{loading ? "..." : stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
