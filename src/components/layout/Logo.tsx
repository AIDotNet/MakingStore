import { SidebarMenu, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar'
import { Store } from 'lucide-react'

export function Logo() {
  const { state } = useSidebar()
  const isCollapsed = state === 'collapsed'

  if (isCollapsed) {
    return (
      <SidebarMenu className="mx-1 my-2">
        <SidebarMenuItem>
          <div className="flex items-center justify-center w-6 h-8 rounded-md bg-gradient-to-br  shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105 group">
            <Store className="w-4 h-4 text-white group-hover:rotate-12 transition-transform duration-200" />
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  return (
    <SidebarMenu className="m-2 p-2">
      <SidebarMenuItem>
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-sidebar-accent/50 transition-all duration-200 group cursor-pointer">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 shadow-md group-hover:shadow-lg transition-all duration-200 group-hover:scale-105">
            <Store className="w-5 h-5 text-white group-hover:rotate-12 transition-transform duration-200" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg text-sidebar-foreground group-hover:text-sidebar-primary transition-colors duration-200">
              MakingStore
            </span>
            <span className="text-xs text-sidebar-foreground/60 group-hover:text-sidebar-foreground/80 transition-colors duration-200">
              代码工具商店
            </span>
          </div>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}