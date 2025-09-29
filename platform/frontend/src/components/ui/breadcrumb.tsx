"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export interface BreadcrumbItem {
  title: string
  href?: string
  icon?: React.ReactNode
}

interface BreadcrumbProps {
  className?: string
  items?: BreadcrumbItem[]
  separator?: React.ReactNode
}

export function Breadcrumb({ 
  className, 
  items,
  separator = <ChevronRight className="h-4 w-4" />
}: BreadcrumbProps) {
  const pathname = usePathname()
  
  // Auto-generate breadcrumbs from path if items not provided
  const breadcrumbItems = React.useMemo(() => {
    if (items) return items
    
    const segments = pathname.split('/').filter(Boolean)
    const generatedItems: BreadcrumbItem[] = [
      { title: 'Home', href: '/', icon: <Home className="h-4 w-4" /> }
    ]
    
    let currentPath = ''
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`
      const title = segment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
      
      generatedItems.push({
        title,
        href: index === segments.length - 1 ? undefined : currentPath
      })
    })
    
    return generatedItems
  }, [pathname, items])

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center space-x-2 text-sm text-muted-foreground", className)}
    >
      {breadcrumbItems.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && <span className="text-muted-foreground/50">{separator}</span>}
          <div className="flex items-center gap-1">
            {item.icon}
            {item.href ? (
              <Link
                href={item.href}
                className="font-medium hover:text-foreground transition-colors"
              >
                {item.title}
              </Link>
            ) : (
              <span className="font-medium text-foreground">{item.title}</span>
            )}
          </div>
        </React.Fragment>
      ))}
    </nav>
  )
}

export function BreadcrumbItem({ 
  children, 
  className,
  ...props 
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span 
      className={cn("inline-flex items-center gap-1.5", className)} 
      {...props}
    >
      {children}
    </span>
  )
}

export function BreadcrumbLink({
  href,
  children,
  className,
  ...props
}: React.ComponentProps<typeof Link>) {
  return (
    <Link
      href={href}
      className={cn(
        "font-medium hover:text-foreground transition-colors",
        className
      )}
      {...props}
    >
      {children}
    </Link>
  )
}

export function BreadcrumbSeparator({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("text-muted-foreground/50 mx-2", className)}
      {...props}
    >
      {children || <ChevronRight className="h-4 w-4" />}
    </span>
  )
}