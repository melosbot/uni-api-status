// 文件名: src/components/overview-stats.tsx
"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton" // Import Skeleton
import { Activity, Zap, MessageSquare, Clock, Timer, BarChart3 } from "lucide-react"
// Import helper functions from utils.ts
import { formatNumber, formatNumberCompact, formatTime } from "@/lib/utils"

// --- Interfaces ---

interface OverviewStatsProps {
  apiKey: string
}

interface OverviewData {
  requests: number
  totalTokens: number
  promptTokens: number
  completionTokens: number
  avgProcessTime: number // Assuming this is in seconds
  avgFirstResponseTime: number // Assuming this is in seconds
}

// --- Component Definition ---

export function OverviewStats({ apiKey }: OverviewStatsProps) {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  // Effect for detecting mobile device based on window width
  useEffect(() => {
    const checkDevice = () => {
      // Using 768px as a common breakpoint for mobile/tablet vs desktop
      setIsMobile(window.innerWidth < 768)
    }

    // Initial check
    checkDevice()

    // Add resize listener
    window.addEventListener("resize", checkDevice)

    // Cleanup listener on component unmount
    return () => window.removeEventListener("resize", checkDevice)
  }, []) // Empty dependency array ensures this runs only once on mount and cleans up on unmount

  // Effect for fetching data when apiKey changes
  useEffect(() => {
    const fetchOverviewStats = async () => {
      if (!apiKey) {
          setLoading(false);
          setData(null);
          return;
      }
      setLoading(true) // Set loading true when fetch starts
      setData(null) // Clear previous data
      try {
        const response = await fetch(`/api/stats/overview?apiKey=${encodeURIComponent(apiKey)}`)
        if (response.ok) {
          const result: OverviewData = await response.json()
          setData(result)
        } else {
          console.error(`Failed to fetch overview stats: ${response.status} ${response.statusText}`)
          setData(null) // Ensure data is null on failure
        }
      } catch (error) {
        console.error("Failed to fetch overview stats:", error)
        setData(null) // Ensure data is null on error
      } finally {
        setLoading(false)
      }
    }

    fetchOverviewStats()
  }, [apiKey]) // Re-run effect if apiKey changes

  // Memoized calculation of stats array based on data and device type
  const stats = useMemo(() => {
    const loadingValue = <Skeleton className="h-5 w-10 ml-auto" />; // Use Skeleton for loading state
    const defaultValueNumber = "0"
    const defaultValueTime = "0.00s"

    // Function to display number based on device type, using imported utils
    const displayNumber = (num: number | undefined | null) => {
      if (num === undefined || num === null) return defaultValueNumber;
      return isMobile ? formatNumberCompact(num) : formatNumber(num);
    };

    // Display time using imported util
    const displayTime = (time: number | undefined | null) => {
        return formatTime(time ?? NaN); // Pass NaN to formatTime if time is null/undefined
    };

    if (loading) {
      // Return skeleton structure during loading
      return [
        { title: "总请求数", value: loadingValue, icon: Activity, color: "text-blue-600" },
        { title: "总计 Tokens", value: loadingValue, icon: BarChart3, color: "text-green-600" },
        { title: "提示 Tokens", value: loadingValue, icon: MessageSquare, color: "text-purple-600" },
        { title: "完成 Tokens", value: loadingValue, icon: Zap, color: "text-orange-600" },
        { title: "平均处理耗时", value: loadingValue, icon: Clock, color: "text-red-600" },
        { title: "平均首字响应", value: loadingValue, icon: Timer, color: "text-indigo-600" },
      ];
    }

    return [
      {
        title: "总请求数",
        value: displayNumber(data?.requests),
        icon: Activity,
        color: "text-blue-600",
      },
      {
        title: "总计 Tokens",
        value: displayNumber(data?.totalTokens),
        icon: BarChart3,
        color: "text-green-600",
      },
      {
        title: "提示 Tokens",
        value: displayNumber(data?.promptTokens),
        icon: MessageSquare,
        color: "text-purple-600",
      },
      {
        title: "完成 Tokens",
        value: displayNumber(data?.completionTokens),
        icon: Zap,
        color: "text-orange-600",
      },
      {
        title: "平均处理耗时",
        value: displayTime(data?.avgProcessTime),
        icon: Clock,
        color: "text-red-600",
      },
      {
        title: "平均首字响应",
        value: displayTime(data?.avgFirstResponseTime),
        icon: Timer,
        color: "text-indigo-600",
      },
    ]
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, isMobile, loading]) // Dependencies for memoization

  // --- Render ---
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold tracking-tight">概览统计</h2>
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"> {/* Adjusted grid columns for responsiveness */}
        {stats.map((stat, index) => (
          <Card key={index} className="w-full overflow-hidden"> {/* Added overflow-hidden */}
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg bg-gray-100 ${stat.color} flex-shrink-0`}>
                  {/* Ensure Icon components are correctly passed and rendered */}
                  <stat.icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0 text-right">
                  {/* Use title attribute for full text on hover, especially useful if truncated */}
                  <p className="text-xs font-medium text-muted-foreground truncate" title={stat.title}>
                    {stat.title}
                  </p>
                  {/* Use font-mono for numerical data for better alignment and readability */}
                  {/* Apply text-lg to value */}
                  <div className="text-lg font-bold font-mono">
                    {stat.value}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}