"use client"

import { useState } from 'react'
import { X, FileText, DollarSign, User, Tag, AlertCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { treasuryAPI, CreateProposalParams } from '@/lib/treasury-api'
import toast from 'react-hot-toast'

interface CreateProposalModalProps {
  isOpen: boolean
  onClose: () => void
  botId: string
  onSuccess: () => void
}

export function CreateProposalModal({ isOpen, onClose, botId, onSuccess }: CreateProposalModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<CreateProposalParams>({
    title: '',
    description: '',
    amount: 0,
    recipient: '',
    category: 'funding'
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const categories = [
    { value: 'funding', label: 'Funding', icon: DollarSign },
    { value: 'operational', label: 'Operational', icon: FileText },
    { value: 'development', label: 'Development', icon: Tag },
    { value: 'marketing', label: 'Marketing', icon: User },
    { value: 'community', label: 'Community', icon: User }
  ]

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    } else if (formData.title.length > 100) {
      newErrors.title = 'Title must be less than 100 characters'
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required'
    } else if (formData.description.length < 20) {
      newErrors.description = 'Description must be at least 20 characters'
    } else if (formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters'
    }

    if (formData.amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0'
    } else if (formData.amount > 1000000) {
      newErrors.amount = 'Amount cannot exceed 1,000,000 NIGHT'
    }

    if (!formData.recipient.trim()) {
      newErrors.recipient = 'Recipient address is required'
    } else if (!formData.recipient.startsWith('0x') || formData.recipient.length !== 42) {
      newErrors.recipient = 'Invalid wallet address format'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    try {
      await treasuryAPI.createProposal(botId, formData)
      toast.success('Proposal created successfully!')
      onSuccess()
      onClose()
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        amount: 0,
        recipient: '',
        category: 'funding'
      })
      setErrors({})
    } catch (error: any) {
      toast.error(error.message || 'Failed to create proposal')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-border bg-background/95 backdrop-blur">
          <h2 className="text-xl font-semibold">Create Treasury Proposal</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Proposal Title <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Q1 2024 Marketing Campaign"
              className={`w-full px-4 py-2 rounded-lg bg-muted/50 border ${
                errors.title ? 'border-destructive' : 'border-transparent'
              } focus:border-primary focus:outline-none transition-colors`}
              maxLength={100}
            />
            {errors.title && (
              <p className="text-xs text-destructive mt-1">{errors.title}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {formData.title.length}/100 characters
            </p>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium mb-2">Category</label>
            <div className="grid grid-cols-3 gap-2">
              {categories.map((cat) => {
                const Icon = cat.icon
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, category: cat.value as any })}
                    className={`p-3 rounded-lg border transition-all ${
                      formData.category === cat.value
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <Icon className="w-4 h-4 mx-auto mb-1" />
                    <span className="text-xs">{cat.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Description <span className="text-destructive">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Provide a detailed description of what this proposal aims to achieve..."
              rows={4}
              className={`w-full px-4 py-2 rounded-lg bg-muted/50 border ${
                errors.description ? 'border-destructive' : 'border-transparent'
              } focus:border-primary focus:outline-none transition-colors resize-none`}
              maxLength={500}
            />
            {errors.description && (
              <p className="text-xs text-destructive mt-1">{errors.description}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {formData.description.length}/500 characters
            </p>
          </div>

          {/* Amount and Recipient */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Amount (NIGHT) <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="number"
                  value={formData.amount || ''}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className={`w-full pl-10 pr-4 py-2 rounded-lg bg-muted/50 border ${
                    errors.amount ? 'border-destructive' : 'border-transparent'
                  } focus:border-primary focus:outline-none transition-colors`}
                />
              </div>
              {errors.amount && (
                <p className="text-xs text-destructive mt-1">{errors.amount}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Recipient Address <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={formData.recipient}
                onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
                placeholder="0x..."
                className={`w-full px-4 py-2 rounded-lg bg-muted/50 border ${
                  errors.recipient ? 'border-destructive' : 'border-transparent'
                } focus:border-primary focus:outline-none transition-colors font-mono text-sm`}
              />
              {errors.recipient && (
                <p className="text-xs text-destructive mt-1">{errors.recipient}</p>
              )}
            </div>
          </div>

          {/* Info Box */}
          <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-500 mb-1">Proposal Process</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Your proposal will be reviewed by DAO members</li>
                  <li>• Voting period lasts 3 days</li>
                  <li>• Requires 30% quorum to pass</li>
                  <li>• Funds are released automatically upon approval</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-ghost"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 btn-primary"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating...
                </span>
              ) : (
                'Create Proposal'
              )}
            </button>
          </div>
        </form>
      </Card>
    </div>
  )
}