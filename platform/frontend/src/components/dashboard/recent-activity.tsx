"use client"

import { motion } from "framer-motion"
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Bot, 
  Vote, 
  Shield,
  FileText,
  Wallet
} from "lucide-react"

const activities = [
  {
    id: 1,
    type: "transaction",
    title: "Sent 50 NIGHT",
    description: "To 0x742d...bEb5",
    time: "2 mins ago",
    icon: ArrowUpRight,
    color: "text-red-500",
    bgColor: "bg-red-500/10"
  },
  {
    id: 2,
    type: "bot",
    title: "Bot Deployed",
    description: "Trading Bot Alpha",
    time: "15 mins ago",
    icon: Bot,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10"
  },
  {
    id: 3,
    type: "vote",
    title: "Vote Cast",
    description: "Proposal #42",
    time: "1 hour ago",
    icon: Vote,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10"
  },
  {
    id: 4,
    type: "shield",
    title: "Tokens Shielded",
    description: "100 NIGHT",
    time: "3 hours ago",
    icon: Shield,
    color: "text-green-500",
    bgColor: "bg-green-500/10"
  },
  {
    id: 5,
    type: "proposal",
    title: "Proposal Created",
    description: "Funding Request",
    time: "5 hours ago",
    icon: FileText,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10"
  },
  {
    id: 6,
    type: "received",
    title: "Received 200 NIGHT",
    description: "From Treasury",
    time: "1 day ago",
    icon: ArrowDownRight,
    color: "text-green-500",
    bgColor: "bg-green-500/10"
  }
]

export function RecentActivity() {
  return (
    <div className="glass-card p-6 h-full">
      <div className="space-y-4">
        {activities.map((activity, index) => {
          const Icon = activity.icon
          
          return (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer"
            >
              <div className={`w-10 h-10 rounded-lg ${activity.bgColor} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${activity.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{activity.title}</p>
                <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
              </div>
              <span className="text-xs text-muted-foreground flex-shrink-0">
                {activity.time}
              </span>
            </motion.div>
          )
        })}
      </div>
      
      <button className="w-full mt-4 pt-4 border-t border-border text-sm text-primary hover:underline">
        View All Activity →
      </button>
    </div>
  )
}