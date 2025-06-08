// 文件名: page.tsx
// 备注：这是一个完整的替换文件内容。请直接用以下内容覆盖 page.tsx 文件。

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Settings, BarChart3, FileEdit, Menu, Zap } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ApiKeyModal } from "@/components/api-key-modal"
import { ConfigEditor } from "@/components/config-editor"
import { StatsViewer } from "@/components/stats-viewer"
import { useToast } from "@/hooks/use-toast"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Separator } from "@/components/ui/separator"
import { ChannelTester } from "@/components/channel-tester"

export default function HomePage() {
  const [currentPage, setCurrentPage] = useState<"stats" | "config" | "test">("stats")
  const [showApiKeyModal, setShowApiKeyModal] = useState(false)
  const [apiKey, setApiKey] = useState<string>("")
  const [userRole, setUserRole] = useState<string>("")
  const [viewingKey, setViewingKey] = useState<string>("")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const savedKey = localStorage.getItem("uniapi_current_key")
    const savedRole = localStorage.getItem("uniapi_current_role")
    const savedViewingKey = localStorage.getItem("uniapi_viewing_key")
    if (savedKey && savedRole) {
      setApiKey(savedKey)
      setUserRole(savedRole)
      setViewingKey(savedViewingKey || savedKey) // 优先使用 viewingKey，否则回退到 apiKey
    } else {
       // 如果本地存储没有，则可能是首次访问或已清除，确保状态也为空
       setApiKey("")
       setUserRole("")
       setViewingKey("")
    }
  }, []) // 空依赖数组，仅在组件挂载时运行

  const handleApiKeySuccess = (key: string, role: string, viewingKey?: string) => {
    const actualViewingKey = viewingKey || key // 确保 viewingKey 有值
    setApiKey(key)
    setUserRole(role)
    setViewingKey(actualViewingKey)
    localStorage.setItem("uniapi_current_key", key)
    localStorage.setItem("uniapi_current_role", role)
    localStorage.setItem("uniapi_viewing_key", actualViewingKey)
    setShowApiKeyModal(false)
    setMobileMenuOpen(false) // 关闭移动菜单

    if (role === "admin" && viewingKey && viewingKey !== key) {
      toast({
        title: "成功",
        description: `管理员身份验证成功，正在查看 Key: ${viewingKey.substring(0, 8)}...${viewingKey.substring(viewingKey.length - 4)} 的统计`,
      })
    } else {
      toast({
        title: "成功",
        description: `API Key 验证成功，角色：${role}`,
      })
    }
     // 切换Key或角色后，最好重置到默认页面（比如统计页）
     setCurrentPage("stats");
  }

  const handleClearApiKey = () => {
    setApiKey("")
    setUserRole("")
    setViewingKey("")
    localStorage.removeItem("uniapi_current_key")
    localStorage.removeItem("uniapi_current_role")
    localStorage.removeItem("uniapi_viewing_key")
    setShowApiKeyModal(false)
    setMobileMenuOpen(false) // 关闭移动菜单
    toast({
      title: "已清除",
      description: "API Key 已清除",
    })
    // 清除后，因为 !apiKey 条件会成立，页面会自动渲染引导界面
  }

  // 权限判断：只有管理员可以访问配置页面
  const canAccessConfig = userRole === "admin"

  // 根据角色获取 Badge 组件
  const getRoleBadge = (role: string) => {
    if (role === "admin") {
      return <Badge variant="destructive">管理员</Badge> // 使用更醒目的颜色
    }
    return <Badge variant="secondary">用户</Badge>
  }

  // 平滑滚动到指定 ID 的元素
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
       // 考虑 Header 的高度，进行偏移
       const headerOffset = 80; // 估算的 Header 高度 + 一些间距
       const elementPosition = element.getBoundingClientRect().top;
       const offsetPosition = elementPosition + window.scrollY - headerOffset;

       window.scrollTo({
           top: offsetPosition,
           behavior: "smooth"
       });
    }
     setMobileMenuOpen(false) // 点击后关闭移动菜单
  }

  // 获取当前正在查看的 Key 的 Badge (仅当管理员查看其他 Key 时显示)
   const getViewingKeyBadge = () => {
      if (userRole === "admin" && viewingKey && viewingKey !== apiKey) {
        return (
          <>
             <Badge variant="outline">{`${viewingKey.substring(0, 4)}...${viewingKey.substring(viewingKey.length - 4)}`}</Badge>
          </>
        );
      }
      return null;
    };

  // 如果没有设置 API Key，显示设置引导界面
  if (!apiKey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4 dark:from-gray-900 dark:to-gray-800">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-semibold tracking-tight">UniAPI 管理面板</CardTitle>
            <CardDescription>请先设置您的 API Key 以访问系统</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setShowApiKeyModal(true)} className="w-full">
              <Settings className="w-4 h-4 mr-2" />
              设置 API Key
            </Button>
          </CardContent>
        </Card>
        {/* API Key Modal 始终挂载，通过 open 控制显示 */}
        <ApiKeyModal
          open={showApiKeyModal}
          onOpenChange={setShowApiKeyModal}
          onSuccess={handleApiKeySuccess}
          onClear={handleClearApiKey}
          currentKey={apiKey} // 传递当前状态，即使为空
          currentRole={userRole}
          currentViewingKey={viewingKey}
        />
      </div>
    )
  }

  // 主界面渲染 (已设置 API Key)
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-3"> {/* 调整了 padding */}
          {/* Desktop Header */}
          {/* ***** Corrected Desktop Header Structure START ***** */}
          <div className="hidden md:flex items-center justify-between">
            {/* Left Section */}
            <div className="flex items-center space-x-6">
              <h1 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">UniAPI 管理面板</h1>
              {/* Role and Viewing Key Info (Moved inside the left section div) */}
              <div className="flex items-center space-x-2 border-l pl-4 dark:border-gray-600">
                {getRoleBadge(userRole)}
                {getViewingKeyBadge()}
              </div>
            </div>
            {/* Right Section */}
            <div className="flex items-center space-x-2">
              {/* Statistics Dropdown */}
              <HoverCard openDelay={100} closeDelay={100}> {/* 可选：调整打开/关闭延迟 */}
                <HoverCardTrigger asChild>
                  <Button
                    variant={currentPage === "stats" ? "secondary" : "ghost"}
                    size="sm"
                    className="flex items-center"
                    onClick={() => setCurrentPage("stats")} // 点击按钮跳转到 stats 页面
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    统计信息
                  </Button>
                </HoverCardTrigger>
                <HoverCardContent className="w-auto p-1" align="end"> {/* 设置合适的宽度和内边距 */}
                  {/* 子菜单选项 */}
                  <div className="flex flex-col space-y-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start px-2 py-1.5" // 模拟菜单项样式
                      onClick={() => {
                        // 如果不在 stats 页面，先跳转
                        if (currentPage !== 'stats') {
                            setCurrentPage('stats');
                            // 可能需要一点延迟确保页面已切换，再滚动
                            setTimeout(() => scrollToSection("overview"), 50);
                        } else {
                            scrollToSection("overview");
                        }
                      }}
                    >
                      概览统计
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start px-2 py-1.5"
                      onClick={() => {
                        if (currentPage !== 'stats') {
                            setCurrentPage('stats');
                            setTimeout(() => scrollToSection("models"), 50);
                        } else {
                            scrollToSection("models");
                        }
                      }}
                    >
                      模型统计
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start px-2 py-1.5"
                      onClick={() => {
                        if (currentPage !== 'stats') {
                            setCurrentPage('stats');
                            setTimeout(() => scrollToSection("channels"), 50);
                        } else {
                            scrollToSection("channels");
                        }
                      }}
                    >
                      渠道统计
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start px-2 py-1.5"
                      onClick={() => {
                        if (currentPage !== 'stats') {
                            setCurrentPage('stats');
                            setTimeout(() => scrollToSection("logs"), 50);
                        } else {
                            scrollToSection("logs");
                        }
                      }}
                    >
                      详细日志
                    </Button>
                  </div>
                </HoverCardContent>
              </HoverCard>

              {/* Channel Tester Button */}
              <Button
                variant={currentPage === "test" ? "secondary" : "ghost"}
                onClick={() => setCurrentPage("test")}
                size="sm"
              >
                <Zap className="w-4 h-4 mr-2" />
                渠道测试
              </Button>

              {/* Config Editor Button (Admin Only) */}
              {canAccessConfig && (
                <Button
                  variant={currentPage === "config" ? "secondary" : "ghost"}
                  onClick={() => setCurrentPage("config")}
                  size="sm"
                >
                  <FileEdit className="w-4 h-4 mr-2" />
                  配置管理
                </Button>
              )}

              {/* Settings Button */}
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowApiKeyModal(true)}>
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
           {/* ***** Corrected Desktop Header Structure END ***** */}

          {/* Mobile Header */}
          <div className="md:hidden">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-semibold">UniAPI</h1> {/* 简化标题 */}
              <div className="flex items-center space-x-1">
                {/* Mobile Role and Viewing Key */}
                <div className="flex items-center space-x-1 mr-1 text-xs"> {/* Smaller text */}
                   {getRoleBadge(userRole)}
                   {getViewingKeyBadge()}
                </div>
                 {/* Settings Button */}
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowApiKeyModal(true)}>
                  <Settings className="w-4 h-4" />
                </Button>
                {/* Mobile Menu Trigger */}
                <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Menu className="w-4 h-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-60 p-4">
                      {/* Main Navigation */}
                      <div className="space-y-2 mb-4">
                        <Button
                          variant={currentPage === "stats" ? "secondary" : "ghost"}
                          onClick={() => { setCurrentPage("stats"); setMobileMenuOpen(false); }}
                          className="w-full justify-start"
                        >
                          <BarChart3 className="w-4 h-4 mr-2" />
                          统计信息
                        </Button>
                        <Button
                          variant={currentPage === "test" ? "secondary" : "ghost"}
                          onClick={() => { setCurrentPage("test"); setMobileMenuOpen(false); }}
                          className="w-full justify-start"
                        >
                          <Zap className="w-4 h-4 mr-2" />
                          渠道测试
                        </Button>
                        {canAccessConfig && (
                          <Button
                            variant={currentPage === "config" ? "secondary" : "ghost"}
                            onClick={() => { setCurrentPage("config"); setMobileMenuOpen(false); }}
                            className="w-full justify-start"
                          >
                            <FileEdit className="w-4 h-4 mr-2" />
                            配置管理
                          </Button>
                        )}
                      </div>

                       {/* Statistics Submenu */}
                      {currentPage === "stats" && (
                        <>
                          <Separator className="my-3"/>
                          <div className="space-y-1">
                            <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">快速跳转</p>
                            <Button variant="ghost" size="sm" onClick={() => scrollToSection("overview")} className="w-full justify-start text-muted-foreground hover:text-primary">概览统计</Button>
                            <Button variant="ghost" size="sm" onClick={() => scrollToSection("models")} className="w-full justify-start text-muted-foreground hover:text-primary">模型统计</Button>
                            <Button variant="ghost" size="sm" onClick={() => scrollToSection("channels")} className="w-full justify-start text-muted-foreground hover:text-primary">渠道统计</Button>
                            <Button variant="ghost" size="sm" onClick={() => scrollToSection("logs")} className="w-full justify-start text-muted-foreground hover:text-primary">详细日志</Button>
                          </div>
                        </>
                      )}
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </div> {/* End Mobile Header div */}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="container mx-auto px-4 py-8">
        {/* Conditional Rendering of Pages */}
        {currentPage === "stats" && <StatsViewer apiKey={viewingKey} />}
        {currentPage === "test" && <ChannelTester apiKey={apiKey} />}
        {currentPage === "config" && canAccessConfig && <ConfigEditor apiKey={apiKey} />}
        {currentPage === "config" && !canAccessConfig && (
          <Card className="border-dashed border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
            <CardContent className="p-6 text-center">
              <Zap className="mx-auto h-10 w-10 text-yellow-500 mb-3"/>
              <p className="font-medium text-yellow-700 dark:text-yellow-400">访问受限</p>
              <p className="text-sm text-muted-foreground mt-1">您需要管理员权限才能访问此配置管理功能。</p>
            </CardContent>
          </Card>
        )}
      </main>

       {/* API Key Modal */}
      <ApiKeyModal
        open={showApiKeyModal}
        onOpenChange={setShowApiKeyModal}
        onSuccess={handleApiKeySuccess}
        onClear={handleClearApiKey}
        currentKey={apiKey}
        currentRole={userRole}
        currentViewingKey={viewingKey}
      />
    </div>
  )
}