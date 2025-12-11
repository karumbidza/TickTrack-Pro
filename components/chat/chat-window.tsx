'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
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
  const { data: session } = useSession()
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
    if (!newMessage.trim() || !session?.user) return

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
      'END_USER': 'bg-blue-100 text-blue-800',
      'CONTRACTOR': 'bg-green-100 text-green-800',
      'TENANT_ADMIN': 'bg-purple-100 text-purple-800',
      'IT_ADMIN': 'bg-orange-100 text-orange-800',
      'SALES_ADMIN': 'bg-pink-100 text-pink-800',
      'RETAIL_ADMIN': 'bg-cyan-100 text-cyan-800',
      'MAINTENANCE_ADMIN': 'bg-lime-100 text-lime-800',
      'PROJECTS_ADMIN': 'bg-indigo-100 text-indigo-800'
    }
    return colors[role] || 'bg-gray-100 text-gray-800'
  }

  const formatRole = (role: string) => {
    return role.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
  }

  return (
    <div className="flex flex-col h-96 border rounded-lg bg-white">
      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No messages yet. Start a conversation!
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start space-x-3 ${
                  message.user.id === session?.user?.id ? 'flex-row-reverse space-x-reverse' : ''
                }`}
              >
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-gray-600" />
                  </div>
                </div>
                
                <div className={`flex-1 max-w-xs lg:max-w-md ${
                  message.user.id === session?.user?.id ? 'text-right' : ''
                }`}>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      {message.user.name}
                    </span>
                    <Badge className={getRoleColor(message.user.role)}>
                      {formatRole(message.user.role)}
                    </Badge>
                  </div>
                  
                  <div className={`px-4 py-2 rounded-lg ${
                    message.user.id === session?.user?.id
                      ? 'bg-blue-500 text-white ml-auto'
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                  
                  <div className="text-xs text-gray-500 mt-1">
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