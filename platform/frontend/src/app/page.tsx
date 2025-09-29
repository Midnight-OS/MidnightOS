"use client"

import Link from "next/link"
import { ArrowRight, Shield, Zap, Users, Lock, Database, Key } from "lucide-react"
import { Header } from "@/components/header"

export default function HomePage() {
  return (
    <>
      <Header />
      
      <section className="min-h-screen flex items-center justify-center px-6 py-20">
        <div className="container max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Powered by Midnight Blockchain</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Deploy AI Bots with
            <br />
            <span className="text-primary">Midnight Blockchain Integration</span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-12 max-w-3xl mx-auto">
            Access Model Context Protocol (MCP) tools for wallet management, DAO governance, 
            and zero-knowledge proof transactions. Connect your Discord and Telegram bots 
            with full blockchain capabilities.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <button className="btn-primary px-8 py-4 text-lg flex items-center gap-2">
                Start Building
                <ArrowRight className="w-5 h-5" />
              </button>
            </Link>
            <Link href="#features">
              <button className="btn-ghost px-8 py-4 text-lg border border-border">
                Learn More
              </button>
            </Link>
          </div>
          
          <div className="mt-12 text-sm text-muted-foreground">
            No coding required • Your own Discord/Telegram tokens • Full MCP tool access
          </div>
        </div>
      </section>

      <section id="features" className="py-20 px-6 bg-muted/30">
        <div className="container max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Real Midnight Blockchain Features
            </h2>
            <p className="text-lg text-muted-foreground">
              Not just promises - actual MCP tools and blockchain integration
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div key={feature.title} className="bg-card p-6 rounded-lg border border-border">
                <feature.icon className="w-10 h-10 text-primary mb-4" />
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-20 px-6">
        <div className="container max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Transparent Pricing
            </h2>
            <p className="text-lg text-muted-foreground">
              Based on actual resource allocation
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`bg-card p-8 rounded-lg border ${
                  tier.featured ? "border-primary" : "border-border"
                }`}
              >
                <h3 className="text-xl font-bold mb-2">{tier.name}</h3>
                <div className="text-3xl font-bold mb-4">
                  {tier.price}
                  {tier.price !== "Free" && <span className="text-sm text-muted-foreground font-normal">/month</span>}
                </div>
                <ul className="space-y-2 mb-8">
                  {tier.features.map((feature) => (
                    <li key={feature} className="text-sm text-muted-foreground flex items-start gap-2">
                      <Shield className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link href="/register">
                  <button className={tier.featured ? "btn-primary w-full" : "btn-secondary w-full"}>
                    Get Started
                  </button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-20 px-6 bg-muted/30">
        <div className="container max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground">
              Get started in three simple steps
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Create Your Account</h3>
              <p className="text-muted-foreground">
                Sign up and get instant access to your isolated environment with Docker containers.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Configure Your Bots</h3>
              <p className="text-muted-foreground">
                Add your Discord or Telegram tokens and connect to Midnight blockchain with MCP tools.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Start Building</h3>
              <p className="text-muted-foreground">
                Deploy your bots and start using wallet operations, DAO governance, and marketplace features.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6">
        <div className="container max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Access Midnight Blockchain?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Deploy your first bot with MCP tools in minutes
          </p>
          <Link href="/register">
            <button className="btn-primary px-8 py-4 text-lg inline-flex items-center gap-2">
              Create Your Bot
              <ArrowRight className="w-5 h-5" />
            </button>
          </Link>
        </div>
      </section>
    </>
  )
}

const features = [
  {
    icon: Database,
    title: "MCP Wallet Tools",
    description: "Full wallet management with transparent and shielded balances. Send, receive, and manage tokens on Midnight blockchain.",
  },
  {
    icon: Users,
    title: "DAO Governance",
    description: "Create proposals, cast votes, and manage treasury. Full DAO operations through MCP protocol integration.",
  },
  {
    icon: Lock,
    title: "Zero-Knowledge Proofs",
    description: "Shielded transactions and private smart contracts. Full privacy with Midnight's ZK-proof capabilities.",
  },
  {
    icon: Key,
    title: "Your Own Tokens",
    description: "Use your own Discord and Telegram bot tokens. We provide the infrastructure, you control the bots.",
  },
  {
    icon: Zap,
    title: "Container Isolation",
    description: "Each user gets isolated Docker containers. Your wallet seeds and data are completely separated.",
  },
  {
    icon: Shield,
    title: "Real API Integration",
    description: "Not a demo - actual API endpoints for bot management, wallet operations, and DAO governance.",
  }
]

const tiers = [
  {
    name: "Basic",
    price: "Free",
    features: [
      "Up to 3 bots",
      "256MB RAM per container",
      "0.25 CPU allocation",
      "Basic wallet features",
      "Discord & Telegram support",
      "Community support"
    ],
    featured: false
  },
  {
    name: "Premium",
    price: "$49",
    features: [
      "Up to 10 bots",
      "512MB RAM per container",
      "0.5 CPU allocation",
      "Full wallet & DAO features",
      "All platform integrations",
      "Priority support",
      "Custom webhooks"
    ],
    featured: true
  },
  {
    name: "Enterprise",
    price: "$199",
    features: [
      "Unlimited bots",
      "1GB+ RAM per container",
      "1.0 CPU allocation",
      "Full treasury management",
      "White-label options",
      "24/7 dedicated support",
      "SLA guarantees"
    ],
    featured: false
  }
]