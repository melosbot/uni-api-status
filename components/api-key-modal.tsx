"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ApiKeyModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (key: string, role: string, viewingKey?: string) => void
  onClear: () => void
  currentKey?: string
  currentRole?: string
  currentViewingKey?: string
}

interface SavedApiKey {
  key: string
  role: string
  name?: string
}

interface AvailableApiKey {
  api: string
  role: string
  name?: string
}

export function ApiKeyModal({
  open,
  onOpenChange,
  onSuccess,
  onClear,
  currentKey = "",
  currentRole = "",
  currentViewingKey = "",
}: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState("")
  const [loading, setLoading] = useState(false)
  const [savedKeys, setSavedKeys] = useState<SavedApiKey[]>([])
  const [selectedKey, setSelectedKey] = useState<string>("")
  const [availableKeys, setAvailableKeys] = useState<AvailableApiKey[]>([])
  const [selectedViewingKey, setSelectedViewingKey] = useState<string>("")
  const [loadingAvailableKeys, setLoadingAvailableKeys] = useState(false)
  const [validatedKeyRole, setValidatedKeyRole] = useState<string>("")
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      loadSavedKeys()
      // 设置当前选中的key
      if (currentKey) {
        setSelectedKey(currentKey)
        setSelectedViewingKey(currentViewingKey || currentKey)
        setValidatedKeyRole(currentRole)
        // 如果是管理员，加载可用的keys
        if (currentRole === "admin") {
          loadAvailableKeys(currentKey)
        }
      } else {
        setSelectedKey("")
        setSelectedViewingKey("")
        setAvailableKeys([])
        setValidatedKeyRole("")
      }
      setApiKey("")
    }
  }, [open, currentKey, currentRole, currentViewingKey])

  const loadSavedKeys = () => {
    try {
      const saved = localStorage.getItem("uniapi_saved_keys")
      if (saved) {
        setSavedKeys(JSON.parse(saved))
      }
    } catch (error) {
      console.error("Failed to load saved keys:", error)
    }
  }

  const loadAvailableKeys = async (adminKey: string) => {
    setLoadingAvailableKeys(true)
    try {
      const response = await fetch("/api/auth/available-keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ adminKey }),
      })

      if (response.ok) {
        const data = await response.json()
        setAvailableKeys(data.keys || [])
      } else {
        toast({
          title: "错误",
          description: "获取可用 API Key 列表失败",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "错误",
        description: "获取可用 API Key 列表时发生错误",
        variant: "destructive",
      })
    } finally {
      setLoadingAvailableKeys(false)
    }
  }

  const saveApiKey = (key: string, role: string) => {
    try {
      const saved = localStorage.getItem("uniapi_saved_keys")
      const keys: SavedApiKey[] = saved ? JSON.parse(saved) : []

      // 检查是否已存在
      const existingIndex = keys.findIndex((k) => k.key === key)
      if (existingIndex >= 0) {
        keys[existingIndex] = { key, role }
      } else {
        keys.push({ key, role, name: `Key ${keys.length + 1}` })
      }

      localStorage.setItem("uniapi_saved_keys", JSON.stringify(keys))
      setSavedKeys(keys)
    } catch (error) {
      console.error("Failed to save key:", error)
    }
  }

  const deleteSavedKey = (keyToDelete: string) => {
    try {
      const updated = savedKeys.filter((k) => k.key !== keyToDelete)
      localStorage.setItem("uniapi_saved_keys", JSON.stringify(updated))
      setSavedKeys(updated)
      if (selectedKey === keyToDelete) {
        setSelectedKey("")
        setValidatedKeyRole("")
      }
      toast({
        title: "已删除",
        description: "API Key 已从缓存中删除",
      })
    } catch (error) {
      console.error("Failed to delete key:", error)
    }
  }

  const validateApiKey = async (keyToValidate: string) => {
    try {
      const response = await fetch("/api/auth/validate-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ apiKey: keyToValidate }),
      })

      const data = await response.json()

      if (response.ok && data.valid) {
        return data.role
      } else {
        return null
      }
    } catch (error) {
      console.error("Validation failed:", error)
      return null
    }
  }

  const handleValidate = async () => {
    const keyToValidate = selectedKey || apiKey.trim()

    if (!keyToValidate) {
      toast({
        title: "错误",
        description: "请输入或选择 API Key",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const role = await validateApiKey(keyToValidate)

      if (role) {
        saveApiKey(keyToValidate, role)
        setValidatedKeyRole(role)

        if (role === "admin") {
          await loadAvailableKeys(keyToValidate)
          // 如果没有选择查看的key，默认选择管理员自己的key
          const viewingKey = selectedViewingKey || keyToValidate
          setSelectedViewingKey(viewingKey)
          onSuccess(keyToValidate, role, viewingKey)
        } else {
          // 非管理员直接完成验证
          onSuccess(keyToValidate, role)
        }

        setApiKey("")
        onOpenChange(false)
      } else {
        toast({
          title: "验证失败",
          description: "无效的 API Key",
          variant: "destructive",
        })
        // 如果验证失败，从缓存中删除这个key
        if (selectedKey) {
          deleteSavedKey(selectedKey)
        }
      }
    } catch (error) {
      toast({
        title: "错误",
        description: "验证过程中发生错误",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSelectKey = async (value: string) => {
    setSelectedKey(value)
    setApiKey("")
    setValidatedKeyRole("")

    // 自动验证选中的key
    setLoading(true)
    try {
      const role = await validateApiKey(value)

      if (role) {
        saveApiKey(value, role)
        setValidatedKeyRole(role)

        if (role === "admin") {
          await loadAvailableKeys(value)
          // 如果没有选择查看的key，默认选择管理员自己的key
          const viewingKey = selectedViewingKey || value
          setSelectedViewingKey(viewingKey)
        }
      } else {
        toast({
          title: "验证失败",
          description: "该 API Key 已失效，将从缓存中删除",
          variant: "destructive",
        })
        // 如果验证失败，从缓存中删除这个key
        deleteSavedKey(value)
      }
    } catch (error) {
      console.error("Auto validation failed:", error)
      toast({
        title: "验证失败",
        description: "API Key 验证失败",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleViewingKeyChange = (value: string) => {
    setSelectedViewingKey(value)
  }

  const handleConfirm = () => {
    const keyToUse = selectedKey || apiKey.trim()
    const viewingKey = selectedViewingKey || keyToUse

    if (!keyToUse) {
      toast({
        title: "错误",
        description: "请选择 API Key",
        variant: "destructive",
      })
      return
    }

    if (!validatedKeyRole) {
      toast({
        title: "错误",
        description: "请先验证 API Key",
        variant: "destructive",
      })
      return
    }

    onSuccess(keyToUse, validatedKeyRole, validatedKeyRole === "admin" ? viewingKey : undefined)
    onOpenChange(false)
  }

  const getRoleBadge = (role: string) => {
    if (role === "admin") {
      return (
        <Badge variant="default" className="text-xs">
          管理员
        </Badge>
      )
    }
    return (
      <Badge variant="secondary" className="text-xs">
        用户
      </Badge>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>API Key 设置</DialogTitle>
          <DialogDescription>请选择或输入您的 API Key 以访问系统功能</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* API Key 选择 */}
          <div className="space-y-2">
            <Label>选择 API Key</Label>
            <Select value={selectedKey} onValueChange={handleSelectKey}>
              <SelectTrigger>
                <SelectValue placeholder="选择已保存的 Key" />
              </SelectTrigger>
              <SelectContent>
                {savedKeys.map((savedKey, index) => (
                  <SelectItem key={index} value={savedKey.key}>
                    <div className="flex items-center justify-between w-full min-w-0">
                      <span className="font-mono text-sm truncate flex-1">
                        {savedKey.key.substring(0, 8)}...{savedKey.key.substring(savedKey.key.length - 4)}
                      </span>
                      <div className="flex items-center space-x-2 ml-2 flex-shrink-0">
                        {getRoleBadge(savedKey.role)}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            deleteSavedKey(savedKey.key)
                          }}
                          onMouseDown={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 新 API Key 输入 */}
          <div className="space-y-2">
            <Label htmlFor="apikey">或输入新的 API Key</Label>
            <Input
              id="apikey"
              type="password"
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value)
                if (e.target.value) {
                  setSelectedKey("")
                  setValidatedKeyRole("")
                }
              }}
              onKeyDown={(e) => e.key === "Enter" && handleValidate()}
              disabled={!!selectedKey}
            />
          </div>

          {/* 管理员查看统计的 Key 选择 */}
          {validatedKeyRole === "admin" && availableKeys.length > 0 && (
            <div className="space-y-2">
              <Label>选择要查看统计的 API Key</Label>
              <Select value={selectedViewingKey} onValueChange={handleViewingKeyChange}>
                <SelectTrigger>
                  <SelectValue placeholder="选择要查看的 Key" />
                </SelectTrigger>
                <SelectContent>
                  {loadingAvailableKeys ? (
                    <SelectItem value="loading" disabled>
                      加载中...
                    </SelectItem>
                  ) : (
                    availableKeys.map((key, index) => (
                      <SelectItem key={index} value={key.api}>
                        <div className="flex items-center justify-between w-full min-w-0">
                          <span className="font-mono text-sm truncate flex-1">
                            {key.api.substring(0, 8)}...{key.api.substring(key.api.length - 4)}
                          </span>
                          <div className="ml-2 flex-shrink-0">{getRoleBadge(key.role)}</div>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex space-x-2">
            {!selectedKey && apiKey ? (
              <Button onClick={handleValidate} disabled={loading} className="flex-1">
                {loading ? "验证中..." : "验证并保存"}
              </Button>
            ) : (
              <Button
                onClick={handleConfirm}
                disabled={!selectedKey || !validatedKeyRole || (validatedKeyRole === "admin" && !selectedViewingKey)}
                className="flex-1"
              >
                确认
              </Button>
            )}
            <Button variant="outline" onClick={onClear}>
              清除当前
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
