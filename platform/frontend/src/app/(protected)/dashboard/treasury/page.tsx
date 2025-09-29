"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { 
  Archive, Users, Vote, DollarSign, TrendingUp, 
  Plus, RefreshCw, AlertCircle, CheckCircle, Clock,
  FileText, ArrowUpRight, ArrowDownLeft
} from "lucide-react"

interface Proposal {
  id: string
  title: string
  description: string
  proposer: string
  status: 'active' | 'passed' | 'rejected' | 'pending'
  votesFor: number
  votesAgainst: number
  totalVotes: number
  endDate: string
  amount?: number
}

interface TreasuryData {
  balance: number
  members: number
  activeProposals: number
  totalProposals: number
  recentActivity: Activity[]
}

interface Activity {
  id: string
  type: 'deposit' | 'withdrawal' | 'proposal' | 'vote'
  description: string
  amount?: number
  timestamp: string
}

export default function TreasuryPage() {
  const [treasuryData, setTreasuryData] = useState<TreasuryData>({
    balance: 0,
    members: 0,
    activeProposals: 0,
    totalProposals: 0,
    recentActivity: []
  })
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'proposals' | 'activity'>('overview')
  const [refreshing, setRefreshing] = useState(false)

  const fetchTreasuryData = async () => {
    try {
      // For now, using mock data since treasury API isn't implemented
      // In production, this would call actual treasury endpoints
      setTreasuryData({
        balance: 10000,
        members: 42,
        activeProposals: 3,
        totalProposals: 15,
        recentActivity: [
          {
            id: '1',
            type: 'deposit',
            description: 'Treasury funding from bot fees',
            amount: 500,
            timestamp: '2 hours ago'
          },
          {
            id: '2',
            type: 'proposal',
            description: 'New proposal: Marketing campaign',
            timestamp: '5 hours ago'
          },
          {
            id: '3',
            type: 'vote',
            description: 'Vote cast on infrastructure upgrade',
            timestamp: '1 day ago'
          }
        ]
      })

      setProposals([
        {
          id: '1',
          title: 'Marketing Campaign Q1 2024',
          description: 'Allocate 1000 NIGHT for social media marketing',
          proposer: '0x742d...8e3f',
          status: 'active',
          votesFor: 28,
          votesAgainst: 5,
          totalVotes: 33,
          endDate: '2024-02-01',
          amount: 1000
        },
        {
          id: '2',
          title: 'Infrastructure Upgrade',
          description: 'Upgrade server capacity for better performance',
          proposer: '0x9f2a...1b4c',
          status: 'active',
          votesFor: 35,
          votesAgainst: 2,
          totalVotes: 37,
          endDate: '2024-01-30',
          amount: 2500
        },
        {
          id: '3',
          title: 'Community Rewards Program',
          description: 'Implement rewards for active community members',
          proposer: '0x3c8d...7e9f',
          status: 'passed',
          votesFor: 40,
          votesAgainst: 2,
          totalVotes: 42,
          endDate: '2024-01-25',
          amount: 500
        }
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load treasury data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    fetchTreasuryData()
  }

  const handleVote = async (proposalId: string, vote: 'for' | 'against') => {
    console.log(`Voting ${vote} on proposal ${proposalId}`)
    // TODO: Implement voting logic
  }

  useEffect(() => {
    fetchTreasuryData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading treasury data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="p-6 max-w-md">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-center mb-2">Error Loading Treasury</h2>
          <p className="text-muted-foreground text-center mb-4">{error}</p>
          <button onClick={fetchTreasuryData} className="btn-primary w-full">
            Try Again
          </button>
        </Card>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">DAO Treasury</h1>
          <p className="text-muted-foreground">
            Manage community funds and governance proposals
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleRefresh} 
            className="btn-ghost p-2"
            disabled={refreshing}
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Proposal
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground mb-2">Treasury Balance</div>
              <div className="text-2xl font-bold">{treasuryData.balance.toLocaleString()} NIGHT</div>
              <div className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                +12% this month
              </div>
            </div>
            <Archive className="w-10 h-10 text-primary opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground mb-2">DAO Members</div>
              <div className="text-2xl font-bold">{treasuryData.members}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Active voters
              </div>
            </div>
            <Users className="w-10 h-10 text-primary opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground mb-2">Active Proposals</div>
              <div className="text-2xl font-bold">{treasuryData.activeProposals}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {treasuryData.totalProposals} total
              </div>
            </div>
            <Vote className="w-10 h-10 text-primary opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground mb-2">Next Distribution</div>
              <div className="text-2xl font-bold">5 days</div>
              <div className="text-xs text-muted-foreground mt-1">
                Monthly rewards
              </div>
            </div>
            <Clock className="w-10 h-10 text-primary opacity-20" />
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-border">
        {(['overview', 'proposals', 'activity'] as const).map((tab) => (
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
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Treasury Overview</h2>
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Available for Proposals</span>
                    <span className="text-lg font-semibold">8,000 NIGHT</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-primary rounded-full h-2" style={{ width: '80%' }} />
                  </div>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Reserved Funds</span>
                    <span className="text-lg font-semibold">2,000 NIGHT</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-yellow-500 rounded-full h-2" style={{ width: '20%' }} />
                  </div>
                </div>

                <div className="flex gap-4 mt-6">
                  <button className="btn-primary flex-1 flex items-center justify-center gap-2">
                    <ArrowDownLeft className="w-4 h-4" />
                    Deposit
                  </button>
                  <button className="btn-ghost flex-1 border border-border flex items-center justify-center gap-2">
                    <FileText className="w-4 h-4" />
                    View Report
                  </button>
                </div>
              </div>
            </Card>
          </div>

          <div>
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
              <div className="space-y-3">
                {treasuryData.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      activity.type === 'deposit' ? 'bg-green-500/20' :
                      activity.type === 'withdrawal' ? 'bg-red-500/20' :
                      activity.type === 'proposal' ? 'bg-blue-500/20' :
                      'bg-purple-500/20'
                    }`}>
                      {activity.type === 'deposit' ? <ArrowDownLeft className="w-4 h-4 text-green-600" /> :
                       activity.type === 'withdrawal' ? <ArrowUpRight className="w-4 h-4 text-red-600" /> :
                       activity.type === 'proposal' ? <FileText className="w-4 h-4 text-blue-600" /> :
                       <Vote className="w-4 h-4 text-purple-600" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">{activity.description}</p>
                      {activity.amount && (
                        <p className="text-xs text-muted-foreground">{activity.amount} NIGHT</p>
                      )}
                      <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'proposals' && (
        <div className="space-y-4">
          {proposals.map((proposal) => (
            <Card key={proposal.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg">{proposal.title}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      proposal.status === 'active' ? 'bg-blue-500/20 text-blue-600' :
                      proposal.status === 'passed' ? 'bg-green-500/20 text-green-600' :
                      proposal.status === 'rejected' ? 'bg-red-500/20 text-red-600' :
                      'bg-gray-500/20 text-gray-600'
                    }`}>
                      {proposal.status}
                    </span>
                  </div>
                  <p className="text-muted-foreground mb-4">{proposal.description}</p>
                  
                  <div className="flex items-center gap-6 text-sm">
                    <span className="text-muted-foreground">
                      Proposed by: <code className="text-xs">{proposal.proposer}</code>
                    </span>
                    {proposal.amount && (
                      <span className="text-muted-foreground">
                        Amount: <span className="font-semibold">{proposal.amount} NIGHT</span>
                      </span>
                    )}
                    <span className="text-muted-foreground">
                      Ends: {proposal.endDate}
                    </span>
                  </div>

                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span>Voting Progress</span>
                      <span>{proposal.totalVotes} votes</span>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-green-600">For</span>
                          <span className="text-green-600">{proposal.votesFor}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="bg-green-500 rounded-full h-2" 
                            style={{ width: `${(proposal.votesFor / proposal.totalVotes) * 100}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-red-600">Against</span>
                          <span className="text-red-600">{proposal.votesAgainst}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="bg-red-500 rounded-full h-2" 
                            style={{ width: `${(proposal.votesAgainst / proposal.totalVotes) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {proposal.status === 'active' && (
                  <div className="flex gap-2 ml-4">
                    <button 
                      onClick={() => handleVote(proposal.id, 'for')}
                      className="btn-ghost border border-green-500 text-green-600 px-4 py-2 text-sm"
                    >
                      Vote For
                    </button>
                    <button 
                      onClick={() => handleVote(proposal.id, 'against')}
                      className="btn-ghost border border-red-500 text-red-600 px-4 py-2 text-sm"
                    >
                      Vote Against
                    </button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'activity' && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Treasury Activity</h2>
          <div className="space-y-4">
            {treasuryData.recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    activity.type === 'deposit' ? 'bg-green-500/20' :
                    activity.type === 'withdrawal' ? 'bg-red-500/20' :
                    activity.type === 'proposal' ? 'bg-blue-500/20' :
                    'bg-purple-500/20'
                  }`}>
                    {activity.type === 'deposit' ? <ArrowDownLeft className="w-5 h-5 text-green-600" /> :
                     activity.type === 'withdrawal' ? <ArrowUpRight className="w-5 h-5 text-red-600" /> :
                     activity.type === 'proposal' ? <FileText className="w-5 h-5 text-blue-600" /> :
                     <Vote className="w-5 h-5 text-purple-600" />}
                  </div>
                  <div>
                    <p className="font-medium">{activity.description}</p>
                    <p className="text-sm text-muted-foreground">{activity.timestamp}</p>
                  </div>
                </div>
                {activity.amount && (
                  <span className="font-semibold">{activity.amount} NIGHT</span>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}