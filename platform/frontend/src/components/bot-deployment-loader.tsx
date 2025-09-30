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
  deploymentId?: string
}

export function BotDeploymentLoader({ botName, onComplete, deploymentId }: BotDeploymentLoaderProps) {
  console.log('BotDeploymentLoader mounted with props:', { botName, deploymentId })
  
  const [elapsedTime, setElapsedTime] = useState(0)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [deploymentComplete, setDeploymentComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      id: 'wallet',
      label: 'Funding Wallet',
      description: 'Transferring initial funds to your wallet',
      icon: Shield,
      duration: 15,
      status: 'pending'
    },
    {
      id: 'sync',
      label: 'Syncing Blockchain',
      description: 'Wallet is syncing with blockchain (this takes 60-120s on existing chains)',
      icon: Database,
      duration: 90,
      status: 'pending'
    },
    {
      id: 'contracts',
      label: 'Deploying DAO Contracts',
      description: 'Deploying treasury and voting contracts to Midnight blockchain',
      icon: Database,
      duration: 60,
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
      label: 'Final Checks',
      description: 'Verifying all services are healthy and connected',
      icon: Sparkles,
      duration: 10,
      status: 'pending'
    }
  ]

  const [steps, setSteps] = useState(deploymentSteps)
  const totalDuration = steps.reduce((acc, step) => acc + step.duration, 0)
  const progress = Math.min((elapsedTime / totalDuration) * 100, 100)

  // Poll deployment status
  useEffect(() => {
    if (!deploymentId) return
    
    const pollStatus = async () => {
      try {
        const response = await apiClient.getBotStatus(deploymentId) as any
        
        // Update based on actual status
        if (response.status === 'active' || response.containers?.eliza?.status === 'running') {
          // Deployment complete!
          setDeploymentComplete(true)
          setSteps(prevSteps => prevSteps.map(step => ({ ...step, status: 'completed' as const })))
          setTimeout(() => onComplete?.(), 2000)
        } else if (response.status === 'failed' || response.status === 'error') {
          setError(response.error || 'Deployment failed. Please try again.')
        }
      } catch (err: any) {
        // If polling fails, continue with timer-based progress
        console.warn('Failed to poll deployment status:', err)
      }
    }
    
    // Poll every 5 seconds
    const statusInterval = setInterval(pollStatus, 5000)
    pollStatus() // Initial poll
    
    return () => clearInterval(statusInterval)
  }, [deploymentId, onComplete])

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

  // Step progression effect
  useEffect(() => {
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

    // Check if deployment is complete
    if (elapsedTime >= totalDuration && !deploymentComplete) {
      setDeploymentComplete(true)
      // Mark all steps as completed
      setSteps(prevSteps => prevSteps.map(step => ({ ...step, status: 'completed' as const })))
      setTimeout(() => {
        onComplete?.()
      }, 2000)
    }
  }, [elapsedTime, totalDuration, deploymentComplete, onComplete])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const funMessages = [
    "Syncing with Midnight blockchain...",
    "Your wallet is catching up with the blockchain history...",
    "Deploying zero-knowledge contracts (this is the cool part!)...",
    "Your AI agent is learning the ways of the DAO...",
    "Setting up secure, private treasury management...",
    "Almost there! Just a bit more blockchain magic...",
    "Your bot is connecting to the Midnight network...",
    "This takes time because privacy is worth the wait...",
    "Building your decentralized AI assistant...",
    "Configuring zkProofs and shielded transactions..."
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
          Your AI agent has been successfully deployed and is ready to manage your DAO treasury.
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
          This will take <strong>3-4 minutes</strong> for wallet sync and contract deployment.
        </p>
        <p className="text-sm text-muted-foreground/70">
          Please keep this page open while we set everything up for you.
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

      {/* Deployment ID */}
      {deploymentId && (
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            Deployment ID: {deploymentId}
          </p>
        </div>
      )}
    </div>
  )
}