"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { 
  Archive, Users, Vote, DollarSign, TrendingUp, TrendingDown,
  Plus, RefreshCw, AlertCircle, CheckCircle, Clock, Zap,
  FileText, ArrowUpRight, ArrowDownLeft, Rocket, Shield,
  ChevronRight, ExternalLink, Copy, CheckCheck, BarChart3
} from "lucide-react"
import { BotSelector } from "@/components/treasury/bot-selector"
import { CreateProposalModal } from "@/components/treasury/create-proposal-modal"
import { 
  treasuryAPI, 
  BotTreasury, 
  TreasuryProposal, 
  TreasuryAnalytics,
  DaoState
} from "@/lib/treasury-api"
import toast from "react-hot-toast"

export default function TreasuryPage() {
  // State Management
  const [selectedBot, setSelectedBot] = useState<BotTreasury | null>(null)
  const [analytics, setAnalytics] = useState<TreasuryAnalytics | null>(null)
  const [proposals, setProposals] = useState<TreasuryProposal[]>([])
  const [daoState, setDaoState] = useState<DaoState | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'proposals' | 'activity' | 'governance'>('overview')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [deploying, setDeploying] = useState(false)
  const [votingMap, setVotingMap] = useState<Record<string, boolean>>({})
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)

  // Fetch treasury data when bot changes
  useEffect(() => {
    if (selectedBot) {
      fetchTreasuryData()
    } else {
      setLoading(false)
    }
  }, [selectedBot])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (selectedBot && !refreshing) {
        fetchTreasuryData(true)
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [selectedBot, refreshing])

  const fetchTreasuryData = async (silent = false) => {
    if (!selectedBot) return

    if (!silent) {
      setLoading(true)
    }

    try {
      const [analyticsData, proposalsData, stateData] = await Promise.all([
        treasuryAPI.getTreasuryAnalytics(selectedBot.botId),
        treasuryAPI.getProposals(selectedBot.botId),
        treasuryAPI.getDaoState(selectedBot.botId)
      ])

      setAnalytics(analyticsData)
      setProposals(proposalsData)
      setDaoState(stateData)
    } catch (error) {
      if (!silent) {
        toast.error('Failed to load treasury data')
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    fetchTreasuryData()
  }

  const handleDeployTreasury = async () => {
    if (!selectedBot) return

    setDeploying(true)
    try {
      const result = await treasuryAPI.deployTreasury(selectedBot.botId, {
        initialFunding: 1000,
        governanceSettings: {
          proposalThreshold: 100,
          quorumPercentage: 30,
          votingPeriod: 3 * 24 * 60 * 60
        }
      })

      toast.success('Treasury deployed successfully!')
      
      // Update bot status
      setSelectedBot({
        ...selectedBot,
        isDeployed: true,
        treasuryAddress: result.treasuryAddress
      })

      // Refresh data
      await fetchTreasuryData()
    } catch (error: any) {
      toast.error(error.message || 'Failed to deploy treasury')
    } finally {
      setDeploying(false)
    }
  }

  const handleVote = async (proposalId: string, vote: 'for' | 'against') => {
    if (!selectedBot) return

    setVotingMap({ ...votingMap, [proposalId]: true })
    try {
      await treasuryAPI.castVote(selectedBot.botId, { proposalId, vote })
      toast.success(`Vote cast successfully!`)
      await fetchTreasuryData()
    } catch (error: any) {
      toast.error(error.message || 'Failed to cast vote')
    } finally {
      setVotingMap({ ...votingMap, [proposalId]: false })
    }
  }

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address)
    setCopiedAddress(address)
    setTimeout(() => setCopiedAddress(null), 2000)
  }

  const getProposalStatusColor = (status: string) => {
    switch (status) {
      case 'voting': return 'bg-blue-500/20 text-blue-600'
      case 'approved': return 'bg-green-500/20 text-green-600'
      case 'rejected': return 'bg-red-500/20 text-red-600'
      case 'executed': return 'bg-purple-500/20 text-purple-600'
      case 'pending': return 'bg-yellow-500/20 text-yellow-600'
      default: return 'bg-gray-500/20 text-gray-600'
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'deposit':
      case 'treasury_funded': return <ArrowDownLeft className="w-4 h-4 text-green-600" />
      case 'withdrawal': return <ArrowUpRight className="w-4 h-4 text-red-600" />
      case 'proposal_created': return <FileText className="w-4 h-4 text-blue-600" />
      case 'proposal_approved': return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'proposal_rejected': return <AlertCircle className="w-4 h-4 text-red-600" />
      case 'vote_cast': return <Vote className="w-4 h-4 text-purple-600" />
      default: return <Clock className="w-4 h-4 text-gray-600" />
    }
  }

  // Loading state
  if (loading && !selectedBot) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading treasury...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">DAO Treasury</h1>
            <p className="text-muted-foreground">
              Manage your bot's treasury and governance proposals
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
          </div>
        </div>

        {/* Bot Selector */}
        <BotSelector 
          selectedBot={selectedBot}
          onBotSelect={setSelectedBot}
          className="mb-6"
        />
      </div>

      {/* No Bot Selected */}
      {!selectedBot ? (
        <Card className="p-12 text-center">
          <Archive className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Select a Bot</h2>
          <p className="text-muted-foreground mb-4">
            Choose a bot with DAO features to manage its treasury
          </p>
        </Card>
      ) : !selectedBot.isDeployed ? (
        /* Treasury Not Deployed */
        <Card className="p-12 text-center">
          <div className="max-w-2xl mx-auto">
            <Rocket className="w-16 h-16 mx-auto mb-4 text-primary" />
            <h2 className="text-2xl font-bold mb-2">Deploy Treasury</h2>
            <p className="text-muted-foreground mb-6">
              Deploy your DAO treasury contracts to start managing funds and proposals
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <Card className="p-4">
                <Shield className="w-8 h-8 mx-auto mb-2 text-green-500" />
                <h3 className="font-semibold mb-1">Secure Vault</h3>
                <p className="text-xs text-muted-foreground">
                  Multi-sig protected treasury
                </p>
              </Card>
              <Card className="p-4">
                <Vote className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                <h3 className="font-semibold mb-1">Democratic Voting</h3>
                <p className="text-xs text-muted-foreground">
                  Token-weighted governance
                </p>
              </Card>
              <Card className="p-4">
                <Zap className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                <h3 className="font-semibold mb-1">Automated Execution</h3>
                <p className="text-xs text-muted-foreground">
                  Smart contract automation
                </p>
              </Card>
            </div>

            <button
              onClick={handleDeployTreasury}
              disabled={deploying}
              className="btn-primary px-8 py-3 text-lg"
            >
              {deploying ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Deploying Contracts...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Rocket className="w-5 h-5" />
                  Deploy Treasury
                </span>
              )}
            </button>

            <p className="text-xs text-muted-foreground mt-4">
              Deployment requires gas fees on Midnight Network
            </p>
          </div>
        </Card>
      ) : (
        /* Treasury Deployed - Show Data */
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Treasury Balance</div>
                  <div className="text-2xl font-bold">
                    {analytics?.totalBalance.toLocaleString() || 0} NIGHT
                  </div>
                  {analytics && analytics.balanceHistory.length > 1 && (
                    <div className={`text-xs mt-1 flex items-center gap-1 ${
                      analytics.balanceHistory[analytics.balanceHistory.length - 1].change >= 0
                        ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {analytics.balanceHistory[analytics.balanceHistory.length - 1].change >= 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {Math.abs(analytics.balanceHistory[analytics.balanceHistory.length - 1].change)}%
                    </div>
                  )}
                </div>
                <Archive className="w-10 h-10 text-primary opacity-20" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Active Members</div>
                  <div className="text-2xl font-bold">{daoState?.memberCount || 0}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {analytics?.participationRate || 0}% participation
                  </div>
                </div>
                <Users className="w-10 h-10 text-primary opacity-20" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Active Proposals</div>
                  <div className="text-2xl font-bold">
                    {proposals.filter(p => p.status === 'voting').length}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {analytics?.totalProposals || 0} total
                  </div>
                </div>
                <Vote className="w-10 h-10 text-primary opacity-20" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Success Rate</div>
                  <div className="text-2xl font-bold">
                    {analytics?.successRate || 0}%
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {analytics?.approvedProposals || 0} approved
                  </div>
                </div>
                <BarChart3 className="w-10 h-10 text-primary opacity-20" />
              </div>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mb-6">
            <button 
              onClick={() => setCreateModalOpen(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Proposal
            </button>
            <button className="btn-ghost border border-border flex items-center gap-2">
              <ArrowDownLeft className="w-4 h-4" />
              Fund Treasury
            </button>
            <button className="btn-ghost border border-border flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Export Report
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mb-6 border-b border-border">
            {(['overview', 'proposals', 'activity', 'governance'] as const).map((tab) => (
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
              <div className="lg:col-span-2 space-y-6">
                {/* Balance Overview */}
                <Card className="p-6">
                  <h2 className="text-lg font-semibold mb-4">Balance Overview</h2>
                  <div className="space-y-4">
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Available Balance</span>
                        <span className="text-lg font-semibold">
                          {analytics?.availableBalance.toLocaleString() || 0} NIGHT
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-green-500 rounded-full h-2" 
                          style={{ 
                            width: `${analytics?.totalBalance 
                              ? (analytics.availableBalance / analytics.totalBalance) * 100 
                              : 0}%` 
                          }}
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Locked in Proposals</span>
                        <span className="text-lg font-semibold">
                          {analytics?.lockedInProposals.toLocaleString() || 0} NIGHT
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-yellow-500 rounded-full h-2" 
                          style={{ 
                            width: `${analytics?.totalBalance 
                              ? (analytics.lockedInProposals / analytics.totalBalance) * 100 
                              : 0}%` 
                          }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Total Disbursed</p>
                        <p className="font-semibold">
                          {analytics?.totalDisbursed.toLocaleString() || 0} NIGHT
                        </p>
                      </div>
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Active Voters</p>
                        <p className="font-semibold">{analytics?.activeVoters || 0}</p>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Recent Proposals */}
                <Card className="p-6">
                  <h2 className="text-lg font-semibold mb-4">Recent Proposals</h2>
                  <div className="space-y-3">
                    {proposals.slice(0, 3).map((proposal) => (
                      <div 
                        key={proposal.id}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{proposal.title}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              getProposalStatusColor(proposal.status)
                            }`}>
                              {proposal.status}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {proposal.amount} NIGHT • {proposal.votesFor + proposal.votesAgainst} votes
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Activity Feed */}
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
                <div className="space-y-3">
                  {(analytics?.recentActivity || []).slice(0, 6).map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        activity.type.includes('deposit') || activity.type.includes('funded') 
                          ? 'bg-green-500/20'
                          : activity.type.includes('withdrawal') ? 'bg-red-500/20'
                          : activity.type.includes('proposal') ? 'bg-blue-500/20'
                          : 'bg-purple-500/20'
                      }`}>
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">{activity.description}</p>
                        {activity.amount && (
                          <p className="text-xs text-muted-foreground">
                            {activity.amount} NIGHT
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'proposals' && (
            <div className="space-y-4">
              {proposals.length === 0 ? (
                <Card className="p-12 text-center">
                  <Vote className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-semibold mb-2">No Proposals Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Be the first to create a proposal for your DAO
                  </p>
                  <button 
                    onClick={() => setCreateModalOpen(true)}
                    className="btn-primary mx-auto"
                  >
                    Create First Proposal
                  </button>
                </Card>
              ) : (
                proposals.map((proposal) => (
                  <Card key={proposal.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">{proposal.title}</h3>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            getProposalStatusColor(proposal.status)
                          }`}>
                            {proposal.status}
                          </span>
                        </div>
                        <p className="text-muted-foreground mb-4">{proposal.description}</p>
                        
                        <div className="flex items-center gap-6 text-sm mb-4">
                          <span className="text-muted-foreground">
                            By: <code className="text-xs">{proposal.proposer.slice(0, 8)}...</code>
                          </span>
                          <span className="text-muted-foreground">
                            Amount: <span className="font-semibold">{proposal.amount} NIGHT</span>
                          </span>
                          {proposal.recipient && (
                            <span className="text-muted-foreground">
                              To: <code className="text-xs">{proposal.recipient.slice(0, 8)}...</code>
                            </span>
                          )}
                          {proposal.votingEndsAt && (
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Ends: {new Date(proposal.votingEndsAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>

                        {/* Voting Progress */}
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span>Voting Progress</span>
                            <span>{proposal.totalVotes} votes cast</span>
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
                                  style={{ 
                                    width: `${proposal.totalVotes > 0 
                                      ? (proposal.votesFor / proposal.totalVotes) * 100 
                                      : 0}%` 
                                  }}
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
                                  style={{ 
                                    width: `${proposal.totalVotes > 0 
                                      ? (proposal.votesAgainst / proposal.totalVotes) * 100 
                                      : 0}%` 
                                  }}
                                />
                              </div>
                            </div>
                          </div>

                          {proposal.quorum && (
                            <div className="text-xs text-muted-foreground">
                              Quorum: {((proposal.totalVotes / proposal.quorum) * 100).toFixed(1)}% reached
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      {proposal.status === 'voting' && (
                        <div className="flex gap-2 ml-4">
                          <button 
                            onClick={() => handleVote(proposal.id, 'for')}
                            disabled={votingMap[proposal.id]}
                            className="btn-ghost border border-green-500 text-green-600 px-4 py-2 text-sm hover:bg-green-500/10"
                          >
                            {votingMap[proposal.id] ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              'Vote For'
                            )}
                          </button>
                          <button 
                            onClick={() => handleVote(proposal.id, 'against')}
                            disabled={votingMap[proposal.id]}
                            className="btn-ghost border border-red-500 text-red-600 px-4 py-2 text-sm hover:bg-red-500/10"
                          >
                            {votingMap[proposal.id] ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              'Vote Against'
                            )}
                          </button>
                        </div>
                      )}

                      {proposal.txHash && (
                        <button className="btn-ghost p-2 ml-4">
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}

          {activeTab === 'activity' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Treasury Activity Log</h2>
              <div className="space-y-4">
                {(analytics?.recentActivity || []).map((activity) => (
                  <div 
                    key={activity.id} 
                    className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        activity.type.includes('deposit') || activity.type.includes('funded') 
                          ? 'bg-green-500/20'
                          : activity.type.includes('withdrawal') ? 'bg-red-500/20'
                          : activity.type.includes('proposal') ? 'bg-blue-500/20'
                          : 'bg-purple-500/20'
                      }`}>
                        {getActivityIcon(activity.type)}
                      </div>
                      <div>
                        <p className="font-medium">{activity.description}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span>{activity.timestamp}</span>
                          {activity.actor && (
                            <span>by {activity.actor.slice(0, 8)}...</span>
                          )}
                          {activity.txHash && (
                            <button className="flex items-center gap-1 text-primary hover:underline">
                              <span>View TX</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    {activity.amount && (
                      <span className={`font-semibold ${
                        activity.type.includes('deposit') || activity.type.includes('funded')
                          ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {activity.type.includes('deposit') || activity.type.includes('funded') ? '+' : '-'}
                        {activity.amount} NIGHT
                      </span>
                    )}
                  </div>
                ))}

                {(!analytics?.recentActivity || analytics.recentActivity.length === 0) && (
                  <div className="text-center py-8">
                    <Clock className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-muted-foreground">No activity yet</p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {activeTab === 'governance' && (
            <div className="space-y-6">
              {/* Contract Addresses */}
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Smart Contracts</h2>
                <div className="space-y-3">
                  {daoState?.treasuryAddress && (
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">Treasury Contract</p>
                        <code className="text-xs text-muted-foreground">
                          {daoState.treasuryAddress}
                        </code>
                      </div>
                      <button
                        onClick={() => copyAddress(daoState.treasuryAddress!)}
                        className="btn-ghost p-2"
                      >
                        {copiedAddress === daoState.treasuryAddress ? (
                          <CheckCheck className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  )}
                  {daoState?.voteTokenAddress && (
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">Vote Token</p>
                        <code className="text-xs text-muted-foreground">
                          {daoState.voteTokenAddress}
                        </code>
                      </div>
                      <button
                        onClick={() => copyAddress(daoState.voteTokenAddress!)}
                        className="btn-ghost p-2"
                      >
                        {copiedAddress === daoState.voteTokenAddress ? (
                          <CheckCheck className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  )}
                  {daoState?.votingContractAddress && (
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">Voting Contract</p>
                        <code className="text-xs text-muted-foreground">
                          {daoState.votingContractAddress}
                        </code>
                      </div>
                      <button
                        onClick={() => copyAddress(daoState.votingContractAddress!)}
                        className="btn-ghost p-2"
                      >
                        {copiedAddress === daoState.votingContractAddress ? (
                          <CheckCheck className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </Card>

              {/* Governance Settings */}
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Governance Parameters</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Proposal Threshold</p>
                    <p className="text-xl font-semibold">
                      {daoState?.governance.proposalThreshold || 100} NIGHT
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Minimum tokens to create proposal
                    </p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Quorum Required</p>
                    <p className="text-xl font-semibold">
                      {daoState?.governance.quorumPercentage || 30}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Of total voting power
                    </p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Voting Period</p>
                    <p className="text-xl font-semibold">
                      {daoState?.governance.votingPeriod 
                        ? Math.floor(daoState.governance.votingPeriod / (24 * 60 * 60))
                        : 3} days
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Time to cast votes
                    </p>
                  </div>
                </div>
              </Card>

              {/* Member Statistics */}
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Member Statistics</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold">{daoState?.memberCount || 0}</p>
                    <p className="text-sm text-muted-foreground">Total Members</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold">{analytics?.activeVoters || 0}</p>
                    <p className="text-sm text-muted-foreground">Active Voters</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold">
                      {analytics?.participationRate || 0}%
                    </p>
                    <p className="text-sm text-muted-foreground">Participation</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold">
                      {analytics?.successRate || 0}%
                    </p>
                    <p className="text-sm text-muted-foreground">Success Rate</p>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </>
      )}

      {/* Create Proposal Modal */}
      {selectedBot && (
        <CreateProposalModal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          botId={selectedBot.botId}
          onSuccess={() => {
            fetchTreasuryData()
            setActiveTab('proposals')
          }}
        />
      )}
    </div>
  )
}