"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus, Search, Grid3x3, List, RefreshCw, AlertCircle, Bot } from "lucide-react"
import { Card } from "@/components/ui/card"
import Link from "next/link"
import apiClient from "@/lib/api-client"
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

export default function BotsPage() {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [bots, setBots] = useState<BotData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchBots = async () => {
    try {
      const data = await apiClient.getBots()
      setBots(data.bots || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bots')
      toast.error('Failed to fetch bots')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    fetchBots()
  }

  useEffect(() => {
    fetchBots()
  }, [])

  const filteredBots = bots.filter(bot => {
    const matchesSearch = bot.name.toLowerCase().includes(searchQuery.toLowerCase())
    const status = bot.containerStatus === 'running' ? 'online' : 'offline'
    const matchesStatus = filterStatus === "all" || status === filterStatus
    return matchesSearch && matchesStatus
  })

  const getPlatforms = (bot: BotData): string[] => {
    const platforms = []
    if (bot.platforms.discord) platforms.push('Discord')
    if (bot.platforms.telegram) platforms.push('Telegram')
    return platforms
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading your bots...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="p-6 max-w-md">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-center mb-2">Error Loading Bots</h2>
          <p className="text-muted-foreground text-center mb-4">{error}</p>
          <button onClick={fetchBots} className="btn-primary w-full">
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
            disabled={refreshing}
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
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

      {/* Bots Grid/List */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBots.map((bot) => (
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
                {bot.features.wallet && (
                  <span className="px-2 py-1 bg-primary/10 rounded">Wallet</span>
                )}
                {bot.features.dao && (
                  <span className="px-2 py-1 bg-primary/10 rounded">DAO</span>
                )}
                {bot.features.marketplace && (
                  <span className="px-2 py-1 bg-primary/10 rounded">Market</span>
                )}
              </div>
              
              <Link href={`/dashboard/bots/${bot.id}`}>
                <button className="btn-primary w-full text-sm">Manage Bot</button>
              </Link>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBots.map((bot) => (
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
                  <div className="text-right">
                    <div className="text-sm font-semibold">
                      {bot.walletAddress ? 'Active' : 'Pending'}
                    </div>
                    <div className="text-xs text-muted-foreground">Wallet</div>
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
      {filteredBots.length === 0 && !loading && (
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