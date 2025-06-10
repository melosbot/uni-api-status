// 文件名: config-editor.tsx
// 备注：这是一个完整的替换文件内容。请直接用以下内容覆盖 config-editor.tsx 文件。

"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card" // Added CardDescription
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert" // Added Alert
import { Save, Download, Upload, Loader2, CheckCircle, XCircle, Info } from "lucide-react" // Added more icons
import yaml from "js-yaml" // Import js-yaml

interface ConfigEditorProps {
  apiKey: string
}

export function ConfigEditor({ apiKey }: ConfigEditorProps) {
  const [config, setConfig] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(true)
  const [saving, setSaving] = useState<boolean>(false)
  const [isYamlValid, setIsYamlValid] = useState<boolean>(true)
  const [yamlError, setYamlError] = useState<string | null>(null)
  const { toast } = useToast()

  // --- YAML Validation ---
  const validateYaml = useCallback((yamlContent: string): { isValid: boolean; error: string | null } => {
    if (!yamlContent.trim()) {
       // Treat empty or whitespace-only content as valid (or decide if it should be invalid)
       return { isValid: true, error: null };
    }
    try {
      yaml.load(yamlContent)
      return { isValid: true, error: null }
    } catch (e: any) {
      // console.error("YAML validation error:", e); // Keep for debugging if needed
      // Provide a more user-friendly error message
      let errorMessage = "YAML 格式无效。"
      if (e instanceof yaml.YAMLException && e.mark) {
          errorMessage += ` 在第 ${e.mark.line + 1} 行，第 ${e.mark.column + 1} 列附近: ${e.reason}`
      } else if (e.message) {
           errorMessage += ` ${e.message}`
      }
      return { isValid: false, error: errorMessage }
    }
  }, [])

  // --- Load Config ---
  const loadConfig = useCallback(async () => {
    if (!apiKey) {
      setLoading(false);
      setConfig("");
      setIsYamlValid(true); // Reset validation state
      setYamlError(null);
      return;
    }
    setLoading(true)
    setIsYamlValid(true); // Assume valid initially
    setYamlError(null);
    try {
      const response = await fetch(`/api/config/load?apiKey=${encodeURIComponent(apiKey)}`)
      if (response.ok) {
        const data = await response.json()
        const loadedConfig = data.config || "" // Ensure it's a string
        setConfig(loadedConfig)
        // Validate loaded config
        const validation = validateYaml(loadedConfig)
        setIsYamlValid(validation.isValid)
        setYamlError(validation.error)
        if (!validation.isValid) {
            toast({
               title: "警告",
               description: "加载的配置文件包含无效的 YAML 格式。",
               variant: "destructive", // Use destructive variant for invalid format warning
            })
        }
      } else {
        console.error("加载配置失败:", response.statusText)
        toast({
          title: "错误",
          description: `加载配置失败 (${response.status})`,
          variant: "destructive",
        })
        setConfig("") // Clear config on error
      }
    } catch (error) {
      console.error("加载配置时发生错误:", error)
      toast({
        title: "错误",
        description: "加载配置时发生网络错误",
        variant: "destructive",
      })
       setConfig("") // Clear config on error
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, toast, validateYaml]) // Add validateYaml to dependencies

  useEffect(() => {
    loadConfig()
  }, [loadConfig]) // Depend on the memoized loadConfig function

  // --- Handle Config Change ---
  const handleConfigChange = (event: React.ChangeEvent<Textarea>) => {
    const newConfig = event.target.value
    setConfig(newConfig)
    // Validate on change
    const validation = validateYaml(newConfig)
    setIsYamlValid(validation.isValid)
    setYamlError(validation.error)
  }

  // --- Save Config ---
  const saveConfig = async () => {
    const validation = validateYaml(config);
    setIsYamlValid(validation.isValid);
    setYamlError(validation.error);

    if (!validation.isValid) {
      toast({
        title: "保存失败",
        description: validation.error || "YAML 格式无效，请修正后再保存。",
        variant: "destructive",
      })
      return // Prevent saving invalid YAML
    }

    setSaving(true)
    try {
      const response = await fetch("/api/config/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiKey, // Ensure apiKey is included as per original code
          config,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "成功",
          description: "配置已成功保存并应用。", // More informative message
        })
      } else {
         console.error("保存配置失败:", data.error || response.statusText)
        toast({
          title: "保存失败",
          description: data.error || `保存配置时发生错误 (${response.status})`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("保存配置时发生错误:", error)
      toast({
        title: "错误",
        description: "保存配置时发生网络错误",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  // --- Download Config ---
  const downloadConfig = () => {
    if (!config) {
        toast({ title: "提示", description: "配置内容为空，无法下载。"});
        return;
    }
    try {
        const blob = new Blob([config], { type: "text/yaml;charset=utf-8" }) // Specify charset
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = "api.yaml"
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    } catch (error) {
        console.error("下载配置失败:", error);
        toast({ title: "错误", description: "创建下载链接失败。", variant: "destructive"});
    }
  }

  // --- Handle File Upload ---
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Basic type check
      if (!file.name.endsWith(".yaml") && !file.name.endsWith(".yml")) {
          toast({ title: "文件类型错误", description: "请选择 .yaml 或 .yml 文件。", variant: "destructive" });
          return;
      }
      // Size check (e.g., 1MB limit)
      if (file.size > 1 * 1024 * 1024) {
          toast({ title: "文件过大", description: "配置文件大小不能超过 1MB。", variant: "destructive" });
          return;
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        try {
            const content = e.target?.result as string;
            if (content === null || content === undefined) {
               throw new Error("无法读取文件内容。");
            }
            setConfig(content);
            // Validate uploaded content
            const validation = validateYaml(content);
            setIsYamlValid(validation.isValid);
            setYamlError(validation.error);
            toast({
              title: "文件已加载",
              description: file.name,
            });
            if (!validation.isValid) {
                toast({
                   title: "警告",
                   description: "上传的文件包含无效的 YAML 格式。",
                   variant: "destructive", // Use destructive variant for invalid format warning
                })
            }
        } catch (readError: any) {
             console.error("读取文件失败:", readError);
             toast({ title: "错误", description: `读取文件失败: ${readError.message}`, variant: "destructive"});
             // Reset state on error
             setConfig("");
             setIsYamlValid(true);
             setYamlError(null);
        } finally {
             // Reset file input to allow uploading the same file again if needed
             event.target.value = '';
        }
      }
      reader.onerror = (e) => {
          console.error("FileReader error:", e);
          toast({ title: "错误", description: "读取文件时发生错误。", variant: "destructive"});
          event.target.value = ''; // Reset file input
      }
      reader.readAsText(file)
    }
  }

  // --- Skeleton Loader ---
  const renderSkeleton = () => (
     <div className="space-y-4">
         {/* Header Skeleton */}
         <div className="flex items-center justify-between">
             <Skeleton className="h-7 w-32" /> {/* Title Skeleton */}
             <div className="flex items-center space-x-2">
                 <Skeleton className="h-9 w-24" /> {/* Button Skeleton */}
                 <Skeleton className="h-9 w-24" /> {/* Button Skeleton */}
                 <Skeleton className="h-9 w-24" /> {/* Button Skeleton */}
             </div>
         </div>
          {/* Card Skeleton */}
         <Card>
             <CardHeader>
                 <Skeleton className="h-6 w-48" /> {/* Card Title Skeleton */}
             </CardHeader>
             <CardContent>
                 <Skeleton className="h-[400px] w-full mb-4" /> {/* Textarea Skeleton */}
                 <Skeleton className="h-4 w-full" />
                 <Skeleton className="h-4 w-3/4 mt-2" />
             </CardContent>
         </Card>
     </div>
  )

  if (loading) {
    return renderSkeleton();
  }

  // --- Main Render ---
  return (
    <TooltipProvider>
        <div className="space-y-6"> {/* Increased spacing */}
          {/* Header Section (Unified with Responsive Handling) */}
          <div className="flex flex-row items-center justify-between gap-4">
            <h2 className="text-xl font-semibold tracking-tight">配置管理</h2>
            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Hidden file input */}
              <input
                 type="file"
                 accept=".yaml,.yml"
                 onChange={handleFileUpload}
                 className="hidden"
                 id="file-upload"
              />
              {/* Upload Button */}
              <Tooltip>
                 <TooltipTrigger asChild>
                    <Button
                       variant="outline"
                       size="sm"
                       onClick={() => document.getElementById("file-upload")?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      上传
                    </Button>
                 </TooltipTrigger>
                 <TooltipContent><p>从本地上传 YAML 文件</p></TooltipContent>
              </Tooltip>
              {/* Download Button */}
              <Tooltip>
                 <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={downloadConfig}>
                      <Download className="w-4 h-4 mr-2" />
                      下载
                    </Button>
                 </TooltipTrigger>
                 <TooltipContent><p>下载当前编辑器中的配置</p></TooltipContent>
              </Tooltip>
              {/* Save Button with Validation Status */}
              <Tooltip>
                  <TooltipTrigger asChild>
                     {/* Wrap the button in a span when disabled for Tooltip to work */}
                     <span tabIndex={!isYamlValid || saving ? 0 : -1}>
                          <Button
                            onClick={saveConfig}
                            disabled={!isYamlValid || saving}
                            size="sm"
                            className={!isYamlValid ? "bg-yellow-500 hover:bg-yellow-600 text-white" : ""} // Indicate invalid state
                          >
                              {saving ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : !isYamlValid ? (
                                <XCircle className="w-4 h-4 mr-2" />
                              ) : (
                                <Save className="w-4 h-4 mr-2" />
                              )}
                              {saving ? "保存中..." : !isYamlValid ? "格式无效" : "保存配置"}
                          </Button>
                     </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {saving ? <p>正在保存配置...</p> :
                     !isYamlValid ? <p>YAML 格式无效，无法保存</p> :
                     <p>保存当前配置到服务器</p>}
                  </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Editor Card */}
          <Card className={`border ${!isYamlValid ? 'border-destructive' : ''}`}> {/* Highlight border if invalid */}
            <CardHeader>
                <div className="flex items-center justify-between">
                   <div>
                       <CardTitle className="text-lg">配置文件编辑器</CardTitle>
                       <CardDescription>直接编辑 api.yaml 文件内容。</CardDescription>
                   </div>
                   {/* YAML Validation Status Indicator */}
                    <Tooltip>
                       <TooltipTrigger>
                           {isYamlValid ? (
                              <CheckCircle className="w-5 h-5 text-green-500"/>
                           ) : (
                              <XCircle className="w-5 h-5 text-destructive"/>
                           )}
                       </TooltipTrigger>
                       <TooltipContent>
                            {isYamlValid ? <p>YAML 格式有效</p> : <p>YAML 格式无效</p>}
                       </TooltipContent>
                    </Tooltip>
                </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={config}
                onChange={handleConfigChange}
                className="min-h-[500px] font-mono text-sm border rounded-md focus-visible:ring-1 focus-visible:ring-ring" // Basic styling
                placeholder="在此处输入或粘贴 YAML 配置内容..."
                aria-invalid={!isYamlValid} // Accessibility hint
              />
              {/* Validation Error Message */}
              {!isYamlValid && yamlError && (
                  <p className="text-sm text-destructive mt-2">{yamlError}</p>
              )}
              {/* Informational Alert */}
              <Alert className="mt-4" variant={isYamlValid ? "default" : "destructive"}>
                <Info className="h-4 w-4"/>
                <AlertTitle>{isYamlValid ? "提示" : "注意"}</AlertTitle>
                <AlertDescription className="text-xs space-y-1"> {/* Smaller text and spacing */}
                  <li>请确保 YAML 语法正确。格式错误将导致无法保存。</li>
                  <li>保存前建议先使用【下载】按钮备份当前配置。</li>
                  <li>配置修改并保存后，服务将自动重启以应用新配置。</li>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
    </TooltipProvider>
  )
}