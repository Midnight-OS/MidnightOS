"use client"

import Link from "next/link"
import { Bot, Circle, Wallet, Activity, Shield, MessageSquare } from "lucide-react"
import { Card } from "@/components/ui/card"

interface BotCardProps {
  id: string
  name: string
  status?: string
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
    balance?: {
      transparent?: number
      shielded?: number
      total?: number
    }
    transactionCount?: number
    lastActivity?: string
  }
  createdAt?: string
  tier?: string
}

export function BotCard(bot: BotCardProps) {
  const isRunning = bot.containerStatus === 'running'
  
  const getPlatforms = (): string[] => {
    const platforms = []
    if (bot.platforms.discord) platforms.push('Discord')
    if (bot.platforms.telegram) platforms.push('Telegram')
    return platforms
  }

  const platforms = getPlatforms()
  const balance = bot.walletStatus?.balance?.total || 0
  const transactions = bot.walletStatus?.transactionCount || 0

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Bot className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{bot.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Circle className={`w-2 h-2 fill-current ${
                isRunning ? 'text-green-500' : 'text-gray-400'
              }`} />
              <span className={`text-xs ${
                isRunning ? 'text-green-500' : 'text-gray-400'
              }`}>
                {isRunning ? 'Online' : 'Offline'}
              </span>
              {platforms.length > 0 && (
                <>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">
                    {platforms.join(' & ')}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${
          isRunning ? 'bg-green-500/20 text-green-500' : 'bg-gray-500/20 text-gray-500'
        }`}>
          {isRunning ? 'Running' : 'Stopped'}
        </span>
      </div>

      {/* Features */}
      <div className="flex gap-2 mb-4">
        {bot.features.wallet && (
          <span className="text-xs px-2 py-1 bg-primary/10 rounded flex items-center gap-1">
            <Wallet className="w-3 h-3" />
            Wallet
          </span>
        )}
        {bot.features.dao && (
          <span className="text-xs px-2 py-1 bg-primary/10 rounded flex items-center gap-1">
            <Shield className="w-3 h-3" />
            DAO
          </span>
        )}
        {bot.features.marketplace && (
          <span className="text-xs px-2 py-1 bg-primary/10 rounded flex items-center gap-1">
            <Activity className="w-3 h-3" />
            Market
          </span>
        )}
      </div>

      {/* Wallet Info */}
      {bot.walletAddress && bot.walletAddress !== 'Generating...' && (
        <div className="p-3 bg-muted/50 rounded-lg mb-4">
          <div className="text-xs text-muted-foreground mb-1">Wallet Address</div>
          <code className="text-xs font-mono">
            {bot.walletAddress.slice(0, 12)}...{bot.walletAddress.slice(-8)}
          </code>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
        <div>
          <div className="text-xl font-bold">{transactions}</div>
          <div className="text-xs text-muted-foreground">Transactions</div>
        </div>
        <div>
          <div className="text-xl font-bold">
            {balance.toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground">NIGHT</div>
        </div>
        <div>
          <div className="text-xl font-bold">
            {platforms.length}
          </div>
          <div className="text-xs text-muted-foreground">Platforms</div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 pt-4 border-t border-border">
        <Link href={`/dashboard/bots/${bot.id}`}>
          <button className="btn-primary w-full text-sm py-2">
            Manage Bot
          </button>
        </Link>
      </div>
    </Card>
  )
}