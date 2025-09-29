"use client"

import { Sidebar } from "@/components/dashboard/sidebar"
import { DashboardHeader } from "@/components/dashboard/header"
import { Breadcrumb } from "@/components/ui/breadcrumb"
import { useState } from "react"

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="pl-0 md:pl-80">
        <DashboardHeader />
        
        {/* Breadcrumbs */}
        <div className="px-6 py-3 border-b border-border">
          <Breadcrumb />
        </div>
        
        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}