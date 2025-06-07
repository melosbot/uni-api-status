// 文件名: detailed-logs.tsx
// 备注：这是一个完整的替换文件内容。请直接用以下内容覆盖 detailed-logs.tsx 文件。
// 修改内容：
// 1. 修复了状态筛选：确保在 API 调用时正确传递 status 参数（true/false）。前端逻辑已检查无误，如果筛选仍无效，请检查后端 /api/logs 接口。
// 2. 状态显示修改：移除了 Badge，只显示 CheckCircle (成功) 或 XCircle (失败) 图标，并添加了 Tooltip 提示。

"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card" // CardHeader, CardTitle 可能不再直接使用，但保留 imports
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
// import { Badge } from "@/components/ui/badge" // Badge 不再需要
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton" // 引入 Skeleton
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip" // 引入 Tooltip
import { Eye, Filter, Copy, Loader2, X, XCircle, CheckCircle } from "lucide-react" // 引入 Loader2 和 X 用于加载和清除
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { useToast } from "@/hooks/use-toast" // 引入 useToast

interface DetailedLogsProps {
  apiKey: string
}

interface LogEntry {
  timestamp: string
  success: boolean
  model: string
  provider: string
  processTime: number
  firstResponseTime: number
  promptTokens: number
  completionTokens: number
  totalTokens: number
  text: string
}

interface Filters {
  model?: string
  provider?: string
  status?: "success" | "failed" // 类型明确为 'success' 或 'failed'
}

const LOGS_PER_PAGE = 30 // 定义每页加载数量

