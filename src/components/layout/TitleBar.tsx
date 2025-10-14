import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Minus, Square, X, Copy } from 'lucide-react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { SidebarTrigger } from '../ui/sidebar'
import { Separator } from '../ui/separator'

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false)
  const [appWindow, setAppWindow] = useState<any>(null)

  useEffect(() => {
    const initWindow = async () => {
      try {
        const window = getCurrentWindow()
        setAppWindow(window)
        
        // 监听窗口最大化状态变化
        const unlistenResize = await window.onResized(async () => {
          const maximized = await window.isMaximized()
          setIsMaximized(maximized)
        })
        
        // 监听窗口状态变化事件
        const unlistenStateChange = await window.listen('tauri://resize', async () => {
          const maximized = await window.isMaximized()
          setIsMaximized(maximized)
        })
        
        // 初始化最大化状态
        const initialMaximized = await window.isMaximized()
        setIsMaximized(initialMaximized)
        
        return () => {
          unlistenResize()
          unlistenStateChange()
        }
      } catch (error) {
        console.warn('Tauri window API not available:', error)
        return () => {}
      }
    }
    
    let cleanup: (() => void) | undefined
    initWindow().then(cleanupFn => {
      cleanup = cleanupFn
    }).catch(error => {
      console.warn('Failed to initialize window:', error)
    })
    
    return () => {
      if (cleanup) cleanup()
    }
  }, [])

  const handleMinimize = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (appWindow) {
      try {
        await appWindow.minimize()
      } catch (error) {
        console.error('Failed to minimize window:', error)
      }
    }
  }

  const handleMaximize = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (appWindow) {
      try {
        if (isMaximized) {
          await appWindow.unmaximize()
        } else {
          await appWindow.maximize()
        }
      } catch (error) {
        console.error('Failed to toggle maximize window:', error)
      }
    }
  }

  const handleClose = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (appWindow) {
      try {
        await appWindow.close()
      } catch (error) {
        console.error('Failed to close window:', error)
      }
    }
  }

  return (
    <div 
      className="flex items-center justify-between h-10 bg-background/95 backdrop-blur-sm border-b border-border/50 select-none transition-colors duration-200"
      data-tauri-drag-region
    >
      {/* 左侧：侧边栏触发器 */}
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
      </div>
      
      <div 
        className="flex-1 h-full"
        data-tauri-drag-region
      />

      {/* 右侧：窗口控制按钮 */}
      <div className="flex items-center h-full">
        <Button
          variant="ghost"
          size="sm"
          className="h-10 w-12 p-0 hover:bg-muted/80 rounded-none transition-colors duration-150 group"
          onClick={handleMinimize}
        >
          <Minus className="h-4 w-4 text-foreground/70 group-hover:text-foreground transition-colors" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          className="h-10 w-12 p-0 hover:bg-muted/80 rounded-none transition-colors duration-150 group"
          onClick={handleMaximize}
        >
          {isMaximized ? (
            <Copy className="h-4 w-4 text-foreground/70 group-hover:text-foreground transition-colors" />
          ) : (
            <Square className="h-4 w-4 text-foreground/70 group-hover:text-foreground transition-colors" />
          )}
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          className="h-10 w-12 p-0 hover:bg-red-500/90 hover:text-white rounded-none transition-colors duration-150 group"
          onClick={handleClose}
        >
          <X className="h-4 w-4 text-foreground/70 group-hover:text-white transition-colors" />
        </Button>
      </div>
    </div>
  )
}