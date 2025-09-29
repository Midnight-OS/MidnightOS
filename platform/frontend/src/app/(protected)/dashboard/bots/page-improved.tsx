"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Search, Grid3x3, List, RefreshCw, AlertCircle, Bot, Loader2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import Link from "next/link"
import { useBots, useCreateBot, useBotAction } from "@/hooks/api/useBots"
import toast from "react-hot-toast"

interface BotData {
  id: string
  name: string
  status: string
  containerStatus?: string
  walletAddress?: string
  walletPort?: number
  features: {
    wallet: boolean
    dao: boolean
    marketplace: boolean
  }
  platforms: {
    discord?: { token: string; serverId?: string }
    telegram?: { token: string }
  }
  walletStatus?: {
    balance?: { total: number }
    transactionCount?: number
  }
  createdAt?: string
  tier?: string
}

// Skeleton component for loading state
const BotCardSkeleton = () => (
  <Card className="p-6 animate-pulse">
    <div className="flex items-center justify-between mb-4">
      <div className="h-6 bg-gray-200 rounded w-1/3"></div>
      <div className="h-4 bg-gray-200 rounded w-16"></div>
    </div>
    <div className="space-y-3">
      <div className="h-4 bg-gray-200 rounded w-full"></div>
      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
    </div>
    <div className="mt-4 h-10 bg-gray-200 rounded"></div>
  </Card>
)

export default function ImprovedBotsPage() {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  
  // Using TanStack Query hooks
  const { data, isLoading, error, refetch, isRefetching } = useBots()
  const createBotMutation = useCreateBot()
  const botActionMutation = useBotAction()

  const handleRefresh = () => {
    refetch()
  }

  const handleBotAction = async (botId: string, action: 'start' | 'stop' | 'pause' | 'resume') => {
    try {
      await botActionMutation.mutateAsync({ botId, action })
      toast.success(`Bot ${action}ed successfully`)
    } catch (error: any) {
      toast.error(`Failed to ${action} bot: ${error.message}`)
    }
  }

  const bots = data?.bots || []

  const filteredBots = bots.filter((bot: BotData) => {
    const matchesSearch = bot.name.toLowerCase().includes(searchQuery.toLowerCase())
    const status = bot.containerStatus === 'running' ? 'online' : 'offline'
    const matchesStatus = filterStatus === "all" || status === filterStatus
    return matchesSearch && matchesStatus
  })

  const getPlatforms = (bot: BotData): string[] => {
    const platforms = []
    if (bot.platforms?.discord) platforms.push('Discord')
    if (bot.platforms?.telegram) platforms.push('Telegram')
    return platforms
  }

  // Loading state with skeletons
  if (isLoading) {
    return (
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Bot Management</h1>
            <p className="text-muted-foreground">Deploy and manage your Midnight blockchain bots</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <BotCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="p-6 max-w-md">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-center mb-2">Error Loading Bots</h2>
          <p className="text-muted-foreground text-center mb-4">
            {error instanceof Error ? error.message : 'Failed to load bots'}
          </p>
          <button onClick={() => refetch()} className="btn-primary w-full">
            Try Again
          </button>
        </Card>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Bot Management</h1>
          <p className="text-muted-foreground">Deploy and manage your Midnight blockchain bots</p>
        </div>
        <div className="flex gap-2 mt-4 sm:mt-0">
          <button 
            onClick={handleRefresh} 
            className="btn-ghost p-2"
            disabled={isRefetching}
          >
            <RefreshCw className={`w-5 h-5 ${isRefetching ? 'animate-spin' : ''}`} />
          </button>
          <Link href="/dashboard/bots/create">
            <button className="btn-primary flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Create New Bot
            </button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search bots..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-accent border border-border focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Status Filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">All Status</option>
          <option value="online">Running</option>
          <option value="offline">Stopped</option>
        </select>

        {/* View Mode */}
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded-lg ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "bg-accent"}`}
          >
            <Grid3x3 className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 rounded-lg ${viewMode === "list" ? "bg-primary text-primary-foreground" : "bg-accent"}`}
          >
            <List className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Refreshing indicator */}
      {isRefetching && (
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-white shadow-lg rounded-lg p-3 flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Refreshing...</span>
          </div>
        </div>
      )}

      {/* Bots Grid/List */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBots.map((bot: BotData) => (
            <Card key={bot.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">{bot.name}</h3>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  bot.containerStatus === 'running' 
                    ? 'bg-green-500/20 text-green-500' 
                    : 'bg-gray-500/20 text-gray-500'
                }`}>
                  {bot.containerStatus === 'running' ? 'Online' : 'Offline'}
                </span>
              </div>
              
              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Platforms</span>
                  <span>{getPlatforms(bot).join(', ') || 'None'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Wallet</span>
                  <span className="font-mono text-xs">
                    {bot.walletAddress ? bot.walletAddress.slice(0, 10) + '...' : 'Generating...'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Transactions</span>
                  <span>{bot.walletStatus?.transactionCount || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Balance</span>
                  <span>{bot.walletStatus?.balance?.total?.toFixed(2) || '0.00'} NIGHT</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                {bot.features?.wallet && (
                  <span className="px-2 py-1 bg-primary/10 rounded">Wallet</span>
                )}
                {bot.features?.dao && (
                  <span className="px-2 py-1 bg-primary/10 rounded">DAO</span>
                )}
                {bot.features?.marketplace && (
                  <span className="px-2 py-1 bg-primary/10 rounded">Market</span>
                )}
              </div>
              
              <div className="flex gap-2">
                {bot.containerStatus !== 'running' ? (
                  <button 
                    className="btn-primary flex-1 text-sm"
                    onClick={() => handleBotAction(bot.id, 'start')}
                    disabled={botActionMutation.isPending}
                  >
                    {botActionMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    ) : (
                      'Start'
                    )}
                  </button>
                ) : (
                  <button 
                    className="btn-ghost flex-1 text-sm"
                    onClick={() => handleBotAction(bot.id, 'stop')}
                    disabled={botActionMutation.isPending}
                  >
                    {botActionMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    ) : (
                      'Stop'
                    )}
                  </button>
                )}
                <Link href={`/dashboard/bots/${bot.id}`} className="flex-1">
                  <button className="btn-primary w-full text-sm">Manage</button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBots.map((bot: BotData) => (
            <Card key={bot.id} className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Bot className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{bot.name}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        bot.containerStatus === 'running'
                          ? 'bg-green-500/20 text-green-500'
                          : 'bg-gray-500/20 text-gray-500'
                      }`}>
                        {bot.containerStatus === 'running' ? 'Online' : 'Offline'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {getPlatforms(bot).join(' • ') || 'No platforms'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {bot.tier || 'Basic'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-sm font-semibold">{bot.walletStatus?.transactionCount || 0}</div>
                    <div className="text-xs text-muted-foreground">Transactions</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">
                      {bot.walletStatus?.balance?.total?.toFixed(2) || '0.00'}
                    </div>
                    <div className="text-xs text-muted-foreground">NIGHT</div>
                  </div>
                  <Link href={`/dashboard/bots/${bot.id}`}>
                    <button className="btn-primary px-4 py-2 text-sm">Manage</button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {filteredBots.length === 0 && !isLoading && (
        <Card className="p-12 text-center">
          <Bot className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No bots found</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery 
              ? "Try adjusting your search criteria" 
              : "Deploy your first Midnight blockchain bot to get started"}
          </p>
          {!searchQuery && (
            <Link href="/dashboard/bots/create">
              <button className="btn-primary">Create Your First Bot</button>
            </Link>
          )}
        </Card>
      )}
    </div>
  )
}