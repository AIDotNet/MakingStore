import { SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from './AppSidebar'
import { MainContent } from './MainContent'
import { TitleBar } from './TitleBar'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex flex-col min-h-screen w-full">
        <TitleBar />
        <div className="flex flex-1">
          <AppSidebar />
          <MainContent>
            {children}
          </MainContent>
        </div>
      </div>
    </SidebarProvider>
  )
}