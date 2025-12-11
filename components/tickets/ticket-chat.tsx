'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent } from '@/components/ui/dialog'
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
  ExternalLink
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
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files])
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
    try {
      const formData = new FormData()
      formData.append('content', newMessage.trim())
      formData.append('isInternal', isInternal.toString())
      
      selectedFiles.forEach(file => {
        formData.append('files', file)
      })

      const response = await fetch(`/api/tickets/${ticketId}/messages`, {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        setMessages(prev => [...prev, data.message])
        setNewMessage('')
        setSelectedFiles([])
        setIsInternal(false)
        lastMessageIdRef.current = data.message.id
        setTimeout(scrollToBottom, 100)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to send message')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
    } finally {
      setSending(false)
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

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      'SUPER_ADMIN': 'bg-purple-500 text-white',
      'TENANT_ADMIN': 'bg-blue-500 text-white',
      'IT_ADMIN': 'bg-indigo-500 text-white',
      'SALES_ADMIN': 'bg-green-500 text-white',
      'RETAIL_ADMIN': 'bg-orange-500 text-white',
      'MAINTENANCE_ADMIN': 'bg-yellow-500 text-black',
      'PROJECTS_ADMIN': 'bg-teal-500 text-white',
      'CONTRACTOR': 'bg-amber-500 text-white',
      'END_USER': 'bg-gray-500 text-white'
    }
    return colors[role] || 'bg-gray-500 text-white'
  }

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

    if (isImage) {
      return (
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
              className="p-1 bg-black/60 rounded text-white hover:bg-black/80"
              title="View full size"
            >
              <ZoomIn className="h-3 w-3" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleDownload(attachment.url, displayName); }}
              className="p-1 bg-black/60 rounded text-white hover:bg-black/80"
              title="Download"
            >
              <Download className="h-3 w-3" />
            </button>
          </div>
        </div>
      )
    }

    if (isVideo) {
      return (
        <div className="relative group">
          <video 
            src={attachment.url} 
            controls
            className="max-w-[250px] max-h-[150px] rounded-lg bg-black"
          />
          <button
            onClick={() => handleDownload(attachment.url, displayName)}
            className="absolute top-1 right-1 p-1 bg-black/60 rounded text-white hover:bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Download"
          >
            <Download className="h-3 w-3" />
          </button>
        </div>
      )
    }

    if (isAudio) {
      return (
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-2">
          <Volume2 className="h-4 w-4 text-gray-500 flex-shrink-0" />
          <audio src={attachment.url} controls className="h-8 flex-1" />
          <button
            onClick={() => handleDownload(attachment.url, displayName)}
            className="p-1 hover:bg-gray-200 rounded"
            title="Download"
          >
            <Download className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      )
    }

    if (isPdf) {
      return (
        <div 
          className="flex items-center gap-2 bg-red-50 hover:bg-red-100 rounded-lg p-2 cursor-pointer transition-colors"
          onClick={() => {
            setLightboxAttachment(attachment)
            setShowLightbox(true)
          }}
        >
          <FileText className="h-5 w-5 text-red-600 flex-shrink-0" />
          <span className="text-sm text-gray-700 truncate max-w-[150px]">{displayName}</span>
          <div className="flex gap-1 ml-auto">
            <button
              onClick={(e) => { e.stopPropagation(); window.open(attachment.url, '_blank'); }}
              className="p-1 hover:bg-red-200 rounded"
              title="Open in new tab"
            >
              <ExternalLink className="h-4 w-4 text-gray-500" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleDownload(attachment.url, displayName); }}
              className="p-1 hover:bg-red-200 rounded"
              title="Download"
            >
              <Download className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        </div>
      )
    }

    // Document/other files
    return (
      <div className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 rounded-lg p-2 transition-colors">
        <FileText className="h-5 w-5 text-blue-500 flex-shrink-0" />
        <span className="text-sm text-gray-700 truncate max-w-[150px]">{displayName}</span>
        <div className="flex gap-1 ml-auto">
          <button
            onClick={() => window.open(attachment.url, '_blank')}
            className="p-1 hover:bg-gray-300 rounded"
            title="Open in new tab"
          >
            <ExternalLink className="h-4 w-4 text-gray-500" />
          </button>
          <button
            onClick={() => handleDownload(attachment.url, displayName)}
            className="p-1 hover:bg-gray-300 rounded"
            title="Download"
          >
            <Download className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
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
        <p className="text-xs text-gray-500">
          Chat with users, admins, and contractors - accessible even after ticket closure
        </p>
      </CardHeader>
      <CardContent className="p-0">
        {/* Messages Area */}
        <ScrollArea className="h-[350px] px-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
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
                      <span className="text-xs font-medium text-gray-700">
                        {msg.user.name || msg.user.email.split('@')[0]}
                      </span>
                      <Badge className={`text-[10px] px-1.5 py-0 ${getRoleBadgeColor(msg.user.role)}`}>
                        {getRoleLabel(msg.user.role)}
                      </Badge>
                      {msg.isInternal && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-orange-300 text-orange-600">
                          <Lock className="h-2.5 w-2.5 mr-0.5" />
                          Internal
                        </Badge>
                      )}
                    </div>
                    
                    {/* Message bubble */}
                    <div 
                      className={`max-w-[80%] rounded-lg p-3 ${
                        isOwnMessage 
                          ? 'bg-blue-500 text-white' 
                          : msg.isInternal 
                            ? 'bg-orange-50 border border-orange-200' 
                            : 'bg-gray-100'
                      }`}
                    >
                      {msg.content && (
                        <p className={`text-sm whitespace-pre-wrap ${
                          isOwnMessage ? 'text-white' : 'text-gray-800'
                        }`}>
                          {msg.content}
                        </p>
                      )}
                      
                      {/* Attachments */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className={`${msg.content ? 'mt-2 pt-2 border-t' : ''} ${
                          isOwnMessage ? 'border-blue-400' : 'border-gray-200'
                        } space-y-2`}>
                          {msg.attachments.map((att) => (
                            <div key={att.id}>
                              {renderAttachment(att)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Timestamp */}
                    <span className="text-[10px] text-gray-400 mt-1">
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
          <div className="px-4 py-2 border-t bg-gray-50">
            <div className="flex flex-wrap gap-2">
              {selectedFiles.map((file, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-1 bg-white border rounded-full px-2 py-1 text-xs"
                >
                  {file.type.startsWith('image/') && <ImageIcon className="h-3 w-3 text-blue-500" />}
                  {file.type.startsWith('video/') && <Video className="h-3 w-3 text-purple-500" />}
                  {file.type.startsWith('audio/') && <Volume2 className="h-3 w-3 text-green-500" />}
                  {!file.type.startsWith('image/') && !file.type.startsWith('video/') && !file.type.startsWith('audio/') && (
                    <FileText className="h-3 w-3 text-gray-500" />
                  )}
                  <span className="max-w-[100px] truncate">{file.name}</span>
                  <button 
                    onClick={() => removeFile(index)}
                    className="hover:text-red-500 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
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
                className="text-xs text-gray-600 flex items-center gap-1 cursor-pointer"
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
              <div className="flex items-center justify-between p-3 border-b bg-gray-50">
                <span className="text-sm font-medium truncate max-w-[400px]">
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
              <div className="flex items-center justify-center bg-gray-900" style={{ height: 'calc(90vh - 60px)' }}>
                {lightboxAttachment.mimeType?.startsWith('image/') ? (
                  <img
                    src={lightboxAttachment.url}
                    alt={lightboxAttachment.filename}
                    className="max-w-full max-h-full object-contain"
                  />
                ) : lightboxAttachment.mimeType === 'application/pdf' ? (
                  <iframe
                    src={lightboxAttachment.url}
                    className="w-full h-full"
                    title={lightboxAttachment.filename}
                  />
                ) : (
                  <div className="text-white text-center p-8">
                    <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
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

