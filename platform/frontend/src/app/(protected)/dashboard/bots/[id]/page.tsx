"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { 
  ArrowLeft, Bot, Wallet, Activity, Settings, Terminal, 
  PlayCircle, PauseCircle, StopCircle, RefreshCw, AlertCircle,
  CheckCircle, MessageSquare, Shield, Users, DollarSign,
  Copy, ExternalLink
} from "lucide-react"

interface BotDetails {
  id: string
  name: string
  status: string
  containerStatus?: string
  tenantId?: string
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
    balance: {
      transparent: number
      shielded: number
      total: number
    }
    transactionCount: number
    lastActivity?: string
  }
  createdAt: string
  tier: string
}

export default function BotDetailPage() {
  const router = useRouter()
  const params = useParams()
  const botId = params?.id as string

  const [bot, setBot] = useState<BotDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [logs, setLogs] = useState<string>("")
  const [activeTab, setActiveTab] = useState<'overview' | 'wallet' | 'platforms' | 'logs'>('overview')

  const fetchBot = async () => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch(`/api/bots/${botId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch bot details')
      }

      const data = await response.json()
      setBot(data.bot)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bot')
    } finally {
      setLoading(false)
    }
  }

  const fetchLogs = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`/api/bots/${botId}/logs`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs)
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err)
    }
  }

  const handleBotAction = async (action: 'start' | 'stop' | 'pause' | 'resume') => {
    setActionLoading(action)
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`/api/bots/${botId}/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to ${action} bot`)
      }

      // Refresh bot status
      await fetchBot()
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} bot`)
    } finally {
      setActionLoading(null)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  useEffect(() => {
    fetchBot()
    const interval = setInterval(fetchBot, 10000) // Refresh every 10 seconds
    return () => clearInterval(interval)
  }, [botId])

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs()
      const interval = setInterval(fetchLogs, 5000) // Refresh logs every 5 seconds
      return () => clearInterval(interval)
    }
  }, [activeTab])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading bot details...</p>
        </div>
      </div>
    )
  }

  if (error || !bot) {
    return (
      <div className="container mx-auto py-8">
        <Card className="p-6">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-center mb-2">Error Loading Bot</h2>
          <p className="text-muted-foreground text-center mb-4">{error || 'Bot not found'}</p>
          <button onClick={() => router.push('/dashboard')} className="btn-primary w-full">
            Back to Dashboard
          </button>
        </Card>
      </div>
    )
  }

  const isRunning = bot.containerStatus === 'running'
  const isPaused = bot.containerStatus === 'paused'

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <button 
            onClick={() => router.push('/dashboard')} 
            className="btn-ghost mb-4 flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            {bot.name}
            <span className={`text-sm px-2 py-1 rounded-full ${
              isRunning ? 'bg-green-500/20 text-green-600' : 'bg-gray-500/20 text-gray-600'
            }`}>
              {isRunning ? 'Online' : isPaused ? 'Paused' : 'Offline'}
            </span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Created {new Date(bot.createdAt).toLocaleDateString()}
          </p>
        </div>

        {/* Bot Controls */}
        <div className="flex gap-2">
          {!isRunning ? (
            <button
              onClick={() => handleBotAction('start')}
              disabled={actionLoading !== null}
              className="btn-primary flex items-center gap-2"
            >
              {actionLoading === 'start' ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <PlayCircle className="w-4 h-4" />
              )}
              Start Bot
            </button>
          ) : (
            <>
              <button
                onClick={() => handleBotAction(isPaused ? 'resume' : 'pause')}
                disabled={actionLoading !== null}
                className="btn-ghost border border-border flex items-center gap-2"
              >
                {actionLoading === 'pause' || actionLoading === 'resume' ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <PauseCircle className="w-4 h-4" />
                )}
                {isPaused ? 'Resume' : 'Pause'}
              </button>
              <button
                onClick={() => handleBotAction('stop')}
                disabled={actionLoading !== null}
                className="btn-ghost border border-destructive text-destructive flex items-center gap-2"
              >
                {actionLoading === 'stop' ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <StopCircle className="w-4 h-4" />
                )}
                Stop
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-border">
        {(['overview', 'wallet', 'platforms', 'logs'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 px-4 capitalize transition-colors ${
              activeTab === tab
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stats */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Bot Statistics</h2>
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className={isRunning ? 'text-green-600' : 'text-gray-600'}>
                  {isRunning ? 'Running' : 'Stopped'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tier</span>
                <span className="capitalize">{bot.tier}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Transactions</span>
                <span>{bot.walletStatus?.transactionCount || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Activity</span>
                <span>{bot.walletStatus?.lastActivity || 'Never'}</span>
              </div>
            </div>
          </Card>

          {/* Features */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">MCP Features</h2>
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Wallet className={`w-4 h-4 ${bot.features.wallet ? 'text-green-600' : 'text-gray-400'}`} />
                <span className={bot.features.wallet ? '' : 'text-muted-foreground'}>
                  Wallet Management
                </span>
                {bot.features.wallet && <CheckCircle className="w-4 h-4 text-green-600 ml-auto" />}
              </div>
              <div className="flex items-center gap-3">
                <Users className={`w-4 h-4 ${bot.features.dao ? 'text-green-600' : 'text-gray-400'}`} />
                <span className={bot.features.dao ? '' : 'text-muted-foreground'}>
                  DAO Governance
                </span>
                {bot.features.dao && <CheckCircle className="w-4 h-4 text-green-600 ml-auto" />}
              </div>
              <div className="flex items-center gap-3">
                <DollarSign className={`w-4 h-4 ${bot.features.marketplace ? 'text-green-600' : 'text-gray-400'}`} />
                <span className={bot.features.marketplace ? '' : 'text-muted-foreground'}>
                  Marketplace Access
                </span>
                {bot.features.marketplace && <CheckCircle className="w-4 h-4 text-green-600 ml-auto" />}
              </div>
            </div>
          </Card>

          {/* Resource Usage */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Resources</h2>
              <Settings className="w-5 h-5 text-primary" />
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>RAM</span>
                  <span>{bot.tier === 'enterprise' ? '1GB' : bot.tier === 'premium' ? '512MB' : '256MB'}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary rounded-full h-2" 
                    style={{ width: isRunning ? '60%' : '0%' }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>CPU</span>
                  <span>{bot.tier === 'enterprise' ? '1.0' : bot.tier === 'premium' ? '0.5' : '0.25'}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary rounded-full h-2" 
                    style={{ width: isRunning ? '30%' : '0%' }}
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Wallet Tab */}
      {activeTab === 'wallet' && bot.features.wallet && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Wallet Information</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">Wallet Address</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-sm bg-muted px-2 py-1 rounded flex-1">
                    {bot.walletAddress || 'Generating...'}
                  </code>
                  {bot.walletAddress && (
                    <button
                      onClick={() => copyToClipboard(bot.walletAddress!)}
                      className="btn-ghost p-2"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Wallet Port</label>
                <code className="text-sm bg-muted px-2 py-1 rounded block mt-1">
                  {bot.walletPort || 'Not assigned'}
                </code>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Balances</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Balance</span>
                <span className="text-2xl font-bold">
                  {bot.walletStatus?.balance.total.toFixed(2) || '0.00'} NIGHT
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Transparent</span>
                  <span>{bot.walletStatus?.balance.transparent.toFixed(2) || '0.00'} NIGHT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Shielded</span>
                  <span>{bot.walletStatus?.balance.shielded.toFixed(2) || '0.00'} NIGHT</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Platforms Tab */}
      {activeTab === 'platforms' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {bot.platforms.discord && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Discord</h2>
                <MessageSquare className="w-5 h-5 text-[#5865F2]" />
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-muted-foreground">Token</label>
                  <code className="text-xs bg-muted px-2 py-1 rounded block mt-1">
                    {bot.platforms.discord.token.substring(0, 20)}...
                  </code>
                </div>
                {bot.platforms.discord.serverId && (
                  <div>
                    <label className="text-sm text-muted-foreground">Server ID</label>
                    <code className="text-sm bg-muted px-2 py-1 rounded block mt-1">
                      {bot.platforms.discord.serverId}
                    </code>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-600">Connected</span>
                </div>
              </div>
            </Card>
          )}

          {bot.platforms.telegram && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Telegram</h2>
                <MessageSquare className="w-5 h-5 text-[#0088cc]" />
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-muted-foreground">Token</label>
                  <code className="text-xs bg-muted px-2 py-1 rounded block mt-1">
                    {bot.platforms.telegram.token.substring(0, 20)}...
                  </code>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-600">Connected</span>
                </div>
              </div>
            </Card>
          )}

          {!bot.platforms.discord && !bot.platforms.telegram && (
            <Card className="p-6 col-span-2">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Platforms Connected</h3>
                <p className="text-muted-foreground">
                  This bot doesn't have any chat platforms configured yet.
                </p>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Container Logs</h2>
            <button 
              onClick={fetchLogs}
              className="btn-ghost p-2"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <div className="bg-background border border-border rounded-lg p-4 font-mono text-xs overflow-auto max-h-96">
            {logs ? (
              <pre className="whitespace-pre-wrap">{logs}</pre>
            ) : (
              <p className="text-muted-foreground">No logs available</p>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}