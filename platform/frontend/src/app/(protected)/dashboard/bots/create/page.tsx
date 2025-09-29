"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { BotDeploymentLoader } from "@/components/bot-deployment-loader"
import { Bot, Shield, Wallet, Users, CheckCircle, AlertCircle, RefreshCw, ArrowLeft, ArrowRight, MessageSquare } from "lucide-react"

interface BotFormData {
  name: string
  type: "basic" | "premium" | "enterprise"
  features: {
    wallet: boolean
    dao: boolean
    marketplace: boolean
  }
  platforms: {
    discord?: { token: string; serverId?: string }
    telegram?: { token: string }
    webChat?: { enabled: boolean }
  }
}

export default function CreateBotPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [deploying, setDeploying] = useState(false)
  const [deploymentId, setDeploymentId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [testingPlatform, setTestingPlatform] = useState<string | null>(null)
  const [platformTestResults, setPlatformTestResults] = useState<Record<string, { success: boolean; message: string }>>({})
  
  const [botData, setBotData] = useState<BotFormData>({
    name: "",
    type: "basic",
    features: {
      wallet: true,
      dao: false,
      marketplace: false
    },
    platforms: {
      webChat: { enabled: true } // Default to WebChat enabled
    }
  })

  const testDiscordToken = async () => {
    if (!botData.platforms.discord?.token) {
      setPlatformTestResults(prev => ({
        ...prev,
        discord: { success: false, message: "Please enter a Discord bot token" }
      }))
      return
    }

    setTestingPlatform('discord')
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('http://localhost:3002/api/bots/test/discord', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: botData.platforms.discord.token })
      })

      const data = await response.json()
      if (response.ok && data.valid) {
        setPlatformTestResults(prev => ({
          ...prev,
          discord: { success: true, message: `Connected as ${data.username}` }
        }))
      } else {
        setPlatformTestResults(prev => ({
          ...prev,
          discord: { success: false, message: data.error || "Invalid token" }
        }))
      }
    } catch (err) {
      setPlatformTestResults(prev => ({
        ...prev,
        discord: { success: false, message: "Failed to test token" }
      }))
    } finally {
      setTestingPlatform(null)
    }
  }

  const testTelegramToken = async () => {
    if (!botData.platforms.telegram?.token) {
      setPlatformTestResults(prev => ({
        ...prev,
        telegram: { success: false, message: "Please enter a Telegram bot token" }
      }))
      return
    }

    setTestingPlatform('telegram')
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('http://localhost:3002/api/bots/test/telegram', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: botData.platforms.telegram.token })
      })

      const data = await response.json()
      if (response.ok && data.valid) {
        setPlatformTestResults(prev => ({
          ...prev,
          telegram: { success: true, message: `Connected as @${data.username}` }
        }))
      } else {
        setPlatformTestResults(prev => ({
          ...prev,
          telegram: { success: false, message: data.error || "Invalid token" }
        }))
      }
    } catch (err) {
      setPlatformTestResults(prev => ({
        ...prev,
        telegram: { success: false, message: "Failed to test token" }
      }))
    } finally {
      setTestingPlatform(null)
    }
  }

  const handleCreate = async () => {
    setLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('authToken')
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch('http://localhost:3002/api/bots', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: botData.name,
          features: botData.features,
          platforms: botData.platforms,
          tier: botData.type
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create bot')
      }

      const data = await response.json()
      setDeploymentId(data.bot.id)
      setDeploying(true)
      setLoading(false)
      
      // The deployment loader will handle the redirect after completion
      setTimeout(() => {
        router.push(`/dashboard/bots/${data.bot.id}`)
      }, 120000) // 2 minute timeout as fallback
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create bot')
      setLoading(false)
    }
  }

  const canProceed = () => {
    switch (step) {
      case 1:
        return botData.name.length >= 3
      case 2:
        return true // Features are optional
      case 3:
        // At least one platform must be configured
        const hasWebChat = botData.platforms.webChat?.enabled
        const hasDiscord = botData.platforms.discord?.token && platformTestResults.discord?.success
        const hasTelegram = botData.platforms.telegram?.token && platformTestResults.telegram?.success
        return hasWebChat || hasDiscord || hasTelegram
      case 4:
        return true // Review step - always allow proceeding
      default:
        return true
    }
  }

  // Show deployment loader when deploying
  if (deploying) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <BotDeploymentLoader
          botName={botData.name}
          deploymentId={deploymentId || undefined}
          onComplete={() => {
            router.push(`/dashboard/bots/${deploymentId}`)
          }}
        />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <button 
          onClick={() => router.push('/dashboard')} 
          className="btn-ghost mb-4 flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold">Create New Bot</h1>
        <p className="text-muted-foreground mt-2">
          Deploy your AI bot with Midnight blockchain integration
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                step >= s
                  ? 'bg-primary border-primary text-primary-foreground'
                  : 'border-muted-foreground text-muted-foreground'
              }`}
            >
              {step > s ? <CheckCircle className="w-5 h-5" /> : s}
            </div>
            {s < 4 && (
              <div
                className={`w-full h-0.5 mx-2 ${
                  step > s ? 'bg-primary' : 'bg-muted'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {error && (
        <Card className="p-4 mb-6 border-destructive">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="w-5 h-5" />
            <p>{error}</p>
          </div>
        </Card>
      )}

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <Card className="p-8">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Bot Configuration
          </h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Bot Name
              </label>
              <input
                type="text"
                value={botData.name}
                onChange={(e) => setBotData({ ...botData, name: e.target.value })}
                placeholder="My Midnight Bot"
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Choose a unique name for your bot
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Bot Tier
              </label>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { id: 'basic', name: 'Basic', ram: '256MB', cpu: '0.25' },
                  { id: 'premium', name: 'Premium', ram: '512MB', cpu: '0.5' },
                  { id: 'enterprise', name: 'Enterprise', ram: '1GB', cpu: '1.0' }
                ].map((tier) => (
                  <div
                    key={tier.id}
                    onClick={() => setBotData({ ...botData, type: tier.id as any })}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      botData.type === tier.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <h3 className="font-semibold">{tier.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {tier.ram} RAM • {tier.cpu} CPU
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Step 2: Features */}
      {step === 2 && (
        <Card className="p-8">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            MCP Features
          </h2>
          
          <div className="space-y-4">
            {[
              { 
                id: 'wallet', 
                name: 'Wallet Management', 
                icon: Wallet,
                description: 'Send, receive, and manage NIGHT tokens with transparent and shielded balances'
              },
              { 
                id: 'dao', 
                name: 'DAO Governance', 
                icon: Users,
                description: 'Create proposals, cast votes, and manage treasury operations'
              },
              { 
                id: 'marketplace', 
                name: 'Marketplace Access', 
                icon: Shield,
                description: 'Trade assets and interact with DeFi protocols on Midnight'
              }
            ].map((feature) => (
              <div
                key={feature.id}
                onClick={() => setBotData({
                  ...botData,
                  features: {
                    ...botData.features,
                    [feature.id]: !botData.features[feature.id as keyof typeof botData.features]
                  }
                })}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  botData.features[feature.id as keyof typeof botData.features]
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <feature.icon className="w-5 h-5 mt-0.5 text-primary" />
                  <div className="flex-1">
                    <h3 className="font-semibold">{feature.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {feature.description}
                    </p>
                  </div>
                  <CheckCircle 
                    className={`w-5 h-5 mt-0.5 ${
                      botData.features[feature.id as keyof typeof botData.features]
                        ? 'text-primary'
                        : 'text-muted-foreground/30'
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Step 3: Platform Tokens */}
      {step === 3 && (
        <Card className="p-8">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Platform Configuration
          </h2>
          
          <div className="space-y-6">
            {/* WebChat Configuration */}
            <div className="border border-border rounded-lg p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Web Chat
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Enable embedded chat widget on your website
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Perfect for standalone web-based interactions
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={botData.platforms.webChat?.enabled || false}
                      onChange={(e) => setBotData({
                        ...botData,
                        platforms: {
                          ...botData.platforms,
                          webChat: { enabled: e.target.checked }
                        }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                  </label>
                </div>
                
                {botData.platforms.webChat?.enabled && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-sm text-green-600 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      WebChat will be available after deployment
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Discord Configuration */}
            <div className="border border-border rounded-lg p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                Discord Bot
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Bot Token
                  </label>
                  <input
                    type="password"
                    value={botData.platforms.discord?.token || ''}
                    onChange={(e) => setBotData({
                      ...botData,
                      platforms: {
                        ...botData.platforms,
                        discord: {
                          token: e.target.value,
                          serverId: botData.platforms.discord?.serverId
                        }
                      }
                    })}
                    placeholder="MTIzNDU2Nzg5MDEyMzQ1Njc4OQ.xxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Server ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={botData.platforms.discord?.serverId || ''}
                    onChange={(e) => setBotData({
                      ...botData,
                      platforms: {
                        ...botData.platforms,
                        discord: {
                          token: botData.platforms.discord?.token || '',
                          serverId: e.target.value
                        }
                      }
                    })}
                    placeholder="123456789012345678"
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <button
                    onClick={testDiscordToken}
                    disabled={!botData.platforms.discord?.token || testingPlatform === 'discord'}
                    className="btn-ghost border border-border flex items-center gap-2"
                  >
                    {testingPlatform === 'discord' ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    Test Connection
                  </button>
                  
                  {platformTestResults.discord && (
                    <span className={`text-sm ${
                      platformTestResults.discord.success ? 'text-green-600' : 'text-destructive'
                    }`}>
                      {platformTestResults.discord.message}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Telegram Configuration */}
            <div className="border border-border rounded-lg p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                Telegram Bot
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Bot Token
                  </label>
                  <input
                    type="password"
                    value={botData.platforms.telegram?.token || ''}
                    onChange={(e) => setBotData({
                      ...botData,
                      platforms: {
                        ...botData.platforms,
                        telegram: { token: e.target.value }
                      }
                    })}
                    placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <button
                    onClick={testTelegramToken}
                    disabled={!botData.platforms.telegram?.token || testingPlatform === 'telegram'}
                    className="btn-ghost border border-border flex items-center gap-2"
                  >
                    {testingPlatform === 'telegram' ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    Test Connection
                  </button>
                  
                  {platformTestResults.telegram && (
                    <span className={`text-sm ${
                      platformTestResults.telegram.success ? 'text-green-600' : 'text-destructive'
                    }`}>
                      {platformTestResults.telegram.message}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              ⚠️ At least one platform must be configured. Enable WebChat for web-based interactions,
              or add Discord/Telegram tokens for social platform integration.
            </p>
            
            {!canProceed() && step === 3 && (
              <div className="p-3 mt-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <p className="text-sm text-yellow-600">
                  Please configure at least one platform to continue:
                  • Enable WebChat for direct web interface chat
                  • Add Discord bot token for Discord integration
                  • Add Telegram bot token for Telegram integration
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <Card className="p-8">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Review & Deploy
          </h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Bot Details</h3>
              <div className="mt-2 space-y-2">
                <div className="flex justify-between">
                  <span>Name:</span>
                  <span className="font-semibold">{botData.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tier:</span>
                  <span className="font-semibold capitalize">{botData.type}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Features</h3>
              <div className="mt-2 space-y-2">
                {Object.entries(botData.features)
                  .filter(([_, enabled]) => enabled)
                  .map(([feature]) => (
                    <div key={feature} className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="capitalize">{feature}</span>
                    </div>
                  ))
                }
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Platforms</h3>
              <div className="mt-2 space-y-2">
                {botData.platforms.webChat?.enabled && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>WebChat: Enabled</span>
                  </div>
                )}
                {botData.platforms.discord?.token && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Discord: {platformTestResults.discord?.message || 'Configured'}</span>
                  </div>
                )}
                {botData.platforms.telegram?.token && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Telegram: {platformTestResults.telegram?.message || 'Configured'}</span>
                  </div>
                )}
                {!botData.platforms.webChat?.enabled && !botData.platforms.discord?.token && !botData.platforms.telegram?.token && (
                  <p className="text-sm text-muted-foreground">No platforms configured (bot will run without chat interfaces)</p>
                )}
              </div>
            </div>

            <Card className="p-4 bg-primary/5 border-primary/20">
              <p className="text-sm">
                Your bot will be deployed with isolated Docker containers including:
              </p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                <li>• Midnight wallet with unique seed phrase</li>
                <li>• MCP server for blockchain operations</li>
                <li>• ElizaOS agent with AI capabilities</li>
                <li>• Secure isolated environment</li>
              </ul>
            </Card>
          </div>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <button
          onClick={() => setStep(step - 1)}
          disabled={step === 1}
          className="btn-ghost border border-border flex items-center gap-2 disabled:opacity-50"
        >
          <ArrowLeft className="w-4 h-4" />
          Previous
        </button>

        {step < 4 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            Next
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleCreate}
            disabled={loading || !canProceed()}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Deploying...
              </>
            ) : (
              <>
                Deploy Bot
                <CheckCircle className="w-4 h-4" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}