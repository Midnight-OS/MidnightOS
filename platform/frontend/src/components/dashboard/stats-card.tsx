"use client"

import { motion } from "framer-motion"
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react"

interface StatsCardProps {
  title: string
  value: string
  change: string
  trend: "up" | "down"
  icon: LucideIcon
  color: string
}

export function StatsCard({ title, value, change, trend, icon: Icon, color }: StatsCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="glass-card p-6"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <h3 className="text-2xl font-bold mt-1">{value}</h3>
        </div>
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} p-2.5 flex items-center justify-center`}>
          <Icon className="w-full h-full text-white" />
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {trend === "up" ? (
          <TrendingUp className="w-4 h-4 text-green-500" />
        ) : (
          <TrendingDown className="w-4 h-4 text-red-500" />
        )}
        <span className={`text-sm font-medium ${trend === "up" ? "text-green-500" : "text-red-500"}`}>
          {change}
        </span>
        <span className="text-sm text-muted-foreground">from last month</span>
      </div>
    </motion.div>
  )
}