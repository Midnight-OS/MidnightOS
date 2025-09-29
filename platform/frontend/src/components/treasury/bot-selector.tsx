"use client"

import { useState, useEffect } from 'react'
import { ChevronDown, Bot, Wallet, AlertCircle, Sparkles } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { treasuryAPI, BotTreasury } from '@/lib/treasury-api'

interface BotSelectorProps {
  selectedBot: BotTreasury | null
  onBotSelect: (bot: BotTreasury) => void
  className?: string
}

export function BotSelector({ selectedBot, onBotSelect, className = '' }: BotSelectorProps) {
  const [bots, setBots] = useState<BotTreasury[]>([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    fetchBots()
  }, [])

  const fetchBots = async () => {
    try {
      const botsWithTreasury = await treasuryAPI.getBotsWithTreasury()
      setBots(botsWithTreasury)
      
      // Auto-select first deployed treasury if none selected
      if (!selectedBot && botsWithTreasury.length > 0) {
        const deployedBot = botsWithTreasury.find(b => b.isDeployed) || botsWithTreasury[0]
        onBotSelect(deployedBot)
      }
    } catch (error) {
      console.error('Failed to fetch bots:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={`glass-card p-4 animate-pulse ${className}`}>
        <div className="h-6 bg-muted rounded w-32"></div>
      </div>
    )
  }

  if (bots.length === 0) {
    return (
      <Card className={`p-4 border-yellow-500/20 bg-yellow-500/5 ${className}`}>
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-500" />
          <div>
            <p className="font-medium">No DAO-Enabled Bots</p>
            <p className="text-sm text-muted-foreground">Create a bot with DAO features to access treasury</p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="glass-card p-4 w-full flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            selectedBot?.isDeployed ? 'bg-primary/20' : 'bg-muted'
          }`}>
            <Bot className={`w-5 h-5 ${selectedBot?.isDeployed ? 'text-primary' : 'text-muted-foreground'}`} />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <p className="font-semibold">{selectedBot?.botName || 'Select a Bot'}</p>
              {selectedBot?.isDeployed && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-600">
                  Deployed
                </span>
              )}
            </div>
            {selectedBot && (
              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <Wallet className="w-3 h-3" />
                  {selectedBot.balance?.toLocaleString() || 0} NIGHT
                </span>
                <span>{selectedBot.memberCount || 0} members</span>
                <span>{selectedBot.activeProposals || 0} active proposals</span>
              </div>
            )}
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 w-full glass-card p-2 z-50 max-h-96 overflow-y-auto">
          {bots.map((bot) => (
            <button
              key={bot.botId}
              onClick={() => {
                onBotSelect(bot)
                setIsOpen(false)
              }}
              className={`w-full p-3 rounded-lg hover:bg-muted/50 transition-colors text-left ${
                selectedBot?.botId === bot.botId ? 'bg-muted/30' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    bot.isDeployed ? 'bg-primary/20' : 'bg-muted'
                  }`}>
                    <Bot className={`w-5 h-5 ${bot.isDeployed ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{bot.botName}</p>
                      {bot.isDeployed ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-600">
                          Deployed
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-600">
                          Not Deployed
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      {bot.isDeployed ? (
                        <>
                          <span>{bot.balance?.toLocaleString() || 0} NIGHT</span>
                          <span>{bot.memberCount || 0} members</span>
                          <span>{bot.activeProposals || 0} proposals</span>
                        </>
                      ) : (
                        <span className="text-yellow-600">Deploy treasury to start</span>
                      )}
                    </div>
                  </div>
                </div>
                {bot.isDeployed && selectedBot?.botId === bot.botId && (
                  <Sparkles className="w-4 h-4 text-primary" />
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}