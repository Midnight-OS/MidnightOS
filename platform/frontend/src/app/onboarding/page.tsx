"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { 
  Bot, 
  Wallet, 
  ChevronRight,
  ChevronLeft,
  Check,
  Sparkles,
  MessageSquare,
  Server,
  Brain,
  Loader2
} from "lucide-react"
import toast from "react-hot-toast"
import apiClient from "@/lib/api-client"

const steps = [
  {
    id: "welcome",
    title: "Welcome to MidnightOS",
    description: "Let's create your AI-powered DAO treasury management bot",
    icon: Sparkles,
  },
  {
    id: "configure",
    title: "Configure Your Bot",
    description: "Set up your bot's name and AI model",
    icon: Bot,
  },
  {
    id: "platform",
    title: "Choose Platform",
    description: "Select how you want to interact with your bot",
    icon: MessageSquare,
  },
  {
    id: "complete",
    title: "Setup Complete",
    description: "Your bot is ready to manage DAO treasuries",
    icon: Check,
  },
]

const aiModels = [
  { 
    id: "openai", 
    name: "OpenAI GPT", 
    description: "Powerful and versatile",
    icon: Brain 
  },
  { 
    id: "anthropic", 
    name: "Anthropic Claude", 
    description: "Safe and helpful",
    icon: Brain 
  },
  { 
    id: "ollama", 
    name: "Ollama (Local)", 
    description: "Run models locally",
    icon: Server 
  },
]

