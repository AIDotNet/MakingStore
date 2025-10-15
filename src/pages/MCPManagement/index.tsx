import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
import { listen } from '@tauri-apps/api/event'
import { Input } from '@/components/ui/input'
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

interface EnvVars {
  Urls: string
  OPENAI_API_KEY: string
  OPENAI_ENDPOINT: string
  TASK_MODEL: string
  EMBEDDING_MODEL: string
  TAVILY_API_KEY: string
}

const MCPManagement: React.FC = () => {
  const [processStatus, setProcessStatus] = useState<ProcessStatus>({ isRunning: false })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isExecutableAvailable, setIsExecutableAvailable] = useState(false)
  const [executablePath, setExecutablePath] = useState<string>('')
  const [envVars, setEnvVars] = useState<EnvVars>({
    Urls: 'http://localhost:6511',
    OPENAI_API_KEY: 'Your_API_Key_Here',
    OPENAI_ENDPOINT: 'https://api.token-ai.cn/v1',
    TASK_MODEL: 'gpt-4.1',
    EMBEDDING_MODEL: '',
    TAVILY_API_KEY: ''
  })

  useEffect(() => {
    checkExecutableAvailability()
    checkProcessStatus()

    // 订阅后端日志事件
    let unlistenLog: (() => void) | null = null
    let unlistenExit: (() => void) | null = null
    ;(async () => {
      try {
        unlistenLog = await listen<{ level: 'info' | 'warn' | 'error'; message: string }>('mcp-log', (event) => {
          const payload = event.payload
          addLog(payload.level, payload.message)
        })
        unlistenExit = await listen<{ code?: number }>('mcp-exit', (event) => {
          const code = (event.payload as any)?.code
          addLog('warn', `进程退出${code !== undefined ? `，退出码 ${code}` : ''}`)
          setProcessStatus({ isRunning: false })
        })
      } catch (err) {
        console.error('订阅日志事件失败:', err)
      }
    })()

    // 每5秒检查一次进程状态
    const interval = setInterval(checkProcessStatus, 5000)
    return () => {
      clearInterval(interval)
      if (unlistenLog) unlistenLog()
      if (unlistenExit) unlistenExit()
    }
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
      addLog('info', '正在托管启动 MakingMcp.Web.exe（隐藏控制台）...')
      const payloadEnv: Record<string, string> = {}
      Object.entries(envVars).forEach(([k, v]) => {
        if (v != null && v.toString().trim() !== '') {
          payloadEnv[k] = v.toString()
        }
      })
      await invoke<string>('start_mcp_service', { env: payloadEnv })
      
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
      addLog('info', '正在停止托管的 MakingMcp.Web.exe...')
      await invoke<string>('stop_mcp_service')
      
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

  // 环境变量输入渲染函数（在组件作用域内）
  const renderEnvInput = (
    label: keyof EnvVars,
    placeholder?: string
  ) => (
    <div className="grid grid-cols-3 items-center gap-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <Input
        className="col-span-2"
        value={envVars[label] ?? ''}
        placeholder={placeholder || ''}
        onChange={(e) =>
          setEnvVars((prev) => ({ ...prev, [label]: e.target.value }))
        }
      />
    </div>
  )

  // 重置环境变量到默认值（在组件作用域内）
  const resetDefaultEnvVars = () => {
    setEnvVars({
      Urls: 'http://localhost:6511',
      OPENAI_API_KEY: 'Your_API_Key_Here',
      OPENAI_ENDPOINT: 'https://api.token-ai.cn/v1',
      TASK_MODEL: 'gpt-4.1',
      EMBEDDING_MODEL: '',
      TAVILY_API_KEY: ''
    })
    addLog('info', '已重置环境变量为默认值')
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

      {/* 环境变量卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            环境变量
          </CardTitle>
          <CardDescription>
            为 MCP 服务设置启动时的环境变量（空值将被忽略）
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {renderEnvInput('Urls', 'http://localhost:6511')}
            {renderEnvInput('OPENAI_API_KEY', 'Your_API_Key_Here')}
            {renderEnvInput('OPENAI_ENDPOINT', 'https://api.token-ai.cn/v1')}
            {renderEnvInput('TASK_MODEL', 'gpt-4.1')}
            {renderEnvInput('EMBEDDING_MODEL', '可留空')}
            {renderEnvInput('TAVILY_API_KEY', '可留空')}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={resetDefaultEnvVars}>
              重置为默认
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => addLog('info', '环境变量已更新（将在启动时生效）')}
            >
              应用变更
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default MCPManagement