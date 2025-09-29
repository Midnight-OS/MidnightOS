"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { 
  Wallet, Send, Download, Shield, Eye, EyeOff, Copy, 
  ArrowUpRight, ArrowDownLeft, RefreshCw, AlertCircle,
  CheckCircle, Info
} from "lucide-react"

interface WalletData {
  address: string
  balance: {
    transparent: number
    shielded: number
    total: number
  }
  transactions: Transaction[]
}

interface Transaction {
  id: string
  type: 'send' | 'receive' | 'shield' | 'unshield'
  amount: number
  address: string
  timestamp: string
  status: 'pending' | 'confirmed' | 'failed'
  txHash?: string
}

interface BotWallet {
  botId: string
  botName: string
  walletAddress: string
  balance: {
    transparent: number
    shielded: number
    total: number
  }
  transactionCount: number
}

export default function WalletPage() {
  const [wallets, setWallets] = useState<BotWallet[]>([])
  const [selectedWallet, setSelectedWallet] = useState<BotWallet | null>(null)
  const [showShielded, setShowShielded] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'send' | 'receive' | 'transactions'>('overview')
  const [refreshing, setRefreshing] = useState(false)

  // Send form state
  const [sendForm, setSendForm] = useState({
    recipient: '',
    amount: '',
    useShielded: false
  })

  const fetchWallets = async () => {
    try {
      const token = localStorage.getItem('authToken') || 'dev-token'
      const response = await fetch('/api/bots', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch wallets')
      }

      const data = await response.json()
      const botWallets: BotWallet[] = data.bots?.map((bot: any) => ({
        botId: bot.id,
        botName: bot.name,
        walletAddress: bot.walletAddress || 'Generating...',
        balance: bot.walletStatus?.balance || { transparent: 0, shielded: 0, total: 0 },
        transactionCount: bot.walletStatus?.transactionCount || 0
      })) || []

      setWallets(botWallets)
      if (botWallets.length > 0 && !selectedWallet) {
        setSelectedWallet(botWallets[0])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load wallets')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    fetchWallets()
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const handleSend = async () => {
    // TODO: Implement send transaction
    console.log('Send transaction:', sendForm)
  }

  useEffect(() => {
    fetchWallets()
    const interval = setInterval(fetchWallets, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading wallet data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="p-6 max-w-md">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-center mb-2">Error Loading Wallets</h2>
          <p className="text-muted-foreground text-center mb-4">{error}</p>
          <button onClick={fetchWallets} className="btn-primary w-full">
            Try Again
          </button>
        </Card>
      </div>
    )
  }

  const totalBalance = wallets.reduce((sum, w) => sum + w.balance.total, 0)
  const totalTransparent = wallets.reduce((sum, w) => sum + w.balance.transparent, 0)
  const totalShielded = wallets.reduce((sum, w) => sum + w.balance.shielded, 0)

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Midnight Wallet</h1>
          <p className="text-muted-foreground">
            Manage your NIGHT tokens with zero-knowledge privacy
          </p>
        </div>
        <button 
          onClick={handleRefresh} 
          className="btn-ghost p-2"
          disabled={refreshing}
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Total Balance Card */}
      <Card className="p-6 mb-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Total Balance</h2>
          <button 
            onClick={() => setShowShielded(!showShielded)}
            className="btn-ghost p-2"
          >
            {showShielded ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
        </div>
        
        <div className="text-4xl font-bold mb-2">
          {totalBalance.toFixed(2)} NIGHT
        </div>
        
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <div className="text-sm text-muted-foreground">Transparent</div>
            <div className="text-xl font-semibold">{totalTransparent.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Shielded</div>
            <div className="text-xl font-semibold">
              {showShielded ? totalShielded.toFixed(2) : '••••••'}
            </div>
          </div>
        </div>
      </Card>

      {/* Wallet Selection */}
      {wallets.length > 0 && (
        <div className="mb-6">
          <label className="text-sm font-medium mb-2 block">Select Bot Wallet</label>
          <select
            value={selectedWallet?.botId || ''}
            onChange={(e) => {
              const wallet = wallets.find(w => w.botId === e.target.value)
              setSelectedWallet(wallet || null)
            }}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {wallets.map((wallet) => (
              <option key={wallet.botId} value={wallet.botId}>
                {wallet.botName} - {wallet.walletAddress.slice(0, 10)}...
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-border">
        {(['overview', 'send', 'receive', 'transactions'] as const).map((tab) => (
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

      {/* Tab Content */}
      {activeTab === 'overview' && selectedWallet && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Wallet Address</h3>
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <code className="text-xs bg-muted px-2 py-1 rounded block mb-2">
              {selectedWallet.walletAddress}
            </code>
            <button
              onClick={() => copyToClipboard(selectedWallet.walletAddress)}
              className="btn-ghost w-full flex items-center justify-center gap-2 text-sm"
            >
              <Copy className="w-4 h-4" />
              Copy Address
            </button>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Balance Details</h3>
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="font-semibold">{selectedWallet.balance.total.toFixed(2)} NIGHT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Transparent</span>
                <span>{selectedWallet.balance.transparent.toFixed(2)} NIGHT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shielded</span>
                <span>{selectedWallet.balance.shielded.toFixed(2)} NIGHT</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Quick Actions</h3>
              <Send className="w-5 h-5 text-primary" />
            </div>
            <div className="space-y-2">
              <button 
                onClick={() => setActiveTab('send')}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <ArrowUpRight className="w-4 h-4" />
                Send NIGHT
              </button>
              <button 
                onClick={() => setActiveTab('receive')}
                className="btn-ghost w-full border border-border flex items-center justify-center gap-2"
              >
                <ArrowDownLeft className="w-4 h-4" />
                Receive
              </button>
              <button className="btn-ghost w-full border border-border flex items-center justify-center gap-2">
                <Shield className="w-4 h-4" />
                Shield Tokens
              </button>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'send' && selectedWallet && (
        <Card className="p-8 max-w-2xl">
          <h2 className="text-xl font-semibold mb-6">Send NIGHT Tokens</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                From Wallet
              </label>
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-sm font-semibold">{selectedWallet.botName}</div>
                <code className="text-xs text-muted-foreground">
                  {selectedWallet.walletAddress}
                </code>
                <div className="text-xs text-muted-foreground mt-1">
                  Available: {selectedWallet.balance.total.toFixed(2)} NIGHT
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Recipient Address
              </label>
              <input
                type="text"
                value={sendForm.recipient}
                onChange={(e) => setSendForm({ ...sendForm, recipient: e.target.value })}
                placeholder="0x..."
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Amount
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={sendForm.amount}
                  onChange={(e) => setSendForm({ ...sendForm, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-4 py-2 pr-16 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                  NIGHT
                </span>
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendForm.useShielded}
                  onChange={(e) => setSendForm({ ...sendForm, useShielded: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Use shielded transaction (private)</span>
              </label>
              {sendForm.useShielded && (
                <p className="text-xs text-muted-foreground mt-1 ml-6">
                  Transaction will be processed with zero-knowledge proofs for complete privacy
                </p>
              )}
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-primary mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium mb-1">Transaction Fee</p>
                  <p className="text-muted-foreground">
                    Estimated fee: 0.01 NIGHT
                  </p>
                </div>
              </div>
            </div>

            <button 
              onClick={handleSend}
              className="btn-primary w-full"
              disabled={!sendForm.recipient || !sendForm.amount}
            >
              Send Transaction
            </button>
          </div>
        </Card>
      )}

      {activeTab === 'receive' && selectedWallet && (
        <Card className="p-8 max-w-2xl">
          <h2 className="text-xl font-semibold mb-6">Receive NIGHT Tokens</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Your Wallet Address
              </label>
              <div className="p-4 bg-muted rounded-lg">
                <code className="text-sm break-all">
                  {selectedWallet.walletAddress}
                </code>
              </div>
              <button
                onClick={() => copyToClipboard(selectedWallet.walletAddress)}
                className="btn-primary w-full mt-4 flex items-center justify-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Copy Address
              </button>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-primary mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium mb-1">Receiving Tokens</p>
                  <p className="text-muted-foreground">
                    Share this address to receive NIGHT tokens. Transactions are automatically 
                    detected and your balance will update in real-time.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'transactions' && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-6">Transaction History</h2>
          <div className="text-center py-8 text-muted-foreground">
            <p>No transactions yet</p>
            <p className="text-sm mt-2">Your transaction history will appear here</p>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {wallets.length === 0 && (
        <Card className="p-12 text-center">
          <Wallet className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Wallets Available</h3>
          <p className="text-muted-foreground mb-4">
            Create a bot first to get a Midnight wallet
          </p>
          <a href="/dashboard/bots/create">
            <button className="btn-primary">Create Your First Bot</button>
          </a>
        </Card>
      )}
    </div>
  )
}