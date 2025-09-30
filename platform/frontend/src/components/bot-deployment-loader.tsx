'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, CheckCircle2, AlertCircle, Rocket, Shield, Database, Cpu, Link, Sparkles } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import apiClient from '@/lib/api-client'

interface DeploymentStep {
  id: string
  label: string
  description: string
  icon: React.ElementType
  duration: number // estimated seconds
  status: 'pending' | 'active' | 'completed' | 'error'
}

interface BotDeploymentLoaderProps {
  botName: string
  onComplete?: () => void
  botId?: string
}

export function BotDeploymentLoader({ botName, onComplete, botId }: BotDeploymentLoaderProps) {
  console.log('BotDeploymentLoader mounted with props:', { botName, botId })
  
  const [elapsedTime, setElapsedTime] = useState(0)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [deploymentComplete, setDeploymentComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actualStage, setActualStage] = useState<string>('initializing')
  const [deploymentInfo, setDeploymentInfo] = useState<any>(null)

  // Map backend stages to frontend steps (new architecture)
  const stageToStepMap: Record<string, number> = {
    'initializing': 0,
    'generating_tenant_id': 0,
    'creating_directories': 0,
    'generating_wallet': 0,
    'creating_docker_config': 1,
    'starting_container': 2,
    'finalizing': 3
  }

  const deploymentSteps: DeploymentStep[] = [
    {
      id: 'init',
      label: 'Initializing Environment',
      description: 'Setting up secure container workspace and generating wallet seed',
      icon: Rocket,
      duration: 5,
      status: 'pending'
    },
    {
      id: 'docker',
      label: 'Creating Container',
      description: 'Building Docker container configuration',
      icon: Cpu,
      duration: 10,
      status: 'pending'
    },
    {
      id: 'ai',
      label: 'Starting AI Agent',
      description: 'Launching ElizaOS with Midnight MCP integration',
      icon: Cpu,
      duration: 20,
      status: 'pending'
    },
    {
      id: 'finalize',
      label: 'Ready for Chat & MCP',
      description: 'Bot is ready! Chat interface and MCP features available',
      icon: Sparkles,
      duration: 5,
      status: 'pending'
    }
  ]

  const [steps, setSteps] = useState(deploymentSteps)
  const totalDuration = steps.reduce((acc, step) => acc + step.duration, 0)
  const progress = Math.min((elapsedTime / totalDuration) * 100, 100)

  // Poll deployment status from new endpoint
  useEffect(() => {
    if (!botId) {
      console.log('No botId provided, deployment tracking disabled')
      return
    }
    
    let pollCount = 0
    const maxPolls = 60 // Stop polling after 3 minutes (60 * 3s) - faster deployment
    let statusInterval: NodeJS.Timeout
    
    const pollStatus = async () => {
      pollCount++
      
      // Stop polling after max attempts
      if (pollCount > maxPolls) {
        console.log('Deployment polling timeout reached after 6 minutes')
        setError('Deployment is taking longer than expected. Please check the dashboard.')
        return
      }
      
      try {
        const response = await apiClient.getBotDeploymentStatus(botId) as any
        console.log(`Deployment poll #${pollCount}:`, response)
        
        setDeploymentInfo(response)
        
        // Update actual stage from backend
        if (response.stage) {
          setActualStage(response.stage)
          
          // Map backend stage to frontend step
          const stepIndex = stageToStepMap[response.stage] ?? currentStepIndex
          if (stepIndex !== currentStepIndex) {
            setCurrentStepIndex(stepIndex)
            
            // Update step statuses based on actual progress
            setSteps(prevSteps => {
              const newSteps = [...prevSteps]
              newSteps.forEach((step, index) => {
                if (index < stepIndex) {
                  step.status = 'completed'
                } else if (index === stepIndex) {
                  step.status = 'active'
                } else {
                  step.status = 'pending'
                }
              })
              return newSteps
            })
          }
        }
        
        // Check deployment status - redirect immediately when container is running
        if (response.status === 'completed' || response.stage === 'finalizing' || response.containerStatus === 'running') {
          console.log('Bot container is ready! Redirecting immediately for chat/MCP access')
          setDeploymentComplete(true)
          setSteps(prevSteps => prevSteps.map(step => ({ ...step, status: 'completed' as const })))
          clearInterval(statusInterval)
          setTimeout(() => onComplete?.(), 1000) // Faster redirect
        } else if (response.status === 'failed') {
          console.error('Deployment failed:', response.error)
          setError(response.error || 'Deployment failed. Please try again.')
          clearInterval(statusInterval)
        }
      } catch (err: any) {
        console.warn('Failed to poll deployment status:', err)
        // Continue polling even if one request fails
      }
    }
    
    // Poll every 3 seconds for real-time updates
    statusInterval = setInterval(pollStatus, 3000)
    pollStatus() // Initial poll
    
    return () => {
      if (statusInterval) clearInterval(statusInterval)
    }
  }, [botId, onComplete])

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(prev => {
        if (prev >= totalDuration) {
          clearInterval(timer)
          return totalDuration
        }
        return prev + 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [totalDuration])

  // Fallback: Step progression effect based on timer (only if no real status updates)
  useEffect(() => {
    // Only use timer-based progression if we don't have a botId for real tracking
    if (botId) return
    
    let accumulatedTime = 0
    for (let i = 0; i < steps.length; i++) {
      accumulatedTime += steps[i].duration
      if (elapsedTime < accumulatedTime) {
        setCurrentStepIndex(i)
        
        // Update step statuses
        setSteps(prevSteps => {
          const newSteps = [...prevSteps]
          newSteps.forEach((step, index) => {
            if (index < i) {
              step.status = 'completed'
            } else if (index === i) {
              step.status = 'active'
            } else {
              step.status = 'pending'
            }
          })
          return newSteps
        })
        break
      }
    }

    // Check if deployment animation is complete (fallback mode only)
    if (elapsedTime >= totalDuration && !deploymentComplete && !botId) {
      console.log('Deployment animation complete (fallback mode), proceeding')
      setDeploymentComplete(true)
      setSteps(prevSteps => prevSteps.map(step => ({ ...step, status: 'completed' as const })))
      setTimeout(() => {
        console.log('Calling onComplete to move to next step')
        onComplete?.()
      }, 2000)
    }
  }, [elapsedTime, totalDuration, deploymentComplete, onComplete, botId])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const funMessages = [
    "Setting up your AI agent container...",
    "Initializing ElizaOS with Midnight MCP integration...",
    "Your bot is connecting to the Midnight network...",
    "Configuring chat interface and basic features...",
    "Almost ready! Just a few more seconds...",
    "Building your decentralized AI assistant...", 
    "Setting up secure communication channels...",
    "DAO contracts will deploy in background once ready...",
    "Chat & MCP features coming online...",
    "Your bot is learning its first words..."
  ]

  const [currentMessage, setCurrentMessage] = useState(funMessages[0])

  useEffect(() => {
    const messageInterval = setInterval(() => {
      setCurrentMessage(funMessages[Math.floor(Math.random() * funMessages.length)])
    }, 4000)
    return () => clearInterval(messageInterval)
  }, [])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] p-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-red-500 mb-4"
        >
          <AlertCircle size={64} />
        </motion.div>
        <h2 className="text-2xl font-bold mb-2">Deployment Failed</h2>
        <p className="text-muted-foreground text-center max-w-md">{error}</p>
      </div>
    )
  }

  if (deploymentComplete) {
    return (
      <motion.div 
        className="flex flex-col items-center justify-center min-h-[500px] p-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1, rotate: 360 }}
          transition={{ type: "spring", duration: 0.8 }}
          className="text-green-500 mb-6"
        >
          <CheckCircle2 size={80} />
        </motion.div>
        <motion.h2 
          className="text-3xl font-bold mb-2"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {botName} is Ready!
        </motion.h2>
        <motion.p 
          className="text-muted-foreground text-center max-w-md mb-8"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Your AI agent is ready for chat and MCP features! DAO features will be available once background deployment completes.
        </motion.p>
        <motion.button
          className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onComplete}
        >
          Access Your Bot
        </motion.button>
      </motion.div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">Deploying {botName}</h2>
        <p className="text-muted-foreground mb-2">
          Setting up your bot container... <strong>~30-60 seconds</strong>
        </p>
        <p className="text-sm text-muted-foreground/70">
          Chat & MCP features will be available immediately. DAO features deploy in background.
        </p>
      </div>

      {/* Progress Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">Overall Progress</span>
          <span className="text-sm text-muted-foreground">
            {Math.round(progress)}% • {formatTime(elapsedTime)} / ~{formatTime(totalDuration)}
          </span>
        </div>
        <Progress value={progress} className="h-3" />
      </div>

      {/* Fun Message */}
      <motion.div 
        className="text-center mb-8 h-6"
        key={currentMessage}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
      >
        <p className="text-sm text-muted-foreground italic">{currentMessage}</p>
      </motion.div>

      {/* Steps */}
      <div className="space-y-4">
        {steps.map((step, index) => {
          const Icon = step.icon
          const isActive = step.status === 'active'
          const isCompleted = step.status === 'completed'
          const isPending = step.status === 'pending'

          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`
                relative flex items-start space-x-4 p-4 rounded-lg border
                ${isActive ? 'border-primary bg-primary/5' : 'border-border'}
                ${isCompleted ? 'opacity-75' : ''}
              `}
            >
              {/* Icon */}
              <div className={`
                flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
                ${isActive ? 'bg-primary text-primary-foreground' : ''}
                ${isCompleted ? 'bg-green-500 text-white' : ''}
                ${isPending ? 'bg-muted text-muted-foreground' : ''}
              `}>
                {isCompleted ? (
                  <CheckCircle2 size={20} />
                ) : isActive ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <Loader2 size={20} />
                  </motion.div>
                ) : (
                  <Icon size={20} />
                )}
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className={`font-semibold ${isActive ? 'text-primary' : ''}`}>
                    {step.label}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    ~{step.duration}s
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{step.description}</p>
                
                {/* Step Progress Bar (only for active step) */}
                {isActive && (
                  <motion.div 
                    className="mt-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <Progress 
                      value={
                        ((elapsedTime - steps.slice(0, index).reduce((acc, s) => acc + s.duration, 0)) 
                        / step.duration) * 100
                      } 
                      className="h-1"
                    />
                  </motion.div>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Deployment Info */}
      {botId && (
        <div className="mt-6 text-center space-y-1">
          <p className="text-xs text-muted-foreground">
            Bot ID: {botId}
          </p>
          {deploymentInfo?.tenantId && (
            <p className="text-xs text-muted-foreground">
              Tenant: {deploymentInfo.tenantId}
            </p>
          )}
          {deploymentInfo?.walletAddress && (
            <p className="text-xs text-muted-foreground font-mono">
              Wallet: {deploymentInfo.walletAddress.slice(0, 20)}...
            </p>
          )}
        </div>
      )}
    </div>
  )
}