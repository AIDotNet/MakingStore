import React from 'react'
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'

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