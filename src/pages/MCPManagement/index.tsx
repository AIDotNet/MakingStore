import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Play, 
  Square, 
  RotateCcw, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Activity,
  Terminal,
  Settings,
  RefreshCw
} from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { ResourceManager } from '@/lib/resourceManager'

interface ProcessStatus {
  isRunning: boolean
  pid?: number
  startTime?: Date
  error?: string
}

interface LogEntry {
  timestamp: Date
  level: 'info' | 'warn' | 'error'
  message: string
}

const MCPManagement: React.FC = () => {
  const [processStatus, setProcessStatus] = useState<ProcessStatus>({ isRunning: false })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isExecutableAvailable, setIsExecutableAvailable] = useState(false)
  const [executablePath, setExecutablePath] = useState<string>('')

  useEffect(() => {
    checkExecutableAvailability()
    checkProcessStatus()
    // 每5秒检查一次进程状态
    const interval = setInterval(checkProcessStatus, 5000)
    return () => clearInterval(interval)
  }, [])

  const checkExecutableAvailability = async () => {
    try {
      const exeName = 'MakingMcp.Web.exe'
      const exists = await ResourceManager.checkExecutableExists(exeName)
      setIsExecutableAvailable(exists)
      
      if (exists) {
        const path = await ResourceManager.getExecutablePath(exeName)
        setExecutablePath(path)
        addLog('info', `找到可执行文件: ${path}`)
      } else {
        addLog('error', `未找到可执行文件: ${exeName}`)
        setError('未找到 MakingMcp.Web.exe 文件，请确保文件已放置在 resources/bin/windows/ 目录中')
      }
    } catch (err) {
      const errorMsg = `检查可执行文件失败: ${err}`
      setError(errorMsg)
      addLog('error', errorMsg)
    }
  }

  const checkProcessStatus = async () => {
    try {
      // 检查进程是否在运行
      const result = await invoke<string>('execute_command', {
        command: 'tasklist',
        args: ['/FI', 'IMAGENAME eq MakingMcp.Web.exe', '/FO', 'CSV']
      })
      
      const isRunning = result.includes('MakingMcp.Web.exe')
      
      if (isRunning && !processStatus.isRunning) {
        // 进程刚启动
        setProcessStatus({
          isRunning: true,
          startTime: new Date()
        })
        addLog('info', 'MakingMcp.Web.exe 进程正在运行')
      } else if (!isRunning && processStatus.isRunning) {
        // 进程刚停止
        setProcessStatus({ isRunning: false })
        addLog('warn', 'MakingMcp.Web.exe 进程已停止')
      }
    } catch (err) {
      // 静默处理错误，避免频繁显示错误信息
      console.error('检查进程状态失败:', err)
    }
  }

  const startProcess = async () => {
    if (!isExecutableAvailable) {
      setError('可执行文件不可用')
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      addLog('info', '正在启动 MakingMcp.Web.exe...')
      
      // 使用 PowerShell 启动进程
      await invoke<string>('execute_command', {
        command: 'powershell',
        args: [
          '-Command', 
          `Start-Process -FilePath "${executablePath}" -WindowStyle Normal`
        ]
      })
      
      // 等待一段时间后检查状态
      setTimeout(() => {
        checkProcessStatus()
      }, 2000)
      
      addLog('info', '启动命令已执行')
    } catch (err) {
      const errorMsg = `启动进程失败: ${err}`
      setError(errorMsg)
      addLog('error', errorMsg)
    } finally {
      setIsLoading(false)
    }
  }

  const stopProcess = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      addLog('info', '正在停止 MakingMcp.Web.exe...')
      
      // 使用 taskkill 停止进程
      await invoke<string>('execute_command', {
        command: 'taskkill',
        args: ['/F', '/IM', 'MakingMcp.Web.exe']
      })
      
      // 等待一段时间后检查状态
      setTimeout(() => {
        checkProcessStatus()
      }, 1000)
      
      addLog('info', '停止命令已执行')
    } catch (err) {
      const errorMsg = `停止进程失败: ${err}`
      setError(errorMsg)
      addLog('error', errorMsg)
    } finally {
      setIsLoading(false)
    }
  }

  const restartProcess = async () => {
    setIsLoading(true)
    try {
      if (processStatus.isRunning) {
        await stopProcess()
        // 等待进程完全停止
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
      await startProcess()
    } finally {
      setIsLoading(false)
    }
  }

  const addLog = (level: LogEntry['level'], message: string) => {
    const newLog: LogEntry = {
      timestamp: new Date(),
      level,
      message
    }
    setLogs(prev => [...prev.slice(-99), newLog]) // 保留最近100条日志
  }

  const clearLogs = () => {
    setLogs([])
  }

  const getStatusIcon = () => {
    if (processStatus.isRunning) {
      return <CheckCircle className="h-4 w-4 text-green-500" />
    } else {
      return <XCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = () => {
    if (processStatus.isRunning) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
          {getStatusIcon()}
          <span className="ml-1">运行中</span>
        </Badge>
      )
    } else {
      return (
        <Badge variant="secondary">
          {getStatusIcon()}
          <span className="ml-1">已停止</span>
        </Badge>
      )
    }
  }

  const formatLogLevel = (level: LogEntry['level']) => {
    const colors = {
      info: 'text-blue-600',
      warn: 'text-yellow-600',
      error: 'text-red-600'
    }
    return colors[level]
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">MCP服务管理</h1>
          <p className="text-muted-foreground mt-1">
            管理 MakingMcp.Web.exe 进程的启动、停止和监控
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={checkProcessStatus}
          disabled={isLoading}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          刷新状态
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 进程状态卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            进程状态
          </CardTitle>
          <CardDescription>
            MakingMcp.Web.exe 进程的当前状态和控制
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">状态:</span>
                {getStatusBadge()}
              </div>
              {processStatus.startTime && (
                <div className="text-sm text-muted-foreground">
                  启动时间: {processStatus.startTime.toLocaleString()}
                </div>
              )}
              {executablePath && (
                <div className="text-sm text-muted-foreground">
                  可执行文件: {executablePath}
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={startProcess}
                disabled={isLoading || processStatus.isRunning || !isExecutableAvailable}
                size="sm"
              >
                <Play className="h-4 w-4 mr-2" />
                启动
              </Button>
              <Button
                onClick={stopProcess}
                disabled={isLoading || !processStatus.isRunning}
                variant="destructive"
                size="sm"
              >
                <Square className="h-4 w-4 mr-2" />
                停止
              </Button>
              <Button
                onClick={restartProcess}
                disabled={isLoading || !isExecutableAvailable}
                variant="outline"
                size="sm"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                重启
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 日志监控卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            操作日志
          </CardTitle>
          <CardDescription>
            进程操作和状态变化的日志记录
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-muted-foreground">
              共 {logs.length} 条日志
            </span>
            <Button
              onClick={clearLogs}
              variant="outline"
              size="sm"
            >
              清空日志
            </Button>
          </div>
          
          <ScrollArea className="h-64 w-full border rounded-md p-4">
            {logs.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                暂无日志记录
              </div>
            ) : (
              <div className="space-y-2">
                {logs.map((log, index) => (
                  <div key={index} className="text-sm font-mono">
                    <span className="text-muted-foreground">
                      [{log.timestamp.toLocaleTimeString()}]
                    </span>
                    <span className={`ml-2 font-medium ${formatLogLevel(log.level)}`}>
                      [{log.level.toUpperCase()}]
                    </span>
                    <span className="ml-2">{log.message}</span>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* 配置信息卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            配置信息
          </CardTitle>
          <CardDescription>
            MakingMcp.Web.exe 的配置和环境信息
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">可执行文件状态</label>
              <div className="mt-1">
                {isExecutableAvailable ? (
                  <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    可用
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <XCircle className="h-3 w-3 mr-1" />
                    不可用
                  </Badge>
                )}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">自动检查间隔</label>
              <div className="mt-1 text-sm text-muted-foreground">5秒</div>
            </div>
          </div>
          
          {executablePath && (
            <div>
              <label className="text-sm font-medium">文件路径</label>
              <div className="mt-1 p-2 bg-muted rounded-md text-sm font-mono">
                {executablePath}
              </div>
            </div>
          )}
          
          <div>
            <label className="text-sm font-medium">使用说明</label>
            <div className="mt-1 text-sm text-muted-foreground space-y-1">
              <p>• 确保 MakingMcp.Web.exe 文件已放置在 resources/bin/windows/ 目录中</p>
              <p>• 点击"启动"按钮启动 MCP 服务</p>
              <p>• 系统会自动监控进程状态，每5秒检查一次</p>
              <p>• 可以通过"停止"或"重启"按钮控制进程</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default MCPManagement