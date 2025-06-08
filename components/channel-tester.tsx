// 文件名: channel-tester.tsx
// 备注：这是一个完整的替换文件内容。请直接用以下内容覆盖 channel-tester.tsx 文件。

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton" // 引入 Skeleton
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip" // 引入 Tooltip
import { CheckCircle, XCircle, Clock, Play, PlayCircle, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ChannelTesterProps {
  apiKey: string
}

interface ModelConfig {
  original: string
  display: string
}

interface Provider {
  provider: string
  base_url: string
  api: string | string[]
  models: ModelConfig[]
  supported: boolean
}

interface TestResult {
  provider: string
  model: string
  status: "idle" | "testing" | "success" | "error"
  message?: string
  responseTime?: number
}

export function ChannelTester({ apiKey }: ChannelTesterProps) {
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [testResults, setTestResults] = useState<Map<string, TestResult>>(new Map())
  const [testing, setTesting] = useState(false)
  const [selectedModels, setSelectedModels] = useState<Map<string, string>>(new Map())
  const { toast } = useToast()

  useEffect(() => {
    loadProviders()
  }, [apiKey])

  const loadProviders = async () => {
    setLoading(true) // 开始加载时设置 loading
    try {
      const response = await fetch(`/api/providers/list?apiKey=${encodeURIComponent(apiKey)}`)
      if (response.ok) {
        const data = await response.json()
        const loadedProviders = data.providers || []
        setProviders(loadedProviders)

        const initialSelections = new Map<string, string>()
        loadedProviders.forEach((provider: Provider) => {
          if (provider.models.length > 0) {
            // 默认选择第一个模型
            initialSelections.set(provider.provider, provider.models[0].display)
          }
        })
        setSelectedModels(initialSelections)
      } else {
        toast({
          title: "错误",
          description: "加载渠道配置失败",
          variant: "destructive",
        })
        setProviders([]) // 加载失败清空
      }
    } catch (error) {
      console.error("加载渠道配置时发生错误:", error)
      toast({
        title: "错误",
        description: "加载渠道配置时发生网络或解析错误",
        variant: "destructive",
      })
      setProviders([]) // 加载失败清空
    } finally {
      setLoading(false)
    }
  }

  const testChannel = async (provider: Provider, modelDisplay: string) => {
    const testKey = `${provider.provider}-${modelDisplay}`

    setTestResults(
      (prev) =>
        new Map(
          prev.set(testKey, {
            provider: provider.provider,
            model: modelDisplay,
            status: "testing",
          }),
        ),
    )

    try {
      const selectedModel = provider.models.find((m) => m.display === modelDisplay)
      if (!selectedModel) {
        // 在函数开始时就处理，避免后续错误
        throw new Error(`模型 "${modelDisplay}" 在渠道 "${provider.provider}" 中未找到配置。`)
      }

      const response = await fetch("/api/providers/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiKey,
          provider: provider.provider,
          base_url: provider.base_url,
          api: Array.isArray(provider.api) ? provider.api[0] : provider.api, // 默认使用第一个 API Key 测试
          model: selectedModel.original,
        }),
      })

      const result = await response.json()

      setTestResults(
        (prev) =>
          new Map(
            prev.set(testKey, {
              provider: provider.provider,
              model: modelDisplay,
              status: result.success ? "success" : "error",
              message: result.message || (result.success ? "测试成功" : "测试失败，无详细信息"),
              responseTime: result.responseTime,
            }),
          ),
      )
    } catch (error: any) {
      console.error(`测试渠道 ${provider.provider} 模型 ${modelDisplay} 失败:`, error)
      setTestResults(
        (prev) =>
          new Map(
            prev.set(testKey, {
              provider: provider.provider,
              model: modelDisplay,
              status: "error",
              message: error.message || "测试请求失败，请检查网络或服务配置",
            }),
          ),
      )
    }
  }

  const testAllChannels = async () => {
    setTesting(true)
    const supportedProviders = providers.filter((p) => p.supported)

    // 清空之前的测试结果
    const initialResults = new Map<string, TestResult>()
    supportedProviders.forEach((provider) => {
      const modelDisplay = selectedModels.get(provider.provider) || provider.models[0]?.display
      if (modelDisplay) {
        const testKey = `${provider.provider}-${modelDisplay}`
        initialResults.set(testKey, {
          provider: provider.provider,
          model: modelDisplay,
          status: "idle", // 重置为 idle
        })
      }
    })
    setTestResults(initialResults)

    // 使用 Promise.allSettled 来确保所有测试都完成，即使部分失败
    const testPromises = supportedProviders.map((provider) => {
      const modelDisplay = selectedModels.get(provider.provider) || provider.models[0]?.display
      if (modelDisplay) {
        return testChannel(provider, modelDisplay)
      }
      return Promise.resolve() // 对于没有可选模型的 Provider 返回 resolve
    })

    await Promise.allSettled(testPromises)
    setTesting(false)

    toast({
      title: "测试完成",
      description: "所有支持的渠道测试已执行完毕",
    })
  }

  const getStatusBadge = (status: TestResult["status"]) => {
    switch (status) {
      case "testing":
        return <Badge variant="secondary">测试中...</Badge>
      case "success":
        return (
          <Badge variant="default" className="bg-green-100 text-green-700 border border-green-200 hover:bg-green-200">
            成功
          </Badge>
        )
      case "error":
        return (
          <Badge variant="destructive" className="bg-red-100 text-red-700 border border-red-200 hover:bg-red-200">
            失败
          </Badge>
        )
      default:
        return <Badge variant="outline">待测</Badge>
    }
  }

  const handleModelChange = (providerName: string, modelDisplay: string) => {
    setSelectedModels((prev) => new Map(prev.set(providerName, modelDisplay)))
    // 模型改变后，清除该模型的测试结果
    const testKey = `${providerName}-${modelDisplay}`
    setTestResults((prev) => {
        const newResults = new Map(prev);
        // 遍历所有与此 provider 相关的 key 并重置状态（如果需要更精确，只重置改变前后的key）
        prev.forEach((value, key) => {
            if(key.startsWith(providerName + '-')) {
                newResults.set(key, { ...value, status: 'idle', message: undefined, responseTime: undefined });
            }
        });
        // 确保当前选择的模型被重置
        newResults.set(testKey, { provider: providerName, model: modelDisplay, status: 'idle' });
        return newResults;
    });
  }

  // 加载状态的骨架屏渲染
  const renderSkeleton = (count = 3) => (
    <div className="space-y-4">
      {[...Array(count)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-3/5" />
              <Skeleton className="h-5 w-8 rounded-full" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                 <Skeleton className="h-4 w-16" />
                 <Skeleton className="h-8 w-full" />
              </div>
               <div className="flex items-center space-x-2">
                 <Skeleton className="h-3 w-20" />
                 <Skeleton className="h-3 w-4/5" />
               </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-12 rounded-md" />
              <Skeleton className="h-5 w-10" />
            </div>
             <Skeleton className="h-4 w-full" />
             <Skeleton className="h-9 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  )

  return (
    <TooltipProvider>
      <div className="space-y-6"> {/* 增加外层间距 */}
        <div className="flex flex-row items-center justify-between gap-4"> {/* 响应式布局 */}
          <h2 className="text-xl font-semibold tracking-tight">渠道测试</h2>
          <div className="flex items-center space-x-2">
            <Button onClick={testAllChannels} disabled={testing || loading || providers.length === 0} size="sm"> {/* 调整按钮大小 */}
              <PlayCircle className={`w-4 h-4 mr-2 ${testing ? 'animate-spin' : ''}`} />
              {testing ? "测试中..." : "测试全部"}
            </Button>
          </div>
        </div>

        {loading ? (
           <>
             {/* 桌面骨架屏 */}
            <div className="hidden lg:block">
              <Card>
                <CardContent className="p-0">
                   <Table>
                     <TableHeader>
                       <TableRow>
                         {/* 更新骨架屏列数以匹配表格 */}
                         {[...Array(8)].map((_, i) => (
                           <TableHead key={i}><Skeleton className="h-5 w-full" /></TableHead>
                         ))}
                       </TableRow>
                     </TableHeader>
                      <TableBody>
                        {[...Array(3)].map((_, i) => (
                           <TableRow key={i}>
                             {/* 更新骨架屏列数以匹配表格 */}
                             {[...Array(8)].map((_, j) => (
                                <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                             ))}
                           </TableRow>
                        ))}
                      </TableBody>
                   </Table>
                </CardContent>
              </Card>
            </div>
            {/* 移动端骨架屏 */}
            <div className="lg:hidden">{renderSkeleton()}</div>
           </>
        ) : providers.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              未找到任何渠道配置，请先在配置管理中添加。
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Desktop Table - 优化样式和布局 */}
            <div className="hidden lg:block">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>渠道名称</TableHead>
                        <TableHead>原始模型名称</TableHead>
                        <TableHead>选择测试模型</TableHead>
                        <TableHead className="text-center">支持</TableHead>
                        <TableHead>状态</TableHead>
                        {/* 新增消息列标题 */}
                        <TableHead>消息</TableHead>
                        <TableHead className="text-right">响应 (s)</TableHead>
                        <TableHead className="text-center">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {providers.map((provider, index) => {
                        const selectedModelDisplay = selectedModels.get(provider.provider) || provider.models[0]?.display || 'N/A';
                        const modelConfig = provider.models.find((m) => m.display === selectedModelDisplay);
                        const testKey = `${provider.provider}-${selectedModelDisplay}`;
                        const result = testResults.get(testKey);
                        const isTestingThis = result?.status === "testing";

                        return (
                          <TableRow key={index} className={!provider.supported ? "opacity-50" : ""}>
                            <TableCell className="font-medium">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="truncate max-w-[150px]">{provider.provider}</div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{provider.provider}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                               <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="truncate max-w-[150px]">
                                    {modelConfig?.original || (provider.models.length > 0 ? "未选择" : "-")}
                                   </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{modelConfig?.original || (provider.models.length > 0 ? "未选择" : "无可用模型")}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                            <TableCell>
                              {provider.models.length > 1 ? (
                                <Select
                                  value={selectedModelDisplay}
                                  onValueChange={(value) => handleModelChange(provider.provider, value)}
                                  disabled={!provider.supported || testing}
                                >
                                  <SelectTrigger className="w-full h-8 text-xs max-w-[180px]"> {/* 调整 Select 样式和最大宽度 */}
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {provider.models.map((model, modelIndex) => (
                                      <SelectItem key={modelIndex} value={model.display} className="text-xs">
                                        {model.display}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <span className="text-sm text-muted-foreground">
                                  {selectedModelDisplay !== 'N/A' ? selectedModelDisplay : (provider.models.length > 0 ? '默认模型' : '无模型')}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {provider.supported ? (
                                <Tooltip>
                                  <TooltipTrigger>
                                     <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                                  </TooltipTrigger>
                                  <TooltipContent><p>支持</p></TooltipContent>
                                </Tooltip>
                              ) : (
                                 <Tooltip>
                                  <TooltipTrigger>
                                     <AlertCircle className="w-4 h-4 text-muted-foreground mx-auto" />
                                  </TooltipTrigger>
                                  <TooltipContent><p>非标准端点，暂不支持</p></TooltipContent>
                                </Tooltip>
                              )}
                            </TableCell>
                            <TableCell>
                               {/* 移除原状态单元格内的消息显示逻辑 */}
                               <div className="flex items-center">
                                 {getStatusBadge(result?.status || "idle")}
                               </div>
                            </TableCell>
                            {/* 新增消息单元格 */}
                            <TableCell>
                              {result?.message ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    {/* 增加文字样式和截断 */}
                                    <div className="truncate max-w-[200px] text-xs text-muted-foreground cursor-default">
                                      {result.message}
                                    </div>
                                  </TooltipTrigger>
                                  {/* 调整 Tooltip 内容宽度和换行 */}
                                  <TooltipContent className="max-w-md break-words">
                                    <p>{result.message}</p>
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                /* 如果没有消息，显示占位符 */
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {/* 在响应时间后添加 "s" 单位 */}
                              {result?.responseTime !== undefined ? `${result.responseTime.toFixed(2)}s` : "-"}
                            </TableCell>
                            <TableCell className="text-center">
                                   <Button
                                    size="icon" // 使用图标按钮
                                    variant="ghost" // 使用 ghost 变体
                                    className="h-7 w-7" // 调整大小
                                    onClick={() => provider.supported && modelConfig && testChannel(provider, selectedModelDisplay)}
                                    disabled={!provider.supported || !modelConfig || isTestingThis || testing}
                                  >
                                    {isTestingThis ? <Clock className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                                  </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* Mobile Cards - 保持不变 */}
            <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
              {providers.map((provider, index) => {
                 const selectedModelDisplay = selectedModels.get(provider.provider) || provider.models[0]?.display || 'N/A';
                 const modelConfig = provider.models.find((m) => m.display === selectedModelDisplay);
                 const testKey = `${provider.provider}-${selectedModelDisplay}`;
                 const result = testResults.get(testKey);
                 const isTestingThis = result?.status === "testing";

                return (
                  <Card key={index} className={`max-w-full ${!provider.supported ? "opacity-60" : ""}`}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4"> {/* 调整内边距 */}
                      <CardTitle className="text-sm font-medium truncate" title={provider.provider}>
                        {provider.provider}
                      </CardTitle>
                       {provider.supported ? (
                         <Tooltip>
                           <TooltipTrigger>
                              <CheckCircle className="w-4 h-4 text-green-500" />
                           </TooltipTrigger>
                           <TooltipContent><p>支持</p></TooltipContent>
                         </Tooltip>
                       ) : (
                         <Tooltip>
                           <TooltipTrigger>
                              <AlertCircle className="w-4 h-4 text-muted-foreground" />
                           </TooltipTrigger>
                           <TooltipContent><p>非标准端点，暂不支持</p></TooltipContent>
                         </Tooltip>
                       )}
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-3"> {/* 调整内边距 */}
                      <div className="space-y-2">
                         {/* 模型选择或显示 */}
                          {provider.models.length > 1 ? (
                            <div>
                               <label className="text-xs text-muted-foreground mb-1 block">选择模型</label>
                               <Select
                                value={selectedModelDisplay}
                                onValueChange={(value) => handleModelChange(provider.provider, value)}
                                disabled={!provider.supported || testing}
                              >
                                <SelectTrigger className="w-full h-9 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {provider.models.map((model, modelIndex) => (
                                    <SelectItem key={modelIndex} value={model.display} className="text-xs">
                                      {model.display}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ) : (
                             <div>
                                <label className="text-xs text-muted-foreground mb-1 block">模型</label>
                                <p className="text-sm font-medium truncate" title={selectedModelDisplay}>
                                   {selectedModelDisplay !== 'N/A' ? selectedModelDisplay : (provider.models.length > 0 ? '默认模型' : '无模型')}
                                </p>
                             </div>
                          )}
                          {/* 原始模型名称 */}
                          {modelConfig && (
                              <div>
                                  <label className="text-xs text-muted-foreground mb-1 block">原始名称</label>
                                  <p className="font-mono text-xs text-muted-foreground truncate" title={modelConfig.original}>
                                      {modelConfig.original}
                                  </p>
                              </div>
                          )}
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-1">
                             {getStatusBadge(result?.status || "idle")}
                          </div>
                         {result?.responseTime !== undefined && (
                            <span className="font-mono text-xs">{result.responseTime.toFixed(2)}s</span>
                          )}
                      </div>
                      {/* 移动端错误消息显示逻辑保持不变 */}
                      {result?.message && result.status === 'error' && (
                         <Tooltip>
                             <TooltipTrigger asChild>
                                 <p className="text-xs text-red-600 break-words line-clamp-2"> {/* 最多显示两行 */}
                                     {result.message}
                                 </p>
                             </TooltipTrigger>
                             <TooltipContent className="max-w-[250px] break-words">
                                 <p>{result.message}</p>
                             </TooltipContent>
                         </Tooltip>
                       )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => provider.supported && modelConfig && testChannel(provider, selectedModelDisplay)}
                        disabled={!provider.supported || !modelConfig || isTestingThis || testing}
                        className="w-full"
                      >
                        {isTestingThis ? <Clock className="w-3 h-3 mr-1 animate-spin" /> : <Play className="w-3 h-3 mr-1" />}
                        {isTestingThis ? "测试中" : "测试"}
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </>
        )}
      </div>
    </TooltipProvider>
  )
}