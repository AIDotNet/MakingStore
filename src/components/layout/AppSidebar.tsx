import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import { Logo } from './Logo'
import { Navigation } from './Navigation'
import { ThemeToggle } from './ThemeToggle'

export function AppSidebar() {
  const { state } = useSidebar()
  const isCollapsed = state === 'collapsed'

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Logo />
      </SidebarHeader>

      <SidebarContent>
        <Navigation />
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>                
              <ThemeToggle />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}