export function DetailedLogs({ apiKey }: DetailedLogsProps) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true) // 初始加载状态
  const [loadingMore, setLoadingMore] = useState(false) // 加载更多状态
  const [hasNextPage, setHasNextPage] = useState(true)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<Filters>({})
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [availableProviders, setAvailableProviders] = useState<string[]>([])
  const { toast } = useToast()

  // 获取筛选选项
  const fetchFilters = useCallback(async () => {
    // 避免重复获取或在 apiKey 无效时不获取
    if (!apiKey) return
    try {
      const response = await fetch(`/api/filters?apiKey=${encodeURIComponent(apiKey)}`)
      if (response.ok) {
        const data = await response.json()
        // 排序以获得更好的用户体验
        setAvailableModels((data.models || []).sort())
        setAvailableProviders((data.providers || []).sort())
      } else {
        console.error("Failed to fetch filters:", response.statusText)
        toast({ title: "错误", description: `获取筛选选项失败: ${response.statusText}`, variant: "destructive"})
      }
    } catch (error) {
      console.error("Failed to fetch filters:", error)
      toast({ title: "错误", description: "获取筛选选项时发生网络错误", variant: "destructive"})
    }
  }, [apiKey, toast])

  // 获取日志数据
   const fetchLogs = useCallback(async (pageNum: number, reset = false) => {
      if (!apiKey) {
          setLoading(false);
          setLoadingMore(false);
          setLogs([]); // 如果没有 apiKey，清空日志
          setHasNextPage(false);
          return;
      }

      if (reset) {
          setLoading(true);
          setLogs([]); // 重置时清空现有日志
          setPage(1);   // 重置页码
          setHasNextPage(true); // 乐观地假设有下一页
      } else {
          setLoadingMore(true);
      }

      try {
          const params = new URLSearchParams({
              apiKey,
              page: pageNum.toString(),
              limit: LOGS_PER_PAGE.toString(),
          });

          if (filters.model) params.append("model", filters.model);
          if (filters.provider) params.append("provider", filters.provider);
          // **状态筛选逻辑**: 根据 filters.status 附加 'true' 或 'false'
          if (filters.status) {
              params.append("status", filters.status === 'success' ? 'true' : 'false');
          }
          // 如果 filters.status 为 undefined (即选择了 "全部状态")，则不附加 status 参数，后端应返回所有状态的日志

          const response = await fetch(`/api/logs?${params}`);
          if (response.ok) {
              const data = await response.json();
              const newLogs = data.logs || [];
              setLogs((prev) => (reset ? newLogs : [...prev, ...newLogs]));
              setHasNextPage(newLogs.length === LOGS_PER_PAGE); // 判断是否还有下一页
              if (!reset) {
                 setPage(pageNum); // 只有在加载更多时更新页码
              }
          } else {
             console.error("获取日志失败:", response.status, response.statusText)
             toast({ title: "错误", description: `获取日志失败: ${response.statusText}`, variant: "destructive"})
             setHasNextPage(false); // 获取失败则认为没有下一页
          }
      } catch (error) {
          console.error("获取日志时发生错误:", error);
          toast({ title: "错误", description: "获取日志时发生网络错误", variant: "destructive"})
          setHasNextPage(false); // 出错则认为没有下一页
      } finally {
          setLoading(false);
          setLoadingMore(false);
      }
   // 依赖项包括 apiKey, filters, 和 toast。 当 filters 改变时会触发重新获取
   }, [apiKey, filters, toast]);

  // 初始加载筛选器和第一页日志
  useEffect(() => {
    // 只有在 apiKey 有效时才获取
    if (apiKey) {
        fetchFilters()
        fetchLogs(1, true) // 初始加载第一页并重置
    } else {
        // 如果 apiKey 无效或为空，则清空状态
        setLogs([]);
        setAvailableModels([]);
        setAvailableProviders([]);
        setLoading(false);
        setHasNextPage(false);
    }
    // 当 apiKey 或 filters 改变时重新加载
  }, [apiKey, filters, fetchFilters, fetchLogs])

  const loadMore = () => {
    if (hasNextPage && !loading && !loadingMore) {
      fetchLogs(page + 1)
    }
  }

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds === null) return "-";
    return seconds.toFixed(2) + "s"
  }

  const formatNumber = (num: number) => {
     if (isNaN(num) || num === null) return "-";
     if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
     if (num >= 1000) return (num / 1000).toFixed(1) + "K";
     return num.toString();
  }

  const formatTimestamp = (timestamp: string) => {
    try {
        // 尝试更稳健地格式化，并指定时区（如果需要）
       return new Date(timestamp).toLocaleString("zh-CN", {
         year: 'numeric', month: '2-digit', day: '2-digit',
         hour: '2-digit', minute: '2-digit', second: '2-digit',
         hour12: false // 使用 24 小时制
       });
    } catch (e) {
        console.warn("无效的时间戳格式:", timestamp);
        return "无效日期";
    }
  }

  // 修改：只返回图标，并使用 Tooltip 提供文字提示
  const getStatusIcon = (success: boolean) => {
    const iconSize = "w-4 h-4"; // 统一图标大小
    const tooltipText = success ? "成功" : "失败";
    const icon = success
      ? <CheckCircle className={`${iconSize} text-green-500`} />
      : <XCircle className={`${iconSize} text-red-500`} />;

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {/* 添加一个 span 包裹图标，使其成为有效的 TooltipTrigger 子元素 */}
          <span className="inline-flex items-center justify-center">
            {icon}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    );
  };

  const handleFilterChange = (type: keyof Filters, value: string) => {
    // 类型断言确保 value 符合 Filters[status] 的类型
    const statusValue = value === "success" || value === "failed" ? value : undefined;

    setFilters((prev) => ({
      ...prev,
      [type]: value === "all" ? undefined : (type === 'status' ? statusValue : value),
    }))
    // 注意：useEffect 会因为 filters 的变化自动调用 fetchLogs(1, true)
    // 无需在此处手动调用 setPage, setLogs, setHasNextPage
  }

  const clearFilters = () => {
    setFilters({})
    // 注意：useEffect 会因为 filters 的变化自动调用 fetchLogs(1, true)
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({ description: "内容已复制到剪贴板" })
    } catch (err) {
       console.error("复制失败:", err)
       toast({ description: "复制失败，请手动复制", variant: "destructive" })
    }
  }

  // Skeleton 渲染函数 (保持不变)
  const renderSkeleton = (count = 5, isMobile = false) => {
      if (isMobile) {
          return (
              <div className="space-y-4">
                  {[...Array(count)].map((_, i) => (
                      <Card key={i} className="max-w-full">
                          <CardContent className="p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                  <Skeleton className="h-4 w-28" />
                                  <Skeleton className="h-5 w-5" /> {/* Skeleton for icon */}
                              </div>
                              <Separator />
                              <div className="space-y-2 text-sm">
                                  <div className="flex justify-between items-center">
                                      <Skeleton className="h-4 w-2/5" />
                                      <Skeleton className="h-4 w-2/5" />
                                  </div>
                                  <div className="flex justify-between items-center">
                                      <Skeleton className="h-4 w-1/3" />
                                      <Skeleton className="h-4 w-1/3" />
                                  </div>
                              </div>
                              <Separator />
                              <Skeleton className="h-9 w-full" />
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
                          <TableCell className="text-center"><Skeleton className="h-5 w-5 mx-auto" /></TableCell> {/* Centered Skeleton for icon */}
                          <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                          <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                          <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                          <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                          <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                      </TableRow>
                  ))}
              </TableBody>
          );
      }
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Filters Section */}
        <div className="space-y-4">
           <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <h2 className="text-xl font-semibold tracking-tight">详细日志</h2>
              {/* Desktop Filters */}
              <div className="hidden md:flex items-center space-x-2 flex-wrap">
                   <Select
                      value={filters.model || "all"}
                      onValueChange={(value) => handleFilterChange("model", value)}
                      disabled={loading || loadingMore} // 禁用筛选器当加载时
                    >
                      <SelectTrigger className="w-[160px] h-9 text-xs">
                        <SelectValue placeholder="选择模型" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部模型</SelectItem>
                        {availableModels.map((model) => (
                          <SelectItem key={model} value={model} className="text-xs">
                            {model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                       value={filters.provider || "all"}
                       onValueChange={(value) => handleFilterChange("provider", value)}
                       disabled={loading || loadingMore} // 禁用筛选器当加载时
                    >
                      <SelectTrigger className="w-[160px] h-9 text-xs">
                        <SelectValue placeholder="选择渠道" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部渠道</SelectItem>
                        {availableProviders.map((provider) => (
                          <SelectItem key={provider} value={provider} className="text-xs">
                            {provider}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                       value={filters.status || "all"}
                       onValueChange={(value) => handleFilterChange("status", value)}
                       disabled={loading || loadingMore} // 禁用筛选器当加载时
                     >
                      <SelectTrigger className="w-[120px] h-9 text-xs">
                        <SelectValue placeholder="选择状态" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部状态</SelectItem>
                        <SelectItem value="success">成功</SelectItem>
                        <SelectItem value="failed">失败</SelectItem>
                      </SelectContent>
                    </Select>
                    {(filters.model || filters.provider || filters.status) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        className="h-9 text-xs text-muted-foreground"
                        disabled={loading || loadingMore} // 禁用清除按钮当加载时
                      >
                        <X className="w-3 h-3 mr-1" />
                        清除筛选
                      </Button>
                    )}
              </div>
           </div>

           {/* Mobile Filters */}
           <div className="md:hidden space-y-2">
              <div className="grid grid-cols-2 gap-2">
                    <Select
                      value={filters.model || "all"}
                      onValueChange={(value) => handleFilterChange("model", value)}
                      disabled={loading || loadingMore}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="选择模型" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部模型</SelectItem>
                        {availableModels.map((model) => (
                          <SelectItem key={model} value={model} className="text-xs">
                            {model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                       value={filters.provider || "all"}
                       onValueChange={(value) => handleFilterChange("provider", value)}
                       disabled={loading || loadingMore}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="选择渠道" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部渠道</SelectItem>
                        {availableProviders.map((provider) => (
                          <SelectItem key={provider} value={provider} className="text-xs">
                            {provider}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
              </div>
              <div className="flex space-x-2">
                  <Select
                       value={filters.status || "all"}
                       onValueChange={(value) => handleFilterChange("status", value)}
                       disabled={loading || loadingMore}
                     >
                      <SelectTrigger className="flex-1 h-9 text-xs">
                        <SelectValue placeholder="选择状态" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部状态</SelectItem>
                        <SelectItem value="success">成功</SelectItem>
                        <SelectItem value="failed">失败</SelectItem>
                      </SelectContent>
                    </Select>
                    {(filters.model || filters.provider || filters.status) && (
                       <Button
                         variant="ghost"
                         size="icon"
                         onClick={clearFilters}
                         className="h-9 w-9"
                         disabled={loading || loadingMore}
                       >
                         <X className="w-4 h-4 text-muted-foreground" />
                       </Button>
                    )}
              </div>
           </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">时间</TableHead>
                    <TableHead className="w-[80px] text-center">状态</TableHead> {/*居中显示图标*/}
                    <TableHead>模型</TableHead>
                    <TableHead>渠道</TableHead>
                    <TableHead className="w-[100px] text-right">处理耗时</TableHead>
                    <TableHead className="w-[100px] text-right">首字响应</TableHead>
                    <TableHead className="w-[220px] text-right">Tokens (提示/完成/总计)</TableHead>
                    <TableHead className="w-[80px] text-center">内容</TableHead>
                  </TableRow>
                </TableHeader>
                 {loading ? renderSkeleton(LOGS_PER_PAGE, false) : (
                     <TableBody>
                        {logs.map((log, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-mono text-xs">{formatTimestamp(log.timestamp)}</TableCell>
                            {/* 修改：调用 getStatusIcon 并居中 */}
                            <TableCell className="text-center">{getStatusIcon(log.success)}</TableCell>
                            <TableCell>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                   {/* 增加最大宽度防止过长模型名破坏布局 */}
                                   <div className="max-w-[200px] truncate" >{log.model}</div>
                                </TooltipTrigger>
                                <TooltipContent><p>{log.model}</p></TooltipContent>
                              </Tooltip>
                            </TableCell>
                             <TableCell>
                               <Tooltip>
                                 <TooltipTrigger asChild>
                                    <div className="max-w-[150px] truncate" >{log.provider}</div>
                                 </TooltipTrigger>
                                 <TooltipContent><p>{log.provider}</p></TooltipContent>
                               </Tooltip>
                             </TableCell>
                            <TableCell className="text-right font-mono text-xs">{formatTime(log.processTime)}</TableCell>
                            <TableCell className="text-right font-mono text-xs">{formatTime(log.firstResponseTime)}</TableCell>
                            <TableCell className="text-right font-mono text-xs">
                               <Tooltip>
                                  <TooltipTrigger asChild>
                                      <span>
                                         {formatNumber(log.promptTokens)} / {formatNumber(log.completionTokens)} / {formatNumber(log.totalTokens)}
                                      </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                      <p>提示 Tokens: {log.promptTokens}</p>
                                      <p>完成 Tokens: {log.completionTokens}</p>
                                      <p>总计 Tokens: {log.totalTokens}</p>
                                  </TooltipContent>
                               </Tooltip>
                            </TableCell>
                            <TableCell className="text-center">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 text-xs">
                                    <Eye className="w-3 h-3" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-96 max-h-[50vh] overflow-y-auto text-sm">
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between mb-2">
                                      <h4 className="font-medium">完整内容</h4>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={() => copyToClipboard(log.text)}
                                              className="h-6 w-6"
                                            >
                                              <Copy className="h-3 w-3" />
                                            </Button>
                                    </div>
                                    <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:bg-muted prose-code:text-muted-foreground prose-code:before:content-none prose-code:after:content-none">
                                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{log.text || "无内容"}</ReactMarkdown>
                                    </div>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                 )}
              </Table>
              {!loading && logs.length === 0 && (
                   <div className="text-center py-10 text-muted-foreground">
                       暂无符合条件的日志数据
                   </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden space-y-4">
           {loading ? renderSkeleton(5, true) : logs.length === 0 ? (
               <Card>
                   <CardContent className="p-6 text-center text-muted-foreground">
                       暂无符合条件的日志数据
                   </CardContent>
               </Card>
           ) : (
              logs.map((log, index) => (
                <Card key={index} className="max-w-full">
                  <CardContent className="p-4 space-y-3">
                    {/* Top: Timestamp & Status */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-muted-foreground">{formatTimestamp(log.timestamp)}</span>
                      {/* 修改：调用 getStatusIcon */}
                      {getStatusIcon(log.success)}
                    </div>
                    <Separator />
                    {/* Middle: Model/Provider & Metrics */}
                    <div className="space-y-2 text-sm">
                       <div className="flex justify-between items-center">
                           <span className="text-muted-foreground text-xs">模型:</span>
                           <Tooltip>
                              <TooltipTrigger asChild>
                                  <span className="font-medium truncate max-w-[60%]">{log.model}</span>
                              </TooltipTrigger>
                              <TooltipContent><p>{log.model}</p></TooltipContent>
                           </Tooltip>
                       </div>
                       <div className="flex justify-between items-center">
                           <span className="text-muted-foreground text-xs">渠道:</span>
                           <Tooltip>
                              <TooltipTrigger asChild>
                                  <span className="font-medium truncate max-w-[60%]">{log.provider}</span>
                              </TooltipTrigger>
                              <TooltipContent><p>{log.provider}</p></TooltipContent>
                           </Tooltip>
                       </div>
                       <Separator className="my-2"/>
                       <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">处理耗时:</span>
                              <span className="font-mono">{formatTime(log.processTime)}</span>
                            </div>
                            <div className="flex justify-between">
                               <span className="text-muted-foreground">首字响应:</span>
                               <span className="font-mono">{formatTime(log.firstResponseTime)}</span>
                             </div>
                             <div className="flex justify-between col-span-2">
                                <span className="text-muted-foreground">Tokens (P/C/T):</span> {/* 简化标签 */}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                      <span className="font-mono">
                                         {formatNumber(log.promptTokens)} / {formatNumber(log.completionTokens)} / {formatNumber(log.totalTokens)}
                                      </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                      <p>提示: {log.promptTokens}, 完成: {log.completionTokens}, 总计: {log.totalTokens}</p>
                                  </TooltipContent>
                                </Tooltip>
                             </div>
                       </div>
                    </div>
                    <Separator />
                    {/* Bottom: View Content Button */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full text-xs h-9">
                          <Eye className="w-4 h-4 mr-2" />
                          查看完整内容
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[85vw] max-w-[400px] max-h-[60vh] overflow-y-auto text-sm">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">完整内容</h4>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => copyToClipboard(log.text)}
                                    className="h-6 w-6"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                          </div>
                          <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:bg-muted prose-code:text-muted-foreground prose-code:before:content-none prose-code:after:content-none">
                             <ReactMarkdown remarkPlugins={[remarkGfm]}>{log.text || "无内容"}</ReactMarkdown>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </CardContent>
                </Card>
              ))
            )}
        </div>

        {/* Load More Section */}
        {!loading && logs.length > 0 && hasNextPage && ( // 只有在非加载状态、有日志且有下一页时显示
          <div className="text-center pt-4">
            <Button onClick={loadMore} disabled={loadingMore} variant="outline" size="sm">
              {loadingMore ? (
                 <>
                   <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                   加载中...
                 </>
              ) : (
                "加载更多日志"
              )}
            </Button>
          </div>
        )}
        {/* 提示：如果状态筛选仍然不起作用，请检查后端 API (/api/logs) 对 `status` 查询参数 (true/false) 的处理逻辑。 */}
      </div>
    </TooltipProvider>
  )
}

// 注意：后端 API (/api/filters) 文件未作修改，仅在此处作为上下文参考。
/*
// 文件名: api.filter.router.tsx (未修改)
import { type NextRequest, NextResponse } from "next/server"
import sqlite3 from "sqlite3"
import { promisify } from "util"

export async function GET(request: NextRequest) {
  // ... (省略未修改的代码) ...
}
*/