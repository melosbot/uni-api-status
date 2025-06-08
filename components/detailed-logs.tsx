// 文件名: src/components/detailed-logs.tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Eye, Filter, Copy, Loader2, X, XCircle, CheckCircle } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { useToast } from "@/hooks/use-toast"
// Import helper functions from utils.ts
import { formatTime, formatNumberCompact } from "@/lib/utils"

// --- Interfaces ---

interface DetailedLogsProps {
  apiKey: string
}

interface LogEntry {
  timestamp: string // Keep as string from API
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
  status?: "success" | "failed"
}

// --- Constants ---

const LOGS_PER_PAGE = 30

// --- Component ---

export function DetailedLogs({ apiKey }: DetailedLogsProps) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasNextPage, setHasNextPage] = useState(true)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<Filters>({})
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [availableProviders, setAvailableProviders] = useState<string[]>([])
  const { toast } = useToast()

  // --- Data Fetching ---

  // Fetch filter options
  const fetchFilters = useCallback(async () => {
    if (!apiKey) return
    try {
      const response = await fetch(`/api/filters?apiKey=${encodeURIComponent(apiKey)}`)
      if (response.ok) {
        const data = await response.json()
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

  // Fetch logs
  const fetchLogs = useCallback(async (pageNum: number, reset = false) => {
    if (!apiKey) {
      setLoading(false);
      setLoadingMore(false);
      setLogs([]);
      setHasNextPage(false);
      return;
    }

    if (reset) {
      setLoading(true);
      setLogs([]);
      setPage(1);
      setHasNextPage(true); // Optimistic assumption
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
      if (filters.status) {
        params.append("status", filters.status === 'success' ? 'true' : 'false');
      }

      const response = await fetch(`/api/logs?${params.toString()}`); // Use toString() for params
      if (response.ok) {
        const data = await response.json();
        const newLogs = data.logs || [];
        setLogs((prev) => (reset ? newLogs : [...prev, ...newLogs]));
        setHasNextPage(newLogs.length === LOGS_PER_PAGE);
        if (!reset) {
          setPage(pageNum); // Update page number only when loading more
        }
      } else {
        console.error("获取日志失败:", response.status, response.statusText)
        toast({ title: "错误", description: `获取日志失败: ${response.statusText}`, variant: "destructive"})
        setHasNextPage(false);
      }
    } catch (error) {
      console.error("获取日志时发生错误:", error);
      toast({ title: "错误", description: "获取日志时发生网络错误", variant: "destructive"})
      setHasNextPage(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [apiKey, filters, toast]); // Dependencies

  // --- Effects ---

  // Initial load and re-fetch on apiKey/filters change
  useEffect(() => {
    if (apiKey) {
      fetchFilters()
      fetchLogs(1, true) // Initial load, reset=true
    } else {
      // Clear state if apiKey is invalid/empty
      setLogs([]);
      setAvailableModels([]);
      setAvailableProviders([]);
      setLoading(false);
      setHasNextPage(false);
    }
    // Dependencies: apiKey, filters (fetchLogs and fetchFilters are stable)
  }, [apiKey, filters, fetchFilters, fetchLogs])

  // --- Helper Functions ---

  /**
   * Formats a timestamp string into GMT+8 (Asia/Shanghai) locale string.
   * @param timestamp ISO 8601 string or compatible date string.
   * @returns Formatted date/time string in GMT+8, or "无效日期".
   */
  const formatTimestampGMT8 = (timestamp: string): string => {
    if (!timestamp) return "无效日期";
    try {
      const date = new Date(timestamp);
      // Check if the date is valid after parsing
      if (isNaN(date.getTime())) {
          console.warn("无效的时间戳格式:", timestamp);
          return "无效日期";
      }
       return date.toLocaleString("zh-CN", {
         year: 'numeric', month: '2-digit', day: '2-digit',
         hour: '2-digit', minute: '2-digit', second: '2-digit',
         hour12: false, // Use 24-hour format
         timeZone: 'Asia/Shanghai' // Specify GMT+8 timezone
       });
    } catch (e) {
        console.warn("格式化时间戳时出错:", timestamp, e);
        return "无效日期";
    }
  }

  // Get status icon with tooltip
  const getStatusIcon = (success: boolean) => {
    const iconSize = "w-4 h-4";
    const tooltipText = success ? "成功" : "失败";
    const icon = success
      ? <CheckCircle className={`${iconSize} text-green-500`} />
      : <XCircle className={`${iconSize} text-red-500`} />;

    return (
      <Tooltip>
        <TooltipTrigger asChild>
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

  // Copy text to clipboard
  const copyToClipboard = async (text: string) => {
    if (!text) return; // Don't copy empty text
    try {
      await navigator.clipboard.writeText(text)
      toast({ description: "内容已复制到剪贴板" })
    } catch (err) {
      console.error("复制失败:", err)
      toast({ description: "复制失败，请手动复制", variant: "destructive" })
    }
  }

  // --- Event Handlers ---

  const loadMore = () => {
    if (hasNextPage && !loading && !loadingMore) {
      fetchLogs(page + 1)
    }
  }

  const handleFilterChange = (type: keyof Filters, value: string) => {
    const statusValue = value === "success" || value === "failed" ? value : undefined;
    setFilters((prev) => ({
      ...prev,
      [type]: value === "all" ? undefined : (type === 'status' ? statusValue : value),
    }));
    // Resetting page/logs is handled by the useEffect hook watching 'filters'
  }

  const clearFilters = () => {
    setFilters({})
    // Resetting page/logs is handled by the useEffect hook watching 'filters'
  }

  // --- Skeleton Rendering ---
  const renderSkeleton = (count = 5, isMobile = false) => {
      if (isMobile) {
          return (
              <div className="space-y-4">
                  {[...Array(count)].map((_, i) => (
                      <Card key={i} className="max-w-full">
                          <CardContent className="p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                  <Skeleton className="h-4 w-28" />
                                  <Skeleton className="h-5 w-5 rounded-full" /> {/* Icon Skeleton */}
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
                              <Skeleton className="h-9 w-full" /> {/* Button Skeleton */}
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
                          <TableCell className="text-center"><Skeleton className="h-5 w-5 mx-auto rounded-full" /></TableCell> {/* Icon Skeleton */}
                          <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                          <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                          <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                          <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                          <TableCell className="text-center"><Skeleton className="h-8 w-8 mx-auto" /></TableCell> {/* Button Skeleton */}
                      </TableRow>
                  ))}
              </TableBody>
          );
      }
  };

  // --- Render ---

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
                disabled={loading || loadingMore}
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
                disabled={loading || loadingMore}
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
                disabled={loading || loadingMore}
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
                  disabled={loading || loadingMore}
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
                    <TableHead className="w-[180px]">时间 (GMT+8)</TableHead>
                    <TableHead className="w-[80px] text-center">状态</TableHead>
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
                        <TableCell className="font-mono text-xs">{formatTimestampGMT8(log.timestamp)}</TableCell>
                        <TableCell className="text-center">{getStatusIcon(log.success)}</TableCell>
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="max-w-[200px] truncate">{log.model}</div>
                            </TooltipTrigger>
                            <TooltipContent><p>{log.model}</p></TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="max-w-[150px] truncate">{log.provider}</div>
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
                                {formatNumberCompact(log.promptTokens)} / {formatNumberCompact(log.completionTokens)} / {formatNumberCompact(log.totalTokens)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>提示 Tokens: {log.promptTokens.toLocaleString()}</p>
                              <p>完成 Tokens: {log.completionTokens.toLocaleString()}</p>
                              <p>总计 Tokens: {log.totalTokens.toLocaleString()}</p>
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
                                    disabled={!log.text}
                                    title="复制内容"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                                <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:bg-muted prose-code:text-muted-foreground prose-code:before:content-none prose-code:after:content-none">
                                  {/* Ensure ReactMarkdown handles potential null/undefined */}
                                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{log.text || "*无内容*"}</ReactMarkdown>
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
                    <span className="text-xs font-mono text-muted-foreground">{formatTimestampGMT8(log.timestamp)}</span>
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
                        <span className="text-muted-foreground">Tokens (提示/完成/总计):</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="font-mono">
                              {formatNumberCompact(log.promptTokens)} / {formatNumberCompact(log.completionTokens)} / {formatNumberCompact(log.totalTokens)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>提示: {log.promptTokens.toLocaleString()}, 完成: {log.completionTokens.toLocaleString()}, 总计: {log.totalTokens.toLocaleString()}</p>
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
                            disabled={!log.text}
                            title="复制内容"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                         <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:bg-muted prose-code:text-muted-foreground prose-code:before:content-none prose-code:after:content-none">
                           <ReactMarkdown remarkPlugins={[remarkGfm]}>{log.text || "*无内容*"}</ReactMarkdown>
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
        {!loading && logs.length > 0 && hasNextPage && (
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
      </div>
    </TooltipProvider>
  )
}