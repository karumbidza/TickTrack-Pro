'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { FileUpload } from '@/components/ui/file-upload'
import { FileText } from 'lucide-react'

interface Job {
  id: string
  title: string
  hourlyRate: number
}

interface CreateInvoiceFormProps {
  job: Job
  onSuccess: () => void
}

export function CreateInvoiceForm({ job, onSuccess }: CreateInvoiceFormProps) {
  const [formData, setFormData] = useState({
    invoiceNumber: '',
    hoursWorked: '',
    amount: '',
    description: `Work completed for: ${job.title}`,
    workDescription: '',  // Detailed work description for summary document
    notes: ''
  })
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value }
      
      // Auto-calculate amount when hours change
      if (field === 'hoursWorked' && value) {
        const hours = parseFloat(value)
        if (!isNaN(hours)) {
          updated.amount = (hours * job.hourlyRate).toFixed(2)
        }
      }
      
      return updated
    })
  }

  const handleFileSelect = (file: File) => {
    setInvoiceFile(file)
  }

  const handleFileRemove = () => {
    setInvoiceFile(null)
  }

  const uploadFile = async (file: File): Promise<string> => {
    // In a real implementation, you would upload to cloud storage (AWS S3, Cloudinary, etc.)
    // For now, we'll simulate with a placeholder URL
    const formData = new FormData()
    formData.append('file', file)
    
    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Return a placeholder URL - in production, replace with actual upload logic
    return `/uploads/invoices/${Date.now()}-${file.name}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.invoiceNumber || !formData.hoursWorked || !invoiceFile) {
      alert('Please fill in all required fields and upload an invoice file')
      return
    }

    setUploading(true)
    
    try {
      // Upload file first
      const invoiceFileUrl = await uploadFile(invoiceFile)
      
      // Create invoice
      const response = await fetch('/api/contractor/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketId: job.id,
          invoiceNumber: formData.invoiceNumber,
          hoursWorked: parseFloat(formData.hoursWorked),
          amount: parseFloat(formData.amount),
          hourlyRate: job.hourlyRate,
          description: formData.description,
          workDescription: formData.workDescription,
          notes: formData.notes,
          invoiceFileUrl
        }),
      })

      if (response.ok) {
        onSuccess()
        // Reset form
        setFormData({
          invoiceNumber: '',
          hoursWorked: '',
          amount: '',
          description: `Work completed for: ${job.title}`,
          workDescription: '',
          notes: ''
        })
        setInvoiceFile(null)
      } else {
        const error = await response.json()
        alert(error.message || 'Failed to create invoice')
      }
    } catch (error) {
      console.error('Error creating invoice:', error)
      alert('Failed to create invoice')
    } finally {
      setUploading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="invoiceNumber">Invoice Number *</Label>
          <Input
            id="invoiceNumber"
            value={formData.invoiceNumber}
            onChange={(e) => handleInputChange('invoiceNumber', e.target.value)}
            placeholder="INV-2024-001"
            required
          />
        </div>
        <div>
          <Label htmlFor="hoursWorked">Hours Worked *</Label>
          <Input
            id="hoursWorked"
            type="number"
            step="0.5"
            value={formData.hoursWorked}
            onChange={(e) => handleInputChange('hoursWorked', e.target.value)}
            placeholder="8.5"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="hourlyRate">Rate per Hour</Label>
          <Input
            id="hourlyRate"
            type="number"
            value={job.hourlyRate}
            disabled
            className="bg-gray-50"
          />
        </div>
        <div>
          <Label htmlFor="amount">Total Amount</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            value={formData.amount}
            onChange={(e) => handleInputChange('amount', e.target.value)}
            placeholder="0.00"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="description">Brief Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="Brief description of the work..."
          rows={2}
        />
      </div>

      <div>
        <Label htmlFor="workDescription">
          Detailed Work Description *
          <span className="text-xs text-gray-500 ml-2">(This will appear in the invoice summary document)</span>
        </Label>
        <Textarea
          id="workDescription"
          value={formData.workDescription}
          onChange={(e) => handleInputChange('workDescription', e.target.value)}
          placeholder="Provide a detailed description of all work performed, materials used, repairs made, etc. This will be included in the invoice summary document for admin review."
          rows={5}
          className="mt-1"
          required
        />
      </div>

      <div>
        <Label htmlFor="invoiceFile">Upload Fiscalized Invoice *</Label>
        <div className="mt-2">
          <FileUpload
            onFileSelect={handleFileSelect}
            onFileRemove={handleFileRemove}
            selectedFile={invoiceFile}
            accept=".pdf,.jpg,.jpeg,.png"
            maxSize={10}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Additional Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => handleInputChange('notes', e.target.value)}
          placeholder="Any additional notes or comments..."
          rows={2}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" disabled={uploading}>
          Cancel
        </Button>
        <Button type="submit" disabled={uploading}>
          {uploading ? 'Creating...' : 'Create Invoice'}
        </Button>
      </div>
    </form>
  )
}