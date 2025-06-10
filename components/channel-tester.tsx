// 文件名: src/components/channel-tester.tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { CheckCircle, XCircle, Clock, Play, PlayCircle, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
// Import helper function from utils.ts
import { formatTime } from "@/lib/utils"

// --- Interfaces ---

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
  model: string // Display name used for the test
  status: "idle" | "testing" | "success" | "error"
  message?: string
  responseTime?: number // In seconds
}

// --- Component ---

export function ChannelTester({ apiKey }: ChannelTesterProps) {
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [testResults, setTestResults] = useState<Map<string, TestResult>>(new Map())
  const [testingAll, setTestingAll] = useState(false) // State for "Test All" button
  const [selectedModels, setSelectedModels] = useState<Map<string, string>>(new Map()) // Map<providerName, modelDisplayName>
  const { toast } = useToast()

  // --- Data Loading ---

  const loadProviders = useCallback(async () => {
    if (!apiKey) {
        setProviders([]);
        setSelectedModels(new Map());
        setTestResults(new Map());
        setLoading(false);
        return;
    }
    setLoading(true)
    try {
      const response = await fetch(`/api/providers/list?apiKey=${encodeURIComponent(apiKey)}`)
      if (response.ok) {
        const data = await response.json()
        const loadedProviders: Provider[] = data.providers || []
        // Sort providers alphabetically by name for consistent order
        // loadedProviders.sort((a, b) => a.provider.localeCompare(b.provider));
        setProviders(loadedProviders)

        // Initialize selected models and reset test results
        const initialSelections = new Map<string, string>()
        const initialResults = new Map<string, TestResult>()
        loadedProviders.forEach((provider) => {
          if (provider.models.length > 0) {
            // Default to the first model's display name
            const defaultModelDisplay = provider.models[0].display;
            initialSelections.set(provider.provider, defaultModelDisplay);
            // Initialize result state for the default model
             const testKey = `${provider.provider}-${defaultModelDisplay}`;
             initialResults.set(testKey, {
                 provider: provider.provider,
                 model: defaultModelDisplay,
                 status: "idle",
             });
          }
        })
        setSelectedModels(initialSelections)
        setTestResults(initialResults)

      } else {
        toast({
          title: "错误",
          description: `加载渠道配置失败 (${response.status})`,
          variant: "destructive",
        })
        setProviders([])
      }
    } catch (error) {
      console.error("加载渠道配置时发生错误:", error)
      toast({
        title: "错误",
        description: "加载渠道配置时发生网络或解析错误",
        variant: "destructive",
      })
      setProviders([])
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, toast]) // Added toast to dependencies

  useEffect(() => {
    loadProviders()
  }, [loadProviders]) // Depend on the stable loadProviders function

  // --- Testing Logic ---

  const testChannel = async (provider: Provider, modelDisplay: string) => {
    const testKey = `${provider.provider}-${modelDisplay}`

    // Ensure the model configuration exists
    const selectedModel = provider.models.find((m) => m.display === modelDisplay)
    if (!selectedModel) {
      const errorMsg = `模型 "${modelDisplay}" 在渠道 "${provider.provider}" 中未找到配置。`
      console.error(errorMsg)
       setTestResults(
         (prev) =>
           new Map(
             prev.set(testKey, {
               provider: provider.provider,
               model: modelDisplay,
               status: "error",
               message: errorMsg,
             }),
           ),
       )
      return; // Exit if model config not found
    }

    // Update state to "testing"
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
      const response = await fetch("/api/providers/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiKey, // Assuming the main apiKey is used for testing auth
          provider: provider.provider,
          base_url: provider.base_url,
          // Use the first API key from the list if it's an array, or the string directly
          api: Array.isArray(provider.api) ? provider.api[0] : provider.api,
          model: selectedModel.original, // Use the original model name for the API call
        }),
      })

      const result = await response.json()

      setTestResults(
        (prev) =>
          new Map(
            prev.set(testKey, {
              provider: provider.provider,
              model: modelDisplay, // Keep using display name in results map key/value
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
    setTestingAll(true)
    const supportedProviders = providers.filter((p) => p.supported && p.models.length > 0);

    // Reset results for all testable models to 'testing' initially
    const testingResults = new Map<string, TestResult>(testResults); // Start with current results
    supportedProviders.forEach((provider) => {
      const modelDisplay = selectedModels.get(provider.provider); // Get currently selected model
      if (modelDisplay) {
          const testKey = `${provider.provider}-${modelDisplay}`;
          testingResults.set(testKey, {
             provider: provider.provider,
             model: modelDisplay,
             status: 'testing', // Set to testing
             message: undefined,
             responseTime: undefined
          });
      }
    });
    setTestResults(testingResults);

    // Execute tests in parallel
    const testPromises = supportedProviders.map((provider) => {
      const modelDisplay = selectedModels.get(provider.provider);
      if (modelDisplay) {
        return testChannel(provider, modelDisplay);
      }
      return Promise.resolve(); // No model selected/available for this provider
    });

    await Promise.allSettled(testPromises); // Wait for all tests to complete (success or failure)
    setTestingAll(false)

    toast({
      title: "测试完成",
      description: "所有支持的渠道测试已执行完毕",
    })
  }

  // --- UI Helpers ---

  const getStatusBadge = (status: TestResult["status"] | undefined) => {
    switch (status) {
      case "testing":
        // Use a subtle loading indicator within the badge if possible
        return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="w-3 h-3 animate-spin"/>测试中</Badge>
      case "success":
        return (
          <Badge variant="default" className="bg-green-100 text-green-700 border border-green-200 hover:bg-green-200 flex items-center gap-1">
            <CheckCircle className="w-3 h-3"/>成功
          </Badge>
        )
      case "error":
        return (
          <Badge variant="destructive" className="bg-red-100 text-red-700 border border-red-200 hover:bg-red-200 flex items-center gap-1">
             <XCircle className="w-3 h-3"/>失败
          </Badge>
        )
      default: // idle or undefined
        return <Badge variant="outline">待测</Badge>
    }
  }

  const handleModelChange = (providerName: string, newModelDisplay: string) => {
    // Update the selected model for the provider
    setSelectedModels((prev) => new Map(prev.set(providerName, newModelDisplay)));

    // Reset the test result specifically for the newly selected model
    const testKey = `${providerName}-${newModelDisplay}`;
    setTestResults((prev) => {
      const newResults = new Map(prev);
      newResults.set(testKey, {
          provider: providerName,
          model: newModelDisplay,
          status: 'idle', // Reset to idle
          message: undefined,
          responseTime: undefined
      });
      return newResults;
    });
  }

  // --- Skeleton Rendering ---
  const renderSkeleton = (count = 3, isMobile = false) => {
      if (isMobile) {
          return (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[...Array(count)].map((_, i) => (
                      <Card key={i}>
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
                              <Skeleton className="h-5 w-2/5" />
                              <Skeleton className="h-5 w-5 rounded-full" />
                          </CardHeader>
                          <CardContent className="px-4 pb-4 space-y-3">
                               <Skeleton className="h-4 w-1/3 mb-1 mt-1" /> {/* Label Skeleton */}
                               <Skeleton className="h-9 w-full" /> {/* Select Skeleton */}
                               <Skeleton className="h-4 w-1/3 mb-1 mt-1" /> {/* Label Skeleton */}
                               <Skeleton className="h-4 w-3/5" /> {/* Text Skeleton */}
                              <Separator />
                              <div className="flex items-center justify-between">
                                  <Skeleton className="h-5 w-16 rounded-md" /> {/* Badge Skeleton */}
                                  <Skeleton className="h-4 w-10" /> {/* Time Skeleton */}
                              </div>
                              <Skeleton className="h-9 w-full" /> {/* Button Skeleton */}
                          </CardContent>
                      </Card>
                  ))}
              </div>
          );
      } else {
          // Desktop Table Skeleton
           return (
             <Card>
               <CardContent className="p-0">
                 <Table>
                   <TableHeader>
                     <TableRow>
                       <TableHead><Skeleton className="h-5 w-24" /></TableHead>
                       <TableHead><Skeleton className="h-5 w-32" /></TableHead>
                       <TableHead><Skeleton className="h-5 w-40" /></TableHead>
                       <TableHead className="text-center"><Skeleton className="h-5 w-10 mx-auto" /></TableHead>
                       <TableHead><Skeleton className="h-5 w-16" /></TableHead>
                       <TableHead><Skeleton className="h-5 w-40" /></TableHead>
                       <TableHead className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableHead>
                       <TableHead className="text-center"><Skeleton className="h-5 w-10 mx-auto" /></TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {[...Array(count)].map((_, i) => (
                       <TableRow key={i}>
                         <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                         <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                         <TableCell><Skeleton className="h-8 w-full" /></TableCell> {/* Select Skeleton */}
                         <TableCell className="text-center"><Skeleton className="h-5 w-5 rounded-full mx-auto" /></TableCell>
                         <TableCell><Skeleton className="h-5 w-full rounded-md" /></TableCell> {/* Badge Skeleton */}
                         <TableCell><Skeleton className="h-5 w-full" /></TableCell> {/* Message Skeleton */}
                         <TableCell className="text-right"><Skeleton className="h-5 w-full ml-auto" /></TableCell>
                         <TableCell className="text-center"><Skeleton className="h-7 w-7 rounded-sm mx-auto" /></TableCell> {/* Button Skeleton */}
                       </TableRow>
                     ))}
                   </TableBody>
                 </Table>
               </CardContent>
             </Card>
           );
      }
  };

  // --- Render ---

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex flex-row items-center justify-between gap-2">
          <h2 className="text-xl font-semibold tracking-tight">渠道测试</h2>
          <Button
            onClick={testAllChannels}
            disabled={testingAll || loading || providers.length === 0}
            size="sm"
          >
            <PlayCircle className={`w-4 h-4 mr-2 ${testingAll ? 'animate-spin' : ''}`} />
            {testingAll ? "测试中..." : "测试全部"}
          </Button>
        </div>

        {loading ? (
          renderSkeleton(3, false) // Show skeleton while loading providers
        ) : providers.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              未找到任何渠道配置，请先在配置管理中添加。
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[15%]">渠道名称</TableHead>
                        <TableHead className="w-[15%]">原始模型</TableHead>
                        <TableHead className="w-[20%]">选择测试模型</TableHead>
                        <TableHead className="w-[5%] text-center">支持</TableHead>
                        <TableHead className="w-[10%]">状态</TableHead>
                        <TableHead className="w-[20%]">消息</TableHead>
                        <TableHead className="w-[10%] text-right">响应时间</TableHead>
                        <TableHead className="w-[5%] text-center">操作</TableHead>
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
                          <TableRow key={index} className={!provider.supported ? "opacity-50 cursor-not-allowed" : ""}>
                            <TableCell className="font-medium">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="truncate max-w-full">{provider.provider}</div>
                                </TooltipTrigger>
                                <TooltipContent><p>{provider.provider}</p></TooltipContent>
                              </Tooltip>
                            </TableCell>
                             <TableCell className="font-mono text-xs text-muted-foreground">
                                <Tooltip>
                                 <TooltipTrigger asChild>
                                   <div className="truncate max-w-full">
                                     {modelConfig?.original || (provider.models.length > 0 ? "N/A" : "-")}
                                    </div>
                                 </TooltipTrigger>
                                 <TooltipContent>
                                   <p>{modelConfig?.original || (provider.models.length > 0 ? "未选择或无效" : "无可用模型")}</p>
                                 </TooltipContent>
                               </Tooltip>
                             </TableCell>
                            <TableCell>
                              {provider.models.length > 0 ? (
                                <Select
                                  value={selectedModelDisplay !== 'N/A' ? selectedModelDisplay : undefined} // Handle 'N/A' case for Select
                                  onValueChange={(value) => handleModelChange(provider.provider, value)}
                                  disabled={!provider.supported || testingAll}
                                >
                                  {/* Reduced height for Select */}
                                  <SelectTrigger className="h-8 text-xs max-w-full">
                                    <SelectValue placeholder="选择模型" />
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
                                <span className="text-sm text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Tooltip>
                                <TooltipTrigger>
                                  {provider.supported ? (
                                    <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                                  ) : (
                                    <AlertCircle className="w-4 h-4 text-muted-foreground mx-auto" />
                                  )}
                                </TooltipTrigger>
                                <TooltipContent><p>{provider.supported ? '支持标准测试' : '非标准端点，暂不支持测试'}</p></TooltipContent>
                              </Tooltip>
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(result?.status)}
                            </TableCell>
                            <TableCell>
                              {result?.message ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className={`truncate max-w-full text-xs ${result.status === 'error' ? 'text-red-600' : 'text-muted-foreground'} cursor-default`}>
                                      {result.message}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-md break-words">
                                    <p>{result.message}</p>
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              {/* Use formatTime utility */}
                              {formatTime(result?.responseTime ?? NaN)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  {/* Wrap button in span for tooltip when disabled */}
                                   <span tabIndex={(!provider.supported || !modelConfig || isTestingThis || testingAll) ? 0 : -1}>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7"
                                        onClick={() => provider.supported && modelConfig && testChannel(provider, selectedModelDisplay)}
                                        disabled={!provider.supported || !modelConfig || isTestingThis || testingAll}
                                        aria-label={`测试 ${provider.provider} - ${selectedModelDisplay}`}
                                      >
                                        {isTestingThis ? <Clock className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                                      </Button>
                                   </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>
                                      {!provider.supported ? '不支持' : !modelConfig ? '无模型' : isTestingThis ? '测试中...' : testingAll ? '测试中...' : `测试此渠道`}
                                    </p>
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
              {providers.map((provider, index) => {
                const selectedModelDisplay = selectedModels.get(provider.provider) || provider.models[0]?.display || 'N/A';
                const modelConfig = provider.models.find((m) => m.display === selectedModelDisplay);
                const testKey = `${provider.provider}-${selectedModelDisplay}`;
                const result = testResults.get(testKey);
                const isTestingThis = result?.status === "testing";

                return (
                  <Card key={index} className={`max-w-full ${!provider.supported ? "opacity-60" : ""}`}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
                      <CardTitle className="text-sm font-medium truncate" title={provider.provider}>
                        {provider.provider}
                      </CardTitle>
                      <Tooltip>
                        <TooltipTrigger>
                          {provider.supported ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-muted-foreground" />
                          )}
                        </TooltipTrigger>
                        <TooltipContent><p>{provider.supported ? '支持标准测试' : '非标准端点，暂不支持测试'}</p></TooltipContent>
                      </Tooltip>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-3">
                      <div className="space-y-2">
                        {/* Model Selection */}
                        {provider.models.length > 0 ? (
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">选择模型</label>
                              <Select
                                value={selectedModelDisplay !== 'N/A' ? selectedModelDisplay : undefined}
                                onValueChange={(value) => handleModelChange(provider.provider, value)}
                                disabled={!provider.supported || testingAll}
                              >
                                <SelectTrigger className="w-full h-9 text-xs">
                                  <SelectValue placeholder="选择模型" />
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
                                <p className="text-sm text-muted-foreground">-</p>
                             </div>
                          )}
                        {/* Original Model Name */}
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
                          {getStatusBadge(result?.status)}
                        </div>
                        {/* Use formatTime utility */}
                        <span className="font-mono text-xs">{formatTime(result?.responseTime ?? NaN)}</span>
                      </div>
                      {/* Error Message */}
                      {result?.message && result.status === 'error' && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className="text-xs text-red-600 break-words line-clamp-2">
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
                        disabled={!provider.supported || !modelConfig || isTestingThis || testingAll}
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