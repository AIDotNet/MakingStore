import React from 'react'
import { SidebarInset } from '@/components/ui/sidebar'

interface MainContentProps {
  children: React.ReactNode
}

export function MainContent({ children }: MainContentProps) {
  return (
    <SidebarInset>
      <div style={{
        paddingTop: '16px'
      }} className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <main className="flex-1">
          {children}
        </main>
      </div>
    </SidebarInset>
  )
}