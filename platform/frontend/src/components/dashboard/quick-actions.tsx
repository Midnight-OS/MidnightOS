"use client"

import { motion } from "framer-motion"
import { 
  Plus, 
  Send, 
  Shield, 
  FileText, 
  Vote, 
  Rocket,
  ArrowRight
} from "lucide-react"

export function QuickActions() {
  const actions = [
    {
      icon: Plus,
      title: "Create Bot",
      description: "Deploy a new blockchain bot",
      color: "from-blue-500 to-cyan-500",
      action: "/dashboard/create-bot"
    },
    {
      icon: Send,
      title: "Send Tokens",
      description: "Transfer tokens to another wallet",
      color: "from-purple-500 to-pink-500",
      action: "/dashboard/wallet/send"
    },
    {
      icon: Shield,
      title: "Shield Tokens",
      description: "Convert to private tokens",
      color: "from-green-500 to-emerald-500",
      action: "/dashboard/wallet/shield"
    },
    {
      icon: FileText,
      title: "New Proposal",
      description: "Create a DAO proposal",
      color: "from-orange-500 to-red-500",
      action: "/dashboard/treasury/propose"
    },
    {
      icon: Vote,
      title: "Vote",
      description: "Participate in governance",
      color: "from-indigo-500 to-purple-500",
      action: "/dashboard/treasury/vote"
    },
    {
      icon: Rocket,
      title: "Deploy Contract",
      description: "Launch smart contract",
      color: "from-pink-500 to-rose-500",
      action: "/dashboard/contracts/deploy"
    }
  ]

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {actions.map((action, index) => {
          const Icon = action.icon
          return (
            <motion.button
              key={action.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              className="glass-card p-4 text-left group hover:shadow-lg transition-all"
            >
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${action.color} p-2 mb-3 group-hover:scale-110 transition-transform`}>
                <Icon className="w-full h-full text-white" />
              </div>
              <h3 className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors">
                {action.title}
              </h3>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {action.description}
              </p>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}