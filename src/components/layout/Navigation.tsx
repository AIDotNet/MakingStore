import React, { useState, useEffect } from 'react'
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import {
  Home,
  BookOpen,
  Bot,
  Store,
  Settings,
} from 'lucide-react'

const menuItems = [
  {
    title: '仪表盘',
    url: '/dashboard',
    icon: Home,
  },
  {
    title: 'Codex管理',
    url: '/codex',
    icon: BookOpen,
  },
  {
    title: 'Claude Code管理',
    url: '/claude-code',
    icon: Bot,
  },
  {
    title: 'Claude Code Store',
    url: '/claude-code-store',
    icon: Store,
  },
  {
    title: '系统设置',
    url: '/settings',
    icon: Settings,
  },
]

export function Navigation() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname || '/')

  // 监听路由变化
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const handleNavClick = (url: string) => {
    window.history.pushState({}, '', url)
    setCurrentPath(url)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  // 检查是否为当前活动路由
  const isActiveRoute = (url: string) => {
    // 处理根路径的情况
    if (currentPath === '/' && url === '/dashboard') {
      return true
    }
    return currentPath === url
  }

  return (
    <SidebarGroup>
      <SidebarMenu>
        {menuItems.map((item) => (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton 
              asChild
              isActive={isActiveRoute(item.url)}
            >
              <button
                onClick={() => handleNavClick(item.url)}
                className="flex items-center gap-2 w-full text-left"
              >
                <item.icon className="h-4 w-4" />
                <span>{item.title}</span>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}