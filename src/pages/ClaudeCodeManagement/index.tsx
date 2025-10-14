import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import { invoke } from '@tauri-apps/api/core'

interface ClaudeCodeStatus {
  installed: boolean
  version?: string
  error?: string
}

const ClaudeCodeManagement = () => {
  const [claudeCodeStatus, setClaudeCodeStatus] = useState<ClaudeCodeStatus | null>(null)
  const [isInstalling, setIsInstalling] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  // 检测Claude Code是否已安装
  const checkClaudeCodeInstallation = async () => {
    setIsChecking(true)
    try {
      const result = await invoke('execute_command', {
        command: 'claude',
        args: ['--version']
      })
      
      if (result) {
        setClaudeCodeStatus({
          installed: true,
          version: result as string
        })
      }
    } catch (error) {
      setClaudeCodeStatus({
        installed: false,
        error: error as string
      })
    } finally {
      setIsChecking(false)
    }
  }

  // 安装Claude Code
  const installClaudeCode = async () => {
    setIsInstalling(true)
    try {
      await invoke('execute_command', {
        command: 'npm',
        args: ['install', '-g', '@anthropic-ai/claude-code']
      })
      
      // 安装完成后重新检测
      await checkClaudeCodeInstallation()
    } catch (error) {
      console.error('安装失败:', error)
    } finally {
      setIsInstalling(false)
    }
  }

  // 更新Claude Code
  const updateClaudeCode = async () => {
    setIsInstalling(true)
    try {
      await invoke('execute_command', {
        command: 'npm',
        args: ['update', '-g', '@anthropic-ai/claude-code']
      })
      
      // 更新完成后重新检测
      await checkClaudeCodeInstallation()
    } catch (error) {
      console.error('更新失败:', error)
    } finally {
      setIsInstalling(false)
    }
  }

  useEffect(() => {
    checkClaudeCodeInstallation()
  }, [])

  // 如果正在检测
  if (isChecking) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <Spinner className="mx-auto" />
          <p className="text-muted-foreground">正在检测Claude Code安装状态...</p>
        </div>
      </div>
    )
  }

  // 如果未安装，显示安装界面
  if (!claudeCodeStatus?.installed) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">Claude Code管理</h1>
          <p className="text-muted-foreground">管理 Claude Code 项目和配置</p>
        </div>

        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <CardTitle>Claude Code未安装</CardTitle>
            <CardDescription>
              检测到您的系统中未安装Claude Code，请点击下方按钮进行安装
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {claudeCodeStatus?.error && (
              <Alert>
                <AlertDescription>
                  检测错误: {claudeCodeStatus.error}
                </AlertDescription>
              </Alert>
            )}
            
            <div className="flex flex-col space-y-2">
              <Button 
                onClick={installClaudeCode} 
                disabled={isInstalling}
                className="w-full"
              >
                {isInstalling ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    正在安装...
                  </>
                ) : (
                  '安装 Claude Code'
                )}
              </Button>
              
              <Button 
                variant="outline" 
                onClick={checkClaudeCodeInstallation}
                className="w-full"
              >
                重新检测
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 已安装，显示管理界面
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Claude Code管理</h1>
          <p className="text-muted-foreground">管理 Claude Code 项目和配置</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary">已安装</Badge>
          {claudeCodeStatus.version && (
            <Badge variant="outline">{claudeCodeStatus.version}</Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="home" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="home">首页</TabsTrigger>
          <TabsTrigger value="projects">项目管理</TabsTrigger>
          <TabsTrigger value="prompts">Prompts管理</TabsTrigger>
          <TabsTrigger value="mcp">MCP管理</TabsTrigger>
          <TabsTrigger value="channels">渠道管理</TabsTrigger>
        </TabsList>

        <TabsContent value="home" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Claude Code控制台</CardTitle>
              <CardDescription>管理Claude Code版本和配置</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-2">
                <Button onClick={updateClaudeCode} disabled={isInstalling}>
                  {isInstalling ? '更新中...' : '更新 Claude Code'}
                </Button>
                <Button variant="outline" onClick={checkClaudeCodeInstallation}>
                  刷新状态
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>项目管理</CardTitle>
              <CardDescription>管理Claude Code项目和配置</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">项目管理功能正在开发中...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prompts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Prompts管理</CardTitle>
              <CardDescription>管理和编辑Claude Code提示词</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Prompts管理功能正在开发中...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mcp" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>MCP管理</CardTitle>
              <CardDescription>管理Model Context Protocol配置</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">MCP管理功能正在开发中...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="channels" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>渠道管理</CardTitle>
              <CardDescription>管理API渠道和配置</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">渠道管理功能正在开发中...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default ClaudeCodeManagement