const platforms = [
  { 
    id: "direct", 
    name: "Direct Chat", 
    description: "Chat directly through the dashboard",
    icon: MessageSquare 
  },
  { 
    id: "discord", 
    name: "Discord", 
    description: "Connect to Discord server",
    icon: MessageSquare 
  },
  { 
    id: "telegram", 
    name: "Telegram", 
    description: "Connect to Telegram",
    icon: MessageSquare 
  },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [isCreating, setIsCreating] = useState(false)
  
  // Bot configuration
  const [botName, setBotName] = useState("My DAO Bot")
  const [selectedModel, setSelectedModel] = useState("openai")
  const [selectedPlatform, setSelectedPlatform] = useState("direct")
  const [apiKeys, setApiKeys] = useState({
    openaiApiKey: "",
    anthropicApiKey: "",
    discordToken: "",
    telegramToken: ""
  })

  const handleNext = async () => {
    if (currentStep === steps.length - 2) {
      // Create the bot when reaching the last step
      await createBot()
    } else if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      // Complete onboarding
      router.push("/dashboard")
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const createBot = async () => {
    setIsCreating(true)
    try {
      // Prepare bot configuration based on selected options
      const config: any = {}
      
      // Add API keys based on model
      if (selectedModel === "openai" && apiKeys.openaiApiKey) {
        config.openaiApiKey = apiKeys.openaiApiKey
      } else if (selectedModel === "anthropic" && apiKeys.anthropicApiKey) {
        config.anthropicApiKey = apiKeys.anthropicApiKey
      }
      
      // Add platform tokens
      if (selectedPlatform === "discord" && apiKeys.discordToken) {
        config.discordToken = apiKeys.discordToken
      } else if (selectedPlatform === "telegram" && apiKeys.telegramToken) {
        config.telegramToken = apiKeys.telegramToken
      }

      // Create the bot via API
      await apiClient.createBot({
        name: botName,
        model: selectedModel as any,
        platform: selectedPlatform as any,
        config
      })

      toast.success("Bot created successfully!")
      setCurrentStep(currentStep + 1)
    } catch (error: any) {
      toast.error(error.message || "Failed to create bot")
    } finally {
      setIsCreating(false)
    }
  }

  const renderStepContent = () => {
    switch (steps[currentStep].id) {
      case "welcome":
        return (
          <div className="text-center space-y-6">
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
              <Bot className="w-12 h-12 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-2">Ready to Deploy Your First Bot?</h2>
              <p className="text-muted-foreground">
                We'll guide you through the setup process step by step. It only takes a few minutes to get your bot up and running.
              </p>
            </div>
          </div>
        )

      case "configure":
        return (
          <div className="space-y-6">
            {/* Bot Name */}
            <div>
              <label className="block text-sm font-medium mb-2">Bot Name</label>
              <input
                type="text"
                value={botName}
                onChange={(e) => setBotName(e.target.value)}
                placeholder="Enter bot name"
                className="w-full px-4 py-2 rounded-lg bg-accent border border-border focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-sm text-muted-foreground">
                Give your bot a unique name to identify it
              </p>
            </div>

            {/* AI Model Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">AI Model</label>
              <div className="grid gap-3">
                {aiModels.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => setSelectedModel(model.id)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      selectedModel === model.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <model.icon className="w-5 h-5 mt-0.5 text-primary" />
                      <div>
                        <h4 className="font-semibold">{model.name}</h4>
                        <p className="text-sm text-muted-foreground">{model.description}</p>
                      </div>
                      {selectedModel === model.id && (
                        <Check className="w-5 h-5 ml-auto text-primary" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* API Key Input */}
            {selectedModel === "openai" && (
              <div>
                <label className="block text-sm font-medium mb-2">OpenAI API Key (Optional)</label>
                <input
                  type="password"
                  value={apiKeys.openaiApiKey}
                  onChange={(e) => setApiKeys({...apiKeys, openaiApiKey: e.target.value})}
                  placeholder="sk-..."
                  className="w-full px-4 py-2 rounded-lg bg-accent border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="mt-1 text-sm text-muted-foreground">
                  Leave empty to use the default key
                </p>
              </div>
            )}

            {selectedModel === "anthropic" && (
              <div>
                <label className="block text-sm font-medium mb-2">Anthropic API Key (Optional)</label>
                <input
                  type="password"
                  value={apiKeys.anthropicApiKey}
                  onChange={(e) => setApiKeys({...apiKeys, anthropicApiKey: e.target.value})}
                  placeholder="sk-ant-..."
                  className="w-full px-4 py-2 rounded-lg bg-accent border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="mt-1 text-sm text-muted-foreground">
                  Leave empty to use the default key
                </p>
              </div>
            )}
          </div>
        )

      case "platform":
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Platform</label>
              <div className="grid gap-3">
                {platforms.map((platform) => (
                  <button
                    key={platform.id}
                    onClick={() => setSelectedPlatform(platform.id)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      selectedPlatform === platform.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <platform.icon className="w-5 h-5 mt-0.5 text-primary" />
                      <div>
                        <h4 className="font-semibold">{platform.name}</h4>
                        <p className="text-sm text-muted-foreground">{platform.description}</p>
                      </div>
                      {selectedPlatform === platform.id && (
                        <Check className="w-5 h-5 ml-auto text-primary" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Platform-specific configuration */}
            {selectedPlatform === "discord" && (
              <div>
                <label className="block text-sm font-medium mb-2">Discord Bot Token (Optional)</label>
                <input
                  type="password"
                  value={apiKeys.discordToken}
                  onChange={(e) => setApiKeys({...apiKeys, discordToken: e.target.value})}
                  placeholder="Enter Discord bot token"
                  className="w-full px-4 py-2 rounded-lg bg-accent border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="mt-1 text-sm text-muted-foreground">
                  You can add this later from the dashboard
                </p>
              </div>
            )}

            {selectedPlatform === "telegram" && (
              <div>
                <label className="block text-sm font-medium mb-2">Telegram Bot Token (Optional)</label>
                <input
                  type="password"
                  value={apiKeys.telegramToken}
                  onChange={(e) => setApiKeys({...apiKeys, telegramToken: e.target.value})}
                  placeholder="Enter Telegram bot token"
                  className="w-full px-4 py-2 rounded-lg bg-accent border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="mt-1 text-sm text-muted-foreground">
                  You can add this later from the dashboard
                </p>
              </div>
            )}
          </div>
        )

      case "complete":
        return (
          <div className="text-center space-y-6">
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
              <Check className="w-12 h-12 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-2">You're All Set!</h2>
              <p className="text-muted-foreground">
                Your bot "{botName}" has been created and is ready to manage DAO treasuries on the Midnight blockchain.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-accent border border-border">
              <h3 className="font-semibold mb-2">What's Next?</h3>
              <ul className="text-sm text-left space-y-1 text-muted-foreground">
                <li>• Your bot can check wallet balances</li>
                <li>• Create and vote on DAO proposals</li>
                <li>• Manage treasury funds</li>
                <li>• Deploy smart contracts</li>
                <li>• And much more!</li>
              </ul>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => {
              const Icon = step.icon
              return (
                <div key={step.id} className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                      index <= currentStep
                        ? "bg-primary text-primary-foreground"
                        : "bg-accent text-muted-foreground"
                    }`}
                  >
                    {index < currentStep ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`h-0.5 w-full mx-2 transition-colors ${
                        index < currentStep ? "bg-primary" : "bg-border"
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold">{steps[currentStep].title}</h1>
            <p className="text-sm text-muted-foreground">{steps[currentStep].description}</p>
          </div>
        </div>

        {/* Step Content */}
        <div className="glass-card p-8 min-h-[400px] flex flex-col">
          <div className="flex-1">
            {renderStepContent()}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="btn-ghost px-4 py-2 disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </button>

            <button
              onClick={handleNext}
              disabled={isCreating}
              className="btn-primary px-6 py-2 flex items-center gap-2"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Bot...
                </>
              ) : currentStep === steps.length - 1 ? (
                <>
                  Go to Dashboard
                  <ChevronRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}