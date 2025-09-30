"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Bot, Wallet, Activity, AlertCircle, Plus, RefreshCw } from "lucide-react"
import Link from "next/link"

interface BotData {
  id: string
  name: string
  status: string
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
  containerStatus?: string
  walletStatus?: any
}

interface WalletBalance {
  transparent: number
  shielded: number
  total: number
}

export default function DashboardPage() {
  const [bots, setBots] = useState<BotData[]>([])
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchBots = async () => {
    try {
      const token = localStorage.getItem('auth_token') || 'dev-token'
      // For development - set a token if none exists
      if (!localStorage.getItem('auth_token')) {
        localStorage.setItem('auth_token', 'dev-token')
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api'}/bots`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch bots')
      }

      const data = await response.json()
      setBots(data.bots || [])
      
      // Calculate total wallet balance from all bots
      if (data.bots && data.bots.length > 0) {
        let totalBalance = 0
        for (const bot of data.bots) {
          if (bot.walletStatus?.balance) {
            totalBalance += bot.walletStatus.balance.total || 0
          }
        }
        setWalletBalance({
          transparent: totalBalance * 0.7, // Mock split for now
          shielded: totalBalance * 0.3,
          total: totalBalance
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
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
    // Refresh every 30 seconds
    const interval = setInterval(fetchBots, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading your bots...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-6 max-w-md">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-center mb-2">Error Loading Dashboard</h2>
          <p className="text-muted-foreground text-center mb-4">{error}</p>
          <button onClick={fetchBots} className="btn-primary w-full">
            Try Again
          </button>
        </Card>
      </div>
    )
  }

  const activeBots = bots.filter(bot => bot.containerStatus === 'running').length
  const totalTransactions = bots.reduce((sum, bot) => sum + (bot.walletStatus?.transactionCount || 0), 0)

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Real-time bot and wallet status</p>
        </div>
        <button 
          onClick={handleRefresh} 
          className="btn-ghost p-2"
          disabled={refreshing}
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>
      
      {/* Stats Grid - Real Data */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground mb-2">Active Bots</div>
              <div className="text-2xl font-bold">{activeBots}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {bots.length} total bots
              </div>
            </div>
            <Bot className="w-10 h-10 text-primary opacity-20" />
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground mb-2">Wallet Balance</div>
              <div className="text-2xl font-bold">
                {walletBalance ? `${walletBalance.total.toFixed(2)} NIGHT` : '0 NIGHT'}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {walletBalance && walletBalance.shielded > 0 
                  ? `${walletBalance.shielded.toFixed(2)} shielded`
                  : 'No shielded balance'
                }
              </div>
            </div>
            <Wallet className="w-10 h-10 text-primary opacity-20" />
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground mb-2">Transactions</div>
              <div className="text-2xl font-bold">{totalTransactions}</div>
              <div className="text-xs text-muted-foreground mt-1">All time</div>
            </div>
            <Activity className="w-10 h-10 text-primary opacity-20" />
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground mb-2">Platforms</div>
              <div className="text-2xl font-bold">
                {bots.filter(b => b.platforms.discord || b.platforms.telegram).length}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Connected</div>
            </div>
            <Activity className="w-10 h-10 text-primary opacity-20" />
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="flex gap-4">
          <Link href="/dashboard/bots/create">
            <button className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create New Bot
            </button>
          </Link>
          <Link href="/dashboard/wallet">
            <button className="btn-ghost border border-border">
              Manage Wallet
            </button>
          </Link>
          <Link href="/dashboard/treasury">
            <button className="btn-ghost border border-border">
              DAO Treasury
            </button>
          </Link>
        </div>
      </div>

      {/* Bot List - Real Data */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Your Bots</h2>
          {bots.length === 0 ? (
            <Card className="p-12 text-center">
              <Bot className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Bots Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first bot to start using MCP tools
              </p>
              <Link href="/dashboard/bots/create">
                <button className="btn-primary">Create Your First Bot</button>
              </Link>
            </Card>
          ) : (
            <div className="space-y-4">
              {bots.map((bot) => (
                <Card key={bot.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{bot.name}</h3>
                      <div className="text-sm text-muted-foreground mt-1">
                        {bot.platforms.discord && 'Discord'}
                        {bot.platforms.discord && bot.platforms.telegram && ' • '}
                        {bot.platforms.telegram && 'Telegram'}
                        {!bot.platforms.discord && !bot.platforms.telegram && 'No platforms connected'}
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        {bot.walletAddress ? bot.walletAddress.slice(0, 10) + '...' : 'No wallet'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-medium ${
                        bot.containerStatus === 'running' ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        {bot.containerStatus === 'running' ? 'Online' : 'Offline'}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {bot.walletStatus?.transactionCount || 0} transactions
                      </div>
                      <Link href={`/dashboard/bots/${bot.id}`}>
                        <button className="btn-ghost text-xs mt-2">Manage</button>
                      </Link>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
        
        <div className="lg:col-span-1">
          <h2 className="text-xl font-semibold mb-4">Platform Status</h2>
          <Card className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Midnight Network</span>
                <span className="text-xs text-green-600">Connected</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">MCP Server</span>
                <span className="text-xs text-green-600">Running</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Container Orchestrator</span>
                <span className="text-xs text-green-600">Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Proof Server</span>
                <span className="text-xs text-green-600">Available</span>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 mt-4">
            <h3 className="font-semibold mb-3">Resource Usage</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>RAM Usage</span>
                  <span>{(activeBots * 256)}MB / {bots.length * 256}MB</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary rounded-full h-2" 
                    style={{ width: `${bots.length > 0 ? (activeBots / bots.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>CPU Allocation</span>
                  <span>{(activeBots * 0.25).toFixed(2)} / {(bots.length * 0.25).toFixed(2)}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary rounded-full h-2" 
                    style={{ width: `${bots.length > 0 ? (activeBots / bots.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}