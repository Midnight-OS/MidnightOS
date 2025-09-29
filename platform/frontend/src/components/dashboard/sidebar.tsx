"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { 
  LayoutDashboard, 
  Bot, 
  Wallet, 
  Users, 
  Settings,
  HelpCircle,
  LogOut,
  Archive,
  Bell,
  Shield,
  MessageSquare,
  ChevronDown,
  ChevronRight
} from "lucide-react"

interface BotInfo {
  id: string;
  name: string;
  platforms?: {
    webChat?: { enabled: boolean };
  };
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [botCount, setBotCount] = useState(0)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [bots, setBots] = useState<BotInfo[]>([])
  const [chatsExpanded, setChatsExpanded] = useState(true)
  
  useEffect(() => {
    // Get bots from API
    const fetchBots = async () => {
      try {
        const token = localStorage.getItem('authToken')
        if (token) {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api'}/bots`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          if (response.ok) {
            const data = await response.json()
            setBots(data.bots || [])
            setBotCount(data.bots?.length || 0)
          }
        }
      } catch (error) {
        console.error('Failed to fetch bots:', error)
      }
    }
    
    // Get user email
    const email = localStorage.getItem('userEmail')
    setUserEmail(email)
    
    fetchBots()
  }, [pathname])
  
  const handleLogout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('userEmail')
    router.push('/login')
  }
  
  const menuItems = [
    { 
      id: "overview", 
      label: "Overview", 
      href: "/dashboard",
      icon: LayoutDashboard,
      description: "Dashboard overview"
    },
    { 
      id: "bots", 
      label: "My Bots", 
      href: "/dashboard/bots",
      icon: Bot,
      badge: botCount > 0 ? botCount.toString() : undefined,
      description: "Manage your bots"
    },
    { 
      id: "wallet", 
      label: "Wallet", 
      href: "/dashboard/wallet",
      icon: Wallet,
      description: "Midnight wallet"
    },
    { 
      id: "treasury", 
      label: "DAO Treasury", 
      href: "/dashboard/treasury",
      icon: Archive,
      description: "Treasury management"
    },
  ]

  const bottomItems = [
    { id: "help", label: "Documentation", href: "https://docs.midnight.network", icon: HelpCircle, external: true },
  ]

  return (
    <div className="floating-sidebar hidden md:block z-40">
      <div className="p-4 h-full flex flex-col">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-3 mb-6 px-2">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
            <Shield className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <div className="font-semibold text-lg">MidnightOS</div>
            <div className="text-xs text-muted-foreground">Blockchain Bots</div>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || 
                           (item.href !== "/dashboard" && pathname.startsWith(item.href))
            
            return (
              <Link key={item.id} href={item.href}>
                <div className={`${isActive ? "sidebar-item-active" : "sidebar-item"}`}>
                  <Icon className="w-5 h-5" />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {item.badge}
                    </span>
                  )}
                </div>
              </Link>
            )
          })}

          {/* Chat Section */}
          {bots.length > 0 && (
            <div className="mt-6">
              <button
                onClick={() => setChatsExpanded(!chatsExpanded)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {chatsExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <MessageSquare className="w-4 h-4" />
                <span className="flex-1 text-left">Bot Chats</span>
                <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                  {bots.filter(bot => bot.platforms?.webChat?.enabled).length}
                </span>
              </button>
              
              {chatsExpanded && (
                <div className="mt-1 space-y-1 pl-4">
                  {bots.map((bot) => {
                    const chatPath = `/dashboard/bots/${bot.id}/chat`
                    const isActive = pathname === chatPath
                    const isChatEnabled = bot.platforms?.webChat?.enabled
                    
                    return (
                      <Link 
                        key={bot.id} 
                        href={chatPath}
                        className={!isChatEnabled ? 'opacity-50 pointer-events-none' : ''}
                      >
                        <div className={`${isActive ? "sidebar-item-active text-sm" : "sidebar-item text-sm"} py-1.5`}>
                          <div className={`w-2 h-2 rounded-full ${isChatEnabled ? 'bg-green-500' : 'bg-gray-400'}`} />
                          <span className="flex-1 truncate">{bot.name}</span>
                          {!isChatEnabled && (
                            <span className="text-xs text-muted-foreground">off</span>
                          )}
                        </div>
                      </Link>
                    )
                  })}
                  
                  {bots.filter(bot => bot.platforms?.webChat?.enabled).length === 0 && (
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      No bots have web chat enabled
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Bottom Items */}
        <div className="border-t pt-4 mt-4 space-y-1">
          {bottomItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            
            if (item.external) {
              return (
                <a key={item.id} href={item.href} target="_blank" rel="noopener noreferrer">
                  <div className="sidebar-item">
                    <Icon className="w-5 h-5" />
                    <span className="flex-1 text-sm">{item.label}</span>
                  </div>
                </a>
              )
            }
            
            return (
              <Link key={item.id} href={item.href}>
                <div className={`sidebar-item ${isActive ? "bg-accent" : ""}`}>
                  <Icon className="w-5 h-5" />
                  <span className="flex-1 text-sm">{item.label}</span>
                </div>
              </Link>
            )
          })}
          
          {userEmail && (
            <div className="px-3 py-2 mb-2 text-xs text-muted-foreground border-t pt-3">
              {userEmail}
            </div>
          )}
          
          <button 
            onClick={handleLogout}
            className="sidebar-item w-full text-destructive hover:bg-destructive/10"
          >
            <LogOut className="w-5 h-5" />
            <span className="flex-1 text-left text-sm">Logout</span>
          </button>
        </div>
      </div>
    </div>
  )
}