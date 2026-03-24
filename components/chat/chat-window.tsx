'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Send, User } from 'lucide-react'

interface Message {
  id: string
  content: string
  user: {
    id: string
    name: string
    role: string
  }
  createdAt: string
  isInternal: boolean
}

interface ChatWindowProps {
  ticketId: string
}

export function ChatWindow({ ticketId }: ChatWindowProps) {
  const { user } = useUser()
  const meta = (user?.publicMetadata ?? {}) as Record<string, string | null>
  const currentUserId = meta.dbUserId ?? user?.id ?? null
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetchMessages()
    
    // Set up polling for new messages (in a real app, you'd use WebSockets)
    const interval = setInterval(fetchMessages, 5000)
    return () => clearInterval(interval)
  }, [ticketId])

  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/tickets/${ticketId}/messages`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages)
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: newMessage,
          isInternal: false 
        })
      })

      if (response.ok) {
        setNewMessage('')
        fetchMessages()
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      'END_USER': 'bg-blue-bg text-ds-blue',
      'CONTRACTOR': 'bg-green-bg text-ds-green',
      'TENANT_ADMIN': 'bg-surface2 text-text-secondary',
      'IT_ADMIN': 'bg-amber-bg text-ds-amber',
      'SALES_ADMIN': 'bg-pink-100 text-pink-800',
      'RETAIL_ADMIN': 'bg-cyan-100 text-cyan-800',
      'MAINTENANCE_ADMIN': 'bg-lime-100 text-lime-800',
      'PROJECTS_ADMIN': 'bg-indigo-100 text-indigo-800'
    }
    return colors[role] || 'bg-surface2 text-text-primary'
  }

  const formatRole = (role: string) => {
    return role.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
  }

  return (
    <div className="flex flex-col h-96 border rounded-lg bg-surface">
      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-text-muted py-8">
              No messages yet. Start a conversation!
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start space-x-3 ${
                  message.user.id === currentUserId ? 'flex-row-reverse space-x-reverse' : ''
                }`}
              >
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-surface2 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-text-secondary" />
                  </div>
                </div>
                
                <div className={`flex-1 max-w-xs lg:max-w-md ${
                  message.user.id === currentUserId ? 'text-right' : ''
                }`}>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-sm font-medium text-text-primary">
                      {message.user.name}
                    </span>
                    <Badge className={getRoleColor(message.user.role)}>
                      {formatRole(message.user.role)}
                    </Badge>
                  </div>
                  
                  <div className={`px-4 py-2 rounded-lg ${
                    message.user.id === currentUserId
                      ? 'bg-blue-bg text-bg ml-auto'
                      : 'bg-surface2 text-text-primary'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                  
                  <div className="text-xs text-text-muted mt-1">
                    {new Date(message.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 border-t">
        <div className="flex space-x-2">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            rows={2}
            className="flex-1"
          />
          <Button
            onClick={sendMessage}
            disabled={!newMessage.trim() || isLoading}
            size="sm"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}