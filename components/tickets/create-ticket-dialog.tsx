'use client'

import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Plus,
  Upload,
  X,
  File,
  Image,
  Video,
  Music,
  FileText,
  AlertCircle,
  User,
  Phone,
  Mail,
  Wrench,
  Building,
  Calendar,
  Eye,
  Play
} from 'lucide-react'
import { toast } from 'sonner'

interface Asset {
  id: string
  assetNumber: string
  name: string
  category?: {
    id: string
    name: string
  }
  categoryId?: string
  status: string
  location: string
  brand?: string
  model?: string
}

interface Category {
  id: string
  name: string
  description?: string
}

interface MediaFile {
  file: File
  type: 'image' | 'video' | 'audio' | 'document'
  preview?: string
}

interface CreateTicketDialogProps {
  tenantId: string
  onTicketCreated: () => void
}

// File Preview Item with hover preview
function FilePreviewItem({ 
  mediaFile, 
  onRemove, 
  getFileIcon, 
  formatFileSize 
}: { 
  mediaFile: MediaFile
  onRemove: () => void
  getFileIcon: (type: string) => React.ReactNode
  formatFileSize: (bytes: number) => string
}) {
  const [isHovering, setIsHovering] = useState(false)
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Generate video preview URL on mount
  useEffect(() => {
    if (mediaFile.type === 'video') {
      const url = URL.createObjectURL(mediaFile.file)
      setVideoPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    }
  }, [mediaFile])

  // Auto-play video on hover
  useEffect(() => {
    if (isHovering && mediaFile.type === 'video' && videoRef.current) {
      videoRef.current.play().catch(() => {})
    } else if (!isHovering && videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
  }, [isHovering, mediaFile.type])

  const handleMouseEnter = () => {
    hoverTimeoutRef.current = setTimeout(() => setIsHovering(true), 300)
  }

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    setIsHovering(false)
  }

  return (
    <div 
      className="relative flex items-center justify-between p-2 border rounded-md hover:border-blue-300 transition-colors"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex items-center space-x-2 flex-1 min-w-0">
        {/* Thumbnail preview for images */}
        {mediaFile.preview ? (
          <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0 bg-gray-100">
            <img src={mediaFile.preview} alt="" className="w-full h-full object-cover" />
          </div>
        ) : mediaFile.type === 'video' && videoPreviewUrl ? (
          <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0 bg-black relative">
            <video src={videoPreviewUrl} className="w-full h-full object-cover" muted />
            <div className="absolute inset-0 flex items-center justify-center">
              <Play className="h-3 w-3 text-white fill-white" />
            </div>
          </div>
        ) : (
          getFileIcon(mediaFile.type)
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{mediaFile.file.name}</p>
          <p className="text-xs text-gray-500">
            {formatFileSize(mediaFile.file.size)} • {mediaFile.type}
          </p>
        </div>
      </div>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={onRemove}
        className="text-red-500 hover:text-red-700"
      >
        <X className="h-3 w-3" />
      </Button>

      {/* Hover Preview Popup */}
      {isHovering && (mediaFile.preview || videoPreviewUrl) && (
        <div className="absolute bottom-full left-0 mb-2 z-50 animate-in fade-in-0 zoom-in-95 duration-200">
          <div className="bg-gray-800 rounded-lg shadow-2xl overflow-hidden w-64">
            <div className="relative h-44 bg-gray-900 flex items-center justify-center">
              {mediaFile.preview && (
                <img
                  src={mediaFile.preview}
                  alt={mediaFile.file.name}
                  className="w-full h-full object-contain"
                />
              )}
              {mediaFile.type === 'video' && videoPreviewUrl && (
                <video
                  ref={videoRef}
                  src={videoPreviewUrl}
                  className="w-full h-full object-contain"
                  muted
                  loop
                  playsInline
                />
              )}
              <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                <Eye className="h-3 w-3" />
                Preview
              </div>
            </div>
            <div className="px-3 py-2 bg-gray-800 border-t border-gray-700">
              <p className="text-white text-xs truncate">{mediaFile.file.name}</p>
              <p className="text-gray-400 text-[10px] uppercase mt-0.5">{mediaFile.type}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function CreateTicketDialog({ tenantId, onTicketCreated }: CreateTicketDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [assets, setAssets] = useState<Asset[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([])

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    type: 'MAINTENANCE',
    reporterName: '',
    reporterContact: '',
    assetId: undefined as string | undefined,
    categoryId: '',
    department: 'MAINTENANCE'
  })

  const priorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
  const types = ['REPAIR', 'MAINTENANCE', 'INSPECTION', 'INSTALLATION', 'REPLACEMENT', 'EMERGENCY', 'OTHER']
  const departments = ['IT', 'SALES', 'RETAIL', 'MAINTENANCE', 'PROJECTS', 'FACILITIES', 'OPERATIONS']

  useEffect(() => {
    if (open) {
      fetchAssets()
      fetchCategories()
    }
  }, [open])

  const fetchAssets = async () => {
    try {
      const response = await fetch('/api/assets')
      const data = await response.json()
      setAssets(data.assets || [])
    } catch (error) {
      console.error('Failed to fetch assets:', error)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/asset-categories')
      const data = await response.json()
      setCategories(data.categories || [])
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }

  const generateTicketNumber = () => {
    const date = new Date()
    const year = date.getFullYear().toString().slice(-2)
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `TK${year}${month}${day}${random}`
  }

  const getFileType = (file: File): 'image' | 'video' | 'audio' | 'document' => {
    const type = file.type.toLowerCase()
    if (type.startsWith('image/')) return 'image'
    if (type.startsWith('video/')) return 'video'
    if (type.startsWith('audio/')) return 'audio'
    return 'document'
  }

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image': return <Image className="h-4 w-4" />
      case 'video': return <Video className="h-4 w-4" />
      case 'audio': return <Music className="h-4 w-4" />
      case 'document': return <FileText className="h-4 w-4" />
      default: return <File className="h-4 w-4" />
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const validTypes = ['image/*', 'video/*', 'audio/*', '.pdf', '.doc', '.docx', '.txt']
    const maxSize = 10 * 1024 * 1024 // 10MB

    const newFiles: MediaFile[] = []

    files.forEach(file => {
      if (file.size > maxSize) {
        toast.error(`File ${file.name} is too large. Maximum size is 10MB.`)
        return
      }

      const fileType = getFileType(file)
      const mediaFile: MediaFile = {
        file,
        type: fileType
      }

      // Create preview for images
      if (fileType === 'image') {
        const reader = new FileReader()
        reader.onload = (e) => {
          mediaFile.preview = e.target?.result as string
          setMediaFiles(prev => [...prev.filter(f => f.file.name !== file.name), mediaFile])
        }
        reader.readAsDataURL(file)
      } else {
        newFiles.push(mediaFile)
      }
    })

    setMediaFiles(prev => [...prev, ...newFiles])
    
    // Reset input
    event.target.value = ''
  }

  const removeFile = (fileName: string) => {
    setMediaFiles(prev => prev.filter(f => f.file.name !== fileName))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title || !formData.description || !formData.reporterName) {
      toast.error('Please fill in all required fields')
      return
    }

    if (!formData.categoryId) {
      toast.error('Please select a category')
      return
    }

    setLoading(true)

    try {
      // Generate ticket number
      const ticketNumber = generateTicketNumber()

      // Create FormData for file upload
      const formDataToSend = new FormData()
      formDataToSend.append('title', formData.title)
      formDataToSend.append('description', formData.description)
      formDataToSend.append('priority', formData.priority)
      formDataToSend.append('type', formData.type)
      formDataToSend.append('reporterName', formData.reporterName)
      formDataToSend.append('reporterContact', formData.reporterContact)
      formDataToSend.append('ticketNumber', ticketNumber)
      formDataToSend.append('department', formData.department)
      
      if (formData.assetId) {
        formDataToSend.append('assetId', formData.assetId)
      }
      
      if (formData.categoryId) {
        formDataToSend.append('categoryId', formData.categoryId)
      }

      // Add files
      mediaFiles.forEach((mediaFile, index) => {
        formDataToSend.append(`files`, mediaFile.file)
        formDataToSend.append(`fileTypes`, mediaFile.type)
      })

      const response = await fetch('/api/tickets', {
        method: 'POST',
        body: formDataToSend
      })

      if (response.ok) {
        toast.success(`Ticket ${ticketNumber} created successfully!`)
        onTicketCreated()
        setOpen(false)
        resetForm()
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to create ticket')
      }
    } catch (error) {
      console.error('Failed to create ticket:', error)
      toast.error('Failed to create ticket')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      priority: 'MEDIUM',
      type: 'MAINTENANCE',
      reporterName: '',
      reporterContact: '',
      assetId: undefined,
      categoryId: '',
      department: 'MAINTENANCE'
    })
    setMediaFiles([])
  }

  const selectedAsset = assets.find(asset => asset.id === formData.assetId)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Ticket
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Maintenance Ticket</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Reporter Information */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3 flex items-center">
                <User className="h-4 w-4 mr-2" />
                Reporter Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="reporterName">Reporter Name *</Label>
                  <Input
                    id="reporterName"
                    value={formData.reporterName}
                    onChange={(e) => setFormData({...formData, reporterName: e.target.value})}
                    placeholder="Full name of person reporting issue"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="reporterContact">Contact Information</Label>
                  <Input
                    id="reporterContact"
                    value={formData.reporterContact}
                    onChange={(e) => setFormData({...formData, reporterContact: e.target.value})}
                    placeholder="Phone number or email"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ticket Details */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3 flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                Ticket Details
              </h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Issue Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="Brief description of the issue"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Detailed Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Provide detailed information about the issue, what happened, when it occurred, and any relevant context..."
                    rows={4}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="type">Ticket Type</Label>
                    <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {types.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select value={formData.priority} onValueChange={(value) => setFormData({...formData, priority: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {priorities.map(priority => (
                          <SelectItem key={priority} value={priority}>{priority}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="department">Department</Label>
                    <Select value={formData.department} onValueChange={(value) => setFormData({...formData, department: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map(dept => (
                          <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Asset Selection */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3 flex items-center">
                <Wrench className="h-4 w-4 mr-2" />
                Asset Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="assetId">Related Asset (Optional)</Label>
                  <Select 
                    value={formData.assetId || 'none'} 
                    onValueChange={(value) => {
                      const selectedAssetData = assets.find(a => a.id === value)
                      if (value === 'none') {
                        setFormData({...formData, assetId: undefined})
                      } else if (selectedAssetData?.categoryId || selectedAssetData?.category?.id) {
                        // Auto-fill category when asset is selected
                        setFormData({...formData, assetId: value, categoryId: selectedAssetData.categoryId || selectedAssetData.category?.id || ''})
                      } else {
                        setFormData({...formData, assetId: value})
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an asset if applicable" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No specific asset</SelectItem>
                      {assets.map(asset => (
                        <SelectItem key={asset.id} value={asset.id}>
                          {asset.assetNumber} - {asset.name} ({asset.location})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedAsset && (
                    <div className="mt-2 p-2 bg-gray-50 rounded-md">
                      <div className="text-sm text-gray-600">
                        <div><strong>Category:</strong> {selectedAsset.category?.name || 'Uncategorized'}</div>
                        <div><strong>Location:</strong> {selectedAsset.location}</div>
                        {selectedAsset.brand && <div><strong>Brand:</strong> {selectedAsset.brand} {selectedAsset.model}</div>}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="categoryId">Category *</Label>
                  <Select 
                    value={formData.categoryId} 
                    onValueChange={(value) => setFormData({...formData, categoryId: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.assetId && selectedAsset && (
                    <p className="text-xs text-blue-600 mt-1">
                      Auto-filled from selected asset
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Media Attachments */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3 flex items-center">
                <Upload className="h-4 w-4 mr-2" />
                Media Attachments
              </h3>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="files">Upload Images, Videos, Audio, or Documents</Label>
                  <div className="mt-2">
                    <input
                      id="files"
                      type="file"
                      multiple
                      accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('files')?.click()}
                      className="w-full border-dashed border-2"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Choose Files or Drag & Drop
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Supported: Images, Videos, Audio files, PDFs, Documents (Max 10MB per file)
                  </p>
                </div>

                {mediaFiles.length > 0 && (
                  <div className="space-y-2">
                    <Label>Attached Files ({mediaFiles.length})</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {mediaFiles.map((mediaFile, index) => (
                        <FilePreviewItem
                          key={index}
                          mediaFile={mediaFile}
                          onRemove={() => removeFile(mediaFile.file.name)}
                          getFileIcon={getFileIcon}
                          formatFileSize={formatFileSize}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating Ticket...' : 'Create Ticket'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}