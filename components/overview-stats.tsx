// src/components/overview-stats.tsx
"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Activity, Zap, MessageSquare, Clock, Timer, BarChart3 } from "lucide-react"

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

// --- Helper Functions ---

/**
 * Formats a number into a compact representation (K, M, B) for mobile displays.
 * @param num - The number to format.
 * @returns Formatted string (e.g., "1.2K", "3.5M").
 */
const formatNumberCompact = (num: number): string => {
  if (num >= 1000000000) return (num / 1000000000).toFixed(1) + "B"
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M"
  if (num >= 1000) return (num / 1000).toFixed(1) + "K"
  return num.toString()
}

/**
 * Formats a number for display, using compact notation on mobile and full notation with commas on desktop.
 * @param num - The number to format.
 * @param isMobile - Boolean indicating if the display context is mobile.
 * @returns Formatted number string.
 */
const displayNumber = (num: number, isMobile: boolean): string => {
  if (isMobile) {
    return formatNumberCompact(num)
  } else {
    // Use locale string for thousand separators on desktop
    return num.toLocaleString()
  }
}

/**
 * Formats a time duration given in seconds.
 * @param seconds - The duration in seconds.
 * @returns Formatted time string (e.g., "1.23s").
 */
const formatTime = (seconds: number): string => {
  return seconds.toFixed(2) + "s"
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

    if (apiKey) {
        fetchOverviewStats()
    } else {
        setLoading(false) // If no API key, stop loading
        setData(null)
    }
  }, [apiKey]) // Re-run effect if apiKey changes

  // Memoized calculation of stats array based on data and device type
  const stats = useMemo(() => {
    const loadingValue = "..."
    const defaultValueNumber = "0"
    const defaultValueTime = "0.00s"

    if (loading) {
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
        value: data ? displayNumber(data.requests, isMobile) : defaultValueNumber,
        icon: Activity,
        color: "text-blue-600",
      },
      {
        title: "总计 Tokens",
        value: data ? displayNumber(data.totalTokens, isMobile) : defaultValueNumber,
        icon: BarChart3,
        color: "text-green-600",
      },
      {
        title: "提示 Tokens",
        value: data ? displayNumber(data.promptTokens, isMobile) : defaultValueNumber,
        icon: MessageSquare,
        color: "text-purple-600",
      },
      {
        title: "完成 Tokens",
        value: data ? displayNumber(data.completionTokens, isMobile) : defaultValueNumber,
        icon: Zap,
        color: "text-orange-600",
      },
      {
        title: "平均处理耗时",
        // Time formatting is consistent across devices unless specified otherwise
        value: data ? formatTime(data.avgProcessTime) : defaultValueTime,
        icon: Clock,
        color: "text-red-600",
      },
      {
        title: "平均首字响应",
        // Time formatting is consistent across devices unless specified otherwise
        value: data ? formatTime(data.avgFirstResponseTime) : defaultValueTime,
        icon: Timer,
        color: "text-indigo-600",
      },
    ]
  }, [data, isMobile, loading]) // Dependencies for memoization

  // --- Render ---
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">概览统计</h2>
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"> {/* Adjusted grid columns for responsiveness */}
        {stats.map((stat, index) => (
          <Card key={index} className="w-full">
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
                  <p className="text-lg font-bold font-mono">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}