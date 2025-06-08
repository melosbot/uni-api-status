// 文件名: model-stats.tsx
// 备注：这是一个完整的替换文件内容。请直接用以下内容覆盖 model-stats.tsx 文件。

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator" // 引入 Separator
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AlertTriangle } from "lucide-react" // 用于无数据提示

interface ModelStatsProps {
  apiKey: string
}

interface ModelData {
  model: string
  requests: number
  successes: number
  failures: number
  successRate: number
  totalTokens: number
  promptTokens: number
  completionTokens: number
  avgProcessTime: number
  avgFirstResponseTime: number
}

export function ModelStats({ apiKey }: ModelStatsProps) {
  const [data, setData] = useState<ModelData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchModelStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]) // 依赖 apiKey

  const fetchModelStats = async () => {
     if (!apiKey) {
        setData([]);
        setLoading(false);
        return;
     }
    setLoading(true)
    try {
      const response = await fetch(`/api/stats/models?apiKey=${encodeURIComponent(apiKey)}`)
      if (response.ok) {
        const result = (await response.json()) || []
         // 对结果按请求数降序排序
        result.sort((a: ModelData, b: ModelData) => b.requests - a.requests);
        setData(result)
      } else {
        console.error("获取模型统计失败:", response.statusText)
        setData([]) // 清空数据
      }
    } catch (error) {
      console.error("获取模型统计时发生错误:", error)
       setData([]) // 清空数据
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (num: number): string => {
    if (isNaN(num) || num === null) return "-";
    // 显示完整数字，便于比较
    // if (num >= 1000000) return (num / 1000000).toFixed(1) + "M"
    // if (num >= 1000) return (num / 1000).toFixed(1) + "K"
    // return num.toString()
    return num.toLocaleString(); // 使用toLocaleString增加可读性
  }
  const formatNumberShort = (num: number): string => {
    if (isNaN(num) || num === null) return "-";
    if (num >= 1000000000) return (num / 1000000000).toFixed(1) + "B"
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M"
    if (num >= 1000) return (num / 1000).toFixed(1) + "K"
    return num.toString()
  }

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds === null) return "-";
    return seconds.toFixed(2) + "s"
  }

  const formatPercent = (rate: number): string => {
     if (isNaN(rate) || rate === null) return "-";
    return (rate * 100).toFixed(2) + "%"
  }

   const getSuccessRateColor = (rate: number): string => {
     if (isNaN(rate) || rate === null) return "text-muted-foreground";
     if (rate >= 0.95) return "text-green-600";
     if (rate >= 0.8) return "text-yellow-600";
     return "text-red-600";
   }

   // Skeleton 渲染函数 (保持不变，仅作为加载占位)
   const renderSkeleton = (count = 3, isMobile = false) => {
    if (isMobile) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[...Array(count)].map((_, i) => (
                    <Card key={i} className="max-w-full">
                        <CardHeader className="pb-2 pt-4 px-4">
                             <Skeleton className="h-5 w-3/5" />
                        </CardHeader>
                         <CardContent className="px-4 pb-4">
                            <Skeleton className="h-4 w-full mt-2"/>
                            <Skeleton className="h-4 w-5/6 mt-1"/>
                            <Skeleton className="h-4 w-full mt-3"/>
                             <Skeleton className="h-4 w-4/6 mt-1"/>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    } else {
        // Desktop Table Skeleton
        return (
            <TableBody>
                {[...Array(count)].map((_, i) => (
                    <TableRow key={i}>
                         <TableCell><Skeleton className="h-5 w-36" /></TableCell>
                         {[...Array(8)].map((_, j) => (
                             <TableCell key={j} className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                         ))}
                    </TableRow>
                ))}
            </TableBody>
        );
    }
  };

   const renderNoData = () => (
     <Card>
        <CardContent className="p-6 text-center text-muted-foreground flex flex-col items-center justify-center min-h-[150px]">
           <AlertTriangle className="w-10 h-10 mb-4 text-yellow-500" />
           <p>暂无模型统计数据</p>
            <p className="text-xs mt-1">请确保有日志生成或检查 API Key 是否正确</p>
        </CardContent>
     </Card>
   );

  return (
     <TooltipProvider>
        <div className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">模型统计</h2>

          {/* Desktop Table (保持不变) */}
          <div className="hidden lg:block">
             {loading ? (
                 <Card><CardContent className="p-0"><Table>{renderSkeleton(5, false)}</Table></CardContent></Card>
             ) : data.length === 0 ? (
                 renderNoData()
             ) : (
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[200px]">模型名称</TableHead>
                          <TableHead className="w-[100px] text-right">请求数</TableHead>
                          <TableHead className="w-[120px] text-right">成功 / 失败</TableHead>
                          <TableHead className="w-[100px] text-right">成功率</TableHead>
                          <TableHead className="w-[120px] text-right">总计 Tokens</TableHead>
                          <TableHead className="w-[120px] text-right">提示 Tokens</TableHead>
                          <TableHead className="w-[120px] text-right">完成 Tokens</TableHead>
                          <TableHead className="w-[120px] text-right">平均处理耗时</TableHead>
                          <TableHead className="w-[120px] text-right">平均首次响应</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                          {data.map((model, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">
                                 <Tooltip>
                                    <TooltipTrigger asChild>
                                       <div className="max-w-[180px] truncate">{model.model}</div>
                                    </TooltipTrigger>
                                    <TooltipContent><p>{model.model}</p></TooltipContent>
                                 </Tooltip>
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm">{formatNumber(model.requests)}</TableCell>
                              <TableCell className="text-right font-mono text-sm">
                                 <Tooltip>
                                     <TooltipTrigger asChild>
                                         <span>
                                             <span className="text-green-600">{formatNumber(model.successes)}</span>
                                             <span className="text-muted-foreground mx-1">/</span>
                                             <span className="text-red-600">{formatNumber(model.failures)}</span>
                                         </span>
                                     </TooltipTrigger>
                                     <TooltipContent>
                                          <p>成功: {model.successes.toLocaleString()}</p>
                                          <p>失败: {model.failures.toLocaleString()}</p>
                                     </TooltipContent>
                                 </Tooltip>
                              </TableCell>
                              <TableCell className={`text-right font-mono text-sm ${getSuccessRateColor(model.successRate)}`}>
                                {formatPercent(model.successRate)}
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm">{formatNumber(model.totalTokens)}</TableCell>
                              <TableCell className="text-right font-mono text-sm">{formatNumber(model.promptTokens)}</TableCell>
                              <TableCell className="text-right font-mono text-sm">{formatNumber(model.completionTokens)}</TableCell>
                              <TableCell className="text-right font-mono text-sm">{formatTime(model.avgProcessTime)}</TableCell>
                              <TableCell className="text-right font-mono text-sm">{formatTime(model.avgFirstResponseTime)}</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
             )}
          </div>

           {/* Mobile Cards (New Layout) */}
           <div className="lg:hidden">
             {loading ? renderSkeleton(4, true) : data.length === 0 ? renderNoData() : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {data.map((model, index) => (
                        <Card key={index} className="max-w-full">
                           <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 pt-4 px-4">
                             <CardTitle className="text-sm font-medium truncate pr-2" title={model.model}>
                               {model.model}
                             </CardTitle>
                           </CardHeader>
                           <CardContent className="p-4 pt-0 space-y-3"> {/* Reduced top padding */}
                               <Separator /> {/* Separator after Header */}
                               {/* Metrics Grid */}
                               <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                                  {/* Request Count */}
                                  <div className="flex justify-between items-center">
                                      <span className="text-muted-foreground">请求数:</span>
                                      <span className="font-mono font-medium">{formatNumber(model.requests)}</span>
                                  </div>
                                  {/* Success Rate */}
                                  <div className="flex justify-between items-center">
                                      <span className="text-muted-foreground">成功率:</span>
                                      <span className={`font-mono font-medium ${getSuccessRateColor(model.successRate)}`}>{formatPercent(model.successRate)}</span>
                                  </div>
                                   {/* Avg Process Time */}
                                   <div className="flex justify-between items-center">
                                      <span className="text-muted-foreground">平均耗时:</span>
                                      <span className="font-mono">{formatTime(model.avgProcessTime)}</span>
                                  </div>
                                  {/* Avg First Response Time */}
                                  <div className="flex justify-between items-center">
                                     <span className="text-muted-foreground">平均首响:</span>
                                     <span className="font-mono">{formatTime(model.avgFirstResponseTime)}</span>
                                   </div>
                                   {/* Tokens (Full Width) */}
                                   <div className="flex justify-between items-center col-span-2 pt-1">
                                       <span className="text-muted-foreground">Tokens (P/C/T):</span>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                              {/* Use short format for mobile */}
                                              <span className="font-mono">
                                                  {formatNumberShort(model.promptTokens)}/{formatNumberShort(model.completionTokens)}/{formatNumberShort(model.totalTokens)}
                                              </span>
                                          </TooltipTrigger>
                                          <TooltipContent side="top" align="end">
                                              <p>提示: {formatNumber(model.promptTokens)}</p>
                                              <p>完成: {formatNumber(model.completionTokens)}</p>
                                              <p>总计: {formatNumber(model.totalTokens)}</p>
                                          </TooltipContent>
                                        </Tooltip>
                                   </div>
                               </div>
                           </CardContent>
                        </Card>
                    ))}
                </div>
             )}
          </div>
        </div>
     </TooltipProvider>
  )
}