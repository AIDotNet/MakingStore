import React from 'react'
import { SidebarInset } from '@/components/ui/sidebar'

interface MainContentProps {
  children: React.ReactNode
}

export function MainContent({ children }: MainContentProps) {
  return (
    <SidebarInset style={{
      paddingTop: '16px',
      paddingBottom: '16px',
    }} 
    className="overflow-auto"
    >
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <main  className="flex-1">
          {children}
        </main>
      </div>
    </SidebarInset>
  )
}