"use client"

import Link from "next/link"
import { useTheme } from "next-themes"
import { Moon, Sun, Menu } from "lucide-react"
import { useState } from "react"
import { motion } from "framer-motion"
import { usePathname } from "next/navigation"

export function Header() {
  const { theme, setTheme } = useTheme()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const isHomePage = pathname === "/"

  const scrollToSection = (sectionId: string) => {
    if (!isHomePage) {
      window.location.href = `/#${sectionId}`
      return
    }
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
      setMobileMenuOpen(false)
    }
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-effect border-b">
      <nav className="container max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
              <span className="text-white font-bold text-xl">M</span>
            </div>
            <span className="text-xl font-bold">
              Midnight<span className="text-primary">OS</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <button 
              onClick={() => scrollToSection('features')} 
              className="text-sm font-medium hover:text-primary transition-colors cursor-pointer">
              Features
            </button>
            <button 
              onClick={() => scrollToSection('pricing')} 
              className="text-sm font-medium hover:text-primary transition-colors cursor-pointer">
              Pricing
            </button>
            <button 
              onClick={() => scrollToSection('how-it-works')} 
              className="text-sm font-medium hover:text-primary transition-colors cursor-pointer">
              How It Works
            </button>
            <Link href="/docs" className="text-sm font-medium hover:text-primary transition-colors">
              Documentation
            </Link>
            <Link href="/blog" className="text-sm font-medium hover:text-primary transition-colors">
              Blog
            </Link>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-lg hover:bg-accent transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>

            <div className="hidden md:flex items-center gap-4">
              <Link href="/login">
                <button className="btn-ghost">Sign In</button>
              </Link>
              <Link href="/register">
                <button className="btn-primary">Get Started</button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-accent transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden mt-4 pt-4 border-t border-border"
          >
            <div className="flex flex-col gap-4">
              <button 
                onClick={() => scrollToSection('features')} 
                className="text-sm font-medium hover:text-primary transition-colors text-left">
                Features
              </button>
              <button 
                onClick={() => scrollToSection('pricing')} 
                className="text-sm font-medium hover:text-primary transition-colors text-left">
                Pricing
              </button>
              <button 
                onClick={() => scrollToSection('how-it-works')} 
                className="text-sm font-medium hover:text-primary transition-colors text-left">
                How It Works
              </button>
              <Link href="/docs" className="text-sm font-medium hover:text-primary transition-colors">
                Documentation
              </Link>
              <Link href="/blog" className="text-sm font-medium hover:text-primary transition-colors">
                Blog
              </Link>
              <div className="flex gap-4 pt-4 border-t border-border">
                <Link href="/login" className="flex-1">
                  <button className="btn-ghost w-full">Sign In</button>
                </Link>
                <Link href="/register" className="flex-1">
                  <button className="btn-primary w-full">Get Started</button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </nav>
    </header>
  )
}