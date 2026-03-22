'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { MediaHoverPreview } from '@/components/ui/media-viewer'
import { 
  Send, 
  Paperclip, 
  X, 
  MessageCircle,
  Lock,
  Image as ImageIcon,
  FileText,
  Video,
  Volume2,
  Download,
  Loader2,
  ZoomIn,
  ExternalLink,
  Play,
  Grid3X3,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { toast } from 'sonner'

interface User {
  id: string
  name: string | null
  email: string
  role: string
}

interface Attachment {
  id: string
  filename: string
  originalName: string
  url: string
  mimeType: string
  size: number
}

interface Message {
  id: string
  content: string
  isInternal: boolean
  createdAt: string
  user: User
  attachments: Attachment[]
}

interface TicketChatProps {
  ticketId: string
  currentUser: {
    id: string
    name?: string | null
    email: string
    role: string
  }
  ticketStatus?: string
  className?: string
  pollInterval?: number // in milliseconds, 0 to disable
}

export function TicketChat({ 
  ticketId, 
  currentUser, 
  ticketStatus,
  className = '',
  pollInterval = 5000 
}: TicketChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [showLightbox, setShowLightbox] = useState(false)
  const [lightboxAttachment, setLightboxAttachment] = useState<Attachment | null>(null)
  const [showMediaGallery, setShowMediaGallery] = useState(true)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadingFileName, setUploadingFileName] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const lastMessageIdRef = useRef<string | null>(null)

  const canSendInternal = ['SUPER_ADMIN', 'TENANT_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN', 'CONTRACTOR'].includes(currentUser.role)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const fetchMessages = useCallback(async (isPolling = false) => {
    try {
      const response = await fetch(`/api/tickets/${ticketId}/messages?limit=100`)
      if (response.ok) {
        const data = await response.json()
        const fetchedMessages = data.messages || []
        
        // Check if there are new messages
        const latestId = fetchedMessages.length > 0 ? fetchedMessages[fetchedMessages.length - 1].id : null
        const hasNewMessages = latestId !== lastMessageIdRef.current
        
        setMessages(fetchedMessages)
        lastMessageIdRef.current = latestId
        
        // Only scroll if there are new messages and it's a poll (not initial load)
        if (hasNewMessages && isPolling) {
          setTimeout(scrollToBottom, 100)
        }
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      if (!isPolling) {
        setLoading(false)
      }
    }
  }, [ticketId, scrollToBottom])

  // Initial load
  useEffect(() => {
    fetchMessages(false)
  }, [fetchMessages])

  // Scroll on initial load
  useEffect(() => {
    if (!loading && messages.length > 0) {
      scrollToBottom()
    }
  }, [loading, messages.length, scrollToBottom])

  // Polling for new messages
  useEffect(() => {
    if (pollInterval <= 0) return

    const interval = setInterval(() => {
      fetchMessages(true)
    }, pollInterval)

    return () => clearInterval(interval)
  }, [fetchMessages, pollInterval])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const maxImageSize = 10 * 1024 * 1024 // 10MB for images/docs
    const maxVideoSize = 100 * 1024 * 1024 // 100MB for videos
    
    const validFiles = files.filter(file => {
      const isVideo = file.type.startsWith('video/')
      const maxSize = isVideo ? maxVideoSize : maxImageSize
      if (file.size > maxSize) {
        const maxSizeMB = isVideo ? '100' : '10'
        toast.error(`File ${file.name} is too large. Maximum size is ${maxSizeMB}MB.`)
        return false
      }
      return true
    })
    
    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles])
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const sendMessage = async () => {
    if (!newMessage.trim() && selectedFiles.length === 0) return

    setSending(true)
    setIsUploading(selectedFiles.length > 0)
    setUploadProgress(0)
    
    if (selectedFiles.length > 0) {
      // Show name of first file being uploaded
      setUploadingFileName(selectedFiles.length === 1 
        ? selectedFiles[0].name 
        : `${selectedFiles.length} files`
      )
    }

    try {
      const formData = new FormData()
      formData.append('content', newMessage.trim())
      formData.append('isInternal', isInternal.toString())
      
      selectedFiles.forEach(file => {
        formData.append('files', file)
      })

      // Use XMLHttpRequest for upload progress
      const result = await new Promise<{success: boolean, data?: any, error?: string}>((resolve) => {
        const xhr = new XMLHttpRequest()
        
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100)
            setUploadProgress(percent)
          }
        })
        
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText)
              resolve({ success: true, data })
            } catch {
              resolve({ success: false, error: 'Invalid response' })
            }
          } else {
            try {
              const error = JSON.parse(xhr.responseText)
              resolve({ success: false, error: error.error || 'Upload failed' })
            } catch {
              resolve({ success: false, error: `Upload failed (${xhr.status})` })
            }
          }
        })
        
        xhr.addEventListener('error', () => {
          resolve({ success: false, error: 'Network error during upload' })
        })
        
        xhr.addEventListener('abort', () => {
          resolve({ success: false, error: 'Upload cancelled' })
        })
        
        xhr.open('POST', `/api/tickets/${ticketId}/messages`)
        xhr.send(formData)
      })

      if (result.success && result.data) {
        setMessages(prev => [...prev, result.data.message])
        setNewMessage('')
        setSelectedFiles([])
        setIsInternal(false)
        lastMessageIdRef.current = result.data.message.id
        setTimeout(scrollToBottom, 100)
        if (selectedFiles.length > 0) {
          toast.success('Files uploaded successfully!')
        }
      } else {
        toast.error(result.error || 'Failed to send message')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
    } finally {
      setSending(false)
      setIsUploading(false)
      setUploadProgress(0)
      setUploadingFileName('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffDays === 1) {
      return `Yesterday ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    }
  }

  const getRoleBadgeStyle = (role: string): React.CSSProperties => {
    const styles: Record<string, React.CSSProperties> = {
      'SUPER_ADMIN': { backgroundColor: 'var(--accent)', color: '#fff' },
      'TENANT_ADMIN': { backgroundColor: 'var(--blue)', color: '#fff' },
      'IT_ADMIN': { backgroundColor: 'var(--blue)', color: '#fff' },
      'SALES_ADMIN': { backgroundColor: 'var(--green)', color: '#fff' },
      'RETAIL_ADMIN': { backgroundColor: 'var(--amber)', color: '#fff' },
      'MAINTENANCE_ADMIN': { backgroundColor: 'var(--amber)', color: '#fff' },
      'PROJECTS_ADMIN': { backgroundColor: 'var(--accent)', color: '#fff' },
      'CONTRACTOR': { backgroundColor: 'var(--amber)', color: '#fff' },
      'END_USER': { backgroundColor: 'var(--tag-bg)', color: 'var(--tag-text)' }
    }
    return styles[role] || { backgroundColor: 'var(--tag-bg)', color: 'var(--tag-text)' }
  }
  // Keep old name for backward compat
  const getRoleBadgeColor = (role: string) => ''

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      'SUPER_ADMIN': 'Super Admin',
      'TENANT_ADMIN': 'Admin',
      'IT_ADMIN': 'IT Admin',
      'SALES_ADMIN': 'Sales Admin',
      'RETAIL_ADMIN': 'Retail Admin',
      'MAINTENANCE_ADMIN': 'Maintenance Admin',
      'PROJECTS_ADMIN': 'Projects Admin',
      'CONTRACTOR': 'Contractor',
      'END_USER': 'User'
    }
    return labels[role] || role
  }

  // Collect all media attachments from messages for the gallery
  const allMediaAttachments = messages.flatMap(msg => 
    (msg.attachments || []).filter(att => 
      att.mimeType?.startsWith('image/') || 
      att.mimeType?.startsWith('video/') ||
      att.mimeType?.startsWith('audio/')
    ).map(att => ({
      ...att,
      messageSender: msg.user.name || msg.user.email.split('@')[0],
      messageDate: msg.createdAt
    }))
  )

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(downloadUrl)
      document.body.removeChild(a)
    } catch {
      window.open(url, '_blank')
    }
  }

  const renderAttachment = (attachment: Attachment) => {
    const isImage = attachment.mimeType?.startsWith('image/')
    const isVideo = attachment.mimeType?.startsWith('video/')
    const isAudio = attachment.mimeType?.startsWith('audio/')
    const isPdf = attachment.mimeType === 'application/pdf'
    const displayName = attachment.originalName || attachment.filename

    // Wrap non-image/video files with hover preview
    const mediaFile = {
      url: attachment.url,
      filename: attachment.filename,
      originalName: attachment.originalName,
      mimeType: attachment.mimeType
    }

    if (isImage) {
      return (
        <MediaHoverPreview file={mediaFile} previewSize="lg" showFileName={false}>
          <div className="group relative inline-block">
            <img 
              src={attachment.url} 
              alt={displayName}
              className="max-w-[200px] max-h-[150px] rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => {
                setLightboxAttachment(attachment)
                setShowLightbox(true)
              }}
            />
            <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxAttachment(attachment); setShowLightbox(true); }}
                className="p-1 bg-black/60 rounded text-bg hover:bg-black/80"
                title="View full size"
              >
                <ZoomIn className="h-3 w-3" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDownload(attachment.url, displayName); }}
                className="p-1 bg-black/60 rounded text-bg hover:bg-black/80"
                title="Download"
              >
                <Download className="h-3 w-3" />
              </button>
            </div>
          </div>
        </MediaHoverPreview>
      )
    }

    if (isVideo) {
      return (
        <MediaHoverPreview file={mediaFile} previewSize="lg" showFileName={false}>
          <div className="relative group cursor-pointer" onClick={() => { setLightboxAttachment(attachment); setShowLightbox(true); }}>
            <div className="relative max-w-[250px] max-h-[150px] rounded-lg overflow-hidden bg-black">
              <video 
                src={attachment.url} 
                className="max-w-[250px] max-h-[150px] object-cover"
                muted
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <div className="bg-white/90 rounded-full p-2">
                  <Play className="h-6 w-6 text-text-primary fill-gray-800" />
                </div>
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); handleDownload(attachment.url, displayName); }}
              className="absolute top-1 right-1 p-1 bg-black/60 rounded text-bg hover:bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Download"
            >
              <Download className="h-3 w-3" />
            </button>
          </div>
        </MediaHoverPreview>
      )
    }

    if (isAudio) {
      return (
        <MediaHoverPreview file={mediaFile} previewSize="sm">
          <div className="flex items-center gap-2 rounded-lg p-2" style={{ backgroundColor: 'var(--surface2)' }}>
            <Volume2 className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--text-secondary)' }} />
            <audio src={attachment.url} controls className="h-8 flex-1" />
            <button
              onClick={() => handleDownload(attachment.url, displayName)}
              className="p-1 rounded"
              title="Download"
            >
              <Download className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
            </button>
          </div>
        </MediaHoverPreview>
      )
    }

    if (isPdf) {
      return (
        <MediaHoverPreview file={mediaFile} previewSize="lg">
          <div 
            className="flex items-center gap-2 bg-red-bg hover:bg-red-bg rounded-lg p-2 cursor-pointer transition-colors"
            onClick={() => {
              setLightboxAttachment(attachment)
              setShowLightbox(true)
            }}
          >
            <FileText className="h-5 w-5 text-ds-red flex-shrink-0" />
            <span className="text-sm truncate max-w-[150px]" style={{ color: 'var(--text-primary)' }}>{displayName}</span>
            <div className="flex gap-1 ml-auto">
              <button
                onClick={(e) => { e.stopPropagation(); window.open(attachment.url, '_blank'); }}
                className="p-1 rounded"
                title="Open in new tab"
              >
                <ExternalLink className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDownload(attachment.url, displayName); }}
                className="p-1 rounded"
                title="Download"
              >
                <Download className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>
          </div>
        </MediaHoverPreview>
      )
    }

    // Document/other files
    return (
      <MediaHoverPreview file={mediaFile} previewSize="md">
        <div className="flex items-center gap-2 rounded-lg p-2 transition-colors" style={{ backgroundColor: 'var(--surface2)' }}>
          <FileText className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--accent)' }} />
          <span className="text-sm truncate max-w-[150px]" style={{ color: 'var(--text-primary)' }}>{displayName}</span>
          <div className="flex gap-1 ml-auto">
            <button
              onClick={() => window.open(attachment.url, '_blank')}
              className="p-1 rounded"
              title="Open in new tab"
            >
              <ExternalLink className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
            </button>
            <button
              onClick={() => handleDownload(attachment.url, displayName)}
              className="p-1 rounded"
              title="Download"
            >
              <Download className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
            </button>
          </div>
        </div>
      </MediaHoverPreview>
    )
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--text-muted)' }} />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Ticket Conversation
          <Badge variant="outline" className="ml-auto text-xs font-normal">
            {messages.length} messages
          </Badge>
        </CardTitle>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Chat with users, admins, and contractors - accessible even after ticket closure
        </p>
      </CardHeader>
      <CardContent className="p-0">
        {/* Messages Area */}
        <ScrollArea className="h-[350px] px-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full" style={{ color: 'var(--text-secondary)' }}>
              <MessageCircle className="h-12 w-12 mb-2 opacity-30" />
              <p>No messages yet</p>
              <p className="text-sm text-center">Start the conversation with users, admins, or contractors!</p>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {messages.map((msg) => {
                const isOwnMessage = msg.user.id === currentUser.id
                return (
                  <div 
                    key={msg.id} 
                    className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}
                  >
                    {/* Sender info */}
                    <div className={`flex items-center gap-2 mb-1 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                      <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                        {msg.user.name || msg.user.email.split('@')[0]}
                      </span>
                      <Badge className="text-[10px] px-1.5 py-0" style={getRoleBadgeStyle(msg.user.role)}>
                        {getRoleLabel(msg.user.role)}
                      </Badge>
                      {msg.isInternal && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-orange-300 text-ds-amber">
                          <Lock className="h-2.5 w-2.5 mr-0.5" />
                          Internal
                        </Badge>
                      )}
                    </div>
                    
                    {/* Message bubble */}
                    <div
                      className="max-w-[80%] rounded-lg p-3"
                      style={
                        isOwnMessage
                          ? { backgroundColor: 'var(--accent)', color: '#fff' }
                          : msg.isInternal
                            ? { backgroundColor: 'var(--amber-bg)', border: '1px solid var(--amber)', color: 'var(--text-primary)' }
                            : { backgroundColor: 'var(--surface2)', color: 'var(--text-primary)' }
                      }
                    >
                      {msg.content && (
                        <p className="text-sm whitespace-pre-wrap">
                          {msg.content}
                        </p>
                      )}
                      
                      {/* Attachments */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div
                          className={`${msg.content ? 'mt-2 pt-2 border-t border-border' : ''} space-y-2`}
                        >
                          {msg.attachments.map((att) => (
                            <div key={att.id}>
                              {renderAttachment(att)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Timestamp */}
                    <span className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                      {formatTime(msg.createdAt)}
                    </span>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Selected Files Preview */}
        {selectedFiles.length > 0 && (
          <div className="px-4 py-2 border-t" style={{ backgroundColor: 'var(--blue-bg)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium" style={{ color: 'var(--blue)' }}>
                {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} ready to send
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-xs hover:bg-red-bg"
                  style={{ color: 'var(--text-secondary)' }}
                  onClick={() => setSelectedFiles([])}
                  disabled={sending}
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
                <Button
                  size="sm"
                  className="h-6 text-xs"
                  style={{ backgroundColor: 'var(--accent)' }}
                  onClick={sendMessage}
                  disabled={sending}
                >
                  {sending ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <Send className="h-3 w-3 mr-1" />
                  )}
                  Send Now
                </Button>
              </div>
            </div>
            
            {/* Upload Progress Bar */}
            {isUploading && (
              <div className="mb-2">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium" style={{ color: 'var(--blue)' }}>
                    Uploading: {uploadingFileName}
                  </span>
                  <span className="font-medium" style={{ color: 'var(--blue)' }}>{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--blue-bg)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${uploadProgress}%`, backgroundColor: 'var(--blue)' }}
                  />
                </div>
              </div>
            )}
            
            <div className="flex flex-wrap gap-2">
              {selectedFiles.map((file, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-1 border border-border rounded-full px-2 py-1 text-xs"
                  style={{ backgroundColor: 'var(--surface)' }}
                >
                  {file.type.startsWith('image/') && <ImageIcon className="h-3 w-3 text-ds-blue" />}
                  {file.type.startsWith('video/') && <Video className="h-3 w-3 text-text-secondary" />}
                  {file.type.startsWith('audio/') && <Volume2 className="h-3 w-3 text-ds-green" />}
                  {!file.type.startsWith('image/') && !file.type.startsWith('video/') && !file.type.startsWith('audio/') && (
                    <FileText className="h-3 w-3" style={{ color: 'var(--text-secondary)' }} />
                  )}
                  <span className="max-w-[100px] truncate">{file.name}</span>
                  <button 
                    onClick={() => removeFile(index)}
                    className="hover:text-ds-red transition-colors"
                    disabled={isUploading}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Media Gallery - Pinned at bottom */}
        {allMediaAttachments.length > 0 && (
          <div className="border-t" style={{ backgroundColor: 'var(--surface2)' }}>
            <button
              onClick={() => setShowMediaGallery(!showMediaGallery)}
              className="w-full px-4 py-2 flex items-center justify-between text-sm transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              <div className="flex items-center gap-2">
                <Grid3X3 className="h-4 w-4" />
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Media Gallery</span>
                <Badge variant="outline" className="text-xs">
                  {allMediaAttachments.length}
                </Badge>
              </div>
              {showMediaGallery ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </button>
            
            {showMediaGallery && (
              <div className="px-4 pb-3">
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {allMediaAttachments.map((att, index) => (
                    <div 
                      key={att.id || index}
                      className="flex-shrink-0 relative group cursor-pointer"
                      onClick={() => {
                        setLightboxAttachment(att)
                        setShowLightbox(true)
                      }}
                    >
                      {att.mimeType?.startsWith('image/') && (
                        <div className="relative">
                          <img 
                            src={att.url} 
                            alt={att.originalName || att.filename}
                            className="h-16 w-16 object-cover rounded-lg border border-border transition-shadow"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition-colors flex items-center justify-center">
                            <ZoomIn className="h-4 w-4 text-bg opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      )}
                      {att.mimeType?.startsWith('video/') && (
                        <div className="relative h-16 w-16 bg-accent rounded-lg border border-border overflow-hidden">
                          <video 
                            src={att.url} 
                            className="h-full w-full object-cover"
                            muted
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <div className="bg-white/90 rounded-full p-1">
                              <Play className="h-3 w-3 text-text-primary fill-gray-800" />
                            </div>
                          </div>
                        </div>
                      )}
                      {att.mimeType?.startsWith('audio/') && (
                        <div className="h-16 w-16 rounded-lg border border-border flex items-center justify-center" style={{ backgroundColor: 'var(--green-bg)' }}>
                          <Volume2 className="h-6 w-6 text-ds-green" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t">
          {/* Internal message toggle for admin/contractor */}
          {canSendInternal && (
            <div className="flex items-center gap-2 mb-2">
              <Checkbox 
                id="internal" 
                checked={isInternal}
                onCheckedChange={(checked) => setIsInternal(checked === true)}
              />
              <label 
                htmlFor="internal" 
                className="text-xs flex items-center gap-1 cursor-pointer"
              style={{ color: 'var(--text-secondary)' }}
              >
                <Lock className="h-3 w-3" />
                Private note (only visible to admins & contractors)
              </label>
            </div>
          )}
          
          <div className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              multiple
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.xlsx,.xls"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              disabled={sending}
              className="flex-1"
            />
            <Button 
              onClick={sendMessage} 
              disabled={sending || (!newMessage.trim() && selectedFiles.length === 0)}
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>

      {/* Lightbox Dialog for Images/PDFs */}
      <Dialog open={showLightbox} onOpenChange={setShowLightbox}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0">
          {lightboxAttachment && (
            <div className="relative">
              <div className="flex items-center justify-between p-3 border-b" style={{ backgroundColor: 'var(--surface2)' }}>
                <span className="text-sm font-medium truncate max-w-[400px]" style={{ color: 'var(--text-primary)' }}>
                  {lightboxAttachment.originalName || lightboxAttachment.filename}
                </span>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => window.open(lightboxAttachment.url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Open
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleDownload(
                      lightboxAttachment.url, 
                      lightboxAttachment.originalName || lightboxAttachment.filename
                    )}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowLightbox(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-center bg-accent" style={{ height: 'calc(90vh - 60px)' }}>
                {lightboxAttachment.mimeType?.startsWith('image/') ? (
                  <img
                    src={lightboxAttachment.url}
                    alt={lightboxAttachment.filename}
                    className="max-w-full max-h-full object-contain"
                  />
                ) : lightboxAttachment.mimeType?.startsWith('video/') ? (
                  <video
                    src={lightboxAttachment.url}
                    controls
                    autoPlay
                    className="max-w-full max-h-full"
                  />
                ) : lightboxAttachment.mimeType?.startsWith('audio/') ? (
                  <div className="text-center p-8">
                    <Volume2 className="h-24 w-24 mx-auto mb-6 text-ds-green" />
                    <audio src={lightboxAttachment.url} controls autoPlay className="w-80" />
                    <p className="mt-4" style={{ color: 'var(--text-muted)' }}>{lightboxAttachment.originalName || lightboxAttachment.filename}</p>
                  </div>
                ) : lightboxAttachment.mimeType === 'application/pdf' ? (
                  <iframe
                    src={lightboxAttachment.url}
                    className="w-full h-full"
                    title={lightboxAttachment.filename}
                  />
                ) : (
                  <div className="text-bg text-center p-8">
                    <FileText className="h-16 w-16 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
                    <p>{lightboxAttachment.filename}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}

